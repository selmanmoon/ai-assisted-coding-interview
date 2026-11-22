/**
 * Shared, DOM-free physics helpers used by Player, Vehicle, and PoliceSystem.
 * All distances are in world pixels and angles in radians.
 */

/**
 * Max simulated step per frame (seconds). Prevents tab-switch / hitch frames
 * from teleporting fast cars through walls.
 */
export const MAX_FRAME_DT = 0.05;

/**
 * Converts a raw frame delta into a safe simulation step.
 * @param {number} rawDt Raw delta in seconds (may be huge after a tab switch, or negative/NaN)
 * @returns {number} dt in [0, MAX_FRAME_DT]
 */
export function clampFrameDt(rawDt) {
  if (!Number.isFinite(rawDt) || rawDt < 0) return 0;
  return Math.min(rawDt, MAX_FRAME_DT);
}

/** Number of push-out passes used to settle circles wedged between multiple colliders. */
export const COLLISION_ITERATIONS = 3;

/**
 * Interpolates between two angles along the shortest arc.
 * @param {number} current
 * @param {number} target
 * @param {number} t Blend factor in [0, 1]
 * @returns {number}
 */
export function lerpAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

/**
 * Pushes a circular body out of all axis-aligned boxes. Runs several passes so a
 * body wedged between two boxes settles instead of clipping into both.
 * Mutates `body.x` / `body.y`.
 * @param {{ x: number, y: number }} body
 * @param {number} radius
 * @param {Array<{ x: number, y: number, w: number, h: number }>} colliders
 * @returns {boolean} True if any overlap was resolved
 */
export function resolveCircleVsAabbs(body, radius, colliders) {
  let collided = false;
  const radiusSq = radius * radius;

  for (let pass = 0; pass < COLLISION_ITERATIONS; pass++) {
    let pushedThisPass = false;

    for (const box of colliders) {
      const closestX = Math.max(box.x, Math.min(body.x, box.x + box.w));
      const closestY = Math.max(box.y, Math.min(body.y, box.y + box.h));
      const distX = body.x - closestX;
      const distY = body.y - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < radiusSq) {
        pushedThisPass = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = radius - dist;
          body.x += (distX / dist) * overlap;
          body.y += (distY / dist) * overlap;
        } else {
          // Center is inside the box: eject along the shallowest axis.
          const left = body.x - box.x;
          const right = box.x + box.w - body.x;
          const top = body.y - box.y;
          const bottom = box.y + box.h - body.y;
          const min = Math.min(left, right, top, bottom);
          if (min === left) body.x = box.x - radius;
          else if (min === right) body.x = box.x + box.w + radius;
          else if (min === top) body.y = box.y - radius;
          else body.y = box.y + box.h + radius;
        }
      }
    }

    if (!pushedThisPass) break;
    collided = true;
  }

  return collided;
}

/**
 * Checks whether a circle at (x, y) is inside world bounds and free of all colliders.
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {{ width: number, height: number }} world
 * @param {Array<{ x: number, y: number, w: number, h: number }>} colliders
 * @returns {boolean}
 */
export function isCircleFree(x, y, radius, world, colliders) {
  if (x < radius || x > world.width - radius || y < radius || y > world.height - radius) {
    return false;
  }

  const radiusSq = radius * radius;
  for (const box of colliders) {
    const closestX = Math.max(box.x, Math.min(x, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(y, box.y + box.h));
    const distX = x - closestX;
    const distY = y - closestY;
    if (distX * distX + distY * distY < radiusSq) {
      return false;
    }
  }

  return true;
}

/**
 * Clamps a circular body inside world bounds. Mutates `body.x` / `body.y`.
 * @param {{ x: number, y: number }} body
 * @param {number} radius
 * @param {{ width: number, height: number }} world
 * @returns {boolean} True if the body was clamped
 */
export function clampToWorld(body, radius, world) {
  const x = Math.max(radius, Math.min(body.x, world.width - radius));
  const y = Math.max(radius, Math.min(body.y, world.height - radius));
  const clamped = x !== body.x || y !== body.y;
  body.x = x;
  body.y = y;
  return clamped;
}
