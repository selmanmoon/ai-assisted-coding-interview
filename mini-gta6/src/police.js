import { clampToWorld, isCircleFree, lerpAngle, resolveCircleVsAabbs } from "./physics.js";

export const MAX_WANTED_LEVEL = 5;
export const COOLDOWN_DURATION = 8;
export const BUSTED_DURATION = 2;
export const POLICE_SIGHT_RANGE = 420;
export const BUST_DISTANCE = 58;
export const BUST_MAX_SPEED = 70;

const HEAT_DEBOUNCE_DURATION = 1.5;
const SPEEDING_THRESHOLD = 250;
const SPEEDING_DETECT_RANGE = 240;
const MAX_POLICE_CARS = 3;
const SPAWN_MIN_DIST = 500;
const SPAWN_MAX_DIST = 650;
const SPAWN_ATTEMPTS = 32;

const POLICE_BASE_SPEED = 240;
const POLICE_SPEED_PER_STAR = 32;
const POLICE_ACCEL = 320;
const POLICE_TURN_SPEED = 5.5;
const POLICE_CAR_LENGTH = 48;
const POLICE_CAR_WIDTH = 24;
const POLICE_COLLISION_RADIUS = 20;
const SIREN_PHASE_SPEED = 10;
const BUST_DECAY_RATE = 1.5;

/**
 * Manages the GTA-style wanted level, police pursuit spawning/AI,
 * line-of-sight cooldown, and busted arrest state.
 * All distances are in pixels, angles in radians, and times in seconds.
 */
export class PoliceSystem {
  static MAX_WANTED_LEVEL = MAX_WANTED_LEVEL;
  static COOLDOWN_DURATION = COOLDOWN_DURATION;
  static BUSTED_DURATION = BUSTED_DURATION;
  static POLICE_SIGHT_RANGE = POLICE_SIGHT_RANGE;
  static BUST_DISTANCE = BUST_DISTANCE;
  static BUST_MAX_SPEED = BUST_MAX_SPEED;

  constructor() {
    this.reset();
  }

  /**
   * Resets all wanted, pursuit, and busted state to defaults.
   */
  reset() {
    this.wantedLevel = 0;
    this.cooldownTimer = 0;
    this.bustedProgress = 0;
    this.isBusted = false;
    /** @type {Array<{ x: number, y: number, angle: number, speed: number, length: number, width: number, collisionRadius: number, lightPhase: number }>} */
    this.policeCars = [];
    this.heatCooldown = 0;
  }

  /**
   * Increases wanted level (subject to debounce) and spawns pursuit units.
   * @param {number} [amount=1] Stars to add
   * @param {{ x: number, y: number }|null} [targetPos=null] Target position to spawn around
   * @param {import('./world.js').World|null} [world=null] World for bounds and colliders
   * @returns {boolean} True if heat was added, false if debounced or already busted
   */
  addHeat(amount = 1, targetPos = null, world = null) {
    if (this.heatCooldown > 0 || this.isBusted) {
      return false;
    }

    this.wantedLevel = Math.min(MAX_WANTED_LEVEL, this.wantedLevel + amount);
    this.cooldownTimer = COOLDOWN_DURATION;
    this.heatCooldown = HEAT_DEBOUNCE_DURATION;

    if (targetPos && world) {
      this._ensurePoliceCars(targetPos, world);
    }

    return true;
  }

  /**
   * Updates wanted cooldown, police pursuit movement, and busted progression.
   * @param {number} dt Delta time in seconds
   * @param {{ x: number, y: number }} target Player or active vehicle position
   * @param {number} targetSpeedPx Target speed in pixels/second
   * @param {import('./world.js').World} world
   * @param {Array<import('./vehicle.js').Vehicle>} [vehicles=[]]
   */
  update(dt, target, targetSpeedPx, world, vehicles = []) {
    this.heatCooldown = Math.max(0, this.heatCooldown - dt);

    // Trigger speeding heat if racing past any active police unit
    if (Math.abs(targetSpeedPx) >= SPEEDING_THRESHOLD) {
      for (const cop of this.policeCars) {
        const dist = Math.hypot(target.x - cop.x, target.y - cop.y);
        if (dist <= SPEEDING_DETECT_RANGE) {
          this.addHeat(1, target, world);
          break;
        }
      }
    }

    if (this.wantedLevel === 0 || this.isBusted) {
      return;
    }

    this._ensurePoliceCars(target, world);

    const colliders = world.getColliders();
    const maxSpeed = POLICE_BASE_SPEED + this.wantedLevel * POLICE_SPEED_PER_STAR;
    const steerAlpha = 1 - Math.exp(-POLICE_TURN_SPEED * dt);

    for (const cop of this.policeCars) {
      const targetAngle = Math.atan2(target.y - cop.y, target.x - cop.x);
      cop.angle = lerpAngle(cop.angle, targetAngle, steerAlpha);
      cop.speed = Math.min(maxSpeed, cop.speed + POLICE_ACCEL * dt);

      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;

      this._resolveWorldColliders(cop, world, colliders);
      cop.lightPhase += dt * SIREN_PHASE_SPEED;
    }

    this._separatePoliceCars();

    let minDist = Infinity;
    for (const cop of this.policeCars) {
      const dist = Math.hypot(target.x - cop.x, target.y - cop.y);
      if (dist < minDist) {
        minDist = dist;
      }
    }

    if (minDist > POLICE_SIGHT_RANGE) {
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0) {
        this.wantedLevel = 0;
        this.cooldownTimer = 0;
        this.policeCars = [];
        this.bustedProgress = 0;
        return;
      }
    } else {
      this.cooldownTimer = COOLDOWN_DURATION;
    }

    if (minDist <= BUST_DISTANCE && Math.abs(targetSpeedPx) <= BUST_MAX_SPEED) {
      this.bustedProgress += dt;
      if (this.bustedProgress >= BUSTED_DURATION) {
        this.bustedProgress = BUSTED_DURATION;
        this.isBusted = true;
      }
    } else {
      this.bustedProgress = Math.max(0, this.bustedProgress - dt * BUST_DECAY_RATE);
    }
  }

  /**
   * Spawns police cars up to the count dictated by the current wanted level.
   * @param {{ x: number, y: number }} targetPos
   * @param {import('./world.js').World} world
   */
  _ensurePoliceCars(targetPos, world) {
    const desiredCount = Math.min(MAX_POLICE_CARS, Math.ceil(this.wantedLevel / 2));
    const colliders = world.getColliders();

    while (this.policeCars.length < desiredCount) {
      const spawn = this._findSpawnPoint(targetPos, world, colliders);
      const angle = Math.atan2(targetPos.y - spawn.y, targetPos.x - spawn.x);

      this.policeCars.push({
        x: spawn.x,
        y: spawn.y,
        angle,
        speed: 0,
        length: POLICE_CAR_LENGTH,
        width: POLICE_CAR_WIDTH,
        collisionRadius: POLICE_COLLISION_RADIUS,
        lightPhase: 0,
      });
    }
  }

  /**
   * Finds a collider-free spawn point ~500-650px from targetPos within world bounds.
   * @param {{ x: number, y: number }} targetPos
   * @param {import('./world.js').World} world
   * @param {Array<{ x: number, y: number, w: number, h: number }>} colliders
   * @returns {{ x: number, y: number }}
   */
  _findSpawnPoint(targetPos, world, colliders) {
    const r = POLICE_COLLISION_RADIUS;

    for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
      const theta = Math.random() * Math.PI * 2;
      const dist = SPAWN_MIN_DIST + Math.random() * (SPAWN_MAX_DIST - SPAWN_MIN_DIST);
      const x = Math.max(r, Math.min(world.width - r, targetPos.x + Math.cos(theta) * dist));
      const y = Math.max(r, Math.min(world.height - r, targetPos.y + Math.sin(theta) * dist));

      if (isCircleFree(x, y, r, world, colliders)) {
        return { x, y };
      }
    }

    // Fallback: pick a point on the nearest road centerline if random ring hits buildings
    if (Array.isArray(world.roads) && world.roads.length > 0) {
      for (const road of world.roads) {
        const cx = road.x + road.w * 0.5;
        const cy = road.y + road.h * 0.5;
        const x = Math.max(r, Math.min(world.width - r, cx));
        const y = Math.max(r, Math.min(world.height - r, cy));
        if (isCircleFree(x, y, r, world, colliders)) {
          return { x, y };
        }
      }
    }

    return {
      x: Math.max(r, Math.min(world.width - r, targetPos.x - SPAWN_MIN_DIST)),
      y: Math.max(r, Math.min(world.height - r, targetPos.y)),
    };
  }

  /**
   * Resolves circle-vs-AABB collisions against static world colliders and bounds.
   * @param {{ x: number, y: number, collisionRadius: number }} cop
   * @param {import('./world.js').World} world
   * @param {Array<{ x: number, y: number, w: number, h: number }>} colliders
   */
  _resolveWorldColliders(cop, world, colliders) {
    resolveCircleVsAabbs(cop, cop.collisionRadius, colliders);
    clampToWorld(cop, cop.collisionRadius, world);
  }

  /**
   * Gently separates overlapping police cars so pursuit units don't stack.
   */
  _separatePoliceCars() {
    for (let i = 0; i < this.policeCars.length; i++) {
      for (let j = i + 1; j < this.policeCars.length; j++) {
        const a = this.policeCars[i];
        const b = this.policeCars[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.collisionRadius + b.collisionRadius;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const halfOverlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * halfOverlap;
          a.y -= ny * halfOverlap;
          b.x += nx * halfOverlap;
          b.y += ny * halfOverlap;
        }
      }
    }
  }
}
