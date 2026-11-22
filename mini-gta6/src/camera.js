/**
 * Smooth follow-camera centered on a target in world coordinates.
 * Uses frame-rate-independent exponential damping and clamps to world bounds.
 */
export class Camera {
  /**
   * @param {number} viewWidth
   * @param {number} viewHeight
   * @param {number} worldWidth
   * @param {number} worldHeight
   * @param {number} [smoothing=8]
   */
  constructor(viewWidth, viewHeight, worldWidth, worldHeight, smoothing = 8) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.smoothing = smoothing;

    this.x = 0;
    this.y = 0;
  }

  /**
   * @param {number} viewWidth
   * @param {number} viewHeight
   */
  resize(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this._clamp();
  }

  /**
   * Immediately snaps the camera centered on target.
   * @param {{ x: number, y: number }} target
   */
  centerOn(target) {
    this.x = target.x - this.viewWidth / 2;
    this.y = target.y - this.viewHeight / 2;
    this._clamp();
  }

  /**
   * Smoothly follows the target using exponential damping.
   * @param {{ x: number, y: number }} target
   * @param {number} dt Delta time in seconds
   */
  update(target, dt) {
    const desiredX = target.x - this.viewWidth / 2;
    const desiredY = target.y - this.viewHeight / 2;
    const factor = 1 - Math.exp(-this.smoothing * dt);

    this.x += (desiredX - this.x) * factor;
    this.y += (desiredY - this.y) * factor;
    this._clamp();
  }

  _clamp() {
    const maxX = Math.max(0, this.worldWidth - this.viewWidth);
    const maxY = Math.max(0, this.worldHeight - this.viewHeight);
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
  }
}
