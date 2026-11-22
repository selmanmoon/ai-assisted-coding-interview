import { Camera } from "./camera.js";
import { InputManager } from "./input.js";
import { MissionManager } from "./mission.js";
import { clampFrameDt } from "./physics.js";
import { Player, RUN_SPEED, WALK_SPEED } from "./player.js";
import { PoliceSystem } from "./police.js";
import { RadioManager } from "./radio.js";
import { Renderer } from "./renderer.js";
import { createInitialVehicles } from "./traffic.js";
import { ENTER_VEHICLE_RADIUS, PX_PER_SEC_TO_MPH } from "./vehicle.js";
import { World } from "./world.js";


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");

const wantedStarsLabel = document.getElementById("wantedStars");
const wantedCooldownLabel = document.getElementById("wantedCooldown");
const cashLabel = document.getElementById("cashValue");
const missionLabel = document.getElementById("missionStatus");
const districtLabel = document.getElementById("districtName");
const moveStateLabel = document.getElementById("moveState");
const speedLabel = document.getElementById("speedValue");
const radioLabel = document.getElementById("radioStation");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const resumeBtn = document.getElementById("resumeBtn");
const pauseOverlay = document.getElementById("pauseOverlay");
const bustedOverlay = document.getElementById("bustedOverlay");
const bustedRestartBtn = document.getElementById("bustedRestartBtn");

const world = new World();
const input = new InputManager();
const radio = new RadioManager();
const police = new PoliceSystem();
const mission = new MissionManager();
const camera = new Camera(
  window.innerWidth,
  window.innerHeight,
  world.width,
  world.height,
  8
);
const renderer = new Renderer(ctx, minimapCtx);

let player = new Player(world.spawn.x, world.spawn.y);
let vehicles = createInitialVehicles();
/** @type {import('./vehicle.js').Vehicle | null} */
let activeVehicle = null;
let isPaused = false;

function setPaused(nextPaused) {
  isPaused = nextPaused;
  pauseOverlay.classList.toggle("hidden", !isPaused);
  pauseBtn.textContent = isPaused ? "Resume (P)" : "Pause (P)";
  radio.setPaused(isPaused);
  // Drop focus so Space/Enter can't re-trigger a clicked HUD button mid-game.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function resetGame() {
  player = new Player(world.spawn.x, world.spawn.y);
  vehicles = createInitialVehicles();
  activeVehicle = null;
  radio.reset();
  police.reset();
  mission.reset();
  radioLabel.textContent = radio.getCurrentStation().name;
  bustedOverlay.classList.add("hidden");
  setPaused(false);
  camera.centerOn(player);
}

function tryToggleVehicle() {
  if (activeVehicle) {
    const exitPos = activeVehicle.getExitPosition(world, player.radius);
    player.x = exitPos.x;
    player.y = exitPos.y;
    player.isMoving = false;
    player.isRunning = false;
    activeVehicle.exitByPlayer();
    activeVehicle = null;
    return;
  }

  let nearest = null;
  let bestDistSq = ENTER_VEHICLE_RADIUS * ENTER_VEHICLE_RADIUS;

  for (const car of vehicles) {
    const dx = car.x - player.x;
    const dy = car.y - player.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= bestDistSq) {
      bestDistSq = distSq;
      nearest = car;
    }
  }

  if (nearest) {
    if (nearest.isTraffic || Math.abs(nearest.speed) > 40) {
      police.addHeat(1, nearest, world);
    }
    nearest.enterByPlayer();
    activeVehicle = nearest;
  }
}

function handleResize() {
  // Render at device resolution for crisp output on HiDPI/Retina screens,
  // while all game/camera math stays in CSS pixels.
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  camera.resize(cssWidth, cssHeight);
}

pauseBtn.addEventListener("click", () => {
  if (!police.isBusted) setPaused(!isPaused);
});
resumeBtn.addEventListener("click", () => setPaused(false));
resetBtn.addEventListener("click", resetGame);
bustedRestartBtn.addEventListener("click", resetGame);

handleResize();
camera.centerOn(player);
window.addEventListener("resize", handleResize);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !isPaused && !police.isBusted) {
    setPaused(true);
  }
});

let lastTime = performance.now();
let elapsedTime = 0;

function updateHud(focusTarget) {
  districtLabel.textContent = world.getDistrictAt(focusTarget.x, focusTarget.y);

  if (activeVehicle) {
    moveStateLabel.textContent = "DRIVING";
    speedLabel.textContent = `${activeVehicle.getSpeedMph()} MPH`;
  } else {
    moveStateLabel.textContent = player.isRunning
      ? "RUNNING"
      : player.isMoving
        ? "WALKING"
        : "ON FOOT";
    const footSpeed = player.isRunning ? RUN_SPEED : player.isMoving ? WALK_SPEED : 0;
    const footMph = Math.round(footSpeed * PX_PER_SEC_TO_MPH * 0.25);
    speedLabel.textContent = `${footMph} MPH`;
  }

  wantedStarsLabel.textContent =
    "★".repeat(police.wantedLevel) + "☆".repeat(5 - police.wantedLevel);

  if (police.wantedLevel > 0 && police.cooldownTimer < 7.9) {
    wantedCooldownLabel.textContent = `(${police.cooldownTimer.toFixed(1)}s)`;
    wantedCooldownLabel.classList.remove("hidden");
  } else {
    wantedCooldownLabel.classList.add("hidden");
  }

  cashLabel.textContent = `$${mission.cash}`;

  if (mission.statusTimer > 0) {
    missionLabel.textContent = mission.statusMessage;
  } else if (mission.state === "active") {
    missionLabel.textContent = `${mission.targetZone.name} (${Math.ceil(mission.timeLeft)}s)`;
  } else {
    missionLabel.textContent = `Go to ${mission.startZone.name}`;
  }

  bustedOverlay.classList.toggle("hidden", !police.isBusted);
}

function gameLoop(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = clampFrameDt(rawDt);

  if (input.consumePress("KeyP") && !police.isBusted) {
    setPaused(!isPaused);
  }
  if (input.consumePress("KeyR")) {
    const isShiftHeld =
      input.keys.has("ShiftLeft") || input.keys.has("ShiftRight");
    if (isShiftHeld) {
      resetGame();
    } else if (!police.isBusted) {
      const station = radio.cycleStation();
      radioLabel.textContent = station.name;
    }
  }

  if (!isPaused && !police.isBusted) {
    elapsedTime += dt;

    if (input.consumePress("KeyE", "KeyF")) {
      tryToggleVehicle();
    }

    if (activeVehicle) {
      const driveInput = input.getDrivingInput();
      activeVehicle.updatePlayerDriven(dt, driveInput, world, vehicles);
      if (activeVehicle.collidedWithVehicle) {
        police.addHeat(1, activeVehicle, world);
      }
      player.x = activeVehicle.x;
      player.y = activeVehicle.y;
    } else {
      const moveInput = input.getMovementInput();
      player.update(dt, moveInput, world, vehicles);
    }

    for (const car of vehicles) {
      if (!car.isOccupied) {
        car.updateTraffic(dt, world, vehicles, player);
      }
    }

    const focusTarget = activeVehicle || player;
    const currentSpeedPx = activeVehicle
      ? activeVehicle.speed
      : player.isRunning
        ? RUN_SPEED
        : player.isMoving
          ? WALK_SPEED
          : 0;

    police.update(dt, focusTarget, currentSpeedPx, world, vehicles);
    mission.update(dt, focusTarget);
    camera.update(focusTarget, dt);

    updateHud(focusTarget);
  } else if (police.isBusted) {
    bustedOverlay.classList.remove("hidden");
  }

  input.endFrame();
  renderer.render(
    world,
    player,
    vehicles,
    activeVehicle,
    police,
    mission,
    camera,
    elapsedTime
  );
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
