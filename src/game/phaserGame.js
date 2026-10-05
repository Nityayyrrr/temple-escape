/* Phaser game factory — mounts a Phaser.Game into a DOM element. */

import Phaser from 'phaser';
import { RunScene } from './RunScene';

export function createPhaserGame(parent, opts) {
  const scene = new RunScene(opts);

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: Math.max(320, parent.clientWidth || window.innerWidth),
    height: Math.max(420, parent.clientHeight || window.innerHeight),
    transparent: true,
    disableContextMenu: true,
    banner: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    fps: {
      target: 60,
      min: 30,
    },
    scene: [scene],
  });

  // handy reference for React (pause etc.)
  game.runScene = scene;
  return game;
}
