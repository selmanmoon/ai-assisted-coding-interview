import { clampToWorld, isCircleFree, lerpAngle, resolveCircleVsAabbs } from "./physics.js";

/** Max distance (px) between player and car center to enter / show the [E] prompt. */
export const ENTER_VEHICLE_RADIUS = 60;
/** Converts internal px/s speed to the approximate MPH shown on the HUD. */
export const PX_PER_SEC_TO_MPH = 0.18;

const VEHICLE_LENGTH = 48;
const VEHICLE_WIDTH = 24;
const VEHICLE_COLLISION_RADIUS = 20;

const ACCELERATION = 420;
const REVERSE_ACCELERATION = 320;
const MAX_FORWARD_SPEED = 460;
const MAX_REVERSE_SPEED = 180;
const BRAKE_DECEL = 560;
const HANDBRAKE_DECEL = 480;
const COAST_DRAG = 190;

const BASE_TURN_RATE = 2.9;
const HANDBRAKE_TURN_BOOST = 1.35;
const TURN_SPEED_THRESHOLD = 140;
const REVERSE_ENGAGE_THRESHOLD = 10;

const LATERAL_IMPULSE = 0.65;
const LATERAL_DAMPING = 8;
const MAX_LATERAL_VEL = 160;
const IMPACT_BOUNCE = 0.25;

const TRAFFIC_CRUISE_SPEED = 150;
const TRAFFIC_ACCEL = 220;
const TRAFFIC_BRAKE = 420;
const TRAFFIC_TURN_SPEED = 6;
const TRAFFIC_WAYPOINT_RADIUS = 28;
const TRAFFIC_LOOKAHEAD_DIST = 65;
const TRAFFIC_LANE_CORRIDOR = 28;

const EXIT_DISTANCES = [34, 44];

/**
 * Drivable vehicle entity supporting player input, drift physics,
 * ambient waypoint traffic, and circle-vs-AABB collision resolution.
 */
export class Vehicle {
  /**
   * @param {object} options
   * @param {number} options.x Initial world X in pixels
   * @param {number} options.y Initial world Y in pixels
   * @param {number} [options.angle=0] Heading angle in radians
   * @param {string} [options.color="#ff4d94"] Primary body color
   * @param {string} [options.accent="#4deeea"] Accent stripe/trim color
   * @param {boolean} [options.isTraffic=false] Whether controlled by ambient traffic AI
   * @param {Array<{x: number, y: number}> | null} [options.waypoints=null] Closed loop of waypoints
   */
  constructor({
    x,
    y,
    angle = 0,
    color = "#ff4d94",
    accent = "#4deeea",
    isTraffic = false,
    waypoints = null,
  }) {
    this.x = x;
    this.y = y;
    this.angle = angle;

    // Dimensions (length along local X, width along local Y)
    this.length = VEHICLE_LENGTH;
    this.width = VEHICLE_WIDTH;
    this.collisionRadius = VEHICLE_COLLISION_RADIUS;

    // Physics state
    this.speed = 0;
    this.lateralVel = 0;
    this.isOccupied = false;
    this.isTraffic = isTraffic;
    this.isBraking = false;
    this.isDrifting = false;
    this.collidedWithVehicle = false;

    // Visual & AI state
    this.color = color;
    this.accent = accent;
    this.waypoints = waypoints;
    this.waypointIndex = 0;
  }

  /**
   * Updates vehicle physics from player driving inputs.
   * @param {number} dt Delta time in seconds
   * @param {{ throttle: number, steer: number, handbrake: boolean }} input
   * @param {import('./world.js').World} world
   * @param {Vehicle[]} [vehicles=[]]
   */
  updatePlayerDriven(dt, input, world, vehicles = []) {
    const { throttle, steer, handbrake } = input;

    this._applyThrottleAndBraking(dt, throttle, handbrake);
    this._applySteeringAndDrift(dt, steer, handbrake);

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    this.x += (cos * this.speed - sin * this.lateralVel) * dt;
    this.y += (sin * this.speed + cos * this.lateralVel) * dt;

    if (this._resolveCollisions(world, vehicles)) {
      this.speed = -this.speed * IMPACT_BOUNCE;
      this.lateralVel *= 0.5;
    }
  }

  /**
   * Updates ambient traffic vehicle along its waypoint loop.
   * @param {number} dt Delta time in seconds
   * @param {import('./world.js').World} world
   * @param {Vehicle[]} vehicles
   * @param {{ x: number, y: number } | null} [player]
   */
  updateTraffic(dt, world, vehicles, player = null) {
    if (this.isOccupied) {
      return;
    }
    if (!this.waypoints || this.waypoints.length === 0) {
      this._updateCoasting(dt, world, vehicles);
      return;
    }

    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < TRAFFIC_WAYPOINT_RADIUS) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    }

    const nextTarget = this.waypoints[this.waypointIndex];
    const targetAngle = Math.atan2(nextTarget.y - this.y, nextTarget.x - this.x);
    this.angle = lerpAngle(
      this.angle,
      targetAngle,
      1 - Math.exp(-TRAFFIC_TURN_SPEED * dt)
    );

    const blocked = this._hasObstacleAhead(vehicles, player);
    if (blocked) {
      this.isBraking = true;
      this.speed = Math.max(0, this.speed - TRAFFIC_BRAKE * dt);
    } else {
      this.isBraking = false;
      this.speed = Math.min(TRAFFIC_CRUISE_SPEED, this.speed + TRAFFIC_ACCEL * dt);
    }

    this.isDrifting = false;
    this.lateralVel = 0;

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    if (this._resolveCollisions(world, vehicles)) {
      this.speed = -this.speed * IMPACT_BOUNCE;
    }
  }

  /**
   * Hands control of this vehicle to the player. Clears ambient-traffic AI
   * (waypoints) so the car never drives off on its own after the player exits.
   */
  enterByPlayer() {
    this.isOccupied = true;
    this.isTraffic = false;
    this.waypoints = null;
    this.waypointIndex = 0;
  }

  /**
   * Releases player control. The car keeps its momentum and coasts to a stop.
   */
  exitByPlayer() {
    this.isOccupied = false;
    this.isBraking = false;
    this.isDrifting = false;
  }

  /**
   * Unoccupied, non-traffic cars (parked or abandoned) coast to a stop with
   * drag and still collide with the world and other cars.
   * @param {number} dt
   * @param {import('./world.js').World} world
   * @param {Vehicle[]} vehicles
   */
  _updateCoasting(dt, world, vehicles) {
    this.isBraking = false;
    this.isDrifting = false;
    if (this.speed === 0 && this.lateralVel === 0) {
      return;
    }

    this._applyDrag(COAST_DRAG * dt);
    this.lateralVel *= Math.exp(-LATERAL_DAMPING * dt);
    if (Math.abs(this.lateralVel) < 0.5) {
      this.lateralVel = 0;
    }

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    this.x += (cos * this.speed - sin * this.lateralVel) * dt;
    this.y += (sin * this.speed + cos * this.lateralVel) * dt;

    if (this._resolveCollisions(world, vehicles)) {
      this.speed = -this.speed * IMPACT_BOUNCE;
      this.lateralVel *= 0.5;
    }
  }

  /**
   * Finds a safe world position beside the vehicle for the player to exit.
   * @param {import('./world.js').World} world
   * @param {number} [playerRadius=13]
   * @returns {{ x: number, y: number }}
   */
  getExitPosition(world, playerRadius = 13) {
    const candidateAngles = [
      this.angle - Math.PI / 2, // Left
      this.angle + Math.PI / 2, // Right
      this.angle + Math.PI,     // Rear
      this.angle,               // Front
    ];

    const colliders = world.getColliders();

    for (const distance of EXIT_DISTANCES) {
      for (const exitAngle of candidateAngles) {
        const cx = this.x + Math.cos(exitAngle) * distance;
        const cy = this.y + Math.sin(exitAngle) * distance;

        if (isCircleFree(cx, cy, playerRadius, world, colliders)) {
          return { x: cx, y: cy };
        }
      }
    }

    return { x: this.x, y: this.y };
  }

  /**
   * Returns current vehicle speed in approximate MPH for HUD display.
   * @returns {number}
   */
  getSpeedMph() {
    return Math.round(Math.abs(this.speed) * PX_PER_SEC_TO_MPH);
  }

  /**
   * Applies forward acceleration, braking, reverse gear, coasting drag, and handbrake.
   * @param {number} dt
   * @param {number} throttle
   * @param {boolean} handbrake
   */
  _applyThrottleAndBraking(dt, throttle, handbrake) {
    this.isBraking = false;

    if (throttle > 0) {
      if (this.speed < -REVERSE_ENGAGE_THRESHOLD) {
        this.isBraking = true;
        this.speed = Math.min(0, this.speed + BRAKE_DECEL * throttle * dt);
      } else {
        this.speed = Math.min(MAX_FORWARD_SPEED, this.speed + ACCELERATION * throttle * dt);
      }
    } else if (throttle < 0) {
      if (this.speed > REVERSE_ENGAGE_THRESHOLD) {
        this.isBraking = true;
        this.speed = Math.max(0, this.speed - BRAKE_DECEL * Math.abs(throttle) * dt);
      } else {
        this.speed = Math.max(
          -MAX_REVERSE_SPEED,
          this.speed + REVERSE_ACCELERATION * throttle * dt
        );
      }
    } else {
      this._applyDrag(COAST_DRAG * dt);
    }

    if (handbrake) {
      this.isBraking = true;
      this._applyDrag(HANDBRAKE_DECEL * dt);
    }
  }

  /**
   * Updates heading angle and lateral drift velocity based on speed and steering.
   * @param {number} dt
   * @param {number} steer
   * @param {boolean} handbrake
   */
  _applySteeringAndDrift(dt, steer, handbrake) {
    const speedFactor = Math.min(1, Math.abs(this.speed) / TURN_SPEED_THRESHOLD);

    if (speedFactor > 0.001 && steer !== 0) {
      const direction = this.speed >= 0 ? 1 : -1;
      const turnBoost = handbrake ? HANDBRAKE_TURN_BOOST : 1;
      this.angle += steer * BASE_TURN_RATE * speedFactor * direction * turnBoost * dt;
    }

    this.isDrifting = handbrake && Math.abs(steer) > 0.1 && Math.abs(this.speed) > 90;

    if (this.isDrifting) {
      const impulse = -steer * Math.abs(this.speed) * LATERAL_IMPULSE * dt;
      this.lateralVel = Math.max(-MAX_LATERAL_VEL, Math.min(MAX_LATERAL_VEL, this.lateralVel + impulse));
    }

    this.lateralVel *= Math.exp(-LATERAL_DAMPING * dt);
    if (Math.abs(this.lateralVel) < 0.5) {
      this.lateralVel = 0;
    }
  }

  /**
   * Decelerates speed smoothly toward zero without overshooting.
   * @param {number} amount
   */
  _applyDrag(amount) {
    if (Math.abs(this.speed) <= amount) {
      this.speed = 0;
    } else {
      this.speed -= Math.sign(this.speed) * amount;
    }
  }

  /**
   * Checks whether another vehicle or the player is within lookahead distance ahead.
   * @param {Vehicle[]} vehicles
   * @param {{ x: number, y: number } | null} player
   * @returns {boolean}
   */
  _hasObstacleAhead(vehicles, player) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    const isAhead = (target) => {
      const ox = target.x - this.x;
      const oy = target.y - this.y;
      const forwardDist = ox * cos + oy * sin;
      if (forwardDist <= 0 || forwardDist >= TRAFFIC_LOOKAHEAD_DIST) {
        return false;
      }
      const sideDist = Math.abs(-ox * sin + oy * cos);
      return sideDist < TRAFFIC_LANE_CORRIDOR;
    };

    for (const other of vehicles) {
      if (other !== this && isAhead(other)) {
        return true;
      }
    }

    if (player && isAhead(player)) {
      return true;
    }

    return false;
  }

  /**
   * Resolves circle-vs-vehicle and circle-vs-AABB (world) collisions,
   * and clamps vehicle inside world bounds. Static world geometry is resolved
   * last so a vehicle push can never shove this car into a building.
   * @param {import('./world.js').World} world
   * @param {Vehicle[]} [vehicles=[]]
   * @returns {boolean} True if any collision or boundary clamp occurred
   */
  _resolveCollisions(world, vehicles = []) {
    let collided = false;
    this.collidedWithVehicle = false;

    for (const other of vehicles) {
      if (other === this) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const minDist = this.collisionRadius + other.collisionRadius;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDist * minDist) {
        collided = true;
        this.collidedWithVehicle = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = minDist - dist;
          this.x += (dx / dist) * overlap;
          this.y += (dy / dist) * overlap;
        } else {
          this.x -= minDist;
        }
      }
    }

    if (resolveCircleVsAabbs(this, this.collisionRadius, world.getColliders())) {
      collided = true;
    }
    if (clampToWorld(this, this.collisionRadius, world)) {
      collided = true;
    }

    return collided;
  }
}
