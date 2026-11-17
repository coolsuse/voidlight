// Between-wave upgrades: three cards, pick one. Each has a level cap;
// rollUpgrades returns three distinct upgrades the player can still take.
export const UPGRADES = [
  {
    id: 'overclock',
    name: 'Overclock',
    icon: 'bolt',
    desc: '+18% fire rate',
    max: 5,
    apply(p) { p.fireInterval *= 0.85; },
  },
  {
    id: 'heavy',
    name: 'Heavy Rounds',
    icon: 'bullet',
    desc: '+35% bullet damage',
    max: 5,
    apply(p) { p.damage *= 1.35; },
  },
  {
    id: 'split',
    name: 'Split Shot',
    icon: 'spread',
    desc: '+1 projectile per shot',
    max: 4,
    apply(p) { p.projectiles += 1; },
  },
  {
    id: 'swift',
    name: 'Swift Hull',
    icon: 'wind',
    desc: '+12% move speed',
    max: 4,
    apply(p) { p.speed *= 1.12; },
  },
  {
    id: 'magnet',
    name: 'Magnet Coil',
    icon: 'magnet',
    desc: '+60% shard pickup radius',
    max: 4,
    apply(p) { p.magnet *= 1.6; },
  },
  {
    id: 'plating',
    name: 'Void Plating',
    icon: 'shield',
    desc: '+25 max hull, restore 25',
    max: 5,
    apply(p) { p.maxHp += 25; p.heal(25); },
  },
  {
    id: 'capacitor',
    name: 'Dash Capacitor',
    icon: 'dash',
    desc: 'Dash recharges 25% faster',
    max: 4,
    apply(p) { p.dashCooldownFactor *= 0.75; },
  },
  {
    id: 'aegis',
    name: 'Aegis Shield',
    icon: 'aegis',
    desc: 'A shield that blocks one hit, then recharges',
    max: 3,
    apply(p) {
      if (!p.hasAegis) {
        p.hasAegis = true;
        p.shield = true;
        p.shieldCooldown = 0;
      } else {
        p.shieldRecharge *= 0.7;
      }
    },
  },
  {
    id: 'piercing',
    name: 'Piercing Rounds',
    icon: 'pierce',
    desc: 'Bullets pass through +1 enemy',
    max: 3,
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'secondwind',
    name: 'Second Wind',
    icon: 'heart',
    desc: 'Restore 40 hull right now',
    max: 5,
    apply(p) { p.heal(40); },
  },
];

export function rollUpgrades(rng, taken) {
  const available = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max);
  const picks = [];
  const pool = [...available];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(player, upgrade, taken) {
  upgrade.apply(player);
  taken[upgrade.id] = (taken[upgrade.id] ?? 0) + 1;
}
