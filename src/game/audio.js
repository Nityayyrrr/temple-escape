/* Procedural audio: all SFX + tribal drum loop are synthesized with WebAudio. */

export class SoundEngine {
  ctx = null;
  master = null;
  musicGain = null;
  muted = false;
  musicTimer = null;
  step = 0;
  nextStepTime = 0;

  ensure() {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  resume() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
  }

  get isMuted() {
    return this.muted;
  }

  env(node, gain, a, d, when) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const t = when ?? ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    node.connect(g);
    g.connect(this.master);
  }

  osc(type, freq, gain, dur, sweepTo) {
    const ctx = this.ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + dur);
    this.env(o, gain, 0.008, dur);
    o.start();
    o.stop(ctx.currentTime + dur + 0.05);
  }

  noise(gain, dur, filterFreq, type = 'lowpass') {
    const ctx = this.ensure();
    if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    src.connect(f);
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g);
    g.connect(this.master);
    src.start();
  }

  /* ------------------------------- SFX ---------------------------------- */

  coin(combo = 1) {
    const ctx = this.ensure();
    if (!ctx) return;
    const base = 920 + Math.min(combo, 6) * 60;
    this.osc('sine', base, 0.28, 0.09, base * 1.4);
    window.setTimeout(() => this.osc('sine', base * 1.5, 0.2, 0.12), 45);
  }

  jump() {
    this.noise(0.16, 0.22, 900, 'bandpass');
    this.osc('triangle', 220, 0.12, 0.18, 520);
  }

  slide() {
    this.noise(0.2, 0.3, 420);
  }

  lane() {
    this.noise(0.08, 0.09, 1400, 'bandpass');
  }

  crash() {
    this.noise(0.5, 0.45, 500);
    this.osc('sine', 140, 0.5, 0.4, 40);
    this.osc('square', 90, 0.2, 0.3, 30);
  }

  shieldBreak() {
    this.osc('sawtooth', 800, 0.25, 0.3, 120);
    this.noise(0.25, 0.25, 2400, 'highpass');
  }

  powerup() {
    const seq = [523, 659, 784, 1046];
    seq.forEach((f, i) =>
      window.setTimeout(() => this.osc('triangle', f, 0.22, 0.16), i * 70),
    );
  }

  click() {
    this.osc('square', 660, 0.12, 0.05, 440);
  }

  buy() {
    const seq = [880, 1175, 1568];
    seq.forEach((f, i) =>
      window.setTimeout(() => this.osc('sine', f, 0.2, 0.14), i * 60),
    );
    this.noise(0.06, 0.15, 6000, 'highpass');
  }

  denied() {
    this.osc('square', 200, 0.15, 0.18, 140);
  }

  countdown(final = false) {
    this.osc('sine', final ? 1046 : 660, 0.25, final ? 0.4 : 0.12);
  }

  /* --------------------------- tribal music loop ------------------------- */

  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null) return;
    this.step = 0;
    this.nextStepTime = ctx.currentTime + 0.06;
    const bpm = 128;
    const stepDur = 60 / bpm / 2; // 8th notes
    const penta = [220, 261.6, 293.7, 329.6, 392, 440];
    const melody = [0, -1, 2, -1, 4, -1, 3, -1, 5, 4, 3, 2, 1, -1, 2, -1];

    const tick = () => {
      if (!this.ctx || !this.musicGain) return;
      while (this.nextStepTime < this.ctx.currentTime + 0.12) {
        const s = this.step % 16;
        const t = this.nextStepTime;
        // kick drum
        if (s % 4 === 0 || s === 10) {
          const o = this.ctx.createOscillator();
          o.type = 'sine';
          o.frequency.setValueAtTime(150, t);
          o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.9, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          o.connect(g);
          g.connect(this.musicGain);
          o.start(t);
          o.stop(t + 0.2);
        }
        // shaker
        if (s % 2 === 1) {
          const len = Math.floor(this.ctx.sampleRate * 0.05);
          const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          const f = this.ctx.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = 6500;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(s % 4 === 3 ? 0.22 : 0.1, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          src.connect(f);
          f.connect(g);
          g.connect(this.musicGain);
          src.start(t);
        }
        // log drum melody
        const m = melody[s];
        if (m >= 0 && m < penta.length) {
          const o = this.ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.setValueAtTime(penta[m], t);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.4, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          const fl = this.ctx.createBiquadFilter();
          fl.type = 'lowpass';
          fl.frequency.value = 1400;
          o.connect(fl);
          fl.connect(g);
          g.connect(this.musicGain);
          o.start(t);
          o.stop(t + 0.3);
        }
        this.nextStepTime += stepDur;
        this.step++;
      }
      this.musicTimer = window.setTimeout(tick, 40);
    };
    tick();
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const sound = new SoundEngine();
