# ADR 0005: Wanted Level, Missions & Phase 1 Hardening

## Status
Accepted

## Context
Two gameplay systems were added on top of the Phase 1 sandbox: a GTA-style **Wanted Level with police pursuit**, and **timed delivery/getaway jobs** with cash rewards. A follow-up review of Phase 1 found these bugs, all confirmed with headless simulations:
1. **Traffic gridlock**: 4 of the 5 parked cars sat inside clockwise traffic lanes. Traffic AI only yields (it cannot overtake), so 3 of the 4 traffic cars stopped permanently within seconds.
2. **Hijacked cars drove off**: entering a traffic car cleared `isTraffic` but kept its `waypoints`, so after the player exited, the car resumed its route on its own.
3. **Alleys narrower than the player**: the alleys were `22px` wide but the player is `26px` wide. Walking through only worked because single-pass collision resolution let the player sink about 2px into both walls.
4. Collision and angle helpers were copied across `player.js`, `vehicle.js`, and `police.js`.

## Decision
- **`PoliceSystem` (`src/police.js`)** and **`MissionManager` (`src/mission.js`)** are DOM-free simulation modules that follow the same `update(dt, ...)` / `reset()` contract as other entities. `main.js` only wires them to input and the HUD.
- **`src/physics.js`** is the single home for shared math: `lerpAngle`, **iterative** circle-vs-AABB push-out (`COLLISION_ITERATIONS = 3`, shallowest-axis ejection when the center is inside a box), `isCircleFree`, `clampToWorld`, and `clampFrameDt` (`MAX_FRAME_DT = 0.05s`).
- **Parked cars sit on the curb** (`CURB_OFFSET = 40px` from the road centerline, on the side opposite the traffic lane), so they can never block traffic.
- **Vehicle ownership is explicit**: `enterByPlayer()` clears AI waypoints, and `exitByPlayer()` hands the car to a coasting update. Abandoned cars keep their momentum, slow down with drag, and still collide.
- **Alleys are `ALLEY_WIDTH = 34px`**, wider than the player.
- **Runtime polish**: the canvas renders at `devicePixelRatio`, the radio suspends while paused, the game auto-pauses on `visibilitychange`, and HUD buttons drop focus after clicks.
- Every fix ships with a regression test in `tests/run-tests.mjs` (for example, a 60-second traffic simulation asserting no car gets stuck).

## Consequences
- **Positive**: Traffic flows indefinitely. Car ownership has no hidden AI state. Collision code exists in one place and settles bodies wedged in corners. The test suite grew to 20 headless tests.
- **Negative / Trade-offs**: Traffic AI still cannot overtake or reroute; a car the player parks in a lane will (correctly) stop traffic until moved. Vehicle-vs-vehicle collisions remain one-sided (only the moving car is pushed). Both are tracked for Phase 2.
