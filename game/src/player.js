// The player's ship: movement, aiming, firing, dashing, and damage.
import { PLAYER, VIEW } from './config.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = VIEW.w / 2;
    this.y = VIEW.h / 2;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = PLAYER.radius;
    this.hp = PLAYER.maxHp;
    this.maxHp = PLAYER.maxHp;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirX = 0;
    this.dashDirY = -1;
    this.invuln = 0;
    this.flash = 0;
    this.alive = true;
    // Upgradeable stats.
    this.damage = PLAYER.damage;
    this.fireInterval = PLAYER.fireInterval;
    this.projectiles = PLAYER.projectiles;
    this.bulletSpeed = PLAYER.bulletSpeed;
    this.pierce = PLAYER.pierce;
    this.magnet = PLAYER.magnet;
    this.speed = PLAYER.speed;
    this.shield = false;
    this.hasAegis = false;
    this.shieldCooldown = 0;
    this.shieldRecharge = 12;
    this.trailTimer = 0;
  }

  get dashReady() {
    return this.dashCooldown <= 0;
  }

  update(dt, input, world) {
    if (!this.alive) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.hasAegis && !this.shield) {
      this.shieldCooldown -= dt;
      if (this.shieldCooldown <= 0) {
        this.shield = true;
      }
    }

    // Aim at the mouse.
    this.angle = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);

    const move = input.moveVector();
    const wantDash =
      input.pressed('Space') || input.pressed('ShiftLeft') || input.pressed('ShiftRight') ||
      input.pressedRightClick();
    if (wantDash && this.dashReady) {
      this.startDash(move);
      world.audio.dash();
      world.effects.ring(this.x, this.y, '#2ee6ff', 70, 0.35);
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDirX * PLAYER.dashSpeed;
      this.vy = this.dashDirY * PLAYER.dashSpeed;
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.02;
        world.effects.trail(this.x, this.y, '#2ee6ff', 6);
      }
    } else {
      this.vx += move.x * PLAYER.accel * dt;
      this.vy += move.y * PLAYER.accel * dt;
      const damp = Math.exp(-PLAYER.friction * dt);
      this.vx *= damp;
      this.vy *= damp;
      const spd = Math.hypot(this.vx, this.vy);
      const max = this.speed;
      if (spd > max) {
        this.vx = (this.vx / spd) * max;
        this.vy = (this.vy / spd) * max;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const m = this.radius + 6;
    if (this.x < m) { this.x = m; this.vx = Math.max(0, this.vx); }
    if (this.x > VIEW.w - m) { this.x = VIEW.w - m; this.vx = Math.min(0, this.vx); }
    if (this.y < m) { this.y = m; this.vy = Math.max(0, this.vy); }
    if (this.y > VIEW.h - m) { this.y = VIEW.h - m; this.vy = Math.min(0, this.vy); }

    // Fire while the mouse button is held.
    this.fireTimer -= dt;
    if (input.mouse.down && this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval;
      this.fire(world);
    }
  }

  startDash(move) {
    let dx = move.x;
    let dy = move.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.angle);
      dy = Math.sin(this.angle);
    }
    const len = Math.hypot(dx, dy) || 1;
    this.dashDirX = dx / len;
    this.dashDirY = dy / len;
    this.dashTimer = PLAYER.dashTime;
    this.dashCooldown = PLAYER.dashCooldown * this.dashCooldownFactor;
    this.invuln = Math.max(this.invuln, PLAYER.dashInvuln);
  }

  get dashCooldownFactor() {
    return this._dashCdFactor ?? 1;
  }

  set dashCooldownFactor(v) {
    this._dashCdFactor = v;
  }

  fire(world) {
    const n = this.projectiles;
    const spread = 0.12;
    for (let i = 0; i < n; i++) {
      const offset = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
      const a = this.angle + offset;
      const px = this.x + Math.cos(this.angle) * (this.radius + 8);
      const py = this.y + Math.sin(this.angle) * (this.radius + 8);
      world.spawnBullet(px, py, Math.cos(a) * this.bulletSpeed, Math.sin(a) * this.bulletSpeed, this.damage, this.pierce);
    }
    world.audio.shoot();
    world.effects.burst(
      this.x + Math.cos(this.angle) * (this.radius + 10),
      this.y + Math.sin(this.angle) * (this.radius + 10),
      '#8ef4ff', 3, 120, 0.15, 2,
    );
    // A touch of recoil so the gun feels alive.
    this.vx -= Math.cos(this.angle) * 14;
    this.vy -= Math.sin(this.angle) * 14;
  }

  takeDamage(amount, world) {
    if (!this.alive || this.invuln > 0 || this.dashTimer > 0) return false;
    if (this.shield) {
      this.shield = false;
      this.shieldCooldown = this.shieldRecharge;
      this.invuln = 0.6;
      world.effects.ring(this.x, this.y, '#5dffa0', 90, 0.4);
      world.effects.floatText(this.x, this.y - 30, 'SHIELD DOWN', '#5dffa0', 15);
      world.audio.enemyHit();
      return false;
    }
    this.hp -= amount;
    this.flash = 0.25;
    this.invuln = PLAYER.hitInvuln;
    world.effects.shake(0.55);
    world.effects.burst(this.x, this.y, '#ff4d6d', 18, 260, 0.5, 3);
    world.audio.playerHit();
    world.resetCombo();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      world.effects.burst(this.x, this.y, '#2ee6ff', 60, 420, 1.0, 4);
      world.effects.burst(this.x, this.y, '#ffffff', 30, 300, 0.8, 3);
      world.effects.ring(this.x, this.y, '#2ee6ff', 260, 0.8);
      world.effects.shake(1);
      world.audio.gameOver();
    }
    return true;
  }

  heal(amount) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
