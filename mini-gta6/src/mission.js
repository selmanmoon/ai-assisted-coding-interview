/**
 * Predefined Vice City mission locations on clear roads and plazas.
 * Coordinates are in world pixels.
 */
const LOCATIONS = [
  { name: "Ocean Drive", x: 1595, y: 740 },
  { name: "Vice Beach Pier", x: 1710, y: 1280 },
  { name: "North Downtown", x: 665, y: 175 },
  { name: "Little Havana", x: 175, y: 1135 },
  { name: "Downtown Plaza", x: 1155, y: 655 },
  { name: "South Beach", x: 1615, y: 1615 },
];

const START_ZONE_RADIUS = 36;
const TARGET_ZONE_RADIUS = 40;
const TRIGGER_PADDING = 14;
const MISSION_TIME_LIMIT = 32;
const MISSION_REWARD = 500;
const STATUS_DURATION_GO = 3;
const STATUS_DURATION_PASS = 3.5;
const STATUS_DURATION_FAIL = 3;

/**
 * Manages checkpoint-based delivery/race missions across Vice City.
 */
export class MissionManager {
  /**
   * Creates a new MissionManager and initializes the first mission.
   */
  constructor() {
    /** @type {number} Total cash earned in dollars. */
    this.cash = 0;
    /** @type {"idle" | "active"} Current mission state. */
    this.state = "idle";
    /** @type {number} Sequential index of the current mission. */
    this.missionIndex = 0;
    /** @type {{ x: number, y: number, radius: number, name: string }} */
    this.startZone = { x: 0, y: 0, radius: START_ZONE_RADIUS, name: "" };
    /** @type {{ x: number, y: number, radius: number, name: string }} */
    this.targetZone = { x: 0, y: 0, radius: TARGET_ZONE_RADIUS, name: "" };
    /** @type {number} Remaining time in seconds while a mission is active. */
    this.timeLeft = 0;
    /** @type {string} Current HUD status banner text. */
    this.statusMessage = "";
    /** @type {number} Remaining display time in seconds for the status banner. */
    this.statusTimer = 0;

    this._setupNextMission();
  }

  /**
   * Resets mission progress, cash, and status back to the initial state.
   */
  reset() {
    this.cash = 0;
    this.missionIndex = 0;
    this.statusMessage = "";
    this.statusTimer = 0;
    this._setupNextMission();
  }

  /**
   * Configures startZone and targetZone for the current missionIndex.
   * @private
   */
  _setupNextMission() {
    this.state = "idle";
    this.timeLeft = 0;

    const startLoc = LOCATIONS[this.missionIndex % LOCATIONS.length];
    const targetLoc = LOCATIONS[(this.missionIndex + 3) % LOCATIONS.length];

    this.startZone = {
      x: startLoc.x,
      y: startLoc.y,
      radius: START_ZONE_RADIUS,
      name: startLoc.name,
    };
    this.targetZone = {
      x: targetLoc.x,
      y: targetLoc.y,
      radius: TARGET_ZONE_RADIUS,
      name: targetLoc.name,
    };
  }

  /**
   * Returns the currently active checkpoint marker (startZone when idle, targetZone when active).
   * @returns {{ x: number, y: number, radius: number, name: string }}
   */
  getActiveMarker() {
    return this.state === "active" ? this.targetZone : this.startZone;
  }

  /**
   * Advances mission timers and checks player proximity to the active checkpoint.
   * @param {number} dt - Frame delta time in seconds.
   * @param {{ x: number, y: number }} playerPos - Player world position in pixels.
   */
  update(dt, playerPos) {
    if (this.statusTimer > 0) {
      this.statusTimer = Math.max(0, this.statusTimer - dt);
    }

    const marker = this.getActiveMarker();
    const dist = Math.hypot(playerPos.x - marker.x, playerPos.y - marker.y);

    if (this.state === "idle" && dist <= marker.radius + TRIGGER_PADDING) {
      this.state = "active";
      this.timeLeft = MISSION_TIME_LIMIT;
      this.statusMessage = `GO! Reach ${this.targetZone.name}`;
      this.statusTimer = STATUS_DURATION_GO;
    } else if (this.state === "active") {
      this.timeLeft -= dt;

      if (dist <= marker.radius + TRIGGER_PADDING) {
        this.cash += MISSION_REWARD;
        this.missionIndex++;
        this.statusMessage = `MISSION PASSED! +$${MISSION_REWARD}`;
        this.statusTimer = STATUS_DURATION_PASS;
        this._setupNextMission();
      } else if (this.timeLeft <= 0) {
        this.missionIndex++;
        this.statusMessage = "TIME UP! New job ready";
        this.statusTimer = STATUS_DURATION_FAIL;
        this._setupNextMission();
      }
    }
  }
}
