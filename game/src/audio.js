// All sound is synthesized with WebAudio: no audio files, no network.
// The context is created on the first user gesture, as browsers require.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextNoteTime = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    } catch (err) {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  tone({ type = 'sine', from = 440, to = null, dur = 0.15, vol = 0.2, when = 0, dest = null }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(dest || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.2, vol = 0.25, from = 1200, to = 200, when = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot() {
    this.tone({ type: 'square', from: 920, to: 420, dur: 0.07, vol: 0.08 });
  }

  enemyHit() {
    this.noise({ dur: 0.05, vol: 0.1, from: 2600, to: 900 });
  }

  enemyDie() {
    this.noise({ dur: 0.28, vol: 0.22, from: 1400, to: 120 });
    this.tone({ type: 'sine', from: 210, to: 42, dur: 0.28, vol: 0.22 });
  }

  playerHit() {
    this.tone({ type: 'sawtooth', from: 170, to: 55, dur: 0.25, vol: 0.28 });
    this.noise({ dur: 0.18, vol: 0.2, from: 900, to: 150 });
  }

  dash() {
    this.noise({ dur: 0.16, vol: 0.12, from: 3200, to: 500 });
  }

  pickup() {
    this.tone({ type: 'sine', from: 660, to: 990, dur: 0.09, vol: 0.1 });
  }

  heal() {
    this.tone({ type: 'sine', from: 523, to: 784, dur: 0.18, vol: 0.12 });
  }

  upgrade() {
    this.tone({ type: 'triangle', from: 523, dur: 0.12, vol: 0.16 });
    this.tone({ type: 'triangle', from: 659, dur: 0.12, vol: 0.16, when: 0.09 });
    this.tone({ type: 'triangle', from: 784, dur: 0.2, vol: 0.18, when: 0.18 });
  }

  waveClear() {
    this.tone({ type: 'triangle', from: 392, dur: 0.12, vol: 0.14 });
    this.tone({ type: 'triangle', from: 523, dur: 0.12, vol: 0.14, when: 0.1 });
    this.tone({ type: 'triangle', from: 659, dur: 0.22, vol: 0.16, when: 0.2 });
  }

  bossAlarm() {
    this.tone({ type: 'sawtooth', from: 110, to: 220, dur: 0.5, vol: 0.16 });
    this.tone({ type: 'sawtooth', from: 110, to: 220, dur: 0.5, vol: 0.16, when: 0.55 });
  }

  gameOver() {
    this.tone({ type: 'sawtooth', from: 220, to: 55, dur: 0.9, vol: 0.2 });
    this.tone({ type: 'sine', from: 440, to: 110, dur: 0.9, vol: 0.12, when: 0.1 });
  }

  uiClick() {
    this.tone({ type: 'sine', from: 740, to: 880, dur: 0.06, vol: 0.1 });
  }

  // A quiet procedural loop: minor-key bassline, hats, and a slow pad.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.musicStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    const bassNotes = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
    const stepDur = 0.23;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
        const step = this.musicStep % 16;
        const when = this.nextNoteTime - this.ctx.currentTime;
        if (step % 2 === 0) {
          const note = bassNotes[(step / 2) % 8];
          this.tone({ type: 'triangle', from: note, dur: stepDur * 1.8, vol: 0.32, when, dest: this.musicGain });
        }
        if (step % 4 === 2) {
          this.noise({ dur: 0.03, vol: 0.05, from: 6000, to: 4000, when });
        }
        if (step === 0) {
          this.tone({ type: 'sine', from: 220, dur: 1.8, vol: 0.05, when, dest: this.musicGain });
          this.tone({ type: 'sine', from: 261.63, dur: 1.8, vol: 0.04, when, dest: this.musicGain });
        }
        this.musicStep += 1;
        this.nextNoteTime += stepDur;
      }
    }, 100);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
