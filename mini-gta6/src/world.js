/**
 * Vice City-inspired 2D open-world map definition.
 * Owns static geometry (roads, sidewalks, buildings, beach, waterfront) and colliders.
 */
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;

export const BEACH_START_X = 1735;
export const WATER_START_X = 2060;
export const PROMENADE_START_X = 1670;

const ROAD_WIDTH = 110;
/** Walkable alley width between buildings; must exceed the player diameter (26px). */
export const ALLEY_WIDTH = 34;
const VERTICAL_ROAD_XS = [120, 610, 1100, 1560];
const HORIZONTAL_ROAD_YS = [120, 600, 1080, 1560];

const ART_DECO_PALETTE = [
  { roof: "#ff9ebb", trim: "#ffd1e0", accent: "#ff5c93" },
  { roof: "#7ee8fa", trim: "#c5f6ff", accent: "#22b8cf" },
  { roof: "#ffe08a", trim: "#fff3c4", accent: "#f59f00" },
  { roof: "#b8f2e6", trim: "#e3faf5", accent: "#20c997" },
  { roof: "#ffc6a5", trim: "#ffe8d9", accent: "#ff7b54" },
  { roof: "#d0bfff", trim: "#ede7ff", accent: "#845ef7" },
];

export class World {
  constructor() {
    this.width = WORLD_WIDTH;
    this.height = WORLD_HEIGHT;
    this.spawn = { x: 1545, y: 585 };

    this.roads = this._buildRoads();
    this.buildings = this._buildBuildings();
    this.palmTrees = this._buildPalmTrees();
    this.beachProps = this._buildBeachProps();

    /** @type {Array<{x: number, y: number, w: number, h: number}>} */
    this.colliders = [
      ...this.buildings.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
      // Ocean shoreline boundary
      { x: WATER_START_X + 8, y: 0, w: WORLD_WIDTH - WATER_START_X, h: WORLD_HEIGHT },
    ];
  }

  _buildRoads() {
    const vertical = VERTICAL_ROAD_XS.map((x) => ({
      x,
      y: 0,
      w: ROAD_WIDTH,
      h: WORLD_HEIGHT,
      orientation: "vertical",
    }));

    const horizontal = HORIZONTAL_ROAD_YS.map((y) => ({
      x: 0,
      y,
      w: PROMENADE_START_X,
      h: ROAD_WIDTH,
      orientation: "horizontal",
    }));

    return [...vertical, ...horizontal];
  }

  _buildBuildings() {
    const buildings = [];
    const blockCols = [
      { x: 258, w: 324 },
      { x: 748, w: 324 },
      { x: 1238, w: 294 },
    ];
    const blockRows = [
      { y: 258, h: 314 },
      { y: 738, h: 314 },
      { y: 1218, h: 314 },
    ];

    let colorIndex = 0;

    for (let r = 0; r < blockRows.length; r++) {
      for (let c = 0; c < blockCols.length; c++) {
        const bx = blockCols[c].x;
        const by = blockRows[r].y;
        const bw = blockCols[c].w;
        const bh = blockRows[r].h;

        // Split each city block into 2-3 buildings with walkable alleyways
        const gap = ALLEY_WIDTH;
        if ((r + c) % 2 === 0) {
          const leftW = Math.floor(bw * 0.48);
          const rightW = bw - leftW - gap;
          const topH = Math.floor(bh * 0.52);
          const botH = bh - topH - gap;

          buildings.push(
            this._makeBuilding(bx, by, leftW, bh, colorIndex++),
            this._makeBuilding(bx + leftW + gap, by, rightW, topH, colorIndex++),
            this._makeBuilding(
              bx + leftW + gap,
              by + topH + gap,
              rightW,
              botH,
              colorIndex++
            )
          );
        } else {
          const topH = Math.floor(bh * 0.46);
          const botH = bh - topH - gap;
          const leftW = Math.floor(bw * 0.54);
          const rightW = bw - leftW - gap;

          buildings.push(
            this._makeBuilding(bx, by, bw, topH, colorIndex++),
            this._makeBuilding(bx, by + topH + gap, leftW, botH, colorIndex++),
            this._makeBuilding(
              bx + leftW + gap,
              by + topH + gap,
              rightW,
              botH,
              colorIndex++
            )
          );
        }
      }
    }

    return buildings;
  }

  _makeBuilding(x, y, w, h, index) {
    const palette = ART_DECO_PALETTE[index % ART_DECO_PALETTE.length];
    return { x, y, w, h, ...palette };
  }

  _buildPalmTrees() {
    const palms = [];
    for (let y = 70; y < WORLD_HEIGHT - 60; y += 130) {
      palms.push({ x: PROMENADE_START_X + 32, y, radius: 22 });
    }
    // A few palms on the sand
    for (let y = 160; y < WORLD_HEIGHT - 120; y += 340) {
      palms.push({ x: BEACH_START_X + 75, y, radius: 24 });
    }
    return palms;
  }

  _buildBeachProps() {
    const props = [];
    const colors = ["#ff5c93", "#4deeea", "#ffe066", "#ff922b"];
    let idx = 0;
    for (let y = 110; y < WORLD_HEIGHT - 100; y += 190) {
      props.push({
        x: BEACH_START_X + 165 + ((idx % 2) * 45),
        y,
        color: colors[idx % colors.length],
      });
      idx++;
    }
    return props;
  }

  /**
   * Returns all static axis-aligned colliders.
   * @returns {Array<{x: number, y: number, w: number, h: number}>}
   */
  getColliders() {
    return this.colliders;
  }

  /**
   * Returns a human-readable Vice City district name for HUD display.
   * @param {number} x
   * @param {number} y
   * @returns {string}
   */
  getDistrictAt(x, y) {
    if (x >= BEACH_START_X) return "Vice Beach";
    if (x >= 1480) return "Ocean Drive";
    if (y < 600) return "North Downtown";
    if (y > 1180) return "Little Havana";
    return "Vice Downtown";
  }
}
