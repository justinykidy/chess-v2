class EffectsManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.shakeMs = 0;
    this.checkGlow = null;
    this.flashMs = 0;
    this.lastTs = performance.now();
    this.animating = false;
  }

  resize(size) {
    this.canvas.width = size;
    this.canvas.height = size;
  }

  startLoop() {
    if (this.animating) {
      return;
    }
    this.animating = true;
    requestAnimationFrame((ts) => this.tick(ts));
  }

  tick(ts) {
    const dt = Math.min(50, ts - this.lastTs);
    this.lastTs = ts;

    this.update(dt);
    this.draw();

    if (this.animating) {
      requestAnimationFrame((t) => this.tick(t));
    }
  }

  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.vy += 420 * (dt / 1000);
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (this.shakeMs > 0) {
      this.shakeMs = Math.max(0, this.shakeMs - dt);
    }
    if (this.checkGlow) {
      this.checkGlow.ms -= dt;
      if (this.checkGlow.ms <= 0) {
        this.checkGlow = null;
      }
    }
    if (this.flashMs > 0) {
      this.flashMs = Math.max(0, this.flashMs - dt);
    }
  }

  draw() {
    const c = this.ctx;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const shakeX = this.shakeMs > 0 ? (Math.random() - 0.5) * 8 : 0;
    const shakeY = this.shakeMs > 0 ? (Math.random() - 0.5) * 8 : 0;

    c.save();
    c.translate(shakeX, shakeY);

    for (const p of this.particles) {
      c.globalAlpha = p.alpha;
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.fill();
    }

    if (this.checkGlow) {
      const g = this.checkGlow;
      const pulse = 0.45 + 0.25 * Math.sin(performance.now() / 95);
      c.globalAlpha = pulse;
      c.strokeStyle = "#ff3e3e";
      c.lineWidth = Math.max(4, g.squareSize * 0.08);
      c.strokeRect(g.x + 2, g.y + 2, g.squareSize - 4, g.squareSize - 4);
    }

    c.restore();

    if (this.flashMs > 0) {
      c.globalAlpha = Math.min(0.6, this.flashMs / 500);
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    c.globalAlpha = 1;
  }

  spawnParticles(x, y, count, colors) {
    for (let i = 0; i < count; i += 1) {
      const speed = 80 + Math.random() * 260;
      const angle = Math.random() * Math.PI * 2;
      const maxLife = 450 + Math.random() * 550;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        r: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: maxLife,
        maxLife,
        alpha: 1,
      });
    }
    this.startLoop();
  }

  capture(x, y) {
    this.shakeMs = 260;
    this.spawnParticles(x, y, 38, ["#f7cc6f", "#f08a5d", "#f76f6f"]);
  }

  check(x, y, squareSize) {
    this.checkGlow = { x, y, squareSize, ms: 1600 };
    this.spawnParticles(x + squareSize / 2, y + squareSize / 2, 18, ["#ff3e3e", "#ffd1d1"]);
  }

  checkmate() {
    const mid = this.canvas.width / 2;
    this.shakeMs = 700;
    this.flashMs = 500;
    this.spawnParticles(mid, mid, 120, ["#ffffff", "#ffb703", "#ef233c", "#8ecae6"]);
  }
}

window.EffectsManager = EffectsManager;
