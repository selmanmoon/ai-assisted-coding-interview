# 🌴 Mini GTA 6: Vice City Sandbox

A playable, top-down 2D **Vice City-inspired open-world sandbox** in the browser, built with **vanilla ES modules + HTML5 Canvas**. There are zero runtime dependencies and no build step.

> Phase 1: local, single-player, basic implementation. Multiplayer is out of scope for this phase.

## Features
- 🏙️ **2400 × 1800 city** with roads, Art Deco blocks with walkable alleys, a beach promenade, and an ocean shoreline.
- 🎥 **Smooth follow camera**, frame-rate independent and clamped to world bounds.
- 🚶 **On foot**: walk/run (`Shift`) with wall-sliding collision.
- 🚗 **Vehicles**: enter/exit (`E`/`F`) the nearest car within 60px. Arcade physics with acceleration, speed-scaled steering (no spinning in place), brake → reverse, handbrake drift (`Space`), solid collisions, and a safe exit spot.
- 🚦 **Ambient traffic** on right-hand lane loops, plus parked cars on the curbs.
- 🚨 **Wanted level (0–5★) & police chase**: heat from carjacking, crashes, or speeding past cops. Escape for 8s to clear it, or get cornered for 2s and you're **BUSTED**.
- 💼 **Jobs**: timed delivery/getaway missions with a guiding arrow and a `+$500` reward.
- 📻 **Vice City Radio** (`R`) with a Web Audio synth beat, plus a **minimap** with police and mission blips.

## Quick Start
```bash
cd mini-gta6
npm start            # or: python3 -m http.server 8080
# open http://localhost:8080
```
ES modules need to be served over HTTP; opening `index.html` via `file://` won't work.

## Controls
| Key | Action |
|---|---|
| `WASD` / Arrows | Move / drive |
| `Shift` | Run |
| `Space` | Handbrake / drift |
| `E` / `F` | Enter / exit vehicle |
| `R` | Cycle radio station |
| `P` | Pause / resume |
| `Shift+R` | Reset / restart after BUSTED |

## Tests
```bash
npm test             # node --test tests/run-tests.mjs (20 headless tests, no DOM needed)
npm run check        # syntax-check every module
```
CI runs both on every push (`.github/workflows/mini-gta6.yml`).

## Project Structure
```
mini-gta6/
├── index.html            # Canvas + DOM HUD + overlays
├── style.css
├── package.json          # npm start / test / check
├── src/
│   ├── main.js           # Game loop, mode switching, HUD wiring, HiDPI sizing
│   ├── input.js          # Keyboard → normalized intent
│   ├── physics.js        # Shared collision, angle, and dt-clamp helpers
│   ├── world.js          # Map geometry, colliders, districts
│   ├── player.js         # On-foot entity
│   ├── vehicle.js        # Driving physics, traffic AI, coasting, enter/exit
│   ├── traffic.js        # Parked cars + traffic loops
│   ├── police.js         # Wanted level + police pursuit + BUSTED
│   ├── mission.js        # Timed jobs + cash
│   ├── radio.js          # Vice City radio (Web Audio)
│   ├── camera.js         # Smooth follow camera
│   └── renderer.js       # Canvas drawing + minimap
├── tests/run-tests.mjs   # node:test suite
└── docs/
    ├── ARCHITECTURE.md   # System diagram + data flow
    ├── CODING_STANDARDS.md
    ├── USER_GUIDE.md     # Player journey
    └── adr/              # Architecture Decision Records 0001–0005
```

## Docs
- [Architecture](docs/ARCHITECTURE.md) · [Coding Standards](docs/CODING_STANDARDS.md) · [User Guide](docs/USER_GUIDE.md)
- ADRs: [0001 Vanilla ES modules](docs/adr/0001-vanilla-es-modules-canvas.md) · [0002 Modular architecture](docs/adr/0002-modular-ecs-ready-architecture.md) · [0003 Camera & coordinates](docs/adr/0003-camera-and-coordinate-system.md) · [0004 Physics & collision](docs/adr/0004-physics-collision-and-spatial-awareness.md) · [0005 Wanted, missions & hardening](docs/adr/0005-wanted-missions-and-phase1-hardening.md)

## Roadmap (Phase 2+)
- Fixed-timestep simulation (deterministic, multiplayer-ready)
- Traffic overtaking/rerouting, two-sided vehicle collision response
- Spatial hashing for large entity counts
- Gamepad/touch input, settings menu, Vite build + static hosting
