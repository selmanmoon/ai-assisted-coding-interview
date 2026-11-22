# Mini GTA 6 — Player User Guide

Welcome to **Mini GTA 6**, a top-down Vice City-inspired open-world sandbox. Here is everything you need to explore the city, steal a ride, and hit the beach.

## 1. Spawning on Ocean Drive
You start on foot on **Ocean Drive** (`(1545, 585)`), just west of the palm-lined boardwalk and **Vice Beach**. The HUD in the top-right shows your Wanted level, cash, current job, district, movement state, speed, and radio station. Use the minimap in the bottom-left to orient yourself.

## 2. Exploring on Foot
- **Move**: Use `W`, `A`, `S`, `D` or the **Arrow keys** to walk (`185 px/s`).
- **Sprint**: Hold `Shift` while moving to run (`330 px/s`).
- Art Deco buildings have walkable alleyways (`34px` wide) between them, and your character will slide smoothly along walls and corners.

## 3. Finding & Entering a Car
- Parked cars sit along the curbs across the city (including a neon pink/cyan ride right near your Ocean Drive spawn), and ambient traffic cruises along the city's road loops.
- Walk within **`60px`** of any car—parked or cruising—to see the **`[E]`** prompt appear.
- Press **`E`** or **`F`** to hop in! Press **`E`** or **`F`** again to step out onto a safe spot beside the vehicle. A car you abandon at speed keeps rolling and coasts to a stop. Cars you take from traffic stay where you leave them.

## 4. Driving, Drifting & Reversing
- **Accelerate**: Hold `W` or `ArrowUp`.
- **Steer**: Use `A`/`D` or `ArrowLeft`/`ArrowRight` (steering responds to your speed—you won't spin in place at `0 MPH`).
- **Brake & Reverse**: Hold `S` or `ArrowDown` to brake while moving forward; once you slow down (`<= 10`), holding it engages reverse gear.
- **Handbrake / Drift**: Hold **`Space`** while steering at speed to kick out the rear end and drift around corners.

## 5. Tuning the Vice City Radio
- Press **`R`** to cycle through the Vice City Radio stations:
  **`Vice FM`** → **`Neon Synth`** → **`Sunset 80s`** → **`Off`**
- Each station plays its own synthesized Vice City groove via the Web Audio API.

## 6. Visiting Vice Beach & Waterfront
- Head east past **Ocean Drive** onto the **Beach Promenade** and **Vice Beach**, complete with palm trees and colorful beach umbrellas.
- The **Ocean** shoreline along the east edge acts as a solid boundary—both on foot and in vehicles—so you can cruise right along the water's edge without getting stuck.

## 7. Jobs (Timed Delivery / Getaway Missions)
- A glowing yellow **`JOB`** zone is always waiting somewhere in the city (check the **MISSION** badge and the yellow minimap blip).
- Step or drive into it to start a **`32s`** countdown. A yellow arrow points toward the target checkpoint.
- Reach the checkpoint in time for **`+$500`** (shown in the **CASH** badge). Fail or succeed, the next job spawns automatically.

## 8. Wanted Level & Police
- Stealing a moving car, crashing into other vehicles, or speeding past a cop raises your **Wanted** level (☆☆☆☆☆ → ★★★★★).
- Police cruisers with flashing red/blue lights spawn and chase you (they show as flashing blips on the minimap).
- Stay out of police sight for **`8s`** (the HUD shows the countdown) to clear your Wanted level.
- If police corner you at low speed for **`2s`**, you're **BUSTED**: press **`Shift+R`** or click **Restart**.

## 9. Pausing & Resetting
- **Pause / Resume**: Press **`P`** or click the **`Pause (P)`** button in the HUD. The radio goes quiet while paused, and the game auto-pauses when you switch tabs.
- **Reset World**: Click the **`Reset`** button in the HUD or press **`Shift+R`** to respawn on Ocean Drive with fresh parked cars and traffic.
