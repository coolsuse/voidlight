// VOIDLIGHT tuning: every number the game balances on lives here.
export const VIEW = { w: 1280, h: 720 };

export const COLORS = {
  bg: '#04050d',
  grid: 'rgba(90, 140, 255, 0.05)',
  player: '#2ee6ff',
  playerCore: '#e8fbff',
  bullet: '#8ef4ff',
  orb: '#ff5ce1',
  shard: '#ffd166',
  shardCore: '#fff3c4',
  text: '#dfe9ff',
  dimText: '#7d8db0',
  danger: '#ff4d6d',
  heal: '#5dffa0',
  chaser: '#ff4d6d',
  weaver: '#ff9f43',
  shooter: '#c86bff',
  splitter: '#5dffa0',
  mini: '#7dffce',
  boss: '#ff2e63',
  eliteRing: '#ffe66d',
};

export const PLAYER = {
  radius: 14,
  speed: 330,
  accel: 2600,
  friction: 6.5,
  maxHp: 100,
  fireInterval: 0.14,
  damage: 1,
  bulletSpeed: 760,
  bulletRadius: 4,
  bulletLife: 0.9,
  projectiles: 1,
  pierce: 0,
  magnet: 90,
  dashSpeed: 950,
  dashTime: 0.16,
  dashCooldown: 2.2,
  dashInvuln: 0.35,
  hitInvuln: 0.8,
  shardHealEvery: 20,
  shardHeal: 5,
};

// Enemy definitions. hp and speed scale with the wave in enemies.js.
export const ENEMIES = {
  chaser:   { radius: 14, hp: 3,  speed: 125, damage: 10, score: 50,  color: COLORS.chaser,   shape: 'tri',   shards: 1, unlockWave: 1 },
  weaver:   { radius: 13, hp: 4,  speed: 155, damage: 10, score: 75,  color: COLORS.weaver,   shape: 'dia',   shards: 1, unlockWave: 2 },
  shooter:  { radius: 16, hp: 6,  speed: 95,  damage: 8,  score: 100, color: COLORS.shooter,  shape: 'sq',    shards: 2, unlockWave: 3 },
  splitter: { radius: 20, hp: 9,  speed: 82,  damage: 12, score: 120, color: COLORS.splitter, shape: 'hex',   shards: 2, unlockWave: 4 },
  mini:     { radius: 9,  hp: 1,  speed: 215, damage: 6,  score: 25,  color: COLORS.mini,     shape: 'tri',   shards: 0, unlockWave: 99 },
  boss:     { radius: 54, hp: 260, speed: 62, damage: 18, score: 2000, color: COLORS.boss,    shape: 'boss',  shards: 20, unlockWave: 5 },
};

// How many enemies a wave throws at the player.
export function waveBudget(wave) {
  return 5 + wave * 3;
}

// Seconds between spawns inside a wave.
export function spawnInterval(wave) {
  return Math.max(0.32, 0.9 - wave * 0.045);
}

// Enemy types available on a wave, weighted.
export function waveTable(wave) {
  const table = [['chaser', 10]];
  if (wave >= 2) table.push(['weaver', 7]);
  if (wave >= 3) table.push(['shooter', 5]);
  if (wave >= 4) table.push(['splitter', 4]);
  return table;
}

// Chance an enemy spawns as an elite.
export function eliteChance(wave) {
  return Math.min(0.22, 0.02 + wave * 0.012);
}

export function isBossWave(wave) {
  return wave % 5 === 0;
}
