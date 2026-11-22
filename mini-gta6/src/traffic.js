import { Vehicle } from "./vehicle.js";

const LANE_OFFSET = 22;
/**
 * Parked cars sit this far from the road centerline on the side opposite the
 * clockwise traffic lane, so they never block ambient traffic (which only
 * yields and cannot overtake).
 */
export const CURB_OFFSET = 40;

/**
 * Builds a clockwise rectangular waypoint loop shifted to the right-hand lane.
 * @param {number} xMin West road centerline X
 * @param {number} yMin North road centerline Y
 * @param {number} xMax East road centerline X
 * @param {number} yMax South road centerline Y
 * @returns {Array<{x: number, y: number}>}
 */
function buildClockwiseLoop(xMin, yMin, xMax, yMax) {
  return [
    { x: xMin + LANE_OFFSET, y: yMin + LANE_OFFSET },
    { x: xMax - LANE_OFFSET, y: yMin + LANE_OFFSET },
    { x: xMax - LANE_OFFSET, y: yMax - LANE_OFFSET },
    { x: xMin + LANE_OFFSET, y: yMax - LANE_OFFSET },
  ];
}

/**
 * Creates the initial set of 9 Vice City-themed vehicles:
 * 5 parked cars across districts and 4 ambient cruising traffic cars.
 * @returns {Vehicle[]}
 */
export function createInitialVehicles() {
  const parkedCars = [
    // 1. Ocean Drive near player spawn (Neon Pink/Cyan) — east curb, clear of the southbound lane (x = 1593)
    new Vehicle({
      x: 1615 + CURB_OFFSET,
      y: 500,
      angle: Math.PI / 2,
      color: "#ff4d94",
      accent: "#4deeea",
    }),
    // 2. Downtown North — east curb, clear of the southbound lane (x = 643)
    new Vehicle({
      x: 665 + CURB_OFFSET,
      y: 420,
      angle: Math.PI / 2,
      color: "#4deeea",
      accent: "#ffffff",
    }),
    // 3. Downtown Central — south curb, clear of the westbound lane (y = 633)
    new Vehicle({
      x: 380,
      y: 655 + CURB_OFFSET,
      angle: 0,
      color: "#ffd43b",
      accent: "#ff6b6b",
    }),
    // 4. Little Havana — south curb, clear of the westbound lane (y = 1113)
    new Vehicle({
      x: 880,
      y: 1135 + CURB_OFFSET,
      angle: 0,
      color: "#9775fa",
      accent: "#ffd43b",
    }),
    // 5. Beach Promenade parking — east curb
    new Vehicle({
      x: 1615 + CURB_OFFSET,
      y: 920,
      angle: Math.PI / 2,
      color: "#ff922b",
      accent: "#ffffff",
    }),
  ];

  // Road centerlines: x = 175, 665, 1155, 1615 | y = 175, 655, 1135, 1615
  const nwLoop = buildClockwiseLoop(175, 175, 665, 655);
  const neLoop = buildClockwiseLoop(1155, 175, 1615, 655);
  const centralLoop = buildClockwiseLoop(665, 655, 1155, 1135);
  const seLoop = buildClockwiseLoop(1155, 1135, 1615, 1615);

  const trafficCars = [
    new Vehicle({
      x: nwLoop[0].x,
      y: nwLoop[0].y,
      angle: 0,
      color: "#ff6b6b",
      accent: "#ffe066",
      isTraffic: true,
      waypoints: nwLoop,
    }),
    new Vehicle({
      x: neLoop[1].x,
      y: neLoop[1].y,
      angle: Math.PI / 2,
      color: "#20c997",
      accent: "#e3faf5",
      isTraffic: true,
      waypoints: neLoop,
    }),
    new Vehicle({
      x: centralLoop[2].x,
      y: centralLoop[2].y,
      angle: Math.PI,
      color: "#339af0",
      accent: "#d0ebff",
      isTraffic: true,
      waypoints: centralLoop,
    }),
    new Vehicle({
      x: seLoop[3].x,
      y: seLoop[3].y,
      angle: -Math.PI / 2,
      color: "#f06595",
      accent: "#fff0f6",
      isTraffic: true,
      waypoints: seLoop,
    }),
  ];

  // Start each traffic car aimed at its next waypoint along the loop
  trafficCars[1].waypointIndex = 2;
  trafficCars[2].waypointIndex = 3;
  trafficCars[3].waypointIndex = 0;

  return [...parkedCars, ...trafficCars];
}
