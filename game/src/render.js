// All drawing: the void background, entities, HUD, and every menu screen.
// Sprites are pre-rendered once to offscreen canvases so the frame loop stays fast.
import { VIEW } from './config.js';

export const UPGRADE_CARD = { w: 260, h: 300, gap: 24, y: 230 };

export function upgradeCardAt(x, y) {
  const total = UPGRADE_CARD.w * 3 + UPGRADE_CARD.gap * 2;
  const x0 = (VIEW.w - total) / 2;
  const y0 = UPGRADE_CARD.y;
  if (y < y0 || y > y0 + UPGRADE_CARD.h) return -1;
  for (let i = 0; i < 3; i++) {
    const cx = x0 + i * (UPGRADE_CARD.w + UPGRADE_CARD.gap);
    if (x >= cx && x <= cx + UPGRADE_CARD.w) return i;
  }
  return -1;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawShapePath(ctx, shape, r) {
  ctx.beginPath();
  if (shape === 'tri') {
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.8, r * 0.7);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r * 0.8, -r * 0.7);
    ctx.closePath();
  } else if (shape === 'dia') {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.75, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.75, 0);
    ctx.closePath();
  } else if (shape === 'sq') {
    ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  } else if (shape === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'boss') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.62;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}

// A glowing sprite: the shape filled with its color and a bright core.
function makeSprite(shape, color, radius) {
  const pad = radius * 1.6;
  const size = Math.ceil((radius + pad) * 2);
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  g.shadowColor = color;
  g.shadowBlur = radius * 0.9;
  g.fillStyle = color;
  drawShapePath(g, shape, radius);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,255,255,0.85)';
  drawShapePath(g, shape, radius * 0.38);
  g.fill();
  return { canvas: c, half: size / 2 };
}

function makeWhiteSprite(shape, radius) {
  const pad = radius * 1.2;
  const size = Math.ceil((radius + pad) * 2);
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  g.fillStyle = '#ffffff';
  drawShapePath(g, shape, radius);
  g.fill();
  return { canvas: c, half: size / 2 };
}

const spriteCache = new Map();
function spriteFor(shape, color, radius) {
  const key = `${shape}|${color}|${radius}`;
  let s = spriteCache.get(key);
  if (!s) {
    s = makeSprite(shape, color, radius);
    spriteCache.set(key, s);
  }
  return s;
}

const whiteCache = new Map();
function whiteFor(shape, radius) {
  const key = `${shape}|${radius}`;
  let s = whiteCache.get(key);
  if (!s) {
    s = makeWhiteSprite(shape, radius);
    whiteCache.set(key, s);
  }
  return s;
}

let nebulaCanvas = null;
function nebula() {
  if (nebulaCanvas) return nebulaCanvas;
  const c = makeCanvas(VIEW.w, VIEW.h);
  const g = c.getContext('2d');
  const blobs = [
    { x: 220, y: 150, r: 420, color: 'rgba(46, 80, 220, 0.10)' },
    { x: 1050, y: 560, r: 460, color: 'rgba(160, 40, 180, 0.09)' },
    { x: 900, y: 120, r: 360, color: 'rgba(20, 160, 180, 0.08)' },
    { x: 350, y: 620, r: 380, color: 'rgba(220, 60, 90, 0.06)' },
  ];
  for (const b of blobs) {
    const grad = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, b.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  nebulaCanvas = c;
  return c;
}

const stars = [];
for (let i = 0; i < 170; i++) {
  stars.push({
    x: Math.random() * VIEW.w,
    y: Math.random() * VIEW.h,
    r: Math.random() * 1.4 + 0.4,
    layer: 1 + Math.floor(Math.random() * 3),
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.9,
  });
}

function drawBackground(ctx, time) {
  ctx.fillStyle = '#04050d';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.drawImage(nebula(), 0, 0);
  // Faint dot grid for depth.
  ctx.fillStyle = 'rgba(90, 140, 255, 0.05)';
  for (let x = 40; x < VIEW.w; x += 80) {
    for (let y = 40; y < VIEW.h; y += 80) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
  for (const s of stars) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * s.speed + s.phase));
    ctx.globalAlpha = tw * (0.35 + s.layer * 0.2);
    ctx.fillStyle = '#cfe4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Vignette.
  const vg = ctx.createRadialGradient(640, 360, 320, 640, 360, 780);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function drawSprite(ctx, spr, x, y, angle, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.drawImage(spr.canvas, -spr.half, -spr.half);
  ctx.restore();
}

function drawEnemy(ctx, e) {
  const spr = spriteFor(e.shape, e.color, e.radius);
  drawSprite(ctx, spr, e.x, e.y, e.angle, 1);
  if (e.elite) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.strokeStyle = '#ffe66d';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    drawShapePath(ctx, e.shape, e.radius + 6);
    ctx.stroke();
    ctx.restore();
  }
  if (e.flash > 0) {
    const w = whiteFor(e.shape, e.radius);
    ctx.globalAlpha = Math.min(1, e.flash / 0.08) * 0.85;
    drawSprite(ctx, w, e.x, e.y, e.angle, 1);
    ctx.globalAlpha = 1;
  }
  if (e.boss || e.hp < e.maxHp) {
    const w = e.radius * 2;
    const x = e.x - w / 2;
    const y = e.y - e.radius - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = e.boss ? '#ff2e63' : '#ff9f43';
    ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 5);
  }
}

function drawPlayer(ctx, p, time) {
  if (!p.alive) return;
  // Blink while invulnerable after a hit.
  if (p.invuln > 0 && p.dashTimer <= 0 && Math.floor(time * 18) % 2 === 0) return;
  const spr = spriteFor('tri', '#2ee6ff', p.radius + 3);
  drawSprite(ctx, spr, p.x, p.y, p.angle, 1);
  // Cockpit dot.
  ctx.fillStyle = '#e8fbff';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 5, p.y + Math.sin(p.angle) * 5, 3, 0, Math.PI * 2);
  ctx.fill();
  if (p.shield) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = 'rgba(93, 255, 160, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 9 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (p.dashCooldown > 0) {
    const f = 1 - p.dashCooldown / (2.2 * p.dashCooldownFactor);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = 'rgba(46, 230, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
    ctx.stroke();
    ctx.restore();
  }
}

function bar(ctx, x, y, w, h, frac, fill, bg = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function drawHUD(ctx, world) {
  const p = world.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Hull.
  ctx.fillStyle = '#7d8db0';
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HULL', 24, 30);
  const hpFrac = p.hp / p.maxHp;
  bar(ctx, 24, 38, 220, 16, hpFrac, hpFrac > 0.35 ? '#2ee6ff' : '#ff4d6d');
  ctx.fillStyle = '#dfe9ff';
  ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 252, 51);
  if (p.hasAegis) {
    ctx.fillStyle = p.shield ? '#5dffa0' : '#7d8db0';
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(p.shield ? 'AEGIS READY' : 'AEGIS RECHARGING', 24, 74);
  }
  // Wave, center.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dfe9ff';
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave}`, VIEW.w / 2, 34);
  ctx.fillStyle = '#7d8db0';
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(
    world.enemiesLeft > 0 ? `${world.enemiesLeft} HOSTILES LEFT` : 'WAVE CLEAR',
    VIEW.w / 2, 54,
  );
  const boss = world.boss();
  if (boss) {
    ctx.fillStyle = '#ff2e63';
    ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('VOIDLEVIATHAN', VIEW.w / 2, 76);
    bar(ctx, VIEW.w / 2 - 180, 84, 360, 10, boss.hp / boss.maxHp, '#ff2e63');
  }
  // Score, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#dfe9ff';
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, VIEW.w - 24, 34);
  ctx.fillStyle = '#7d8db0';
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`BEST ${Math.max(world.best, world.score).toLocaleString('en-US')}`, VIEW.w - 24, 54);
  if (world.combo >= 5) {
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO x${world.multiplier.toFixed(1)}  (${world.combo})`, VIEW.w - 24, 78);
  }
  // Bottom-left: dash.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7d8db0';
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('DASH [SPACE]', 24, VIEW.h - 42);
  bar(ctx, 24, VIEW.h - 34, 130, 8, 1 - p.dashCooldown / (2.2 * p.dashCooldownFactor), '#2ee6ff');
  // Bottom-right: loadout and shards.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7d8db0';
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(
    `DMG ${p.damage.toFixed(1)}  ·  ${p.projectiles} SHOT${p.projectiles > 1 ? 'S' : ''}  ·  PIERCE ${p.pierce}`,
    VIEW.w - 24, VIEW.h - 42,
  );
  ctx.fillStyle = '#ffd166';
  ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`◆ ${world.shardsCollected} SHARDS`, VIEW.w - 24, VIEW.h - 20);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, world, time) {
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.2);
  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = '#2ee6ff';
  ctx.shadowBlur = 34 * pulse;
  ctx.fillStyle = '#eafcff';
  ctx.font = '800 92px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('VOIDLIGHT', VIEW.w / 2, 250);
  ctx.restore();
  ctx.fillStyle = '#7d8db0';
  ctx.font = '600 19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('A NEON ARENA SURVIVAL GAME', VIEW.w / 2, 292);
  ctx.fillStyle = '#dfe9ff';
  ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Survive the waves. Dash through the dark. Choose your upgrades.', VIEW.w / 2, 340);
  ctx.fillStyle = '#8ef4ff';
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WASD move   ·   Mouse aim   ·   Hold click to fire   ·   Space to dash', VIEW.w / 2, 396);
  ctx.fillStyle = '#ffd166';
  ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
  const blink = Math.floor(time * 1.6) % 2 === 0;
  if (blink) ctx.fillText('CLICK OR PRESS ENTER TO START', VIEW.w / 2, 460);
  if (world.best > 0) {
    ctx.fillStyle = '#7d8db0';
    ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST SCORE  ${world.best.toLocaleString('en-US')}`, VIEW.w / 2, 500);
  }
  ctx.fillStyle = 'rgba(125, 141, 176, 0.7)';
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('An original game · every shape, sound and note made for this game', VIEW.w / 2, 660);
  ctx.textAlign = 'left';
}

function drawIcon(ctx, icon, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  if (icon === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(4, -16); ctx.lineTo(-8, 4); ctx.lineTo(-1, 4); ctx.lineTo(-4, 16); ctx.lineTo(9, -3); ctx.lineTo(1, -3);
    ctx.closePath(); ctx.fill();
  } else if (icon === 'bullet') {
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
  } else if (icon === 'spread') {
    for (const a of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(Math.sin(a) * 14, 8 - Math.cos(a) * 22);
      ctx.stroke();
    }
  } else if (icon === 'wind') {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-14, -10 + i * 10);
      ctx.lineTo(10 - i * 4, -10 + i * 10);
      ctx.stroke();
    }
  } else if (icon === 'magnet') {
    ctx.beginPath(); ctx.arc(0, -2, 11, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(-11, 8); ctx.moveTo(11, -2); ctx.lineTo(11, 8); ctx.stroke();
  } else if (icon === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(11, -8); ctx.lineTo(11, 4); ctx.lineTo(0, 14); ctx.lineTo(-11, 4); ctx.lineTo(-11, -8);
    ctx.closePath(); ctx.stroke();
  } else if (icon === 'dash') {
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -7); ctx.lineTo(15, 0); ctx.lineTo(6, 7); ctx.stroke();
  } else if (icon === 'aegis') {
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  } else if (icon === 'pierce') {
    ctx.beginPath(); ctx.moveTo(-13, 8); ctx.lineTo(13, -8); ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, 3, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(6, -4, 6, 0, Math.PI * 2); ctx.stroke();
  } else if (icon === 'heart') {
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-16, -2, -10, -14, 0, -6);
    ctx.bezierCurveTo(10, -14, 16, -2, 0, 12);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawUpgrade(ctx, world, hover) {
  ctx.fillStyle = 'rgba(2, 3, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = '800 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} CLEAR`, VIEW.w / 2, 130);
  ctx.fillStyle = '#dfe9ff';
  ctx.font = '600 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Choose an upgrade to take into the next wave', VIEW.w / 2, 168);
  const total = UPGRADE_CARD.w * 3 + UPGRADE_CARD.gap * 2;
  const x0 = (VIEW.w - total) / 2;
  const y0 = UPGRADE_CARD.y;
  world.pendingUpgrades.forEach((u, i) => {
    const x = x0 + i * (UPGRADE_CARD.w + UPGRADE_CARD.gap);
    const hot = hover === i;
    ctx.save();
    if (hot) {
      ctx.shadowColor = '#2ee6ff';
      ctx.shadowBlur = 26;
    }
    ctx.fillStyle = hot ? 'rgba(24, 42, 80, 0.95)' : 'rgba(10, 16, 36, 0.92)';
    roundRect(ctx, x, y0, UPGRADE_CARD.w, UPGRADE_CARD.h, 14);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = hot ? '#2ee6ff' : 'rgba(125, 141, 176, 0.5)';
    ctx.lineWidth = hot ? 2.5 : 1.5;
    roundRect(ctx, x, y0, UPGRADE_CARD.w, UPGRADE_CARD.h, 14);
    ctx.stroke();
    drawIcon(ctx, u.icon, x + UPGRADE_CARD.w / 2, y0 + 66, '#8ef4ff');
    ctx.fillStyle = '#eafcff';
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(u.name, x + UPGRADE_CARD.w / 2, y0 + 122);
    ctx.fillStyle = '#aebadb';
    ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(u.desc, x + UPGRADE_CARD.w / 2, y0 + 152);
    const taken = world.takenUpgrades[u.id] ?? 0;
    ctx.fillStyle = '#7d8db0';
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`LEVEL ${taken + 1}  ·  MAX ${u.max}`, x + UPGRADE_CARD.w / 2, y0 + 196);
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`PRESS ${i + 1}  OR  CLICK`, x + UPGRADE_CARD.w / 2, y0 + 258);
  });
  ctx.fillStyle = '#7d8db0';
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}   ·   HULL ${Math.ceil(world.player.hp)} / ${world.player.maxHp}`, VIEW.w / 2, y0 + UPGRADE_CARD.h + 44);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(2, 3, 10, 0.66)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eafcff';
  ctx.font = '800 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW.w / 2, 340);
  ctx.fillStyle = '#7d8db0';
  ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('P to resume   ·   R to restart the run', VIEW.w / 2, 384);
  ctx.textAlign = 'left';
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(2, 3, 10, 0.6)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = '#ff4d6d';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffe3e9';
  ctx.font = '800 64px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SIGNAL LOST', VIEW.w / 2, 250);
  ctx.restore();
  ctx.fillStyle = '#dfe9ff';
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('The void takes another light.', VIEW.w / 2, 296);
  ctx.fillStyle = '#ffd166';
  ctx.font = '800 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(world.score.toLocaleString('en-US'), VIEW.w / 2, 372);
  ctx.fillStyle = '#7d8db0';
  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave}   ·   ${world.kills} KILLS   ·   ${world.shardsCollected} SHARDS`, VIEW.w / 2, 412);
  if (world.score >= world.best && world.score > 0) {
    ctx.fillStyle = '#5dffa0';
    ctx.font = '700 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('★ NEW BEST SCORE ★', VIEW.w / 2, 452);
  } else {
    ctx.fillStyle = '#7d8db0';
    ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST  ${world.best.toLocaleString('en-US')}`, VIEW.w / 2, 452);
  }
  const blink = Math.floor(world.time * 1.6) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#8ef4ff';
    ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS R TO RETRY   ·   ENTER FOR TITLE', VIEW.w / 2, 520);
  }
  ctx.textAlign = 'left';
}

export function drawGame(ctx, world, time, showHud = true) {
  const shake = world.effects.shakeOffset();
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawBackground(ctx, time);
  for (const s of world.shards) {
    const spr = spriteFor('dia', '#ffd166', 6);
    const bob = Math.sin(s.t) * 2;
    drawSprite(ctx, spr, s.x, s.y + bob, s.t * 0.5, 0.9);
  }
  for (const o of world.orbs) {
    const spr = spriteFor('dia', '#ff5ce1', 8);
    drawSprite(ctx, spr, o.x, o.y, time * 2, 1);
  }
  for (const b of world.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.shadowColor = '#8ef4ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#bff6ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const e of world.enemies) drawEnemy(ctx, e);
  drawPlayer(ctx, world.player, time);
  world.effects.draw(ctx);
  ctx.restore();
  if (showHud) drawHUD(ctx, world);
}

export const screens = { drawTitle, drawUpgrade, drawPaused, drawGameOver };
