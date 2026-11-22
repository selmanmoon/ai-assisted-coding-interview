import { ENTER_VEHICLE_RADIUS } from "./vehicle.js";
import {
  BEACH_START_X,
  PROMENADE_START_X,
  WATER_START_X,
} from "./world.js";

/**
 * Stateless renderer that draws the Vice City world, player, and HUD minimap.
 */
export class Renderer {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {CanvasRenderingContext2D} minimapCtx
   */
  constructor(ctx, minimapCtx) {
    this.ctx = ctx;
    this.minimapCtx = minimapCtx;
  }

  /**
   * Renders the full frame.
   * @param {import('./world.js').World} world
   * @param {import('./player.js').Player} player
   * @param {Array<import('./vehicle.js').Vehicle>} vehicles
   * @param {import('./vehicle.js').Vehicle | null} activeVehicle
   * @param {import('./police.js').PoliceSystem} policeSystem
   * @param {import('./mission.js').MissionManager} missionManager
   * @param {import('./camera.js').Camera} camera
   * @param {number} time Elapsed time in seconds
   */
  render(world, player, vehicles, activeVehicle, policeSystem, missionManager, camera, time) {
    const ctx = this.ctx;
    const focusTarget = activeVehicle || player;

    ctx.save();
    ctx.clearRect(0, 0, camera.viewWidth, camera.viewHeight);
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    this._drawGroundAndCoast(ctx, world, time);
    this._drawRoads(ctx, world);
    this._drawBeachProps(ctx, world);
    this._drawMissionMarker(ctx, missionManager, time);
    this._drawBuildings(ctx, world, camera);
    this._drawVehicles(ctx, vehicles, player, activeVehicle);
    this._drawPoliceCars(ctx, policeSystem.policeCars);
    if (!activeVehicle) {
      this._drawPlayer(ctx, player);
    }
    this._drawPalmTrees(ctx, world, time);
    this._drawMissionArrow(ctx, focusTarget, missionManager.getActiveMarker());

    ctx.restore();

    this._drawMinimap(world, focusTarget, vehicles, policeSystem, missionManager, camera);
  }

  _drawGroundAndCoast(ctx, world, time) {
    // City sidewalk/concrete base
    ctx.fillStyle = "#c8ced9";
    ctx.fillRect(0, 0, PROMENADE_START_X, world.height);

    // Beachfront promenade
    ctx.fillStyle = "#e7c0a4";
    ctx.fillRect(
      PROMENADE_START_X,
      0,
      BEACH_START_X - PROMENADE_START_X,
      world.height
    );
    ctx.fillStyle = "#d4a383";
    ctx.fillRect(PROMENADE_START_X, 0, 6, world.height);

    // Golden sand beach
    ctx.fillStyle = "#f4d58d";
    ctx.fillRect(
      BEACH_START_X,
      0,
      WATER_START_X - BEACH_START_X,
      world.height
    );

    // Wet sand shoreline strip
    ctx.fillStyle = "#e6be6a";
    ctx.fillRect(WATER_START_X - 18, 0, 22, world.height);

    // Turquoise Atlantic ocean
    const oceanGrad = ctx.createLinearGradient(
      WATER_START_X,
      0,
      world.width,
      0
    );
    oceanGrad.addColorStop(0, "#3bc9db");
    oceanGrad.addColorStop(0.35, "#15aabf");
    oceanGrad.addColorStop(1, "#0b7285");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(
      WATER_START_X,
      0,
      world.width - WATER_START_X,
      world.height
    );

    // Animated shoreline wave foam
    ctx.beginPath();
    ctx.moveTo(WATER_START_X, 0);
    for (let y = 0; y <= world.height; y += 20) {
      const waveOffset = Math.sin(time * 2.2 + y * 0.018) * 7;
      ctx.lineTo(WATER_START_X + waveOffset, y);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  _drawRoads(ctx, world) {
    // Asphalt layer
    ctx.fillStyle = "#2b2f3e";
    for (const road of world.roads) {
      ctx.fillRect(road.x, road.y, road.w, road.h);
    }

    // Center dashed lane markings
    ctx.save();
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]);

    for (const road of world.roads) {
      ctx.beginPath();
      if (road.orientation === "vertical") {
        const cx = road.x + road.w / 2;
        ctx.moveTo(cx, road.y);
        ctx.lineTo(cx, road.y + road.h);
      } else {
        const cy = road.y + road.h / 2;
        ctx.moveTo(road.x, cy);
        ctx.lineTo(road.x + road.w, cy);
      }
      ctx.stroke();
    }
    ctx.restore();

    this._drawCrosswalks(ctx, world);
  }

  _drawCrosswalks(ctx, world) {
    const verticals = world.roads.filter((r) => r.orientation === "vertical");
    const horizontals = world.roads.filter((r) => r.orientation === "horizontal");

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";

    for (const v of verticals) {
      for (const h of horizontals) {
        // Horizontal crosswalk stripes on north & south sides of intersection
        for (let sx = v.x + 12; sx < v.x + v.w - 14; sx += 16) {
          ctx.fillRect(sx, h.y - 14, 9, 12);
          ctx.fillRect(sx, h.y + h.h + 2, 9, 12);
        }
        // Vertical crosswalk stripes on west & east sides of intersection
        for (let sy = h.y + 12; sy < h.y + h.h - 14; sy += 16) {
          ctx.fillRect(v.x - 14, sy, 12, 9);
          ctx.fillRect(v.x + v.w + 2, sy, 12, 9);
        }
      }
    }
    ctx.restore();
  }

  _drawVehicles(ctx, vehicles, player, activeVehicle) {
    for (const car of vehicles) {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      const halfL = car.length / 2;
      const halfW = car.width / 2;

      // Drop shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
      ctx.beginPath();
      ctx.roundRect(-halfL + 3, -halfW + 4, car.length, car.width, 6);
      ctx.fill();

      // Car body
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.roundRect(-halfL, -halfW, car.length, car.width, 6);
      ctx.fill();

      // Neon accent racing stripe
      ctx.fillStyle = car.accent;
      ctx.fillRect(-halfL + 4, -2, car.length - 10, 4);

      // Windshield & rear window
      ctx.fillStyle = "#1a1f36";
      ctx.beginPath();
      ctx.roundRect(-8, -halfW + 3, 20, car.width - 6, 3);
      ctx.fill();

      // Roof panel
      ctx.fillStyle = car.color;
      ctx.fillRect(-6, -halfW + 5, 11, car.width - 10);

      // Headlights
      ctx.fillStyle = "#fff9db";
      ctx.fillRect(halfL - 3, -halfW + 3, 3, 5);
      ctx.fillRect(halfL - 3, halfW - 8, 3, 5);

      // Taillights / brake glow
      ctx.fillStyle = car.isBraking ? "#ff2a55" : "#a61e38";
      ctx.fillRect(-halfL, -halfW + 3, 3, 5);
      ctx.fillRect(-halfL, halfW - 8, 3, 5);

      ctx.restore();

      // Subtle enter prompt when player is on foot within 60px
      if (!activeVehicle) {
        const dx = car.x - player.x;
        const dy = car.y - player.y;
        if (dx * dx + dy * dy <= ENTER_VEHICLE_RADIUS * ENTER_VEHICLE_RADIUS) {
          ctx.save();
          ctx.fillStyle = "rgba(15, 16, 35, 0.85)";
          ctx.strokeStyle = "#4deeea";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(car.x - 14, car.y - 34, 28, 18, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#4deeea";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("E", car.x, car.y - 25);
          ctx.restore();
        }
      }
    }
  }

  _drawBuildings(ctx, world, camera) {
    const viewRight = camera.x + camera.viewWidth;
    const viewBottom = camera.y + camera.viewHeight;

    for (const b of world.buildings) {
      // Viewport culling
      if (
        b.x + b.w + 20 < camera.x ||
        b.x - 20 > viewRight ||
        b.y + b.h + 20 < camera.y ||
        b.y - 20 > viewBottom
      ) {
        continue;
      }

      // Drop shadow
      ctx.fillStyle = "rgba(15, 18, 35, 0.28)";
      ctx.fillRect(b.x + 10, b.y + 10, b.w, b.h);

      // Main roof
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Art Deco inner trim
      ctx.strokeStyle = b.trim;
      ctx.lineWidth = 4;
      ctx.strokeRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);

      // Rooftop detail (AC / skylight)
      ctx.fillStyle = b.accent;
      ctx.fillRect(b.x + 18, b.y + 18, 28, 20);
      if (b.w > 140) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.fillRect(b.x + b.w - 50, b.y + 20, 26, 26);
      }
    }
  }

  _drawBeachProps(ctx, world) {
    for (const prop of world.beachProps) {
      // Beach towel
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(prop.x - 18, prop.y + 12, 36, 18);
      ctx.fillStyle = prop.color;
      ctx.fillRect(prop.x - 15, prop.y + 15, 30, 12);

      // Umbrella shadow + canopy
      ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
      ctx.beginPath();
      ctx.arc(prop.x + 5, prop.y + 5, 17, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = prop.color;
      ctx.beginPath();
      ctx.arc(prop.x, prop.y, 17, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(prop.x, prop.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawPalmTrees(ctx, world, time) {
    for (const palm of world.palmTrees) {
      const sway = Math.sin(time * 1.8 + palm.y * 0.01) * 0.06;

      ctx.save();
      ctx.translate(palm.x, palm.y);
      ctx.rotate(sway);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.beginPath();
      ctx.arc(6, 6, palm.radius, 0, Math.PI * 2);
      ctx.fill();

      // Fronds
      const fronds = 6;
      for (let i = 0; i < fronds; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / fronds);
        ctx.fillStyle = i % 2 === 0 ? "#2b9348" : "#55a630";
        ctx.beginPath();
        ctx.ellipse(palm.radius * 0.55, 0, palm.radius * 0.6, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Trunk center
      ctx.fillStyle = "#7f5539";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  _drawPlayer(ctx, player) {
    const stride = player.isMoving ? Math.sin(player.animTime) * 5 : 0;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 3, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animated feet
    ctx.fillStyle = "#1e2235";
    ctx.beginPath();
    ctx.arc(stride, -5, 4, 0, Math.PI * 2);
    ctx.arc(-stride, 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Animated arms
    ctx.fillStyle = "#f1c27d";
    ctx.beginPath();
    ctx.arc(2 - stride * 0.7, -10, 3.5, 0, Math.PI * 2);
    ctx.arc(2 + stride * 0.7, 10, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Vice City pastel shirt / shoulders
    ctx.fillStyle = "#ff4d94";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#f1c27d";
    ctx.beginPath();
    ctx.arc(2, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Hair / sunglasses visor
    ctx.fillStyle = "#2b2018";
    ctx.beginPath();
    ctx.arc(0, 0, 6.2, Math.PI * 0.45, Math.PI * 1.55);
    ctx.fill();

    ctx.restore();
  }

  _drawMissionMarker(ctx, missionManager, time) {
    const marker = missionManager.getActiveMarker();
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    const isTarget = missionManager.state === "active";

    ctx.save();
    ctx.fillStyle = isTarget
      ? "rgba(255, 196, 0, 0.28)"
      : "rgba(255, 224, 102, 0.25)";
    ctx.strokeStyle = isTarget ? "#ff922b" : "#ffd43b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff9db";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isTarget ? "DROP" : "JOB", marker.x, marker.y);
    ctx.restore();
  }

  _drawMissionArrow(ctx, origin, marker) {
    const dx = marker.x - origin.x;
    const dy = marker.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < marker.radius + 35) return;

    const angle = Math.atan2(dy, dx);
    const orbit = 44;

    ctx.save();
    ctx.translate(
      origin.x + Math.cos(angle) * orbit,
      origin.y + Math.sin(angle) * orbit
    );
    ctx.rotate(angle);
    ctx.fillStyle = "#ffd43b";
    ctx.strokeStyle = "#0f1023";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _drawPoliceCars(ctx, policeCars) {
    for (const cop of policeCars) {
      ctx.save();
      ctx.translate(cop.x, cop.y);
      ctx.rotate(cop.angle);

      const halfL = cop.length / 2;
      const halfW = cop.width / 2;

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
      ctx.beginPath();
      ctx.roundRect(-halfL + 3, -halfW + 4, cop.length, cop.width, 6);
      ctx.fill();

      // Black & white patrol body
      ctx.fillStyle = "#161824";
      ctx.beginPath();
      ctx.roundRect(-halfL, -halfW, cop.length, cop.width, 6);
      ctx.fill();

      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(-10, -halfW + 1, 20, cop.width - 2);

      // Windshield
      ctx.fillStyle = "#212529";
      ctx.fillRect(-4, -halfW + 3, 12, cop.width - 6);

      // Flashing red/blue siren bar
      const redActive = Math.sin(cop.lightPhase) > 0;
      ctx.fillStyle = redActive ? "#ff2a55" : "#4c1d28";
      ctx.fillRect(-2, -halfW + 3, 4, halfW - 3);
      ctx.fillStyle = !redActive ? "#339af0" : "#1b2e4b";
      ctx.fillRect(-2, 0, 4, halfW - 3);

      ctx.restore();
    }
  }

  _drawMinimap(world, focusTarget, vehicles, policeSystem, missionManager, camera) {
    const mctx = this.minimapCtx;
    const mw = mctx.canvas.width;
    const mh = mctx.canvas.height;
    const sx = mw / world.width;
    const sy = mh / world.height;

    mctx.clearRect(0, 0, mw, mh);

    // Base city
    mctx.fillStyle = "#23263a";
    mctx.fillRect(0, 0, mw, mh);

    // Beach & ocean
    mctx.fillStyle = "#e6c373";
    mctx.fillRect(
      BEACH_START_X * sx,
      0,
      (WATER_START_X - BEACH_START_X) * sx,
      mh
    );
    mctx.fillStyle = "#15aabf";
    mctx.fillRect(
      WATER_START_X * sx,
      0,
      (world.width - WATER_START_X) * sx,
      mh
    );

    // Roads
    mctx.fillStyle = "#4c5270";
    for (const r of world.roads) {
      mctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
    }

    // Buildings
    mctx.fillStyle = "rgba(255, 157, 226, 0.7)";
    for (const b of world.buildings) {
      mctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
    }

    // Vehicles on minimap
    for (const v of vehicles) {
      if (v.isOccupied) continue;
      mctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      mctx.fillRect(v.x * sx - 1.5, v.y * sy - 1.5, 3, 3);
    }

    // Police blips
    for (const cop of policeSystem.policeCars) {
      mctx.fillStyle = Math.sin(cop.lightPhase) > 0 ? "#ff2a55" : "#339af0";
      mctx.beginPath();
      mctx.arc(cop.x * sx, cop.y * sy, 3, 0, Math.PI * 2);
      mctx.fill();
    }

    // Active mission target blip
    const marker = missionManager.getActiveMarker();
    mctx.fillStyle = "#ffd43b";
    mctx.beginPath();
    mctx.arc(marker.x * sx, marker.y * sy, 4, 0, Math.PI * 2);
    mctx.fill();

    // Camera viewport box
    mctx.strokeStyle = "rgba(77, 238, 234, 0.5)";
    mctx.lineWidth = 1;
    mctx.strokeRect(
      camera.x * sx,
      camera.y * sy,
      camera.viewWidth * sx,
      camera.viewHeight * sy
    );

    // Player / Active vehicle dot
    mctx.fillStyle = "#4deeea";
    mctx.beginPath();
    mctx.arc(focusTarget.x * sx, focusTarget.y * sy, 3.5, 0, Math.PI * 2);
    mctx.fill();
  }
}
