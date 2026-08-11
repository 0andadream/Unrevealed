/** World units: 1 tile = 1 unit */
export const MAP_W = 24;
export const MAP_H = 18;

export const CRYSTALS: { id: number; x: number; z: number }[] = [
  { id: 0, x: 4, z: 4 },
  { id: 1, x: 10, z: 3 },
  { id: 2, x: 18, z: 5 },
  { id: 3, x: 7, z: 8 },
  { id: 4, x: 14, z: 7 },
  { id: 5, x: 20, z: 10 },
  { id: 6, x: 3, z: 12 },
  { id: 7, x: 11, z: 13 },
  { id: 8, x: 17, z: 14 },
  { id: 9, x: 6, z: 15 },
  { id: 10, x: 13, z: 10 },
  { id: 11, x: 21, z: 15 },
];

export function buildBlocked(): boolean[][] {
  const g: boolean[][] = Array.from({ length: MAP_H }, () =>
    Array.from({ length: MAP_W }, () => false)
  );
  for (let z = 0; z < MAP_H; z++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x === 0 || z === 0 || x === MAP_W - 1 || z === MAP_H - 1) g[z][x] = true;
      if ((x + z * 3) % 11 === 0 && x > 1 && z > 1 && x < MAP_W - 2 && z < MAP_H - 2)
        g[z][x] = true;
      if ((x * 5 + z) % 17 === 0 && x > 2 && z > 2) g[z][x] = true;
    }
  }
  g[9][12] = false;
  g[8][12] = false;
  g[9][11] = false;
  for (const c of CRYSTALS) {
    g[c.z][c.x] = false;
    for (const [dx, dz] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ] as const) {
      const nx = c.x + dx;
      const nz = c.z + dz;
      if (nx > 0 && nz > 0 && nx < MAP_W - 1 && nz < MAP_H - 1) g[nz][nx] = false;
    }
  }
  return g;
}

export function worldTrees(blocked: boolean[][]) {
  const trees: { x: number; z: number; h: number; r: number }[] = [];
  for (let z = 0; z < MAP_H; z++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!blocked[z][x]) continue;
      // skip outer wall density a bit for performance — keep edge + clusters
      if (
        x === 0 ||
        z === 0 ||
        x === MAP_W - 1 ||
        z === MAP_H - 1 ||
        (x + z * 3) % 11 === 0 ||
        (x * 5 + z) % 17 === 0
      ) {
        trees.push({
          x: x + 0.5,
          z: z + 0.5,
          h: 1.4 + ((x * 13 + z * 7) % 10) * 0.12,
          r: 0.35 + ((x + z) % 5) * 0.04,
        });
      }
    }
  }
  return trees;
}

export function isBlocked(
  blocked: boolean[][],
  x: number,
  z: number,
  rad = 0.28
): boolean {
  const samples = [
    [x, z],
    [x + rad, z],
    [x - rad, z],
    [x, z + rad],
    [x, z - rad],
  ];
  for (const [sx, sz] of samples) {
    const tx = Math.floor(sx);
    const tz = Math.floor(sz);
    if (tx < 0 || tz < 0 || tx >= MAP_W || tz >= MAP_H) return true;
    if (blocked[tz][tx]) return true;
  }
  return false;
}
