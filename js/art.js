// ============================================================
// Art.js — all cartoon drawing: characters, monsters, scenery.
// Pure canvas drawing, no external art tools. Cute + bold-outline style.
// ============================================================

const Art = (() => {
  const knightFaceImg = new Image();
  const princessFaceImg = new Image();
  let knightFaceReady = false, princessFaceReady = false;
  knightFaceImg.onload = () => (knightFaceReady = true);
  princessFaceImg.onload = () => (princessFaceReady = true);
  knightFaceImg.src = "assets/knight-face-cropped.jpg";
  princessFaceImg.src = "assets/princess-face-cropped.jpg";

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function faceInCircle(ctx, img, ready, cx, cy, r, fallbackSkin) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (ready) {
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = fallbackSkin || "#f2c39b";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = "#3a2a20";
      ctx.beginPath(); ctx.arc(cx - r * 0.35, cy, r * 0.09, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r * 0.35, cy, r * 0.09, 0, 7); ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.stroke();
  }

  // ---------------------------------------------------------
  // KNIGHT
  // opts: { facing:1|-1, state:'idle'|'run'|'jump'|'attack'|'hurt'|'victory', t:seconds, wedding:bool, hitFlash:bool }
  // ---------------------------------------------------------
  function drawKnight(ctx, x, y, opts = {}) {
    const facing = opts.facing || 1;
    const t = opts.t || 0;
    const state = opts.state || "idle";
    const wedding = !!opts.wedding;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    if (opts.hitFlash && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.4;

    const bob = state === "run" ? Math.sin(t * 14) * 3 : state === "idle" ? Math.sin(t * 2.4) * 1.4 : 0;
    const legSwing = state === "run" ? Math.sin(t * 14) : 0;
    const armSwing = state === "run" ? Math.sin(t * 14 + Math.PI) : 0;

    ctx.translate(0, bob);

    // shadow drawn by caller (ground). Here just the body from feet-up.
    const S = 1.0; // scale unit
    // Legs
    ctx.strokeStyle = "#2b2b40"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-6, -34); ctx.lineTo(-6 + legSwing * 9, -6);
    ctx.moveTo(6, -34); ctx.lineTo(6 - legSwing * 9, -6);
    ctx.stroke();
    // boots
    ctx.fillStyle = "#4b3621";
    ctx.beginPath(); ctx.ellipse(-6 + legSwing * 9, -4, 7, 5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6 - legSwing * 9, -4, 7, 5, 0, 0, 7); ctx.fill();

    // Cape (behind torso)
    if (!wedding) {
      ctx.fillStyle = "#c62b3a";
      ctx.beginPath();
      ctx.moveTo(-9, -70);
      ctx.quadraticCurveTo(-22 - legSwing * 4, -50, -16 - legSwing * 6, -14);
      ctx.lineTo(-4, -30);
      ctx.lineTo(-4, -68);
      ctx.closePath();
      ctx.fill();
    } else {
      // groom tails
      ctx.fillStyle = "#1c1c2e";
      ctx.beginPath();
      ctx.moveTo(-8, -55); ctx.lineTo(-14, -18); ctx.lineTo(-4, -30); ctx.lineTo(-4,-55);
      ctx.closePath(); ctx.fill();
    }

    // Torso (armor plate or tux)
    if (!wedding) {
      const grad = ctx.createLinearGradient(-16, -70, 16, -30);
      grad.addColorStop(0, "#dfe7f2");
      grad.addColorStop(1, "#93a4bd");
      ctx.fillStyle = grad;
      roundRect(ctx, -15, -72, 30, 42, 9);
      ctx.fill();
      ctx.strokeStyle = "#4a5568"; ctx.lineWidth = 2.5; ctx.stroke();
      // chest emblem heart
      ctx.fillStyle = "#e0536b";
      ctx.beginPath();
      ctx.moveTo(0, -46);
      ctx.bezierCurveTo(-7, -54, -13, -46, 0, -36);
      ctx.bezierCurveTo(13, -46, 7, -54, 0, -46);
      ctx.fill();
    } else {
      ctx.fillStyle = "#20243a";
      roundRect(ctx, -15, -72, 30, 42, 9); ctx.fill();
      ctx.fillStyle = "#fff";
      roundRect(ctx, -6, -72, 12, 30, 3); ctx.fill();
      ctx.fillStyle = "#c62b3a";
      ctx.beginPath(); ctx.moveTo(0,-60); ctx.lineTo(-4,-48); ctx.lineTo(4,-48); ctx.closePath(); ctx.fill();
    }

    // Arms
    ctx.strokeStyle = wedding ? "#20243a" : "#93a4bd";
    ctx.lineWidth = 7; ctx.lineCap = "round";
    // back arm
    ctx.beginPath();
    ctx.moveTo(-10, -66); ctx.lineTo(-16 + armSwing * 6, -46);
    ctx.stroke();

    // sword arm (front) + sword, or flower-holding arm
    const attacking = state === "attack";
    const swordSwingAngle = attacking ? Math.sin(Math.min(1, (t % 0.3) / 0.3) * Math.PI) * 1.4 - 0.3 : -0.15;
    ctx.save();
    ctx.translate(11, -62);
    ctx.rotate(swordSwingAngle + (state === "run" ? -armSwing * 0.3 : 0));
    ctx.strokeStyle = wedding ? "#20243a" : "#93a4bd";
    ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 16); ctx.stroke();
    if (!wedding && opts.holdFlower !== true) {
      // sword
      ctx.translate(10, 16);
      ctx.rotate(0.5);
      ctx.fillStyle = "#cfd8e3";
      roundRect(ctx, -2.5, -30, 5, 30, 2); ctx.fill();
      ctx.strokeStyle = "#5a6478"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#c9a13b";
      roundRect(ctx, -7, -2, 14, 4, 2); ctx.fill();
      roundRect(ctx, -2, -2, 4, 8, 1.5); ctx.fill();
    } else if (opts.holdFlower) {
      ctx.translate(10, 16);
      ctx.fillStyle = "#ff8fc7";
      for (let i = 0; i < 5; i++) {
        ctx.save(); ctx.rotate((i / 5) * Math.PI * 2);
        ctx.beginPath(); ctx.ellipse(0, -6, 3.4, 5, 0, 0, 7); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#ffd76a";
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = "#3a7d44"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, 20); ctx.stroke();
    }
    ctx.restore();

    // Neck + Head
    const headY = -84 + (state === "jump" ? -2 : 0);
    ctx.fillStyle = "#f2c39b";
    roundRect(ctx, -5, -78, 10, 10, 3); ctx.fill();

    const r = 15;
    ctx.save();
    ctx.translate(0, headY);
    // face — no helmet, always fully visible
    faceInCircle(ctx, knightFaceImg, knightFaceReady, 0, 0, r);
    // simple hair on top, same for armor and wedding looks
    ctx.fillStyle = "#2b1c14";
    ctx.beginPath();
    ctx.arc(0, -r + 3, r - 1, Math.PI, Math.PI * 2);
    ctx.fill();
    if (!wedding) {
      // small heroic feather, tucked beside the hair — doesn't touch the face
      ctx.fillStyle = "#c62b3a";
      ctx.beginPath();
      ctx.moveTo(r - 4, -r - 1);
      ctx.quadraticCurveTo(r + 8, -r - 14, r + 2, -r - 22);
      ctx.quadraticCurveTo(r - 2, -r - 10, r - 4, -r - 1);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  // ---------------------------------------------------------
  // PRINCESS
  // ---------------------------------------------------------
  function drawPrincess(ctx, x, y, opts = {}) {
    const facing = opts.facing || 1;
    const t = opts.t || 0;
    const wedding = !!opts.wedding;
    const state = opts.state || "idle";
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    const bob = Math.sin(t * 2.2) * 2;
    ctx.translate(0, bob);

    // dress
    const dressColor = wedding ? "#ffffff" : "#ff9ecf";
    const dressColor2 = wedding ? "#f0e8ee" : "#e0669f";
    const grad = ctx.createLinearGradient(0, -60, 0, -6);
    grad.addColorStop(0, dressColor);
    grad.addColorStop(1, dressColor2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-9, -66);
    ctx.quadraticCurveTo(-24, -20, -22 + Math.sin(t * 3) * 2, -4);
    ctx.quadraticCurveTo(0, 4, 22 - Math.sin(t * 3) * 2, -4);
    ctx.quadraticCurveTo(24, -20, 9, -66);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 2; ctx.stroke();

    // little bow/ribbon on dress
    ctx.fillStyle = wedding ? "#e8c9d8" : "#c94f89";
    ctx.beginPath(); ctx.arc(0, -40, 4, 0, 7); ctx.fill();

    // arms
    ctx.strokeStyle = "#f2c39b"; ctx.lineWidth = 6; ctx.lineCap = "round";
    const armWave = Math.sin(t * 3) * 0.15;
    ctx.beginPath(); ctx.moveTo(-9, -60); ctx.lineTo(-16, -44 + Math.sin(t * 3) * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -60); ctx.lineTo(16, -44 - Math.sin(t * 3) * 2); ctx.stroke();

    // head — no drawn hair at all, the real photo already has her hair in it
    const r = 15;
    ctx.save();
    ctx.translate(0, -78);
    faceInCircle(ctx, princessFaceImg, princessFaceReady, 0, 0, r, "#f6cba0");

    if (wedding) {
      // veil, well clear of the face
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath();
      ctx.moveTo(-r, -r - 2);
      ctx.quadraticCurveTo(0, 26, r, -r - 2);
      ctx.quadraticCurveTo(0, -r + 12, -r, -r - 2);
      ctx.fill();
    }
    // tiara / crown — floats well above the head, never touching the face
    const crownTopY = -r - 20;
    const crownBaseY = -r - 8;
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath();
    ctx.moveTo(-11, crownBaseY);
    ctx.lineTo(-7, crownBaseY - 9);
    ctx.lineTo(-2, crownBaseY - 2);
    ctx.lineTo(0, crownTopY);
    ctx.lineTo(2, crownBaseY - 2);
    ctx.lineTo(7, crownBaseY - 9);
    ctx.lineTo(11, crownBaseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c9a13b"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = "#e0536b";
    ctx.beginPath(); ctx.arc(0, crownTopY + 5, 2, 0, 7); ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------
  // MONSTERS
  // ---------------------------------------------------------
  function drawSlime(ctx, x, y, t, hurt) {
    ctx.save();
    ctx.translate(x, y);
    const squash = 1 + Math.sin(t * 6) * 0.12;
    ctx.scale(1 / squash, squash);
    if (hurt) ctx.globalAlpha = 0.5;
    const grad = ctx.createRadialGradient(-5, -14, 2, 0, -6, 20);
    grad.addColorStop(0, "#b6f2b0");
    grad.addColorStop(1, "#4fb84a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.quadraticCurveTo(-20, -22, 0, -24);
    ctx.quadraticCurveTo(20, -22, 18, 0);
    ctx.quadraticCurveTo(10, 6, 0, 5);
    ctx.quadraticCurveTo(-10, 6, -18, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2c6b2a"; ctx.lineWidth = 2.5; ctx.stroke();
    // eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-6, -14, 5, 0, 7); ctx.arc(6, -14, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(-5, -13, 2.4, 0, 7); ctx.arc(7, -13, 2.4, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawBat(ctx, x, y, t, hurt) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 6) * 6);
    if (hurt) ctx.globalAlpha = 0.5;
    const flap = Math.sin(t * 16);
    ctx.fillStyle = "#5b4a8a";
    // wings
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-20, -10 * flap - 4, -26, 2 * flap);
    ctx.quadraticCurveTo(-14, 4, 0, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(20, -10 * flap - 4, 26, 2 * flap);
    ctx.quadraticCurveTo(14, 4, 0, 4);
    ctx.fill();
    // body
    ctx.fillStyle = "#7a68b0";
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
    ctx.strokeStyle = "#3a2f5c"; ctx.lineWidth = 1.6; ctx.stroke();
    // eyes
    ctx.fillStyle = "#ffe27a";
    ctx.beginPath(); ctx.arc(-3, -1, 2, 0, 7); ctx.arc(3, -1, 2, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawGoblinBoss(ctx, x, y, opts = {}) {
    const t = opts.t || 0;
    const facing = opts.facing || -1;
    const windup = !!opts.windup;
    const hurt = !!opts.hurt;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    if (hurt && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.5;
    const bob = Math.sin(t * 4) * 2;
    ctx.translate(0, bob);
    // legs
    ctx.strokeStyle = "#3a5a2a"; ctx.lineWidth = 11; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-10, -40); ctx.lineTo(-10, -4); ctx.moveTo(10, -40); ctx.lineTo(10, -4); ctx.stroke();
    // body
    const grad = ctx.createLinearGradient(-24, -90, 24, -36);
    grad.addColorStop(0, "#7dbf5a");
    grad.addColorStop(1, "#4a8a37");
    ctx.fillStyle = grad;
    roundRect(ctx, -24, -90, 48, 56, 14); ctx.fill();
    ctx.strokeStyle = "#2c4a1e"; ctx.lineWidth = 3; ctx.stroke();
    // spiky belt
    ctx.fillStyle = "#5a3a22";
    roundRect(ctx, -24, -40, 48, 8, 3); ctx.fill();

    // arm + club
    ctx.save();
    ctx.translate(20, -70);
    const swing = windup ? -1.8 + Math.sin(t * 10) * 0.05 : Math.sin(t * 3) * 0.2;
    ctx.rotate(swing);
    ctx.strokeStyle = "#4a8a37"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.stroke();
    ctx.save();
    ctx.translate(0, 30);
    ctx.fillStyle = "#7a5230";
    roundRect(ctx, -6, 0, 12, 22, 4); ctx.fill();
    ctx.fillStyle = "#5a3a22";
    ctx.beginPath(); ctx.arc(0, 24, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = "#2c1c10"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    ctx.restore();

    // other arm
    ctx.strokeStyle = "#4a8a37"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-20, -70); ctx.lineTo(-28, -50); ctx.stroke();

    // head
    ctx.save();
    ctx.translate(0, -98);
    ctx.fillStyle = "#7dbf5a";
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
    ctx.strokeStyle = "#2c4a1e"; ctx.lineWidth = 3; ctx.stroke();
    // ears
    ctx.fillStyle = "#6aa84a";
    ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(-30, -10); ctx.lineTo(-16, 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(30, -10); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill();
    // eyes (angry)
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-7, -3, 5, 0, 7); ctx.arc(7, -3, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#c0202c";
    ctx.beginPath(); ctx.arc(-6, -2, 2.4, 0, 7); ctx.arc(8, -2, 2.4, 0, 7); ctx.fill();
    ctx.strokeStyle = "#2c4a1e"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(-2, -8); ctx.moveTo(13, -10); ctx.lineTo(2, -8); ctx.stroke();
    // mouth + tusks
    ctx.fillStyle = "#2c1c10";
    roundRect(ctx, -8, 8, 16, 5, 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(-4, 16); ctx.lineTo(-2, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, 10); ctx.lineTo(4, 16); ctx.lineTo(2, 10); ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // ---------------------------------------------------------
  // OBSTACLES
  // ---------------------------------------------------------
  function drawLog(ctx, x, groundY, w, h) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.fillStyle = "#8a5a34";
    roundRect(ctx, -w / 2, -h, w, h, 6); ctx.fill();
    ctx.strokeStyle = "#5a3a1e"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-w/2, -h + h/2 + i*4); ctx.lineTo(w/2, -h + h/2 + i*4); ctx.stroke(); }
    ctx.fillStyle = "#a97847";
    ctx.beginPath(); ctx.ellipse(w/2 - 4, -h/2, 5, h/2 - 2, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#5a3a1e"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  function drawRock(ctx, x, groundY, size) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.fillStyle = "#9aa0ab";
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.9);
    ctx.lineTo(0, -size * 1.15);
    ctx.lineTo(size * 0.75, -size * 0.85);
    ctx.lineTo(size, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5c6470"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.25)";
    ctx.beginPath(); ctx.moveTo(-size*0.3,-size*0.5); ctx.lineTo(0,-size*1.05); ctx.lineTo(size*0.15,-size*0.6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawSpikes(ctx, x, groundY, w, h) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.fillStyle = "#7d8590";
    const n = Math.max(2, Math.round(w / 12));
    for (let i = 0; i < n; i++) {
      const sx = -w / 2 + (i + 0.5) * (w / n);
      ctx.beginPath();
      ctx.moveTo(sx - w / n / 2, 0);
      ctx.lineTo(sx, -h);
      ctx.lineTo(sx + w / n / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#454b54"; ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();
  }

  function drawBarrel(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t);
    ctx.fillStyle = "#a97847";
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
    ctx.strokeStyle = "#5a3a1e"; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.stroke();
    ctx.restore();
  }

  function drawGap(ctx, x, groundY, w, camY) {
    ctx.save();
    ctx.fillStyle = "#1a1030";
    ctx.fillRect(x - w / 2, groundY - 2, w, 400);
    ctx.restore();
  }

  function drawGate(ctx, x, groundY, h, open) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.fillStyle = "#6b5a45";
    roundRect(ctx, -22, -h, 44, h, 6); ctx.fill();
    ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 3; ctx.stroke();
    if (!open) {
      ctx.fillStyle = "#4a4038";
      for (let i = 0; i < 5; i++) ctx.fillRect(-18, -h + 8 + i * (h - 16) / 5, 36, 4);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------
  // PARTICLES
  // ---------------------------------------------------------
  function drawHeartParticle(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.fillStyle = "#ff6b9d";
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size, -size * 0.6, -size * 0.3, -size, 0, -size * 0.2);
    ctx.bezierCurveTo(size * 0.3, -size, size, -size * 0.6, 0, size * 0.3);
    ctx.fill();
    ctx.restore();
  }

  function drawConfetti(ctx, x, y, rot, color, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.fillRect(-size / 2, -size / 2, size, size * 0.4);
    ctx.restore();
  }

  function drawSparkle(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.fillStyle = "#fff6c9";
    ctx.beginPath();
    ctx.moveTo(0, -size); ctx.lineTo(size*0.25, -size*0.25); ctx.lineTo(size, 0);
    ctx.lineTo(size*0.25, size*0.25); ctx.lineTo(0, size); ctx.lineTo(-size*0.25, size*0.25);
    ctx.lineTo(-size, 0); ctx.lineTo(-size*0.25, -size*0.25);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawDust(ctx, x, y, r, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#cfcfcf";
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------
  // BACKGROUNDS  (w,h = canvas virtual size; camX = camera scroll)
  // ---------------------------------------------------------
  function skyGradient(ctx, w, h, colors) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawForestBG(ctx, w, h, camX, groundY) {
    skyGradient(ctx, w, h, ["#8fd3f4", "#b8e6c9"]);
    // sun
    ctx.fillStyle = "#fff3b0";
    ctx.beginPath(); ctx.arc(w - 70, 70, 34, 0, 7); ctx.fill();
    // far hills
    ctx.fillStyle = "#9bd3a0";
    parallaxHills(ctx, w, groundY, camX * 0.2, 60, 420);
    ctx.fillStyle = "#7fc48a";
    parallaxHills(ctx, w, groundY, camX * 0.4, 40, 300);
    // trees
    ctx.fillStyle = "#5a9a5f";
    for (let i = 0; i < 14; i++) {
      const bx = (i * 260 - camX * 0.7) % (260 * 14);
      const wrapped = ((bx % (260*14)) + 260*14) % (260*14) - 260;
      drawTree(ctx, wrapped, groundY, 30 + (i % 3) * 8);
    }
    ground(ctx, w, h, groundY, "#7ec482", "#5a9a5f");
  }

  function drawTree(ctx, x, groundY, s) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(-s * 0.08, -s * 1.1, s * 0.16, s * 1.1);
    ctx.fillStyle = "#4d8a4f";
    ctx.beginPath(); ctx.arc(0, -s * 1.3, s * 0.7, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-s*0.5, -s*1.0, s*0.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s*0.5, -s*1.0, s*0.5, 0, 7); ctx.fill();
    ctx.restore();
  }

  function parallaxHills(ctx, w, groundY, camX, amp, period) {
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 20) {
      const wx = x + camX;
      const y = groundY - 30 - amp * (0.5 + 0.5 * Math.sin(wx / period * Math.PI * 2));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, groundY); ctx.closePath(); ctx.fill();
  }

  function ground(ctx, w, h, groundY, top, bottom) {
    const g = ctx.createLinearGradient(0, groundY, 0, h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
  }

  function drawBridgeBG(ctx, w, h, camX, groundY) {
    skyGradient(ctx, w, h, ["#7fb8e0", "#dce9f0"]);
    ctx.fillStyle = "#8fa0b8";
    parallaxHills(ctx, w, groundY, camX * 0.15, 80, 500);
    ctx.fillStyle = "#6b7c96";
    parallaxHills(ctx, w, groundY, camX * 0.3, 50, 340);
    // canyon walls (visual only, ground handled per-segment by game as planks)
    ctx.fillStyle = "rgba(60,50,60,.5)";
    ctx.fillRect(0, groundY + 40, w, h - groundY - 40);
  }

  function drawPlank(ctx, x, groundY, w) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.fillStyle = "#8a6a42";
    ctx.fillRect(-w/2, -8, w, 12);
    ctx.strokeStyle = "#5a3a1e"; ctx.lineWidth = 2; ctx.strokeRect(-w/2, -8, w, 12);
    ctx.strokeStyle = "#6b4a28"; ctx.lineWidth = 1.5;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-w/2 + i*w/3, -8); ctx.lineTo(-w/2 + i*w/3, 4); ctx.stroke(); }
    ctx.restore();
  }

  function drawRope(ctx, x1, y1, x2, y2, sag) {
    ctx.strokeStyle = "#7a5a34"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1+x2)/2, Math.max(y1,y2) + sag, x2, y2);
    ctx.stroke();
  }

  function drawCastleBG(ctx, w, h, camX, groundY) {
    skyGradient(ctx, w, h, ["#5a5a8a", "#c9a0b8"]);
    ctx.fillStyle = "#4a4a72";
    parallaxHills(ctx, w, groundY, camX * 0.15, 70, 460);
    // castle silhouette
    ctx.fillStyle = "#6b5a72";
    for (let i = 0; i < 6; i++) {
      const bx = (i * 340 - camX * 0.35) % (340*6);
      const wrapped = ((bx % (340*6)) + 340*6) % (340*6) - 340;
      drawCastleTower(ctx, wrapped, groundY, 60 + (i%2)*20);
    }
    ground(ctx, w, h, groundY, "#8a8fa0", "#5c5f70");
    // cobblestones
    ctx.fillStyle = "rgba(0,0,0,.08)";
    for (let i = 0; i < 30; i++) {
      const cx = ((i * 97 - camX) % 900 + 900) % 900;
      ctx.beginPath(); ctx.arc(cx, groundY + 14 + (i%3)*10, 6, 0, 7); ctx.fill();
    }
  }

  function drawCastleTower(ctx, x, groundY, hgt) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.fillRect(-20, -hgt, 40, hgt);
    for (let i = 0; i < 5; i++) ctx.fillRect(-20 + i*10, -hgt-8, 6, 8);
    ctx.restore();
  }

  function drawTowerInteriorBG(ctx, w, h) {
    skyGradient(ctx, w, h, ["#241a3a", "#3a2a55"]);
    ctx.fillStyle = "#332448";
    ctx.fillRect(0, 0, w, h);
    // stone bricks
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1.5;
    for (let row = 0; row < h / 40; row++) {
      const offset = (row % 2) * 30;
      for (let col = -1; col < w / 60 + 1; col++) {
        ctx.strokeRect(col * 60 + offset, row * 40, 60, 40);
      }
    }
    // window with moon
    ctx.fillStyle = "#7fc8e8";
    roundRect(ctx, w - 140, 40, 70, 90, 10); ctx.fill();
    ctx.fillStyle = "#fdf6d8";
    ctx.beginPath(); ctx.arc(w - 110, 80, 20, 0, 7); ctx.fill();
    ctx.strokeStyle = "#241a3a"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(w-140,85); ctx.lineTo(w-70,85); ctx.moveTo(w-105,40); ctx.lineTo(w-105,130); ctx.stroke();
    ground(ctx, w, h, h - 60, "#4a3a60", "#2a1e3c");
  }

  function drawWeddingBG(ctx, w, h, confettiFall) {
    skyGradient(ctx, w, h, ["#ffd9ec", "#fff3d6"]);
    ctx.fillStyle = "#ffe9c9";
    parallaxHills(ctx, w, h - 90, 0, 40, 500);
    ground(ctx, w, h, h - 90, "#c9e6b0", "#9ecb7f");
    // arch
    const cx = w / 2;
    ctx.strokeStyle = "#c9a13b"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 90, h - 90);
    ctx.quadraticCurveTo(cx - 90, h - 250, cx, h - 260);
    ctx.quadraticCurveTo(cx + 90, h - 250, cx + 90, h - 90);
    ctx.stroke();
    // flowers on arch
    const flowerColors = ["#ff8fc7", "#ffd76a", "#c9a1ff", "#8fd3f4"];
    for (let i = 0; i <= 12; i++) {
      const tt = i / 12;
      const ang = Math.PI * (1 - tt);
      const fx = cx + Math.cos(ang) * 90;
      const fy = h - 260 + 90 - Math.sin(ang) * 90 + (h-90-(h-260+90))*0 ;
      // approximate arch curve position
      const px = cx + (tt - 0.5) * 180;
      const py = h - 260 + Math.pow((tt - 0.5) * 2, 2) * 170;
      ctx.fillStyle = flowerColors[i % flowerColors.length];
      ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
    }
    ground(ctx, w, h, h - 90, "#c9e6b0", "#9ecb7f");
  }

  return {
    drawKnight, drawPrincess, drawSlime, drawBat, drawGoblinBoss,
    drawLog, drawRock, drawSpikes, drawBarrel, drawGap, drawGate,
    drawHeartParticle, drawConfetti, drawSparkle, drawDust,
    drawForestBG, drawBridgeBG, drawCastleBG, drawTowerInteriorBG, drawWeddingBG,
    drawPlank, drawRope, ground, roundRect,
    get knightFaceReady() { return knightFaceReady; },
    get princessFaceReady() { return princessFaceReady; },
  };
})();
