class AudioManager {
  constructor() {
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone({ freq = 440, type = "sine", duration = 0.14, gain = 0.06, glideTo = null }) {
    if (!this.ctx) {
      return;
    }
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    }

    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(amp);
    amp.connect(this.ctx.destination);

    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  }

  move() {
    this.playTone({ freq: 330, type: "triangle", duration: 0.12, gain: 0.045, glideTo: 420 });
  }

  capture() {
    this.playTone({ freq: 180, type: "square", duration: 0.18, gain: 0.06, glideTo: 120 });
  }

  check() {
    this.playTone({ freq: 520, type: "sawtooth", duration: 0.16, gain: 0.05, glideTo: 620 });
  }

  checkmate() {
    this.playTone({ freq: 260, type: "sawtooth", duration: 0.32, gain: 0.08, glideTo: 90 });
    setTimeout(() => this.playTone({ freq: 110, type: "triangle", duration: 0.25, gain: 0.06 }), 120);
  }

  error() {
    this.playTone({ freq: 140, type: "square", duration: 0.09, gain: 0.05, glideTo: 100 });
  }
}

window.AudioManager = AudioManager;
