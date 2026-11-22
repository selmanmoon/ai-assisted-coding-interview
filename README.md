# Grid Defense — Interactive Web Game

## Overview
Build a playable, browser-based **Grid Tower Defense** game using HTML/CSS/JavaScript (or React/TypeScript — your choice).

## Core Requirements

### 1. The Arena
- Render a grid with a **Start** cell on the left edge and a **Goal** cell on the right edge.
- Players can click cells to **place or remove Towers**.

### 2. Live Pathfinding
- Enemies spawn at **Start** and move smoothly toward **Goal** along the shortest valid path.
- Whenever a tower is placed or removed, active enemies must adapt their path in real time.
- Players should not be able to break the game by blocking the path.

### 3. Combat & Game Loop
- Towers automatically shoot enemies within range.
- Enemies take damage and are defeated when their HP reaches `0`.
- Display **Lives**, **Score**, and basic game controls (**Start / Pause / Reset**).

## Interview Guidelines (HackerRank AI-Assisted — Unguarded Mode)
- **Time:** 45 minutes
- **AI Assistant:** Full access (inline completions, file-aware chat, Plan mode, Agent mode).
- **Note:** Some specifications above are intentionally left open. Clarify assumptions as you go, and only expand the sections below when you reach them.

---

## Clarifications (Expand only if you ask about them)

<details>
<summary>Clarification 1 — Grid Size & Movement Rules</summary>

- **Grid size:** `15 × 10` (15 columns, 10 rows).
- **Start / Goal:** Fixed at `(0, 4)` and `(14, 4)` (left-middle to right-middle).
- **Movement:** **4-directional only** (up, down, left, right — no diagonals).

</details>

<details>
<summary>Clarification 2 — Tower Placement Edge Cases</summary>

- Cannot place a tower on **Start** or **Goal**.
- Cannot place a tower on a cell **currently occupied by an enemy**.
- Cannot place a tower if it **completely blocks all paths** from Start to Goal — reject the placement and show brief visual feedback (e.g., red flash / toast).
- Removing a tower is always allowed and immediately triggers path recalculation.

</details>

<details>
<summary>Clarification 3 — Combat Numbers & Lives</summary>

- **Tower range:** 2-cell radius (Euclidean distance), targets the **nearest enemy** (or enemy closest to Goal).
- **Tower fire rate:** 1 shot every `0.8s`, dealing `25` damage.
- **Enemy base stats:** `100 HP`, moves at `2 cells/sec`, spawns every `1.5s`.
- **Lives:** Start with `10` lives (`-1` when an enemy reaches Goal; Game Over at `0`).
- **Score:** `+10` per defeated enemy.

</details>

---

## Additional Requirements (Expand one at a time after Core works)

<details>
<summary>Follow-Up 1 — Economy & Multiple Tower Types</summary>

- Start the player with **150 Gold**.
- Defeating an enemy grants **+20 Gold**; removing a tower refunds **50%** of its cost.
- Support **3 tower types** selectable from a toolbar:
  1. **Basic Tower (50g):** Balanced range (`2` cells), medium fire rate, `25` dmg.
  2. **Sniper Tower (90g):** Long range (`4.5` cells), slow fire rate (`2.0s`), high damage (`75` dmg).
  3. **Frost Tower (75g):** Short range (`2` cells), low damage (`10` dmg), slows hit enemies by **50% for 2 seconds**.

</details>

<details>
<summary>Follow-Up 2 — Wave System & Speed Control</summary>

- Replace infinite spawning with **progressive Waves** (Wave 1, Wave 2, Wave 3...):
  - Each wave spawns more enemies with higher HP (e.g., `+25%` HP per wave).
  - Show current wave number and a **"Next Wave"** button (or short countdown between waves).
- Add a **1x / 2x Speed** toggle that scales movement, spawn intervals, fire cooldowns, and slow durations consistently without breaking physics.

</details>

<details>
<summary>Follow-Up 3 — Architecture & Edge-Case Testing</summary>

- Decouple the **pathfinding & placement validation engine** from the UI rendering layer.
- Write unit tests covering:
  1. Shortest path calculation around obstacles.
  2. Rejecting a tower that completely blocks the path.
  3. Rejecting placement on Start, Goal, or an occupied enemy cell.
  4. Rerouting an active enemy mid-path without teleporting or getting stuck.

</details>

<details>
<summary>Final — Interviewer Review Questions (Post-Code)</summary>

1. Walk through your **AI chat transcript**: where did the AI save you time, and where did you have to correct it?
2. What breaks if the user switches tabs for 10 seconds while the game is running (`requestAnimationFrame` delta-time spike)?
3. If the grid scaled up to `200 × 200` with `500` active enemies, where would your pathfinding bottleneck be and how would you redesign it (e.g., Flow Field / reverse BFS from Goal)?

</details>
