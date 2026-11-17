// Enemy ships: five kinds plus a boss, each with its own movement and attack.
import { ENEMIES, VIEW } from './config.js';

let nextId = 1;

export class Enemy {
  constructor(type, x, y, wave, rng, elite = false) {
    const def = ENEMIES[type];
    this.id = nextId++;
    this.type = type;
    this.def = def;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.elite = elite;
    this.boss = type === 'boss';
    const hpScale = 1 + (wave - 1) * 0.12;
    const speedScale = 1 + Math.min(0.5, (wave - 1) * 0.03);
    this.maxHp = Math.round(def.hp * hpScale * (elite ? 4 : 1) * (this.boss ? 1 + wave * 0.06 : 1));
    this.hp = this.maxHp;
    this.radius = def.radius * (elite ? 1.35 : 1);
    this.speed = def.speed * speedScale * (elite ? 1.1 : 1);
    this.score = def.score * (elite ? 3 : 1);
    this.damage = def.damage + (elite ? 4 : 0);
    this.color = def.color;
    this.shape = def.shape;
    this.t = rng.range(0, Math.PI * 2);
    this.shootTimer = rng.range(1.2, 2.4);
    this.burstTimer = 3;
    this.spiralTimer = 1.2;
    this.spiralAngle = 0;
    this.flash = 0;
    this.angle = 0;
  }

  update(dt, world) {
    const p = world.player;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    this.angle = Math.atan2(dy, dx);

    if (this.type === 'chaser' || this.type === 'mini') {
      this.vx += nx * this.speed * 3 * dt;
      this.vy += ny * this.speed * 3 * dt;
    } else if (this.type === 'weaver') {
      const px = -ny;
      const py = nx;
      const sway = Math.sin(this.t * 3.2) * 0.9;
      this.vx += (nx + px * sway) * this.speed * 3 * dt;
      this.vy += (ny + py * sway) * this.speed * 3 * dt;
    } else if (this.type === 'shooter') {
      // Hold a ring around the player and strafe.
      const want = 260;
      const toward = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
      const strafe = Math.sin(this.t * 1.4) > 0 ? 1 : -1;
      this.vx += (nx * toward + -ny * strafe * 0.7) * this.speed * 3 * dt;
      this.vy += (ny * toward + nx * strafe * 0.7) * this.speed * 3 * dt;
      this.shootTimer -= dt;
      if (this.shootTimer <= 0 && dist < 560 && p.alive) {
        this.shootTimer = 2.2;
        world.spawnOrb(this.x, this.y, nx * 210, ny * 210, this.damage);
        world.effects.burst(this.x, this.y, this.color, 4, 90, 0.25, 2);
      }
    } else if (this.type === 'splitter') {
      this.vx += nx * this.speed * 2.4 * dt;
      this.vy += ny * this.speed * 2.4 * dt;
    } else if (this.type === 'boss') {
      const enraged = this.hp < this.maxHp * 0.5;
      const sp = this.speed * (enraged ? 1.5 : 1);
      this.vx += nx * sp * 2.2 * dt;
      this.vy += ny * sp * 2.2 * dt;
      this.burstTimer -= dt;
      if (this.burstTimer <= 0 && p.alive) {
        this.burstTimer = enraged ? 2.4 : 3.2;
        const count = 12;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + this.t;
          world.spawnOrb(this.x, this.y, Math.cos(a) * 170, Math.sin(a) * 170, this.damage);
        }
        world.effects.ring(this.x, this.y, this.color, this.radius + 60, 0.5);
        world.audio.bossAlarm();
      }
      this.spiralTimer -= dt;
      if (this.spiralTimer <= 0 && p.alive) {
        this.spiralTimer = enraged ? 0.9 : 1.4;
        for (let k = 0; k < 3; k++) {
          const a = this.spiralAngle + k * 0.35;
          world.spawnOrb(this.x, this.y, Math.cos(a) * 240, Math.sin(a) * 240, this.damage);
        }
        this.spiralAngle += 0.7;
      }
    }

    // Soft steering cap so enemies do not accelerate forever.
    const spd = Math.hypot(this.vx, this.vy);
    const max = this.speed * 1.6;
    if (spd > max) {
      this.vx = (this.vx / spd) * max;
      this.vy = (this.vy / spd) * max;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Keep bosses and shooters inside the arena; others may drift in from outside.
    if (this.boss || this.type === 'shooter') {
      const m = this.radius + 4;
      this.x = Math.max(m, Math.min(VIEW.w - m, this.x));
      this.y = Math.max(m, Math.min(VIEW.h - m, this.y));
    }

    // Gentle separation so enemies do not stack on one point.
    for (const other of world.enemies) {
      if (other === this) continue;
      const ox = this.x - other.x;
      const oy = this.y - other.y;
      const d = Math.hypot(ox, oy);
      const min = this.radius + other.radius;
      if (d > 0 && d < min) {
        const push = ((min - d) / min) * 60 * dt;
        this.x += (ox / d) * push;
        this.y += (oy / d) * push;
      }
    }
  }

  hit(damage, world) {
    this.hp -= damage;
    this.flash = 0.08;
    if (this.hp <= 0) {
      world.killEnemy(this);
      return true;
    }
    return false;
  }
}

export function spawnEnemyAtEdge(type, wave, rng, world, elite = false) {
  const m = 30;
  const side = rng.int(0, 3);
  let x;
  let y;
  if (side === 0) { x = rng.range(0, VIEW.w); y = -m; }
  else if (side === 1) { x = VIEW.w + m; y = rng.range(0, VIEW.h); }
  else if (side === 2) { x = rng.range(0, VIEW.w); y = VIEW.h + m; }
  else { x = -m; y = rng.range(0, VIEW.h); }
  return new Enemy(type, x, y, wave, rng, elite);
}
