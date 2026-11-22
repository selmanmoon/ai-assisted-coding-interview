# Mini GTA 6 — Coding Standards

These standards keep the codebase modular, readable, and ready to scale as new features (vehicles, NPCs, traffic, audio, missions) are added.

## 1. Language & Module Structure
- **ES Modules (`type="module"`)**: Every source file under `src/` is an explicit ES module with named exports (or a single well-documented class export). Avoid polluting `window` or global scope.
- **Zero-Dependency Core**: Keep the runtime free of external frameworks or build tools unless an ADR explicitly approves one.
- **File Naming**: Use `lowercase.js` for modules (`world.js`, `player.js`, `camera.js`) and `PascalCase` for classes (`Player`, `Camera`, `World`).

## 2. Separation of Concerns
- **Simulation vs. Rendering**: State updates (`update(dt, ...)`) must never draw to the canvas. Rendering (`render(ctx, ...)`) must never mutate game state.
- **World Data vs. Logic**: Static map geometry, colors, districts, and colliders live in `world.js` (or data files), separate from physics/collision resolution.
- **Input Decoupling**: Entities consume an abstract input state (`{ dx, dy, isRunning }`), never raw `KeyboardEvent` listeners. This allows future AI/NPC controllers or touch/gamepad inputs to drive the same entity interface.

## 3. Game Loop & Frame-Rate Independence
- **Delta Time (`dt`)**: All movement, animations, and camera smoothing must be multiplied by `dt` (in seconds) rather than assuming 60 FPS.
- **Clamped `dt`**: Clamp `dt` to a maximum (e.g., `0.05s`) in `main.js` so tab-switching or frame hitches never cause tunneling through walls.
- **Exponential Smoothing**: Use `1 - Math.exp(-speed * dt)` for camera/angle interpolation instead of fixed-step `lerp(a, b, 0.1)`.

## 4. Canvas Rendering Discipline
- Always wrap local transforms (`ctx.translate`, `ctx.rotate`, `ctx.scale`) or style changes in `ctx.save()` / `ctx.restore()`.
- Cull off-screen static objects when world size grows (or check viewport bounds before drawing complex entities).

## 5. Documentation & Constants
- **JSDoc**: Document public classes, methods, and non-obvious coordinate/unit conventions (pixels, radians, seconds).
- **Constants**: Group tunable gameplay values (speeds, sizes, colors) at the top of each module or in a dedicated config object—avoid buried magic numbers.
