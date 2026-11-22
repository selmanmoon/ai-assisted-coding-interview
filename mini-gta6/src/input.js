/**
 * Captures keyboard state and exposes normalized movement, driving, and action intent.
 * Decoupled from entity logic so future controllers (touch, gamepad, AI) can share the same contract.
 */
export class InputManager {
  constructor() {
    /** @type {Set<string>} */
    this.keys = new Set();
    /** @type {Set<string>} */
    this.justPressed = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onBlur);
  }

  /**
   * @param {KeyboardEvent} event
   */
  _onKeyDown(event) {
    if (
      event.code === "ArrowUp" ||
      event.code === "ArrowDown" ||
      event.code === "ArrowLeft" ||
      event.code === "ArrowRight" ||
      event.code === "Space"
    ) {
      event.preventDefault();
    }

    if (!this.keys.has(event.code)) {
      this.justPressed.add(event.code);
    }
    this.keys.add(event.code);
  }

  /**
   * @param {KeyboardEvent} event
   */
  _onKeyUp(event) {
    this.keys.delete(event.code);
  }

  _onBlur() {
    this.keys.clear();
    this.justPressed.clear();
  }

  /**
   * Consumes a single-press action key (true once per key press).
   * @param {...string} codes
   * @returns {boolean}
   */
  consumePress(...codes) {
    for (const code of codes) {
      if (this.justPressed.has(code)) {
        this.justPressed.delete(code);
        return true;
      }
    }
    return false;
  }

  /**
   * Clears any unconsumed single-press events at the end of a frame.
   */
  endFrame() {
    this.justPressed.clear();
  }

  /**
   * Returns normalized 2D movement vector and sprint state for on-foot mode.
   * @returns {{ dx: number, dy: number, isRunning: boolean }}
   */
  getMovementInput() {
    let dx = 0;
    let dy = 0;

    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) dy -= 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) dy += 1;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) dx -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const invSqrt2 = Math.SQRT1_2;
      dx *= invSqrt2;
      dy *= invSqrt2;
    }

    const isRunning =
      this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");

    return { dx, dy, isRunning };
  }

  /**
   * Returns driving controls for vehicle mode.
   * @returns {{ throttle: number, steer: number, handbrake: boolean }}
   */
  getDrivingInput() {
    let throttle = 0;
    let steer = 0;

    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) throttle += 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) throttle -= 1;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) steer -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) steer += 1;

    const handbrake = this.keys.has("Space");

    return { throttle, steer, handbrake };
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._onBlur);
  }
}
