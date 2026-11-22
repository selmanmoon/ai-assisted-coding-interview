# ADR 0001: Vanilla HTML5 Canvas & Native ES Modules

## Status
Accepted

## Context
We need a playable, singleplayer, top-down 2D open-world sandbox in the browser with a fast iteration loop, zero setup friction, and a clean path to scale.

## Decision
Use **HTML5 `<canvas>` (2D Context)** with **native browser ES Modules (`<script type="module">`)** and **vanilla CSS/HTML**, with no bundler or external game engine dependency for v1.

## Consequences
- **Positive**:
  - Instant startup with any static HTTP server (`python3 -m http.server`, `npx serve`, etc.).
  - Zero build pipeline or `node_modules` maintenance overhead.
  - Full control over the game loop, camera math, collision, and rendering pipeline.
- **Negative / Trade-offs**:
  - No TypeScript compile-time type checking yet (mitigated by strict JSDoc annotations and small, focused modules).
  - As entity counts grow (e.g., 100+ NPCs/vehicles), we may introduce spatial hashing or WebGL/PixiJS behind the `Renderer` boundary without changing simulation modules.
