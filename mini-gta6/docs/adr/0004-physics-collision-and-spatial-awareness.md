# ADR 0004: Physics, Collision, Spatial & Environment Awareness

## Status
Accepted

## Context
Mini GTA 6 combines on-foot exploration, high-speed arcade driving with handbrake drifting, and ambient AI traffic inside a Vice City-inspired 2D world (`2400 x 1800`). Entities must move fluidly around Art Deco buildings, stay out of the ocean, enter/exit vehicles safely without clipping into walls, and react naturally to obstacles.

## Decision

### 1. On-Foot Physics & Collision (`src/player.js`)
- **Movement Speeds**: Walking moves at `185 px/s`; holding `Shift` sprints at `330 px/s`. Diagonal input vectors are normalized by `1 / sqrt(2)` so diagonal movement does not exceed cardinal speed.
- **Circle-vs-AABB Wall Sliding**: The player is modeled as a circle with radius `r = 13`. Each frame, after applying velocity, the player is tested against all static AABB colliders in `World.getColliders()` and pushed out along the minimum penetration vector, producing smooth wall-sliding along building edges and the shoreline before clamping to world bounds.

### 2. Vehicle Physics (`src/vehicle.js`)
- **Velocity-Scaled Steering**: Turn rate scales linearly with `Math.min(1, Math.abs(speed) / 140)`. At `0 MPH`, `speedFactor` is `0`, preventing stationary spinning. Steering direction flips automatically when reversing.
- **Coasting Drag**: When no throttle or reverse input is held, `COAST_DRAG` (`190 px/s²`) smoothly decelerates the vehicle toward `0` without overshooting.
- **Braking vs. Reverse Gear**: Pressing reverse (`S` / `ArrowDown`) while moving forward (`speed > 10`) engages brakes (`560 px/s²` deceleration) rather than snapping straight into reverse. Once `speed <= 10`, reverse gear engages (up to `180 px/s` in reverse). The symmetric threshold applies when accelerating forward from reverse (`speed < -10`).
- **Handbrake & Drift (`Space`)**: Holding `Space` applies handbrake deceleration (`480 px/s²`), boosts turn rate by `1.35x`, and—when steering above `90 px/s`—injects lateral velocity (`lateralVel`) with exponential damping so the car slides sideways before regaining grip.

### 3. Vehicle Collision (`src/vehicle.js`)
- **Solid Circle-vs-AABB Push-Out**: Vehicles use a collision circle of radius `r = 20` tested against all `World` AABBs (buildings and ocean shoreline) and world boundaries.
- **Impact Dampening**: Upon any collision or boundary clamp, the vehicle is pushed out of overlap and its forward speed is dampened and reversed (`speed = -speed * 0.25`, with `lateralVel *= 0.5`). This creates a crisp arcade bounce/stop and prevents cars from tunneling into buildings or getting stuck in ocean water.

### 4. Spatial Awareness (`src/main.js`, `src/vehicle.js`)
- **Vehicle Entry Proximity**: Pressing `E` or `F` checks squared distances from the player to all vehicles within `ENTER_VEHICLE_RADIUS` (`60px`), entering the nearest car (and showing the `[E]` prompt when in range on foot).
- **Safe Exit-Spot Probing**: Exiting a vehicle calls `Vehicle.getExitPosition(world, player.radius)`, which probes candidate directions in order—**left**, **right**, **rear**, **front**—at distances of `34px` and `44px`. The first point whose `r = 13` footprint is inside world bounds and free of all AABB colliders is chosen, preventing the player from exiting inside a wall or the ocean.
- **AI Traffic Forward-Cone Yielding**: Ambient traffic cars run `_hasObstacleAhead(vehicles, player)`, projecting other vehicles and the player onto the car's forward axis (`0 < forwardDist < 65px`) and lateral lane corridor (`|sideDist| < 28px`). If an obstacle is detected ahead, the traffic car brakes smoothly (`420 px/s²`) instead of piling into the player or other cars.

### 5. Environment Awareness (`src/world.js`, `src/traffic.js`)
- **District Zoning**: `World.getDistrictAt(x, y)` maps coordinates to named Vice City districts (`Vice Beach`, `Ocean Drive`, `North Downtown`, `Little Havana`, `Vice Downtown`) for live HUD display.
- **Shoreline Water Boundary**: `WATER_START_X` (`2060`) defines the ocean shoreline along the east edge of Vice Beach, backed by a full-height static AABB collider (`x = WATER_START_X + 8`) that blocks both on-foot players and vehicles.
- **Road-Lane Waypoint Loops**: `src/traffic.js` constructs clockwise rectangular waypoint loops offset (`22px`) into the right-hand lane of the road grid so ambient traffic cruises naturally around city blocks.

## Consequences
- **Positive**:
  - Consistent circle-vs-AABB math keeps on-foot and vehicle collisions predictable, fast, and easy to test headlessly in Node.
  - Safe exit probing eliminates soft-locks when parking tight against buildings or the boardwalk.
- **Negative / Trade-offs**:
  - Modeling vehicles as a single `r = 20` circle rather than an oriented bounding box (OBB) trades exact bumper-corner accuracy for fast, snag-free wall sliding.
