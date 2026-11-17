// VOIDLIGHT entry point: the state machine, the frame loop, and the
// screenshot staging used to capture the game's own screens (?shot=title|
// play|upgrade|over). Normal play never passes a shot parameter.
import { VIEW } from './config.js';
import { Input } from './input.js';
import { World } from './world.js';
import { drawGame, screens, upgradeCardAt } from './render.js';
import { applyUpgrade, rollUpgrades } from './upgrades.js';
import { spawnEnemyAtEdge } from './enemies.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot');

const world = new World((Date.now() % 100000) + 7);
let state = 'title';
let hoverCard = -1;
let lastTime = performance.now();

function startRun() {
  world.audio.ensure();
  world.audio.startMusic();
  world.startRun();
  state = 'playing';
}

function openUpgrade() {
  state = 'upgrade';
  hoverCard = -1;
}

function pickUpgrade(index) {
  const choice = world.pendingUpgrades[index];
  if (!choice) return;
  applyUpgrade(world.player, choice, world.takenUpgrades);
  world.audio.upgrade();
  world.pendingUpgrades = [];
  world.nextWave();
  state = 'playing';
}

function gameOver() {
  world.saveBest();
  world.audio.stopMusic();
  state = 'over';
}

function toTitle() {
  world.audio.stopMusic();
  state = 'title';
}

function update(dt) {
  if (state === 'title') {
    world.time += dt;
    world.effects.update(dt);
    if (input.pressed('Enter') || input.pressedClick()) {
      world.audio.ensure();
      world.audio.uiClick();
      startRun();
    }
  } else if (state === 'playing') {
    if (input.pressed('KeyP') || input.pressed('Escape')) {
      state = 'paused';
      return;
    }
    if (input.pressed('KeyM')) {
      world.audio.setMuted(!world.audio.muted);
    }
    world.update(dt, input);
    if (world.waveCleared) {
      openUpgrade();
    } else if (!world.player.alive) {
      gameOver();
    }
  } else if (state === 'upgrade') {
    world.time += dt;
    world.effects.update(dt);
    hoverCard = upgradeCardAt(input.mouse.x, input.mouse.y);
    if (input.pressed('Digit1')) pickUpgrade(0);
    else if (input.pressed('Digit2')) pickUpgrade(1);
    else if (input.pressed('Digit3')) pickUpgrade(2);
    else if (input.pressedClick() && hoverCard >= 0) pickUpgrade(hoverCard);
  } else if (state === 'paused') {
    if (input.pressed('KeyP') || input.pressed('Escape')) {
      state = 'playing';
    } else if (input.pressed('KeyR')) {
      startRun();
    }
  } else if (state === 'over') {
    world.time += dt;
    world.effects.update(dt);
    if (input.pressed('KeyR')) {
      startRun();
    } else if (input.pressed('Enter')) {
      toTitle();
    }
  }
  input.endFrame();
}

function render(time) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  if (state === 'title') {
    drawGame(ctx, world, time, false);
    screens.drawTitle(ctx, world, time);
  } else if (state === 'playing' || state === 'paused') {
    drawGame(ctx, world, time);
    if (state === 'paused') screens.drawPaused(ctx);
  } else if (state === 'upgrade') {
    drawGame(ctx, world, time);
    screens.drawUpgrade(ctx, world, hoverCard);
  } else if (state === 'over') {
    drawGame(ctx, world, time);
    screens.drawGameOver(ctx, world);
  }
}

function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0.016);
  lastTime = now;
  update(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') state = 'paused';
});

// --- Screenshot staging: build one frozen, lively frame per screen. ---
function stageShot(name) {
  if (name === 'title') {
    state = 'title';
    world.time = 3;
    return;
  }
  world.startRun();
  if (name === 'play') {
    world.wave = 3;
    world.score = 2450;
    world.combo = 12;
    world.comboTimer = 2.5;
    world.kills = 41;
    world.shardsCollected = 18;
    world.spawnQueue = [];
    world.enemies = [];
    const spots = [
      ['chaser', 880, 240], ['chaser', 420, 480], ['weaver', 980, 430],
      ['weaver', 300, 200], ['shooter', 1020, 180], ['splitter', 640, 140],
      ['chaser', 760, 520],
    ];
    for (const [type, x, y] of spots) {
      const e = spawnEnemyAtEdge(type, 3, world.rng, world);
      e.x = x;
      e.y = y;
      e.vx = 0;
      e.vy = 0;
      world.enemies.push(e);
    }
    world.player.x = 560;
    world.player.y = 360;
    world.player.angle = 0.4;
    for (let i = 0; i < 4; i++) {
      world.spawnBullet(600 + i * 26, 372 + i * 8, 700, 60, 1, 0);
    }
    world.effects.burst(880, 240, '#ff4d6d', 14, 220, 0.6, 3);
    world.effects.burst(700, 300, '#8ef4ff', 10, 180, 0.5, 2);
    world.effects.ring(980, 430, '#ff9f43', 80, 0.4);
    state = 'playing';
  } else if (name === 'upgrade') {
    world.wave = 2;
    world.score = 1870;
    world.player.hp = 78;
    world.spawnQueue = [];
    world.waveCleared = true;
    world.pendingUpgrades = rollUpgrades(world.rng, world.takenUpgrades);
    state = 'upgrade';
  } else if (name === 'over') {
    world.score = 12480;
    world.best = 9800;
    world.wave = 7;
    world.kills = 213;
    world.shardsCollected = 96;
    world.spawnQueue = [];
    world.enemies = [];
    world.player.alive = false;
    world.player.hp = 0;
    world.effects.burst(640, 360, '#2ee6ff', 40, 320, 0.9, 4);
    state = 'over';
  }
}

if (shotMode) {
  // Stage the scene, simulate a few frames so particles and enemies settle,
  // then render exactly one frozen frame for the screenshot.
  stageShot(shotMode);
  if (shotMode !== 'title') {
    for (let i = 0; i < 3; i++) world.update(0.016, input);
  }
  render(3);
} else {
  requestAnimationFrame(frame);
}
