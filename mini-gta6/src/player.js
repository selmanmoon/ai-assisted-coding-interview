import { clampToWorld, lerpAngle, resolveCircleVsAabbs } from "./physics.js";

export const WALK_SPEED = 185;
export const RUN_SPEED = 330;
export const PLAYER_RADIUS = 13;
const TURN_SMOOTHING = 16;

/**
 * On-foot player entity with normalized movement, sprint, stride animation,
 * and smooth circle-vs-AABB wall sliding.
 */
export class Player {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER_RADIUS;
    this.angle = 0;
    this.isMoving = false;
    this.isRunning = false;
    this.animTime = 0;
  }

  /**
   * @param {number} dt Delta time in seconds
   * @param {{ dx: number, dy: number, isRunning: boolean }} input
   * @param {import('./world.js').World} world
   * @param {Array<import('./vehicle.js').Vehicle>} [vehicles=[]]
   */
  update(dt, input, world, vehicles = []) {
    const { dx, dy, isRunning } = input;
    this.isMoving = dx !== 0 || dy !== 0;
    this.isRunning = this.isMoving && isRunning;

    if (this.isMoving) {
      const speed = this.isRunning ? RUN_SPEED : WALK_SPEED;
      this.x += dx * speed * dt;
      this.y += dy * speed * dt;

      const targetAngle = Math.atan2(dy, dx);
      this.angle = lerpAngle(this.angle, targetAngle, 1 - Math.exp(-TURN_SMOOTHING * dt));
      this.animTime += dt * (this.isRunning ? 14 : 8);
    } else {
      this.animTime = 0;
    }

    this._resolveCollisions(world, vehicles);
  }

  /**
   * Resolves circle-vs-AABB (world) and circle-vs-OBB (vehicles) collisions,
   * and clamps player inside world bounds.
   * @param {import('./world.js').World} world
   * @param {Array<import('./vehicle.js').Vehicle>} vehicles
   */
  _resolveCollisions(world, vehicles) {
    for (const car of vehicles) {
      if (car.isOccupied) continue;
      this._resolveVehicleOBB(car);
    }

    resolveCircleVsAabbs(this, this.radius, world.getColliders());
    clampToWorld(this, this.radius, world);
  }

  /**
   * Resolves circle-vs-oriented-bounding-box collision against a vehicle.
   * @param {import('./vehicle.js').Vehicle} car
   */
  _resolveVehicleOBB(car) {
    const dx = this.x - car.x;
    const dy = this.y - car.y;
    const cosNeg = Math.cos(-car.angle);
    const sinNeg = Math.sin(-car.angle);

    const localX = dx * cosNeg - dy * sinNeg;
    const localY = dx * sinNeg + dy * cosNeg;

    const halfL = car.length / 2;
    const halfW = car.width / 2;
    const closestX = Math.max(-halfL, Math.min(localX, halfL));
    const closestY = Math.max(-halfW, Math.min(localY, halfW));

    const pushLocalX = localX - closestX;
    const pushLocalY = localY - closestY;
    const distSq = pushLocalX * pushLocalX + pushLocalY * pushLocalY;

    if (distSq >= this.radius * this.radius) return;

    let corrLocalX = 0;
    let corrLocalY = 0;
    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = this.radius - dist;
      corrLocalX = (pushLocalX / dist) * overlap;
      corrLocalY = (pushLocalY / dist) * overlap;
    } else {
      corrLocalY = localY >= 0 ? halfW + this.radius - localY : -(halfW + this.radius + localY);
    }

    const cosPos = Math.cos(car.angle);
    const sinPos = Math.sin(car.angle);
    this.x += corrLocalX * cosPos - corrLocalY * sinPos;
    this.y += corrLocalX * sinPos + corrLocalY * cosPos;
  }
}
