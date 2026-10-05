# 🏛️ Temple Escape — Endless Coin Runner

A Temple Run–style endless runner built with **HTML, CSS, and JavaScript**, powered by **Phaser 3** for the game loop, scenes, and input handling.

Run through ancient jungle ruins, vault over boulders, slide under cursed branches, and collect gold coins to spend in the Trading Post.

## ✨ Features

- **Pseudo-3D endless runner** — perspective-projected road, parallax mountains, sunset sky, fog
- **Phaser 3 engine** — game loop, scene management, keyboard + touch/swipe input, responsive scaling
- **Obstacles** — boulders (jump), stone walls (dodge), hanging logs (slide), pits (leap)
- **Coin economy** — combo multiplier up to ×6, persistent coin bank
- **Trading Post** — buy consumable charms, permanent upgrades, and 4 unlockable runner skins
- **Power-ups** — Coin Magnet and Shield orbs spawn during runs
- **Procedural audio** — tribal drum soundtrack and all sound effects synthesized live with WebAudio (no audio files)
- **Save system** — high score, distance, coins, and purchases persist via localStorage

## 🚀 Running locally

Requires **Node.js 18+**.

```bash
npm install     # install dependencies (first time only)
npm run dev     # start dev server
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## 📦 Production build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the build locally
```

## 🎮 Controls

| Action | Keyboard | Touch |
|---|---|---|
| Change lane | ← → or A / D | Swipe left / right |
| Jump | ↑ / W / Space | Swipe up or tap |
| Slide | ↓ / S | Swipe down |
| Pause | Esc or P | Pause button |

## 🕹️ How to play

1. Press **RUN** on the main menu.
2. Dodge obstacles, grab coins, build combos.
3. Coins are banked when your run ends.
4. Spend them at the **Trading Post** on charms, upgrades, and skins.
5. Arm purchased charms from the main menu loadout before your next run.

## 🗂️ Project structure

```
index.html                  HTML entry
src/index.css               All styling (CSS + Tailwind)
src/main.jsx                JS entry point
src/App.jsx                 Screen routing, coin economy, purchases
src/game/
  phaserGame.js             Phaser.Game factory (config, scaling)
  RunScene.js               Phaser Scene — loop + keyboard/touch input
  runWorld.js               Simulation: physics, spawning, collisions, scoring
  player.js                 Animated runner character (canvas drawing)
  audio.js                  Procedural WebAudio music + SFX
  profile.js                Shop catalogue, skins, save/load (localStorage)
src/components/
  MenuScreen.jsx            Main menu + charm loadout
  ShopScreen.jsx            Trading Post
  GameScreen.jsx            Phaser host + live HUD
  GameOverScreen.jsx        Run results
  CoinIcon.jsx              Coin SVG
```

## 🌐 Deploying

Push to GitHub, then import the repo at [vercel.com/new](https://vercel.com/new).

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`

## 🛠️ Tech stack

HTML5 · CSS3 · JavaScript (ES modules) · React · Phaser 3 · Vite · Tailwind CSS · WebAudio API · Canvas 2D
