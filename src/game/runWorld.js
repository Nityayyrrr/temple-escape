/* RunWorld: all game logic + canvas rendering.
   Phaser owns the loop, canvas, and input — this is the simulation + painter. */

import { sound } from './audio';
import { drawPlayer, mixc, roundedPath } from './player';

const CAM_H = 2.1;
const PLAYER_Z = 2.6;
const LANE_WX = 1.05;
const ROAD_HALF = 1.9;
const FOG = '#5a2f57';
const rng = (a, b) => a + Math.random() * (b - a);
const irand = (n) => Math.floor(Math.random() * n);

export class RunWorld {
  hud = {
    score: 0,
    coins: 0,
    dist: 0,
    combo: 1,
    comboActive: false,
    magnetFrac: 0,
    shieldOn: false,
    boostFrac: 0,
    speed: 0,
    phase: 'countdown',
    countText: 'GET READY',
  };

  t = 0;
  state = 'countdown'; // countdown | running | dying | finished
  resultSent = false;

  d = 0; // distance
  speed = 11;
  playerX = 0; // float lane -1..1
  targetLane = 0;
  y = 0; // jump height
  vy = 0;
  slideT = 0;
  runPhase = 0;
  deadTumble = 0;

  coins = 0;
  coinScore = 0;
  comboLevel = 1;
  comboTimer = 0;
  comboCount = 0;

  shieldOn = false;
  magnetT = 0;
  magnetDur = 8;
  boostT = 0;
  mult2 = false;
  invulnT = 0;

  objs = [];
  gaps = [];
  sides = [];
  particles = [];
  spawnCursor = 70;
  sideCursor = 10;
  dustClock = 0;

  shake = 0;
  flash = 0;
  countT = 0;
  deathKind = 'rock';
  fallY = 0;
  shX = 0;
  shY = 0;

  W = 0;
  H = 0;

  constructor(opts) {
    this.skin = opts.skin;
    this.onGameOver = opts.onGameOver;
    this.magnetDur = opts.magnetDur;
    this.shieldOn = opts.boosts.shield;
    this.magnetT = opts.boosts.magnet ? opts.magnetDur : 0;
    this.boostT = opts.boosts.boost ? 6 : 0;
    this.mult2 = opts.boosts.multiplier;

    // decorative sides preseed
    for (let z = 6; z < 160; ) {
      this.spawnSide(z);
      z += rng(5, 11);
    }
    sound.countdown();
    this.syncHud();
  }

  destroy() {
    sound.stopMusic();
  }

  setSize(w, h) {
    if (w > 0 && h > 0) {
      this.W = w;
      this.H = h;
    }
  }

  setPaused(p) {
    if (p) sound.stopMusic();
    else if (this.state === 'running') sound.startMusic();
  }

  get alive() {
    return this.state === 'running';
  }

  /* ------------------------------ input ------------------------------ */

  moveLane(dir) {
    if (!this.alive) return;
    const next = Math.max(-1, Math.min(1, this.targetLane + dir));
    if (next !== this.targetLane) {
      this.targetLane = next;
      sound.lane();
    }
  }

  jump() {
    if (!this.alive) return;
    if (this.y <= 0.01) {
      this.vy = 8.6;
      this.y = 0.02;
      this.slideT = 0;
      sound.jump();
    }
  }

  slide() {
    if (!this.alive) return;
    if (this.y <= 0.01) {
      this.slideT = 0.78;
      sound.slide();
    } else {
      // fast drop
      this.vy = Math.min(this.vy, -14);
    }
  }

  /* ----------------------------- update ------------------------------ */

  update(dt) {
    this.t += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
    this.updateParticles(dt);

    if (this.state === 'countdown') {
      const prev = this.countT;
      this.countT += dt;
      if (prev < 0.5 && this.countT >= 0.5) sound.countdown();
      if (this.countT >= 1.0) {
        this.state = 'running';
        sound.countdown(true);
        sound.startMusic();
      }
      this.syncHud();
      return;
    }

    if (this.state === 'dying') {
      this.countT += dt;
      if (this.deathKind === 'rock') {
        this.deadTumble += dt * 10;
        this.vy -= 24 * dt;
        this.y = Math.max(0, this.y + this.vy * dt);
      } else {
        this.vy -= 30 * dt;
        this.fallY = Math.max(-8, this.fallY + this.vy * dt);
      }
      this.d += this.speed * dt * Math.max(0, 1 - this.countT * 2);
      if (this.countT > 1.25) this.finish();
      this.syncHud();
      return;
    }

    if (this.state !== 'running') return;

    /* speed + distance — faster start, faster ramp, higher top speed */
    this.speed = 11 + Math.min(26, this.d * 0.018);
    const boosting = this.boostT > 0;
    const eff = boosting ? 52 : this.speed;
    if (boosting) {
      this.boostT -= dt;
      this.magnetT = Math.max(this.magnetT, 0.2);
      if (this.boostT <= 0) {
        this.boostT = 0;
        this.invulnT = 1.2;
        this.objs = this.objs.filter(
          (o) => o.kind === 'coin' || o.z - (this.d + PLAYER_Z) > 40,
        );
      }
      // boost particles
      if (Math.random() < 0.7) {
        this.particles.push({
          x: rng(0, this.W),
          y: rng(0, this.H * 0.75),
          vx: 0,
          vy: this.H * rng(2, 4),
          life: 0,
          max: 0.35,
          size: rng(1, 2.5),
          color: 'rgba(255,220,150,0.7)',
          glow: true,
        });
      }
    }
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.magnetT > 0) this.magnetT = Math.max(0, this.magnetT - dt);

    this.d += eff * dt;
    this.runPhase += eff * dt * 1.55;

    /* player physics */
    this.playerX += (this.targetLane - this.playerX) * Math.min(1, dt * 11);
    if (Math.abs(this.targetLane - this.playerX) < 0.02) this.playerX = this.targetLane;
    if (this.y > 0 || this.vy !== 0) {
      this.vy -= 24 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.landDust();
      }
    }
    if (this.slideT > 0) this.slideT -= dt;

    /* combo decay */
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboLevel = 1;
        this.comboCount = 0;
      }
    }

    /* spawning */
    while (this.spawnCursor < this.d + 170) this.spawnPattern();
    while (this.sideCursor < this.d + 170) {
      this.spawnSide(this.sideCursor);
      this.sideCursor += rng(5, 11);
    }

    /* cleanup */
    this.objs = this.objs.filter((o) => !o.taken && o.z > this.d - 8);
    this.gaps = this.gaps.filter((g) => g.z + g.len > this.d - 8);
    this.sides = this.sides.filter((s) => s.z > this.d - 12);

    /* magnet pull */
    if ((this.magnetT > 0 || boosting) && this.objs.length) {
      for (const o of this.objs) {
        if (o.kind !== 'coin') continue;
        const pz = o.z - (this.d + PLAYER_Z);
        if (pz < 14 && pz > -1) {
          o.z = Math.max(this.d + PLAYER_Z, o.z - dt * 36);
          o.laneF += (this.playerX - o.laneF) * Math.min(1, dt * 14);
        }
      }
    }

    /* collisions */
    const pWorld = this.d + PLAYER_Z;
    for (const o of this.objs) {
      if (o.taken || o.checked) continue;
      const pz = o.z - pWorld;
      if (pz > 0.9) continue;
      if (pz < -0.9) {
        o.checked = true;
        continue;
      }
      const laneDist = Math.abs(o.laneF - this.playerX);
      if (o.kind === 'coin') {
        if (laneDist < 0.45) this.collectCoin(o);
        continue;
      }
      if (o.kind === 'orb') {
        if (laneDist < 0.5) this.collectOrb(o);
        continue;
      }
      if (laneDist > 0.5) {
        if (pz < 1.2) o.checked = true;
        continue;
      }
      if (o.kind === 'rock' && this.y < 0.95) this.hit(o);
      else if (o.kind === 'wall' && this.y < 2.1) this.hit(o);
      else if (o.kind === 'branch') {
        if (this.slideT <= 0) this.hit(o);
        else if (pz < 0) o.checked = true;
      }
    }

    /* gaps */
    for (const g of this.gaps) {
      const inGap = pWorld > g.z + 0.4 && pWorld < g.z + g.len - 1.4;
      if (inGap && this.y <= 0.03 && this.boostT <= 0) {
        this.deathKind = 'gap';
        this.die();
      }
    }

    /* dust while running */
    this.dustClock -= dt;
    if (this.dustClock <= 0 && this.y <= 0.01 && this.state === 'running') {
      this.dustClock = 0.07;
      const bx = this.playerScreenX();
      const by = this.groundYAt(PLAYER_Z);
      this.particles.push({
        x: bx + rng(-14, 14),
        y: by + rng(-4, 2),
        vx: rng(-14, 14),
        vy: rng(-46, -18),
        life: 0,
        max: rng(0.3, 0.55),
        size: rng(3, 7),
        color: 'rgba(178,150,120,0.35)',
      });
    }

    this.syncHud();
  }

  hit(o) {
    o.checked = true;
    if (this.boostT > 0 || this.invulnT > 0) return;
    if (this.shieldOn) {
      this.shieldOn = false;
      this.invulnT = 1.4;
      o.taken = true;
      sound.shieldBreak();
      this.shake = 10;
      this.flash = 0.6;
      const sx = this.xAt(o.laneF * LANE_WX, o.z - this.d);
      const sy = this.yAt(0.8, o.z - this.d);
      for (let i = 0; i < 14; i++) {
        this.particles.push({
          x: sx + rng(-16, 16),
          y: sy + rng(-16, 16),
          vx: rng(-160, 160),
          vy: rng(-260, -40),
          life: 0,
          max: rng(0.4, 0.8),
          size: rng(2, 6),
          color: i % 3 ? 'rgba(150,220,255,0.9)' : 'rgba(255,255,255,0.95)',
          grav: 500,
          glow: true,
        });
      }
      return;
    }
    this.deathKind = 'rock';
    this.die();
  }

  die() {
    if (this.state !== 'running') return;
    this.state = 'dying';
    this.countT = 0;
    this.deadTumble = 0;
    this.fallY = 0;
    this.vy = this.deathKind === 'rock' ? 7 : -2;
    sound.crash();
    sound.stopMusic();
    this.shake = 22;
    const bx = this.playerScreenX();
    const by = this.groundYAt(PLAYER_Z) - 60;
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: bx,
        y: by,
        vx: rng(-220, 220),
        vy: rng(-320, -60),
        life: 0,
        max: rng(0.5, 0.9),
        size: rng(2, 6),
        color: i % 2 ? 'rgba(120,110,130,0.9)' : 'rgba(178,150,120,0.8)',
        grav: 640,
      });
    }
  }

  finish() {
    if (this.resultSent) return;
    this.resultSent = true;
    this.state = 'finished';
    this.syncHud();
    const score = this.currentScore;
    this.onGameOver({
      score,
      coins: this.coins,
      dist: Math.floor(this.d),
      best: 0, // filled by caller
      isNewBest: false,
    });
  }

  get currentScore() {
    return Math.floor(this.d) * (this.mult2 ? 2 : 1) + this.coinScore;
  }

  collectCoin(o) {
    o.taken = true;
    this.coins += 1;
    this.comboCount += 1;
    this.comboTimer = 2.6;
    if (this.comboCount > 0 && this.comboCount % 6 === 0) {
      this.comboLevel = Math.min(6, this.comboLevel + 1);
    }
    this.coinScore += 25 * this.comboLevel * (this.mult2 ? 2 : 1);
    sound.coin(this.comboLevel);
    const sx = this.xAt(o.laneF * LANE_WX, o.z - this.d);
    const sy = this.yAt(o.wy ?? 0.45, o.z - this.d);
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x: sx,
        y: sy,
        vx: rng(-90, 90),
        vy: rng(-160, -30),
        life: 0,
        max: rng(0.3, 0.55),
        size: rng(1.5, 3.5),
        color: 'rgba(255,214,90,0.95)',
        grav: 300,
        glow: true,
      });
    }
  }

  collectOrb(o) {
    o.taken = true;
    sound.powerup();
    this.flash = 0.45;
    if (o.orb === 'magnet') this.magnetT = Math.max(this.magnetT, this.magnetDur);
    else this.shieldOn = true;
    const sx = this.xAt(o.laneF * LANE_WX, o.z - this.d);
    const sy = this.yAt(0.9, o.z - this.d);
    const col = o.orb === 'magnet' ? 'rgba(120,225,255,0.95)' : 'rgba(140,255,190,0.95)';
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: sx,
        y: sy,
        vx: rng(-160, 160),
        vy: rng(-220, 60),
        life: 0,
        max: rng(0.4, 0.7),
        size: rng(2, 4),
        color: col,
        grav: 200,
        glow: true,
      });
    }
  }

  landDust() {
    const bx = this.playerScreenX();
    const by = this.groundYAt(PLAYER_Z);
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: bx + rng(-20, 20),
        y: by,
        vx: rng(-90, 90),
        vy: rng(-70, -10),
        life: 0,
        max: rng(0.25, 0.45),
        size: rng(3, 8),
        color: 'rgba(178,150,120,0.4)',
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life += dt;
      p.vy += (p.grav ?? 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  syncHud() {
    this.hud.score = this.currentScore;
    this.hud.coins = this.coins;
    this.hud.dist = Math.floor(this.d);
    this.hud.combo = this.comboLevel;
    this.hud.comboActive = this.comboTimer > 0 && this.comboLevel > 1;
    this.hud.magnetFrac = this.magnetT > 0 ? Math.min(1, this.magnetT / this.magnetDur) : 0;
    this.hud.shieldOn = this.shieldOn;
    this.hud.boostFrac = this.boostT > 0 ? this.boostT / 6 : 0;
    this.hud.speed = this.speed;
    this.hud.phase = this.state;
    this.hud.countText =
      this.state === 'countdown' ? (this.countT < 0.5 ? 'GET READY' : 'RUN!') : '';
  }

  /* ----------------------------- spawning ------------------------------ */

  lane() {
    return [-1, 0, 1][irand(3)];
  }

  coinLine(lane, z0, n, wy = 0.45) {
    for (let i = 0; i < n; i++) {
      this.objs.push({ kind: 'coin', laneF: lane, z: z0 + i * 2.8, wy });
    }
  }

  spawnPattern() {
    const z = this.spawnCursor;
    const diff = Math.min(1, this.d / 900); // difficulty ramps fast
    const r = Math.random();

    // thresholds — obstacles take over as diff grows, breathers vanish
    const tDouble = 0.6 + diff * 0.12; // 0.60 -> 0.72
    const tGap = tDouble + 0.1;
    const tOrb = tGap + 0.06;
    const tHard = tOrb + 0.06;
    const tBranch2 = tHard + 0.06;

    if (r < 0.1) {
      /* coin line */
      const n = 5 + irand(4);
      this.coinLine(this.lane(), z, n);
      this.spawnCursor = z + n * 2.8 + rng(5, 10);
    } else if (r < 0.16) {
      /* zig-zag coins */
      let lane = this.lane();
      const n = 10 + irand(5);
      for (let i = 0; i < n; i++) {
        this.objs.push({ kind: 'coin', laneF: lane, z: z + i * 2.6, wy: 0.45 });
        if (i % 2 === 1) {
          const opts = [-1, 0, 1].filter((l) => l !== lane);
          lane = opts[irand(2)];
        }
      }
      this.spawnCursor = z + n * 2.6 + rng(5, 10);
    } else if (r < 0.4) {
      /* single jumpable / duckable */
      const lane = this.lane();
      const kindRoll = Math.random();
      if (kindRoll < 0.42) {
        this.objs.push({ kind: 'rock', laneF: lane, z: z + 6 });
        // coin arc over it
        for (let i = 0; i < 5; i++) {
          const zz = z + 6 - 4 + i * 2;
          const wy = 0.45 + Math.sin((i / 4) * Math.PI) * 1.15;
          this.objs.push({ kind: 'coin', laneF: lane, z: zz, wy });
        }
      } else if (kindRoll < 0.78) {
        this.objs.push({ kind: 'branch', laneF: 0, z: z + 6 });
        this.coinLine(this.lane(), z + 3, 4);
      } else {
        this.objs.push({ kind: 'wall', laneF: lane, z: z + 6 });
        const opts = [-1, 0, 1].filter((l) => l !== lane);
        this.coinLine(opts[irand(2)], z + 2, 6);
      }
      this.spawnCursor = z + 13 + rng(3, 8);
    } else if (r < tDouble) {
      /* double trouble: two lanes blocked */
      const free = this.lane();
      const blocked = [-1, 0, 1].filter((l) => l !== free);
      for (const l of blocked) {
        this.objs.push({
          kind: Math.random() < 0.5 ? 'rock' : 'wall',
          laneF: l,
          z: z + 6,
        });
      }
      this.coinLine(free, z + 2, 6);
      this.spawnCursor = z + 14 + rng(3, 8);
    } else if (r < tGap) {
      /* gap with coin arc — longer over time, always within jump reach */
      const jumpDist = this.speed * 0.72;
      const maxLen = Math.max(5.5, jumpDist + 0.8);
      const len = Math.min(maxLen, 7 + Math.random() * 3.5 + diff * 4);
      this.gaps.push({ z: z + 4, len });
      const laneCoin = Math.random() < 0.5 ? 0 : this.lane();
      for (let i = 0; i < 6; i++) {
        const zz = z + 4 + 1 + (i / 5) * (len - 2);
        const wy = 0.45 + Math.sin((i / 5) * Math.PI) * 1.25;
        this.objs.push({ kind: 'coin', laneF: laneCoin, z: zz, wy });
      }
      this.spawnCursor = z + 4 + len + rng(6, 12);
    } else if (r < tOrb) {
      /* power-up orb */
      const lane = this.lane();
      this.objs.push({
        kind: 'orb',
        laneF: lane,
        z: z + 8,
        orb: Math.random() < 0.5 ? 'magnet' : 'shield',
      });
      this.coinLine(lane, z, 4, 0.45);
      this.spawnCursor = z + 15 + rng(4, 10);
    } else if (r < tHard) {
      if (diff > 0.25 && Math.random() < 0.6) {
        /* THE GAUNTLET: three rapid double-blocks — the free lane keeps moving */
        let freeLane = this.lane();
        let zz = z + 6;
        const step = Math.max(10.5, this.speed * 0.34);
        for (let i = 0; i < 3; i++) {
          for (const l of [-1, 0, 1]) {
            if (l !== freeLane) {
              this.objs.push({ kind: i % 2 ? 'rock' : 'wall', laneF: l, z: zz });
            }
          }
          this.objs.push({ kind: 'coin', laneF: freeLane, z: zz - 2.2, wy: 0.45 });
          const nextOpts = [-1, 0, 1].filter((l) => l !== freeLane);
          freeLane = nextOpts[irand(2)];
          zz += step;
        }
        this.spawnCursor = zz + rng(6, 10);
      } else {
        /* twin wall corridor */
        const zz = z + 6;
        this.objs.push({ kind: 'wall', laneF: -1, z: zz });
        this.objs.push({ kind: 'wall', laneF: 1, z: zz });
        this.coinLine(0, z + 2, 7);
        this.spawnCursor = z + 13 + rng(4, 10);
      }
    } else if (r < tBranch2) {
      /* duck duo: two hanging logs back to back */
      this.objs.push({ kind: 'branch', laneF: 0, z: z + 6 });
      this.objs.push({ kind: 'branch', laneF: 0, z: z + 19 });
      this.coinLine(this.lane(), z + 9, 4);
      this.spawnCursor = z + 27 + rng(4, 9);
    } else {
      /* breather: coins on two lanes (disappears at full difficulty) */
      const lanes = [-1, 0, 1];
      const a = lanes.splice(irand(3), 1)[0];
      const b = lanes[irand(2)];
      this.coinLine(a, z, 5);
      this.coinLine(b, z + 1.4, 5);
      this.spawnCursor = z + 15 + rng(4, 8);
    }
  }

  spawnSide(z) {
    const roll = Math.random();
    const kind =
      roll < 0.4 ? 'palm' : roll < 0.58 ? 'bush' : roll < 0.74 ? 'torch' : roll < 0.9 ? 'pillar' : 'ruinRock';
    this.sides.push({
      kind,
      side: Math.random() < 0.5 ? -1 : 1,
      xOff: rng(2.3, 4.6),
      z,
      seed: Math.random() * 100,
    });
  }

  /* ----------------------------- projection ------------------------------ */

  pxu(z) {
    return (this.H * 0.55) / z;
  }
  cx() {
    return this.W / 2 + this.shX;
  }
  horizon() {
    return this.H * 0.4;
  }
  groundYAt(z) {
    return this.horizon() + CAM_H * this.pxu(z) + this.shY;
  }
  xAt(wx, z) {
    return this.cx() + wx * this.pxu(z);
  }
  yAt(wy, z) {
    return this.groundYAt(z) - wy * this.pxu(z);
  }
  playerScreenX() {
    return this.cx() + this.playerX * LANE_WX * this.pxu(PLAYER_Z);
  }

  /* ------------------------------ drawing ------------------------------ */

  fogF(z) {
    return Math.min(0.85, Math.max(0, (z - 12) / 130));
  }

  draw(ctx) {
    const { W, H } = this;
    if (!W || !H) return;
    this.shX = this.shake > 0 ? rng(-this.shake, this.shake) : 0;
    this.shY = this.shake > 0 ? rng(-this.shake * 0.5, this.shake * 0.5) : 0;
    this.ctx = ctx;
    ctx.clearRect(0, 0, W, H);
    this.drawSky();
    this.drawGround();
    this.drawRoad();
    this.drawWorldObjects();
    this.drawPlayerChar();
    this.drawParticles();
    if (this.boostT > 0) this.drawBoostFX();
    this.drawVignette();
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,250,230,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawSky() {
    const { ctx, W, H } = this;
    const hz = this.horizon();
    const g = ctx.createLinearGradient(0, 0, 0, hz * 1.35);
    g.addColorStop(0, '#160d2e');
    g.addColorStop(0.45, '#452059');
    g.addColorStop(0.8, '#8c3f58');
    g.addColorStop(1, '#e0703c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hz * 1.35);

    // sun
    const sunX = W * 0.68 + Math.sin(this.t * 0.05) * 6;
    const sunY = hz * 0.82;
    const sunR = H * 0.085;
    const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 4);
    sg.addColorStop(0, 'rgba(255,214,140,0.95)');
    sg.addColorStop(0.18, 'rgba(255,178,96,0.55)');
    sg.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sunX - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 8);
    ctx.fillStyle = '#ffd98f';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // clouds
    ctx.fillStyle = 'rgba(255,190,140,0.10)';
    for (let i = 0; i < 4; i++) {
      const cy = hz * (0.3 + i * 0.16);
      const cx = ((this.t * 6 * (i + 1) + i * 400) % (W + 500)) - 250;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 180 + i * 40, 10 + i * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // far temple silhouette beacon
    const tw = W * 0.16;
    const sway = Math.sin(this.t * 0.1) * 3 + this.playerX * -10;
    ctx.fillStyle = '#241238';
    const tx = W / 2 + sway;
    ctx.beginPath();
    ctx.moveTo(tx - tw / 2, hz);
    ctx.lineTo(tx - tw / 2, hz - H * 0.05);
    ctx.lineTo(tx - tw * 0.32, hz - H * 0.05);
    ctx.lineTo(tx - tw * 0.32, hz - H * 0.1);
    ctx.lineTo(tx - tw * 0.16, hz - H * 0.1);
    ctx.lineTo(tx - tw * 0.16, hz - H * 0.16);
    ctx.lineTo(tx, hz - H * 0.2);
    ctx.lineTo(tx + tw * 0.16, hz - H * 0.16);
    ctx.lineTo(tx + tw * 0.16, hz - H * 0.1);
    ctx.lineTo(tx + tw * 0.32, hz - H * 0.1);
    ctx.lineTo(tx + tw * 0.32, hz - H * 0.05);
    ctx.lineTo(tx + tw / 2, hz - H * 0.05);
    ctx.lineTo(tx + tw / 2, hz);
    ctx.fill();

    // mountain layers
    this.mountainLayer(hz + 2, H * 0.1, '#3a2050', 0.5, this.t * 0.02);
    this.mountainLayer(hz + 4, H * 0.065, '#2b163f', 0.85, this.t * 0.05 + 9);
  }

  mountainLayer(baseY, amp, color, jag, phase) {
    const { ctx, W } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= W; x += 24) {
      const n =
        Math.sin(x * 0.006 + phase) * 0.55 +
        Math.sin(x * 0.017 + phase * 2.3) * 0.3 +
        Math.sin(x * 0.041 + phase * 5.1) * 0.15 * jag;
      ctx.lineTo(x, baseY - amp * (0.35 + Math.abs(n)));
    }
    ctx.lineTo(this.W, baseY);
    ctx.closePath();
    ctx.fill();
  }

  drawGround() {
    const { ctx, W, H } = this;
    const hz = this.horizon();
    const g = ctx.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, '#24402c');
    g.addColorStop(0.4, '#16281c');
    g.addColorStop(1, '#0c1710');
    ctx.fillStyle = g;
    ctx.fillRect(0, hz, W, H - hz);
  }

  drawRoad() {
    const { ctx } = this;
    const near = 2.0;
    const far = 150;
    const seg = 2;
    for (let z = far; z > near; z -= seg) {
      const z0 = z - seg;
      const z1 = z;
      const y0 = this.groundYAt(z0);
      const y1 = this.groundYAt(z1);
      const x0l = this.xAt(-ROAD_HALF, z0);
      const x0r = this.xAt(ROAD_HALF, z0);
      const x1l = this.xAt(-ROAD_HALF, z1);
      const x1r = this.xAt(ROAD_HALF, z1);
      const zm = (z0 + z1) / 2 + this.d; // absolute for pattern continuity
      const f = this.fogF(z);

      // is this segment inside a gap?
      const abs0 = this.d + z0;
      const abs1 = this.d + z1;
      const gap = this.gaps.find((g) => abs1 > g.z && abs0 < g.z + g.len);

      ctx.beginPath();
      ctx.moveTo(x0l, y0);
      ctx.lineTo(x0r, y0);
      ctx.lineTo(x1r, y1);
      ctx.lineTo(x1l, y1);
      ctx.closePath();
      if (gap) {
        // pit
        ctx.fillStyle = mixc('#151016', '#050308', 1 - f);
        ctx.fill();
        // inner depth glow
        ctx.fillStyle = `rgba(255,90,40,${0.05 * (1 - f)})`;
        ctx.fill();
        continue;
      }

      const base = Math.floor(zm / seg) % 2 === 0 ? '#5b4a6e' : '#55446a';
      ctx.fillStyle = mixc(base, FOG, f);
      ctx.fill();

      // seams every 8m
      if (Math.floor(zm / 8) !== Math.floor((zm + seg) / 8)) {
        ctx.fillStyle = `rgba(30,20,40,${0.35 * (1 - f)})`;
        ctx.fill();
      }

      // gold edge strips
      const ew = 0.16;
      for (const s of [-1, 1]) {
        const ex0a = this.xAt(s * ROAD_HALF, z0);
        const ex0b = this.xAt(s * (ROAD_HALF + ew), z0);
        const ex1a = this.xAt(s * ROAD_HALF, z1);
        const ex1b = this.xAt(s * (ROAD_HALF + ew), z1);
        ctx.beginPath();
        ctx.moveTo(ex0a, y0);
        ctx.lineTo(ex0b, y0);
        ctx.lineTo(ex1b, y1);
        ctx.lineTo(ex1a, y1);
        ctx.closePath();
        const eg = Math.floor(zm / seg) % 2 === 0 ? '#b98a45' : '#a97c3c';
        ctx.fillStyle = mixc(eg, FOG, f);
        ctx.fill();
      }
    }
    // broken slab edges at gap borders
    for (const g of this.gaps) {
      for (const edgeAbs of [g.z, g.z + g.len]) {
        const zRel = edgeAbs - this.d;
        if (zRel < 2 || zRel > 150) continue;
        const y = this.groundYAt(zRel);
        const hl = ROAD_HALF * this.pxu(zRel);
        const cx = this.xAt(0, zRel);
        const th = Math.max(2, this.pxu(zRel) * 0.28);
        ctx.fillStyle = mixc('#6b597c', FOG, this.fogF(zRel));
        ctx.beginPath();
        ctx.moveTo(cx - hl, y);
        ctx.lineTo(cx - hl * 0.6, y - th * (edgeAbs === g.z ? 0.4 : -0.4) - th * 0.3);
        ctx.lineTo(cx - hl * 0.2, y - th * 0.15);
        ctx.lineTo(cx + hl * 0.3, y - th * 0.45);
        ctx.lineTo(cx + hl * 0.7, y - th * 0.2);
        ctx.lineTo(cx + hl, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawWorldObjects() {
    const drawables = [];
    for (const s of this.sides) {
      const zr = s.z - this.d;
      if (zr < 1.6 || zr > 165) continue;
      drawables.push({ z: zr, fn: () => this.drawSide(s, zr) });
    }
    for (const o of this.objs) {
      const zr = o.z - this.d;
      if (zr < 1.6 || zr > 165 || o.taken) continue;
      drawables.push({ z: zr, fn: () => this.drawTrackObj(o, zr) });
    }
    drawables.sort((a, b) => b.z - a.z);
    for (const d of drawables) d.fn();
  }

  drawSide(s, zr) {
    const { ctx } = this;
    const f = this.fogF(zr);
    const u = this.pxu(zr);
    const x = this.xAt(s.side * (ROAD_HALF + 0.5 + s.xOff), zr);
    const gy = this.groundYAt(zr);
    const wob = Math.sin(this.t * 1.4 + s.seed) * 0.03;

    if (s.kind === 'palm') {
      const h = (2.6 + (s.seed % 1.4)) * u;
      const lean = Math.sin(s.seed) * 0.35 + wob;
      const trunk = '#4a3524';
      const leaf = mixc('#2c6b3f', FOG, f);
      const leaf2 = mixc('#3d8a52', FOG, f);
      ctx.strokeStyle = mixc(trunk, FOG, f);
      ctx.lineWidth = Math.max(1.5, 0.16 * u);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.quadraticCurveTo(x + lean * h * 0.4, gy - h * 0.6, x + lean * h * 0.75, gy - h);
      ctx.stroke();
      const topX = x + lean * h * 0.75;
      const topY = gy - h;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + s.seed + wob * 2;
        const len = h * 0.42;
        const ex = topX + Math.cos(a) * len;
        const ey = topY + Math.sin(a) * len * 0.35 + h * 0.12;
        ctx.strokeStyle = i % 2 ? leaf : leaf2;
        ctx.lineWidth = Math.max(1.5, 0.09 * u);
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.6, topY - len * 0.18, ex, ey);
        ctx.stroke();
      }
      ctx.fillStyle = mixc('#5a4028', FOG, f);
      ctx.beginPath();
      ctx.arc(topX - u * 0.06, topY + u * 0.04, Math.max(1, u * 0.07), 0, Math.PI * 2);
      ctx.arc(topX + u * 0.07, topY + u * 0.05, Math.max(1, u * 0.07), 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'bush') {
      const r = (0.5 + (s.seed % 0.5)) * u;
      const c1 = mixc('#20492e', FOG, f);
      const c2 = mixc('#2f6b40', FOG, f);
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.arc(x - r * 0.6, gy - r * 0.4, r * 0.75, 0, Math.PI * 2);
      ctx.arc(x + r * 0.6, gy - r * 0.35, r * 0.7, 0, Math.PI * 2);
      ctx.arc(x, gy - r * 0.8, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.arc(x - r * 0.2, gy - r * 0.9, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'torch') {
      const h = 1.5 * u;
      ctx.strokeStyle = mixc('#53381f', FOG, f);
      ctx.lineWidth = Math.max(1.5, 0.1 * u);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy - h);
      ctx.stroke();
      ctx.fillStyle = mixc('#33241a', FOG, f);
      ctx.beginPath();
      ctx.ellipse(x, gy - h, 0.14 * u, 0.07 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      const flick = 1 + Math.sin(this.t * 13 + s.seed * 7) * 0.18;
      const fr = 0.22 * u * flick;
      // glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(x, gy - h - fr * 0.4, 0, x, gy - h - fr * 0.4, fr * 6);
      gg.addColorStop(0, `rgba(255,170,70,${0.5 * (1 - f)})`);
      gg.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - fr * 6, gy - h - fr * 6, fr * 12, fr * 12);
      ctx.fillStyle = `rgba(255,150,50,${0.95 * (1 - f * 0.6)})`;
      ctx.beginPath();
      ctx.ellipse(x, gy - h - fr * 0.4, fr * 0.6, fr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,220,120,${0.95 * (1 - f * 0.5)})`;
      ctx.beginPath();
      ctx.ellipse(x, gy - h - fr * 0.35, fr * 0.3, fr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // light pool
      ctx.fillStyle = `rgba(255,160,70,${0.1 * (1 - f)})`;
      ctx.beginPath();
      ctx.ellipse(x, gy, 0.8 * u, 0.2 * u, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'pillar') {
      const w = 0.5 * u;
      const h = (1.8 + (s.seed % 1.6)) * u;
      const c = mixc('#7a6c84', FOG, f);
      const cd = mixc('#5d5170', FOG, f);
      ctx.fillStyle = cd;
      roundedPath(ctx, x - w / 2 - w * 0.15, gy - 0.24 * u, w * 1.3, 0.26 * u, 3);
      ctx.fill();
      ctx.fillStyle = c;
      ctx.fillRect(x - w / 2, gy - h, w, h - 0.2 * u);
      ctx.fillStyle = cd;
      ctx.fillRect(x - w / 2, gy - h * 0.55, w, Math.max(1, 0.05 * u));
      ctx.fillRect(x - w / 2, gy - h * 0.85, w, Math.max(1, 0.05 * u));
      // broken tilted cap
      ctx.save();
      ctx.translate(x, gy - h);
      ctx.rotate(Math.sin(s.seed) * 0.2);
      ctx.fillRect(-w * 0.62, -0.16 * u, w * 1.24, 0.16 * u);
      ctx.restore();
      // vine
      ctx.strokeStyle = mixc('#2f6b40', FOG, f);
      ctx.lineWidth = Math.max(1, 0.045 * u);
      ctx.beginPath();
      ctx.moveTo(x - w * 0.3, gy);
      ctx.quadraticCurveTo(x + w * 0.5, gy - h * 0.4, x - w * 0.2, gy - h * 0.8);
      ctx.stroke();
    } else {
      // ruin rock
      const r = 0.55 * u;
      const c = mixc('#6f6579', FOG, f);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x - r, gy);
      ctx.lineTo(x - r * 0.7, gy - r * 1.1);
      ctx.lineTo(x + r * 0.1, gy - r * 1.35);
      ctx.lineTo(x + r * 0.8, gy - r * 0.8);
      ctx.lineTo(x + r, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(x + r * 0.1, gy - r * 1.35);
      ctx.lineTo(x + r * 0.8, gy - r * 0.8);
      ctx.lineTo(x + r, gy);
      ctx.lineTo(x + r * 0.2, gy);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawTrackObj(o, zr) {
    const { ctx } = this;
    const f = this.fogF(zr);
    const u = this.pxu(zr);
    const x = this.xAt(o.laneF * LANE_WX, zr);
    const gy = this.groundYAt(zr);

    if (o.kind === 'coin') {
      const wy = o.wy ?? 0.45;
      const y = gy - wy * u;
      const r = Math.max(1.5, 0.2 * u);
      const spin = Math.abs(Math.cos(this.t * 3.5 + o.z * 0.7));
      const rx = Math.max(r * 0.18, r * spin);
      ctx.save();
      ctx.translate(x, y + Math.sin(this.t * 2 + o.z) * r * 0.08);
      const g = ctx.createRadialGradient(-rx * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      g.addColorStop(0, mixc('#ffe9a3', FOG, f));
      g.addColorStop(0.6, mixc('#f2b93c', FOG, f));
      g.addColorStop(1, mixc('#c07f1d', FOG, f));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = mixc('#9a6412', FOG, f);
      ctx.lineWidth = Math.max(0.8, r * 0.1);
      ctx.stroke();
      // square hole
      ctx.fillStyle = mixc('#7c4f10', FOG, f);
      const hs = r * 0.32;
      ctx.fillRect(-hs * (rx / r), -hs, hs * 2 * (rx / r), hs * 2);
      ctx.restore();
      return;
    }

    if (o.kind === 'orb') {
      const y = gy - 0.9 * u;
      const r = Math.max(2, 0.34 * u) * (1 + Math.sin(this.t * 4 + o.z) * 0.08);
      const col = o.orb === 'magnet' ? '#5ce1ff' : '#7dffb2';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
      gg.addColorStop(0, o.orb === 'magnet' ? 'rgba(92,225,255,0.55)' : 'rgba(125,255,178,0.55)');
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
      ctx.restore();
      ctx.strokeStyle = mixc(col, FOG, f * 0.5);
      ctx.lineWidth = Math.max(1.5, 0.05 * u);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      // glyph
      ctx.lineWidth = Math.max(1.5, 0.07 * u);
      ctx.beginPath();
      if (o.orb === 'magnet') {
        ctx.arc(x, y - r * 0.05, r * 0.42, Math.PI * 1.05, Math.PI * -0.05, false);
        ctx.moveTo(x - r * 0.42, y - r * 0.05);
        ctx.lineTo(x - r * 0.42, y + r * 0.34);
        ctx.moveTo(x + r * 0.42, y - r * 0.05);
        ctx.lineTo(x + r * 0.42, y + r * 0.34);
      } else {
        ctx.moveTo(x, y - r * 0.45);
        ctx.lineTo(x + r * 0.4, y - r * 0.22);
        ctx.lineTo(x + r * 0.34, y + r * 0.18);
        ctx.lineTo(x, y + r * 0.48);
        ctx.lineTo(x - r * 0.34, y + r * 0.18);
        ctx.lineTo(x - r * 0.4, y - r * 0.22);
        ctx.closePath();
      }
      ctx.stroke();
      return;
    }

    if (o.kind === 'rock') {
      const w = 0.85 * LANE_WX * u;
      const h = 0.95 * u;
      const base = mixc('#6f637c', FOG, f);
      const dark = mixc('#4d4358', FOG, f);
      const moss = mixc('#3f7c4e', FOG, f);
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.55, gy);
      ctx.lineTo(x - w * 0.5, gy - h * 0.72);
      ctx.lineTo(x - w * 0.18, gy - h);
      ctx.lineTo(x + w * 0.32, gy - h * 0.88);
      ctx.lineTo(x + w * 0.55, gy - h * 0.5);
      ctx.lineTo(x + w * 0.55, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.18, gy - h);
      ctx.lineTo(x + w * 0.32, gy - h * 0.88);
      ctx.lineTo(x + w * 0.55, gy - h * 0.5);
      ctx.lineTo(x + w * 0.55, gy);
      ctx.lineTo(x + w * 0.1, gy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,14,30,0.35)';
      ctx.lineWidth = Math.max(0.8, 0.02 * u);
      ctx.beginPath();
      ctx.moveTo(x - w * 0.3, gy - h * 0.55);
      ctx.lineTo(x - w * 0.05, gy - h * 0.3);
      ctx.moveTo(x + w * 0.15, gy - h * 0.65);
      ctx.lineTo(x + w * 0.3, gy - h * 0.3);
      ctx.stroke();
      ctx.fillStyle = moss;
      ctx.beginPath();
      ctx.ellipse(x - w * 0.1, gy - h * 0.94, w * 0.22, h * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (o.kind === 'wall') {
      const w = 0.95 * LANE_WX * u;
      const h = 2.5 * u;
      const base = mixc('#77687f', FOG, f);
      const dark = mixc('#554a63', FOG, f);
      const line = mixc('#3c3348', FOG, f);
      // front
      ctx.fillStyle = base;
      ctx.fillRect(x - w / 2, gy - h, w, h);
      // top face
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, gy - h);
      ctx.lineTo(x - w / 2 + w * 0.14, gy - h - 0.14 * u);
      ctx.lineTo(x + w / 2 + w * 0.14, gy - h - 0.14 * u);
      ctx.lineTo(x + w / 2, gy - h);
      ctx.closePath();
      ctx.fill();
      // block seams
      ctx.strokeStyle = line;
      ctx.lineWidth = Math.max(0.8, 0.025 * u);
      ctx.beginPath();
      for (const fy of [0.33, 0.66]) {
        ctx.moveTo(x - w / 2, gy - h * fy);
        ctx.lineTo(x + w / 2, gy - h * fy);
      }
      ctx.moveTo(x, gy - h * 0.33);
      ctx.lineTo(x, gy - h * 0.66);
      ctx.moveTo(x - w * 0.22, gy);
      ctx.lineTo(x - w * 0.22, gy - h * 0.33);
      ctx.moveTo(x + w * 0.22, gy - h * 0.66);
      ctx.lineTo(x + w * 0.22, gy - h);
      ctx.stroke();
      // grass cap
      ctx.fillStyle = mixc('#2f6b40', FOG, f);
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + w * 0.14, gy - h - 0.14 * u);
      ctx.lineTo(x + w / 2 + w * 0.14, gy - h - 0.14 * u);
      ctx.lineTo(x + w / 2, gy - h);
      ctx.lineTo(x - w / 2, gy - h);
      ctx.closePath();
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    if (o.kind === 'branch') {
      const w = ROAD_HALF * 2 * u * 1.06;
      const cx = this.xAt(0, zr);
      const yTop = gy - 1.72 * u;
      const yBot = gy - 1.08 * u;
      const wood = mixc('#5b3d22', FOG, f);
      const woodD = mixc('#402914', FOG, f);
      const leaf = mixc('#2c6b3f', FOG, f);
      ctx.strokeStyle = woodD;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, yBot - yTop);
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, (yTop + yBot) / 2 + Math.sin(this.t * 1.2) * u * 0.02);
      ctx.quadraticCurveTo(cx, (yTop + yBot) / 2 - u * 0.12, cx + w / 2, (yTop + yBot) / 2);
      ctx.stroke();
      ctx.strokeStyle = wood;
      ctx.lineWidth = Math.max(1.5, (yBot - yTop) * 0.55);
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, (yTop + yBot) / 2 - u * 0.03);
      ctx.quadraticCurveTo(cx, (yTop + yBot) / 2 - u * 0.15, cx + w / 2, (yTop + yBot) / 2 - u * 0.03);
      ctx.stroke();
      // leaf clusters hanging
      ctx.fillStyle = leaf;
      for (let i = 0; i < 5; i++) {
        const lx = cx - w / 2 + (i / 4) * w;
        const ly = yBot - u * (0.05 + 0.08 * Math.sin(i * 9 + o.z));
        ctx.beginPath();
        ctx.arc(lx, ly, Math.max(1.5, 0.16 * u), 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
  }

  drawPlayerChar() {
    const { ctx, H } = this;
    const ground = this.groundYAt(PLAYER_Z);
    const charH = Math.max(130, Math.min(H * 0.24, 1.12 * this.pxu(PLAYER_Z)));
    const airH = this.state === 'dying' && this.deathKind === 'gap' ? this.fallY : this.y;
    drawPlayer(ctx, {
      x: this.playerScreenX(),
      groundY: ground,
      h: this.fallY < -3 ? 0 : charH,
      runPhase: this.runPhase,
      airH,
      sliding: this.slideT > 0,
      dead: this.state === 'dying' && this.deathKind === 'rock',
      tumble: this.deadTumble,
      skin: this.skin,
      shield: this.shieldOn && this.state === 'running',
      magnet: this.magnetT > 0 && this.state === 'running',
      t: this.t,
    });
  }

  drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  drawBoostFX() {
    const { ctx, W, H } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      const y = (i / 12) * H + ((this.t * 900) % (H / 12));
      const x0 = side > 0 ? W : 0;
      const len = W * 0.16;
      const alpha = 0.12 + (i % 3) * 0.04;
      ctx.strokeStyle = `rgba(255,214,140,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 - side * len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawVignette() {
    const { ctx, W, H } = this;
    const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.95);
    g.addColorStop(0, 'rgba(8,4,16,0)');
    g.addColorStop(1, 'rgba(8,4,16,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}
