# ADR 0003: World-Space Coordinates, Smooth Camera & Circle-AABB Collision

## Status
Accepted

## Context
The map is larger than the browser viewport (`2400 × 1800` px) and requires a smooth follow-camera centered on the player, plus reliable collision with city buildings and the ocean shoreline.

## Decision
1. **World-Space Coordinates**: All entities, roads, buildings, and colliders operate in world pixels `(0..width, 0..height)` with `(0, 0)` at the top-left of the map.
2. **Smooth Follow-Camera**: `Camera` tracks the player's center using frame-rate-independent exponential damping (`1 - Math.exp(-smoothing * dt)`) and clamps to `[0, worldWidth - viewWidth]` and `[0, worldHeight - viewHeight]` so no void is visible at map edges.
3. **Circle-vs-AABB Collision**: The player uses a circular hitbox (`radius = 13`) resolved against axis-aligned bounding boxes (buildings and water boundary) closest-point push-out (resolved iteratively, up to 3 passes, via `src/physics.js`), enabling smooth wall-sliding instead of snagging on corners.

## Consequences
- **Positive**:
  - Smooth, jitter-free camera motion regardless of monitor refresh rate (60Hz, 120Hz, 144Hz).
  - Natural wall-sliding when walking diagonally into buildings.
- **Negative / Trade-offs**:
  - At map edges, the camera stops scrolling while the player continues to the boundary, which is standard for bounded 2D open-world maps.
