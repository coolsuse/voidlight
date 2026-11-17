// Projectiles and pickups: player bullets, enemy orbs, and score shards.
import { PLAYER } from './config.js';

export class Projectile {
  constructor(x, y, vx, vy, damage, pierce, friendly) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.pierce = pierce;
    this.friendly = friendly;
    this.radius = friendly ? PLAYER.bulletRadius : 7;
    this.life = friendly ? PLAYER.bulletLife : 6;
    this.color = friendly ? '#8ef4ff' : '#ff5ce1';
    this.hitIds = new Set();
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  get dead() {
    return (
      this.life <= 0 ||
      this.x < -40 || this.x > 1320 ||
      this.y < -40 || this.y > 760
    );
  }
}

export class Shard {
  constructor(x, y, value, rng) {
    this.x = x;
    this.y = y;
    const a = rng.range(0, Math.PI * 2);
    const v = rng.range(40, 160);
    this.vx = Math.cos(a) * v;
    this.vy = Math.sin(a) * v;
    this.value = value;
    this.t = rng.range(0, Math.PI * 2);
    this.radius = 6;
    this.life = 14;
  }

  update(dt, world) {
    this.t += dt * 5;
    this.life -= dt;
    const p = world.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (p.alive && dist < p.magnet) {
      const pull = 900 * (1 - dist / (p.magnet + 60));
      this.vx += (dx / dist) * pull * dt;
      this.vy += (dy / dist) * pull * dt;
    } else {
      const damp = Math.exp(-2.5 * dt);
      this.vx *= damp;
      this.vy *= damp;
    }
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 620) {
      this.vx = (this.vx / spd) * 620;
      this.vy = (this.vy / spd) * 620;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (p.alive && dist < p.radius + 12) {
      world.collectShard(this);
      return true;
    }
    return this.life <= 0;
  }
}
