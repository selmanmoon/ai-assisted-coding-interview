# ADR 0002: Modular Separation for Future Entities (Vehicles & NPCs)

## Status
Accepted

## Context
The initial release only requires an on-foot player walking/running around a Vice City-inspired map. However, a GTA-style sandbox will naturally grow to include drivable vehicles, pedestrians, traffic, and interactive world objects.

## Decision
Separate the architecture into eight independent layers:
1. `InputManager` (`src/input.js`): Captures keyboard state and exposes normalized on-foot intent (`dx`, `dy`, `isRunning`), driving controls (`throttle`, `steer`, `handbrake`), and single-press action keys.
2. `World` (`src/world.js`): Owns map dimensions, zones/districts, roads, buildings, beach/waterfront geometry, and static colliders.
3. `Player` (`src/player.js`): Owns character state, movement physics, collision resolution, and stride animation.
4. `Vehicle` (`src/vehicle.js`): Owns drivable vehicle state, velocity-scaled steering, drift physics, circle-vs-AABB collision push-out, safe exit probing, and AI traffic obstacle yielding.
5. `Traffic` (`src/traffic.js`): Spawns the initial parked cars and ambient cruising traffic vehicles along right-hand road-lane waypoint loops.
6. `RadioManager` (`src/radio.js`): Manages Vice City radio station selection (`Off`, `Vice FM`, `Neon Synth`, `Sunset 80s`) and optional Web Audio API synth beats, safely no-oping in headless/Node environments.
7. `Camera` (`src/camera.js`): Tracks any target `{ x, y }` (player or active vehicle) smoothly within world bounds.
8. `Renderer` (`src/renderer.js`): Draws the world, entities, interactive prompts, and HUD mini-map from read-only state.

Simulation modules (`World`, `Player`, `Vehicle`, `Traffic`, `Camera`, `RadioManager`) are decoupled from DOM and Canvas APIs, allowing `tests/run-tests.mjs` to import and verify physics, collision, spatial probing, and state transitions directly in Node without a DOM.

## Consequences
- **Positive**:
  - `Vehicle` and `Traffic` plug into the same `update` / `render` contract as `Player`, letting `Camera` seamlessly target the active vehicle when the player enters it.
  - `World` colliders are queried uniformly by the player, player-driven vehicles, and AI traffic.
  - Headless Node verification via `tests/run-tests.mjs` runs fast with zero browser or DOM mocking overhead.
- **Negative / Trade-offs**:
  - Slightly more files upfront than a single-file prototype, which is intentional for maintainability.

## Addendum (ADR 0005)
Three more layers follow the same DOM-free contract: `PoliceSystem` (`src/police.js`), `MissionManager` (`src/mission.js`), and the shared `physics.js` helpers used by `Player`, `Vehicle`, and `PoliceSystem`. See [ADR 0005](0005-wanted-missions-and-phase1-hardening.md).
