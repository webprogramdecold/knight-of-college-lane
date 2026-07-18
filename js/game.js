// ============================================================
// Game.js — state machine, physics, levels, dialogue, rendering.
// ============================================================

(() => {
  const VW = 960, VH = 540;
  const GROUND_Y = 440;
  const GRAVITY = 1700;
  const JUMP_V = -640;
  const MOVE_SPEED = 230;
  const KNIGHT_W = 22, KNIGHT_H = 74;
  const ATTACK_RANGE = 55, ATTACK_W = 46;
  const INVINCIBLE_TIME = 1.0;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const el = {
    start: document.getElementById("startScreen"),
    startBtn: document.getElementById("startBtn"),
    rotate: document.getElementById("rotateOverlay"),
    banner: document.getElementById("levelBanner"),
    hud: document.getElementById("hud"),
    hearts: document.getElementById("hearts"),
    muteBtn: document.getElementById("muteBtn"),
    dialogueBox: document.getElementById("dialogueBox"),
    dialoguePortrait: document.getElementById("dialoguePortrait"),
    dialogueName: document.getElementById("dialogueName"),
    dialogueText: document.getElementById("dialogueText"),
    dialogueTap: document.getElementById("dialogueTap"),
    controls: document.getElementById("controls"),
    joystickBase: document.getElementById("joystickBase"),
    joystickKnob: document.getElementById("joystickKnob"),
    attackBtn: document.getElementById("attackBtn"),
    endScreen: document.getElementById("endScreen"),
    restartBtn: document.getElementById("restartBtn"),
  };

  // ---------------- Canvas resize / letterbox ----------------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ww = window.innerWidth, wh = window.innerHeight;
    const scale = Math.min(ww / VW, wh / VH);
    const cw = VW * scale, ch = VH * scale;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    canvas.style.left = (ww - cw) / 2 + "px";
    canvas.style.top = (wh - ch) / 2 + "px";
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

    const portrait = wh > ww;
    el.rotate.classList.toggle("hidden", !portrait);
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 50));
  resize();

  // ---------------- Game state ----------------
  let STATE = "menu"; // menu, level, towerclimb, rescue, wedding
  let levelIndex = 0;
  let level = null;
  let camX = 0;
  let t = 0; // global clock (seconds)
  let paused = false; // true while blocking dialogue/cutscene input freeze

  const knight = {
    x: 0, airY: 0, vy: 0, onGround: true, facing: 1,
    state: "idle", hearts: 3, invT: 0, attackT: 0, attackHasHit: false,
    holdFlower: false, hurtBump: 0,
  };

  const particles = [];

  function spawnHearts(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      particles.push({ type: "heart", x, y, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 60, life: 0, maxLife: 1.1 + Math.random() * 0.4, size: 8 + Math.random() * 6 });
    }
  }
  function spawnSparkle(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({ type: "sparkle", x, y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 20, life: 0, maxLife: 0.6, size: 5 + Math.random() * 4 });
    }
  }
  function spawnDust(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      particles.push({ type: "dust", x, y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20, life: 0, maxLife: 0.4, size: 3 + Math.random() * 4 });
    }
  }
  function spawnConfetti() {
    const colors = ["#ff8fc7", "#ffd76a", "#8fd3f4", "#c9a1ff", "#8fe0a1"];
    particles.push({ type: "confetti", x: Math.random() * VW, y: -10, vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 60, rot: Math.random() * 7, vrot: (Math.random() - 0.5) * 6, life: 0, maxLife: 6, size: 6 + Math.random() * 6, color: colors[(Math.random() * colors.length) | 0] });
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === "heart") p.vy += 40 * dt;
      if (p.type === "confetti") { p.rot += p.vrot * dt; if (p.y > VH + 10) { p.life = p.maxLife; } }
      if (p.life >= p.maxLife) particles.splice(i, 1);
    }
  }
  function drawParticles() {
    for (const p of particles) {
      const a = 1 - p.life / p.maxLife;
      if (p.type === "heart") Art.drawHeartParticle(ctx, p.x, p.y, p.size, a);
      else if (p.type === "sparkle") Art.drawSparkle(ctx, p.x, p.y, p.size, a);
      else if (p.type === "dust") Art.drawDust(ctx, p.x, p.y, p.size, a * 0.6);
      else if (p.type === "confetti") Art.drawConfetti(ctx, p.x, p.y, p.rot, p.color, p.size);
    }
  }

  // ---------------- Level definitions ----------------
  function makeLevel1() {
    return {
      name: "College Lane Forest", bg: "forest", length: 2200, gateX: 2150,
      obstacles: [
        { type: "log", x: 480, w: 50, h: 32 },
        { type: "rock", x: 950, size: 32 },
        { type: "log", x: 1500, w: 60, h: 32 },
      ],
      monsters: [
        { type: "slime", x: 720, baseX: 720, range: 55, hp: 1, dead: false, dir: 1, hurtT: 0 },
        { type: "slime", x: 1280, baseX: 1280, range: 55, hp: 1, dead: false, dir: -1, hurtT: 0 },
      ],
      gaps: [],
      music: "forest",
      introLine: { who: "knight", text: "They say true love conquers all... let's hope it also conquers fallen logs." },
      clearLine: { who: "knight", text: "This obstacle is nothing compared to my love for Adelina!", used: false },
      slimeLine: { who: "knight", text: "Sorry buddy, I've got a wedding to get to.", used: false },
    };
  }
  function makeLevel2() {
    return {
      name: "The Rickety Bridge", bg: "bridge", length: 2400, gateX: 2350,
      obstacles: [],
      monsters: [
        { type: "bat", x: 950, baseX: 950, baseY: -78, hp: 1, dead: false, dir: 1, hurtT: 0 },
        { type: "bat", x: 1550, baseX: 1550, baseY: -66, hp: 1, dead: false, dir: -1, hurtT: 0 },
      ],
      gaps: [
        { x: 600, w: 84 }, { x: 1200, w: 96 }, { x: 1850, w: 84 },
      ],
      music: "bridge",
      introLine: { who: "knight", text: "A rickety bridge? Cute. My knees are already worse than this bridge." },
      clearLine: { who: "knight", text: "Careful now... can't propose with a broken leg.", used: false },
      slimeLine: { who: "knight", text: "Bats, huh? At least they're not my future mother-in-law... yet.", used: false },
    };
  }
  function makeLevel3() {
    return {
      name: "Castle Gate & Courtyard", bg: "castle", length: 1650, gateX: 1650,
      obstacles: [
        { type: "spikes", x: 500, w: 40, h: 24 },
        { type: "rock", x: 950, size: 30 },
        { type: "spikes", x: 1350, w: 50, h: 24 },
      ],
      monsters: [],
      gaps: [],
      music: "castle",
      introLine: { who: "knight", text: "Almost there, Adelina! Hold on, my love!" },
      clearLine: { who: "knight", text: "This obstacle is nothing compared to my love for my princess!", used: false },
      slimeLine: null,
      boss: { x: 1780, hp: 3, maxHp: 3, state: "idle", stateT: 0, dead: false, hurtT: 0, hitCooldown: 0 },
      bossTriggerX: 1560,
      bossFightActive: false,
      bossIntroShown: false,
    };
  }

  const LEVELS = [makeLevel1, makeLevel2, makeLevel3];
  const LEVEL_LABELS = ["Level 1 · College Lane Forest", "Level 2 · The Rickety Bridge", "Level 3 · Castle Gate & Courtyard"];

  function startLevel(i) {
    levelIndex = i;
    level = LEVELS[i]();
    knight.x = 20; knight.airY = 0; knight.vy = 0; knight.onGround = true;
    knight.facing = 1; knight.state = "idle"; knight.hearts = 3; knight.invT = 0;
    camX = 0;
    STATE = "level";
    Audio2.playMusic(level.music);
    showBanner(LEVEL_LABELS[i]);
    setTimeout(() => {
      if (level.introLine) enqueueDialogue([level.introLine], false);
    }, 900);
    updateHearts();
    showControls(true);
  }

  function showBanner(text, ms = 1800) {
    el.banner.textContent = text;
    el.banner.classList.remove("hidden");
    el.banner.style.opacity = "1";
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => {
      el.banner.style.opacity = "0";
      setTimeout(() => el.banner.classList.add("hidden"), 400);
    }, ms);
  }

  function updateHearts() {
    el.hearts.textContent = "❤️".repeat(Math.max(0, knight.hearts)) + "🤍".repeat(Math.max(0, 3 - knight.hearts));
  }

  // ---------------- Dialogue system ----------------
  const dialogueQueue = [];
  let dialogueActive = null; // {who, text}
  let dialogueBlocking = false;
  let dialogueTimer = 0;
  let dialogueTypedChars = 0;
  let onQueueEmpty = null;

  const PORTRAITS = {
    knight: "assets/knight-face-cropped.jpg",
    princess: "assets/princess-face-cropped.jpg",
  };
  const NAMES = { knight: "Sir Farrukh", princess: "Princess Adelina", goblin: "Grumbleroot the Goblin" };

  function enqueueDialogue(lines, blocking, onEmpty) {
    lines.forEach((l) => dialogueQueue.push(l));
    dialogueBlocking = blocking;
    onQueueEmpty = onEmpty || null;
    if (!dialogueActive) nextDialogue();
  }

  function nextDialogue() {
    if (dialogueQueue.length === 0) {
      dialogueActive = null;
      el.dialogueBox.classList.add("hidden");
      paused = false;
      if (onQueueEmpty) { const fn = onQueueEmpty; onQueueEmpty = null; fn(); }
      return;
    }
    dialogueActive = dialogueQueue.shift();
    dialogueTimer = 0;
    dialogueTypedChars = 0;
    paused = dialogueBlocking;
    el.dialogueBox.classList.remove("hidden");
    el.dialogueTap.style.visibility = dialogueBlocking ? "visible" : "hidden";
    const who = dialogueActive.who;
    el.dialogueName.textContent = NAMES[who] || "";
    if (who === "goblin") {
      el.dialoguePortrait.style.backgroundImage = "none";
      el.dialoguePortrait.style.backgroundColor = "#4a8a37";
    } else {
      el.dialoguePortrait.style.backgroundColor = "";
      el.dialoguePortrait.style.backgroundImage = `url(${PORTRAITS[who]})`;
    }
    el.dialogueText.textContent = "";
    Audio2.sfx.textBlip();
  }

  function advanceDialogueTap() {
    if (!dialogueActive) return;
    if (dialogueTypedChars < dialogueActive.text.length) {
      dialogueTypedChars = dialogueActive.text.length; // reveal full line instantly
      el.dialogueText.textContent = dialogueActive.text;
      return;
    }
    nextDialogue();
  }
  el.dialogueBox.addEventListener("pointerdown", (e) => { e.preventDefault(); if (dialogueBlocking) advanceDialogueTap(); });

  function updateDialogue(dt) {
    if (!dialogueActive) return;
    dialogueTimer += dt;
    const full = dialogueActive.text;
    const targetChars = Math.min(full.length, Math.floor(dialogueTimer / 0.022));
    if (targetChars > dialogueTypedChars) {
      dialogueTypedChars = targetChars;
      el.dialogueText.textContent = full.slice(0, dialogueTypedChars);
      if (dialogueTypedChars % 2 === 0 && dialogueTypedChars < full.length) Audio2.sfx.textBlip();
    }
    if (!dialogueBlocking && dialogueTypedChars >= full.length && dialogueTimer > (full.length * 0.022 + 1.6)) {
      nextDialogue();
    }
  }

  // ---------------- Input: joystick ----------------
  let joyActive = false, joyX = 0, joyY = 0, jumpConsumed = false;
  const JOY_R = 40;

  function joyCenter() {
    const r = el.joystickBase.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function joyHandleMove(clientX, clientY) {
    const c = joyCenter();
    let dx = clientX - c.x, dy = clientY - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_R) { dx = (dx / dist) * JOY_R; dy = (dy / dist) * JOY_R; }
    el.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyX = dx / JOY_R; joyY = dy / JOY_R;
    if (joyY < -0.55 && !jumpConsumed) { requestJump(); jumpConsumed = true; }
    if (joyY > -0.25) jumpConsumed = false;
  }
  function joyReset() {
    joyActive = false; joyX = 0; joyY = 0; jumpConsumed = false;
    el.joystickKnob.style.transform = "translate(0,0)";
  }
  el.joystickBase.addEventListener("pointerdown", (e) => {
    e.preventDefault(); joyActive = true;
    el.joystickBase.setPointerCapture(e.pointerId);
    joyHandleMove(e.clientX, e.clientY);
  });
  el.joystickBase.addEventListener("pointermove", (e) => { if (joyActive) joyHandleMove(e.clientX, e.clientY); });
  el.joystickBase.addEventListener("pointerup", joyReset);
  el.joystickBase.addEventListener("pointercancel", joyReset);

  let attackFlowerMode = false;
  el.attackBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (attackFlowerMode) { giveFlower(); }
    else { requestAttack(); }
  });

  function requestJump() {
    if (paused) return;
    if (STATE !== "level") return;
    if (knight.onGround) {
      knight.vy = JUMP_V; knight.onGround = false;
      Audio2.sfx.jump();
    }
  }
  function requestAttack() {
    if (paused) return;
    if (STATE !== "level") return;
    if (knight.attackT > 0) return;
    knight.state = "attack"; knight.attackT = 0.32; knight.attackHasHit = false;
    Audio2.sfx.swordSwing();
  }

  // ---------------- Level physics & collision ----------------
  function groundExistsAt(x) {
    if (!level.gaps) return true;
    for (const g of level.gaps) if (x > g.x - g.w / 2 && x < g.x + g.w / 2) return false;
    return true;
  }
  function aabbOverlapX(ax, aw, bx, bw) {
    return Math.abs(ax - bx) < (aw + bw) / 2;
  }

  function respawnKnight() {
    knight.x = 20; knight.airY = 0; knight.vy = 0; knight.onGround = true; knight.hearts = 3;
    knight.invT = 1.2;
    updateHearts();
    Audio2.sfx.fall();
    showBanner("Oof! Try again 💫", 1200);
  }

  function hurtKnight(kbDir) {
    if (knight.invT > 0) return;
    knight.hearts -= 1;
    knight.invT = INVINCIBLE_TIME;
    updateHearts();
    Audio2.sfx.knightHurt();
    knight.hurtBump = kbDir * 60;
    if (knight.hearts <= 0) {
      setTimeout(respawnKnight, 260);
    }
  }

  function updateLevel(dt) {
    // horizontal input
    if (!paused) {
      const moveX = Math.abs(joyX) > 0.18 ? joyX : 0;
      knight.x += moveX * MOVE_SPEED * dt;
      if (moveX !== 0) knight.facing = moveX > 0 ? 1 : -1;
      knight.x = Math.max(4, Math.min(level.length + 40, knight.x));

      if (knight.hurtBump) { knight.x += knight.hurtBump * dt * 6; knight.hurtBump *= (1 - dt * 6); if (Math.abs(knight.hurtBump) < 1) knight.hurtBump = 0; }

      // vertical physics
      const wasOnGround = knight.onGround;
      knight.vy += GRAVITY * dt;
      knight.airY += knight.vy * dt;
      const groundHere = groundExistsAt(knight.x);
      if (knight.airY >= 0) {
        if (groundHere) {
          if (!wasOnGround) { spawnDust(knight.x, GROUND_Y, 5); Audio2.sfx.land(); }
          knight.airY = 0; knight.vy = 0; knight.onGround = true;
        } else {
          knight.onGround = false; // falling through gap
          if (knight.airY > 220) { hurtKnight(0); respawnKnight(); }
        }
      } else {
        knight.onGround = false;
      }
    }

    if (knight.invT > 0) knight.invT -= dt;

    // state / animation
    if (knight.attackT > 0) {
      knight.attackT -= dt;
      if (knight.attackT <= 0) { knight.state = "idle"; }
      else knight.state = "attack";
    } else if (!knight.onGround) knight.state = "jump";
    else if (!paused && Math.abs(joyX) > 0.18) knight.state = "run";
    else knight.state = "idle";

    // attack hit-check (single moment mid-swing)
    if (knight.state === "attack" && !knight.attackHasHit && knight.attackT < 0.22 && knight.attackT > 0.1) {
      knight.attackHasHit = true;
      const ax = knight.x + knight.facing * ATTACK_RANGE * 0.6;
      for (const m of level.monsters) {
        if (m.dead) continue;
        if (aabbOverlapX(ax, ATTACK_W, m.x, 30)) {
          m.dead = true; m.hurtT = 0.001;
          Audio2.sfx.monsterDefeat();
          spawnSparkle(m.x, GROUND_Y - 30, 8);
          if (level.slimeLine && !level.slimeLine.used) {
            level.slimeLine.used = true;
            enqueueDialogue([level.slimeLine], false);
          }
        }
      }
      if (level.boss && !level.boss.dead && level.boss.state !== "slam") {
        const b = level.boss;
        if (aabbOverlapX(ax, ATTACK_W, b.x, 44) && b.hitCooldown <= 0) {
          b.hp -= 1; b.hitCooldown = 0.5; b.hurtT = 0.3;
          Audio2.sfx.hitMonster();
          spawnSparkle(b.x, GROUND_Y - 70, 10);
          if (b.hp <= 0) {
            b.dead = true;
            Audio2.sfx.monsterDefeat();
            setTimeout(() => Audio2.sfx.victoryFanfare(), 200);
            enqueueDialogue([
              { who: "knight", text: "Tell your friends: love wins." },
            ], true, () => {
              showBanner("Gate opens... 🏰", 1600);
              setTimeout(startTowerClimb, 1200);
            });
          }
        }
      }
    }

    // monster updates (patrol / collisions with knight)
    for (const m of level.monsters) {
      if (m.dead) { if (m.hurtT !== undefined) m.hurtT += dt; continue; }
      if (m.type === "slime") {
        m.x += m.dir * 26 * dt;
        if (m.x > m.baseX + m.range) m.dir = -1;
        if (m.x < m.baseX - m.range) m.dir = 1;
      } else if (m.type === "bat") {
        m.x += m.dir * 40 * dt;
        if (m.x > m.baseX + 140) m.dir = -1;
        if (m.x < m.baseX - 140) m.dir = 1;
      }
      if (!paused && knight.invT <= 0) {
        const my = m.type === "bat" ? GROUND_Y + m.baseY : GROUND_Y - 10;
        const ky = GROUND_Y + knight.airY - KNIGHT_H / 2;
        const closeY = Math.abs(my - ky) < 60;
        if (closeY && aabbOverlapX(knight.x, KNIGHT_W, m.x, 26)) {
          hurtKnight(knight.x < m.x ? -1 : 1);
        }
      }
    }

    // obstacle collisions
    for (const o of level.obstacles) {
      const h = o.type === "log" ? o.h : o.type === "rock" ? o.size * 1.15 : o.h;
      const w = o.type === "log" ? o.w : o.type === "rock" ? o.size * 2 : o.w;
      if (!paused && knight.invT <= 0 && aabbOverlapX(knight.x, KNIGHT_W, o.x, w)) {
        const kneeHeight = -knight.airY; // how high above ground the knight currently is
        if (kneeHeight < h - 6) {
          hurtKnight(knight.x < o.x ? -1 : 1);
        } else if (!o.clearedLineShown && level.clearLine && !level.clearLine.used) {
          o.clearedLineShown = true; level.clearLine.used = true;
          enqueueDialogue([level.clearLine], false);
        }
      } else if (!o.clearedLineShown && knight.x > o.x + 40 && level.clearLine && !level.clearLine.used) {
        o.clearedLineShown = true; level.clearLine.used = true;
        enqueueDialogue([level.clearLine], false);
      }
    }

    // boss trigger
    if (level.boss && !level.bossFightActive && knight.x >= level.bossTriggerX) {
      level.bossFightActive = true;
      knight.x = level.bossTriggerX;
      Audio2.sfx.bossRoar();
      enqueueDialogue([
        { who: "goblin", text: "None shall pass, lovesick boy!" },
        { who: "knight", text: "Watch me." },
      ], true);
    }
    if (level.boss && level.bossFightActive && !level.boss.dead) {
      updateBoss(dt);
    }

    // camera
    const rightBound = level.boss ? level.bossTriggerX + 260 : level.length;
    camX = Math.max(0, Math.min(knight.x - VW * 0.36, Math.max(0, rightBound - VW)));

    // level clear (non-boss levels)
    if (!level.boss && knight.x >= level.gateX) {
      goToNextLevel();
    }

    updateParticles(dt);
  }

  function updateBoss(dt) {
    const b = level.boss;
    b.stateT -= dt;
    if (b.hitCooldown > 0) b.hitCooldown -= dt;
    if (b.hurtT > 0) b.hurtT -= dt;
    if (b.stateT <= 0) {
      if (b.state === "idle") { b.state = "windup"; b.stateT = 0.8; Audio2.sfx.bossStomp(); }
      else if (b.state === "windup") { b.state = "slam"; b.stateT = 0.25; }
      else if (b.state === "slam") { b.state = "recover"; b.stateT = 0.7; }
      else { b.state = "idle"; b.stateT = 0.9; }
    }
    if (b.state === "slam" && !paused && knight.invT <= 0) {
      if (aabbOverlapX(knight.x, KNIGHT_W, b.x, 90) && knight.airY > -30) {
        hurtKnight(knight.x < b.x ? -1 : 1);
      }
    }
  }

  function goToNextLevel() {
    Audio2.stopMusic();
    if (levelIndex + 1 < LEVELS.length) {
      showBanner("Level Complete! 🎉", 1300);
      setTimeout(() => startLevel(levelIndex + 1), 1100);
    }
  }

  // ---------------- Tower climb cutscene ----------------
  let climbT = 0;
  function startTowerClimb() {
    STATE = "towerclimb"; climbT = 0; showControls(false);
    Audio2.playMusic("tower");
  }
  function updateTowerClimb(dt) {
    climbT += dt;
    if (Math.floor(climbT * 6) !== Math.floor((climbT - dt) * 6)) Audio2.sfx.footstep();
    if (climbT > 3.1) startRescue();
  }
  function drawTowerClimb() {
    Art.drawCastleBG(ctx, VW, VH, 260, GROUND_Y);
    ctx.save();
    ctx.fillStyle = "rgba(20,10,35,.55)";
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
    const climbY = GROUND_Y - Math.min(1, climbT / 3.1) * 260;
    Art.drawKnight(ctx, VW / 2, climbY, { facing: 1, state: "run", t });
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Climbing the tower...", VW / 2, 60);
  }

  // ---------------- Rescue scene ----------------
  function startRescue() {
    STATE = "rescue"; showControls(false);
    attackFlowerMode = false;
    knight.holdFlower = false;
    Audio2.sfx.help();
    showBanner("💗 The Tower 💗", 1400);
    setTimeout(() => {
      enqueueDialogue([
        { who: "princess", text: "Help! ...wait — Farrukh?! Is that really you?" },
        { who: "knight", text: "Did someone call for a knight in slightly dented armor?" },
        { who: "princess", text: "You're late. Also, you smell like slime." },
        { who: "knight", text: "Every hero has flaws. Mine is punctuality. And slimes." },
      ], true, () => {
        attackFlowerMode = true;
        showControls(true, true);
        showBanner("Tap 🌸 to give her flowers", 2200);
      });
    }, 1000);
  }

  function giveFlower() {
    if (!attackFlowerMode) return;
    attackFlowerMode = false;
    showControls(false);
    knight.holdFlower = true;
    Audio2.sfx.flowerGive();
    spawnSparkle(VW / 2 + 40, GROUND_Y - 90, 10);
    enqueueDialogue([
      { who: "knight", text: "For you, my princess." },
      { who: "princess", text: "They're beautiful... almost as beautiful as this reunion." },
    ], true, () => {
      Audio2.sfx.kiss();
      spawnHearts(VW / 2, GROUND_Y - 100, 10);
      showBanner("💋", 1000);
      setTimeout(() => {
        enqueueDialogue([{ who: "princess", text: "Finally." }], true, () => {
          setTimeout(startWedding, 500);
        });
      }, 700);
    });
  }

  function drawRescue() {
    Art.drawTowerInteriorBG(ctx, VW, VH);
    Art.drawPrincess(ctx, VW / 2 + 60, GROUND_Y - 60, { facing: -1, t });
    Art.drawKnight(ctx, VW / 2 - 60, GROUND_Y - 60, { facing: 1, t, holdFlower: knight.holdFlower });
  }

  // ---------------- Wedding scene ----------------
  let weddingT = 0;
  function startWedding() {
    STATE = "wedding"; weddingT = 0; showControls(false);
    Audio2.playMusic("wedding");
    Audio2.sfx.weddingBells();
    setTimeout(() => {
      enqueueDialogue([
        { who: "princess", text: "This obstacle course was nothing... compared to putting up with you forever." },
        { who: "knight", text: "I'll take that as a yes." },
      ], true, () => {
        setTimeout(() => {
          el.endScreen.classList.remove("hidden");
        }, 900);
      });
    }, 1400);
  }
  function updateWedding(dt) {
    weddingT += dt;
    if (Math.random() < dt * 3) spawnConfetti();
    updateParticles(dt);
  }
  function drawWedding() {
    Art.drawWeddingBG(ctx, VW, VH, true);
    Art.drawPrincess(ctx, VW / 2 + 34, GROUND_Y - 90, { facing: -1, t, wedding: true });
    Art.drawKnight(ctx, VW / 2 - 34, GROUND_Y - 90, { facing: 1, t, wedding: true });
    drawParticles();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 3;
    ctx.strokeText("Sir Farrukh & Princess Adelina", VW / 2, 60);
    ctx.fillText("Sir Farrukh & Princess Adelina", VW / 2, 60);
  }

  // ---------------- UI helpers ----------------
  function showControls(show, flowerMode = false) {
    el.controls.classList.toggle("hidden", !show);
    attackFlowerMode = flowerMode;
    el.attackBtn.textContent = flowerMode ? "🌸" : "⚔️";
    el.attackBtn.classList.toggle("flowerMode", flowerMode);
  }

  // ---------------- Rendering: level ----------------
  function drawLevel() {
    if (level.bg === "forest") Art.drawForestBG(ctx, VW, VH, camX, GROUND_Y);
    else if (level.bg === "bridge") Art.drawBridgeBG(ctx, VW, VH, camX, GROUND_Y);
    else if (level.bg === "castle") Art.drawCastleBG(ctx, VW, VH, camX, GROUND_Y);

    ctx.save();
    ctx.translate(-camX, 0);

    // bridge planks (skip over gaps)
    if (level.bg === "bridge") {
      for (let x = 0; x <= level.length; x += 40) {
        if (groundExistsAtStatic(x)) Art.drawPlank(ctx, x, GROUND_Y, 42);
      }
      for (const g of level.gaps) {
        Art.drawRope(ctx, g.x - g.w / 2 - 30, GROUND_Y - 30, g.x + g.w / 2 + 30, GROUND_Y - 30, 14);
      }
    }

    // obstacles
    for (const o of level.obstacles) {
      if (o.type === "log") Art.drawLog(ctx, o.x, GROUND_Y, o.w, o.h);
      else if (o.type === "rock") Art.drawRock(ctx, o.x, GROUND_Y, o.size);
      else if (o.type === "spikes") Art.drawSpikes(ctx, o.x, GROUND_Y, o.w, o.h);
    }

    // gate
    Art.drawGate(ctx, level.boss ? level.bossTriggerX + 210 : level.gateX, GROUND_Y, 70, level.boss ? !!level.boss.dead : knight.x > level.gateX - 60);

    // monsters
    for (const m of level.monsters) {
      if (m.dead && m.hurtT > 0.3) continue;
      if (m.type === "slime") Art.drawSlime(ctx, m.x, GROUND_Y - 2, t, m.dead);
      else if (m.type === "bat") Art.drawBat(ctx, m.x, GROUND_Y + m.baseY, t, m.dead);
    }

    // boss
    if (level.boss && level.bossFightActive && !(level.boss.dead)) {
      Art.drawGoblinBoss(ctx, level.boss.x, GROUND_Y, { t, facing: -1, windup: level.boss.state === "windup" || level.boss.state === "slam", hurt: level.boss.hurtT > 0 });
      drawBossHpBar();
    }

    // knight shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(knight.x, GROUND_Y + 4, 16, 5, 0, 0, 7);
    ctx.fill();
    ctx.restore();

    Art.drawKnight(ctx, knight.x, GROUND_Y + knight.airY, {
      facing: knight.facing, state: knight.state, t, hitFlash: knight.invT > 0,
    });

    drawParticles();
    ctx.restore();
  }

  function groundExistsAtStatic(x) {
    for (const g of level.gaps) if (x > g.x - g.w / 2 - 10 && x < g.x + g.w / 2 + 10) return false;
    return true;
  }

  function drawBossHpBar() {
    const b = level.boss;
    const bx = b.x - camX;
    const w = 90;
    ctx.save();
    ctx.translate(camX, 0);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    Art.roundRect(ctx, b.x - w / 2, GROUND_Y - 150, w, 10, 4); ctx.fill();
    ctx.fillStyle = "#e0536b";
    Art.roundRect(ctx, b.x - w / 2 + 1, GROUND_Y - 149, (w - 2) * Math.max(0, b.hp / b.maxHp), 8, 3); ctx.fill();
    ctx.restore();
  }

  // ---------------- Main loop ----------------
  let lastTime = performance.now();
  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 0.033);
    t += dt;

    ctx.clearRect(0, 0, VW, VH);

    try {
    if (STATE === "level") {
      updateLevel(dt);
      drawLevel();
    } else if (STATE === "towerclimb") {
      updateTowerClimb(dt);
      drawTowerClimb();
    } else if (STATE === "rescue") {
      updateParticles(dt);
      drawRescue();
      drawParticles();
    } else if (STATE === "wedding") {
      updateWedding(dt);
      drawWedding();
    } else {
      Art.drawForestBG(ctx, VW, VH, Math.sin(t * 10) * 20, GROUND_Y);
    }
    } catch (err) {
      console.error("frame error:", err);
    }

    updateDialogue(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------------- Boot ----------------
  el.startBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    Audio2.unlock();
    el.start.classList.add("hidden");
    el.hud.classList.remove("hidden");
    startLevel(0);
  });

  el.muteBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const m = Audio2.toggleMuted();
    el.muteBtn.textContent = m ? "🔇" : "🔊";
  });

  el.restartBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    el.endScreen.classList.add("hidden");
    particles.length = 0;
    startLevel(0);
  });

  // prevent iOS double-tap zoom / scroll bounce
  document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
})();
