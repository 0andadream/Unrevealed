/** Tile map: 0 empty, 1 tree/obstacle, 2 path */
export const TILE = 32;
export const MAP_W = 24;
export const MAP_H = 18;

export const CRYSTALS: { id: number; x: number; y: number }[] = [
  { id: 0, x: 4, y: 4 },
  { id: 1, x: 10, y: 3 },
  { id: 2, x: 18, y: 5 },
  { id: 3, x: 7, y: 8 },
  { id: 4, x: 14, y: 7 },
  { id: 5, x: 20, y: 10 },
  { id: 6, x: 3, y: 12 },
  { id: 7, x: 11, y: 13 },
  { id: 8, x: 17, y: 14 },
  { id: 9, x: 6, y: 15 },
  { id: 10, x: 13, y: 10 },
  { id: 11, x: 21, y: 15 },
];

/** Simple forest layout — trees around edges + clusters */
export function buildMap(): number[][] {
  const g: number[][] = Array.from({ length: MAP_H }, () =>
    Array.from({ length: MAP_W }, () => 0)
  );
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) g[y][x] = 1;
      // tree clusters
      if ((x + y * 3) % 11 === 0 && x > 1 && y > 1 && x < MAP_W - 2 && y < MAP_H - 2)
        g[y][x] = 1;
      if ((x * 5 + y) % 17 === 0 && x > 2 && y > 2) g[y][x] = 1;
    }
  }
  // clear spawn & crystal tiles
  g[9][12] = 0;
  g[8][12] = 0;
  g[9][11] = 0;
  for (const c of CRYSTALS) {
    g[c.y][c.x] = 0;
    // small clear radius
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ] as const) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (nx > 0 && ny > 0 && nx < MAP_W - 1 && ny < MAP_H - 1) g[ny][nx] = 0;
    }
  }
  return g;
}

export function blocked(map: number[][], tx: number, ty: number) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return map[ty][tx] === 1;
}
