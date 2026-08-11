import * as Phaser from "phaser";
import {
  CRYSTALS,
  MAP_H,
  MAP_W,
  TILE,
  blocked,
  buildMap,
} from "./mapData";

export type GroveEvents = {
  onCollect: (crystalId: number, worldX: number, worldY: number) => void;
  onReady?: () => void;
};

export class GroveScene extends Phaser.Scene {
  private mapGrid!: number[][];
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private crystals: Map<number, Phaser.GameObjects.Container> = new Map();
  private taken = new Set<number>();
  private target: { x: number; y: number } | null = null;
  private eventsApi: GroveEvents;
  private speed = 140;
  private floatTexts: Phaser.GameObjects.Text[] = [];

  constructor(eventsApi: GroveEvents) {
    super("GroveScene");
    this.eventsApi = eventsApi;
  }

  preload() {
    // procedural textures
  }

  create() {
    this.mapGrid = buildMap();
    this.drawWorld();
    this.createPlayer();
    this.spawnCrystals();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.target = { x: p.worldX, y: p.worldY };
    });

    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.4);
    // Galleria-like deep blue stage
    this.cameras.main.setBackgroundColor("#081428");

    this.eventsApi.onReady?.();
  }

  private drawWorld() {
    // 2-bit / handheld blue floor (Galleria language, blue-shifted)
    const g = this.add.graphics();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const shade = (x + y) % 2 === 0 ? 0x0c1c38 : 0x0a1830;
        const wall = 0x061020;
        g.fillStyle(this.mapGrid[y][x] === 1 ? wall : shade, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (this.mapGrid[y][x] === 0) {
          // pixel grit
          g.fillStyle(0x345878, 0.25);
          g.fillRect(x * TILE + ((x * 5) % 20), y * TILE + ((y * 7) % 18), 2, 2);
        }
      }
    }
    // trees as hard-pixel blue silhouettes
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (this.mapGrid[y][x] !== 1) continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        g.fillStyle(0x0a1424, 1);
        g.fillRect(cx - 3, cy - 2, 6, 12);
        g.fillStyle(0x1a3858, 1);
        g.fillRect(cx - 10, cy - 16, 20, 14);
        g.fillStyle(0x2a5080, 1);
        g.fillRect(cx - 7, cy - 20, 14, 10);
        g.fillStyle(0x70a8e0, 0.35);
        g.fillRect(cx - 4, cy - 18, 4, 4);
      }
    }
    g.setDepth(0);
  }

  private createPlayer() {
    const tex = this.make.graphics({ x: 0, y: 0 });
    // chunky 2-bit adventurer — cream + bright blue
    tex.fillStyle(0x081428, 1);
    tex.fillRect(5, 6, 14, 18);
    tex.fillStyle(0xd1e8f8, 1);
    tex.fillRect(6, 7, 12, 16);
    tex.fillStyle(0x70a8e0, 1);
    tex.fillRect(8, 4, 8, 6);
    tex.fillStyle(0x9ad8ff, 1);
    tex.fillRect(10, 20, 4, 4);
    tex.generateTexture("player", 24, 28);
    tex.destroy();

    this.player = this.physics.add.sprite(12.5 * TILE, 9.5 * TILE, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setDrag(800);
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  }

  private spawnCrystals() {
    const ctex = this.make.graphics({ x: 0, y: 0 });
    // hard-edge diamond crystal
    ctex.fillStyle(0x081428, 1);
    ctex.fillRect(10, 2, 4, 26);
    ctex.fillStyle(0x9ad8ff, 1);
    ctex.fillTriangle(12, 2, 22, 15, 12, 28);
    ctex.fillTriangle(12, 2, 2, 15, 12, 28);
    ctex.fillStyle(0xd1e8f8, 1);
    ctex.fillTriangle(12, 6, 17, 15, 12, 22);
    ctex.generateTexture("crystal", 24, 30);
    ctex.destroy();

    for (const c of CRYSTALS) {
      if (this.taken.has(c.id)) continue;
      const container = this.add.container(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2);
      const glow = this.add.rectangle(0, 0, 20, 20, 0x70a8e0, 0.2);
      const spr = this.add.image(0, 0, "crystal");
      container.add([glow, spr]);
      container.setDepth(5);
      container.setData("id", c.id);
      this.tweens.add({
        targets: container,
        y: container.y - 3,
        duration: 900 + c.id * 40,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.tweens.add({
        targets: glow,
        alpha: 0.4,
        scale: 1.2,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      this.crystals.set(c.id, container);
    }
  }

  markCollected(id: number) {
    this.taken.add(id);
    const c = this.crystals.get(id);
    if (c) {
      this.tweens.add({
        targets: c,
        alpha: 0,
        scale: 1.8,
        duration: 280,
        onComplete: () => c.destroy(),
      });
      this.crystals.delete(id);
    }
  }

  setCollectedMask(mask: number) {
    for (let i = 0; i < 12; i++) {
      if (mask & (1 << i)) this.markCollected(i);
    }
  }

  floatText(x: number, y: number, text: string, color = "#d1e8f8") {
    const t = this.add
      .text(x, y, text, {
        fontFamily: "Press Start 2P, monospace",
        fontSize: "8px",
        color,
        stroke: "#081428",
        strokeThickness: 3,
      })
      .setDepth(50)
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 28,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  burst(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const p = this.add.rectangle(x, y, 3, 3, 0x9ad8ff, 0.95).setDepth(40);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: 450,
        onComplete: () => p.destroy(),
      });
    }
  }

  update() {
    if (!this.player) return;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      this.target = null;
      const len = Math.hypot(vx, vy) || 1;
      this.player.setVelocity((vx / len) * this.speed, (vy / len) * this.speed);
    } else if (this.target) {
      const dx = this.target.x - this.player.x;
      const dy = this.target.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        this.target = null;
        this.player.setVelocity(0, 0);
      } else {
        this.player.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
      }
    } else {
      this.player.setVelocity(0, 0);
    }

    // soft collision with trees
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor(this.player.y / TILE);
    if (blocked(this.mapGrid, tx, ty)) {
      this.player.x -= (this.player.body as Phaser.Physics.Arcade.Body).velocity.x * 0.04;
      this.player.y -= (this.player.body as Phaser.Physics.Arcade.Body).velocity.y * 0.04;
      this.player.setVelocity(0, 0);
      this.target = null;
    }

    // collect proximity
    for (const [id, c] of this.crystals) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (d < 18) {
        this.markCollected(id);
        this.burst(c.x, c.y);
        this.floatText(c.x, c.y - 10, "+5 Dust  +10 XP");
        this.eventsApi.onCollect(id, c.x, c.y);
      }
    }
  }
}
