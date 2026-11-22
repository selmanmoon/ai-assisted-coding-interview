import test from "node:test";
import assert from "node:assert/strict";

import { Camera } from "../src/camera.js";
import { clampFrameDt, isCircleFree, MAX_FRAME_DT, resolveCircleVsAabbs } from "../src/physics.js";
import { MissionManager } from "../src/mission.js";
import { Player } from "../src/player.js";
import { PoliceSystem } from "../src/police.js";
import { RADIO_STATIONS, RadioManager } from "../src/radio.js";
import { createInitialVehicles } from "../src/traffic.js";
import { Vehicle } from "../src/vehicle.js";
import { ALLEY_WIDTH, WATER_START_X, World } from "../src/world.js";

test("World: defines 2400x1800 dimensions, colliders, and district names", () => {
  const world = new World();
  assert.equal(world.width, 2400);
  assert.equal(world.height, 1800);
  assert.ok(world.getColliders().length > 0);
  assert.equal(world.getDistrictAt(1545, 585), "Ocean Drive");
  assert.equal(world.getDistrictAt(1850, 585), "Vice Beach");
  assert.equal(world.getDistrictAt(500, 300), "North Downtown");
});

test("Player: walks and runs faster with Shift, and slides along buildings", () => {
  const world = new World();
  const walker = new Player(1545, 585);
  walker.update(0.5, { dx: 0, dy: -1, isRunning: false }, world);
  const walkDist = 585 - walker.y;

  const runner = new Player(1545, 585);
  runner.update(0.5, { dx: 0, dy: -1, isRunning: true }, world);
  const runDist = 585 - runner.y;

  assert.ok(runDist > walkDist * 1.5, "Running should be significantly faster than walking");

  // Push player diagonally into a building collider from just outside and verify wall-sliding
  const building = world.buildings[0];
  const wallPlayer = new Player(building.x - 16, building.y + building.h / 2);
  const startY = wallPlayer.y;
  for (let i = 0; i < 12; i++) {
    wallPlayer.update(0.016, { dx: 1, dy: 1, isRunning: false }, world);
  }
  assert.ok(wallPlayer.x <= building.x - wallPlayer.radius + 0.01);
  assert.ok(wallPlayer.y > startY, "Player should slide along the wall vertically");
});

test("Camera: smoothly follows target and clamps to world bounds", () => {
  const camera = new Camera(800, 600, 2400, 1800, 8);
  camera.centerOn({ x: 100, y: 100 });
  assert.equal(camera.x, 0);
  assert.equal(camera.y, 0);

  camera.update({ x: 1200, y: 900 }, 0.1);
  assert.ok(camera.x > 0 && camera.x < 800);
  assert.ok(camera.y > 0 && camera.y < 600);

  camera.centerOn({ x: 2390, y: 1790 });
  assert.equal(camera.x, 2400 - 800);
  assert.equal(camera.y, 1800 - 600);
});

test("Vehicle: cannot rotate in place at 0 MPH, accelerates, coasts, and reverses", () => {
  const world = new World();
  const car = new Vehicle({ x: 1600, y: 400, angle: 0 });

  // Steering at 0 speed must not rotate the car
  car.updatePlayerDriven(0.2, { throttle: 0, steer: 1, handbrake: false }, world);
  assert.equal(car.angle, 0);
  assert.equal(car.getSpeedMph(), 0);

  // Accelerate + steer rotates and increases speed
  for (let i = 0; i < 15; i++) {
    car.updatePlayerDriven(0.05, { throttle: 1, steer: 1, handbrake: false }, world);
  }
  assert.ok(car.getSpeedMph() > 15);
  assert.ok(car.angle > 0);

  // Coasting drag reduces speed when throttle is 0
  const speedBeforeCoast = car.speed;
  car.updatePlayerDriven(0.2, { throttle: 0, steer: 0, handbrake: false }, world);
  assert.ok(car.speed < speedBeforeCoast);

  // Reverse gear engages from stop
  const reverseCar = new Vehicle({ x: 1600, y: 400, angle: 0 });
  for (let i = 0; i < 10; i++) {
    reverseCar.updatePlayerDriven(0.05, { throttle: -1, steer: 0, handbrake: false }, world);
  }
  assert.ok(reverseCar.speed < 0, "Pressing brake/reverse from stop should engage reverse");
});

test("Vehicle: handbrake decelerates faster than coasting", () => {
  const world = new World();
  const coastCar = new Vehicle({ x: 1600, y: 400, angle: 0 });
  const brakeCar = new Vehicle({ x: 1600, y: 400, angle: 0 });
  coastCar.speed = 350;
  brakeCar.speed = 350;

  coastCar.updatePlayerDriven(0.2, { throttle: 0, steer: 0, handbrake: false }, world);
  brakeCar.updatePlayerDriven(0.2, { throttle: 0, steer: 1, handbrake: true }, world);

  assert.ok(brakeCar.speed < coastCar.speed);
  assert.equal(brakeCar.isDrifting, true);
});

test("Vehicle: solid collision with building and shoreline stops/bounces without getting stuck", () => {
  const world = new World();
  const building = world.buildings[0];
  const car = new Vehicle({ x: building.x - 22, y: building.y + building.h / 2, angle: 0 });
  car.speed = 300;

  car.updatePlayerDriven(0.05, { throttle: 1, steer: 0, handbrake: false }, world);
  assert.ok(car.x <= building.x - car.collisionRadius + 0.01);
  assert.ok(car.speed <= 0, "Impact should bounce/dampen forward velocity");

  // Water shoreline collision
  const beachCar = new Vehicle({ x: WATER_START_X - 16, y: 500, angle: 0 });
  beachCar.speed = 300;
  beachCar.updatePlayerDriven(0.03, { throttle: 1, steer: 0, handbrake: false }, world);
  assert.ok(beachCar.x <= WATER_START_X + 8 - beachCar.collisionRadius + 0.01);
});

test("Vehicle: getExitPosition avoids buildings and water shoreline", () => {
  const world = new World();
  // Car parked right against the ocean shoreline facing south (left side is water!)
  const car = new Vehicle({ x: WATER_START_X - 18, y: 500, angle: Math.PI / 2 });
  const exitPos = car.getExitPosition(world, 13);

  // Must not exit into the water collider (x > WATER_START_X + 8 - 13)
  assert.ok(
    exitPos.x <= WATER_START_X + 8 - 13 + 0.01,
    `Exit position (${exitPos.x}) must not be inside water`
  );
});

test("Traffic: spawns 9 vehicles and ambient traffic advances along waypoints", () => {
  const world = new World();
  const vehicles = createInitialVehicles();
  assert.equal(vehicles.length, 9);

  const trafficCars = vehicles.filter((v) => v.isTraffic);
  assert.equal(trafficCars.length, 4);

  const firstTraffic = trafficCars[0];
  const startX = firstTraffic.x;
  const startY = firstTraffic.y;
  const player = new Player(world.spawn.x, world.spawn.y);

  for (let i = 0; i < 10; i++) {
    firstTraffic.updateTraffic(0.05, world, vehicles, player);
  }
  assert.ok(
    Math.hypot(firstTraffic.x - startX, firstTraffic.y - startY) > 10,
    "Traffic car should cruise along its route"
  );
});

test("RadioManager: cycles stations and resets cleanly", () => {
  const radio = new RadioManager();
  assert.equal(radio.getCurrentStation().name, "Off");

  const expected = ["Vice FM", "Neon Synth", "Sunset 80s", "Off"];
  for (const name of expected) {
    const station = radio.cycleStation();
    assert.equal(station.name, name);
  }

  radio.cycleStation(); // Vice FM
  assert.equal(radio.getCurrentStation().name, "Vice FM");
  radio.reset();
  assert.equal(radio.getCurrentStation().name, RADIO_STATIONS[0].name);
});

test("Player-to-Vehicle OBB collision: on-foot player stops at car edge without crossing inside", () => {
  const world = new World();
  const parkedCar = new Vehicle({ x: 1600, y: 500, angle: 0 });
  const player = new Player(1600 - parkedCar.length / 2 - 16, 500);

  for (let i = 0; i < 15; i++) {
    player.update(0.016, { dx: 1, dy: 0, isRunning: false }, world, [parkedCar]);
  }

  const maxAllowedX = parkedCar.x - parkedCar.length / 2 - player.radius + 0.01;
  assert.ok(
    player.x <= maxAllowedX,
    `Player (${player.x}) should stop at car bumper (${maxAllowedX})`
  );
});

test("Vehicle-to-Vehicle collision: driven car stops/bounces on impact with another car", () => {
  const world = new World();
  const targetCar = new Vehicle({ x: 1600, y: 500, angle: 0 });
  const drivenCar = new Vehicle({ x: 1550, y: 500, angle: 0 });
  drivenCar.isOccupied = true;
  drivenCar.speed = 320;

  for (let i = 0; i < 5; i++) {
    drivenCar.updatePlayerDriven(0.016, { throttle: 1, steer: 0, handbrake: false }, world, [
      drivenCar,
      targetCar,
    ]);
  }

  const minAllowedDist = drivenCar.collisionRadius + targetCar.collisionRadius - 0.01;
  assert.ok(
    targetCar.x - drivenCar.x >= minAllowedDist,
    "Driven car must not pass through target car"
  );
  assert.ok(drivenCar.speed <= 0, "Driven car should stop/bounce on impact");
});

test("PoliceSystem: adds heat, spawns police, clears after 8s out of sight, and busts when cornered", () => {
  const world = new World();
  const police = new PoliceSystem();
  const target = { x: 1500, y: 600 };

  assert.equal(police.wantedLevel, 0);
  police.addHeat(1, target, world);
  assert.equal(police.wantedLevel, 1);
  assert.ok(police.policeCars.length >= 1);

  // Place police far away (> 420px) and advance 8.1s -> wanted level clears
  police.policeCars[0].x = 200;
  police.policeCars[0].y = 200;
  for (let i = 0; i < 85; i++) {
    police.update(0.1, { x: 2000, y: 1500 }, 0, world, []);
  }
  assert.equal(police.wantedLevel, 0);
  assert.equal(police.policeCars.length, 0);

  // Cornering player at low speed for 2s triggers BUSTED
  police.addHeat(1, target, world);
  police.policeCars[0].x = target.x + 20;
  police.policeCars[0].y = target.y;
  for (let i = 0; i < 25; i++) {
    police.update(0.1, target, 0, world, []);
  }
  assert.equal(police.isBusted, true);
});

test("MissionManager: starts timed mission on entering start zone and awards +$500 on completion", () => {
  const mission = new MissionManager();
  assert.equal(mission.cash, 0);
  assert.equal(mission.state, "idle");

  // Enter start zone
  mission.update(0.1, { x: mission.startZone.x, y: mission.startZone.y });
  assert.equal(mission.state, "active");
  assert.ok(mission.timeLeft > 0);

  // Reach target zone
  mission.update(0.1, { x: mission.targetZone.x, y: mission.targetZone.y });
  assert.equal(mission.cash, 500);
  assert.equal(mission.state, "idle");
});

// ---------------------------------------------------------------------------
// Regression tests for the Phase 1 review fixes
// ---------------------------------------------------------------------------

test("Regression: ambient traffic never gridlocks on parked cars (60s simulation)", () => {
  const world = new World();
  const vehicles = createInitialVehicles();
  const farAwayPlayer = { x: 60, y: 1740 };
  const traffic = vehicles.filter((v) => v.isTraffic);
  const traveled = traffic.map(() => 0);

  for (let step = 0; step < 60 * 60; step++) {
    traffic.forEach((car, i) => {
      const px = car.x;
      const py = car.y;
      car.updateTraffic(1 / 60, world, vehicles, farAwayPlayer);
      traveled[i] += Math.hypot(car.x - px, car.y - py);
    });
  }

  traffic.forEach((car, i) => {
    assert.ok(traveled[i] > 6000, `Traffic car #${i} only traveled ${traveled[i].toFixed(0)}px (stuck)`);
    assert.ok(car.speed > 0, `Traffic car #${i} ended the simulation stopped`);
  });
});

test("Regression: a hijacked traffic car does not drive away on its own after exit", () => {
  const world = new World();
  const vehicles = createInitialVehicles();
  const car = vehicles.find((v) => v.isTraffic);

  car.enterByPlayer();
  assert.equal(car.isTraffic, false);
  assert.equal(car.waypoints, null);

  car.speed = 0;
  car.exitByPlayer();
  const startX = car.x;
  const startY = car.y;
  for (let i = 0; i < 120; i++) {
    car.updateTraffic(1 / 60, world, vehicles, null);
  }
  assert.ok(Math.hypot(car.x - startX, car.y - startY) < 0.001, "Abandoned car must stay put");
});

test("Regression: an abandoned moving car coasts to a stop instead of freezing instantly", () => {
  const world = new World();
  const car = new Vehicle({ x: 1615, y: 900, angle: Math.PI / 2 });
  car.enterByPlayer();
  car.speed = 300;
  car.exitByPlayer();

  car.updateTraffic(1 / 60, world, [car], null);
  assert.ok(car.speed > 0 && car.speed < 300, "Car should keep momentum and slow down");
  const yAfterOneFrame = car.y;
  assert.ok(yAfterOneFrame > 900, "Car should keep rolling forward");

  for (let i = 0; i < 300; i++) {
    car.updateTraffic(1 / 60, world, [car], null);
  }
  assert.equal(car.speed, 0, "Car should come to a full stop via coasting drag");
});

test("Regression: alleys are wider than the player and walkable without clipping walls", () => {
  const world = new World();
  const player = new Player(0, 0);
  assert.ok(ALLEY_WIDTH > player.radius * 2, "Alley must be wider than the player diameter");

  const b = world.buildings[0];
  player.x = b.x + b.w + ALLEY_WIDTH / 2;
  player.y = b.y - 20;
  let maxPenetration = 0;

  for (let i = 0; i < 150; i++) {
    player.update(1 / 60, { dx: 0, dy: 1, isRunning: false }, world);
    for (const c of world.getColliders()) {
      const cx = Math.max(c.x, Math.min(player.x, c.x + c.w));
      const cy = Math.max(c.y, Math.min(player.y, c.y + c.h));
      maxPenetration = Math.max(maxPenetration, player.radius - Math.hypot(player.x - cx, player.y - cy));
    }
  }

  assert.ok(player.y > b.y + b.h, "Player should walk all the way through the alley");
  assert.ok(maxPenetration <= 0.01, `Player clipped ${maxPenetration.toFixed(2)}px into a wall`);
});

test("Physics: push-out settles a circle in a narrow gap and ejects from inside boxes", () => {
  const boxes = [
    { x: 0, y: 0, w: 100, h: 100 },
    { x: 130, y: 0, w: 100, h: 100 },
  ];
  const world = { width: 1000, height: 1000 };

  // 30px gap, radius-13 circle overlapping the left wall by 8px: ends fully free of both walls.
  const body = { x: 105, y: 50 };
  assert.equal(resolveCircleVsAabbs(body, 13, boxes), true);
  assert.ok(isCircleFree(body.x, body.y, 13, world, boxes), `Body at x=${body.x} still overlaps a wall`);

  // Concave corner (two boxes meeting at a right angle): settles outside both.
  const corner = [
    { x: 0, y: 0, w: 100, h: 50 },
    { x: 0, y: 50, w: 50, h: 50 },
  ];
  const wedged = { x: 55, y: 55 };
  resolveCircleVsAabbs(wedged, 13, corner);
  assert.ok(isCircleFree(wedged.x, wedged.y, 13, world, corner), "Body must settle outside the corner");

  // Center fully inside a box ejects along the shallowest axis.
  const inside = { x: 5, y: 50 };
  resolveCircleVsAabbs(inside, 10, [{ x: 0, y: 0, w: 100, h: 100 }]);
  assert.equal(inside.x, -10);
  assert.equal(inside.y, 50);
});

test("Game loop: delta-time clamping prevents tab-switch tunneling", () => {
  assert.equal(clampFrameDt(5), MAX_FRAME_DT);
  assert.equal(clampFrameDt(0.016), 0.016);
  assert.equal(clampFrameDt(-1), 0);
  assert.equal(clampFrameDt(Number.NaN), 0);

  // A max-speed car hit by a 5-second hitch frame must still stop at the wall.
  const world = new World();
  const building = world.buildings[0];
  const car = new Vehicle({ x: building.x - 30, y: building.y + building.h / 2, angle: 0 });
  car.speed = 460;
  car.updatePlayerDriven(clampFrameDt(5), { throttle: 1, steer: 0, handbrake: false }, world);
  assert.ok(car.x <= building.x - car.collisionRadius + 0.01, "Car must not tunnel into the building");
});

test("RadioManager: setPaused is safe headless and keeps the selected station", () => {
  const radio = new RadioManager();
  radio.cycleStation();
  radio.setPaused(true);
  assert.equal(radio.isPaused, true);
  assert.equal(radio.getCurrentStation().name, "Vice FM");
  radio.setPaused(false);
  assert.equal(radio.isPaused, false);
});
