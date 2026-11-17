// Particles, shockwaves, floating score text, and screen shake.
// One Effects instance lives on the World and every system feeds it.
export class Effects {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.texts = [];
    this.trauma = 0;
  }

  burst(x, y, color, count, speed, life = 0.6, size = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 3.2,
      });
    }
    if (this.particles.length > 700) {
      this.particles.splice(0, this.particles.length - 700);
    }
  }

  trail(x, y, color, size = 4) {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 0.3, maxLife: 0.3,
      size, color, drag: 0,
    });
  }

  ring(x, y, color, maxRadius = 120, life = 0.5) {
    this.rings.push({ x, y, color, radius: 8, maxRadius, life, maxLife: life });
  }

  floatText(x, y, text, color = '#dfe9ff', size = 15) {
    this.texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
  }

  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  shakeOffset() {
    const s = this.trauma * this.trauma * 14;
    return {
      x: (Math.random() * 2 - 1) * s,
      y: (Math.random() * 2 - 1) * s,
    };
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const d = 1 - p.drag * dt;
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const t = 1 - r.life / r.maxLife;
      r.radius = 8 + (r.maxRadius - 8) * (1 - (1 - t) * (1 - t));
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = t.color;
      ctx.font = `700 ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
