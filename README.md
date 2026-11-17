# voidlight

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/coolsuse/voidlight/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/coolsuse/voidlight/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

VOIDLIGHT is a neon arena survival game: pilot the last light in a dying void, blast geometric void-creatures in escalating waves, dash through bullet storms, and pick one of three upgrades between waves. Every 5th wave a Voidleviathan boss arrives. Survive, score, and beat your best.

## Run it

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: every file the game loads lives under `game/`.

## Controls

- **WASD / arrows** — move
- **Mouse** — aim, hold left click to fire
- **Space / Shift / right click** — dash (brief invulnerability)
- **1 / 2 / 3 or click** — pick an upgrade between waves
- **P / Esc** — pause, **R** — restart, **M** — mute

## How it is built

Plain HTML5 Canvas and vanilla ES modules, split into files with one job each under `game/src/`: `config.js` (tuning), `input.js` (keyboard and mouse), `audio.js` (synthesized WebAudio sound and music), `player.js`, `enemies.js`, `projectiles.js`, `effects.js` (particles, shockwaves, screen shake), `upgrades.js`, `world.js` (simulation and wave flow), `render.js` (all drawing and menus), and `main.js` (state machine and frame loop). All art is drawn in code and all sound is synthesized — there are no asset files to download.

---

<sub>Entered on [make.fun](https://make.fun/?ref=e7sg8b30&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
