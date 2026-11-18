import * as THREE from 'three';
import { ProceduralNoise } from '../math/Noise';
import type { IProceduralTextureGenerator, PBRMaterialName, PBRTextureSet } from '../types';

export interface CreatePBRMaterialOptions {
  repeatX?: number;
  repeatY?: number;
  tint?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  emissiveIntensity?: number;
  bumpScale?: number;
  normalScale?: number;
}

interface MaterialDefaults {
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  bumpScale: number;
  normalScale: number;
  sobelStrength: number;
}

const MATERIAL_DEFAULTS: Record<PBRMaterialName, MaterialDefaults> = {
  asphalt: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.018,
    normalScale: 0.95,
    sobelStrength: 2.6
  },
  cobblestone: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.045,
    normalScale: 1.35,
    sobelStrength: 4.2
  },
  facade_brick: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.85,
    bumpScale: 0.03,
    normalScale: 1.15,
    sobelStrength: 3.4
  },
  facade_glass: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.65,
    bumpScale: 0.012,
    normalScale: 0.85,
    sobelStrength: 2.4
  },
  bark: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.05,
    normalScale: 1.4,
    sobelStrength: 4.4
  },
  foliage: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.02,
    normalScale: 0.9,
    sobelStrength: 2.5
  },
  rock: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.048,
    normalScale: 1.35,
    sobelStrength: 4.0
  },
  sand: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.022,
    normalScale: 0.95,
    sobelStrength: 2.8
  },
  rust: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.032,
    normalScale: 1.2,
    sobelStrength: 3.5
  },
  ship_wood: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.03,
    normalScale: 1.15,
    sobelStrength: 3.3
  },
  carbon: {
    roughness: 1.0,
    metalness: 1.0,
    emissiveIntensity: 0.0,
    bumpScale: 0.01,
    normalScale: 0.85,
    sobelStrength: 2.6
  }
};

const LUT_SIZE = 256;
const LUT_MASK = 255;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function toByte(v: number): number {
  const c = v < 0 ? 0 : v > 1 ? 1 : v;
  return (c * 255 + 0.5) | 0;
}

function sanitizePowerOfTwo(size: number): number {
  const clamped = Math.max(64, Math.min(2048, Math.round(size)));
  return 1 << Math.round(Math.log2(clamped));
}

function hash2i(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Synthesizes genuine 1024x1024 (configurable) tileable 6-layer PBR DataTexture sets
 * using precomputed 256x256 toroidal noise lookup buffers + wrapped multi-octave sampling
 * + 3x3 Sobel normal generation.
 */
export class ProceduralTextureGenerator implements IProceduralTextureGenerator {
  private _textureSize: number;
  private readonly perlinLut: Float32Array;
  private readonly simplexLut: Float32Array;
  private readonly worleyF1Lut: Float32Array;
  private readonly worleyEdgeLut: Float32Array;
  private readonly worleyCellLut: Float32Array;

  private readonly cache = new Map<PBRMaterialName, PBRTextureSet>();
  private readonly repeatCache = new Map<string, PBRTextureSet>();
  private readonly allocatedTextures = new Set<THREE.DataTexture>();
  private scratchHeight: Float32Array;

  constructor(textureSize = 1024, seed = 202630) {
    this._textureSize = sanitizePowerOfTwo(textureSize);
    this.scratchHeight = new Float32Array(this._textureSize * this._textureSize);

    const noise = new ProceduralNoise(seed);
    const total = LUT_SIZE * LUT_SIZE;
    this.perlinLut = new Float32Array(total);
    this.simplexLut = new Float32Array(total);
    this.worleyF1Lut = new Float32Array(total);
    this.worleyEdgeLut = new Float32Array(total);
    this.worleyCellLut = new Float32Array(total);

    const invLut = 1.0 / LUT_SIZE;

    const seamlessSimplex = (u: number, v: number, scale: number, offset: number): number => {
      const n00 = noise.simplex2D(u * scale + offset, v * scale + offset);
      const n10 = noise.simplex2D((u - 1.0) * scale + offset, v * scale + offset);
      const n01 = noise.simplex2D(u * scale + offset, (v - 1.0) * scale + offset);
      const n11 = noise.simplex2D((u - 1.0) * scale + offset, (v - 1.0) * scale + offset);
      const blend =
        (1.0 - u) * (1.0 - v) * n00 +
        u * (1.0 - v) * n10 +
        (1.0 - u) * v * n01 +
        u * v * n11;
      const norm = Math.sqrt(
        ((1.0 - u) * (1.0 - u) + u * u) * ((1.0 - v) * (1.0 - v) + v * v)
      );
      return blend / norm;
    };

    for (let y = 0; y < LUT_SIZE; y++) {
      const v = y * invLut;
      const rowOffset = y << 8;
      for (let x = 0; x < LUT_SIZE; x++) {
        const u = x * invLut;
        const idx = rowOffset | x;

        // Tileable multi-period Perlin normalized to [0, 1]
        const p =
          0.56 * noise.perlin2D(u * 4.0, v * 4.0, 4, 4) +
          0.30 * noise.perlin2D(u * 8.0, v * 8.0, 8, 8) +
          0.14 * noise.perlin2D(u * 16.0, v * 16.0, 16, 16);
        this.perlinLut[idx] = clamp01(0.5 + 0.5 * p);

        // Seamless constant-variance toroidal Simplex normalized to [0, 1]
        const s =
          0.68 * seamlessSimplex(u, v, 6.0, 11.3) +
          0.32 * seamlessSimplex(u, v, 12.0, 47.9);
        this.simplexLut[idx] = clamp01(0.5 + 0.5 * s);

        // Exact periodic Worley cellular features (period = 8 cells across 256 LUT)
        const w = noise.worley2D(u * 8.0, v * 8.0, 0.86, 8);
        this.worleyF1Lut[idx] = w.f1;
        this.worleyEdgeLut[idx] = w.edge;
        this.worleyCellLut[idx] = w.cellId;
      }
    }
  }

  get textureSize(): number {
    return this._textureSize;
  }

  set textureSize(size: number) {
    this.setTextureSize(size);
  }

  setTextureSize(size: number): void {
    const sanitized = sanitizePowerOfTwo(size);
    if (sanitized !== this._textureSize) {
      this._textureSize = sanitized;
      this.scratchHeight = new Float32Array(sanitized * sanitized);
      this.cache.clear();
      this.repeatCache.clear();
    }
  }

  private sampleBilinear(lut: Float32Array, fx: number, fy: number): number {
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const ix0 = x0 & LUT_MASK;
    const ix1 = (x0 + 1) & LUT_MASK;
    const row0 = (y0 & LUT_MASK) << 8;
    const row1 = ((y0 + 1) & LUT_MASK) << 8;
    const a = lut[row0 | ix0];
    const b = lut[row0 | ix1];
    const c = lut[row1 | ix0];
    const d = lut[row1 | ix1];
    const ab = a + (b - a) * tx;
    const cd = c + (d - c) * tx;
    return ab + (cd - ab) * ty;
  }

  private sampleNearest(lut: Float32Array, fx: number, fy: number): number {
    const ix = Math.floor(fx) & LUT_MASK;
    const iy = Math.floor(fy) & LUT_MASK;
    return lut[(iy << 8) | ix];
  }

  private sampleFbm(lut: Float32Array, bx: number, by: number): number {
    return (
      0.52 * this.sampleBilinear(lut, bx, by) +
      0.26 * this.sampleBilinear(lut, bx * 2.0 + 37.0, by * 2.0 + 91.0) +
      0.14 * this.sampleBilinear(lut, bx * 4.0 + 113.0, by * 4.0 + 53.0) +
      0.08 * this.sampleBilinear(lut, bx * 8.0 + 19.0, by * 8.0 + 173.0)
    );
  }

  private createDataTexture(
    data: Uint8Array,
    size: number,
    colorSpace: THREE.ColorSpace
  ): THREE.DataTexture {
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 8;
    tex.colorSpace = colorSpace;
    tex.needsUpdate = true;
    this.allocatedTextures.add(tex);
    return tex;
  }

  private cloneWithRepeat(baseTex: THREE.DataTexture, repeatX: number, repeatY: number): THREE.DataTexture {
    const cloned = baseTex.clone();
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.magFilter = THREE.LinearFilter;
    cloned.minFilter = THREE.LinearMipmapLinearFilter;
    cloned.generateMipmaps = true;
    cloned.anisotropy = 8;
    cloned.colorSpace = baseTex.colorSpace;
    cloned.repeat.set(repeatX, repeatY);
    cloned.needsUpdate = true;
    this.allocatedTextures.add(cloned);
    return cloned;
  }

  getTextureSet(name: PBRMaterialName): PBRTextureSet {
    const existing = this.cache.get(name);
    if (existing) {
      return existing;
    }

    const generated = this.synthesizeTextureSet(name);
    this.cache.set(name, generated);
    return generated;
  }

  createPBRMaterial(
    name: PBRMaterialName,
    options?: CreatePBRMaterialOptions
  ): THREE.MeshStandardMaterial {
    const rx = options?.repeatX ?? 1;
    const ry = options?.repeatY ?? 1;
    const defaults = MATERIAL_DEFAULTS[name];

    let texSet: PBRTextureSet;
    if (rx === 1 && ry === 1) {
      texSet = this.getTextureSet(name);
    } else {
      const key = `${name}:${rx.toFixed(4)}:${ry.toFixed(4)}`;
      const cachedRepeat = this.repeatCache.get(key);
      if (cachedRepeat) {
        texSet = cachedRepeat;
      } else {
        const base = this.getTextureSet(name);
        texSet = {
          name,
          map: this.cloneWithRepeat(base.map, rx, ry),
          normalMap: this.cloneWithRepeat(base.normalMap, rx, ry),
          roughnessMap: this.cloneWithRepeat(base.roughnessMap, rx, ry),
          metalnessMap: this.cloneWithRepeat(base.metalnessMap, rx, ry),
          emissiveMap: this.cloneWithRepeat(base.emissiveMap, rx, ry),
          bumpMap: this.cloneWithRepeat(base.bumpMap, rx, ry)
        };
        this.repeatCache.set(key, texSet);
      }
    }

    const normalScaleVal = options?.normalScale ?? defaults.normalScale;
    const emissiveIntensity = options?.emissiveIntensity ?? defaults.emissiveIntensity;

    const material = new THREE.MeshStandardMaterial({
      name: `PBR_${name}`,
      color: options?.tint !== undefined ? new THREE.Color(options.tint) : new THREE.Color(0xffffff),
      map: texSet.map,
      normalMap: texSet.normalMap,
      normalScale: new THREE.Vector2(normalScaleVal, normalScaleVal),
      roughnessMap: texSet.roughnessMap,
      roughness: options?.roughness ?? defaults.roughness,
      metalnessMap: texSet.metalnessMap,
      metalness: options?.metalness ?? defaults.metalness,
      emissiveMap: texSet.emissiveMap,
      emissive: new THREE.Color(emissiveIntensity > 0 ? 0xffffff : 0x000000),
      emissiveIntensity,
      bumpMap: texSet.bumpMap,
      bumpScale: options?.bumpScale ?? defaults.bumpScale
    });

    return material;
  }

  dispose(): void {
    for (const tex of this.allocatedTextures) {
      tex.dispose();
    }
    this.allocatedTextures.clear();
    this.cache.clear();
    this.repeatCache.clear();
  }

  private synthesizeTextureSet(name: PBRMaterialName): PBRTextureSet {
    const size = this._textureSize;
    const pixelCount = size * size;
    const byteCount = pixelCount * 4;

    const albedoData = new Uint8Array(byteCount);
    const normalData = new Uint8Array(byteCount);
    const roughnessData = new Uint8Array(byteCount);
    const metalnessData = new Uint8Array(byteCount);
    const emissiveData = new Uint8Array(byteCount);
    const bumpData = new Uint8Array(byteCount);

    if (this.scratchHeight.length !== pixelCount) {
      this.scratchHeight = new Float32Array(pixelCount);
    }
    const heightBuf = this.scratchHeight;

    const lutScale = LUT_SIZE / size;
    const invSize = 1.0 / size;
    const perlin = this.perlinLut;
    const simplex = this.simplexLut;
    const worleyF1 = this.worleyF1Lut;
    const worleyEdge = this.worleyEdgeLut;
    const worleyCell = this.worleyCellLut;

    for (let y = 0; y < size; y++) {
      const v = y * invSize;
      const by = y * lutScale;
      const rowIdx = y * size;

      for (let x = 0; x < size; x++) {
        const u = x * invSize;
        const bx = x * lutScale;
        const pIdx = rowIdx + x;
        const o = pIdx << 2;

        let r = 0.5;
        let g = 0.5;
        let b = 0.5;
        let rough = 0.7;
        let metal = 0.0;
        let emR = 0.0;
        let emG = 0.0;
        let emB = 0.0;
        let h = 0.5;

        switch (name) {
          case 'asphalt': {
            // Coarse & fine mineral aggregate + Worley distress cracks + damp sheen variation
            const macro = this.sampleFbm(perlin, bx, by);
            const micro = this.sampleBilinear(simplex, bx * 16.0, by * 16.0);
            const fineSpeck = this.sampleNearest(perlin, bx * 48.0 + y * 0.7, by * 48.0 + x * 0.3);
            const crackEdge = this.sampleBilinear(worleyEdge, bx * 2.0 + macro * 6.0, by * 2.0 + macro * 6.0);
            const subCrack = this.sampleBilinear(worleyEdge, bx * 4.0 + 31.0, by * 4.0 + 77.0);
            const crackMask =
              (1.0 - smoothstep(0.015, 0.055, crackEdge)) * 0.85 +
              (1.0 - smoothstep(0.01, 0.04, subCrack)) * 0.45;
            const wetSheen = smoothstep(0.56, 0.78, this.sampleBilinear(simplex, bx + 64.0, by + 128.0));

            const speckBright = fineSpeck > 0.78 ? (fineSpeck - 0.78) * 1.1 : 0.0;
            let baseLum = 0.13 + macro * 0.055 + (micro - 0.5) * 0.05 + speckBright;
            baseLum *= mix(1.0, 0.68, wetSheen);
            baseLum *= 1.0 - clamp01(crackMask) * 0.62;

            r = baseLum * 0.97;
            g = baseLum * 0.99;
            b = baseLum * 1.05;
            rough = clamp01(mix(0.86 - speckBright * 0.4, 0.32, wetSheen) + crackMask * 0.12);
            metal = 0.03;
            h = clamp01(0.58 + (micro - 0.5) * 0.22 + speckBright * 0.35 - crackMask * 0.48);
            break;
          }

          case 'cobblestone': {
            // Warped Worley cellular granite stones with recessed sandy mortar joints
            const warpX = (this.sampleBilinear(perlin, bx * 2.0, by * 2.0) - 0.5) * 6.5;
            const warpY = (this.sampleBilinear(simplex, bx * 2.0 + 90.0, by * 2.0 + 45.0) - 0.5) * 6.5;
            const sx = bx * 3.0 + warpX;
            const sy = by * 3.0 + warpY;

            const f1 = this.sampleBilinear(worleyF1, sx, sy);
            const edge = this.sampleBilinear(worleyEdge, sx, sy);
            const cellId = this.sampleNearest(worleyCell, sx, sy);
            const grain = this.sampleFbm(simplex, bx * 8.0, by * 8.0);

            const stoneMask = smoothstep(0.045, 0.135, edge);
            const dome = Math.sqrt(clamp01(1.0 - f1 * f1 * 1.15)) * stoneMask;

            // Per-stone mineral tint (warm granite, slate blue, basalt)
            const stoneR = mix(0.27, 0.48, cellId) + (grain - 0.5) * 0.11;
            const stoneG = mix(0.28, 0.45, clamp01(cellId * 0.85 + 0.08)) + (grain - 0.5) * 0.10;
            const stoneB = mix(0.30, 0.44, 1.0 - cellId * 0.5) + (grain - 0.5) * 0.10;

            const mortarLum = 0.19 + grain * 0.07;
            const ao = mix(0.65, 1.06, dome);
            r = mix(mortarLum * 1.04, stoneR * ao, stoneMask);
            g = mix(mortarLum * 1.00, stoneG * ao, stoneMask);
            b = mix(mortarLum * 0.92, stoneB * ao, stoneMask);

            rough = mix(0.94, 0.48 + (1.0 - dome) * 0.26, stoneMask);
            metal = mix(0.0, 0.05, stoneMask);
            h = clamp01(0.12 + dome * 0.78 + (grain - 0.5) * 0.08);
            break;
          }

          case 'facade_brick': {
            // Running-bond masonry brick courses + 4x4 architectural window grid with lit interiors
            const cols = 4.0;
            const rows = 4.0;
            const cellU = (u * cols) % 1.0;
            const cellV = (v * rows) % 1.0;
            const winCol = Math.floor(u * cols);
            const winRow = Math.floor(v * rows);

            const inWindowX = cellU > 0.20 && cellU < 0.80;
            const inWindowY = cellV > 0.18 && cellV < 0.78;
            const inSill = cellU > 0.16 && cellU < 0.84 && cellV >= 0.13 && cellV <= 0.18;
            const inLintel = cellU > 0.16 && cellU < 0.84 && cellV >= 0.78 && cellV <= 0.84;

            const micro = this.sampleFbm(perlin, bx * 6.0, by * 6.0);

            if (inWindowX && inWindowY) {
              const wx = (cellU - 0.20) / 0.60;
              const wy = (cellV - 0.18) / 0.60;
              const mullion =
                wx < 0.055 ||
                wx > 0.945 ||
                wy < 0.055 ||
                wy > 0.945 ||
                Math.abs(wx - 0.5) < 0.025 ||
                Math.abs(wy - 0.58) < 0.025;

              if (mullion) {
                r = 0.14;
                g = 0.15;
                b = 0.17;
                rough = 0.42;
                metal = 0.65;
                h = 0.34;
              } else {
                const roomSeed = hash2i(winCol + 17, winRow + 53);
                const lit = roomSeed > 0.42;
                const curtain = 0.75 + 0.25 * Math.sin(wx * Math.PI * 6.0);
                const ceilingGrad = 0.55 + 0.45 * wy;

                r = 0.07 + micro * 0.03;
                g = 0.10 + micro * 0.03;
                b = 0.15 + micro * 0.04;
                rough = 0.11;
                metal = 0.32;
                h = 0.16;

                if (lit) {
                  const warm = roomSeed > 0.68;
                  const glow = ceilingGrad * curtain * (0.65 + 0.35 * micro);
                  emR = warm ? glow * 1.0 : glow * 0.72;
                  emG = warm ? glow * 0.76 : glow * 0.86;
                  emB = warm ? glow * 0.42 : glow * 1.0;
                }
              }
            } else if (inSill || inLintel) {
              // Limestone sill & lintel trim
              const stone = 0.54 + (micro - 0.5) * 0.12;
              r = stone * 1.03;
              g = stone * 0.99;
              b = stone * 0.92;
              rough = 0.78;
              metal = 0.02;
              h = 0.78;
            } else {
              // Staggered running-bond brick courses (32 rows, 16 bricks/row)
              const brickRows = 32.0;
              const brickCols = 16.0;
              const bv = v * brickRows;
              const bRow = Math.floor(bv);
              const stagger = (bRow & 1) * 0.5;
              const bu = u * brickCols + stagger;
              const bCol = Math.floor(bu);
              const fu = bu - bCol;
              const fv = bv - bRow;

              const mortar =
                1.0 -
                smoothstep(0.04, 0.09, Math.min(fu, 1.0 - fu)) *
                  smoothstep(0.07, 0.15, Math.min(fv, 1.0 - fv));

              const brickVar = hash2i(bCol & 15, bRow & 31);
              const kiln = this.sampleBilinear(simplex, bx * 10.0, by * 10.0);
              const brickR = mix(0.42, 0.64, brickVar) + (kiln - 0.5) * 0.10;
              const brickG = mix(0.18, 0.29, brickVar) + (kiln - 0.5) * 0.06;
              const brickB = mix(0.13, 0.21, brickVar) + (kiln - 0.5) * 0.05;

              const mortarCol = 0.48 + (micro - 0.5) * 0.10;
              r = mix(brickR, mortarCol, mortar);
              g = mix(brickG, mortarCol * 0.97, mortar);
              b = mix(brickB, mortarCol * 0.93, mortar);
              rough = mix(0.82, 0.95, mortar);
              metal = 0.02;
              h = mix(0.62 + (kiln - 0.5) * 0.14, 0.28, mortar);
            }
            break;
          }

          case 'facade_glass': {
            // Skyscraper curtain-wall mullions + reflective teal-blue architectural glass + office light bands
            const cols = 8.0;
            const rows = 8.0;
            const cu = u * cols;
            const cv = v * rows;
            const colId = Math.floor(cu);
            const rowId = Math.floor(cv);
            const fu = cu - colId;
            const fv = cv - rowId;

            const isMullionX = fu < 0.055 || fu > 0.945;
            const isSpandrelY = fv < 0.14 || fv > 0.95;
            const shimmer = this.sampleBilinear(perlin, bx * 3.0, by * 3.0);

            if (isMullionX || isSpandrelY) {
              const brushed = this.sampleBilinear(simplex, bx * 24.0, by * 4.0);
              const frameLum = (isMullionX ? 0.22 : 0.14) + (brushed - 0.5) * 0.04;
              r = frameLum * 0.95;
              g = frameLum * 1.0;
              b = frameLum * 1.08;
              rough = isMullionX ? 0.26 : 0.36;
              metal = 0.88;
              h = isMullionX ? 0.76 : 0.56;
            } else {
              const officeSeed = hash2i(colId, rowId);
              const paneTint = 0.88 + 0.24 * officeSeed;
              const grad = 0.75 + 0.25 * fv + (shimmer - 0.5) * 0.08;
              r = 0.06 * paneTint * grad;
              g = 0.15 * paneTint * grad;
              b = 0.22 * paneTint * grad;
              rough = 0.07 + shimmer * 0.04;
              metal = 0.28;
              h = 0.35 + (shimmer - 0.5) * 0.03;

              // Ceiling LED strips & lit office interiors
              if (officeSeed > 0.36) {
                const strip = smoothstep(0.68, 0.86, fv) * (0.55 + 0.45 * Math.sin(fu * Math.PI));
                const ambientRoom = (0.22 + 0.28 * fv) * (0.7 + 0.3 * shimmer);
                const lum = strip * 0.85 + ambientRoom * 0.45;
                if (officeSeed > 0.74) {
                  emR = lum * 1.0;
                  emG = lum * 0.82;
                  emB = lum * 0.55;
                } else {
                  emR = lum * 0.68;
                  emG = lum * 0.88;
                  emB = lum * 1.0;
                }
              }
            }
            break;
          }

          case 'bark': {
            // Anisotropic vertical Perlin/FBM bark fissures + pale green-grey lichen patches
            const warp = (this.sampleBilinear(perlin, bx * 2.0, by * 1.0) - 0.5) * 8.0;
            const ridgeA = Math.abs(this.sampleBilinear(perlin, bx * 10.0 + warp, by * 2.0) - 0.5) * 2.0;
            const ridgeB = Math.abs(this.sampleBilinear(simplex, bx * 20.0 + warp * 0.5, by * 4.0) - 0.5) * 2.0;
            const fineGrain = this.sampleBilinear(perlin, bx * 32.0, by * 8.0);
            const furrow = clamp01(ridgeA * 0.65 + ridgeB * 0.35);

            const lichenNoise = this.sampleBilinear(worleyF1, bx * 3.0 + 21.0, by * 3.0 + 65.0);
            const lichenMask =
              smoothstep(0.66, 0.82, this.sampleBilinear(simplex, bx * 2.0, by * 2.0)) *
              (1.0 - smoothstep(0.18, 0.42, lichenNoise));

            const barkR = mix(0.13, 0.36, furrow) + (fineGrain - 0.5) * 0.06;
            const barkG = mix(0.09, 0.26, furrow) + (fineGrain - 0.5) * 0.05;
            const barkB = mix(0.07, 0.19, furrow) + (fineGrain - 0.5) * 0.04;

            r = mix(barkR, 0.44, lichenMask);
            g = mix(barkG, 0.52, lichenMask);
            b = mix(barkB, 0.38, lichenMask);
            rough = mix(0.93 - furrow * 0.08, 0.88, lichenMask);
            metal = 0.0;
            h = clamp01(furrow * 0.82 + fineGrain * 0.12 + lichenMask * 0.08);
            break;
          }

          case 'foliage': {
            // Layered leaf clusters with central midrib/vein ridges & waxy cuticle sheen
            const leafWarpX = (this.sampleBilinear(perlin, bx * 2.0, by * 2.0) - 0.5) * 5.0;
            const leafWarpY = (this.sampleBilinear(simplex, bx * 2.0 + 40.0, by * 2.0 + 80.0) - 0.5) * 5.0;
            const lf1 = this.sampleBilinear(worleyF1, bx * 4.0 + leafWarpX, by * 4.0 + leafWarpY);
            const lEdge = this.sampleBilinear(worleyEdge, bx * 4.0 + leafWarpX, by * 4.0 + leafWarpY);
            const lCell = this.sampleNearest(worleyCell, bx * 4.0 + leafWarpX, by * 4.0 + leafWarpY);
            const vein = 1.0 - smoothstep(0.0, 0.08, Math.abs(lf1 - 0.22));
            const subCanopy = this.sampleFbm(simplex, bx * 6.0, by * 6.0);

            const clusterShade = smoothstep(0.02, 0.24, lEdge) * (0.65 + 0.35 * (1.0 - lf1));
            r = (0.09 + lCell * 0.11 + vein * 0.07 + subCanopy * 0.06) * clusterShade;
            g = (0.28 + lCell * 0.22 + vein * 0.11 + subCanopy * 0.10) * clusterShade;
            b = (0.07 + lCell * 0.07 + subCanopy * 0.04) * clusterShade;

            rough = clamp01(0.44 + (1.0 - clusterShade) * 0.32 - vein * 0.08);
            metal = 0.0;
            h = clamp01(clusterShade * 0.72 + vein * 0.18 + (subCanopy - 0.5) * 0.12);
            break;
          }

          case 'rock': {
            // Fractured granite/alpine cliff strata combining Simplex bands + Worley cleavage planes
            const fbm = this.sampleFbm(simplex, bx * 2.0, by * 2.0);
            const strata = Math.sin((v * 6.0 + fbm * 1.45) * Math.PI * 2.0) * 0.5 + 0.5;
            const wf1 = this.sampleBilinear(worleyF1, bx * 3.0 + fbm * 10.0, by * 3.0 + fbm * 10.0);
            const wEdge = this.sampleBilinear(worleyEdge, bx * 3.0 + fbm * 10.0, by * 3.0 + fbm * 10.0);
            const fine = this.sampleBilinear(perlin, bx * 24.0, by * 24.0);

            const fissure = 1.0 - smoothstep(0.015, 0.075, wEdge);
            const facet = clamp01((1.0 - wf1 * 0.75) * 0.55 + strata * 0.25 + fbm * 0.20);
            const quartz = fine > 0.76 ? (fine - 0.76) * 0.85 : 0.0;

            const rockLum = (0.26 + facet * 0.32 + quartz) * (1.0 - fissure * 0.58);
            r = rockLum * (0.98 + strata * 0.05);
            g = rockLum * 0.99;
            b = rockLum * (1.03 - strata * 0.04);

            rough = clamp01(0.76 - quartz * 0.45 + fissure * 0.18 + (0.5 - fine) * 0.12);
            metal = clamp01(0.03 + quartz * 0.18);
            h = clamp01(facet * 0.82 + (fine - 0.5) * 0.14 - fissure * 0.42);
            break;
          }

          case 'sand': {
            // Asymmetric wind-rippled dunes + fine golden mineral grains + silica crystal sparkles
            const duneWarp = this.sampleFbm(perlin, bx * 2.0, by * 2.0);
            const ripplePhase = (v * 18.0 + u * 2.0 + (duneWarp - 0.5) * 2.2) * Math.PI * 2.0;
            // Asymmetric eolian ripple crest
            const ripple = 0.5 + 0.5 * Math.sin(ripplePhase + 0.38 * Math.sin(ripplePhase));
            const grain = this.sampleBilinear(simplex, bx * 32.0, by * 32.0);
            const sparkleHash = hash2i(x * 3 + 11, y * 7 + 29);
            const silica = sparkleHash > 0.985 ? (sparkleHash - 0.985) / 0.015 : 0.0;

            const shade = 0.84 + ripple * 0.16 + (grain - 0.5) * 0.08 + (duneWarp - 0.5) * 0.08;
            r = clamp01(0.78 * shade + silica * 0.20);
            g = clamp01(0.66 * shade + silica * 0.20);
            b = clamp01(0.47 * shade + silica * 0.22);

            rough = clamp01(0.80 - ripple * 0.06 - silica * 0.64);
            metal = silica * 0.25;
            h = clamp01(0.32 + ripple * 0.46 + (grain - 0.5) * 0.12);
            break;
          }

          case 'rust': {
            // Oxidized corroded iron crusts with exposed brushed steel streaks
            const corrFbm = this.sampleFbm(perlin, bx * 2.0, by * 2.0);
            const streak = this.sampleBilinear(simplex, bx * 2.0, by * 16.0);
            const pits = this.sampleBilinear(worleyF1, bx * 6.0, by * 6.0);
            const rustMask = smoothstep(0.38, 0.62, corrFbm * 0.72 + (1.0 - streak) * 0.28);
            const deepOxide = smoothstep(0.58, 0.84, corrFbm + pits * 0.22);

            // Exposed gunmetal steel
            const steelLum = 0.48 + (streak - 0.5) * 0.18;
            const steelR = steelLum * 0.96;
            const steelG = steelLum * 0.99;
            const steelB = steelLum * 1.05;

            // Multi-stage iron oxide (bright orange-ochre -> dark maroon-umber)
            const rustR = mix(0.72, 0.34, deepOxide);
            const rustG = mix(0.31, 0.13, deepOxide);
            const rustB = mix(0.11, 0.07, deepOxide);

            r = mix(steelR, rustR, rustMask);
            g = mix(steelG, rustG, rustMask);
            b = mix(steelB, rustB, rustMask);

            rough = mix(0.26 + (1.0 - streak) * 0.12, 0.89 + pits * 0.08, rustMask);
            metal = mix(0.90, 0.06, rustMask);
            h = clamp01(mix(0.62 + (streak - 0.5) * 0.08, 0.38 - pits * 0.24, rustMask));
            break;
          }

          case 'ship_wood': {
            // Planked weathered naval oak: 8 planks, caulked tar seams, staggered butt joints & nail heads
            const plankCount = 8.0;
            const pv = v * plankCount;
            const plankIdx = Math.floor(pv);
            const plankFracY = pv - plankIdx;

            const buttOffset = hash2i(plankIdx & 7, 99);
            const pu = (u + buttOffset) % 1.0;

            const seamY = 1.0 - smoothstep(0.025, 0.065, Math.min(plankFracY, 1.0 - plankFracY));
            const seamX = 1.0 - smoothstep(0.004, 0.012, Math.min(pu, 1.0 - pu));
            const caulk = Math.max(seamY, seamX);

            // Paired brass/iron nail heads near plank butt ends
            const nailU = Math.min(Math.abs(pu - 0.032), Math.abs(pu - 0.968));
            const nailV = Math.min(Math.abs(plankFracY - 0.26), Math.abs(plankFracY - 0.74));
            const nailDist = Math.hypot(nailU * 14.0, nailV * 2.2);
            const nailMask = 1.0 - smoothstep(0.09, 0.16, nailDist);

            // Stretched wood grain rings & knots
            const plankSeed = hash2i(plankIdx & 7, 13);
            const knot = this.sampleBilinear(worleyF1, bx * 1.0 + plankSeed * 40.0, by * 2.0);
            const knotDeflect = (1.0 - smoothstep(0.05, 0.32, knot)) * 3.2;
            const grainNoise = this.sampleBilinear(perlin, bx * 2.0 + plankSeed * 100.0, by * 20.0 + knotDeflect * 8.0);
            const rings = Math.sin((plankFracY * 9.0 + grainNoise * 3.5 + knotDeflect) * Math.PI * 2.0) * 0.5 + 0.5;
            const fineFiber = this.sampleBilinear(simplex, bx * 32.0, by * 4.0);

            const plankTone = 0.85 + plankSeed * 0.30;
            const woodR = (0.34 + rings * 0.14 + (fineFiber - 0.5) * 0.05) * plankTone;
            const woodG = (0.23 + rings * 0.10 + (fineFiber - 0.5) * 0.04) * plankTone;
            const woodB = (0.14 + rings * 0.06 + (fineFiber - 0.5) * 0.03) * plankTone;

            r = mix(woodR, 0.06, caulk);
            g = mix(woodG, 0.055, caulk);
            b = mix(woodB, 0.05, caulk);

            if (nailMask > 0.01) {
              r = mix(r, 0.32, nailMask);
              g = mix(g, 0.29, nailMask);
              b = mix(b, 0.24, nailMask);
            }

            rough = mix(mix(0.68 - rings * 0.10, 0.92, caulk), 0.34, nailMask);
            metal = mix(0.0, 0.84, nailMask);
            h = clamp01(mix(0.58 + rings * 0.14 + (fineFiber - 0.5) * 0.08, 0.14, caulk) + nailMask * 0.22);
            break;
          }

          case 'carbon': {
            // 2x2 diagonal carbon-fiber twill weave + subtle hex structural accents
            const weaveCells = 64.0;
            const wu = u * weaveCells;
            const wv = v * weaveCells;
            const iu = Math.floor(wu);
            const iv = Math.floor(wv);
            const fu = wu - iu;
            const fv = wv - iv;

            // 2x2 diagonal twill: warp thread goes over 2, under 2 with diagonal shift
            const phase = (iu + iv) & 3;
            const isWarp = phase < 2;

            const threadProfile = isWarp
              ? Math.sin(fu * Math.PI) * (0.85 + 0.15 * Math.sin(fv * Math.PI * 0.5))
              : Math.sin(fv * Math.PI) * (0.85 + 0.15 * Math.sin(fu * Math.PI * 0.5));

            const microStrand = isWarp
              ? Math.sin(fu * Math.PI * 10.0) * 0.04
              : Math.sin(fv * Math.PI * 10.0) * 0.04;

            // Subtle honeycomb hex reinforcement under-layer
            const hexEdge = this.sampleBilinear(worleyEdge, bx * 4.0, by * 4.0);
            const hexAccent = (1.0 - smoothstep(0.02, 0.07, hexEdge)) * 0.06;

            // Anisotropic directional reflectance shift between warp & weft tows
            const anisoTint = isWarp ? 1.16 : 0.84;
            const lum = (0.055 + threadProfile * 0.095 + microStrand) * anisoTint + hexAccent;

            r = lum * 0.96;
            g = lum * 1.00;
            b = lum * 1.08;
            rough = clamp01((isWarp ? 0.20 : 0.34) + (1.0 - threadProfile) * 0.18);
            metal = clamp01(0.52 + threadProfile * 0.18);
            h = clamp01(0.25 + threadProfile * 0.62 + microStrand + hexAccent);
            break;
          }
        }

        heightBuf[pIdx] = h;

        albedoData[o] = toByte(r);
        albedoData[o + 1] = toByte(g);
        albedoData[o + 2] = toByte(b);
        albedoData[o + 3] = 255;

        const rByte = toByte(rough);
        roughnessData[o] = rByte;
        roughnessData[o + 1] = rByte;
        roughnessData[o + 2] = rByte;
        roughnessData[o + 3] = 255;

        const mByte = toByte(metal);
        metalnessData[o] = mByte;
        metalnessData[o + 1] = mByte;
        metalnessData[o + 2] = mByte;
        metalnessData[o + 3] = 255;

        emissiveData[o] = toByte(emR);
        emissiveData[o + 1] = toByte(emG);
        emissiveData[o + 2] = toByte(emB);
        emissiveData[o + 3] = 255;

        const hByte = toByte(h);
        bumpData[o] = hByte;
        bumpData[o + 1] = hByte;
        bumpData[o + 2] = hByte;
        bumpData[o + 3] = 255;
      }
    }

    // Wrapped 3x3 Sobel normal generation from heightBuf
    const mask = size - 1;
    const sobelStrength = MATERIAL_DEFAULTS[name].sobelStrength;

    for (let y = 0; y < size; y++) {
      const ym = ((y - 1) & mask) * size;
      const yc = y * size;
      const yp = ((y + 1) & mask) * size;

      for (let x = 0; x < size; x++) {
        const xm = (x - 1) & mask;
        const xp = (x + 1) & mask;

        const tl = heightBuf[ym + xm];
        const tc = heightBuf[ym + x];
        const tr = heightBuf[ym + xp];
        const ml = heightBuf[yc + xm];
        const mr = heightBuf[yc + xp];
        const bl = heightBuf[yp + xm];
        const bc = heightBuf[yp + x];
        const br = heightBuf[yp + xp];

        const dX = (tr + 2.0 * mr + br - (tl + 2.0 * ml + bl)) * sobelStrength;
        const dY = (bl + 2.0 * bc + br - (tl + 2.0 * tc + tr)) * sobelStrength;

        const nx = -dX;
        const ny = -dY;
        const nz = 1.0;
        const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

        const o = (yc + x) << 2;
        normalData[o] = toByte(nx * invLen * 0.5 + 0.5);
        normalData[o + 1] = toByte(ny * invLen * 0.5 + 0.5);
        normalData[o + 2] = toByte(nz * invLen * 0.5 + 0.5);
        normalData[o + 3] = 255;
      }
    }

    return {
      name,
      map: this.createDataTexture(albedoData, size, THREE.SRGBColorSpace),
      normalMap: this.createDataTexture(normalData, size, THREE.NoColorSpace),
      roughnessMap: this.createDataTexture(roughnessData, size, THREE.NoColorSpace),
      metalnessMap: this.createDataTexture(metalnessData, size, THREE.NoColorSpace),
      emissiveMap: this.createDataTexture(emissiveData, size, THREE.SRGBColorSpace),
      bumpMap: this.createDataTexture(bumpData, size, THREE.NoColorSpace)
    };
  }
}
