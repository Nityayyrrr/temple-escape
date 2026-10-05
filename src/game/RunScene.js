/* Phaser Scene for the run: owns the game loop, input and render pipeline.
   The world simulation + painting lives in RunWorld. */

import Phaser from 'phaser';
import { RunWorld } from './runWorld';

export class RunScene extends Phaser.Scene {
  constructor(opts) {
    super({ key: 'run' });
    this.opts = opts;
    this.pausedFlag = false;
    this.pDown = null;
  }

  create() {
    const opts = this.opts;
    this.world = new RunWorld({
      skin: opts.skin,
      boosts: opts.boosts,
      magnetDur: opts.magnetDur,
      onGameOver: (r) => opts.onGameOver(r),
    });

    const size = this.scale.gameSize;
    this.world.setSize(size.width, size.height);
    this.pctx = this.game.canvas.getContext('2d');

    /* paint the world after Phaser's render each frame */
    this.paint = () => {
      const canvas = this.game.canvas;
      if (!this.world || !this.pctx) return;
      const rect = canvas.getBoundingClientRect();
      this.world.setSize(rect.width, rect.height);
      const backScale = canvas.width / Math.max(1, rect.width);
      const ctx = this.pctx;
      ctx.save();
      ctx.setTransform(backScale, 0, 0, backScale, 0, 0);
      this.world.draw(ctx);
      ctx.restore();
    };
    this.game.events.on(Phaser.Core.Events.POST_RENDER, this.paint);

    /* keyboard (event-based, so taps feel instant) */
    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(['LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE', 'W', 'A', 'S', 'D']);
      kb.on('keydown-LEFT', () => this.world?.moveLane(-1));
      kb.on('keydown-A', () => this.world?.moveLane(-1));
      kb.on('keydown-RIGHT', () => this.world?.moveLane(1));
      kb.on('keydown-D', () => this.world?.moveLane(1));
      kb.on('keydown-UP', () => this.world?.jump());
      kb.on('keydown-W', () => this.world?.jump());
      kb.on('keydown-SPACE', () => this.world?.jump());
      kb.on('keydown-DOWN', () => this.world?.slide());
      kb.on('keydown-S', () => this.world?.slide());
    }

    /* touch / swipe */
    this.input.on('pointerdown', (p) => {
      this.pDown = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p) => {
      if (!this.pDown || !this.world) return;
      const dx = p.x - this.pDown.x;
      const dy = p.y - this.pDown.y;
      this.pDown = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        this.world.jump();
      } else if (Math.abs(dx) > Math.abs(dy)) {
        this.world.moveLane(dx > 0 ? 1 : -1);
      } else if (dy < 0) {
        this.world.jump();
      } else {
        this.world.slide();
      }
    });

    /* cleanup */
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  teardown() {
    this.game.events.off(Phaser.Core.Events.POST_RENDER, this.paint);
    this.world?.destroy();
    this.world = null;
  }

  setPaused(p) {
    this.pausedFlag = p;
    this.world?.setPaused(p);
  }

  update(time, delta) {
    if (this.pausedFlag || !this.world) return;
    const dt = Math.min(0.035, delta / 1000);
    this.world.update(dt);
    this.opts.onHud(this.world.hud);
  }
}
