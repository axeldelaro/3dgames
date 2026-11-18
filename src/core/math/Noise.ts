/**
 * High-performance deterministic procedural noise library:
 * - Mulberry32 Seeded PRNG
 * - 2D & 3D Classic Perlin Noise
 * - 2D & 3D Simplex Noise
 * - 2D Worley / Voronoi Cellular Noise (F1 distance, F2 distance, F2-F1 crack edge, cell ID)
 * - Multi-octave Fractional Brownian Motion (FBM) & Ridged Multifractal
 */

export class SeededRandom {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }
}

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

const GRAD3: ReadonlyArray<readonly [number, number, number]> = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

export interface WorleySample {
  f1: number;
  f2: number;
  edge: number;
  cellId: number;
}

export class ProceduralNoise {
  private readonly perm: Uint8Array;
  private readonly permMod12: Uint8Array;

  constructor(seed = 42026) {
    const rng = new SeededRandom(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  private static fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private static lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  /** Classic 2D Perlin noise in [-1, 1], optionally tileable with periodX/periodY */
  perlin2D(x: number, y: number, periodX = 0, periodY = 0): number {
    const xi0 = Math.floor(x);
    const yi0 = Math.floor(y);
    const xf = x - xi0;
    const yf = y - yi0;

    const X0 = periodX > 0 ? ((xi0 % periodX) + periodX) % periodX : xi0 & 255;
    const Y0 = periodY > 0 ? ((yi0 % periodY) + periodY) % periodY : yi0 & 255;
    const X1 = periodX > 0 ? (X0 + 1) % periodX : (X0 + 1) & 255;
    const Y1 = periodY > 0 ? (Y0 + 1) % periodY : (Y0 + 1) & 255;

    const u = ProceduralNoise.fade(xf);
    const v = ProceduralNoise.fade(yf);

    const g00 = GRAD3[this.permMod12[(X0 & 255) + this.perm[Y0 & 255]]];
    const g10 = GRAD3[this.permMod12[(X1 & 255) + this.perm[Y0 & 255]]];
    const g01 = GRAD3[this.permMod12[(X0 & 255) + this.perm[Y1 & 255]]];
    const g11 = GRAD3[this.permMod12[(X1 & 255) + this.perm[Y1 & 255]]];

    const n00 = g00[0] * xf + g00[1] * yf;
    const n10 = g10[0] * (xf - 1) + g10[1] * yf;
    const n01 = g01[0] * xf + g01[1] * (yf - 1);
    const n11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

    const nx0 = ProceduralNoise.lerp(n00, n10, u);
    const nx1 = ProceduralNoise.lerp(n01, n11, u);
    return ProceduralNoise.lerp(nx0, nx1, v) * 1.4142;
  }

  /** 2D Simplex noise in [-1, 1] */
  simplex2D(xin: number, yin: number): number {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1: number;
    let j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  /** 3D Simplex noise in [-1, 1] (ideal for spherical planets without UV seam) */
  simplex3D(xin: number, yin: number, zin: number): number {
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);

    let i1: number, j1: number, k1: number;
    let i2: number, j2: number, k2: number;

    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const gi0 = this.permMod12[ii + this.perm[jj + this.perm[kk]]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]];
    const gi2 = this.permMod12[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]];
    const gi3 = this.permMod12[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]];

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0 + GRAD3[gi0][2] * z0); }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1 + GRAD3[gi1][2] * z1); }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2 + GRAD3[gi2][2] * z2); }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) { t3 *= t3; n3 = t3 * t3 * (GRAD3[gi3][0] * x3 + GRAD3[gi3][1] * y3 + GRAD3[gi3][2] * z3); }

    return 32.0 * (n0 + n1 + n2 + n3);
  }

  /** 2D Worley / Voronoi noise (optionally tileable via period) */
  worley2D(x: number, y: number, jitter = 0.85, period = 0): WorleySample {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let d1 = 999.0;
    let d2 = 999.0;
    let bestId = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx;
        const cy = yi + dy;
        const wx = period > 0 ? ((cx % period) + period) % period : cx & 255;
        const wy = period > 0 ? ((cy % period) + period) % period : cy & 255;
        const h1 = this.perm[(wx & 255) + this.perm[wy & 255]];
        const h2 = this.perm[(h1 + 73) & 255];

        const fx = cx + 0.5 + ((h1 / 255.0) - 0.5) * jitter;
        const fy = cy + 0.5 + ((h2 / 255.0) - 0.5) * jitter;
        const dist = Math.hypot(x - fx, y - fy);

        if (dist < d1) {
          d2 = d1;
          d1 = dist;
          bestId = h1 / 255.0;
        } else if (dist < d2) {
          d2 = dist;
        }
      }
    }

    return {
      f1: Math.min(1, d1),
      f2: Math.min(1, d2),
      edge: Math.min(1, Math.max(0, d2 - d1)),
      cellId: bestId
    };
  }

  /** Multi-octave 2D FBM in [-1, 1] */
  fbm2D(x: number, y: number, octaves = 5, lacunarity = 2.03, gain = 0.5): number {
    let sum = 0;
    let amp = 0.5;
    let freq = 1.0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.simplex2D(x * freq, y * freq);
      norm += amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return norm > 0 ? sum / norm : 0;
  }

  /** Multi-octave 3D FBM in [-1, 1] */
  fbm3D(x: number, y: number, z: number, octaves = 5, lacunarity = 2.02, gain = 0.5): number {
    let sum = 0;
    let amp = 0.5;
    let freq = 1.0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.simplex3D(x * freq, y * freq, z * freq);
      norm += amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return norm > 0 ? sum / norm : 0;
  }

  /** Ridged multifractal 2D in [0, 1] for sharp alpine mountain crests */
  ridged2D(x: number, y: number, octaves = 5, lacunarity = 2.1, gain = 0.52): number {
    let sum = 0;
    let amp = 0.5;
    let freq = 1.0;
    let prev = 1.0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      let n = 1.0 - Math.abs(this.simplex2D(x * freq, y * freq));
      n *= n;
      sum += n * amp * prev;
      norm += amp;
      prev = Math.max(0.15, Math.min(1.0, n * 1.6));
      freq *= lacunarity;
      amp *= gain;
    }
    return norm > 0 ? Math.min(1, sum / norm) : 0;
  }
}

export const sharedNoise = new ProceduralNoise(202630);
