// ============================================================
// Audio.js — tiny synthesized chiptune engine (Web Audio API).
// No external files: every sound & tune is generated live.
// ============================================================

const Audio2 = (() => {
  let ctx = null;
  let masterGain, musicGain, sfxGain;
  let unlocked = false;
  let muted = false;
  let musicToken = 0; // increments to cancel a running music loop

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(masterGain);
  }

  function unlock() {
    init();
    if (ctx.state === "suspended") ctx.resume();
    if (!unlocked) {
      // Play a silent blip to fully unlock iOS audio on first touch.
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      o.connect(g).connect(masterGain);
      o.start();
      o.stop(ctx.currentTime + 0.05);
      unlocked = true;
    }
  }

  function setMuted(m) {
    muted = m;
    if (masterGain) masterGain.gain.value = m ? 0 : 1;
  }
  function toggleMuted() { setMuted(!muted); return muted; }

  // ---- low-level helpers ----
  function tone(freq, t0, dur, { type = "square", gain = 0.2, glideTo = null, attack = 0.005, release = 0.08, dest = null } = {}) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    o.connect(g).connect(dest || sfxGain);
    o.start(t0);
    o.stop(t0 + dur + release + 0.02);
    return o;
  }

  function noiseBurst(t0, dur, { gain = 0.25, filterFreq = 2000, dest = null } = {}) {
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(dest || sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const now = () => ctx.currentTime;

  // ---- SFX presets ----
  const sfx = {
    jump() { if (!ctx) return; tone(320, now(), 0.12, { type: "square", gain: 0.18, glideTo: 640 }); },
    land() { if (!ctx) return; tone(140, now(), 0.08, { type: "sine", gain: 0.15, glideTo: 60 }); noiseBurst(now(), 0.06, { gain: 0.12, filterFreq: 400 }); },
    footstep() { if (!ctx) return; noiseBurst(now(), 0.045, { gain: 0.06, filterFreq: 900 }); },
    swordSwing() {
      if (!ctx) return;
      const t = now();
      tone(900, t, 0.07, { type: "sawtooth", gain: 0.12, glideTo: 1400 });
      noiseBurst(t, 0.08, { gain: 0.15, filterFreq: 3500 });
    },
    hitMonster() {
      if (!ctx) return;
      const t = now();
      tone(500, t, 0.09, { type: "square", gain: 0.2, glideTo: 180 });
      noiseBurst(t, 0.05, { gain: 0.15, filterFreq: 1800 });
    },
    monsterDefeat() {
      if (!ctx) return;
      const t = now();
      [660, 520, 380, 260].forEach((f, i) => tone(f, t + i * 0.06, 0.09, { type: "square", gain: 0.16 }));
    },
    knightHurt() {
      if (!ctx) return;
      const t = now();
      tone(220, t, 0.16, { type: "sawtooth", gain: 0.2, glideTo: 90 });
      noiseBurst(t, 0.1, { gain: 0.18, filterFreq: 600 });
    },
    bump() { if (!ctx) return; tone(160, now(), 0.1, { type: "triangle", gain: 0.2, glideTo: 80 }); },
    fall() {
      if (!ctx) return;
      const t = now();
      tone(500, t, 0.35, { type: "sine", gain: 0.18, glideTo: 90 });
    },
    textBlip() { if (!ctx) return; tone(680 + Math.random() * 120, now(), 0.035, { type: "square", gain: 0.09 }); },
    select() { if (!ctx) return; tone(500, now(), 0.05, { type: "square", gain: 0.15, glideTo: 800 }); },
    checkpoint() {
      if (!ctx) return;
      const t = now();
      [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.14, { type: "triangle", gain: 0.16 }));
    },
    gateOpen() {
      if (!ctx) return;
      const t = now();
      tone(120, t, 0.9, { type: "sawtooth", gain: 0.12, glideTo: 90 });
      noiseBurst(t, 0.6, { gain: 0.1, filterFreq: 300 });
    },
    bossRoar() {
      if (!ctx) return;
      const t = now();
      tone(90, t, 0.5, { type: "sawtooth", gain: 0.22, glideTo: 60 });
      noiseBurst(t, 0.4, { gain: 0.18, filterFreq: 250 });
    },
    bossStomp() { if (!ctx) return; tone(80, now(), 0.18, { type: "square", gain: 0.25, glideTo: 40 }); },
    help() {
      // princess's "Help!" call — a bright rising then falling whistle
      if (!ctx) return;
      const t = now();
      tone(700, t, 0.22, { type: "sine", gain: 0.22, glideTo: 1000 });
      tone(900, t + 0.22, 0.22, { type: "sine", gain: 0.2, glideTo: 650 });
    },
    flowerGive() {
      if (!ctx) return;
      const t = now();
      [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.09, 0.2, { type: "triangle", gain: 0.16 }));
    },
    kiss() {
      if (!ctx) return;
      const t = now();
      noiseBurst(t, 0.05, { gain: 0.12, filterFreq: 1400 });
      tone(1200, t + 0.03, 0.08, { type: "sine", gain: 0.1, glideTo: 1600 });
    },
    heartPop() { if (!ctx) return; tone(880, now(), 0.09, { type: "sine", gain: 0.12, glideTo: 1200 }); },
    weddingBells() {
      if (!ctx) return;
      const t = now();
      [880, 1046, 1318].forEach((f, i) => {
        tone(f, t + i * 0.18, 0.5, { type: "triangle", gain: 0.14 });
        tone(f * 2, t + i * 0.18, 0.3, { type: "sine", gain: 0.06 });
      });
    },
    victoryFanfare() {
      if (!ctx) return;
      const t = now();
      const notes = [523, 523, 523, 659, 784, 784, 659, 784, 1046];
      const times = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 0.98, 1.2];
      notes.forEach((f, i) => tone(f, t + times[i], 0.28, { type: "square", gain: 0.18 }));
    },
  };

  // ---- procedural background music ----
  // Each track: bpm, bass pattern, melody pattern (freq or null=rest), waveform.
  const TRACKS = {
    forest: {
      bpm: 108,
      melody: [392, 440, 494, 440, 392, null, 330, 349, 392, 440, 392, null, 349, 330, 294, null],
      bass: [98, null, 98, null, 110, null, 110, null, 98, null, 98, null, 87, null, 98, null],
      mType: "triangle", bType: "sine", mGain: 0.1, bGain: 0.14,
    },
    bridge: {
      bpm: 128,
      melody: [523, null, 587, 523, 466, null, 523, null, 440, null, 494, 440, 392, null, 440, null],
      bass: [131, 131, null, 131, 117, 117, null, 117, 110, 110, null, 110, 98, 98, null, 98],
      mType: "square", bType: "triangle", mGain: 0.09, bGain: 0.15,
    },
    castle: {
      bpm: 140,
      melody: [330, 330, 392, 330, 294, 294, 349, 294, 262, 262, 330, 294, 247, 247, 294, 262],
      bass: [82, null, 82, 82, 73, null, 73, 73, 65, null, 65, 65, 61, null, 61, 61],
      mType: "sawtooth", bType: "square", mGain: 0.1, bGain: 0.16,
    },
    tower: {
      bpm: 90,
      melody: [587, null, 659, 587, 523, null, null, 494, 523, null, 587, 523, 440, null, null, null],
      bass: [147, null, null, 147, 131, null, null, 131, 130.8, null, null, 130.8, 110, null, null, null],
      mType: "sine", bType: "sine", mGain: 0.09, bGain: 0.1,
    },
    wedding: {
      bpm: 116,
      melody: [523, 659, 784, 1046, 784, 659, 523, null, 587, 698, 880, 698, 587, 494, 587, null],
      bass: [131, null, 131, null, 175, null, 175, null, 147, null, 147, null, 165, null, 165, null],
      mType: "triangle", bType: "triangle", mGain: 0.12, bGain: 0.13,
    },
  };

  let musicTimer = null;

  function stopMusic() {
    musicToken++;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  }

  function playMusic(name) {
    if (!ctx) return;
    stopMusic();
    const myToken = musicToken;
    const track = TRACKS[name];
    if (!track) return;
    const stepDur = 60 / track.bpm / 2; // 8th notes

    function scheduleLoop() {
      if (myToken !== musicToken || !ctx) return;
      const t0 = now() + 0.05;
      track.melody.forEach((f, i) => {
        if (f) tone(f, t0 + i * stepDur, stepDur * 0.85, { type: track.mType, gain: track.mGain, dest: musicGain, release: 0.03 });
      });
      track.bass.forEach((f, i) => {
        if (f) tone(f, t0 + i * stepDur, stepDur * 0.9, { type: track.bType, gain: track.bGain, dest: musicGain, release: 0.03 });
      });
      const loopLen = stepDur * track.melody.length;
      musicTimer = setTimeout(scheduleLoop, loopLen * 1000);
    }
    scheduleLoop();
  }

  return { init, unlock, sfx, playMusic, stopMusic, toggleMuted, setMuted, get muted() { return muted; } };
})();
