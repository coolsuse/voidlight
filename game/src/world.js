// The World holds every entity and runs the simulation: spawning, movement,
// collisions, scoring, combos, and wave flow.
import { ENEMIES, PLAYER, VIEW, eliteChance, isBossWave, spawnInterval, waveBudget, waveTable } from './config.js';
import { Enemy, spawnEnemyAtEdge } from './enemies.js';
import { Projectile, Shard } from './projectiles.js';
import { Player } from './player.js';
import { Effects } from './effects.js';
import { AudioEngine } from './audio.js';
import { makeRng } from './random.js';
import { rollUpgrades } from './upgrades.js';

export class World {
  constructor(seed = 1337) {
    this.rng = makeRng(seed);
    this.audio = new AudioEngine();
    this.effects = new Effects();
    this.player = new Player();
    this.enemies = [];
    this.bullets = [];
    this.orbs = [];
    this.shards = [];
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.shardsCollected = 0;
    this.shardHealCount = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.time = 0;
    this.waveCleared = false;
    this.pendingUpgrades = [];
    this.takenUpgrades = {};
    this.bossActive = false;
    try {
      this.best = Number(window.localStorage.getItem('voidlight-best') || 0) || 0;
    } catch (err) {
      this.best = 0;
    }
  }

  get multiplier() {
    return 1 + Math.min(2, Math.floor(this.combo / 10) * 0.5);
  }

  get enemiesLeft() {
    return this.enemies.length + this.spawnQueue.length;
  }

  startRun() {
    this.player.reset();
    this.enemies = [];
    this.bullets = [];
    this.orbs = [];
    this.shards = [];
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.shardsCollected = 0;
    this.shardHealCount = 0;
    this.spawnQueue = [];
    this.waveCleared = false;
    this.pendingUpgrades = [];
    this.takenUpgrades = {};
    this.bossActive = false;
    this.time = 0;
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    this.waveCleared = false;
    const budget = waveBudget(this.wave);
    const table = waveTable(this.wave);
    this.spawnQueue = [];
    for (let i = 0; i < budget; i++) {
      this.spawnQueue.push(this.rng.weighted(table));
    }
    if (isBossWave(this.wave)) {
      this.spawnQueue.unshift('boss');
      this.bossActive = true;
      this.effects.floatText(VIEW.w / 2, 120, 'WARNING — VOIDLEVIATHAN', '#ff2e63', 26);
      this.audio.bossAlarm();
    } else {
      this.bossActive = false;
    }
    // Shuffle the queue so the wave does not arrive in type order.
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
    this.spawnTimer = 0.6;
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem('voidlight-best', String(this.best));
      } catch (err) {
        // Storage may be unavailable; the best score is a nicety, not a need.
      }
    }
  }

  addScore(base, x, y) {
    const gained = Math.round(base * this.multiplier);
    this.score += gained;
    if (x !== undefined) {
      this.effects.floatText(x, y, `+${gained}`, '#dfe9ff', 14);
    }
    return gained;
  }

  resetCombo() {
    this.combo = 0;
    this.comboTimer = 0;
  }

  spawnBullet(x, y, vx, vy, damage, pierce) {
    this.bullets.push(new Projectile(x, y, vx, vy, damage, pierce, true));
  }

  spawnOrb(x, y, vx, vy, damage) {
    this.orbs.push(new Projectile(x, y, vx, vy, damage, 0, false));
  }

  collectShard(shard) {
    this.shardsCollected += 1;
    this.score += shard.value * 10;
    this.audio.pickup();
    if (this.shardsCollected - this.shardHealCount * PLAYER.shardHealEvery >= PLAYER.shardHealEvery) {
      this.shardHealCount += 1;
      this.player.heal(PLAYER.shardHeal);
      this.effects.floatText(this.player.x, this.player.y - 34, `+${PLAYER.shardHeal} HULL`, '#5dffa0', 14);
      this.audio.heal();
    }
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = 3;
    this.addScore(enemy.score, enemy.x, enemy.y - 18);
    const color = enemy.color;
    this.effects.burst(enemy.x, enemy.y, color, enemy.boss ? 70 : 22, enemy.boss ? 420 : 260, 0.7, 3);
    this.effects.ring(enemy.x, enemy.y, color, enemy.boss ? 240 : 60, enemy.boss ? 0.7 : 0.35);
    this.effects.shake(enemy.boss ? 0.9 : 0.18);
    this.audio.enemyDie();
    const shardCount = enemy.def.shards + (enemy.elite ? 4 : 0);
    for (let i = 0; i < shardCount; i++) {
      this.shards.push(new Shard(enemy.x, enemy.y, 1, this.rng));
    }
    if (enemy.type === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const mini = new Enemy('mini', enemy.x + this.rng.range(-14, 14), enemy.y + this.rng.range(-14, 14), this.wave, this.rng);
        this.enemies.push(mini);
      }
    }
    if (enemy.boss) {
      this.bossActive = false;
      this.addScore(500, enemy.x, enemy.y - 40);
      this.effects.floatText(VIEW.w / 2, 200, 'LEVIATHAN DOWN', '#ffd166', 30);
    }
  }

  update(dt, input) {
    this.time += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.player.update(dt, input, this);

    // Trickle enemies in from the queue.
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = spawnInterval(this.wave);
        const type = this.spawnQueue.shift();
        const elite = type !== 'boss' && this.rng.chance(eliteChance(this.wave));
        this.enemies.push(spawnEnemyAtEdge(type, this.wave, this.rng, this, elite));
      }
    }

    for (const e of this.enemies) e.update(dt, this);

    // Bullets vs enemies.
    for (const b of this.bullets) {
      b.update(dt);
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead || b.hitIds.has(e.id)) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + b.radius;
        if (dx * dx + dy * dy < rr * rr) {
          b.hitIds.add(e.id);
          this.effects.burst(b.x, b.y, e.color, 5, 140, 0.25, 2);
          this.audio.enemyHit();
          const died = e.hit(b.damage, this);
          if (!died && b.pierce > 0) {
            b.pierce -= 1;
          } else if (!died) {
            b.life = 0;
          }
          break;
        }
      }
    }

    // Enemy orbs vs the player.
    const p = this.player;
    for (const o of this.orbs) {
      o.update(dt);
      if (o.dead || !p.alive) continue;
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const rr = p.radius + o.radius;
      if (dx * dx + dy * dy < rr * rr) {
        o.life = 0;
        p.takeDamage(o.damage, this);
      }
    }

    // Enemies vs the player (contact damage).
    if (p.alive) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const rr = p.radius + e.radius - 2;
        if (dx * dx + dy * dy < rr * rr) {
          if (p.takeDamage(e.damage, this)) {
            // A chaser that hits the player burns itself out.
            if (e.type === 'chaser' || e.type === 'mini') e.hit(999, this);
          }
        }
      }
    }

    // Shards drift, magnetize, and get collected.
    for (let i = this.shards.length - 1; i >= 0; i--) {
      if (this.shards[i].update(dt, this)) this.shards.splice(i, 1);
    }

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.orbs = this.orbs.filter((o) => !o.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.effects.update(dt);

    // Wave cleared: nothing left to spawn and nothing left alive.
    if (
      this.player.alive &&
      this.spawnQueue.length === 0 &&
      this.enemies.length === 0 &&
      !this.waveCleared
    ) {
      this.waveCleared = true;
      const bonus = 100 * this.wave;
      this.score += bonus;
      this.effects.floatText(VIEW.w / 2, VIEW.h / 2 - 60, `WAVE ${this.wave} CLEAR  +${bonus}`, '#ffd166', 26);
      this.audio.waveClear();
      this.pendingUpgrades = rollUpgrades(this.rng, this.takenUpgrades);
    }
  }

  boss() {
    return this.enemies.find((e) => e.boss);
  }
}
