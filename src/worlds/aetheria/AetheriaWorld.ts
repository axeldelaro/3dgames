import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  WORLD_CATALOG,
  type AvatarAnimState,
  type EngineContext,
  type EquippedToolType,
  type MinimapMarker,
  type NetWorldEventPacket,
  type RadialWheelItem,
  type WorldInterface
} from '../../core/types';
import { ProceduralNoise, SeededRandom } from '../../core/math/Noise';
import {
  applyWindSwayToMaterial,
  createCelToonMaterial,
  createGerstnerOceanMaterial,
  createOutlineMaterial,
  updateCelToonMaterial,
  updateOceanMaterial
} from '../../core/graphics/Shaders';

type CelToonMaterial = ReturnType<typeof createCelToonMaterial>;
type OceanMaterial = ReturnType<typeof createGerstnerOceanMaterial>;

interface SkyIslandSpec {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

interface ShrineSpec {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  activated: boolean;
  coreMesh: THREE.Mesh;
  runeMat: THREE.MeshStandardMaterial;
}

interface ThermalUpdraft {
  id: string;
  x: number;
  baseY: number;
  z: number;
  radius: number;
  height: number;
  permanent: boolean;
  remaining: number;
  maxDuration: number;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  firePatch?: boolean;
}

interface CryoPillar {
  id: string;
  x: number;
  z: number;
  topY: number;
  baseY: number;
  radius: number;
  age: number;
  maxAge: number;
  riseProgress: number;
  group: THREE.Group;
  colliderMesh: THREE.Mesh;
}

interface ActiveProjectile {
  kind: 'arrow' | 'fire' | 'ice';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  power: number;
  fromRemote: boolean;
  mesh: THREE.Group;
}

interface StoneGuardian {
  id: string;
  homeX: number;
  homeZ: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  freezeTimer: number;
  hitFlash: number;
  attackCooldown: number;
  respawnTimer: number;
  skyIslandIndex: number; // -1 for ground
  root: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  veinMat: THREE.MeshStandardMaterial;
  iceShell: THREE.Mesh;
}

interface ShockwaveEffect {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  age: number;
  duration: number;
  maxRadius: number;
}

interface ParticleSlot {
  active: boolean;
  kind: 'fire' | 'wind' | 'mist' | 'ice';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  color: THREE.Color;
}

const WATER_LEVEL = 4.2;
const WORLD_HALF = 330;
const TRAIL_SAMPLES = 30;
const MAX_PARTICLES = 360;

export class AetheriaWorld implements WorldInterface {
  public readonly id = 'aetheria' as const;
  public readonly metadata = WORLD_CATALOG[4];

  private ctx!: EngineContext;
  private readonly noise = new ProceduralNoise(50771);
  private readonly worldGroup = new THREE.Group();

  // Tracked materials & geometries for update & clean GPU disposal
  private readonly celMaterials: CelToonMaterial[] = [];
  private windController: { update(time: number): void } | null = null;
  private skyCrystalInst: THREE.InstancedMesh | null = null;
  private oceanMat: OceanMaterial | null = null;
  private grassMat: THREE.ShaderMaterial | null = null;
  private waterfallMat: THREE.ShaderMaterial | null = null;
  private swordTrailMat: THREE.ShaderMaterial | null = null;

  // Grass instancing & scorch tracking
  private grassMesh: THREE.InstancedMesh | null = null;
  private grassCoords: Float32Array = new Float32Array(0);
  private grassCount = 0;

  // Colliders for camera & 360° free climbing
  private readonly cameraColliders: THREE.Object3D[] = [];
  private readonly climbableColliders: THREE.Object3D[] = [];
  private readonly raycaster = new THREE.Raycaster();

  // Landmarks & dynamic entities
  private readonly skyIslands: SkyIslandSpec[] = [
    { id: 'sky_1', name: 'Arche Boréale', x: -52, y: 48, z: -16, radius: 17 },
    { id: 'sky_2', name: 'Bastion Céleste', x: 50, y: 66, z: -64, radius: 19 },
    { id: 'sky_3', name: 'Jardin Suspendu', x: -38, y: 85, z: -116, radius: 18 },
    { id: 'sky_4', name: 'Sanctuaire Souverain', x: 8, y: 106, z: -78, radius: 24 }
  ];
  private readonly shrines: ShrineSpec[] = [];
  private readonly updrafts: ThermalUpdraft[] = [];
  private readonly cryoPillars: CryoPillar[] = [];
  private readonly projectiles: ActiveProjectile[] = [];
  private readonly guardians: StoneGuardian[] = [];
  private readonly shockwaves: ShockwaveEffect[] = [];

  // GPU Instanced particle pool (fire embers, wind motes, waterfall mist, frost shards)
  private particleMesh: THREE.InstancedMesh | null = null;
  private readonly particles: ParticleSlot[] = [];

  // Sword luminescent ribbon trail
  private swordTrailMesh: THREE.Mesh | null = null;
  private swordTrailGeo: THREE.BufferGeometry | null = null;
  private readonly trailBaseHistory: THREE.Vector3[] = [];
  private readonly trailTipHistory: THREE.Vector3[] = [];
  private readonly trailTimeHistory: number[] = [];

  // Bow draw visual indicator attached near avatar
  private bowChargeGroup: THREE.Group | null = null;
  private bowDrawRatio = 0;
  private bowDrawing = false;

  // Player state
  private readonly playerPos = new THREE.Vector3(0, 18, 46);
  private readonly playerVel = new THREE.Vector3();
  private playerYaw = Math.PI;
  private onGround = true;
  private isClimbing = false;
  private climbExhausted = false;
  private readonly climbNormal = new THREE.Vector3(0, 0, 1);
  private climbCooldown = 0;
  private isGliding = false;
  private stamina = 1.0;
  private health = 1.0;
  private credits = 100;
  private equippedWeapon: EquippedToolType = 'sword';

  // Combat combo & timers
  private comboStep = 0;
  private comboResetTimer = 0;
  private slashTimer = 0;
  private slashDuration = 0.34;
  private prevSlashProgress = 0;
  private spellCooldown = 0;
  private footstepTimer = 0;
  private fireSpawnAcc = 0;
  private telemetryAcc = 0;
  private netSyncAcc = 0;
  private firstFireThermalNotified = false;
  private estimatedDrawCalls = 42;
  private estimatedTriangles = 148000;

  // Reusable math scratchpad
  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpVecB = new THREE.Vector3();
  private readonly tmpVecC = new THREE.Vector3();
  private readonly tmpDummy = new THREE.Object3D();
  private readonly tmpColor = new THREE.Color();

  private keydownHandler: ((ev: KeyboardEvent) => void) | null = null;

  public async load(ctx: EngineContext): Promise<void> {
    this.ctx = ctx;
    this.worldGroup.name = 'AetheriaWorldRoot';
    this.ctx.scene.add(this.worldGroup);

    // Configure sunny stylized anime sky & soundscape
    this.ctx.sky.setSpaceBlend(0);
    this.ctx.sky.setTimeOfDay(10.6);
    this.ctx.sky.setWeather('clear', 0);
    this.ctx.input.setContextMode('ON_FOOT');

    // Build stylized fantasy kingdom in batched / instanced passes (< 50 draw calls)
    this.buildHighlandTerrain();
    this.buildLakeAndCascadingWaterfall();
    this.buildFloatingSkyRuins();
    this.buildAncientShrinesAndRunePillars();
    this.buildStylizedTreesAndBoulders();
    this.buildInstancedEmeraldGrass();
    this.buildPermanentThermalUpdrafts();
    this.buildCorruptedStoneGuardians();
    this.buildParticleSystem();
    this.buildSwordTrailRibbon();
    this.buildBowChargeVisual();

    // Place local avatar on scenic overlook facing Lake Aetheria, Waterfall & Sky Ruins
    const spawnX = 0;
    const spawnZ = 48;
    const spawnY = this.sampleTerrainHeight(spawnX, spawnZ);
    this.playerPos.set(spawnX, spawnY, spawnZ);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = Math.PI;

    this.ctx.localAvatar.root.visible = true;
    this.ctx.localAvatar.root.position.copy(this.playerPos);
    this.ctx.localAvatar.root.rotation.set(0, this.playerYaw, 0);
    this.ctx.localAvatar.setParagliderVisible(false);
    this.ctx.localAvatar.setJetpackFlame(0);
    this.selectWeapon('sword', false);

    this.setupUIAndBindings();
    this.computeSceneMetrics();
  }

  // ============================================================================
  // PROCEDURAL TOPOGRAPHY (Highlands, Lake Basin, Sheer Cliffs & Shrine Plazas)
  // ============================================================================

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  private sampleTerrainHeight(x: number, z: number): number {
    // Base rolling emerald highlands
    const rolling =
      10.5 +
      this.noise.fbm2D(x * 0.0045, z * 0.0045, 4) * 14.0 +
      this.noise.simplex2D(x * 0.014, z * 0.014) * 2.6;

    let h = rolling;

    // Central-north shimmering Lake Aetheria basin around (0, -56)
    const lakeDist = Math.hypot((x - 0) * 0.88, z + 56);
    const lakeCarve = 1.0 - this.smoothstep(42, 86, lakeDist);
    h -= lakeCarve * 14.8;

    // Northern sheer limestone cliff wall & upper waterfall lagoon (z < -124)
    const northEscarpment = this.smoothstep(-116, -138, z);
    const ridgeDetail = this.noise.ridged2D(x * 0.008, z * 0.008, 4) * 9.0;
    h += northEscarpment * (32.5 + ridgeDetail);

    // Carve upper waterfall river channel feeding the cascade at (0, -125..-178)
    if (z < -118 && z > -186) {
      const channelFactor =
        (1.0 - this.smoothstep(7.5, 19.0, Math.abs(x))) *
        this.smoothstep(-118, -132, z) *
        (1.0 - this.smoothstep(-172, -186, z));
      h = THREE.MathUtils.lerp(h, 42.4, channelFactor * 0.92);
    }

    // Dramatic stepped climbable limestone crags on West & East flanks
    const flankDist = Math.abs(x);
    if (flankDist > 92) {
      const cragMask = this.smoothstep(92, 148, flankDist);
      const rawStep = (this.noise.fbm2D(x * 0.007 + 3.1, z * 0.007, 4) + 0.55) * 38.0;
      const quantized = Math.floor(rawStep / 11.0) * 11.0 + this.smoothstep(0.65, 0.95, (rawStep % 11.0) / 11.0) * 11.0;
      h += cragMask * Math.max(0, quantized);
    }

    // Flatten scenic spawn overlook meadow around (0, 48)
    const spawnDist = Math.hypot(x, z - 48);
    const spawnFlat = 1.0 - this.smoothstep(14, 34, spawnDist);
    h = THREE.MathUtils.lerp(h, 14.5, spawnFlat * 0.85);

    // Flatten 3 Ancient Shrine plazas
    const shrineCoords: ReadonlyArray<readonly [number, number, number]> = [
      [-118, -35, 22.0],
      [124, -42, 24.5],
      [0, -196, 46.5]
    ];
    for (const [sx, sz, sy] of shrineCoords) {
      const d = Math.hypot(x - sx, z - sz);
      if (d < 28) {
        const blend = 1.0 - this.smoothstep(11, 28, d);
        h = THREE.MathUtils.lerp(h, sy, blend);
      }
    }

    // Outer mountain rim enclosure
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    if (edgeDist > WORLD_HALF - 45) {
      const rim = this.smoothstep(WORLD_HALF - 45, WORLD_HALF, edgeDist);
      h += rim * 48.0;
    }

    return h;
  }

  private sampleTerrainNormal(x: number, z: number, target = new THREE.Vector3()): THREE.Vector3 {
    const eps = 0.85;
    const hL = this.sampleTerrainHeight(x - eps, z);
    const hR = this.sampleTerrainHeight(x + eps, z);
    const hD = this.sampleTerrainHeight(x, z - eps);
    const hU = this.sampleTerrainHeight(x, z + eps);
    return target.set(hL - hR, 2 * eps, hD - hU).normalize();
  }

  /**
   * Returns highest walkable floor Y at (x, z) including terrain, Floating Sky Ruins, and Cryo Ice Pillars.
   */
  private sampleWalkableSupport(x: number, z: number, currentY: number): { y: number; surface: 'grass' | 'rock' | 'wood' | 'sand' | 'snow' } {
    const terrainY = this.sampleTerrainHeight(x, z);
    const n = this.sampleTerrainNormal(x, z, this.tmpVecC);
    let bestY = terrainY;
    let surface: 'grass' | 'rock' | 'wood' | 'sand' | 'snow' =
      terrainY < WATER_LEVEL + 0.9 ? 'sand' : n.y < 0.75 ? 'rock' : 'grass';

    // Floating Sky Ruins flat grass/stone decks
    for (const isl of this.skyIslands) {
      const d = Math.hypot(x - isl.x, z - isl.z);
      if (d <= isl.radius - 0.35 && currentY >= isl.y - 2.6) {
        if (isl.y > bestY) {
          bestY = isl.y;
          surface = d < isl.radius * 0.55 ? 'rock' : 'grass';
        }
      }
    }

    // Conjured Cryo Ice Pillars on Lake Aetheria
    for (const p of this.cryoPillars) {
      const d = Math.hypot(x - p.x, z - p.z);
      const effectiveTop = THREE.MathUtils.lerp(p.baseY, p.topY, p.riseProgress);
      if (d <= p.radius + 0.18 && currentY >= effectiveTop - 1.8) {
        if (effectiveTop > bestY) {
          bestY = effectiveTop;
          surface = 'snow';
        }
      }
    }

    return { y: bestY, surface };
  }

  // ============================================================================
  // GEOMETRY MERGING & CEL-TOON HELPERS
  // ============================================================================

  private registerCelMaterial(
    color: THREE.ColorRepresentation,
    options?: { rimColor?: THREE.ColorRepresentation; steps?: number; windSway?: number }
  ): CelToonMaterial {
    const mat = createCelToonMaterial(color, options ?? {});
    this.celMaterials.push(mat);
    return mat;
  }

  private mergeGeometryParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (parts.length === 0) return new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const normalized: THREE.BufferGeometry[] = [];
    for (const raw of parts) {
      const g = raw.index ? raw.toNonIndexed() : raw.clone();
      if (g.hasAttribute('tangent')) g.deleteAttribute('tangent');
      if (!g.hasAttribute('uv')) {
        const count = g.getAttribute('position').count;
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      normalized.push(g);
      raw.dispose();
    }
    const merged = mergeGeometries(normalized, false);
    for (const g of normalized) g.dispose();
    merged.computeBoundingSphere();
    return merged;
  }

  private addCelOutlinedBatch(
    geo: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    outlineThickness = 0.038,
    climbable = false,
    cameraBlock = false
  ): THREE.Mesh {
    const celMat = this.registerCelMaterial(color);
    const mesh = new THREE.Mesh(geo, celMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.worldGroup.add(mesh);

    const outlineMat = createOutlineMaterial(outlineThickness, 0x171326);
    const outlineMesh = new THREE.Mesh(geo, outlineMat);
    outlineMesh.frustumCulled = true;
    this.worldGroup.add(outlineMesh);

    if (climbable) this.climbableColliders.push(mesh);
    if (cameraBlock) this.cameraColliders.push(mesh);
    return mesh;
  }

  // ============================================================================
  // WORLD CONSTRUCTION
  // ============================================================================

  private buildHighlandTerrain(): void {
    const segs = 208;
    const size = WORLD_HALF * 2;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);

    const colSand = new THREE.Color(0xe6d39c);
    const colMeadow = new THREE.Color(0x3eb95f);
    const colLush = new THREE.Color(0x6bd654);
    const colGoldPath = new THREE.Color(0xc5b874);
    const colCliff = new THREE.Color(0xcbc4b4);
    const colCliffDark = new THREE.Color(0x88837a);
    const tmpN = new THREE.Vector3();
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.sampleTerrainHeight(x, z);
      pos.setY(i, y);

      this.sampleTerrainNormal(x, z, tmpN);
      const slope = 1.0 - tmpN.y;
      const meadowVar = this.noise.fbm2D(x * 0.025, z * 0.025, 3) * 0.5 + 0.5;

      if (y < WATER_LEVEL + 1.0) {
        c.copy(colSand).lerp(colMeadow, this.smoothstep(WATER_LEVEL + 0.1, WATER_LEVEL + 1.0, y));
      } else if (slope > 0.24) {
        const strata = Math.sin(y * 0.65 + this.noise.simplex2D(x * 0.04, z * 0.04) * 1.5) * 0.5 + 0.5;
        c.copy(colCliffDark).lerp(colCliff, strata);
      } else {
        c.copy(colMeadow).lerp(colLush, meadowVar);
        // Subtle pilgrim stone paths radiating toward shrines
        const pathWave = Math.abs(x - Math.sin(z * 0.03) * 18);
        if (pathWave < 3.6 && z > -40 && z < 55) {
          c.lerp(colGoldPath, (1.0 - pathWave / 3.6) * 0.72);
        }
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.04
    });

    const terrainMesh = new THREE.Mesh(geo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    this.worldGroup.add(terrainMesh);
    this.cameraColliders.push(terrainMesh);
  }

  private buildLakeAndCascadingWaterfall(): void {
    // 1. Main Lake Aetheria Gerstner water surface + upper spring lagoon
    this.oceanMat = createGerstnerOceanMaterial({
      sunDirection: this.ctx.sky.sunDirection,
      deepColor: 0x0b5275,
      shallowColor: 0x35dfd2
    });

    const lakeGeo = new THREE.PlaneGeometry(240, 220, 96, 96);
    lakeGeo.rotateX(-Math.PI / 2);
    const lakeMesh = new THREE.Mesh(lakeGeo, this.oceanMat);
    lakeMesh.position.set(0, WATER_LEVEL, -54);
    this.worldGroup.add(lakeMesh);

    const upperPoolGeo = new THREE.PlaneGeometry(42, 58, 24, 24);
    upperPoolGeo.rotateX(-Math.PI / 2);
    const upperPool = new THREE.Mesh(upperPoolGeo, this.oceanMat);
    upperPool.position.set(0, 43.2, -155);
    this.worldGroup.add(upperPool);

    // 2. Stylized Anime Cascading Waterfall Ribbon (custom ShaderMaterial)
    const wfWidth = 16.5;
    const wfSegsX = 20;
    const wfSegsY = 42;
    const wfGeo = new THREE.PlaneGeometry(wfWidth, 1, wfSegsX, wfSegsY);
    const wfPos = wfGeo.getAttribute('position') as THREE.BufferAttribute;
    const wfUv = wfGeo.getAttribute('uv') as THREE.BufferAttribute;

    for (let i = 0; i < wfPos.count; i++) {
      const v = 1.0 - wfUv.getY(i); // 0 at top lip, 1 at lake plunge pool
      const u = wfUv.getX(i) - 0.5;
      const y = THREE.MathUtils.lerp(43.3, WATER_LEVEL - 0.4, v);
      const lipCurve = Math.pow(v, 0.62) * 14.5;
      const z = -131.0 + lipCurve + Math.cos(u * Math.PI) * 1.3;
      const x = u * (wfWidth + v * 3.5);
      wfPos.setXYZ(i, x, y, z);
    }
    wfGeo.computeVertexNormals();

    this.waterfallMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: this.ctx.sky.sunDirection.clone() }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(uv.y * 22.0 - uTime * 7.5 + uv.x * 6.0) * 0.22;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        uniform float uTime;
        uniform vec3 uSunDir;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          float flow = uTime * 2.35;
          float streakA = vnoise(vec2(vUv.x * 16.0, vUv.y * 7.0 + flow));
          float streakB = vnoise(vec2(vUv.x * 31.0 + 4.2, vUv.y * 12.0 + flow * 1.45));
          float foamBand = smoothstep(0.54, 0.72, streakA * 0.65 + streakB * 0.55);

          // Top lip & bottom plunge foam crests
          float crest = smoothstep(0.86, 1.0, vUv.y) + smoothstep(0.18, 0.0, vUv.y);
          float totalFoam = clamp(foamBand + crest * 0.85, 0.0, 1.0);

          vec3 aqua = vec3(0.14, 0.76, 0.88);
          vec3 foam = vec3(0.92, 0.99, 1.0);
          float sunLit = 0.78 + 0.22 * max(0.0, dot(vNormalW, normalize(uSunDir)));
          vec3 col = mix(aqua * sunLit, foam, totalFoam);
          float alpha = mix(0.76, 0.96, totalFoam) * smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const wfMesh = new THREE.Mesh(wfGeo, this.waterfallMat);
    this.worldGroup.add(wfMesh);

    // Foaming plunge ring on lake surface
    const splashGeo = new THREE.RingGeometry(2.5, 13.5, 36);
    splashGeo.rotateX(-Math.PI / 2);
    const splashMesh = new THREE.Mesh(splashGeo, this.waterfallMat);
    splashMesh.position.set(0, WATER_LEVEL + 0.14, -116.2);
    this.worldGroup.add(splashMesh);
  }

  private buildFloatingSkyRuins(): void {
    const rockParts: THREE.BufferGeometry[] = [];
    const turfParts: THREE.BufferGeometry[] = [];
    const ruinStoneParts: THREE.BufferGeometry[] = [];
    const goldTrimParts: THREE.BufferGeometry[] = [];

    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x4df5ff,
      emissive: 0x169bb8,
      emissiveIntensity: 1.35,
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.45,
      thickness: 1.2,
      clearcoat: 1.0
    });

    for (let idx = 0; idx < this.skyIslands.length; idx++) {
      const isl = this.skyIslands[idx];
      const r = isl.radius;

      // Sculpted inverted-cone floating island rock base
      const coneDepth = r * 1.18;
      const baseRock = new THREE.ConeGeometry(r, coneDepth, 14, 3);
      baseRock.rotateX(Math.PI); // point downward
      const bPos = baseRock.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < bPos.count; i++) {
        const vx = bPos.getX(i);
        const vy = bPos.getY(i);
        const vz = bPos.getZ(i);
        if (vy < coneDepth * 0.45) {
          const jag = 1.0 + this.noise.simplex3D(vx * 0.12 + idx, vy * 0.12, vz * 0.12) * 0.18;
          bPos.setXYZ(i, vx * jag, vy, vz * jag);
        } else {
          // Flatten upper rim cleanly at y = +coneDepth/2
          bPos.setY(i, coneDepth * 0.5);
        }
      }
      baseRock.computeVertexNormals();
      baseRock.translate(isl.x, isl.y - coneDepth * 0.5 - 0.3, isl.z);
      rockParts.push(baseRock);

      // Emerald meadow & stone plaza cap
      const cap = new THREE.CylinderGeometry(r, r * 0.96, 0.7, 18);
      cap.translate(isl.x, isl.y - 0.35, isl.z);
      turfParts.push(cap);

      // Central ancient stone dais
      const dais = new THREE.CylinderGeometry(r * 0.56, r * 0.62, 0.55, 12);
      dais.translate(isl.x, isl.y + 0.22, isl.z);
      ruinStoneParts.push(dais);

      // Colonnade & ruined arches around island perimeter
      const colCount = idx === 3 ? 8 : 6;
      for (let c = 0; c < colCount; c++) {
        const ang = (c / colCount) * Math.PI * 2 + idx * 0.4;
        const cx = isl.x + Math.cos(ang) * (r * 0.68);
        const cz = isl.z + Math.sin(ang) * (r * 0.68);
        const broken = c % 3 === 1;
        const colH = broken ? 4.2 : idx === 3 ? 8.5 : 6.4;

        const col = new THREE.CylinderGeometry(0.62, 0.72, colH, 8);
        col.translate(cx, isl.y + colH * 0.5, cz);
        ruinStoneParts.push(col);

        const plinth = new THREE.BoxGeometry(1.75, 0.7, 1.75);
        plinth.rotateY(-ang);
        plinth.translate(cx, isl.y + 0.35, cz);
        ruinStoneParts.push(plinth);

        if (!broken) {
          const capGold = new THREE.BoxGeometry(1.65, 0.45, 1.65);
          capGold.rotateY(-ang);
          capGold.translate(cx, isl.y + colH + 0.2, cz);
          goldTrimParts.push(capGold);
        }
      }

      // Grand sovereign temple arch on the highest Sky Sanctum
      if (idx === 3) {
        const archPillarL = new THREE.BoxGeometry(2.0, 11.5, 2.0);
        archPillarL.translate(isl.x - 5.2, isl.y + 5.75, isl.z - 4.0);
        const archPillarR = new THREE.BoxGeometry(2.0, 11.5, 2.0);
        archPillarR.translate(isl.x + 5.2, isl.y + 5.75, isl.z - 4.0);
        const archLintel = new THREE.BoxGeometry(13.2, 1.9, 2.4);
        archLintel.translate(isl.x, isl.y + 12.1, isl.z - 4.0);
        ruinStoneParts.push(archPillarL, archPillarR, archLintel);

        const crest = new THREE.OctahedronGeometry(2.1, 0);
        crest.translate(isl.x, isl.y + 14.8, isl.z - 4.0);
        goldTrimParts.push(crest);
      }
    }

    // Single InstancedMesh for all 4 levitating Sky Island Aether Crystals
    const crystalInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(1.0, 0),
      crystalMat,
      this.skyIslands.length
    );
    for (let idx = 0; idx < this.skyIslands.length; idx++) {
      const isl = this.skyIslands[idx];
      this.tmpDummy.position.set(isl.x, isl.y + (idx === 3 ? 4.2 : 2.8), isl.z);
      this.tmpDummy.rotation.set(0, 0, 0);
      this.tmpDummy.scale.setScalar(idx === 3 ? 1.55 : 1.05);
      this.tmpDummy.updateMatrix();
      crystalInst.setMatrixAt(idx, this.tmpDummy.matrix);
    }
    crystalInst.instanceMatrix.needsUpdate = true;
    this.skyCrystalInst = crystalInst;
    this.worldGroup.add(crystalInst);

    this.addCelOutlinedBatch(this.mergeGeometryParts(rockParts), 0x8f8a82, 0.055, true, true);
    this.addCelOutlinedBatch(this.mergeGeometryParts(turfParts), 0x4cc964, 0.035, false, true);
    this.addCelOutlinedBatch(this.mergeGeometryParts(ruinStoneParts), 0xeae4d3, 0.04, true, true);
    this.addCelOutlinedBatch(this.mergeGeometryParts(goldTrimParts), 0xf2c14e, 0.03, false, false);
  }

  private buildAncientShrinesAndRunePillars(): void {
    const definitions: ReadonlyArray<{ id: string; name: string; x: number; z: number }> = [
      { id: 'shrine_courage', name: 'Sanctuaire du Courage', x: -118, z: -35 },
      { id: 'shrine_wisdom', name: 'Sanctuaire de la Sagesse', x: 124, z: -42 },
      { id: 'shrine_power', name: 'Sanctuaire de la Puissance', x: 0, z: -196 }
    ];

    const stoneParts: THREE.BufferGeometry[] = [];
    const darkSlateParts: THREE.BufferGeometry[] = [];

    for (let s = 0; s < definitions.length; s++) {
      const def = definitions[s];
      const sy = this.sampleTerrainHeight(def.x, def.z);

      // Stepped octagonal shrine pedestal
      const step1 = new THREE.CylinderGeometry(8.5, 9.6, 0.9, 8);
      step1.translate(def.x, sy + 0.45, def.z);
      const step2 = new THREE.CylinderGeometry(6.4, 7.2, 0.8, 8);
      step2.translate(def.x, sy + 1.3, def.z);
      stoneParts.push(step1, step2);

      // Ornate twin shrine monolith arches
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI * 2 + Math.PI * 0.25;
        const ax = def.x + Math.cos(ang) * 4.4;
        const az = def.z + Math.sin(ang) * 4.4;
        const mon = new THREE.BoxGeometry(1.35, 7.6, 1.35);
        mon.lookAt(new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)));
        mon.translate(ax, sy + 5.1, az);
        darkSlateParts.push(mon);
      }

      const domeRing = new THREE.TorusGeometry(4.2, 0.55, 8, 16);
      domeRing.rotateX(Math.PI / 2);
      domeRing.translate(def.x, sy + 8.9, def.z);
      stoneParts.push(domeRing);

      const spire = new THREE.ConeGeometry(2.6, 4.4, 8);
      spire.translate(def.x, sy + 11.4, def.z);
      darkSlateParts.push(spire);

      // 6 surrounding tall climbable Rune Pillars
      const runeBandParts: THREE.BufferGeometry[] = [];
      for (let p = 0; p < 6; p++) {
        const ang = (p / 6) * Math.PI * 2;
        const px = def.x + Math.cos(ang) * 14.5;
        const pz = def.z + Math.sin(ang) * 14.5;
        const py = this.sampleTerrainHeight(px, pz);
        const pillarH = 10.5 + (p % 2) * 2.5;

        const col = new THREE.BoxGeometry(2.1, pillarH, 2.1);
        col.translate(px, py + pillarH * 0.5, pz);
        stoneParts.push(col);

        // Glowing etched rune rings on each pillar
        for (let r = 0; r < 3; r++) {
          const band = new THREE.BoxGeometry(2.24, 0.26, 2.24);
          band.translate(px, py + 2.4 + r * 3.1, pz);
          runeBandParts.push(band);
        }
      }

      const runeMat = new THREE.MeshStandardMaterial({
        color: 0x3bf0ff,
        emissive: 0x12c8ff,
        emissiveIntensity: 2.1,
        roughness: 0.25,
        metalness: 0.2
      });
      const runeMesh = new THREE.Mesh(this.mergeGeometryParts(runeBandParts), runeMat);
      this.worldGroup.add(runeMesh);

      // Levitating Shrine Sanctum Core
      const coreGeo = new THREE.IcosahedronGeometry(1.35, 0);
      const coreMesh = new THREE.Mesh(coreGeo, runeMat);
      coreMesh.position.set(def.x, sy + 4.1, def.z);
      coreMesh.castShadow = true;
      this.worldGroup.add(coreMesh);

      this.shrines.push({
        id: def.id,
        name: def.name,
        x: def.x,
        y: sy,
        z: def.z,
        activated: false,
        coreMesh,
        runeMat
      });
    }

    // Add 4 extra climbable Rune Pillars right near spawn & waterfall cliffs for immediate climbing fun
    const heroPillars: ReadonlyArray<readonly [number, number, number]> = [
      [18, 28, 12.0],
      [-22, 22, 14.5],
      [-18, -112, 22.0],
      [20, -110, 20.0]
    ];
    for (const [px, pz, ph] of heroPillars) {
      const py = this.sampleTerrainHeight(px, pz);
      const pGeo = new THREE.BoxGeometry(2.6, ph, 2.6);
      pGeo.translate(px, py + ph * 0.5, pz);
      stoneParts.push(pGeo);
    }

    this.addCelOutlinedBatch(this.mergeGeometryParts(stoneParts), 0xdad4c3, 0.042, true, true);
    this.addCelOutlinedBatch(this.mergeGeometryParts(darkSlateParts), 0x3b4259, 0.042, true, true);
  }

  private buildStylizedTreesAndBoulders(): void {
    const rng = new SeededRandom(90421);
    const trunkParts: THREE.BufferGeometry[] = [];
    const boulderParts: THREE.BufferGeometry[] = [];

    // Stylized multi-puff anime canopy geometry for GPU InstancedMesh
    const puffA = new THREE.IcosahedronGeometry(2.4, 1);
    puffA.translate(0, 0.6, 0);
    const puffB = new THREE.IcosahedronGeometry(1.75, 1);
    puffB.translate(1.4, -0.2, 0.7);
    const puffC = new THREE.IcosahedronGeometry(1.65, 1);
    puffC.translate(-1.3, -0.1, -0.8);
    const puffD = new THREE.IcosahedronGeometry(1.5, 1);
    puffD.translate(0.2, 1.8, -0.4);
    const canopyGeo = this.mergeGeometryParts([puffA, puffB, puffC, puffD]);

    const canopyTransforms: Array<{ x: number; y: number; z: number; scale: number; tint: THREE.Color }> = [];
    const palette = [
      new THREE.Color(0x3dc962),
      new THREE.Color(0x5ee068),
      new THREE.Color(0x88e252),
      new THREE.Color(0xf7b84b), // golden sun-kissed highland maple
      new THREE.Color(0xff94b8)  // spirit blossom accent
    ];

    // Scatter highland trees avoiding lake, spawn center, and shrine plazas
    for (let i = 0; i < 140; i++) {
      const tx = rng.range(-275, 275);
      const tz = rng.range(-265, 250);
      if (Math.hypot(tx, tz - 48) < 18) continue;
      let nearShrine = false;
      for (const sh of this.shrines) {
        if (Math.hypot(tx - sh.x, tz - sh.z) < 22) nearShrine = true;
      }
      if (nearShrine) continue;

      const ty = this.sampleTerrainHeight(tx, tz);
      if (ty < WATER_LEVEL + 1.5) continue;
      const n = this.sampleTerrainNormal(tx, tz, this.tmpVecA);
      if (n.y < 0.82) continue;

      const s = rng.range(0.85, 1.48);
      const trunkH = 4.2 * s;
      const trunk = new THREE.CylinderGeometry(0.28 * s, 0.48 * s, trunkH, 7);
      trunk.translate(tx, ty + trunkH * 0.5 - 0.2, tz);
      trunkParts.push(trunk);

      const colorIdx = rng.next() < 0.76 ? rng.int(0, 2) : rng.int(3, 4);
      canopyTransforms.push({
        x: tx,
        y: ty + trunkH + 0.9 * s,
        z: tz,
        scale: s,
        tint: palette[colorIdx]
      });
    }

    // Add spirit trees onto the Floating Sky Ruins
    for (let idx = 0; idx < this.skyIslands.length; idx++) {
      const isl = this.skyIslands[idx];
      for (let k = 0; k < 2; k++) {
        const ang = k * Math.PI + 0.7;
        const tx = isl.x + Math.cos(ang) * (isl.radius * 0.52);
        const tz = isl.z + Math.sin(ang) * (isl.radius * 0.52);
        const s = 0.95;
        const trunk = new THREE.CylinderGeometry(0.25, 0.42, 3.8, 7);
        trunk.translate(tx, isl.y + 1.8, tz);
        trunkParts.push(trunk);
        canopyTransforms.push({
          x: tx,
          y: isl.y + 4.4,
          z: tz,
          scale: s,
          tint: palette[k === 0 ? 3 : 4]
        });
      }
    }

    if (trunkParts.length > 0) {
      this.addCelOutlinedBatch(this.mergeGeometryParts(trunkParts), 0x7a5237, 0.036, true, true);
    }

    // GPU-Instanced Cel-Shaded + Ink-Outlined Stylized Tree Canopies (2 draw calls total!)
    const canopyCelMat = this.registerCelMaterial(0xffffff);
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyCelMat, canopyTransforms.length);
    canopyInst.castShadow = true;
    canopyInst.receiveShadow = true;
    for (let i = 0; i < canopyTransforms.length; i++) {
      const ct = canopyTransforms[i];
      this.tmpDummy.position.set(ct.x, ct.y, ct.z);
      this.tmpDummy.rotation.set(0, (i * 1.9) % (Math.PI * 2), 0);
      this.tmpDummy.scale.setScalar(ct.scale);
      this.tmpDummy.updateMatrix();
      canopyInst.setMatrixAt(i, this.tmpDummy.matrix);
      canopyInst.setColorAt(i, ct.tint);
    }
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    this.worldGroup.add(canopyInst);

    const canopyOutlineInst = new THREE.InstancedMesh(
      canopyGeo,
      createOutlineMaterial(0.04, 0x171326),
      canopyTransforms.length
    );
    canopyOutlineInst.instanceMatrix = canopyInst.instanceMatrix;
    this.worldGroup.add(canopyOutlineInst);

    // GPU-Instanced Wind-Swaying Lakeside Spirit Blossoms & Reeds (1 draw call)
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0.02
    });
    this.windController = applyWindSwayToMaterial(blossomMat, 0.36, 2.2);
    const blossomGeo = new THREE.ConeGeometry(0.38, 1.65, 5);
    blossomGeo.translate(0, 0.82, 0);
    const blossomInst = new THREE.InstancedMesh(blossomGeo, blossomMat, 96);
    let placedBlossoms = 0;
    for (let i = 0; i < 240 && placedBlossoms < 96; i++) {
      const rx = rng.range(-130, 130);
      const rz = rng.range(-125, 95);
      const ry = this.sampleTerrainHeight(rx, rz);
      if (ry < WATER_LEVEL + 0.3 || ry > 22) continue;
      this.tmpDummy.position.set(rx, ry - 0.05, rz);
      this.tmpDummy.rotation.set(0, rng.range(0, Math.PI * 2), 0);
      this.tmpDummy.scale.setScalar(rng.range(0.75, 1.35));
      this.tmpDummy.updateMatrix();
      blossomInst.setMatrixAt(placedBlossoms, this.tmpDummy.matrix);
      blossomInst.setColorAt(
        placedBlossoms,
        new THREE.Color(placedBlossoms % 3 === 0 ? 0xff9ec4 : placedBlossoms % 3 === 1 ? 0xffe169 : 0x7bf5a8)
      );
      placedBlossoms++;
    }
    blossomInst.count = placedBlossoms;
    blossomInst.instanceMatrix.needsUpdate = true;
    if (blossomInst.instanceColor) blossomInst.instanceColor.needsUpdate = true;
    this.worldGroup.add(blossomInst);

    // Climbable Limestone Boulders & Crag Monoliths
    for (let i = 0; i < 68; i++) {
      const bx = rng.range(-265, 265);
      const bz = rng.range(-255, 240);
      if (Math.hypot(bx, bz - 48) < 15) continue;
      const by = this.sampleTerrainHeight(bx, bz);
      if (by < WATER_LEVEL - 1.0) continue;

      const tallMonolith = i < 16;
      const rx = tallMonolith ? rng.range(2.6, 4.4) : rng.range(1.4, 3.2);
      const ry = tallMonolith ? rng.range(6.5, 13.5) : rng.range(1.6, 4.2);
      const rz = tallMonolith ? rng.range(2.6, 4.4) : rng.range(1.4, 3.2);

      const bGeo = new THREE.DodecahedronGeometry(1.0, 0);
      bGeo.scale(rx, ry, rz);
      bGeo.rotateY(rng.range(0, Math.PI * 2));
      bGeo.translate(bx, by + ry * 0.48, bz);
      boulderParts.push(bGeo);
    }

    this.addCelOutlinedBatch(this.mergeGeometryParts(boulderParts), 0xa9a59b, 0.045, true, true);
  }

  /**
   * 22,000+ GPU-Instanced Emerald Grass Blades rippling in wind waves in 1 single draw call!
   * Supports dynamic player push-aside & Pyro Fire scorching.
   */
  private buildInstancedEmeraldGrass(): void {
    const targetCount = Math.max(20500, Math.round(23000 * Math.max(0.9, this.ctx.quality.config.maxInstancesMultiplier)));

    // 7-vertex tapered curved blade geometry (5 triangles)
    const bladeVerts = new Float32Array([
      -0.075, 0.0, 0.0,
       0.075, 0.0, 0.0,
      -0.058, 0.36, 0.02,
       0.058, 0.36, 0.02,
      -0.036, 0.72, 0.06,
       0.036, 0.72, 0.06,
       0.0,   1.08, 0.13
    ]);
    const bladeIndices = [
      0, 1, 2,
      2, 1, 3,
      2, 3, 4,
      4, 3, 5,
      4, 5, 6
    ];
    const bladeUvs = new Float32Array([
      0, 0,
      1, 0,
      0, 0.35,
      1, 0.35,
      0, 0.7,
      1, 0.7,
      0.5, 1.0
    ]);

    const bladeGeo = new THREE.BufferGeometry();
    bladeGeo.setAttribute('position', new THREE.BufferAttribute(bladeVerts, 3));
    bladeGeo.setAttribute('uv', new THREE.BufferAttribute(bladeUvs, 2));
    bladeGeo.setIndex(bladeIndices);
    bladeGeo.computeVertexNormals();

    this.grassMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: this.ctx.sky.sunDirection.clone() },
        uPlayerPos: { value: this.playerPos.clone() }
      },
      vertexShader: /* glsl */ `
        varying float vHeightRatio;
        varying vec3 vTint;
        varying float vWaveHighlight;
        uniform float uTime;
        uniform vec3 uPlayerPos;

        void main() {
          vHeightRatio = clamp(uv.y, 0.0, 1.0);
          #ifdef USE_INSTANCING_COLOR
            vTint = instanceColor;
          #else
            vTint = vec3(1.0);
          #endif

          vec4 worldBase = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec4 localPos = vec4(position, 1.0);
          vec4 worldPos = modelMatrix * instanceMatrix * localPos;

          // Travelling anime meadow wind waves
          float phase = worldBase.x * 0.11 + worldBase.z * 0.09 - uTime * 2.35;
          float gust = sin(phase) * 0.65 + cos(worldBase.x * 0.045 - worldBase.z * 0.06 - uTime * 1.45) * 0.45;
          float flutter = sin(uTime * 5.8 + worldBase.x * 1.7 + worldBase.z * 1.3) * 0.08;
          float bend = (gust + flutter) * (vHeightRatio * vHeightRatio);

          worldPos.x += bend * 0.46;
          worldPos.z += bend * 0.28;
          worldPos.y -= abs(bend) * 0.12;

          // Interactive bend away from player feet & sword slashes
          vec2 toBlade = worldPos.xz - uPlayerPos.xz;
          float distP = length(toBlade);
          if (distP < 2.1 && abs(worldBase.y - uPlayerPos.y) < 2.2) {
            float push = (1.0 - distP / 2.1) * vHeightRatio * 0.72;
            vec2 dirP = distP > 0.001 ? toBlade / distP : vec2(1.0, 0.0);
            worldPos.xz += dirP * push;
            worldPos.y -= push * 0.28;
          }

          vWaveHighlight = clamp(gust * 0.5 + 0.5, 0.0, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vHeightRatio;
        varying vec3 vTint;
        varying float vWaveHighlight;
        uniform vec3 uSunDir;

        void main() {
          vec3 deepEmerald = vec3(0.08, 0.38, 0.19);
          vec3 brightTip = vec3(0.46, 0.88, 0.34);
          vec3 windSheen = vec3(0.76, 0.98, 0.52);

          vec3 baseCol = mix(deepEmerald, brightTip, pow(vHeightRatio, 0.85));
          baseCol = mix(baseCol, windSheen, vWaveHighlight * vHeightRatio * 0.38);

          float sunBoost = 0.82 + 0.24 * clamp(uSunDir.y, 0.0, 1.0);
          vec3 finalCol = baseCol * vTint * sunBoost;
          gl_FragColor = vec4(finalCol, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    const rng = new SeededRandom(77312);
    const inst = new THREE.InstancedMesh(bladeGeo, this.grassMat, targetCount);
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = false;

    const coords = new Float32Array(targetCount * 3);
    let placed = 0;
    let attempts = 0;
    const maxAttempts = targetCount * 4;

    while (placed < targetCount && attempts < maxAttempts) {
      attempts++;
      let gx: number;
      let gy: number;
      let gz: number;

      // Put ~6% of grass blades on top of the Floating Sky Ruins and dense patches near spawn!
      if (placed < 1200) {
        const isl = this.skyIslands[placed % this.skyIslands.length];
        const ang = rng.range(0, Math.PI * 2);
        const rad = Math.sqrt(rng.next()) * (isl.radius - 1.2);
        gx = isl.x + Math.cos(ang) * rad;
        gz = isl.z + Math.sin(ang) * rad;
        gy = isl.y;
      } else if (placed < 5200) {
        // Dense emerald tall-grass meadows right around overlook & lake shore for Pyro Fire updraft play!
        gx = rng.range(-85, 85);
        gz = rng.range(-25, 88);
        gy = this.sampleTerrainHeight(gx, gz);
        if (gy < WATER_LEVEL + 1.1) continue;
        const n = this.sampleTerrainNormal(gx, gz, this.tmpVecA);
        if (n.y < 0.8) continue;
      } else {
        gx = rng.range(-245, 245);
        gz = rng.range(-235, 225);
        gy = this.sampleTerrainHeight(gx, gz);
        if (gy < WATER_LEVEL + 1.15) continue;
        const n = this.sampleTerrainNormal(gx, gz, this.tmpVecA);
        if (n.y < 0.8) continue;
      }

      const hScale = rng.range(0.75, 1.48);
      const wScale = rng.range(0.85, 1.3);
      this.tmpDummy.position.set(gx, gy - 0.04, gz);
      this.tmpDummy.rotation.set(0, rng.range(0, Math.PI * 2), 0);
      this.tmpDummy.scale.set(wScale, hScale, wScale);
      this.tmpDummy.updateMatrix();
      inst.setMatrixAt(placed, this.tmpDummy.matrix);

      const shade = rng.range(0.86, 1.15);
      const warm = rng.range(0.92, 1.08);
      this.tmpColor.setRGB(shade * warm, shade, shade * 0.94);
      inst.setColorAt(placed, this.tmpColor);

      coords[placed * 3] = gx;
      coords[placed * 3 + 1] = gy;
      coords[placed * 3 + 2] = gz;
      placed++;
    }

    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;

    this.grassMesh = inst;
    this.grassCoords = coords;
    this.grassCount = placed;
    this.worldGroup.add(inst);
  }

  // ============================================================================
  // RISING THERMAL UPDRAFTS & PARAGLIDER CURRENTS
  // ============================================================================

  private spawnThermalUpdraft(
    id: string,
    x: number,
    baseY: number,
    z: number,
    radius: number,
    height: number,
    permanent: boolean,
    duration = 24,
    firePatch = false
  ): ThermalUpdraft {
    const geo = new THREE.CylinderGeometry(radius * 1.18, radius * 0.78, height, 24, 16, true);
    geo.translate(0, height * 0.5, 0);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFade: { value: 1.0 },
        uWarm: { value: firePatch ? 1.0 : 0.0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 p = position;
          float twist = uv.y * 4.5 - uTime * 2.8;
          float flare = 1.0 + sin(twist + uv.x * 6.28318) * 0.06;
          p.x *= flare;
          p.z *= flare;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uFade;
        uniform float uWarm;

        void main() {
          float angle = vUv.x * 6.2831853;
          float helixA = sin(angle * 3.0 + vUv.y * 16.0 - uTime * 6.5) * 0.5 + 0.5;
          float helixB = sin(angle * 5.0 - vUv.y * 22.0 - uTime * 4.8) * 0.5 + 0.5;
          float ribbon = smoothstep(0.62, 0.96, helixA * 0.65 + helixB * 0.45);

          float edgeFade = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.68, vUv.y);
          vec3 coolCol = vec3(0.62, 0.98, 0.92);
          vec3 warmCol = mix(vec3(1.0, 0.48, 0.12), vec3(0.85, 0.96, 1.0), smoothstep(0.0, 0.45, vUv.y));
          vec3 col = mix(coolCol, warmCol, uWarm);

          float baseGlow = uWarm * smoothstep(0.22, 0.0, vUv.y) * 0.55;
          float alpha = (ribbon * 0.42 + baseGlow) * edgeFade * uFade;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, baseY, z);
    this.worldGroup.add(mesh);

    const updraft: ThermalUpdraft = {
      id,
      x,
      baseY,
      z,
      radius,
      height,
      permanent,
      remaining: duration,
      maxDuration: duration,
      mesh,
      mat,
      firePatch
    };
    this.updrafts.push(updraft);
    return updraft;
  }

  private buildPermanentThermalUpdrafts(): void {
    // 5 wind-current thermals forming an aerial highway up to all 4 Floating Sky Ruins!
    const specs: ReadonlyArray<{ id: string; x: number; baseY?: number; z: number; r: number; h: number }> = [
      { id: 'thermal_meadow', x: -30, z: 12, r: 5.5, h: 52 },
      { id: 'thermal_lake', x: 16, baseY: WATER_LEVEL, z: -42, r: 6.2, h: 72 },
      { id: 'thermal_sky_bridge_1', x: -4, baseY: 42, z: -56, r: 6.5, h: 48 },
      { id: 'thermal_sky_bridge_2', x: -16, baseY: 62, z: -98, r: 6.8, h: 56 },
      { id: 'thermal_east_cliff', x: 88, z: -20, r: 5.5, h: 55 }
    ];

    for (const s of specs) {
      const by = s.baseY ?? this.sampleTerrainHeight(s.x, s.z);
      this.spawnThermalUpdraft(s.id, s.x, by, s.z, s.r, s.h, true, 99999, false);
    }
  }

  // ============================================================================
  // CORRUPTED STONE GUARDIANS (Interactive Cel-Shaded Golems)
  // ============================================================================

  private buildCorruptedStoneGuardians(): void {
    const spots: ReadonlyArray<{ id: string; x: number; z: number; skyIdx: number }> = [
      { id: 'guardian_1', x: -38, z: 24, skyIdx: -1 },
      { id: 'guardian_2', x: 36, z: 14, skyIdx: -1 },
      { id: 'guardian_3', x: -94, z: -26, skyIdx: -1 },
      { id: 'guardian_4', x: 96, z: -32, skyIdx: -1 },
      { id: 'guardian_5', x: 8, z: -78, skyIdx: 3 } // Sovereign Sky Sanctum boss guardian
    ];

    const armorMat = this.registerCelMaterial(0x52576b);
    const outlineMat = createOutlineMaterial(0.04, 0x151020);
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0x76ecff,
      emissive: 0x16688a,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.65,
      transparent: true,
      opacity: 0.82,
      clearcoat: 1.0
    });

    // Shared merged body, head, and arm geometries to minimize draw calls
    const basePart = new THREE.CylinderGeometry(1.05, 1.38, 1.3, 8);
    basePart.translate(0, 0.65, 0);
    const torsoPart = new THREE.CylinderGeometry(1.18, 0.92, 1.65, 8);
    torsoPart.translate(0, 2.1, 0);
    const bodyGeo = this.mergeGeometryParts([basePart, torsoPart]);

    const headGeo = new THREE.DodecahedronGeometry(0.88, 0);
    const eyeGeo = new THREE.SphereGeometry(0.32, 10, 10);
    const ringGeo = new THREE.TorusGeometry(1.12, 0.14, 6, 12);

    const upperArm = new THREE.BoxGeometry(0.52, 1.85, 0.52);
    upperArm.translate(0, -0.75, 0);
    const stoneFist = new THREE.BoxGeometry(0.68, 0.68, 0.68);
    stoneFist.translate(0, -1.7, 0);
    const armGeo = this.mergeGeometryParts([upperArm, stoneFist]);
    const iceShellGeo = new THREE.CylinderGeometry(1.85, 2.1, 4.4, 6);

    for (const sp of spots) {
      const root = new THREE.Group();
      const startY =
        sp.skyIdx >= 0 ? this.skyIslands[sp.skyIdx].y : this.sampleTerrainHeight(sp.x, sp.z);
      root.position.set(sp.x, startY, sp.z);

      const veinMat = new THREE.MeshStandardMaterial({
        color: 0xff2e7e,
        emissive: 0xff1e68,
        emissiveIntensity: 2.4,
        roughness: 0.25,
        metalness: 0.3
      });

      // Merged pedestal + torso (1 cel mesh + 1 outline mesh)
      const bodyMesh = new THREE.Mesh(bodyGeo, armorMat);
      bodyMesh.castShadow = true;
      root.add(bodyMesh, new THREE.Mesh(bodyGeo, outlineMat));

      const coreRing = new THREE.Mesh(ringGeo, veinMat);
      coreRing.rotation.x = Math.PI / 2;
      coreRing.position.y = 2.1;
      root.add(coreRing);

      // Rotating turret head & cyclops eye
      const headGroup = new THREE.Group();
      headGroup.position.y = 3.25;
      const headMesh = new THREE.Mesh(headGeo, armorMat);
      headMesh.castShadow = true;
      headGroup.add(headMesh, new THREE.Mesh(headGeo, outlineMat));

      const eyeMesh = new THREE.Mesh(eyeGeo, veinMat);
      eyeMesh.position.set(0, 0.05, 0.76);
      headGroup.add(eyeMesh);
      root.add(headGroup);

      // Articulated stone arms (1 merged mesh each)
      const leftArm = new THREE.Group();
      leftArm.position.set(-1.48, 2.65, 0);
      leftArm.add(new THREE.Mesh(armGeo, armorMat));
      root.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(1.48, 2.65, 0);
      rightArm.add(new THREE.Mesh(armGeo, armorMat));
      root.add(rightArm);

      // Crystalline Cryo Ice encasement shell (visible when frozen!)
      const iceShell = new THREE.Mesh(iceShellGeo, iceMat);
      iceShell.position.y = 2.2;
      iceShell.visible = false;
      root.add(iceShell);

      const isBoss = sp.skyIdx === 3;
      if (isBoss) root.scale.setScalar(1.32);

      this.worldGroup.add(root);

      this.guardians.push({
        id: sp.id,
        homeX: sp.x,
        homeZ: sp.z,
        pos: root.position.clone(),
        vel: new THREE.Vector3(),
        yaw: 0,
        hp: isBoss ? 180 : 100,
        maxHp: isBoss ? 180 : 100,
        freezeTimer: 0,
        hitFlash: 0,
        attackCooldown: 1.5,
        respawnTimer: 0,
        skyIslandIndex: sp.skyIdx,
        root,
        headGroup,
        leftArm,
        rightArm,
        veinMat,
        iceShell
      });
    }
  }

  // ============================================================================
  // GPU PARTICLE POOL, SWORD TRAIL RIBBON & BOW CHARGE VISUALS
  // ============================================================================

  private buildParticleSystem(): void {
    const pGeo = new THREE.OctahedronGeometry(0.24, 0);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      metalness: 0.05
    });

    const mesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    mesh.frustumCulled = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.tmpDummy.position.set(0, -999, 0);
      this.tmpDummy.scale.setScalar(0.0001);
      this.tmpDummy.updateMatrix();
      mesh.setMatrixAt(i, this.tmpDummy.matrix);
      mesh.setColorAt(i, new THREE.Color(0xffffff));

      this.particles.push({
        active: false,
        kind: 'wind',
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        life: 1,
        scale: 1,
        color: new THREE.Color(0xffffff)
      });
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.particleMesh = mesh;
    this.worldGroup.add(mesh);
  }

  private emitParticle(
    kind: ParticleSlot['kind'],
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    scale: number,
    hexColor: number
  ): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.kind = kind;
        p.pos.set(x, y, z);
        p.vel.set(vx, vy, vz);
        p.age = 0;
        p.life = life;
        p.scale = scale;
        p.color.setHex(hexColor);
        return;
      }
    }
  }

  private buildSwordTrailRibbon(): void {
    const vertCount = TRAIL_SAMPLES * 2;
    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const alphas = new Float32Array(vertCount);
    const indices: number[] = [];

    for (let i = 0; i < TRAIL_SAMPLES; i++) {
      const u = i / (TRAIL_SAMPLES - 1);
      uvs[i * 4] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;

      if (i < TRAIL_SAMPLES - 1) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, c, b, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setIndex(indices);

    this.swordTrailMat = new THREE.ShaderMaterial({
      uniforms: {
        uComboColor: { value: new THREE.Color(0x52f2ff) }
      },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vUv = uv;
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying float vAlpha;
        uniform vec3 uComboColor;
        void main() {
          float bladeEdge = smoothstep(0.15, 0.98, vUv.y);
          vec3 coreWhite = vec3(1.0, 0.98, 0.88);
          vec3 col = mix(uComboColor, coreWhite, pow(bladeEdge, 2.2));
          float alpha = vAlpha * (0.28 + 0.72 * bladeEdge);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, this.swordTrailMat);
    mesh.frustumCulled = false;
    this.swordTrailGeo = geo;
    this.swordTrailMesh = mesh;
    this.worldGroup.add(mesh);
  }

  private buildBowChargeVisual(): void {
    const group = new THREE.Group();
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x62f7ff,
      emissive: 0x2de2ff,
      emissiveIntensity: 2.5,
      roughness: 0.2,
      metalness: 0.2
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.25, 6), shaftMat);
    shaft.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), shaftMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.72;
    group.add(shaft, tip);
    group.visible = false;
    this.bowChargeGroup = group;
    this.worldGroup.add(group);
  }

  // ============================================================================
  // UI TOOLBAR, RADIAL WHEEL & KEYBOARD SHORTCUTS
  // ============================================================================

  private setupUIAndBindings(): void {
    const items: RadialWheelItem[] = [
      { id: 'sword', label: 'Lame d’Aether (Combo)', icon: '⚔️', category: 'weapon' },
      { id: 'bow', label: 'Arc Cherche-Vent', icon: '🏹', category: 'weapon' },
      { id: 'magic_fire', label: 'Magie Pyro (Thermique)', icon: '🔥', category: 'tool' },
      { id: 'magic_ice', label: 'Magie Cryo (Piliers)', icon: '❄️', category: 'tool' }
    ];

    this.ctx.ui.setRadialItems(items, (item) => {
      this.selectWeapon(item.id as EquippedToolType, true);
    });

    this.renderToolbar();

    this.keydownHandler = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (ev.code === 'Digit1') this.selectWeapon('sword', true);
      else if (ev.code === 'Digit2') this.selectWeapon('bow', true);
      else if (ev.code === 'Digit3') this.selectWeapon('magic_fire', true);
      else if (ev.code === 'Digit4') this.selectWeapon('magic_ice', true);
    };
    window.addEventListener('keydown', this.keydownHandler);
  }

  private selectWeapon(tool: EquippedToolType, playClick = true): void {
    this.equippedWeapon = tool;
    this.ctx.localAvatar.setEquippedTool(tool);
    this.bowDrawing = false;
    this.bowDrawRatio = 0;
    if (this.bowChargeGroup) this.bowChargeGroup.visible = false;
    if (playClick) this.ctx.audio.playUIClick();
    this.renderToolbar();
  }

  private renderToolbar(): void {
    const btnStyle = (active: boolean) =>
      `padding:6px 11px;border-radius:999px;border:1px solid ${
        active ? '#ffd166' : 'rgba(255,255,255,0.18)'
      };background:${
        active ? 'rgba(255,209,102,0.24)' : 'rgba(12,18,32,0.72)'
      };color:${active ? '#ffe9a8' : '#e8eef7'};font-size:12px;font-weight:600;cursor:pointer;backdrop-filter:blur(8px);`;

    const html = `
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        <button data-wpn="sword" style="${btnStyle(this.equippedWeapon === 'sword')}">1 ⚔️ Lame d’Aether</button>
        <button data-wpn="bow" style="${btnStyle(this.equippedWeapon === 'bow')}">2 🏹 Arc Énergétique</button>
        <button data-wpn="magic_fire" style="${btnStyle(this.equippedWeapon === 'magic_fire')}">3 🔥 Pyro (Thermique)</button>
        <button data-wpn="magic_ice" style="${btnStyle(this.equippedWeapon === 'magic_ice')}">4 ❄️ Cryo (Glace)</button>
        <button data-tp="sky" style="${btnStyle(false)}">🏛️ Île Céleste</button>
        <button data-tp="lake" style="${btnStyle(false)}">🌊 Lac & Cascade</button>
      </div>
    `;

    this.ctx.ui.setWorldToolbarHTML(html, (container) => {
      container.querySelectorAll<HTMLButtonElement>('button[data-wpn]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const wpn = btn.dataset.wpn as EquippedToolType;
          this.selectWeapon(wpn, true);
        });
      });

      container.querySelectorAll<HTMLButtonElement>('button[data-tp]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.ctx.audio.playUIClick();
          const dest = btn.dataset.tp;
          this.isClimbing = false;
          this.isGliding = false;
          this.ctx.localAvatar.setParagliderVisible(false);
          this.playerVel.set(0, 0, 0);
          if (dest === 'sky') {
            const topIsl = this.skyIslands[3];
            this.playerPos.set(topIsl.x, topIsl.y + 0.5, topIsl.z + 10);
            this.ctx.ui.notify('Sanctuaire Souverain', 'Sautez dans le vide et appuyez sur [ESPACE] pour planer !', 'info');
          } else {
            const ly = this.sampleTerrainHeight(0, -8);
            this.playerPos.set(0, ly + 0.2, -8);
            this.selectWeapon('magic_ice', false);
            this.ctx.ui.notify('Rive du Lac Aetheria', 'Lancez Magie Cryo [Clic] sur l’eau pour créer des piliers de glace !', 'info');
          }
        });
      });
    });
  }

  // ============================================================================
  // MAIN FRAME UPDATE
  // ============================================================================

  public update(dt: number, elapsed: number): void {
    const safeDt = Math.min(0.05, Math.max(0.0005, dt));
    this.climbCooldown = Math.max(0, this.climbCooldown - safeDt);
    this.spellCooldown = Math.max(0, this.spellCooldown - safeDt);
    this.comboResetTimer = Math.max(0, this.comboResetTimer - safeDt);
    if (this.comboResetTimer <= 0 && this.slashTimer <= 0) this.comboStep = 0;

    // 1. Player movement, 360° climbing & Paraglider physics
    this.updatePlayerMovement(safeDt);

    // 2. Weapons, sword trail ribbon, bow draw, Pyro & Cryo magic
    this.updateCombatAndMagic(safeDt, elapsed);
    this.updateProjectiles(safeDt);
    this.updateCryoPillars(safeDt);
    this.updateThermalUpdrafts(safeDt, elapsed);
    this.updateGuardians(safeDt, elapsed);
    this.updateShrines(safeDt, elapsed);
    this.updateShockwaves(safeDt);
    this.updateParticles(safeDt);

    // 3. Update cel-toon, grass, waterfall & ocean shaders + atmosphere
    this.ctx.sky.update(safeDt, this.playerPos);
    const sunDir = this.ctx.sky.sunDirection;
    for (const mat of this.celMaterials) {
      updateCelToonMaterial(mat, elapsed, sunDir);
    }
    if (this.oceanMat) {
      updateOceanMaterial(this.oceanMat, elapsed, sunDir, this.ctx.camera.position);
    }
    if (this.grassMat) {
      this.grassMat.uniforms.uTime.value = elapsed;
      this.grassMat.uniforms.uSunDir.value.copy(sunDir);
      this.grassMat.uniforms.uPlayerPos.value.copy(this.playerPos);
    }
    if (this.waterfallMat) {
      this.waterfallMat.uniforms.uTime.value = elapsed;
      this.waterfallMat.uniforms.uSunDir.value.copy(sunDir);
    }
    this.windController?.update(elapsed);

    // Emit continuous waterfall mist
    if (Math.random() < 0.65) {
      this.emitParticle(
        'mist',
        (Math.random() - 0.5) * 14,
        WATER_LEVEL + 0.5,
        -116 + (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 2.2,
        2.6 + Math.random() * 2.2,
        1.2 + Math.random() * 1.5,
        1.4,
        2.2,
        0xd8fbff
      );
    }

    // Animate levitating sky island crystals
    if (this.skyCrystalInst) {
      for (let idx = 0; idx < this.skyIslands.length; idx++) {
        const isl = this.skyIslands[idx];
        const baseY = isl.y + (idx === 3 ? 4.2 : 2.8);
        this.tmpDummy.position.set(isl.x, baseY + Math.sin(elapsed * 2.1 + idx * 1.7) * 0.42, isl.z);
        this.tmpDummy.rotation.set(0, elapsed * 1.1, 0);
        this.tmpDummy.scale.setScalar(idx === 3 ? 1.55 : 1.05);
        this.tmpDummy.updateMatrix();
        this.skyCrystalInst.setMatrixAt(idx, this.tmpDummy.matrix);
      }
      this.skyCrystalInst.instanceMatrix.needsUpdate = true;
    }

    // 4. Network & HUD Telemetry
    this.updateNetworkAndHUD(safeDt);
  }

  // ============================================================================
  // 360° FREE CLIMBING, PARAGLIDER & LOCOMOTION
  // ============================================================================

  private probeClimbSurface(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number
  ): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
    // A. Raycast climbable meshes (Shrines, Rune Pillars, Sky Ruins, Boulders, Cryo Pillars)
    this.raycaster.set(origin, dir);
    this.raycaster.near = 0.05;
    this.raycaster.far = maxDist;
    const hits = this.raycaster.intersectObjects(this.climbableColliders, false);
    const hit = hits[0];
    if (hit && hit.face) {
      const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
      if (Math.abs(worldNormal.y) < 0.72) {
        return { point: hit.point.clone(), normal: worldNormal };
      }
    }

    // B. Analytical sheer terrain cliff check
    const sampleX = origin.x + dir.x * (maxDist * 0.78);
    const sampleZ = origin.z + dir.z * (maxDist * 0.78);
    const terrY = this.sampleTerrainHeight(sampleX, sampleZ);
    if (terrY >= origin.y - 0.15) {
      const terrN = this.sampleTerrainNormal(sampleX, sampleZ, this.tmpVecB);
      if (terrN.y < 0.64) {
        const wallNormal = new THREE.Vector3(terrN.x, terrN.y * 0.25, terrN.z).normalize();
        const wallPoint = new THREE.Vector3(
          origin.x + dir.x * 0.55,
          origin.y,
          origin.z + dir.z * 0.55
        );
        return { point: wallPoint, normal: wallNormal };
      }
    }

    return null;
  }

  private updatePlayerMovement(dt: number): void {
    const input = this.ctx.input.state;

    // Derive camera-aligned horizontal basis
    const camFwd = this.tmpVecA;
    this.ctx.camera.getWorldDirection(camFwd);
    camFwd.y = 0;
    if (camFwd.lengthSq() < 0.0001) camFwd.set(0, 0, -1);
    camFwd.normalize();
    const camRight = new THREE.Vector3(-camFwd.z, 0, camFwd.x);

    const wishDir = new THREE.Vector3()
      .addScaledVector(camFwd, input.moveZ)
      .addScaledVector(camRight, input.moveX);
    const moveLen = Math.min(1, wishDir.length());
    if (moveLen > 0.001) wishDir.normalize();

    const support = this.sampleWalkableSupport(this.playerPos.x, this.playerPos.z, this.playerPos.y);
    const inWater = this.playerPos.y < WATER_LEVEL - 0.35 && support.y < WATER_LEVEL - 0.35;

    // ------------------------------------------------------------------------
    // 1. CHECK ENTRY INTO 360° FREE CLIMBING
    // ------------------------------------------------------------------------
    if (!this.isClimbing && !this.climbExhausted && this.climbCooldown <= 0 && this.stamina > 0.08) {
      const pushingForward = moveLen > 0.22;
      if (pushingForward || (!this.onGround && this.playerVel.y > -12)) {
        const probeDir = pushingForward
          ? wishDir
          : new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));
        const chestOrigin = new THREE.Vector3(this.playerPos.x, this.playerPos.y + 1.0, this.playerPos.z);
        const hit = this.probeClimbSurface(chestOrigin, probeDir, 1.08);
        if (hit && hit.normal.dot(probeDir) < -0.32) {
          this.isClimbing = true;
          this.isGliding = false;
          this.onGround = false;
          this.ctx.localAvatar.setParagliderVisible(false);
          this.climbNormal.copy(hit.normal);
          this.playerPos.x = hit.point.x + hit.normal.x * 0.44;
          this.playerPos.z = hit.point.z + hit.normal.z * 0.44;
          this.playerVel.set(0, 0, 0);
        }
      }
    }

    let animState: AvatarAnimState = 'idle';
    let animSpeed = 0;
    let windRush = 0;

    // ------------------------------------------------------------------------
    // 2. ACTIVE 360° FREE CLIMBING MODE
    // ------------------------------------------------------------------------
    if (this.isClimbing) {
      // Build wall tangent basis (360° lateral + vertical movement)
      const upRef = Math.abs(this.climbNormal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const wallRight = new THREE.Vector3().crossVectors(upRef, this.climbNormal).normalize();
      const wallUp = new THREE.Vector3().crossVectors(this.climbNormal, wallRight).normalize();

      const climbBaseSpeed = input.sprint ? 5.1 : 3.5;
      const tangentMove = new THREE.Vector3()
        .addScaledVector(wallRight, input.moveX * climbBaseSpeed)
        .addScaledVector(wallUp, input.moveZ * climbBaseSpeed);

      this.playerPos.addScaledVector(tangentMove, dt);
      animSpeed = tangentMove.length();

      // Drain stamina (faster while climbing or sprinting, slow grip drain when hanging)
      const drainRate = animSpeed > 0.2 ? (input.sprint ? 0.17 : 0.1) : 0.022;
      this.stamina = Math.max(0, this.stamina - drainRate * dt);

      // Wall-Leap or Drop-Off on Space / Crouch
      if (input.crouch || (input.jumpJustPressed && input.moveZ < -0.45)) {
        this.isClimbing = false;
        this.climbCooldown = 0.35;
        this.playerVel.copy(this.climbNormal).multiplyScalar(4.2);
        this.playerVel.y = 2.0;
      } else if (input.jumpJustPressed && this.stamina >= 0.14) {
        // Energetic Wall-Leap upward!
        this.stamina = Math.max(0, this.stamina - 0.16);
        this.ctx.audio.playFootstep('rock', true);
        this.playerPos.addScaledVector(wallUp, 1.35).addScaledVector(wallRight, input.moveX * 0.95);
      }

      // Re-anchor onto curved pillars / cliff face OR mantle cleanly onto top ledge!
      if (this.isClimbing) {
        const reProbeOrigin = new THREE.Vector3(
          this.playerPos.x + this.climbNormal.x * 0.55,
          this.playerPos.y + 0.95,
          this.playerPos.z + this.climbNormal.z * 0.55
        );
        const intoWall = this.climbNormal.clone().negate();
        const anchor = this.probeClimbSurface(reProbeOrigin, intoWall, 1.45);

        if (anchor) {
          this.climbNormal.lerp(anchor.normal, Math.min(1, dt * 12)).normalize();
          this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, anchor.point.x + this.climbNormal.x * 0.44, 0.5);
          this.playerPos.z = THREE.MathUtils.lerp(this.playerPos.z, anchor.point.z + this.climbNormal.z * 0.44, 0.5);
          this.playerYaw = Math.atan2(-this.climbNormal.x, -this.climbNormal.z);
        } else if (input.moveZ >= -0.05) {
          // Top-out mantle onto flat ledge!
          const ledgeX = this.playerPos.x - this.climbNormal.x * 0.85;
          const ledgeZ = this.playerPos.z - this.climbNormal.z * 0.85;
          const ledgeSupport = this.sampleWalkableSupport(ledgeX, ledgeZ, this.playerPos.y + 1.8);
          this.playerPos.set(ledgeX, Math.max(this.playerPos.y, ledgeSupport.y), ledgeZ);
          this.playerVel.set(0, 0, 0);
          this.isClimbing = false;
          this.onGround = true;
          this.climbCooldown = 0.25;
        } else {
          this.isClimbing = false;
          this.climbCooldown = 0.25;
        }

        // Exit climbing when descending back onto walkable ground
        if (this.isClimbing && input.moveZ < -0.1 && this.playerPos.y <= support.y + 0.08) {
          this.playerPos.y = support.y;
          this.isClimbing = false;
          this.onGround = true;
        }

        // Stamina exhaustion release
        if (this.isClimbing && this.stamina <= 0.001) {
          this.isClimbing = false;
          this.climbExhausted = true;
          this.climbCooldown = 0.6;
          this.playerVel.copy(this.climbNormal).multiplyScalar(2.8);
          this.ctx.ui.notify('Endurance épuisée !', 'Appuyez sur [ESPACE] pour ouvrir la Paravoile de secours !', 'warning');
        }
      }

      animState = 'climb';
    } else {
      // ----------------------------------------------------------------------
      // 3. PARAGLIDER, THERMAL UPDRAFTS, SWIMMING & GROUND LOCOMOTION
      // ----------------------------------------------------------------------
      const heightAboveFloor = this.playerPos.y - Math.max(support.y, WATER_LEVEL - 0.4);

      // Toggle Paraglider in mid-air with Space
      if (!this.onGround && !inWater && input.jumpJustPressed && heightAboveFloor > 1.35) {
        if (this.isGliding) {
          this.isGliding = false;
          this.ctx.localAvatar.setParagliderVisible(false);
        } else if (this.stamina > 0.04 || this.climbExhausted) {
          this.isGliding = true;
          this.climbExhausted = false;
          this.stamina = Math.max(this.stamina, 0.18);
          this.ctx.localAvatar.setParagliderVisible(true);
          this.playerVel.y = Math.max(this.playerVel.y, -2.0);
        }
      }

      // Check active Rising Thermal Updrafts
      let activeUpdraftLift = 0;
      for (const up of this.updrafts) {
        const dXZ = Math.hypot(this.playerPos.x - up.x, this.playerPos.z - up.z);
        if (
          dXZ <= up.radius &&
          this.playerPos.y >= up.baseY - 1.5 &&
          this.playerPos.y <= up.baseY + up.height
        ) {
          const radialBoost = 1.0 - (dXZ / up.radius) * 0.35;
          activeUpdraftLift = Math.max(activeUpdraftLift, (this.isGliding ? 15.8 : 5.5) * radialBoost);
        }
      }

      if (this.isGliding) {
        const glideSpeed = activeUpdraftLift > 0 ? 16.5 : 13.2;
        const glideDir =
          moveLen > 0.1
            ? wishDir
            : new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));

        this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, glideDir.x * glideSpeed, Math.min(1, dt * 4.5));
        this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, glideDir.z * glideSpeed, Math.min(1, dt * 4.5));

        if (activeUpdraftLift > 0) {
          this.playerVel.y = THREE.MathUtils.lerp(this.playerVel.y, activeUpdraftLift, Math.min(1, dt * 5.5));
          this.stamina = Math.min(1.0, this.stamina + 0.25 * dt); // Thermals refresh stamina!
        } else {
          this.playerVel.y = THREE.MathUtils.lerp(this.playerVel.y, -2.25, Math.min(1, dt * 5.0));
          this.stamina = Math.max(0, this.stamina - 0.032 * dt);
          if (this.stamina <= 0) {
            this.isGliding = false;
            this.ctx.localAvatar.setParagliderVisible(false);
          }
        }

        const targetYaw = Math.atan2(this.playerVel.x, this.playerVel.z);
        this.playerYaw = this.lerpAngle(this.playerYaw, targetYaw, Math.min(1, dt * 6.5));
        animState = 'glide';
        animSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
        windRush = Math.min(1.0, 0.38 + animSpeed * 0.032 + (activeUpdraftLift > 0 ? 0.3 : 0));
      } else if (inWater) {
        // Swimming on Lake Aetheria
        const swimSpeed = input.sprint && this.stamina > 0.05 ? 6.4 : 4.5;
        this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, wishDir.x * moveLen * swimSpeed, Math.min(1, dt * 6));
        this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, wishDir.z * moveLen * swimSpeed, Math.min(1, dt * 6));
        const targetWaterY = WATER_LEVEL - 0.65;
        this.playerPos.y = THREE.MathUtils.lerp(this.playerPos.y, targetWaterY, Math.min(1, dt * 6));
        this.playerVel.y = 0;

        if (input.jumpJustPressed) {
          this.playerVel.y = 6.8;
          this.playerPos.y = WATER_LEVEL - 0.2;
        }
        if (moveLen > 0.08) {
          this.playerYaw = this.lerpAngle(this.playerYaw, Math.atan2(wishDir.x, wishDir.z), Math.min(1, dt * 8));
        }
        this.stamina = Math.min(1.0, this.stamina + 0.14 * dt);
        animState = 'swim';
        animSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
      } else {
        // Standard Ground & Airborne Action-RPG Movement
        const canSprint = input.sprint && this.stamina > 0.05 && moveLen > 0.15;
        const maxSpeed = canSprint ? 10.6 : 6.8;
        const accel = this.onGround ? 14.0 : 4.5;

        this.playerVel.x = THREE.MathUtils.lerp(
          this.playerVel.x,
          wishDir.x * moveLen * maxSpeed,
          Math.min(1, dt * accel)
        );
        this.playerVel.z = THREE.MathUtils.lerp(
          this.playerVel.z,
          wishDir.z * moveLen * maxSpeed,
          Math.min(1, dt * accel)
        );

        if (this.onGround) {
          const shrineBonus = 1.0 + this.shrines.filter((s) => s.activated).length * 0.22;
          if (canSprint) {
            this.stamina = Math.max(0, this.stamina - 0.09 * dt);
          } else {
            this.stamina = Math.min(1.0, this.stamina + 0.42 * shrineBonus * dt);
          }
          this.climbExhausted = false;

          if (input.jumpJustPressed) {
            this.playerVel.y = 9.4;
            this.onGround = false;
            this.ctx.audio.playFootstep(support.surface, true);
          }
        } else {
          this.playerVel.y -= 22.0 * dt;
          if (activeUpdraftLift > 0) {
            this.playerVel.y += activeUpdraftLift * dt * 2.2;
          }
          windRush = Math.min(0.65, Math.max(0, (-this.playerVel.y - 10) * 0.03));
        }

        if (moveLen > 0.08 && !this.bowDrawing) {
          this.playerYaw = this.lerpAngle(this.playerYaw, Math.atan2(wishDir.x, wishDir.z), Math.min(1, dt * 11));
        }

        const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
        animSpeed = horizSpeed;
        if (!this.onGround) {
          animState = 'jump';
        } else if (horizSpeed > 8.2) {
          animState = 'run';
        } else if (horizSpeed > 0.4) {
          animState = 'walk';
        } else {
          animState = 'idle';
        }

        // Footstep audio on walkable surfaces
        if (this.onGround && horizSpeed > 0.8) {
          this.footstepTimer -= dt * (canSprint ? 1.45 : 1.0);
          if (this.footstepTimer <= 0) {
            this.footstepTimer = 0.42;
            this.ctx.audio.playFootstep(support.surface, canSprint);
          }
        }
      }

      // Integrate velocity & resolve walkable floor collision
      this.playerPos.addScaledVector(this.playerVel, dt);
      this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -WORLD_HALF + 12, WORLD_HALF - 12);
      this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -WORLD_HALF + 12, WORLD_HALF - 12);

      const nextSupport = this.sampleWalkableSupport(this.playerPos.x, this.playerPos.z, this.playerPos.y);
      if (!inWater && this.playerPos.y <= nextSupport.y + 0.06 && this.playerVel.y <= 0.5) {
        // Prevent auto-snapping up vertical sheer cliffs unless slope is walkable
        const slopeN = this.sampleTerrainNormal(this.playerPos.x, this.playerPos.z, this.tmpVecC);
        const stepDelta = nextSupport.y - (this.playerPos.y - this.playerVel.y * dt);
        if (stepDelta < 1.35 || slopeN.y > 0.62) {
          this.playerPos.y = nextSupport.y;
          this.playerVel.y = 0;
          this.onGround = true;
          if (this.isGliding) {
            this.isGliding = false;
            this.ctx.localAvatar.setParagliderVisible(false);
          }
        }
      } else if (!inWater && this.playerPos.y > nextSupport.y + 0.35) {
        this.onGround = false;
      }
    }

    if (this.slashTimer > 0) {
      animState = 'attack';
    }

    this.ctx.audio.updateWindRush(windRush);

    // Sync avatar transform & procedural animation
    this.ctx.localAvatar.root.position.copy(this.playerPos);
    const bankRoll = this.isGliding ? -input.moveX * 0.28 : 0;
    this.ctx.localAvatar.root.rotation.set(0, this.playerYaw, bankRoll);
    this.ctx.localAvatar.updateAnimation(dt, animState, animSpeed, 0, this.isClimbing ? 1.0 : 0);

    // Update spring-arm camera + bow aim zoom
    const targetFov = this.bowDrawing ? 50 : this.isGliding ? 68 : 62;
    if (Math.abs(this.ctx.camera.fov - targetFov) > 0.08) {
      this.ctx.camera.fov = THREE.MathUtils.lerp(this.ctx.camera.fov, targetFov, Math.min(1, dt * 10));
      this.ctx.camera.updateProjectionMatrix();
    }

    const camPivot = new THREE.Vector3(
      this.playerPos.x,
      this.playerPos.y + (this.isGliding ? 2.0 : 1.65),
      this.playerPos.z
    );
    const desiredDist = this.bowDrawing ? 3.4 : this.isGliding ? 7.6 : 5.8;
    const safeCam = this.ctx.input.computeSafeCameraPosition(camPivot, desiredDist, this.cameraColliders);
    this.ctx.camera.position.copy(safeCam);
    const lookTarget = camPivot.clone();
    if (this.bowDrawing) {
      const aimDir = new THREE.Vector3();
      this.ctx.camera.getWorldDirection(aimDir);
      lookTarget.y += 0.25;
    }
    this.ctx.camera.lookAt(lookTarget);
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  // ============================================================================
  // DYNAMIC SWORD TRAILS, BOW & ELEMENTAL FIRE / ICE MAGIC
  // ============================================================================

  private updateCombatAndMagic(dt: number, elapsed: number): void {
    const input = this.ctx.input.state;
    const canAct = !this.isClimbing && !this.isGliding && !input.radialMenuOpen;

    // 1. AETHER BLADE (3-Hit Combo + Luminescent Ribbon Trail + Shockwave Finisher)
    if (this.equippedWeapon === 'sword') {
      if (canAct && input.primaryJustPressed && this.slashTimer <= 0.08) {
        this.comboStep = (this.comboStep % 3) + 1;
        this.slashDuration = this.comboStep === 3 ? 0.44 : 0.3;
        this.slashTimer = this.slashDuration;
        this.prevSlashProgress = 0;
        this.comboResetTimer = 1.15;

        // Orient toward camera forward & lunge slightly
        const aimFwd = new THREE.Vector3();
        this.ctx.camera.getWorldDirection(aimFwd);
        aimFwd.y = 0;
        if (aimFwd.lengthSq() > 0.001) {
          aimFwd.normalize();
          this.playerYaw = Math.atan2(aimFwd.x, aimFwd.z);
          if (this.onGround) {
            this.playerVel.addScaledVector(aimFwd, this.comboStep === 3 ? 7.5 : 4.2);
          }
        }

        this.ctx.audio.playSwordSlash();
        if (this.swordTrailMat) {
          this.swordTrailMat.uniforms.uComboColor.value.setHex(
            this.comboStep === 3 ? 0xffd166 : this.comboStep === 2 ? 0x6ef7c8 : 0x48e5ff
          );
        }

        this.performSwordStrike(this.comboStep === 3);
      }
    }

    // Sub-stepped blade arc sampling for silky-smooth ribbon geometry
    if (this.slashTimer > 0) {
      this.slashTimer = Math.max(0, this.slashTimer - dt);
      const currProg = 1.0 - this.slashTimer / this.slashDuration;
      const subSteps = 5;
      for (let s = 1; s <= subSteps; s++) {
        const p = THREE.MathUtils.lerp(this.prevSlashProgress, currProg, s / subSteps);
        const { base, tip } = this.computeBladeWorldPoints(p);
        this.trailBaseHistory.unshift(base);
        this.trailTipHistory.unshift(tip);
        this.trailTimeHistory.unshift(elapsed);
        if (this.trailBaseHistory.length > TRAIL_SAMPLES) {
          this.trailBaseHistory.pop();
          this.trailTipHistory.pop();
          this.trailTimeHistory.pop();
        }
      }
      this.prevSlashProgress = currProg;
    }

    this.refreshSwordTrailGeometry(elapsed);

    // 2. WINDSEEKER BOW (Hold Right-Click or Left-Click to Draw, Release to Fire Parabolic Arrow)
    if (this.equippedWeapon === 'bow' && canAct) {
      const holdingDraw = input.secondaryAction || input.primaryAction;
      if (holdingDraw) {
        this.bowDrawing = true;
        this.bowDrawRatio = Math.min(1.0, this.bowDrawRatio + dt * 1.65);

        const aimDir = new THREE.Vector3();
        this.ctx.camera.getWorldDirection(aimDir);
        this.playerYaw = Math.atan2(aimDir.x, aimDir.z);

        if (this.bowChargeGroup) {
          this.bowChargeGroup.visible = true;
          this.bowChargeGroup.position.set(
            this.playerPos.x + Math.sin(this.playerYaw) * 0.7,
            this.playerPos.y + 1.38,
            this.playerPos.z + Math.cos(this.playerYaw) * 0.7
          );
          this.bowChargeGroup.lookAt(this.bowChargeGroup.position.clone().add(aimDir));
          this.bowChargeGroup.scale.setScalar(0.65 + this.bowDrawRatio * 0.55);
        }
      } else if (this.bowDrawing) {
        // Release charged energy arrow!
        const power = Math.max(0.35, this.bowDrawRatio);
        this.bowDrawing = false;
        this.bowDrawRatio = 0;
        if (this.bowChargeGroup) this.bowChargeGroup.visible = false;
        this.fireEnergyArrow(power);
      }
    } else if (this.bowChargeGroup) {
      this.bowChargeGroup.visible = false;
      this.bowDrawing = false;
    }

    // 3. PYRO FIRE & CRYO ICE ELEMENTAL MAGIC
    if ((this.equippedWeapon === 'magic_fire' || this.equippedWeapon === 'magic_ice') && canAct) {
      if ((input.primaryJustPressed || input.secondaryJustPressed) && this.spellCooldown <= 0) {
        this.spellCooldown = 0.48;
        this.slashDuration = 0.25;
        this.slashTimer = 0.25;
        if (this.equippedWeapon === 'magic_fire') {
          this.castPyroFireball();
        } else {
          this.castCryoIceMagic();
        }
      }
    }
  }

  private computeBladeWorldPoints(progress: number): { base: THREE.Vector3; tip: THREE.Vector3 } {
    let sweepAngle: number;
    let tiltY: number;

    if (this.comboStep === 1) {
      sweepAngle = THREE.MathUtils.lerp(-1.45, 1.45, progress);
      tiltY = THREE.MathUtils.lerp(0.65, -0.45, progress);
    } else if (this.comboStep === 2) {
      sweepAngle = THREE.MathUtils.lerp(1.45, -1.35, progress);
      tiltY = THREE.MathUtils.lerp(-0.45, 0.72, progress);
    } else {
      // 360° Whirlwind Finisher
      sweepAngle = THREE.MathUtils.lerp(-1.6, Math.PI * 2 - 1.2, progress);
      tiltY = Math.sin(progress * Math.PI * 2) * 0.18;
    }

    const worldAng = this.playerYaw + sweepAngle;
    const dx = Math.sin(worldAng);
    const dz = Math.cos(worldAng);
    const centerY = this.playerPos.y + 1.18;

    const base = new THREE.Vector3(
      this.playerPos.x + dx * 0.72,
      centerY + tiltY * 0.28,
      this.playerPos.z + dz * 0.72
    );
    const tip = new THREE.Vector3(
      this.playerPos.x + dx * 2.55,
      centerY + tiltY * 0.95,
      this.playerPos.z + dz * 2.55
    );
    return { base, tip };
  }

  private refreshSwordTrailGeometry(elapsed: number): void {
    if (!this.swordTrailGeo || !this.swordTrailMesh) return;
    const count = this.trailBaseHistory.length;
    if (count < 2) {
      this.swordTrailMesh.visible = false;
      return;
    }

    const posAttr = this.swordTrailGeo.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = this.swordTrailGeo.getAttribute('aAlpha') as THREE.BufferAttribute;
    const fadeWindow = 0.26;
    let anyVisible = false;

    for (let i = 0; i < TRAIL_SAMPLES; i++) {
      const idx = Math.min(i, count - 1);
      const b = this.trailBaseHistory[idx];
      const t = this.trailTipHistory[idx];
      const age = elapsed - this.trailTimeHistory[idx];
      const alpha = Math.max(0, 1.0 - age / fadeWindow) * (1.0 - i / TRAIL_SAMPLES);
      if (alpha > 0.02) anyVisible = true;

      posAttr.setXYZ(i * 2, b.x, b.y, b.z);
      posAttr.setXYZ(i * 2 + 1, t.x, t.y, t.z);
      alphaAttr.setX(i * 2, alpha);
      alphaAttr.setX(i * 2 + 1, alpha);
    }

    this.swordTrailMesh.visible = anyVisible;
    if (anyVisible) {
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    }
  }

  private performSwordStrike(finisher: boolean): void {
    const reach = finisher ? 5.6 : 3.9;
    const fwd = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));

    if (finisher) {
      this.spawnShockwave(this.playerPos.x, this.playerPos.y + 0.18, this.playerPos.z, 6.2, 0xffd166);
    }

    for (const g of this.guardians) {
      if (g.hp <= 0) continue;
      const toG = g.pos.clone().sub(this.playerPos);
      const dist = toG.length();
      if (dist <= reach) {
        toG.y = 0;
        const inArc = finisher || dist < 1.8 || toG.normalize().dot(fwd) > 0.15;
        if (inArc) {
          const baseDmg = finisher ? 48 : 28;
          const bonus = g.freezeTimer > 0 ? 2.0 : 1.0;
          if (g.freezeTimer > 0) g.freezeTimer = 0; // Shatter combo!
          this.damageGuardian(g, baseDmg * bonus, toG.normalize().multiplyScalar(finisher ? 11 : 5.5));
        }
      }
    }

    // Check Shrine crystal activation by sword strike
    for (const sh of this.shrines) {
      if (!sh.activated && Math.hypot(this.playerPos.x - sh.x, this.playerPos.z - sh.z) < 5.2) {
        this.activateShrine(sh);
      }
    }
  }

  private spawnShockwave(x: number, y: number, z: number, maxRadius: number, hexColor: number): void {
    const geo = new THREE.RingGeometry(0.45, 1.0, 36);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(hexColor) },
        uAlpha: { value: 1.0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uAlpha;
        void main() {
          gl_FragColor = vec4(uColor, uAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.worldGroup.add(mesh);
    this.shockwaves.push({ mesh, mat, age: 0, duration: 0.42, maxRadius });
  }

  private fireEnergyArrow(power: number): void {
    const aimDir = new THREE.Vector3();
    this.ctx.camera.getWorldDirection(aimDir);
    aimDir.y += 0.04;
    aimDir.normalize();

    const origin = new THREE.Vector3(
      this.playerPos.x + aimDir.x * 0.9,
      this.playerPos.y + 1.45,
      this.playerPos.z + aimDir.z * 0.9
    );
    const speed = 28 + power * 36;
    const vel = aimDir.clone().multiplyScalar(speed);

    this.ctx.audio.playBowShot();
    this.spawnProjectileEntity('arrow', origin, vel, 26 + power * 34, false);
    this.ctx.network.broadcastWorldEvent('projectile_fire', this.id, {
      kind: 'arrow',
      ox: origin.x,
      oy: origin.y,
      oz: origin.z,
      vx: vel.x,
      vy: vel.y,
      vz: vel.z
    });
  }

  private castPyroFireball(): void {
    const aimDir = new THREE.Vector3();
    this.ctx.camera.getWorldDirection(aimDir);
    this.playerYaw = Math.atan2(aimDir.x, aimDir.z);

    const origin = new THREE.Vector3(
      this.playerPos.x + aimDir.x * 1.0,
      this.playerPos.y + 1.4,
      this.playerPos.z + aimDir.z * 1.0
    );
    const vel = aimDir.clone().multiplyScalar(32);

    this.ctx.audio.playMagicCast('fire');
    this.spawnProjectileEntity('fire', origin, vel, 46, false);
    this.ctx.network.broadcastWorldEvent('projectile_fire', this.id, {
      kind: 'fire',
      ox: origin.x,
      oy: origin.y,
      oz: origin.z,
      vx: vel.x,
      vy: vel.y,
      vz: vel.z
    });
  }

  private castCryoIceMagic(): void {
    const aimDir = new THREE.Vector3();
    this.ctx.camera.getWorldDirection(aimDir);
    this.playerYaw = Math.atan2(aimDir.x, aimDir.z);
    this.ctx.audio.playMagicCast('ice');

    // Direct water-surface raycast so aiming at Lake Aetheria conjures a Cryo Pillar right under crosshair!
    const camPos = this.ctx.camera.position;
    if (aimDir.y < -0.02) {
      const tWater = (WATER_LEVEL - camPos.y) / aimDir.y;
      if (tWater > 1.5 && tWater < 56) {
        const wx = camPos.x + aimDir.x * tWater;
        const wz = camPos.z + aimDir.z * tWater;
        const bedY = this.sampleTerrainHeight(wx, wz);
        if (bedY < WATER_LEVEL - 0.25 || (wz < -122 && Math.abs(wx) < 18)) {
          const waterPlaneY = wz < -122 ? 43.2 : WATER_LEVEL;
          this.conjureCryoPillar(wx, waterPlaneY, wz, false);
          return;
        }
      }
    }

    // Otherwise launch a crystalline Cryo Frost Lance that freezes Guardians OR conjures ice on water impact!
    const origin = new THREE.Vector3(
      this.playerPos.x + aimDir.x * 1.0,
      this.playerPos.y + 1.4,
      this.playerPos.z + aimDir.z * 1.0
    );
    const vel = aimDir.clone().multiplyScalar(38);
    this.spawnProjectileEntity('ice', origin, vel, 30, false);
    this.ctx.network.broadcastWorldEvent('projectile_fire', this.id, {
      kind: 'ice',
      ox: origin.x,
      oy: origin.y,
      oz: origin.z,
      vx: vel.x,
      vy: vel.y,
      vz: vel.z
    });
  }

  private spawnProjectileEntity(
    kind: ActiveProjectile['kind'],
    origin: THREE.Vector3,
    vel: THREE.Vector3,
    power: number,
    fromRemote: boolean
  ): void {
    const group = new THREE.Group();
    group.position.copy(origin);

    if (kind === 'arrow') {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x62f8ff,
        emissive: 0x22d8ff,
        emissiveIntensity: 2.6,
        roughness: 0.2
      });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), mat);
      shaft.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 6), mat);
      head.rotation.x = Math.PI / 2;
      head.position.z = 0.85;
      group.add(shaft, head);
    } else if (kind === 'fire') {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffaa2b,
        emissive: 0xff4d00,
        emissiveIntensity: 3.0,
        roughness: 0.2
      });
      group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat));
    } else {
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x8ef5ff,
        emissive: 0x1fc8ff,
        emissiveIntensity: 2.0,
        roughness: 0.1,
        clearcoat: 1.0
      });
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), mat);
      shard.scale.set(0.7, 0.7, 1.8);
      group.add(shard);
    }

    group.lookAt(origin.clone().add(vel));
    this.worldGroup.add(group);
    this.projectiles.push({
      kind,
      pos: origin.clone(),
      vel: vel.clone(),
      age: 0,
      maxAge: 4.5,
      power,
      fromRemote,
      mesh: group
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;

      // Parabolic gravity arc
      const grav = p.kind === 'arrow' ? 11.5 : 4.5;
      p.vel.y -= grav * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      p.mesh.lookAt(p.pos.clone().add(p.vel));

      // Trail particles
      if (Math.random() < 0.75) {
        const col = p.kind === 'fire' ? 0xff6a1a : p.kind === 'ice' ? 0x7ef2ff : 0x52f2ff;
        this.emitParticle(
          p.kind === 'fire' ? 'fire' : p.kind === 'ice' ? 'ice' : 'wind',
          p.pos.x,
          p.pos.y,
          p.pos.z,
          (Math.random() - 0.5) * 1.5,
          0.8 + Math.random() * 1.5,
          (Math.random() - 0.5) * 1.5,
          0.42,
          0.75,
          col
        );
      }

      let impacted = p.age >= p.maxAge;

      // Check Corrupted Stone Guardian hits
      for (const g of this.guardians) {
        if (g.hp <= 0) continue;
        const center = new THREE.Vector3(g.pos.x, g.pos.y + 2.0, g.pos.z);
        if (p.pos.distanceTo(center) < 2.15) {
          if (p.kind === 'ice') {
            g.freezeTimer = 6.5;
            g.iceShell.visible = true;
            this.damageGuardian(g, p.power, new THREE.Vector3());
          } else {
            const mult = g.freezeTimer > 0 && p.kind === 'fire' ? 2.0 : 1.0;
            if (p.kind === 'fire' && g.freezeTimer > 0) g.freezeTimer = 0;
            this.damageGuardian(g, p.power * mult, p.vel.clone().setY(0).normalize().multiplyScalar(6.0));
          }
          if (p.kind === 'fire') {
            this.ignitePyroImpact(p.pos.x, g.pos.y, p.pos.z);
          }
          impacted = true;
          break;
        }
      }

      // Check Shrine resonant crystals
      if (!impacted) {
        for (const sh of this.shrines) {
          if (!sh.activated && p.pos.distanceTo(sh.coreMesh.position) < 2.2) {
            this.activateShrine(sh);
            impacted = true;
            break;
          }
        }
      }

      // Check Water & Ground surface impact
      if (!impacted) {
        const support = this.sampleWalkableSupport(p.pos.x, p.pos.z, p.pos.y + 1.5);
        if (p.pos.y <= WATER_LEVEL && support.y < WATER_LEVEL - 0.2) {
          if (p.kind === 'ice') {
            this.conjureCryoPillar(p.pos.x, WATER_LEVEL, p.pos.z, p.fromRemote);
          }
          impacted = true;
        } else if (p.pos.y <= support.y) {
          if (p.kind === 'fire') {
            this.ignitePyroImpact(p.pos.x, support.y, p.pos.z);
          } else if (p.kind === 'ice') {
            // Freeze any Guardians caught in frost splash radius
            for (const g of this.guardians) {
              if (g.hp > 0 && Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z) < 4.5) {
                g.freezeTimer = 6.5;
                g.iceShell.visible = true;
              }
            }
            this.spawnShockwave(p.pos.x, support.y + 0.15, p.pos.z, 4.2, 0x7ef2ff);
          }
          impacted = true;
        }
      }

      if (impacted) {
        this.disposeObject(p.mesh);
        this.worldGroup.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * Pyro Fire Magic Impact:
   * 1. AoE fire blast + shockwave
   * 2. Scorches nearby GPU-instanced emerald grass blades into glowing amber/charcoal
   * 3. Spawns a spreading fire patch & REAL Rising Thermal Updraft Vortex to ride with the Paraglider!
   */
  private ignitePyroImpact(x: number, y: number, z: number): void {
    this.spawnShockwave(x, y + 0.18, z, 5.5, 0xff6b1a);

    // AoE burn on nearby Guardians
    for (const g of this.guardians) {
      if (g.hp > 0 && Math.hypot(g.pos.x - x, g.pos.z - z) < 5.5) {
        this.damageGuardian(g, 32, new THREE.Vector3(g.pos.x - x, 0, g.pos.z - z).normalize().multiplyScalar(5));
      }
    }

    // Burst of spreading fire particles
    for (let k = 0; k < 28; k++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * 4.2;
      this.emitParticle(
        'fire',
        x + Math.cos(ang) * rad,
        y + 0.25,
        z + Math.sin(ang) * rad,
        Math.cos(ang) * 1.4,
        3.5 + Math.random() * 4.5,
        Math.sin(ang) * 1.4,
        1.2 + Math.random() * 0.8,
        1.5,
        Math.random() < 0.5 ? 0xff5400 : 0xffbe2e
      );
    }

    // Scorch nearby GPU-instanced grass blades!
    let scorchedBlades = 0;
    if (this.grassMesh && this.grassMesh.instanceColor) {
      const rSq = 6.2 * 6.2;
      for (let i = 0; i < this.grassCount; i++) {
        const gx = this.grassCoords[i * 3];
        const gy = this.grassCoords[i * 3 + 1];
        const gz = this.grassCoords[i * 3 + 2];
        const dx = gx - x;
        const dz = gz - z;
        const dSq = dx * dx + dz * dz;
        if (dSq < rSq && Math.abs(gy - y) < 3.5) {
          const ember = 1.0 - Math.sqrt(dSq) / 6.2;
          this.tmpColor.setRGB(0.32 + ember * 1.1, 0.22 + ember * 0.35, 0.12);
          this.grassMesh.setColorAt(i, this.tmpColor);
          scorchedBlades++;
        }
      }
      if (scorchedBlades > 0) {
        this.grassMesh.instanceColor.needsUpdate = true;
      }
    }

    // Spawn rising thermal updraft vortex right where the grass burns!
    this.spawnThermalUpdraft(
      `pyro_updraft_${Date.now()}`,
      x,
      y,
      z,
      4.8,
      48,
      false,
      24,
      true
    );

    if (!this.firstFireThermalNotified) {
      this.firstFireThermalNotified = true;
      this.ctx.ui.notify(
        'Courant Thermique Ascendant !',
        'L’herbe embrasée génère un vortex chaud — sautez dedans + [ESPACE] pour planer vers le ciel !',
        'info'
      );
    }
  }

  /**
   * Cryo Ice Magic on Water:
   * Conjures a solid walkable & 360°-climbable hexagonal Ice Pillar rising out of the water!
   */
  private conjureCryoPillar(x: number, waterY: number, z: number, fromRemote: boolean): void {
    // Cap at 8 active pillars (recycle oldest)
    if (this.cryoPillars.length >= 8) {
      const oldest = this.cryoPillars.shift()!;
      this.removeCryoPillar(oldest);
    }

    const radius = 2.05;
    const height = 3.4;
    const group = new THREE.Group();
    group.position.set(x, waterY - height, z);

    const iceGeo = new THREE.CylinderGeometry(radius * 0.94, radius * 1.06, height + 1.4, 6);
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ef2ff,
      emissive: 0x178ab8,
      emissiveIntensity: 0.75,
      roughness: 0.12,
      metalness: 0.06,
      transmission: 0.42,
      thickness: 1.5,
      clearcoat: 1.0
    });
    const pillarMesh = new THREE.Mesh(iceGeo, iceMat);
    pillarMesh.castShadow = true;
    pillarMesh.receiveShadow = true;
    group.add(pillarMesh);

    const outlineMesh = new THREE.Mesh(iceGeo, createOutlineMaterial(0.035, 0x0f324d));
    group.add(outlineMesh);

    this.worldGroup.add(group);
    this.climbableColliders.push(pillarMesh);
    this.cameraColliders.push(pillarMesh);

    this.cryoPillars.push({
      id: `cryo_${Date.now()}_${Math.random()}`,
      x,
      z,
      baseY: waterY,
      topY: waterY + 2.55,
      radius,
      age: 0,
      maxAge: 65,
      riseProgress: 0,
      group,
      colliderMesh: pillarMesh
    });

    for (let k = 0; k < 14; k++) {
      const a = Math.random() * Math.PI * 2;
      this.emitParticle('ice', x + Math.cos(a) * 1.8, waterY + 0.3, z + Math.sin(a) * 1.8, Math.cos(a) * 2, 3.2, Math.sin(a) * 2, 0.85, 1.1, 0x9ef8ff);
    }

    if (!fromRemote) {
      this.ctx.audio.playBuildSnap();
      this.ctx.network.broadcastWorldEvent('block_place', this.id, {
        kind: 'cryo_pillar',
        x,
        y: waterY,
        z
      });
    }
  }

  private removeCryoPillar(p: CryoPillar): void {
    const idxC = this.climbableColliders.indexOf(p.colliderMesh);
    if (idxC >= 0) this.climbableColliders.splice(idxC, 1);
    const idxCam = this.cameraColliders.indexOf(p.colliderMesh);
    if (idxCam >= 0) this.cameraColliders.splice(idxCam, 1);
    this.disposeObject(p.group);
    this.worldGroup.remove(p.group);
  }

  private updateCryoPillars(dt: number): void {
    for (let i = this.cryoPillars.length - 1; i >= 0; i--) {
      const p = this.cryoPillars[i];
      p.age += dt;
      p.riseProgress = Math.min(1, p.riseProgress + dt * 3.4);
      const sinkFade = p.age > p.maxAge - 2.0 ? (p.maxAge - p.age) / 2.0 : 1.0;
      const eff = p.riseProgress * Math.max(0, sinkFade);
      p.group.position.y = p.baseY - 1.1 + eff * 1.65;

      if (p.age >= p.maxAge) {
        this.removeCryoPillar(p);
        this.cryoPillars.splice(i, 1);
      }
    }
  }

  private updateThermalUpdrafts(dt: number, elapsed: number): void {
    this.fireSpawnAcc += dt;
    const emitNow = this.fireSpawnAcc >= 0.08;
    if (emitNow) this.fireSpawnAcc = 0;

    for (let i = this.updrafts.length - 1; i >= 0; i--) {
      const up = this.updrafts[i];
      up.mat.uniforms.uTime.value = elapsed;

      if (!up.permanent) {
        up.remaining -= dt;
        const fade = Math.min(1, Math.max(0, up.remaining / 3.0));
        up.mat.uniforms.uFade.value = fade;
        if (up.remaining <= 0) {
          up.mesh.geometry.dispose();
          up.mat.dispose();
          this.worldGroup.remove(up.mesh);
          this.updrafts.splice(i, 1);
          continue;
        }
      }

      if (emitNow) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * up.radius * 0.85;
        if (up.firePatch) {
          this.emitParticle(
            'fire',
            up.x + Math.cos(ang) * rad,
            up.baseY + 0.25,
            up.z + Math.sin(ang) * rad,
            -Math.sin(ang) * 2.2,
            7.5 + Math.random() * 4.0,
            Math.cos(ang) * 2.2,
            1.6,
            1.35,
            Math.random() < 0.6 ? 0xff6210 : 0xffd15c
          );
        } else if (Math.random() < 0.45) {
          this.emitParticle(
            'wind',
            up.x + Math.cos(ang) * rad,
            up.baseY + Math.random() * (up.height * 0.4),
            up.z + Math.sin(ang) * rad,
            -Math.sin(ang) * 2.5,
            8.5,
            Math.cos(ang) * 2.5,
            1.8,
            0.85,
            0xa8fff0
          );
        }
      }
    }
  }

  // ============================================================================
  // GUARDIAN AI, SHRINES, SHOCKWAVES & PARTICLES
  // ============================================================================

  private damageGuardian(g: StoneGuardian, amount: number, knockback: THREE.Vector3): void {
    g.hp = Math.max(0, g.hp - amount);
    g.hitFlash = 0.22;
    g.vel.add(knockback);

    for (let k = 0; k < 10; k++) {
      this.emitParticle(
        'fire',
        g.pos.x,
        g.pos.y + 2.0,
        g.pos.z,
        (Math.random() - 0.5) * 6,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * 6,
        0.55,
        0.95,
        0xff3b8d
      );
    }

    if (g.hp <= 0) {
      g.root.visible = false;
      g.respawnTimer = 28;
      this.credits += 120;
      this.spawnShockwave(g.pos.x, g.pos.y + 0.25, g.pos.z, 5.2, 0x52f2ff);
      this.ctx.ui.notify('Gardien Corrompu Purifié !', '+120 Cristaux d’Aether récupérés', 'success');
    }
  }

  private updateGuardians(dt: number, elapsed: number): void {
    for (const g of this.guardians) {
      if (g.hp <= 0) {
        g.respawnTimer -= dt;
        if (g.respawnTimer <= 0) {
          g.hp = g.maxHp;
          g.freezeTimer = 0;
          g.iceShell.visible = false;
          g.pos.set(
            g.homeX,
            g.skyIslandIndex >= 0 ? this.skyIslands[g.skyIslandIndex].y : this.sampleTerrainHeight(g.homeX, g.homeZ),
            g.homeZ
          );
          g.root.position.copy(g.pos);
          g.root.visible = true;
        }
        continue;
      }

      if (g.hitFlash > 0) {
        g.hitFlash = Math.max(0, g.hitFlash - dt);
        g.veinMat.emissive.setHex(0xffffff);
      } else if (g.freezeTimer > 0) {
        g.veinMat.emissive.setHex(0x2ad8ff);
      } else {
        g.veinMat.emissive.setHex(0xff1e68);
      }

      if (g.freezeTimer > 0) {
        g.freezeTimer = Math.max(0, g.freezeTimer - dt);
        g.iceShell.visible = g.freezeTimer > 0;
        g.vel.multiplyScalar(0.85);
        continue;
      }

      const toPlayer = this.playerPos.clone().sub(g.pos);
      const dist = toPlayer.length();
      const homeDist = Math.hypot(g.pos.x - g.homeX, g.pos.z - g.homeZ);

      if (dist < 24 && Math.abs(toPlayer.y) < 8 && homeDist < 32) {
        // Aggro pursuit & slam attack
        const dirXZ = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
        g.yaw = this.lerpAngle(g.yaw, Math.atan2(dirXZ.x, dirXZ.z), Math.min(1, dt * 5));
        if (dist > 3.2) {
          g.vel.x = THREE.MathUtils.lerp(g.vel.x, dirXZ.x * 4.1, Math.min(1, dt * 4));
          g.vel.z = THREE.MathUtils.lerp(g.vel.z, dirXZ.z * 4.1, Math.min(1, dt * 4));
        } else {
          g.vel.multiplyScalar(0.82);
          g.attackCooldown -= dt;
          if (g.attackCooldown <= 0) {
            g.attackCooldown = 2.1;
            this.spawnShockwave(g.pos.x, g.pos.y + 0.2, g.pos.z, 4.4, 0xff2e7e);
            if (dist < 4.2) {
              this.health = Math.max(0.15, this.health - 0.14);
              this.playerVel.add(dirXZ.clone().multiplyScalar(8.5)).y = 5.2;
              this.onGround = false;
              this.ctx.input.vibrate(140, 0.6, 0.3);
            }
          }
        }
      } else {
        // Gentle patrol orbit around home
        const patrolAng = elapsed * 0.45 + g.homeX * 0.1;
        const tx = g.homeX + Math.cos(patrolAng) * 5.5;
        const tz = g.homeZ + Math.sin(patrolAng) * 5.5;
        const dx = tx - g.pos.x;
        const dz = tz - g.pos.z;
        g.yaw = this.lerpAngle(g.yaw, Math.atan2(dx, dz), Math.min(1, dt * 3));
        g.vel.x = THREE.MathUtils.lerp(g.vel.x, dx * 0.65, Math.min(1, dt * 3));
        g.vel.z = THREE.MathUtils.lerp(g.vel.z, dz * 0.65, Math.min(1, dt * 3));
      }

      g.pos.x += g.vel.x * dt;
      g.pos.z += g.vel.z * dt;
      g.vel.multiplyScalar(Math.pow(0.15, dt));

      if (g.skyIslandIndex >= 0) {
        const isl = this.skyIslands[g.skyIslandIndex];
        const dIsl = Math.hypot(g.pos.x - isl.x, g.pos.z - isl.z);
        if (dIsl > isl.radius - 2.2) {
          const clampAng = Math.atan2(g.pos.z - isl.z, g.pos.x - isl.x);
          g.pos.x = isl.x + Math.cos(clampAng) * (isl.radius - 2.2);
          g.pos.z = isl.z + Math.sin(clampAng) * (isl.radius - 2.2);
        }
        g.pos.y = isl.y;
      } else {
        g.pos.y = Math.max(WATER_LEVEL, this.sampleTerrainHeight(g.pos.x, g.pos.z));
      }

      g.root.position.copy(g.pos);
      g.root.rotation.y = g.yaw;
      g.headGroup.rotation.y = Math.sin(elapsed * 2.2 + g.homeX) * 0.35;
      const stride = Math.sin(elapsed * 5.5 + g.homeZ) * 0.45;
      g.leftArm.rotation.x = stride;
      g.rightArm.rotation.x = -stride;
    }

    // Passive health regeneration out of combat
    this.health = Math.min(1.0, this.health + 0.025 * dt);
  }

  private activateShrine(sh: ShrineSpec): void {
    if (sh.activated) return;
    sh.activated = true;
    sh.runeMat.color.setHex(0xffe066);
    sh.runeMat.emissive.setHex(0xffb703);
    sh.runeMat.emissiveIntensity = 2.8;
    this.stamina = 1.0;
    this.health = 1.0;
    this.credits += 250;
    this.spawnShockwave(sh.x, sh.y + 1.5, sh.z, 9.5, 0xffd166);
    this.ctx.audio.playBuildSnap();
    this.ctx.ui.notify(
      `${sh.name} Éveillé !`,
      'Bénédiction d’Aether : régénération d’endurance accrue (+250 CR)',
      'success'
    );
  }

  private updateShrines(dt: number, elapsed: number): void {
    for (const sh of this.shrines) {
      sh.coreMesh.rotation.y += dt * (sh.activated ? 2.6 : 1.1);
      sh.coreMesh.rotation.x = Math.sin(elapsed * 1.6) * 0.4;
      sh.coreMesh.position.y = sh.y + 4.1 + Math.sin(elapsed * 2.3 + sh.x) * 0.35;

      if (!sh.activated && Math.hypot(this.playerPos.x - sh.x, this.playerPos.z - sh.z) < 4.2 && Math.abs(this.playerPos.y - sh.y) < 4.5) {
        this.activateShrine(sh);
      }
    }
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      const t = Math.min(1, sw.age / sw.duration);
      const r = 0.5 + sw.maxRadius * (1.0 - Math.pow(1.0 - t, 3));
      sw.mesh.scale.setScalar(r);
      sw.mat.uniforms.uAlpha.value = 1.0 - t;
      if (sw.age >= sw.duration) {
        sw.mesh.geometry.dispose();
        sw.mat.dispose();
        this.worldGroup.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number): void {
    if (!this.particleMesh) return;
    let dirty = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.age += dt;

      if (p.age >= p.life) {
        p.active = false;
        this.tmpDummy.position.set(0, -999, 0);
        this.tmpDummy.scale.setScalar(0.0001);
        this.tmpDummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, this.tmpDummy.matrix);
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      const lifeRatio = 1.0 - p.age / p.life;
      this.tmpDummy.position.copy(p.pos);
      this.tmpDummy.rotation.set(p.age * 3.0, p.age * 2.2, 0);
      this.tmpDummy.scale.setScalar(p.scale * lifeRatio);
      this.tmpDummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.tmpDummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }

    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  // ============================================================================
  // MULTIPLAYER P2P EVENTS, TELEMETRY & MINIMAP
  // ============================================================================

  public onWorldEvent(event: NetWorldEventPacket): void {
    if (event.senderId === this.ctx.network.selfPeerId) return;

    if (event.type === 'projectile_fire') {
      const kind = (event.payload.kind as ActiveProjectile['kind']) || 'arrow';
      const origin = new THREE.Vector3(
        Number(event.payload.ox) || 0,
        Number(event.payload.oy) || 15,
        Number(event.payload.oz) || 0
      );
      const vel = new THREE.Vector3(
        Number(event.payload.vx) || 0,
        Number(event.payload.vy) || 0,
        Number(event.payload.vz) || 0
      );
      this.spawnProjectileEntity(kind, origin, vel, 30, true);
    } else if (event.type === 'block_place' && event.payload.kind === 'cryo_pillar') {
      this.conjureCryoPillar(
        Number(event.payload.x) || 0,
        Number(event.payload.y) || WATER_LEVEL,
        Number(event.payload.z) || 0,
        true
      );
    }
  }

  private updateNetworkAndHUD(dt: number): void {
    this.netSyncAcc += dt;
    if (this.netSyncAcc >= 0.05) {
      this.netSyncAcc = 0;
      const anim: AvatarAnimState = this.isClimbing
        ? 'climb'
        : this.isGliding
        ? 'glide'
        : this.slashTimer > 0
        ? 'attack'
        : !this.onGround
        ? 'jump'
        : Math.hypot(this.playerVel.x, this.playerVel.z) > 7.5
        ? 'run'
        : Math.hypot(this.playerVel.x, this.playerVel.z) > 0.4
        ? 'walk'
        : 'idle';

      this.ctx.network.broadcastLocalPlayer({
        worldId: this.id,
        x: this.playerPos.x,
        y: this.playerPos.y,
        z: this.playerPos.z,
        vx: this.playerVel.x,
        vy: this.playerVel.y,
        vz: this.playerVel.z,
        yaw: this.playerYaw,
        pitch: this.ctx.input.state.cameraPitch,
        anim,
        tool: this.equippedWeapon,
        vehicleId: null,
        seatIndex: 0
      });
    }

    this.telemetryAcc += dt;
    if (this.telemetryAcc >= 0.1) {
      const fps = 1 / Math.max(0.001, dt);
      this.telemetryAcc = 0;

      const hint = this.isClimbing
        ? 'Escalade 360° • [WASD] Grimper • [ESPACE] Bond mural • [C] Lâcher'
        : this.isGliding
        ? 'Paravoile déployée • Visez les Vortex Thermiques ascendants !'
        : this.equippedWeapon === 'magic_fire'
        ? 'Magie Pyro : enflammez l’herbe pour créer un courant thermique ascendant !'
        : this.equippedWeapon === 'magic_ice'
        ? 'Magie Cryo : visez l’eau du lac pour ériger des piliers de glace ou gelez les Gardiens !'
        : this.equippedWeapon === 'bow'
        ? 'Maintenez [Clic] pour bander l’Arc Cherche-Vent • [ESPACE en l’air] Paravoile'
        : 'Combo 3 coups Lame d’Aether [Clic] • Grimpez toute falaise • [ESPACE en l’air] Paravoile';

      this.ctx.ui.updateTelemetry({
        fps: Math.min(144, Math.round(fps)),
        drawCalls: this.ctx.renderer.info.render.calls || this.estimatedDrawCalls,
        triangles: this.ctx.renderer.info.render.triangles || this.estimatedTriangles,
        pingMs: Math.round(this.ctx.network.getAveragePing()),
        peerCount: this.ctx.network.getConnectedPeers().length,
        qualityPreset: this.ctx.quality.config.preset,
        autoScale: this.ctx.quality.autoScale,
        worldTitle: this.metadata.title,
        contextMode: 'ON_FOOT',
        speedKmh: Math.round(Math.hypot(this.playerVel.x, this.playerVel.z) * 3.6),
        altitudeM: Math.round(this.playerPos.y),
        staminaRatio: this.stamina,
        healthRatio: this.health,
        credits: this.credits,
        weatherLabel: 'Clair • Brise d’Aether',
        statusHint: hint
      });
    }
  }

  public getMinimapMarkers(): MinimapMarker[] {
    const markers: MinimapMarker[] = [];

    for (const sh of this.shrines) {
      markers.push({
        id: sh.id,
        x: sh.x,
        z: sh.z,
        color: sh.activated ? '#ffd166' : '#3bf0ff',
        type: sh.activated ? 'poi' : 'objective',
        label: sh.name
      });
    }

    for (const isl of this.skyIslands) {
      markers.push({
        id: isl.id,
        x: isl.x,
        z: isl.z,
        color: '#9ef8ff',
        type: 'poi',
        label: isl.name
      });
    }

    for (const g of this.guardians) {
      if (g.hp > 0) {
        markers.push({
          id: g.id,
          x: g.pos.x,
          z: g.pos.z,
          color: g.freezeTimer > 0 ? '#6ef7ff' : '#ff2e7e',
          type: 'danger',
          label: 'Gardien'
        });
      }
    }

    return markers;
  }

  public getGPSRoute(): Array<{ x: number; z: number }> {
    let target: { x: number; z: number } | null = null;
    let bestDist = Infinity;

    for (const sh of this.shrines) {
      if (!sh.activated) {
        const d = Math.hypot(sh.x - this.playerPos.x, sh.z - this.playerPos.z);
        if (d < bestDist) {
          bestDist = d;
          target = { x: sh.x, z: sh.z };
        }
      }
    }

    if (!target) {
      const sanctum = this.skyIslands[3];
      target = { x: sanctum.x, z: sanctum.z };
    }

    return [
      { x: this.playerPos.x, z: this.playerPos.z },
      { x: (this.playerPos.x + target.x) * 0.5, z: (this.playerPos.z + target.z) * 0.5 },
      target
    ];
  }

  private computeSceneMetrics(): void {
    let calls = 0;
    let tris = 0;
    this.worldGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.visible) {
        calls++;
        const geo = mesh.geometry;
        const instCount = (mesh as THREE.InstancedMesh).isInstancedMesh
          ? (mesh as THREE.InstancedMesh).count
          : 1;
        const triSingle = geo.index
          ? geo.index.count / 3
          : (geo.getAttribute('position')?.count ?? 0) / 3;
        tris += Math.round(triSingle * instCount);
      }
    });
    this.estimatedDrawCalls = calls;
    this.estimatedTriangles = tris;
  }

  private disposeObject(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m?.dispose();
      }
    });
  }

  public dispose(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    this.ctx.ui.setFighterHUDVisible(false);
    this.ctx.ui.setWorldToolbarHTML('');
    this.ctx.localAvatar.setParagliderVisible(false);
    this.ctx.localAvatar.setEquippedTool('none');
    this.ctx.audio.updateWindRush(0);

    this.disposeObject(this.worldGroup);
    this.ctx.scene.remove(this.worldGroup);

    this.windController = null;
    this.skyCrystalInst = null;
    this.celMaterials.length = 0;
    this.shrines.length = 0;
    this.updrafts.length = 0;
    this.cryoPillars.length = 0;
    this.projectiles.length = 0;
    this.guardians.length = 0;
    this.shockwaves.length = 0;
    this.particles.length = 0;
    this.cameraColliders.length = 0;
    this.climbableColliders.length = 0;
    this.trailBaseHistory.length = 0;
    this.trailTipHistory.length = 0;
    this.trailTimeHistory.length = 0;
  }
}
