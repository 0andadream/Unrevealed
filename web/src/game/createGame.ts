import Phaser from "phaser";
import { MAP_H, MAP_W, TILE } from "./mapData";
import { GroveScene, type GroveEvents } from "./GroveScene";

export function createGroveGame(
  parent: HTMLElement,
  events: GroveEvents
): Phaser.Game {
  const scene = new GroveScene(events);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: Math.min(960, parent.clientWidth || 960),
    height: Math.min(640, parent.clientHeight || 640),
    backgroundColor: "#0a1018",
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [scene],
    render: { pixelArt: true, antialias: false },
    // world size for camera
    callbacks: {
      postBoot: (game) => {
        game.scale.resize(parent.clientWidth, parent.clientHeight);
      },
    },
  });
}

export { MAP_W, MAP_H, TILE };
