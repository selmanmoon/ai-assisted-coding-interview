# Vice City Mini (GTA 6 Browser Edition) — Interactive Web Game

## Overview
Build a playable, top-down 2D **Mini GTA 6** open-world sandbox in the browser using HTML5 Canvas + JavaScript/TypeScript (or React — your choice).

## Interview Guidelines (HackerRank AI-Assisted — Unguarded Mode)
- **Time:** 45 minutes
- **AI Assistant:** Full access (inline completions, file-aware chat, Plan mode, Agent mode).
- **Note:** Some specifications below are intentionally left open. Clarify assumptions as you go, and only expand the sections below when you reach them.

---

<details>
<summary><strong>Core Requirements (Expand to start)</strong></summary>

### 1. The City & Camera
- Render a scrollable top-down **Vice City-inspired mini-map** (roads, city blocks/buildings, beach/waterfront).
- Implement a smooth **follow-camera** centered on the player.

### 2. Player & Vehicle Switching
- The player starts **on foot** and can walk/run around the city.
- Players can **enter and exit vehicles** parked on the map.
- Driving should feel distinct from walking (acceleration, steering, braking/reverse).
- Prevent the player and cars from driving through buildings.

### 3. HUD & Controls
- Show a minimal HUD: current mode (**On-Foot / Driving**), **Speed**, and basic controls (**Pause / Reset**).

</details>

---

## Clarifications (Expand only if you ask about them)

<details>
<summary>Clarification 1 — World Size, Camera & Collisions</summary>

- **World size:** `2400 × 1800` px (larger than viewport so the camera scrolls).
- **Camera:** Smoothly follows the player/car (lerp) and clamps to world boundaries.
- **Collisions:**
  - On foot: circle vs. building AABB with smooth wall-sliding.
  - Driving: solid collision with buildings (stops/bounces velocity without getting stuck inside walls).

</details>

<details>
<summary>Clarification 2 — Vehicle Physics & Enter/Exit Edge Cases</summary>

- **Controls:** `WASD` / Arrow keys to move/drive, `E` or `F` to enter/exit vehicle, `Space` for handbrake/drift.
- **Driving physics:**
  - Cars **cannot rotate in place** when speed is `0` — turning rate should scale with velocity.
  - Natural friction/drag when not accelerating; reverse gear when braking from stop.
- **Enter/Exit edge cases:**
  - Entering picks the **nearest vehicle within 60px**.
  - Exiting places the player beside the car on a **valid, non-colliding side** (never spawns the player trapped inside a building or water).

</details>

<details>
<summary>Clarification 3 — Ambient World (Traffic & Parked Cars)</summary>

- Spawn at least **6–8 vehicles** across the city (mix of parked cars and simple ambient traffic driving along road lanes).
- Visual style: Neon Miami/Vice City palette (magenta/cyan accents, palm trees, beach strip, crosswalks).

</details>

---

## Additional Requirements (Expand one at a time after Core works)

<details>
<summary>Follow-Up 1 — Wanted Level & Police Chase (★ to ★★★★★)</summary>

- Add a **Wanted Level (0 to 5 stars)** in the top-right HUD.
- Triggering heat (e.g., stealing a moving car, colliding with traffic, or speeding past a police car) increases the Wanted Level.
- When Wanted Level ≥ 1:
  - Spawn **Police Cars** with flashing red/blue lights that actively chase the player/car.
  - Show a **cooldown timer**: staying out of police sight/range for **8 seconds** clears the Wanted Level.
  - If police trap/corner you at low speed for `2 seconds` → **BUSTED** screen with quick restart.

</details>

<details>
<summary>Follow-Up 2 — Mini-Missions, Minimap & Vice City Radio HUD</summary>

- Add a **Corner Minimap** showing roads, player position, police blips, and active mission target.
- Add a **Timed Getaway / Delivery Mission**:
  - Entering a glowing yellow mission zone starts a countdown to reach a target checkpoint across the city (with a directional arrow pointing toward it).
  - Completing the mission awards **+$500** and spawns a new mission.
- Add a lightweight **Radio Station HUD** (`R` key cycles station names like *Vice FM*, *Neon Synth*, *Off* — optional Web Audio API synth beat).

</details>

<details>
<summary>Follow-Up 3 — Architecture & Edge-Case Testing</summary>

- Decouple the **physics, collision, and wanted-level simulation** from the HTML5 Canvas renderer.
- Write unit tests covering:
  1. Stationary car cannot rotate (`speed === 0` → angle unchanged).
  2. Building collision prevents tunneling/clipping at high speed.
  3. Exiting a car next to a wall spawns the player on the safe opposite side.
  4. Delta-time clamping (`dt` capped, e.g., `<= 0.05s`) so switching browser tabs doesn't teleport cars through buildings.

</details>

<details>
<summary>Final — Interviewer Review Questions (Post-Code)</summary>

1. Walk through your **AI chat transcript**: where did the AI accelerate you, and where did you catch a physics/collision bug it introduced?
2. What happens when a fast car moves `25px` in a single frame next to a `20px` thin wall (tunneling), and how would you fix it?
3. If we scaled this city to `10,000 × 10,000` with `300` NPC cars and police units, where would your frame loop bottleneck be and how would you optimize collision checks (e.g., spatial hashing / quadtree)?

</details>
