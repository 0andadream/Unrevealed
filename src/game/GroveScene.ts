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
    this.cameras.main.setZoom(1.35);
    this.cameras.main.setBackgroundColor("#0a1018");

    this.eventsApi.onReady?.();
  }

  private drawWorld() {
    // ground
    const g = this.add.graphics();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const shade = (x + y) % 2 === 0 ? 0x14201c : 0x101a18;
        g.fillStyle(this.mapGrid[y][x] === 1 ? 0x0c1412 : shade, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (this.mapGrid[y][x] === 0) {
          // soft moss dots
          g.fillStyle(0x1a2e24, 0.35);
          g.fillCircle(x * TILE + 8 + ((x * 7) % 16), y * TILE + 10, 2);
        }
      }
    }
    // trees
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (this.mapGrid[y][x] !== 1) continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        g.fillStyle(0x1a120c, 1);
        g.fillRect(cx - 3, cy - 2, 6, 12);
        g.fillStyle(0x1f3d2f, 1);
        g.fillCircle(cx, cy - 8, 11);
        g.fillStyle(0x2d5a42, 0.85);
        g.fillCircle(cx - 4, cy - 10, 7);
        g.fillStyle(0x3d7a58, 0.5);
        g.fillCircle(cx + 3, cy - 12, 5);
      }
    }
    g.setDepth(0);
  }

  private createPlayer() {
    const tex = this.make.graphics({ x: 0, y: 0 });
    tex.fillStyle(0xa78bfa, 1);
    tex.fillRoundedRect(4, 6, 16, 18, 4);
    tex.fillStyle(0xc4b5fd, 1);
    tex.fillCircle(12, 8, 6);
    tex.fillStyle(0x67e8f9, 0.9);
    tex.fillCircle(12, 22, 3);
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
    ctex.fillStyle(0x67e8f9, 1);
    ctex.fillTriangle(12, 2, 22, 16, 12, 28);
    ctex.fillTriangle(12, 2, 2, 16, 12, 28);
    ctex.fillStyle(0xe0f2fe, 0.85);
    ctex.fillTriangle(12, 6, 18, 16, 12, 24);
    ctex.generateTexture("crystal", 24, 30);
    ctex.destroy();

    for (const c of CRYSTALS) {
      if (this.taken.has(c.id)) continue;
      const container = this.add.container(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2);
      const glow = this.add.circle(0, 0, 14, 0x67e8f9, 0.18);
      const spr = this.add.image(0, 0, "crystal");
      container.add([glow, spr]);
      container.setDepth(5);
      container.setData("id", c.id);
      this.tweens.add({
        targets: container,
        y: container.y - 4,
        duration: 900 + c.id * 40,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.tweens.add({
        targets: glow,
        alpha: 0.35,
        scale: 1.25,
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

  floatText(x: number, y: number, text: string, color = "#a5f3fc") {
    const t = this.add
      .text(x, y, text, {
        fontFamily: "monospace",
        fontSize: "12px",
        color,
        stroke: "#0b0e14",
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
      const p = this.add.circle(x, y, 2, 0x67e8f9, 0.9).setDepth(40);
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
