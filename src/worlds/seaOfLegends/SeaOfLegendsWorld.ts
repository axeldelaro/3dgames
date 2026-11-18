import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  WORLD_CATALOG,
  type AvatarAnimState,
  type ControlContextMode,
  type EngineContext,
  type EquippedToolType,
  type MinimapMarker,
  type NetWorldEventPacket,
  type RadialWheelItem,
  type SurfaceMaterialType,
  type WorldInterface
} from '../../core/types';
import { ProceduralNoise, SeededRandom } from '../../core/math/Noise';
import {
  DEFAULT_OCEAN_WAVES,
  applyWindSwayToMaterial,
  createGerstnerOceanMaterial,
  sampleGerstnerOcean,
  updateOceanMaterial
} from '../../core/graphics/Shaders';

interface IslandSpec {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  peakHeight: number;
  seed: number;
  hasFort: boolean;
  beachSpot: { x: number; z: number };
}

interface CoastalFort {
  id: string;
  name: string;
  pos: THREE.Vector3;
  turretGroup: THREE.Group;
  hp: number;
  maxHp: number;
  respawnTimer: number;
  fireCooldown: number;
}

interface EnemyPirateShip {
  id: string;
  name: string;
  group: THREE.Group;
  wakeMesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  speed: number;
  hp: number;
  maxHp: number;
  sinkingTimer: number;
  fireCooldown: number;
  patrolCenter: THREE.Vector2;
  patrolRadius: number;
  patrolAngle: number;
}

interface Cannonball {
  active: boolean;
  fromPlayer: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
}

interface SmokePuff {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  life: number;
  maxLife: number;
}

interface SplashPlume {
  active: boolean;
  pos: THREE.Vector3;
  scale: number;
  life: number;
  maxLife: number;
}

interface SplinterParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  scale: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const ARCHIPELAGO_ISLANDS: ReadonlyArray<IslandSpec> = [
  {
    id: 'isl_tortuga',
    name: 'Atoll de Tortuga',
    x: -118,
    z: 145,
    radius: 68,
    peakHeight: 22,
    seed: 101,
    hasFort: false,
    beachSpot: { x: -78, z: 112 }
  },
  {
    id: 'isl_volcano',
    name: 'Pic du Crâne Volcanique',
    x: 195,
    z: 215,
    radius: 92,
    peakHeight: 46,
    seed: 202,
    hasFort: true,
    beachSpot: { x: 132, z: 175 }
  },
  {
    id: 'isl_emerald',
    name: 'Lagon d’Émeraude',
    x: -255,
    z: -165,
    radius: 78,
    peakHeight: 25,
    seed: 303,
    hasFort: false,
    beachSpot: { x: -202, z: -135 }
  },
  {
    id: 'isl_diablo',
    name: 'Bastion del Diablo',
    x: 245,
    z: -155,
    radius: 76,
    peakHeight: 32,
    seed: 404,
    hasFort: true,
    beachSpot: { x: 192, z: -128 }
  },
  {
    id: 'isl_siren',
    name: 'Crique des Sirènes',
    x: 18,
    z: 340,
    radius: 64,
    peakHeight: 20,
    seed: 505,
    hasFort: false,
    beachSpot: { x: 12, z: 292 }
  },
  {
    id: 'isl_kraken',
    name: 'Citadelle du Kraken',
    x: -310,
    z: 295,
    radius: 84,
    peakHeight: 38,
    seed: 606,
    hasFort: true,
    beachSpot: { x: -252, z: 262 }
  }
];

function wrapAnglePi(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function evalWaveHeight(x: number, z: number, time: number): number {
  const sample: unknown = sampleGerstnerOcean(x, z, time, DEFAULT_OCEAN_WAVES);
  if (typeof sample === 'number') return sample;
  if (sample && typeof sample === 'object') {
    const rec = sample as Record<string, unknown>;
    if (typeof rec.height === 'number') return rec.height;
    if (typeof rec.y === 'number') return rec.y;
  }
  return 0;
}

function preparePartGeometry(
  geo: THREE.BufferGeometry,
  r = 1,
  g = 1,
  b = 1
): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();

  if (!nonIndexed.getAttribute('normal')) {
    nonIndexed.computeVertexNormals();
  }
  const posAttr = nonIndexed.getAttribute('position');
  const count = posAttr.count;

  if (!nonIndexed.getAttribute('uv')) {
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }

  for (const name of Object.keys(nonIndexed.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') {
      nonIndexed.deleteAttribute(name);
    }
  }

  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return nonIndexed;
}

function createBillowedSailGeometry(width: number, height: number, stripeRgb: [number, number, number]): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 14, 10);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const nx = vx / (width * 0.5);
    const ny = vy / (height * 0.5);
    const curveZ = (1 - nx * nx * 0.45) * (1 - ny * ny * 0.65) * 1.15;
    pos.setZ(i, curveZ);
  }
  geo.translate(0, -height * 0.46, 0);
  geo.computeVertexNormals();

  const nonIdx = geo.toNonIndexed();
  geo.dispose();
  const niPos = nonIdx.getAttribute('position');
  const colors = new Float32Array(niPos.count * 3);
  for (let i = 0; i < niPos.count; i++) {
    const vx = niPos.getX(i);
    const vy = niPos.getY(i) + height * 0.46;
    const isCross = Math.abs(vx) < width * 0.085 || Math.abs(vy) < height * 0.11;
    if (isCross) {
      colors[i * 3] = stripeRgb[0];
      colors[i * 3 + 1] = stripeRgb[1];
      colors[i * 3 + 2] = stripeRgb[2];
    } else {
      colors[i * 3] = 1.02;
      colors[i * 3 + 1] = 0.96;
      colors[i * 3 + 2] = 0.86;
    }
  }
  nonIdx.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return nonIdx;
}

export class SeaOfLegendsWorld implements WorldInterface {
  public readonly id = 'seaOfLegends' as const;
  public readonly metadata = WORLD_CATALOG[3];

  private ctx!: EngineContext;
  private worldRoot = new THREE.Group();
  private readonly noise = new ProceduralNoise(77412);

  // Synchronized Gerstner Ocean & Underwater Caustics Seafloor
  private oceanMesh!: THREE.Mesh;
  private oceanMat!: THREE.ShaderMaterial;
  private seafloorMesh!: THREE.Mesh;
  private seafloorMat!: THREE.ShaderMaterial;
  private waveClockBase = (Date.now() % 3600000) * 0.001;
  private waveTime = 0;
  private cameraUnderwater = false;
  private timeOfDay = 15.2; // Golden tropical Caribbean afternoon

  // Dynamic 3D Wind Vector
  private windAngleRad = 0.42; // Blowing roughly toward +Z/+X initially
  private windSpeed = 14.5;

  // Player Flagship Galleon ("La Légende Noire")
  private galleonGroup = new THREE.Group();
  private helmWheelMesh!: THREE.Mesh;
  private sailPivots: THREE.Group[] = [];
  private sailMeshes: THREE.Mesh[] = [];
  private wakeMesh!: THREE.Mesh;
  private wakeMat!: THREE.ShaderMaterial;
  private lanternLight!: THREE.PointLight;

  private shipPos = new THREE.Vector3(0, 0, 0);
  private shipVel = new THREE.Vector3(0, 0, 0);
  private shipYaw = 0;
  private shipPitch = 0;
  private shipRoll = 0;
  private shipForwardSpeed = 0;
  private rudderAngle = 0; // -1 .. +1
  private sailOpenness = 0.65; // 0 .. 1
  private sailTrimAngle = 0; // -1.05 .. +1.05 rad
  private hullHealth = 100;
  private maxHullHealth = 100;
  private portReloadTimer = 0;
  private starboardReloadTimer = 0;

  // Archipelago, Forts, Enemy Pirate Ships & Treasure Chests
  private coastalForts: CoastalFort[] = [];
  private enemyShips: EnemyPirateShip[] = [];
  private cannonMat!: THREE.MeshStandardMaterial;
  private enemyHullGeo!: THREE.BufferGeometry;
  private enemySailGeo!: THREE.BufferGeometry;
  private enemyWoodMat!: THREE.MeshStandardMaterial;
  private enemySailMat!: THREE.MeshStandardMaterial;

  // Ballistic Cannonballs, Smoke, Water Plumes & Splinters
  private cannonballs: Cannonball[] = [];
  private cannonballInst!: THREE.InstancedMesh;
  private smokePuffs: SmokePuff[] = [];
  private smokeInst!: THREE.InstancedMesh;
  private splashes: SplashPlume[] = [];
  private splashColInst!: THREE.InstancedMesh;
  private splashRingInst!: THREE.InstancedMesh;
  private splinters: SplinterParticle[] = [];
  private splinterInst!: THREE.InstancedMesh;

  // Treasure Chest Hunting
  private activeTreasureIslandIdx = 0;
  private treasurePos = new THREE.Vector3();
  private treasureBeaconGroup = new THREE.Group();
  private treasureBeaconMat!: THREE.ShaderMaterial;
  private chestGroup = new THREE.Group();
  private chestLidPivot = new THREE.Group();
  private chestUnearthedTimer = 0;
  private doubloons = 1200;

  // Player State (Deck Walking / Naval Helm / Island Shore / Underwater Diving)
  private atHelm = false;
  private onDeck = true;
  private deckLocalPos = new THREE.Vector3(0, 3.55, -6.6);
  private playerPos = new THREE.Vector3(0, 4.0, -6.6);
  private playerVel = new THREE.Vector3();
  private playerYaw = 0;
  private onGround = false;
  private isSwimming = false;
  private isDiving = false;
  private health = 100;
  private stamina = 100;
  private helmToggleLockout = 0;
  private attackTimer = 0;
  private footstepTimer = 0;

  private telemetryTimer = 0;
  private netSyncTimer = 0;
  private weatherSyncTimer = 0;
  private smoothedFps = 60;
  private lastDrawCalls = 42;
  private lastTriangles = 82000;

  private disposables: Array<{ dispose(): void }> = [];
  private windHandles: Array<{ update(time: number): void }> = [];
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private prevSceneAfterRender: THREE.Object3D['onAfterRender'] | null = null;

  private readonly dummy = new THREE.Object3D();
  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpVecB = new THREE.Vector3();
  private readonly tmpVecC = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();

  public async load(ctx: EngineContext): Promise<void> {
    this.ctx = ctx;
    this.worldRoot.name = 'SeaOfLegendsRoot';
    this.ctx.scene.add(this.worldRoot);

    this.prevSceneAfterRender = this.ctx.scene.onAfterRender;
    this.ctx.scene.onAfterRender = (renderer) => {
      this.lastDrawCalls = renderer.info.render.calls;
      this.lastTriangles = renderer.info.render.triangles;
    };

    this.ctx.sky.setSpaceBlend(0);
    this.ctx.sky.setWeather('clear', 0.14);
    this.ctx.sky.setTimeOfDay(this.timeOfDay);
    this.ctx.input.setContextMode('ON_FOOT');
    this.ctx.localAvatar.setEquippedTool('sword');
    this.ctx.localAvatar.setParagliderVisible(false);
    this.ctx.localAvatar.setJetpackFlame(0);

    this.waveTime = this.waveClockBase;

    // 1. Build Ocean & Underwater Caustics Seafloor
    this.initOceanAndCausticsFloor();

    // 2. Build Tropical Archipelago Islands, Palm Trees, Coral Reefs, Shipwrecks & Coastal Forts
    this.initArchipelagoAndProps();

    // 3. Build Multi-Deck 3D Pirate Galleon + Enemy Pirate Brigantines
    this.initFlagshipGalleon();
    this.initEnemyPirateFleet();

    // 4. Build Ballistics, Splashes, Smoke, Splinters & Treasure Chest Beacon
    this.initBallisticsAndTreasure();
    this.placeTreasureOnIsland(0);

    // 5. Place Player on Quarterdeck right behind the Helm Wheel
    this.updateGalleonBuoyancyAndPhysics(0.016, this.waveTime);
    this.playerPos.copy(this.deckLocalPos).applyMatrix4(this.galleonGroup.matrixWorld);
    this.ctx.localAvatar.root.position.copy(this.playerPos);

    const pivot = this.tmpVecA.set(this.playerPos.x, this.playerPos.y + 1.65, this.playerPos.z);
    const camStart = this.ctx.input.computeSafeCameraPosition(pivot, 7.5, []);
    this.ctx.camera.position.copy(camStart);
    this.ctx.camera.lookAt(pivot);

    this.setupUIAndControls();
  }

  private trackDisposable<T extends { dispose(): void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private initOceanAndCausticsFloor(): void {
    // High-density Photorealistic Gerstner Ocean Plane dynamically centered on camera
    const oceanGeo = this.trackDisposable(new THREE.PlaneGeometry(2000, 2000, 196, 196));
    oceanGeo.rotateX(-Math.PI * 0.5);

    this.oceanMat = this.trackDisposable(
      createGerstnerOceanMaterial({
        sunDirection: this.ctx.sky.sunDirection,
        deepColor: 0x03223d,
        shallowColor: 0x129ca8
      })
    );
    this.oceanMat.side = THREE.DoubleSide;

    this.oceanMesh = new THREE.Mesh(oceanGeo, this.oceanMat);
    this.oceanMesh.frustumCulled = false;
    this.worldRoot.add(this.oceanMesh);

    // Animated Underwater Solar Caustics Seafloor Shader
    const floorGeo = this.trackDisposable(new THREE.PlaneGeometry(2000, 2000, 72, 72));
    floorGeo.rotateX(-Math.PI * 0.5);

    this.seafloorMat = this.trackDisposable(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.2) },
          uUnderwater: { value: 0.0 }
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            wp.y += sin(wp.x * 0.045) * 1.1 + cos(wp.z * 0.045) * 1.1;
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uSunDir;
          uniform float uUnderwater;
          varying vec3 vWorldPos;

          float causticPattern(vec2 p) {
            vec2 i = p;
            float c = 1.0;
            float inten = 0.008;
            for (int n = 0; n < 4; n++) {
              float t = uTime * (0.55 - (0.35 / float(n + 1)));
              i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
              c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
            }
            c /= 4.0;
            c = 1.15 - pow(c, 1.35);
            return pow(abs(c), 7.0);
          }

          void main() {
            vec2 uvC = vWorldPos.xz * 0.11 - uSunDir.xz * 0.35;
            float rippleSand = 0.92 + 0.08 * sin(vWorldPos.x * 2.4 + sin(vWorldPos.z * 1.8));
            float caust = clamp(causticPattern(uvC), 0.0, 1.6);

            vec3 sandBase = vec3(0.12, 0.42, 0.52) * rippleSand;
            vec3 caustCol = vec3(0.32, 0.95, 1.0) * caust * max(0.25, uSunDir.y);
            vec3 finalCol = sandBase + caustCol * mix(0.45, 1.25, uUnderwater);
            gl_FragColor = vec4(finalCol, 1.0);
          }
        `
      })
    );

    this.seafloorMesh = new THREE.Mesh(floorGeo, this.seafloorMat);
    this.seafloorMesh.position.y = -13.5;
    this.seafloorMesh.frustumCulled = false;
    this.worldRoot.add(this.seafloorMesh);
  }

  /**
   * Evaluates height & surface across all 6 Tropical Archipelago Islands.
   * Returns -13.5 in deep open ocean.
   */
  private sampleIslandHeight(x: number, z: number): { height: number; island: IslandSpec | null; slope: number } {
    let bestH = -13.5;
    let hitIsland: IslandSpec | null = null;

    for (const isl of ARCHIPELAGO_ISLANDS) {
      const dx = x - isl.x;
      const dz = z - isl.z;
      const dist = Math.hypot(dx, dz);
      if (dist > isl.radius * 1.32) continue;

      const angle = Math.atan2(dz, dx);
      const coastWarp =
        1.0 +
        0.16 * Math.sin(angle * 3 + isl.seed) +
        0.09 * Math.cos(angle * 5 - isl.seed * 0.7);
      const effR = isl.radius * coastWarp;
      const normD = dist / effR;

      if (normD < 1.25) {
        // Smooth reef shelf -> white sand beach -> volcanic interior peak
        const t = Math.max(0, 1.18 - normD) / 1.18;
        const ridge = this.noise.ridged2D((x + isl.seed * 17) * 0.018, (z - isl.seed * 13) * 0.018, 4);
        const beachSlope = Math.pow(t, 1.45) * 8.5;
        const coreT = Math.max(0, 0.72 - normD) / 0.72;
        const volcanoPeak = coreT * coreT * (isl.peakHeight * (0.55 + 0.55 * ridge));
        const h = -13.5 + t * 13.8 + beachSlope + volcanoPeak;

        if (h > bestH) {
          bestH = h;
          hitIsland = isl;
        }
      }
    }

    return { height: bestH, island: hitIsland, slope: 0 };
  }

  private initArchipelagoAndProps(): void {
    // 1. Merge all 6 Tropical Islands into a single high-detail vertex-colored PBR mesh!
    const islandGeos: THREE.BufferGeometry[] = [];
    const palmPlacements: Array<{ x: number; y: number; z: number; scale: number; rotY: number; lean: number }> = [];
    const coralPlacements: Array<{ x: number; y: number; z: number; scale: number; rotY: number; color: THREE.Color }> = [];
    const kelpPlacements: Array<{ x: number; y: number; z: number; scale: number; rotY: number }> = [];

    const coralPalette = [
      new THREE.Color(0xff5e8e),
      new THREE.Color(0x28f2e4),
      new THREE.Color(0xffb838),
      new THREE.Color(0xb46bff)
    ];

    for (const isl of ARCHIPELAGO_ISLANDS) {
      const span = isl.radius * 2.55;
      const segs = 46;
      const g = new THREE.PlaneGeometry(span, span, segs, segs);
      g.rotateX(-Math.PI * 0.5);
      g.translate(isl.x, 0, isl.z);

      const pos = g.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        const h = this.sampleIslandHeight(vx, vz).height;
        pos.setY(i, h);
      }
      g.computeVertexNormals();

      const nonIdx = g.toNonIndexed();
      g.dispose();

      const niPos = nonIdx.getAttribute('position');
      const niNorm = nonIdx.getAttribute('normal');
      const colors = new Float32Array(niPos.count * 3);

      for (let i = 0; i < niPos.count; i++) {
        const vy = niPos.getY(i);
        const ny = niNorm.getY(i);
        const slope = 1 - Math.max(0, ny);
        const micro = this.noise.simplex2D(niPos.getX(i) * 0.12, niPos.getZ(i) * 0.12) * 0.5 + 0.5;

        let r = 1.24;
        let gr = 1.14;
        let b = 0.88; // White rippled Caribbean sand

        if (vy < 0.2) {
          // Wet turquoise reef sand
          const sub = Math.min(1, (0.2 - vy) / 6.0);
          r = 1.05 - sub * 0.65;
          gr = 0.98 - sub * 0.35;
          b = 0.82 - sub * 0.18;
        } else if (slope > 0.36 || vy > 11.5) {
          // Volcanic basalt rock cliffs
          const rockT = Math.min(1, Math.max((slope - 0.36) * 2.4, (vy - 11.5) / 7.0));
          const vr = 0.34 + micro * 0.12;
          const vg = 0.32 + micro * 0.11;
          const vb = 0.35 + micro * 0.12;
          r = r * (1 - rockT) + vr * rockT;
          gr = gr * (1 - rockT) + vg * rockT;
          b = b * (1 - rockT) + vb * rockT;
        } else if (vy > 4.2) {
          // Lush tropical palm grass
          const grassT = Math.min(1, (vy - 4.2) / 3.8);
          r = r * (1 - grassT) + (0.36 + micro * 0.14) * grassT;
          gr = gr * (1 - grassT) + (0.78 + micro * 0.18) * grassT;
          b = b * (1 - grassT) + (0.32 + micro * 0.1) * grassT;
        }

        colors[i * 3] = r;
        colors[i * 3 + 1] = gr;
        colors[i * 3 + 2] = b;
      }

      nonIdx.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      islandGeos.push(nonIdx);

      // Populate Coconut Palm Trees & Coral Reefs around each island
      const rng = new SeededRandom(isl.seed * 977);
      for (let p = 0; p < 34; p++) {
        const a = rng.range(0, Math.PI * 2);
        const rad = rng.range(isl.radius * 0.25, isl.radius * 0.96);
        const px = isl.x + Math.cos(a) * rad;
        const pz = isl.z + Math.sin(a) * rad;
        const py = this.sampleIslandHeight(px, pz).height;
        if (py > 1.8 && py < 14.5) {
          palmPlacements.push({
            x: px,
            y: py - 0.2,
            z: pz,
            scale: rng.range(0.85, 1.35),
            rotY: a + rng.range(-0.5, 0.5),
            lean: rng.range(0.12, 0.28)
          });
        }
      }

      // Shallow lagoon Coral Reefs & Swaying Kelp
      for (let c = 0; c < 42; c++) {
        const a = rng.range(0, Math.PI * 2);
        const rad = rng.range(isl.radius * 0.88, isl.radius * 1.24);
        const cx = isl.x + Math.cos(a) * rad;
        const cz = isl.z + Math.sin(a) * rad;
        const cy = this.sampleIslandHeight(cx, cz).height;
        if (cy < -1.4 && cy > -12.8) {
          coralPlacements.push({
            x: cx,
            y: cy,
            z: cz,
            scale: rng.range(0.8, 1.9),
            rotY: rng.range(0, Math.PI * 2),
            color: coralPalette[c % coralPalette.length]
          });
          if (c % 2 === 0) {
            kelpPlacements.push({
              x: cx + rng.range(-2, 2),
              y: cy,
              z: cz + rng.range(-2, 2),
              scale: rng.range(0.9, 1.7),
              rotY: rng.range(0, Math.PI * 2)
            });
          }
        }
      }

      // Build Coastal Pirate Stone Fort on fortified islands!
      if (isl.hasFort) {
        this.buildCoastalPirateFort(isl);
      }
    }

    const mergedIslands = this.trackDisposable(mergeGeometries(islandGeos, false));
    for (const ig of islandGeos) ig.dispose();

    const islandMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('sand', {
        repeatX: 28,
        repeatY: 28,
        tint: 0xdcdcdc,
        roughness: 0.86,
        metalness: 0.03
      })
    );
    islandMat.vertexColors = true;

    const archipelagoMesh = new THREE.Mesh(mergedIslands, islandMat);
    archipelagoMesh.castShadow = true;
    archipelagoMesh.receiveShadow = true;
    this.worldRoot.add(archipelagoMesh);

    // 2. Instanced Wind-Swaying Coconut Palm Trees
    const trunkSegs: THREE.BufferGeometry[] = [];
    for (let s = 0; s < 7; s++) {
      const t = s / 6;
      const seg = new THREE.CylinderGeometry(0.24 - t * 0.09, 0.28 - t * 0.09, 1.35, 7);
      seg.rotateZ(-t * 0.22);
      seg.translate(Math.sin(t * 0.9) * 1.15, 0.65 + s * 1.22, 0);
      const shade = 0.88 + (s % 2) * 0.14;
      trunkSegs.push(preparePartGeometry(seg, shade, shade * 0.85, shade * 0.7));
    }
    const palmTrunkGeo = this.trackDisposable(mergeGeometries(trunkSegs, false));
    const palmBarkMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('bark', {
        repeatX: 2,
        repeatY: 5,
        tint: 0xb68b60,
        roughness: 0.88
      })
    );
    palmBarkMat.vertexColors = true;

    // Arched Coconut Palm Frond Crown + 3 Coconuts
    const frondParts: THREE.BufferGeometry[] = [];
    const topX = Math.sin(0.9) * 1.15 + 0.18;
    const topY = 8.9;
    for (let f = 0; f < 8; f++) {
      const fa = (f / 8) * Math.PI * 2;
      const leafA = new THREE.BoxGeometry(1.9, 0.08, 0.62);
      leafA.rotateZ(-0.28);
      leafA.translate(1.0, 0.12, 0);
      const leafB = new THREE.BoxGeometry(1.8, 0.06, 0.44);
      leafB.rotateZ(-0.72);
      leafB.translate(2.55, -0.52, 0);

      leafA.rotateY(fa);
      leafA.translate(topX, topY, 0);
      leafB.rotateY(fa);
      leafB.translate(topX, topY, 0);

      frondParts.push(preparePartGeometry(leafA, 0.65, 1.15, 0.48));
      frondParts.push(preparePartGeometry(leafB, 0.55, 1.02, 0.4));
    }
    for (let c = 0; c < 3; c++) {
      const ca = (c / 3) * Math.PI * 2;
      const nut = new THREE.SphereGeometry(0.22, 7, 6);
      nut.translate(topX + Math.cos(ca) * 0.28, topY - 0.25, Math.sin(ca) * 0.28);
      frondParts.push(preparePartGeometry(nut, 0.52, 0.34, 0.18));
    }
    const palmCrownGeo = this.trackDisposable(mergeGeometries(frondParts, false));
    const palmFoliageMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('foliage', {
        repeatX: 2,
        repeatY: 2,
        tint: 0x5cc958,
        roughness: 0.72
      })
    );
    palmFoliageMat.vertexColors = true;
    this.windHandles.push(applyWindSwayToMaterial(palmFoliageMat, 0.46, 9.5));

    const palmTrunks = new THREE.InstancedMesh(palmTrunkGeo, palmBarkMat, palmPlacements.length);
    palmTrunks.castShadow = true;
    palmTrunks.receiveShadow = true;
    const palmCrowns = new THREE.InstancedMesh(palmCrownGeo, palmFoliageMat, palmPlacements.length);
    palmCrowns.castShadow = true;

    for (let i = 0; i < palmPlacements.length; i++) {
      const p = palmPlacements[i];
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(0, p.rotY, 0);
      this.dummy.scale.setScalar(p.scale);
      this.dummy.updateMatrix();
      palmTrunks.setMatrixAt(i, this.dummy.matrix);
      palmCrowns.setMatrixAt(i, this.dummy.matrix);
    }
    palmTrunks.instanceMatrix.needsUpdate = true;
    palmCrowns.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(palmTrunks, palmCrowns);

    // 3. Bioluminescent Underwater Coral Reefs & Swaying Kelp
    const cBranch1 = new THREE.CylinderGeometry(0.12, 0.28, 1.5, 6);
    cBranch1.translate(0, 0.75, 0);
    const cBranch2 = new THREE.CylinderGeometry(0.09, 0.2, 1.2, 6);
    cBranch2.rotateZ(0.5);
    cBranch2.translate(0.35, 0.65, 0);
    const cBrain = new THREE.DodecahedronGeometry(0.55, 1);
    cBrain.translate(-0.35, 0.4, 0.25);
    const coralGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(cBranch1, 1, 1, 1),
          preparePartGeometry(cBranch2, 0.9, 0.95, 1),
          preparePartGeometry(cBrain, 1.05, 0.85, 0.95)
        ],
        false
      )
    );
    const coralMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x124459,
        emissiveIntensity: 0.75,
        roughness: 0.55,
        metalness: 0.05,
        vertexColors: true
      })
    );
    const coralInst = new THREE.InstancedMesh(coralGeo, coralMat, coralPlacements.length);
    for (let i = 0; i < coralPlacements.length; i++) {
      const c = coralPlacements[i];
      this.dummy.position.set(c.x, c.y, c.z);
      this.dummy.rotation.set(0, c.rotY, 0);
      this.dummy.scale.setScalar(c.scale);
      this.dummy.updateMatrix();
      coralInst.setMatrixAt(i, this.dummy.matrix);
      coralInst.setColorAt(i, c.color);
    }
    coralInst.instanceMatrix.needsUpdate = true;
    if (coralInst.instanceColor) coralInst.instanceColor.needsUpdate = true;
    this.worldRoot.add(coralInst);

    const kelpBlade = new THREE.BoxGeometry(0.28, 3.6, 0.06);
    kelpBlade.translate(0, 1.8, 0);
    const kelpGeo = this.trackDisposable(preparePartGeometry(kelpBlade, 0.35, 0.95, 0.58));
    const kelpMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x3ad47e,
        emissive: 0x083828,
        roughness: 0.65,
        vertexColors: true
      })
    );
    this.windHandles.push(applyWindSwayToMaterial(kelpMat, 0.55, 3.6));
    const kelpInst = new THREE.InstancedMesh(kelpGeo, kelpMat, kelpPlacements.length);
    for (let i = 0; i < kelpPlacements.length; i++) {
      const k = kelpPlacements[i];
      this.dummy.position.set(k.x, k.y, k.z);
      this.dummy.rotation.set(0, k.rotY, 0);
      this.dummy.scale.setScalar(k.scale);
      this.dummy.updateMatrix();
      kelpInst.setMatrixAt(i, this.dummy.matrix);
    }
    kelpInst.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(kelpInst);

    // 4. Sunken Shipwrecks resting on shallow lagoon reefs
    this.buildSunkenShipwrecks();
  }

  private buildSunkenShipwrecks(): void {
    const wreckCoords = [
      { x: -58, y: -5.8, z: 74, rotY: 0.8, roll: 0.42 },
      { x: -182, y: -6.5, z: -102, rotY: -1.1, roll: -0.38 },
      { x: 112, y: -5.2, z: 138, rotY: 2.1, roll: 0.35 }
    ];

    const parts: THREE.BufferGeometry[] = [];
    for (const w of wreckCoords) {
      const keel = new THREE.BoxGeometry(3.8, 2.2, 13.5);
      keel.rotateZ(w.roll);
      keel.rotateY(w.rotY);
      keel.translate(w.x, w.y + 1.0, w.z);
      parts.push(preparePartGeometry(keel, 0.45, 0.38, 0.3));

      const brokenMast = new THREE.CylinderGeometry(0.18, 0.28, 9.5, 7);
      brokenMast.rotateZ(w.roll + 0.25);
      brokenMast.rotateY(w.rotY);
      brokenMast.translate(w.x, w.y + 5.2, w.z);
      parts.push(preparePartGeometry(brokenMast, 0.4, 0.34, 0.26));
    }

    const wreckGeo = this.trackDisposable(mergeGeometries(parts, false));
    const wreckMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('ship_wood', {
        tint: 0x7b6b58,
        roughness: 0.92
      })
    );
    wreckMat.vertexColors = true;
    const wreckMesh = new THREE.Mesh(wreckGeo, wreckMat);
    this.worldRoot.add(wreckMesh);
  }

  private buildCoastalPirateFort(isl: IslandSpec): void {
    // Position stone bastion overlooking the sea channel
    const dirToCenter = new THREE.Vector2(-isl.x, -isl.z).normalize();
    const fx = isl.x + dirToCenter.x * (isl.radius * 0.62);
    const fz = isl.z + dirToCenter.y * (isl.radius * 0.62);
    const fy = Math.max(4.5, this.sampleIslandHeight(fx, fz).height);

    const fortStoneMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('cobblestone', {
        repeatX: 4,
        repeatY: 4,
        tint: 0xa49f96,
        roughness: 0.86
      })
    );
    fortStoneMat.vertexColors = true;

    const baseTower = new THREE.CylinderGeometry(6.8, 7.8, 9.5, 10);
    baseTower.translate(0, 3.2, 0);
    const fParts: THREE.BufferGeometry[] = [preparePartGeometry(baseTower, 0.92, 0.9, 0.86)];
    for (let m = 0; m < 8; m++) {
      const a = (m / 8) * Math.PI * 2;
      const merlon = new THREE.BoxGeometry(1.8, 1.35, 1.1);
      merlon.rotateY(-a + Math.PI * 0.5);
      merlon.translate(Math.cos(a) * 6.2, 8.5, Math.sin(a) * 6.2);
      fParts.push(preparePartGeometry(merlon, 0.82, 0.8, 0.76));
    }
    const pole = new THREE.CylinderGeometry(0.09, 0.12, 6.2, 6);
    pole.translate(0, 11.0, 0);
    const flag = new THREE.BoxGeometry(2.6, 1.4, 0.08);
    flag.translate(1.3, 13.2, 0);
    fParts.push(preparePartGeometry(pole, 0.45, 0.35, 0.25));
    fParts.push(preparePartGeometry(flag, 0.16, 0.16, 0.18));

    const fortGeo = this.trackDisposable(mergeGeometries(fParts, false));
    const fortMesh = new THREE.Mesh(fortGeo, fortStoneMat);
    fortMesh.position.set(fx, fy, fz);
    fortMesh.castShadow = true;
    fortMesh.receiveShadow = true;
    this.worldRoot.add(fortMesh);

    // Rotating Fortress Cannon Turret
    if (!this.cannonMat) {
      this.cannonMat = this.trackDisposable(
        this.ctx.textures.createPBRMaterial('rust', {
          tint: 0x565b61,
          roughness: 0.46,
          metalness: 0.82
        })
      );
      this.cannonMat.vertexColors = true;
    }

    const cBarrel1 = new THREE.CylinderGeometry(0.24, 0.34, 2.8, 8);
    cBarrel1.rotateX(Math.PI * 0.5);
    cBarrel1.translate(-1.2, 0.5, 1.4);
    const cBarrel2 = new THREE.CylinderGeometry(0.24, 0.34, 2.8, 8);
    cBarrel2.rotateX(Math.PI * 0.5);
    cBarrel2.translate(1.2, 0.5, 1.4);
    const cMount = new THREE.BoxGeometry(3.6, 0.65, 1.8);
    cMount.translate(0, 0.25, 0.4);
    const turretGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(cBarrel1, 0.65, 0.68, 0.72),
          preparePartGeometry(cBarrel2, 0.65, 0.68, 0.72),
          preparePartGeometry(cMount, 0.62, 0.44, 0.28)
        ],
        false
      )
    );

    const turretGroup = new THREE.Group();
    turretGroup.position.set(fx, fy + 8.0, fz);
    const turretMesh = new THREE.Mesh(turretGeo, this.cannonMat);
    turretGroup.add(turretMesh);
    this.worldRoot.add(turretGroup);

    this.coastalForts.push({
      id: `fort_${isl.id}`,
      name: `Fort ${isl.name}`,
      pos: new THREE.Vector3(fx, fy + 8.4, fz),
      turretGroup,
      hp: 160,
      maxHp: 160,
      respawnTimer: 0,
      fireCooldown: 2.5 + Math.random() * 2.0
    });
  }

  private initFlagshipGalleon(): void {
    this.galleonGroup.name = 'FlagshipPirateGalleon';

    const shipWoodMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('ship_wood', {
        repeatX: 4,
        repeatY: 4,
        tint: 0xc5925e,
        roughness: 0.74,
        metalness: 0.06
      })
    );
    shipWoodMat.vertexColors = true;

    const hullParts: THREE.BufferGeometry[] = [];

    // 1. Sculpted Multi-Section Tapered Hull & Keel (Local Z = -11.4 stern .. +12.2 bow)
    const hullMain = new THREE.BoxGeometry(6.4, 2.8, 13.6);
    hullMain.translate(0, 0.45, 0.6);
    hullParts.push(preparePartGeometry(hullMain, 0.72, 0.52, 0.36));

    const hullKeel = new THREE.BoxGeometry(3.8, 1.4, 18.8);
    hullKeel.translate(0, -1.25, 0.4);
    hullParts.push(preparePartGeometry(hullKeel, 0.45, 0.32, 0.22));

    // Flared Bow Prow & Carved Bowsprit
    const bowWedge = new THREE.ConeGeometry(4.2, 6.4, 4);
    bowWedge.rotateY(Math.PI * 0.25);
    bowWedge.rotateX(Math.PI * 0.5);
    bowWedge.scale(1.06, 0.68, 1.0);
    bowWedge.translate(0, 1.25, 10.4);
    hullParts.push(preparePartGeometry(bowWedge, 0.76, 0.56, 0.38));

    const bowsprit = new THREE.CylinderGeometry(0.12, 0.28, 7.6, 8);
    bowsprit.rotateX(Math.PI * 0.37);
    bowsprit.translate(0, 3.9, 13.4);
    hullParts.push(preparePartGeometry(bowsprit, 0.88, 0.68, 0.46));

    // Main Gun Deck (y = 1.85m), Raised Foredeck (y = 3.05m), Raised Quarterdeck (y = 3.55m)
    const mainDeck = new THREE.BoxGeometry(6.2, 0.24, 11.8);
    mainDeck.translate(0, 1.78, 0.8);
    hullParts.push(preparePartGeometry(mainDeck, 1.05, 0.86, 0.64));

    const foreDeck = new THREE.BoxGeometry(5.6, 1.25, 4.4);
    foreDeck.translate(0, 2.42, 8.2);
    hullParts.push(preparePartGeometry(foreDeck, 0.96, 0.78, 0.56));

    // Captain's Quarterdeck & Ornate Stern Cabin with Glowing Golden Windows
    const quarterDeck = new THREE.BoxGeometry(6.3, 1.85, 6.2);
    quarterDeck.translate(0, 2.62, -7.8);
    hullParts.push(preparePartGeometry(quarterDeck, 0.86, 0.64, 0.44));

    const goldTrim = new THREE.BoxGeometry(6.55, 0.24, 6.35);
    goldTrim.translate(0, 3.56, -7.8);
    hullParts.push(preparePartGeometry(goldTrim, 1.45, 1.15, 0.42));

    const sternWindows = new THREE.BoxGeometry(4.4, 0.85, 0.22);
    sternWindows.translate(0, 2.75, -10.95);
    hullParts.push(preparePartGeometry(sternWindows, 2.2, 1.65, 0.55));

    // Twin Stairs from Main Gun Deck up to Quarterdeck
    for (const sx of [-1.85, 1.85]) {
      for (let st = 0; st < 5; st++) {
        const step = new THREE.BoxGeometry(1.15, 0.34, 0.48);
        step.translate(sx, 2.02 + st * 0.34, -3.1 - st * 0.42);
        hullParts.push(preparePartGeometry(step, 0.95, 0.76, 0.54));
      }
    }

    // Side Bulwark Railings (Port +X & Starboard -X) + Boarding Ladders
    for (const sx of [-3.12, 3.12]) {
      const bulwark = new THREE.BoxGeometry(0.24, 0.92, 12.2);
      bulwark.translate(sx, 2.3, 0.8);
      hullParts.push(preparePartGeometry(bulwark, 0.66, 0.48, 0.32));

      const qRail = new THREE.BoxGeometry(0.22, 0.88, 6.1);
      qRail.translate(sx, 3.98, -7.8);
      hullParts.push(preparePartGeometry(qRail, 0.75, 0.55, 0.38));

      // Boarding Ladder Rungs extending down into the water
      const ladderX = sx > 0 ? 3.36 : -3.36;
      for (let r = 0; r < 8; r++) {
        const rung = new THREE.BoxGeometry(0.14, 0.1, 0.85);
        rung.translate(ladderX, -0.8 + r * 0.44, 0.6);
        hullParts.push(preparePartGeometry(rung, 1.1, 0.9, 0.62));
      }
    }

    // Helm Binnacle Post on Quarterdeck
    const helmPost = new THREE.CylinderGeometry(0.18, 0.24, 1.15, 8);
    helmPost.translate(0, 4.12, -5.6);
    hullParts.push(preparePartGeometry(helmPost, 0.62, 0.44, 0.28));

    // 3 Towering Masts + Crow's Nests + Rope Shroud Rigging
    const mastDefs = [
      { z: 6.8, h: 14.5, baseY: 3.0 },
      { z: 0.6, h: 17.8, baseY: 1.8 },
      { z: -6.2, h: 13.8, baseY: 3.5 }
    ];
    for (const md of mastDefs) {
      const mast = new THREE.CylinderGeometry(0.18, 0.34, md.h, 9);
      mast.translate(0, md.baseY + md.h * 0.5, md.z);
      hullParts.push(preparePartGeometry(mast, 0.84, 0.66, 0.45));

      const nest = new THREE.CylinderGeometry(0.95, 0.68, 0.75, 9);
      nest.translate(0, md.baseY + md.h * 0.78, md.z);
      hullParts.push(preparePartGeometry(nest, 0.64, 0.48, 0.34));

      // Port & Starboard Rope Rigging Shrouds
      for (const sx of [-3.0, 3.0]) {
        const shroudLen = Math.hypot(sx, md.h * 0.75);
        const rope = new THREE.CylinderGeometry(0.035, 0.035, shroudLen, 5);
        const tilt = Math.atan2(sx, md.h * 0.75);
        rope.rotateZ(tilt);
        rope.translate(sx * 0.5, md.baseY + md.h * 0.38, md.z);
        hullParts.push(preparePartGeometry(rope, 0.85, 0.78, 0.62));
      }
    }

    const mergedGalleonHull = this.trackDisposable(mergeGeometries(hullParts, false));
    const galleonHullMesh = new THREE.Mesh(mergedGalleonHull, shipWoodMat);
    galleonHullMesh.castShadow = true;
    galleonHullMesh.receiveShadow = true;
    this.galleonGroup.add(galleonHullMesh);

    // 2. 8 Broadside Iron Cannons (4 Port at +X, 4 Starboard at -X)
    const cannonParts: THREE.BufferGeometry[] = [];
    const cannonZs = [-2.4, -0.3, 1.8, 3.9];
    for (const cz of cannonZs) {
      for (const side of [-1, 1]) {
        const cx = side * 2.65;
        const carriage = new THREE.BoxGeometry(0.95, 0.38, 0.68);
        carriage.translate(cx, 2.04, cz);
        cannonParts.push(preparePartGeometry(carriage, 0.58, 0.38, 0.24));

        const barrel = new THREE.CylinderGeometry(0.15, 0.23, 1.65, 8);
        barrel.rotateZ(side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
        barrel.translate(cx + side * 0.42, 2.32, cz);
        cannonParts.push(preparePartGeometry(barrel, 0.48, 0.52, 0.56));
      }
    }
    const mergedCannons = this.trackDisposable(mergeGeometries(cannonParts, false));
    const cannonsMesh = new THREE.Mesh(mergedCannons, this.cannonMat);
    cannonsMesh.castShadow = true;
    this.galleonGroup.add(cannonsMesh);

    // 3. Rotating Captain's Helm Wheel on Quarterdeck
    const wheelParts: THREE.BufferGeometry[] = [];
    const rim = new THREE.TorusGeometry(0.58, 0.055, 7, 18);
    wheelParts.push(preparePartGeometry(rim, 0.92, 0.68, 0.38));
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2;
      const spoke = new THREE.CylinderGeometry(0.03, 0.03, 1.48, 5);
      spoke.rotateZ(a);
      wheelParts.push(preparePartGeometry(spoke, 1.25, 0.98, 0.42));
    }
    const helmGeo = this.trackDisposable(mergeGeometries(wheelParts, false));
    this.helmWheelMesh = new THREE.Mesh(helmGeo, shipWoodMat);
    this.helmWheelMesh.position.set(0, 4.65, -5.82);
    this.galleonGroup.add(this.helmWheelMesh);

    // 4. 3 Billowing Curved Sails on Rotating Yardarms
    const sailMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.82,
        metalness: 0.02,
        side: THREE.DoubleSide,
        vertexColors: true
      })
    );

    const sailConfigs = [
      { z: 6.8, y: 13.8, w: 6.8, h: 6.4 },
      { z: 0.6, y: 15.6, w: 8.6, h: 8.2 },
      { z: -6.2, y: 13.6, w: 6.4, h: 5.8 }
    ];
    for (const sc of sailConfigs) {
      const pivot = new THREE.Group();
      pivot.position.set(0, sc.y, sc.z);

      const yard = new THREE.CylinderGeometry(0.11, 0.11, sc.w + 1.0, 7);
      yard.rotateZ(Math.PI * 0.5);
      const yardMesh = new THREE.Mesh(
        this.trackDisposable(preparePartGeometry(yard, 0.78, 0.6, 0.4)),
        shipWoodMat
      );
      pivot.add(yardMesh);

      const sGeo = this.trackDisposable(createBillowedSailGeometry(sc.w, sc.h, [0.85, 0.16, 0.18]));
      const sMesh = new THREE.Mesh(sGeo, sailMat);
      sMesh.castShadow = true;
      pivot.add(sMesh);

      this.sailPivots.push(pivot);
      this.sailMeshes.push(sMesh);
      this.galleonGroup.add(pivot);
    }

    // Stern Cabin Warm Lantern Light
    this.lanternLight = new THREE.PointLight(0xffad42, 3.2, 22, 1.6);
    this.lanternLight.position.set(0, 4.2, -9.8);
    this.galleonGroup.add(this.lanternLight);

    this.worldRoot.add(this.galleonGroup);

    // 5. Dynamic Hull Wake Foam Ring
    const wakeGeo = this.trackDisposable(new THREE.RingGeometry(3.4, 7.6, 32, 2));
    wakeGeo.rotateX(-Math.PI * 0.5);
    wakeGeo.scale(0.82, 1.0, 2.35);

    this.wakeMat = this.trackDisposable(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeedFactor: { value: 0.3 }
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uSpeedFactor;
          varying vec2 vUv;
          void main() {
            float radial = sin(vUv.y * 3.14159);
            float foam = 0.6 + 0.4 * sin(vUv.x * 36.0 - uTime * 5.0 + sin(vUv.y * 12.0));
            float alpha = radial * foam * (0.18 + uSpeedFactor * 0.58);
            gl_FragColor = vec4(0.86, 0.97, 1.0, alpha);
          }
        `,
        transparent: true,
        depthWrite: false
      })
    );

    this.wakeMesh = new THREE.Mesh(wakeGeo, this.wakeMat);
    this.worldRoot.add(this.wakeMesh);
  }

  private initEnemyPirateFleet(): void {
    this.enemyWoodMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('ship_wood', {
        tint: 0x4f3c30,
        roughness: 0.82
      })
    );
    this.enemyWoodMat.vertexColors = true;

    this.enemySailMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        side: THREE.DoubleSide,
        vertexColors: true
      })
    );

    const eParts: THREE.BufferGeometry[] = [];
    const eHull = new THREE.BoxGeometry(5.2, 2.6, 16.5);
    eHull.translate(0, 0.6, 0);
    eParts.push(preparePartGeometry(eHull, 0.42, 0.34, 0.3));
    const eBow = new THREE.ConeGeometry(3.4, 5.2, 4);
    eBow.rotateY(Math.PI * 0.25);
    eBow.rotateX(Math.PI * 0.5);
    eBow.scale(1.0, 0.65, 1.0);
    eBow.translate(0, 1.1, 10.2);
    eParts.push(preparePartGeometry(eBow, 0.48, 0.38, 0.32));
    const ePoop = new THREE.BoxGeometry(5.3, 1.6, 4.8);
    ePoop.translate(0, 2.4, -6.0);
    eParts.push(preparePartGeometry(ePoop, 0.52, 0.24, 0.22));
    for (const mz of [-3.5, 3.8]) {
      const m = new THREE.CylinderGeometry(0.16, 0.28, 13.5, 7);
      m.translate(0, 8.2, mz);
      eParts.push(preparePartGeometry(m, 0.55, 0.44, 0.34));
    }
    this.enemyHullGeo = this.trackDisposable(mergeGeometries(eParts, false));

    const sA = createBillowedSailGeometry(6.8, 6.6, [0.16, 0.16, 0.18]);
    sA.translate(0, 12.6, 3.8);
    const sB = createBillowedSailGeometry(6.2, 6.0, [0.78, 0.12, 0.14]);
    sB.translate(0, 12.2, -3.5);
    this.enemySailGeo = this.trackDisposable(mergeGeometries([sA, sB], false));
    sA.dispose();
    sB.dispose();

    this.spawnEnemyBrigantine(0, 'Le Requin Noir', new THREE.Vector2(95, 115), 85, 0.4);
    this.spawnEnemyBrigantine(1, 'La Vengeance Écarlate', new THREE.Vector2(-140, -85), 95, 2.6);
  }

  private spawnEnemyBrigantine(
    idx: number,
    name: string,
    center: THREE.Vector2,
    radius: number,
    angle: number
  ): void {
    const group = new THREE.Group();
    const hMesh = new THREE.Mesh(this.enemyHullGeo, this.enemyWoodMat);
    hMesh.castShadow = true;
    const sMesh = new THREE.Mesh(this.enemySailGeo, this.enemySailMat);
    sMesh.castShadow = true;
    group.add(hMesh, sMesh);

    const sx = center.x + Math.cos(angle) * radius;
    const sz = center.y + Math.sin(angle) * radius;
    group.position.set(sx, 0, sz);
    this.worldRoot.add(group);

    const wMesh = new THREE.Mesh(this.wakeMesh.geometry, this.wakeMat);
    wMesh.scale.setScalar(0.85);
    this.worldRoot.add(wMesh);

    this.enemyShips[idx] = {
      id: `pirate_ship_${idx}`,
      name,
      group,
      wakeMesh: wMesh,
      pos: new THREE.Vector3(sx, 0, sz),
      vel: new THREE.Vector3(),
      yaw: angle + Math.PI * 0.5,
      pitch: 0,
      roll: 0,
      speed: 7.5,
      hp: 140,
      maxHp: 140,
      sinkingTimer: 0,
      fireCooldown: 3.0 + idx * 1.4,
      patrolCenter: center,
      patrolRadius: radius,
      patrolAngle: angle
    };
  }

  private initBallisticsAndTreasure(): void {
    // 1. Glowing Hot-Iron Cannonballs
    const ballGeo = this.trackDisposable(new THREE.SphereGeometry(0.24, 10, 8));
    const ballMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x2b2d30,
        emissive: 0xff5912,
        emissiveIntensity: 1.4,
        roughness: 0.38,
        metalness: 0.85
      })
    );
    this.cannonballInst = new THREE.InstancedMesh(ballGeo, ballMat, 64);
    this.cannonballInst.count = 0;
    this.cannonballInst.frustumCulled = false;
    this.worldRoot.add(this.cannonballInst);
    for (let i = 0; i < 64; i++) {
      this.cannonballs.push({
        active: false,
        fromPlayer: true,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0
      });
    }

    // 2. Cannon Smoke Puffs
    const smokeGeo = this.trackDisposable(new THREE.DodecahedronGeometry(0.65, 1));
    const smokeMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xe6edf2,
        emissive: 0x30363d,
        roughness: 0.95,
        metalness: 0.0,
        transparent: true,
        opacity: 0.68,
        depthWrite: false
      })
    );
    this.smokeInst = new THREE.InstancedMesh(smokeGeo, smokeMat, 96);
    this.smokeInst.count = 0;
    this.smokeInst.frustumCulled = false;
    this.worldRoot.add(this.smokeInst);
    for (let i = 0; i < 96; i++) {
      this.smokePuffs.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 1,
        life: 0,
        maxLife: 1
      });
    }

    // 3. Towering Water Splash Plumes + Surface Ripple Rings
    const plumeGeo = this.trackDisposable(new THREE.ConeGeometry(1.15, 7.5, 10, 1, true));
    plumeGeo.translate(0, 3.5, 0);
    const splashMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xf0fbff,
        emissive: 0x2c6e85,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.splashColInst = new THREE.InstancedMesh(plumeGeo, splashMat, 32);
    this.splashColInst.count = 0;
    this.splashColInst.frustumCulled = false;
    this.worldRoot.add(this.splashColInst);

    const sRingGeo = this.trackDisposable(new THREE.RingGeometry(0.8, 2.2, 18));
    sRingGeo.rotateX(-Math.PI * 0.5);
    this.splashRingInst = new THREE.InstancedMesh(sRingGeo, splashMat, 32);
    this.splashRingInst.count = 0;
    this.splashRingInst.frustumCulled = false;
    this.worldRoot.add(this.splashRingInst);

    for (let i = 0; i < 32; i++) {
      this.splashes.push({
        active: false,
        pos: new THREE.Vector3(),
        scale: 1,
        life: 0,
        maxLife: 1.15
      });
    }

    // 4. Explosive Wood Splinters & Fiery Sparks
    const spGeo = this.trackDisposable(new THREE.BoxGeometry(0.14, 0.08, 0.52));
    const spMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65
      })
    );
    this.splinterInst = new THREE.InstancedMesh(spGeo, spMat, 140);
    this.splinterInst.count = 0;
    this.splinterInst.frustumCulled = false;
    this.worldRoot.add(this.splinterInst);
    for (let i = 0; i < 140; i++) {
      this.splinters.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        scale: 1,
        life: 0,
        maxLife: 1,
        color: new THREE.Color(0xc98b4b)
      });
    }

    // 5. Glowing X-Spot Treasure Beacon & 3D Golden Pirate Treasure Chest
    const xBarA = new THREE.BoxGeometry(2.6, 0.14, 0.48);
    xBarA.rotateY(Math.PI * 0.25);
    const xBarB = new THREE.BoxGeometry(2.6, 0.14, 0.48);
    xBarB.rotateY(-Math.PI * 0.25);
    const xMarkGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(xBarA, 1.6, 0.22, 0.24),
          preparePartGeometry(xBarB, 1.6, 0.22, 0.24)
        ],
        false
      )
    );
    const xMarkMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xff3b47,
        emissive: 0xc9182b,
        emissiveIntensity: 1.6,
        roughness: 0.4,
        vertexColors: true
      })
    );
    const xMarkMesh = new THREE.Mesh(xMarkGeo, xMarkMat);
    xMarkMesh.position.y = 0.12;
    this.treasureBeaconGroup.add(xMarkMesh);

    const beamGeo = this.trackDisposable(new THREE.CylinderGeometry(0.45, 1.15, 28, 14, 1, true));
    beamGeo.translate(0, 14, 0);
    this.treasureBeaconMat = this.trackDisposable(
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float fade = (1.0 - vUv.y) * (1.0 - vUv.y);
            float pulse = 0.7 + 0.3 * sin(uTime * 4.2 - vUv.y * 8.0);
            gl_FragColor = vec4(1.0, 0.82, 0.24, fade * pulse * 0.42);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
    );
    const beamMesh = new THREE.Mesh(beamGeo, this.treasureBeaconMat);
    this.treasureBeaconGroup.add(beamMesh);
    this.worldRoot.add(this.treasureBeaconGroup);

    // Golden Treasure Chest (Base + Hinged Lid + Glowing Gold Coins Hoard)
    const chestMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x261a05,
        roughness: 0.32,
        metalness: 0.65,
        vertexColors: true
      })
    );
    const cBase = new THREE.BoxGeometry(1.35, 0.72, 0.92);
    cBase.translate(0, 0.36, 0);
    const cGold = new THREE.BoxGeometry(1.22, 0.18, 0.8);
    cGold.translate(0, 0.72, 0);
    const cTrim = new THREE.BoxGeometry(1.42, 0.74, 0.18);
    cTrim.translate(0, 0.37, 0);
    const baseGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(cBase, 0.62, 0.38, 0.18),
          preparePartGeometry(cGold, 2.2, 1.75, 0.35),
          preparePartGeometry(cTrim, 1.5, 1.2, 0.32)
        ],
        false
      )
    );
    this.chestGroup.add(new THREE.Mesh(baseGeo, chestMat));

    const lidCyl = new THREE.CylinderGeometry(0.46, 0.46, 1.36, 10, 1, false, 0, Math.PI);
    lidCyl.rotateZ(Math.PI * 0.5);
    lidCyl.translate(0, 0, 0.46);
    const lidGeo = this.trackDisposable(preparePartGeometry(lidCyl, 1.35, 1.02, 0.28));
    this.chestLidPivot.position.set(0, 0.72, -0.46);
    this.chestLidPivot.add(new THREE.Mesh(lidGeo, chestMat));
    this.chestGroup.add(this.chestLidPivot);
    this.chestGroup.visible = false;
    this.worldRoot.add(this.chestGroup);
  }

  private placeTreasureOnIsland(islandIdx: number): void {
    this.activeTreasureIslandIdx = islandIdx % ARCHIPELAGO_ISLANDS.length;
    const isl = ARCHIPELAGO_ISLANDS[this.activeTreasureIslandIdx];
    const tx = isl.beachSpot.x;
    const tz = isl.beachSpot.z;
    const ty = Math.max(0.8, this.sampleIslandHeight(tx, tz).height);
    this.treasurePos.set(tx, ty, tz);
    this.treasureBeaconGroup.position.copy(this.treasurePos);
    this.treasureBeaconGroup.visible = true;
    this.chestGroup.visible = false;
    this.chestUnearthedTimer = 0;
  }

  private setupUIAndControls(): void {
    const radialItems: RadialWheelItem[] = [
      { id: 'toggle_helm', label: 'Barre du Galion', icon: '⚓', category: 'vehicle' },
      { id: 'fire_port', label: 'Bordée Bâbord', icon: '💥', category: 'weapon' },
      { id: 'fire_starboard', label: 'Bordée Tribord', icon: '💣', category: 'weapon' },
      { id: 'tool_sword', label: 'Sabre d’Abordage', icon: '⚔️', category: 'weapon' },
      { id: 'tool_hammer', label: 'Marteau Réparation', icon: '🔨', category: 'tool' },
      { id: 'tool_axe', label: 'Pelle à Trésor', icon: '⛏️', category: 'tool' },
      { id: 'board_ship', label: 'Remonter à Bord', icon: '🪢', category: 'vehicle' },
      { id: 'dive_toggle', label: 'Plongée Récifs', icon: '🤿', category: 'emote' }
    ];

    this.ctx.ui.setRadialItems(radialItems, (item) => {
      this.ctx.audio.playUIClick();
      if (item.id === 'toggle_helm') {
        this.toggleHelmMode();
      } else if (item.id === 'fire_port') {
        this.fireBroadside(1, true);
      } else if (item.id === 'fire_starboard') {
        this.fireBroadside(-1, true);
      } else if (item.id === 'tool_sword') {
        if (this.atHelm) this.toggleHelmMode();
        this.ctx.localAvatar.setEquippedTool('sword');
      } else if (item.id === 'tool_hammer') {
        if (this.atHelm) this.toggleHelmMode();
        this.ctx.localAvatar.setEquippedTool('hammer');
      } else if (item.id === 'tool_axe') {
        if (this.atHelm) this.toggleHelmMode();
        this.ctx.localAvatar.setEquippedTool('axe');
      } else if (item.id === 'board_ship') {
        this.boardFlagshipDeck();
      } else if (item.id === 'dive_toggle') {
        this.isDiving = !this.isDiving;
      }
      this.refreshToolbar();
    });

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'BracketLeft') {
        this.sailTrimAngle = Math.max(-1.05, this.sailTrimAngle - 0.16);
      } else if (e.code === 'BracketRight') {
        this.sailTrimAngle = Math.min(1.05, this.sailTrimAngle + 0.16);
      } else if (e.code === 'KeyR' && !this.atHelm) {
        this.repairHullPlanks();
      }
    };
    window.addEventListener('keydown', this.keydownHandler);

    this.refreshToolbar();
  }

  private toggleHelmMode(): void {
    this.atHelm = !this.atHelm;
    this.helmToggleLockout = 0.32;
    if (this.atHelm) {
      this.onDeck = true;
      this.isSwimming = false;
      this.isDiving = false;
      this.deckLocalPos.set(0, 3.55, -6.45);
      this.ctx.input.setContextMode('NAVAL');
      this.ctx.localAvatar.setEquippedTool('none');
    } else {
      this.ctx.input.setContextMode('ON_FOOT');
      this.ctx.localAvatar.setEquippedTool('sword');
    }
    this.refreshToolbar();
  }

  private boardFlagshipDeck(): void {
    this.atHelm = false;
    this.onDeck = true;
    this.isSwimming = false;
    this.isDiving = false;
    this.deckLocalPos.set(0, 3.55, -6.6);
    this.ctx.input.setContextMode('ON_FOOT');
    this.refreshToolbar();
  }

  private refreshToolbar(): void {
    const tool = this.ctx.localAvatar.getEquippedTool();
    const sailPct = Math.round(this.sailOpenness * 100);
    const hullPct = Math.round(this.hullHealth);

    const btnStyle = (active: boolean) =>
      `border:1px solid ${
        active ? '#19d4c6' : 'rgba(255,255,255,0.16)'
      };background:${
        active ? 'rgba(25,212,198,0.25)' : 'rgba(8,18,28,0.78)'
      };color:#ecfeff;cursor:pointer;`;

    const html = `
      <div>
        <span style="padding:2px 6px;border-radius:5px;background:rgba(8,18,28,0.85);border:1px solid rgba(255,209,102,0.4);color:#ffd166;font-weight:700;">
          🪙$${this.doubloons.toLocaleString()} 🛡️${hullPct}% ⛵${sailPct}%
        </span>
        <button data-act="helm" style="${btnStyle(this.atHelm)}">
          ${this.atHelm ? '🚶 Pont' : '⚓ Barre'}
        </button>
        ${
          this.atHelm
            ? `<button data-act="trim_left" style="${btnStyle(false)}">◀ Voile</button>
               <button data-act="trim_right" style="${btnStyle(false)}">Voile ▶</button>
               <button data-act="fire_port" style="${btnStyle(false)}">💥 Bâbord</button>
               <button data-act="fire_star" style="${btnStyle(false)}">💣 Tribord</button>`
            : `<button data-tool="sword" style="${btnStyle(tool === 'sword')}">⚔️ Sabre</button>
               <button data-tool="hammer" style="${btnStyle(tool === 'hammer')}">🔨 Coque</button>
               <button data-tool="axe" style="${btnStyle(tool === 'axe')}">⛏️ Trésor</button>
               <button data-act="board" style="${btnStyle(false)}">🪢 Galion</button>`
        }
      </div>
    `;

    this.ctx.ui.setWorldToolbarHTML(html, (container) => {
      container.querySelectorAll<HTMLButtonElement>('button[data-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const t = btn.dataset.tool as EquippedToolType;
          this.ctx.localAvatar.setEquippedTool(t);
          if (t === 'hammer') this.repairHullPlanks();
          this.ctx.audio.playUIClick();
          this.refreshToolbar();
        });
      });

      container.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.act;
          this.ctx.audio.playUIClick();
          if (act === 'helm') this.toggleHelmMode();
          else if (act === 'trim_left') this.sailTrimAngle = Math.max(-1.05, this.sailTrimAngle - 0.22);
          else if (act === 'trim_right') this.sailTrimAngle = Math.min(1.05, this.sailTrimAngle + 0.22);
          else if (act === 'fire_port') this.fireBroadside(1, true);
          else if (act === 'fire_star') this.fireBroadside(-1, true);
          else if (act === 'board') this.boardFlagshipDeck();
        });
      });
    });
  }

  public update(dt: number, elapsed: number): void {
    this.smoothedFps = this.smoothedFps * 0.92 + (1 / Math.max(0.001, dt)) * 0.08;
    this.waveTime = this.waveClockBase + elapsed;
    this.helmToggleLockout = Math.max(0, this.helmToggleLockout - dt);
    this.portReloadTimer = Math.max(0, this.portReloadTimer - dt);
    this.starboardReloadTimer = Math.max(0, this.starboardReloadTimer - dt);

    // 1. Slowly Evolving Tropical Sun & Trade Wind Vector
    this.timeOfDay = (this.timeOfDay + dt * 0.05) % 24;
    this.windAngleRad = wrapAnglePi(this.windAngleRad + Math.sin(elapsed * 0.07) * dt * 0.025);
    this.ctx.sky.setTimeOfDay(this.timeOfDay);
    this.ctx.sky.update(dt, this.playerPos);

    // 2. Galleon 4-Point Physical Buoyancy, Rudder & Sail Trim Physics
    this.updateGalleonBuoyancyAndPhysics(dt, this.waveTime);

    // 3. Player Deck Walking / Naval Helm / Swimming / Island Treasure Digging
    if (this.atHelm) {
      this.updateNavalHelmControls(dt);
    } else {
      this.updateOnFootDeckAndSwim(dt);
    }

    // 4. Enemy Pirate Fleet, Coastal Stone Forts & Parabolic Cannonball Ballistics
    this.updateEnemyShipsAndForts(dt, this.waveTime);
    this.updateBallisticsAndFX(dt, elapsed, this.waveTime);
    this.updateTreasureBeacon(dt, elapsed);

    // 5. Center Ocean & Seafloor dynamically around Camera + Underwater Caustics/Fog Transition
    const snapX = Math.round(this.ctx.camera.position.x / 8) * 8;
    const snapZ = Math.round(this.ctx.camera.position.z / 8) * 8;
    this.oceanMesh.position.set(snapX, 0, snapZ);
    this.seafloorMesh.position.set(snapX, -13.5, snapZ);

    updateOceanMaterial(this.oceanMat, this.waveTime, this.ctx.sky.sunDirection, this.ctx.camera.position);
    for (let i = 0; i < this.windHandles.length; i++) {
      this.windHandles[i].update(elapsed);
    }

    const camWaveY = evalWaveHeight(this.ctx.camera.position.x, this.ctx.camera.position.z, this.waveTime);
    const nowUnderwater = this.ctx.camera.position.y < camWaveY + 0.12;
    if (nowUnderwater) {
      this.cameraUnderwater = true;
      const fog = this.ctx.scene.fog as THREE.FogExp2 | null;
      if (fog && fog.isFogExp2) {
        fog.color.setHex(0x065573);
        fog.density = 0.019;
      }
    } else if (this.cameraUnderwater) {
      this.cameraUnderwater = false;
      this.ctx.sky.setTimeOfDay(this.timeOfDay);
    }

    this.seafloorMat.uniforms.uTime.value = elapsed;
    this.seafloorMat.uniforms.uSunDir.value.copy(this.ctx.sky.sunDirection);
    this.seafloorMat.uniforms.uUnderwater.value = nowUnderwater ? 1.0 : 0.0;

    // 6. P2P Synchronization (Player + Flagship Galleon + Weather/Wave Clock)
    this.syncNetworkState(dt);
    this.updateHUD(dt);
  }

  /**
   * 4-Point Physical Buoyancy sampling sampleGerstnerOcean(x, z, waveTime) at
   * Bow, Stern, Port, and Starboard hull points + Wind/Sail propulsion!
   */
  private updateGalleonBuoyancyAndPhysics(dt: number, waveTime: number): void {
    const cosY = Math.cos(this.shipYaw);
    const sinY = Math.sin(this.shipYaw);

    // Wind efficiency: alignment between wind direction and trimmed sail normal
    const sailNormalAngle = this.shipYaw + this.sailTrimAngle;
    const windAlign = Math.cos((this.windAngleRad - sailNormalAngle) * 0.65);
    const tailwindFactor = Math.max(0.22, 0.35 + 0.65 * Math.max(0, windAlign));
    const targetMaxSpeed = this.sailOpenness * tailwindFactor * 11.8; // up to ~42 km/h

    if (this.atHelm) {
      const anchorHeld = this.ctx.input.state.handbrake;
      const helmTargetSpeed = anchorHeld ? 0 : targetMaxSpeed;
      const accelRate = anchorHeld ? 2.6 : 0.95;
      this.shipForwardSpeed += (helmTargetSpeed - this.shipForwardSpeed) * Math.min(1, dt * accelRate);
    } else {
      // Gently drift or maintain trimmed sail cruise when crew walks the deck!
      const unmannedTarget = this.sailOpenness > 0.15 ? targetMaxSpeed * 0.45 : 0;
      this.shipForwardSpeed += (unmannedTarget - this.shipForwardSpeed) * Math.min(1, dt * 0.8);
    }

    // Rudder yaw torque proportional to forward water flow + maneuverability
    const turnAuthority = 0.24 + Math.min(1, Math.abs(this.shipForwardSpeed) / 7.5) * 0.52;
    this.shipYaw = wrapAnglePi(this.shipYaw - this.rudderAngle * turnAuthority * dt);

    const nextX = this.shipPos.x + Math.sin(this.shipYaw) * this.shipForwardSpeed * dt;
    const nextZ = this.shipPos.z + Math.cos(this.shipYaw) * this.shipForwardSpeed * dt;

    // Prevent Galleon from beaching onto shallow island land (draft = -2.0m)
    const bowCheckX = nextX + Math.sin(this.shipYaw) * 11.0;
    const bowCheckZ = nextZ + Math.cos(this.shipYaw) * 11.0;
    const seabedAtBow = this.sampleIslandHeight(bowCheckX, bowCheckZ).height;

    if (seabedAtBow > -1.35) {
      // Gently deflect off sandbar shoals
      this.shipForwardSpeed *= -0.25;
      for (const isl of ARCHIPELAGO_ISLANDS) {
        const d = Math.hypot(this.shipPos.x - isl.x, this.shipPos.z - isl.z);
        if (d < isl.radius * 1.25) {
          this.shipPos.x += ((this.shipPos.x - isl.x) / Math.max(1, d)) * 0.45;
          this.shipPos.z += ((this.shipPos.z - isl.z) / Math.max(1, d)) * 0.45;
        }
      }
    } else {
      this.shipPos.x = nextX;
      this.shipPos.z = nextZ;
    }

    this.shipVel.set(
      Math.sin(this.shipYaw) * this.shipForwardSpeed,
      0,
      Math.cos(this.shipYaw) * this.shipForwardSpeed
    );

    // 4-Point Physical Buoyancy Sensors: Bow (0,+9.8), Stern (0,-9.8), Port (+3.2,0), Starboard (-3.2,0)
    const bowX = this.shipPos.x + 9.8 * sinY;
    const bowZ = this.shipPos.z + 9.8 * cosY;
    const sternX = this.shipPos.x - 9.8 * sinY;
    const sternZ = this.shipPos.z - 9.8 * cosY;
    const portX = this.shipPos.x + 3.2 * cosY;
    const portZ = this.shipPos.z - 3.2 * sinY;
    const starX = this.shipPos.x - 3.2 * cosY;
    const starZ = this.shipPos.z + 3.2 * sinY;

    const hBow = evalWaveHeight(bowX, bowZ, waveTime);
    const hStern = evalWaveHeight(sternX, sternZ, waveTime);
    const hPort = evalWaveHeight(portX, portZ, waveTime);
    const hStarboard = evalWaveHeight(starX, starZ, waveTime);

    const targetHeave = (hBow + hStern + hPort + hStarboard) * 0.25 - 0.35;
    const targetPitch = -Math.atan2(hBow - hStern, 19.6);
    const targetRoll = Math.atan2(hPort - hStarboard, 6.4) + this.rudderAngle * 0.055;

    const smooth = Math.min(1, dt * 5.2);
    this.shipPos.y += (targetHeave - this.shipPos.y) * smooth;
    this.shipPitch += (targetPitch - this.shipPitch) * smooth;
    this.shipRoll += (targetRoll - this.shipRoll) * smooth;

    this.galleonGroup.position.copy(this.shipPos);
    this.galleonGroup.rotation.set(this.shipPitch, this.shipYaw, this.shipRoll, 'YXZ');
    this.galleonGroup.updateMatrixWorld(true);

    // Animate Helm Wheel, 3 Billowing Sails & Hull Wake Foam Ring
    this.helmWheelMesh.rotation.z = this.rudderAngle * Math.PI * 1.35;
    for (let i = 0; i < this.sailPivots.length; i++) {
      this.sailPivots[i].rotation.y = this.sailTrimAngle;
      const openScale = 0.14 + this.sailOpenness * 0.86;
      const billow = 0.3 + this.sailOpenness * tailwindFactor * 0.95;
      this.sailMeshes[i].scale.set(1, openScale, billow);
    }

    this.wakeMesh.position.set(this.shipPos.x, targetHeave + 0.42, this.shipPos.z);
    this.wakeMesh.rotation.y = this.shipYaw;
    this.wakeMat.uniforms.uTime.value = waveTime;
    this.wakeMat.uniforms.uSpeedFactor.value = Math.min(1, Math.abs(this.shipForwardSpeed) / 11.0);
  }

  private updateNavalHelmControls(dt: number): void {
    const inp = this.ctx.input.state;

    // Exit Helm on E / F (interactJustPressed), V (switchModeJustPressed), or Mobile Quitter button
    if (this.helmToggleLockout <= 0 && (inp.interactJustPressed || inp.switchModeJustPressed)) {
      this.toggleHelmMode();
      return;
    }

    const dedicatedTrimInput = Math.abs(inp.rollAxis - inp.moveX) > 0.05 || inp.sprint;

    // Rudder Steering (A/D or Left Stick when not holding Shift sail-trim modifier)
    const steerInput = inp.sprint ? 0 : inp.moveX;
    if (Math.abs(steerInput) > 0.05) {
      this.rudderAngle = Math.max(-1, Math.min(1, this.rudderAngle + steerInput * dt * 1.65));
    } else {
      this.rudderAngle *= Math.max(0, 1 - dt * 1.8);
    }

    // Sail Openness (W/S or Throttle/Brake)
    const sailDelta = inp.throttle - inp.brake + inp.moveZ * 0.65;
    if (Math.abs(sailDelta) > 0.08) {
      this.sailOpenness = Math.max(0, Math.min(1, this.sailOpenness + sailDelta * dt * 0.55));
      this.refreshToolbar();
    }

    // Sail Trim Angle (Touch Voile -/+, Gamepad LB/RB, Shift+A/D, or [ / ] & Toolbar buttons)
    if (dedicatedTrimInput && Math.abs(inp.rollAxis) > 0.05) {
      this.sailTrimAngle = Math.max(
        -1.08,
        Math.min(1.08, this.sailTrimAngle + inp.rollAxis * dt * 1.15)
      );
    }

    // Broadside Cannon Firing! Left-Click fires the side camera aims toward; Right-Click fires opposite!
    if (inp.primaryJustPressed) {
      const camDir = this.tmpVecA;
      this.ctx.camera.getWorldDirection(camDir);
      // Ship right (Starboard) in world XZ is (-cosYaw, 0, +sinYaw); Port (+X) is (+cosYaw, 0, -sinYaw)
      const portDot = camDir.x * Math.cos(this.shipYaw) - camDir.z * Math.sin(this.shipYaw);
      this.fireBroadside(portDot >= 0 ? 1 : -1, true);
    } else if (inp.secondaryJustPressed) {
      const camDir = this.tmpVecA;
      this.ctx.camera.getWorldDirection(camDir);
      const portDot = camDir.x * Math.cos(this.shipYaw) - camDir.z * Math.sin(this.shipYaw);
      this.fireBroadside(portDot >= 0 ? -1 : 1, true);
    }

    // Lock Captain Avatar cleanly to Quarterdeck Helm
    this.deckLocalPos.set(0, 3.55, -6.45);
    this.playerPos.copy(this.deckLocalPos).applyMatrix4(this.galleonGroup.matrixWorld);
    this.playerYaw = this.shipYaw;
    this.ctx.localAvatar.root.position.copy(this.playerPos);
    this.ctx.localAvatar.root.rotation.set(this.shipPitch, this.shipYaw, this.shipRoll, 'YXZ');
    this.ctx.localAvatar.updateAnimation(dt, 'drive', 0, this.rudderAngle, 0);

    // Wide Naval Tactical Camera overlooking sails, sea swells & enemy broadsides
    const pivot = this.tmpVecB.set(this.shipPos.x, this.shipPos.y + 7.2, this.shipPos.z);
    const camTarget = this.ctx.input.computeSafeCameraPosition(pivot, 24.0, []);
    const minOceanY = evalWaveHeight(camTarget.x, camTarget.z, this.waveTime) + 1.4;
    if (camTarget.y < minOceanY) camTarget.y = minOceanY;
    this.ctx.camera.position.lerp(camTarget, Math.min(1, dt * 12));
    this.ctx.camera.lookAt(pivot);

    const speedRatio = Math.min(1, Math.abs(this.shipForwardSpeed) / 11.5);
    this.ctx.postFX.setSpeedFactor(speedRatio * 0.45);
    this.ctx.audio.updateWindRush(0.12 + speedRatio * 0.55);
  }

  private getDeckSurfaceLocalY(lx: number, lz: number): number {
    if (lz < -4.8) return 3.55; // Quarterdeck
    if (lz < -2.9 && Math.abs(lx) > 1.1) {
      // Staircase transition
      const t = (-2.9 - lz) / 1.9;
      return 1.85 + t * 1.7;
    }
    if (lz > 6.0) return 3.05; // Foredeck
    return 1.85; // Main Gun Deck
  }

  private updateOnFootDeckAndSwim(dt: number): void {
    const inp = this.ctx.input.state;
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.ctx.postFX.setSpeedFactor(0);

    const pivot = this.tmpVecA.set(this.playerPos.x, this.playerPos.y + 1.62, this.playerPos.z);
    const camForward = this.tmpVecB.set(
      pivot.x - this.ctx.camera.position.x,
      0,
      pivot.z - this.ctx.camera.position.z
    );
    if (camForward.lengthSq() < 1e-4) camForward.set(0, 0, 1);
    else camForward.normalize();
    const camRight = this.tmpVecC.crossVectors(camForward, WORLD_UP).normalize();

    const moveWorld = new THREE.Vector3()
      .addScaledVector(camForward, inp.moveZ)
      .addScaledVector(camRight, inp.moveX);
    const moveMag = Math.min(1, moveWorld.length());
    if (moveMag > 1e-3) moveWorld.normalize();

    // Check Interact (E) at Quarterdeck Helm, Boarding Ladders, Deck Cannons, or Buried Treasure!
    if (inp.interactJustPressed && this.helmToggleLockout <= 0) {
      const localCheck = this.galleonGroup.worldToLocal(this.playerPos.clone());
      if (this.onDeck && Math.hypot(localCheck.x, localCheck.z + 5.9) < 2.8) {
        this.toggleHelmMode();
        return;
      }
      if (!this.onDeck && Math.abs(localCheck.x) < 5.4 && Math.abs(localCheck.z) < 12.6) {
        this.onDeck = true;
        this.isSwimming = false;
        this.isDiving = false;
        this.deckLocalPos.set(localCheck.x > 0 ? 2.2 : -2.2, 1.88, Math.max(-4, Math.min(5, localCheck.z)));
        this.ctx.ui.notify('À Bord du Galion', 'Vous grimpez l’échelle de coupée !', 'info');
      } else if (this.playerPos.distanceTo(this.treasurePos) < 5.5 && this.chestUnearthedTimer <= 0) {
        this.digUpTreasureChest();
      }
    }

    // Left-Click melee / hull plank repair / individual deck cannon / treasure digging!
    if (inp.primaryJustPressed && this.attackTimer <= 0) {
      this.attackTimer = 0.36;
      const tool = this.ctx.localAvatar.getEquippedTool();

      if (this.playerPos.distanceTo(this.treasurePos) < 5.2 && this.chestUnearthedTimer <= 0) {
        this.digUpTreasureChest();
      } else if (this.onDeck && tool === 'hammer') {
        this.repairHullPlanks();
      } else if (this.onDeck && Math.abs(this.deckLocalPos.x) > 1.75 && Math.abs(this.deckLocalPos.z - 0.8) < 4.5) {
        this.fireBroadside(this.deckLocalPos.x > 0 ? 1 : -1, true);
      } else {
        this.ctx.audio.playSwordSlash();
      }
    }

    const walkSpeed = inp.sprint ? 7.8 : 4.9;

    if (this.onDeck) {
      // Transform world movement vector into Galleon local deck space!
      const invShipQuat = this.tmpQuat.copy(this.galleonGroup.quaternion).invert();
      const localMove = moveWorld.clone().applyQuaternion(invShipQuat);
      this.deckLocalPos.x += localMove.x * moveMag * walkSpeed * dt;
      this.deckLocalPos.z += localMove.z * moveMag * walkSpeed * dt;

      if (inp.jumpJustPressed) {
        this.playerVel.y = 6.8;
      }
      this.playerVel.y -= 18.5 * dt;
      this.deckLocalPos.y += this.playerVel.y * dt;

      const deckSurfaceY = this.getDeckSurfaceLocalY(this.deckLocalPos.x, this.deckLocalPos.z);
      if (this.deckLocalPos.y <= deckSurfaceY) {
        this.deckLocalPos.y = deckSurfaceY;
        if (this.playerVel.y < 0) this.playerVel.y = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }

      // Keep inside railings unless jumping overboard!
      if (this.deckLocalPos.y < deckSurfaceY + 0.65) {
        this.deckLocalPos.x = Math.max(-2.85, Math.min(2.85, this.deckLocalPos.x));
        this.deckLocalPos.z = Math.max(-10.4, Math.min(10.8, this.deckLocalPos.z));
      } else if (Math.abs(this.deckLocalPos.x) > 3.45 || Math.abs(this.deckLocalPos.z) > 11.8) {
        // Player leaped overboard into the Gerstner Ocean!
        this.onDeck = false;
        this.playerPos.copy(this.deckLocalPos).applyMatrix4(this.galleonGroup.matrixWorld);
        this.playerVel.copy(moveWorld).multiplyScalar(walkSpeed);
      }

      if (this.onDeck) {
        this.playerPos.copy(this.deckLocalPos).applyMatrix4(this.galleonGroup.matrixWorld);
        if (moveMag > 0.1) {
          this.playerYaw = Math.atan2(moveWorld.x, moveWorld.z);
          this.footstepTimer -= dt * (inp.sprint ? 1.5 : 1.0);
          if (this.footstepTimer <= 0 && this.onGround) {
            this.footstepTimer = 0.42;
            this.ctx.audio.playFootstep('wood', inp.sprint);
          }
        }
      }
    }

    if (!this.onDeck) {
      const waveY = evalWaveHeight(this.playerPos.x, this.playerPos.z, this.waveTime);
      const groundY = this.sampleIslandHeight(this.playerPos.x, this.playerPos.z).height;

      this.isSwimming = groundY < waveY - 1.15 && this.playerPos.y <= waveY + 0.25;

      if (this.isSwimming) {
        if (inp.crouch) this.isDiving = true;
        if (inp.jump && this.playerPos.y > waveY - 1.2) this.isDiving = false;

        const swimSpd = inp.sprint ? 6.8 : 4.8;
        this.playerVel.x += (moveWorld.x * moveMag * swimSpd - this.playerVel.x) * Math.min(1, dt * 6);
        this.playerVel.z += (moveWorld.z * moveMag * swimSpd - this.playerVel.z) * Math.min(1, dt * 6);

        if (inp.crouch || (this.isDiving && this.ctx.input.state.cameraPitch < -0.25 && moveMag > 0.2)) {
          this.isDiving = true;
          const diveRate = inp.crouch ? -4.2 : Math.sin(this.ctx.input.state.cameraPitch) * swimSpd;
          this.playerVel.y += (diveRate - this.playerVel.y) * Math.min(1, dt * 5);
        } else if (inp.jump) {
          this.playerVel.y = 4.4;
          if (this.playerPos.y >= waveY - 0.6) this.isDiving = false;
        } else if (!this.isDiving) {
          // Buoyant surface treading on Gerstner swells
          const targetSwimY = waveY - 0.85;
          this.playerPos.y += (targetSwimY - this.playerPos.y) * Math.min(1, dt * 6.5);
          this.playerVel.y *= 0.7;
        } else {
          this.playerVel.y *= Math.max(0, 1 - dt * 4);
        }

        this.playerPos.addScaledVector(this.playerVel, dt);
        const minFloor = Math.max(-13.0, groundY + 0.4);
        if (this.playerPos.y < minFloor) this.playerPos.y = minFloor;

        // Auto-climb Galleon Boarding Ladders when swimming right up to the hull + pressing Jump!
        const localSwim = this.galleonGroup.worldToLocal(this.playerPos.clone());
        if (inp.jumpJustPressed && Math.abs(localSwim.x) < 4.5 && Math.abs(localSwim.z) < 11.2) {
          this.onDeck = true;
          this.isSwimming = false;
          this.isDiving = false;
          this.deckLocalPos.set(localSwim.x > 0 ? 2.3 : -2.3, 1.9, Math.max(-4, Math.min(5, localSwim.z)));
        }
      } else {
        // Walking / Running on Tropical Island Beaches & Volcanic Cliffs!
        this.playerVel.x += (moveWorld.x * moveMag * walkSpeed - this.playerVel.x) * Math.min(1, dt * 12);
        this.playerVel.z += (moveWorld.z * moveMag * walkSpeed - this.playerVel.z) * Math.min(1, dt * 12);
        if (this.onGround && inp.jumpJustPressed) {
          this.playerVel.y = 7.2;
          this.onGround = false;
        }
        this.playerVel.y -= 19.2 * dt;
        this.playerPos.addScaledVector(this.playerVel, dt);

        if (this.playerPos.y <= groundY) {
          this.playerPos.y = groundY;
          if (this.playerVel.y < 0) this.playerVel.y = 0;
          this.onGround = true;
        } else {
          this.onGround = false;
        }

        if (this.onGround && moveMag > 0.2) {
          this.footstepTimer -= dt * (inp.sprint ? 1.5 : 1.0);
          if (this.footstepTimer <= 0) {
            this.footstepTimer = 0.42;
            const surf: SurfaceMaterialType = this.playerPos.y > 10 ? 'rock' : 'sand';
            this.ctx.audio.playFootstep(surf, inp.sprint);
          }
        }
      }

      if (moveMag > 0.1) {
        this.playerYaw = Math.atan2(moveWorld.x, moveWorld.z);
      }
    }

    this.ctx.localAvatar.root.position.copy(this.playerPos);
    this.ctx.localAvatar.root.rotation.set(0, this.playerYaw, 0);

    const speedVal = moveMag * walkSpeed;
    let anim: AvatarAnimState = 'idle';
    if (this.attackTimer > 0) anim = 'attack';
    else if (this.isSwimming) anim = 'swim';
    else if (!this.onGround) anim = 'jump';
    else if (speedVal > 6.0) anim = 'run';
    else if (speedVal > 0.3) anim = 'walk';

    this.ctx.localAvatar.updateAnimation(dt, anim, speedVal, 0, 0);
    this.ctx.audio.updateWindRush(0.08);

    pivot.set(this.playerPos.x, this.playerPos.y + 1.62, this.playerPos.z);
    const camPos = this.ctx.input.computeSafeCameraPosition(pivot, 6.4, []);
    if (!this.isDiving) {
      const floorClamp = this.sampleIslandHeight(camPos.x, camPos.z).height + 0.5;
      if (camPos.y < floorClamp) camPos.y = floorClamp;
    }
    this.ctx.camera.position.lerp(camPos, Math.min(1, dt * 16));
    this.ctx.camera.lookAt(pivot);
  }

  private repairHullPlanks(): void {
    if (this.hullHealth >= this.maxHullHealth) {
      this.ctx.ui.notify('Coque Intacte', 'La coque du galion est déjà à 100% !', 'info');
      return;
    }
    this.hullHealth = Math.min(this.maxHullHealth, this.hullHealth + 28);
    this.ctx.audio.playBuildSnap();
    this.spawnSplinters(this.playerPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 10, 0xd99e5b);
    this.ctx.ui.notify('Réparation de Coque', `Planches clouées : intégrité à ${Math.round(this.hullHealth)}% !`, 'success');
    this.refreshToolbar();
  }

  private digUpTreasureChest(): void {
    this.chestUnearthedTimer = 5.5;
    this.treasureBeaconGroup.visible = false;
    this.chestGroup.visible = true;
    this.chestGroup.position.copy(this.treasurePos);
    this.chestGroup.rotation.y = this.playerYaw + Math.PI;
    this.chestLidPivot.rotation.x = 0;

    this.doubloons += 1000;
    this.ctx.audio.playTreeChop(false);
    this.ctx.audio.playBuildSnap();
    this.ctx.input.vibrate(150, 0.85, 0.5);
    this.spawnSplinters(this.treasurePos.clone().add(new THREE.Vector3(0, 0.5, 0)), 22, 0xffd166);

    this.ctx.ui.notify(
      '🏴‍☠️ COFFRE LÉGENDAIRE DÉTERRÉ !',
      '+$1,000 Doublons d’Or ! Une nouvelle carte au trésor apparaît sur le radar !',
      'success'
    );
    this.refreshToolbar();
  }

  private fireBroadside(sideSign: 1 | -1, broadcast: boolean): void {
    // sideSign: +1 = Port (+X local), -1 = Starboard (-X local)
    if (sideSign > 0 && this.portReloadTimer > 0) return;
    if (sideSign < 0 && this.starboardReloadTimer > 0) return;

    if (sideSign > 0) this.portReloadTimer = 1.65;
    else this.starboardReloadTimer = 1.65;

    const cannonZs = [-2.4, -0.3, 1.8, 3.9];
    const pitchBoost = Math.max(0.06, Math.min(0.36, 0.16 + this.ctx.input.state.cameraPitch * 0.35));
    const muzzleSpeed = 56.0;

    const lateralWorld = new THREE.Vector3(sideSign * 1, 0, 0).applyQuaternion(this.galleonGroup.quaternion);
    lateralWorld.y = pitchBoost;
    lateralWorld.normalize();

    for (let i = 0; i < cannonZs.length; i++) {
      const muzzleLocal = new THREE.Vector3(sideSign * 3.35, 2.38, cannonZs[i]);
      const muzzleWorld = muzzleLocal.applyMatrix4(this.galleonGroup.matrixWorld);
      const vel = lateralWorld
        .clone()
        .multiplyScalar(muzzleSpeed + (i - 1.5) * 1.1)
        .add(this.shipVel);

      this.spawnCannonball(muzzleWorld, vel, true);
      this.spawnSmokePuff(muzzleWorld, lateralWorld.clone().multiplyScalar(4.0));
    }

    this.ctx.audio.playCannonFire(0);
    this.ctx.input.vibrate(130, 0.9, 0.5);

    if (broadcast) {
      this.ctx.network.broadcastWorldEvent('projectile_fire', this.id, {
        kind: 'broadside',
        side: sideSign,
        x: this.shipPos.x,
        y: this.shipPos.y + 2.4,
        z: this.shipPos.z,
        vx: lateralWorld.x * muzzleSpeed + this.shipVel.x,
        vy: lateralWorld.y * muzzleSpeed,
        vz: lateralWorld.z * muzzleSpeed + this.shipVel.z
      });
    }
  }

  private spawnCannonball(pos: THREE.Vector3, vel: THREE.Vector3, fromPlayer: boolean): void {
    for (const b of this.cannonballs) {
      if (b.active) continue;
      b.active = true;
      b.fromPlayer = fromPlayer;
      b.pos.copy(pos);
      b.vel.copy(vel);
      b.age = 0;
      break;
    }
  }

  private spawnSmokePuff(pos: THREE.Vector3, baseVel: THREE.Vector3): void {
    let count = 0;
    for (const s of this.smokePuffs) {
      if (s.active) continue;
      s.active = true;
      s.pos.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6));
      s.vel.copy(baseVel).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.4 + Math.random() * 1.5, (Math.random() - 0.5) * 2));
      s.scale = 0.65 + Math.random() * 0.5;
      s.life = 0;
      s.maxLife = 1.1 + Math.random() * 0.6;
      count++;
      if (count >= 2) break;
    }
  }

  private spawnWaterSplash(x: number, y: number, z: number, scale = 1.0): void {
    for (const sp of this.splashes) {
      if (sp.active) continue;
      sp.active = true;
      sp.pos.set(x, y, z);
      sp.scale = scale;
      sp.life = 0;
      sp.maxLife = 1.05;
      break;
    }
  }

  private spawnSplinters(origin: THREE.Vector3, count: number, hexColor: number): void {
    let spawned = 0;
    for (const sp of this.splinters) {
      if (sp.active) continue;
      sp.active = true;
      sp.pos.copy(origin);
      const a = Math.random() * Math.PI * 2;
      const spd = 3.5 + Math.random() * 6.5;
      sp.vel.set(Math.cos(a) * spd, 3.0 + Math.random() * 5.5, Math.sin(a) * spd);
      sp.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      sp.scale = 0.75 + Math.random() * 0.85;
      sp.life = 0;
      sp.maxLife = 0.7 + Math.random() * 0.5;
      sp.color.setHex(hexColor);
      spawned++;
      if (spawned >= count) break;
    }
  }

  private updateEnemyShipsAndForts(dt: number, waveTime: number): void {
    // 1. Coastal Pirate Stone Forts
    for (const fort of this.coastalForts) {
      if (fort.hp <= 0) {
        fort.respawnTimer -= dt;
        fort.turretGroup.visible = false;
        if (fort.respawnTimer <= 0) {
          fort.hp = fort.maxHp;
          fort.turretGroup.visible = true;
        }
        continue;
      }

      const dx = this.shipPos.x - fort.pos.x;
      const dz = this.shipPos.z - fort.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 205) {
        const aimYaw = Math.atan2(dx, dz);
        fort.turretGroup.rotation.y = aimYaw;

        fort.fireCooldown -= dt;
        if (fort.fireCooldown <= 0) {
          fort.fireCooldown = 4.2 + Math.random() * 1.5;
          const speed = 52.0;
          const flightT = dist / speed;
          const leadX = this.shipPos.x + this.shipVel.x * flightT * 0.65 - fort.pos.x;
          const leadZ = this.shipPos.z + this.shipVel.z * flightT * 0.65 - fort.pos.z;
          const horizD = Math.max(10, Math.hypot(leadX, leadZ));
          const vy = ((this.shipPos.y + 2.0 - fort.pos.y) + 0.5 * 9.81 * flightT * flightT) / flightT;
          const vx = (leadX / horizD) * speed;
          const vz = (leadZ / horizD) * speed;

          const muzzle = fort.pos.clone().add(new THREE.Vector3((leadX / horizD) * 2.5, 0.5, (leadZ / horizD) * 2.5));
          this.spawnCannonball(muzzle, new THREE.Vector3(vx, vy, vz), false);
          this.spawnSmokePuff(muzzle, new THREE.Vector3(vx * 0.08, 1.5, vz * 0.08));
          this.ctx.audio.playCannonFire(dist);
        }
      }
    }

    // 2. Roving Enemy Pirate Brigantines with 4-Point Gerstner Buoyancy
    for (let i = 0; i < this.enemyShips.length; i++) {
      const es = this.enemyShips[i];
      if (!es) continue;

      if (es.hp <= 0) {
        es.sinkingTimer += dt;
        es.pos.y -= dt * 2.4;
        es.roll += dt * 0.35;
        es.pitch -= dt * 0.18;
        es.group.position.copy(es.pos);
        es.group.rotation.set(es.pitch, es.yaw, es.roll, 'YXZ');
        es.wakeMesh.visible = false;

        if (es.sinkingTimer > 9.0) {
          // Respawn a new Pirate Brigantine on the outer archipelago patrol route
          es.hp = es.maxHp;
          es.sinkingTimer = 0;
          es.patrolAngle += Math.PI;
          es.pos.set(
            es.patrolCenter.x + Math.cos(es.patrolAngle) * es.patrolRadius,
            0,
            es.patrolCenter.y + Math.sin(es.patrolAngle) * es.patrolRadius
          );
          es.wakeMesh.visible = true;
        }
        continue;
      }

      es.patrolAngle += (es.speed / es.patrolRadius) * dt;
      const targetX = es.patrolCenter.x + Math.cos(es.patrolAngle) * es.patrolRadius;
      const targetZ = es.patrolCenter.y + Math.sin(es.patrolAngle) * es.patrolRadius;
      const toX = targetX - es.pos.x;
      const toZ = targetZ - es.pos.z;
      const desiredYaw = Math.atan2(toX, toZ);
      es.yaw = wrapAnglePi(es.yaw + wrapAnglePi(desiredYaw - es.yaw) * Math.min(1, dt * 1.4));

      const nx = es.pos.x + Math.sin(es.yaw) * es.speed * dt;
      const nz = es.pos.z + Math.cos(es.yaw) * es.speed * dt;
      if (this.sampleIslandHeight(nx, nz).height < -2.2) {
        es.pos.x = nx;
        es.pos.z = nz;
      } else {
        es.patrolAngle += 0.35;
      }

      // 4-point Gerstner buoyancy on enemy Pirate Ship
      const cY = Math.cos(es.yaw);
      const sY = Math.sin(es.yaw);
      const hB = evalWaveHeight(es.pos.x + 8 * sY, es.pos.z + 8 * cY, waveTime);
      const hS = evalWaveHeight(es.pos.x - 8 * sY, es.pos.z - 8 * cY, waveTime);
      const hP = evalWaveHeight(es.pos.x + 2.6 * cY, es.pos.z - 2.6 * sY, waveTime);
      const hSt = evalWaveHeight(es.pos.x - 2.6 * cY, es.pos.z + 2.6 * sY, waveTime);

      es.pos.y += ((hB + hS + hP + hSt) * 0.25 - 0.3 - es.pos.y) * Math.min(1, dt * 5);
      es.pitch += (-Math.atan2(hB - hS, 16.0) - es.pitch) * Math.min(1, dt * 5);
      es.roll += (Math.atan2(hP - hSt, 5.2) - es.roll) * Math.min(1, dt * 5);

      es.group.position.copy(es.pos);
      es.group.rotation.set(es.pitch, es.yaw, es.roll, 'YXZ');
      es.wakeMesh.position.set(es.pos.x, es.pos.y + 0.45, es.pos.z);
      es.wakeMesh.rotation.y = es.yaw;

      // Enemy broadside duel against player's Galleon
      const distPlayer = es.pos.distanceTo(this.shipPos);
      if (distPlayer < 180) {
        es.fireCooldown -= dt;
        if (es.fireCooldown <= 0) {
          es.fireCooldown = 4.6 + Math.random() * 1.8;
          const spd = 49.0;
          const t = distPlayer / spd;
          const dx = this.shipPos.x - es.pos.x;
          const dz = this.shipPos.z - es.pos.z;
          const hd = Math.max(8, Math.hypot(dx, dz));
          const vy = ((this.shipPos.y + 2.0 - (es.pos.y + 2.2)) + 0.5 * 9.81 * t * t) / t;
          const muzzle = es.pos.clone().add(new THREE.Vector3((dx / hd) * 3.0, 2.3, (dz / hd) * 3.0));
          this.spawnCannonball(muzzle, new THREE.Vector3((dx / hd) * spd, vy, (dz / hd) * spd), false);
          this.spawnSmokePuff(muzzle, new THREE.Vector3((dx / hd) * 3.5, 1.5, (dz / hd) * 3.5));
          this.ctx.audio.playCannonFire(distPlayer);
        }
      }
    }
  }

  private updateBallisticsAndFX(dt: number, elapsed: number, waveTime: number): void {
    let ballCount = 0;

    for (const b of this.cannonballs) {
      if (!b.active) continue;
      b.age += dt;
      b.vel.y -= 9.81 * dt;
      b.pos.addScaledVector(b.vel, dt);

      if (b.age > 8.5) {
        b.active = false;
        continue;
      }

      let hitResolved = false;

      if (b.fromPlayer) {
        // Check hits against Enemy Pirate Ships
        for (const es of this.enemyShips) {
          if (es.hp <= 0) continue;
          if (Math.hypot(b.pos.x - es.pos.x, b.pos.z - es.pos.z) < 7.2 && Math.abs(b.pos.y - (es.pos.y + 2.2)) < 4.5) {
            es.hp -= 36;
            this.spawnSplinters(b.pos, 14, 0xc88a4b);
            this.spawnSmokePuff(b.pos, new THREE.Vector3(0, 2.5, 0));
            this.ctx.audio.playTreeChop(es.hp <= 0);
            if (es.hp <= 0) {
              this.doubloons += 800;
              this.ctx.ui.notify('💥 Navire Pirate Coulé !', `${es.name} sombre sous les flots ! +$800 Doublons !`, 'success');
              this.refreshToolbar();
            }
            b.active = false;
            hitResolved = true;
            break;
          }
        }

        // Check hits against Coastal Pirate Stone Forts
        if (!hitResolved) {
          for (const fort of this.coastalForts) {
            if (fort.hp <= 0) continue;
            if (b.pos.distanceTo(fort.pos) < 7.8) {
              fort.hp -= 35;
              this.spawnSplinters(b.pos, 14, 0xa8a298);
              this.spawnSmokePuff(b.pos, new THREE.Vector3(0, 2.8, 0));
              this.ctx.audio.playTreeChop(fort.hp <= 0);
              if (fort.hp <= 0) {
                fort.respawnTimer = 60;
                this.doubloons += 750;
                this.ctx.ui.notify('🏰 Bastion Pirate Neutralisé !', `${fort.name} réduit au silence ! +$750 Doublons !`, 'success');
                this.refreshToolbar();
              }
              b.active = false;
              hitResolved = true;
              break;
            }
          }
        }
      } else {
        // Enemy / Fort shot hitting Player Galleon!
        const localHit = this.galleonGroup.worldToLocal(b.pos.clone());
        if (Math.abs(localHit.x) < 3.6 && Math.abs(localHit.z) < 11.4 && localHit.y > -0.5 && localHit.y < 5.2) {
          this.hullHealth = Math.max(12, this.hullHealth - 9);
          this.spawnSplinters(b.pos, 14, 0xd49655);
          this.ctx.audio.playTreeChop(false);
          this.ctx.input.vibrate(110, 0.75, 0.4);
          this.refreshToolbar();
          b.active = false;
          hitResolved = true;
        }
      }

      if (hitResolved) continue;

      // Check Island Terrain or Gerstner Ocean Surface Impact!
      const landY = this.sampleIslandHeight(b.pos.x, b.pos.z).height;
      const oceanY = evalWaveHeight(b.pos.x, b.pos.z, waveTime);

      if (b.pos.y <= oceanY && oceanY >= landY) {
        this.spawnWaterSplash(b.pos.x, oceanY, b.pos.z, 1.0 + Math.random() * 0.35);
        b.active = false;
        continue;
      }
      if (b.pos.y <= landY) {
        this.spawnSplinters(b.pos, 8, 0xd8c28d);
        b.active = false;
        continue;
      }

      this.dummy.position.copy(b.pos);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.cannonballInst.setMatrixAt(ballCount++, this.dummy.matrix);
    }
    this.cannonballInst.count = ballCount;
    this.cannonballInst.instanceMatrix.needsUpdate = true;

    // Update Cannon Smoke Puffs
    let sCount = 0;
    for (const s of this.smokePuffs) {
      if (!s.active) continue;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        continue;
      }
      s.pos.addScaledVector(s.vel, dt);
      s.vel.multiplyScalar(Math.max(0, 1 - dt * 1.8));
      const t = s.life / s.maxLife;
      const sc = s.scale * (0.8 + t * 2.4) * (1 - t * 0.45);
      this.dummy.position.copy(s.pos);
      this.dummy.rotation.set(elapsed, s.life * 2, 0);
      this.dummy.scale.setScalar(sc);
      this.dummy.updateMatrix();
      this.smokeInst.setMatrixAt(sCount++, this.dummy.matrix);
    }
    this.smokeInst.count = sCount;
    this.smokeInst.instanceMatrix.needsUpdate = true;

    // Update Towering Water Splash Plumes
    let spCount = 0;
    for (const sp of this.splashes) {
      if (!sp.active) continue;
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        continue;
      }
      const u = sp.life / sp.maxLife;
      const heightEnvelope = Math.sin(u * Math.PI);
      this.dummy.position.set(sp.pos.x, sp.pos.y - 0.4, sp.pos.z);
      this.dummy.rotation.set(0, sp.life * 3.0, 0);
      this.dummy.scale.set(sp.scale * (0.7 + u * 0.9), sp.scale * heightEnvelope * 1.25, sp.scale * (0.7 + u * 0.9));
      this.dummy.updateMatrix();
      this.splashColInst.setMatrixAt(spCount, this.dummy.matrix);

      this.dummy.position.set(sp.pos.x, sp.pos.y + 0.18, sp.pos.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(sp.scale * (0.8 + u * 3.2));
      this.dummy.updateMatrix();
      this.splashRingInst.setMatrixAt(spCount, this.dummy.matrix);
      spCount++;
    }
    this.splashColInst.count = spCount;
    this.splashColInst.instanceMatrix.needsUpdate = true;
    this.splashRingInst.count = spCount;
    this.splashRingInst.instanceMatrix.needsUpdate = true;

    // Update Wood/Stone Splinters
    let splCount = 0;
    for (const sp of this.splinters) {
      if (!sp.active) continue;
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        continue;
      }
      sp.vel.y -= 15.5 * dt;
      sp.pos.addScaledVector(sp.vel, dt);
      sp.rot.x += dt * 8;
      sp.rot.y += dt * 6;
      const fade = 1 - sp.life / sp.maxLife;
      this.dummy.position.copy(sp.pos);
      this.dummy.rotation.copy(sp.rot);
      this.dummy.scale.setScalar(sp.scale * fade);
      this.dummy.updateMatrix();
      this.splinterInst.setMatrixAt(splCount, this.dummy.matrix);
      this.splinterInst.setColorAt(splCount, sp.color);
      splCount++;
    }
    this.splinterInst.count = splCount;
    this.splinterInst.instanceMatrix.needsUpdate = true;
    if (this.splinterInst.instanceColor) {
      this.splinterInst.instanceColor.needsUpdate = true;
    }
  }

  private updateTreasureBeacon(dt: number, elapsed: number): void {
    this.treasureBeaconMat.uniforms.uTime.value = elapsed;

    if (this.chestUnearthedTimer > 0) {
      this.chestUnearthedTimer -= dt;
      const openProgress = Math.min(1, (5.5 - this.chestUnearthedTimer) * 2.2);
      this.chestLidPivot.rotation.x = -openProgress * 1.35;
      this.chestGroup.position.y = this.treasurePos.y + Math.min(0.35, openProgress * 0.35);

      if (this.chestUnearthedTimer <= 0) {
        this.placeTreasureOnIsland(this.activeTreasureIslandIdx + 1);
      }
    }
  }

  private syncNetworkState(dt: number): void {
    this.netSyncTimer += dt;
    if (this.netSyncTimer >= 0.05) {
      this.netSyncTimer = 0;

      const anim: AvatarAnimState = this.atHelm
        ? 'drive'
        : this.attackTimer > 0
        ? 'attack'
        : this.isSwimming
        ? 'swim'
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
        tool: this.ctx.localAvatar.getEquippedTool(),
        vehicleId: this.atHelm ? 'flagship_galleon' : null,
        seatIndex: this.atHelm ? 0 : -1
      });

      if (this.atHelm || this.ctx.network.isHost) {
        const q = this.galleonGroup.quaternion;
        this.ctx.network.broadcastVehicle({
          vehicleId: 'flagship_galleon',
          kind: 'galleon',
          x: this.shipPos.x,
          y: this.shipPos.y,
          z: this.shipPos.z,
          vx: this.shipVel.x,
          vy: this.shipVel.y,
          vz: this.shipVel.z,
          qx: q.x,
          qy: q.y,
          qz: q.z,
          qw: q.w,
          steering: this.rudderAngle,
          wheelSpin: this.sailOpenness,
          extra: this.sailTrimAngle
        });
      }
    }

    // Periodically sync deterministic Gerstner wave clock & wind angle across P2P crew
    if (this.ctx.network.isHost && this.ctx.network.getConnectedPeers().length > 0) {
      this.weatherSyncTimer += dt;
      if (this.weatherSyncTimer >= 4.0) {
        this.weatherSyncTimer = 0;
        this.ctx.network.broadcastWorldEvent('weather_sync', this.id, {
          waveTime: this.waveTime,
          windAngle: this.windAngleRad
        });
      }
    }
  }

  private updateHUD(dt: number): void {
    this.telemetryTimer += dt;
    if (this.telemetryTimer < 0.1) return;
    this.telemetryTimer = 0;

    const mode: ControlContextMode = this.atHelm ? 'NAVAL' : 'ON_FOOT';
    const headingDeg = ((Math.round((this.shipYaw * 180) / Math.PI) % 360) + 360) % 360;
    const relWindDeg = Math.round((wrapAnglePi(this.windAngleRad - this.shipYaw) * 180) / Math.PI);
    const treasureDist = Math.round(this.playerPos.distanceTo(this.treasurePos));
    const targetIsl = ARCHIPELAGO_ISLANDS[this.activeTreasureIslandIdx];

    let hint = `⚓ [E] près de la Barre pour gouverner • Trésor sur ${targetIsl.name} (${treasureDist}m)`;
    if (this.atHelm) {
      hint = `⛵ Z/S: Voiles (${Math.round(this.sailOpenness * 100)}%) • Q/D: Gouvernail • Clic G/D: Canons Bâbord/Tribord • Trésor: ${treasureDist}m`;
    } else if (this.playerPos.distanceTo(this.treasurePos) < 6.0 && this.chestUnearthedTimer <= 0) {
      hint = '🏴‍☠️ VOUS ÊTES SUR LA CROIX ! Appuyez sur [E] ou Clic Gauche pour déterrer le Coffre (+$1,000) !';
    } else if (this.isSwimming) {
      hint = '🤿 Nage Océanique • [C] Plonger vers les récifs coralliens • [Espace] Remonter / Échelle du Galion';
    }

    this.ctx.ui.updateTelemetry({
      fps: Math.round(this.smoothedFps),
      drawCalls: this.lastDrawCalls,
      triangles: this.lastTriangles,
      pingMs: Math.round(this.ctx.network.getAveragePing()),
      peerCount: this.ctx.network.getConnectedPeers().length,
      qualityPreset: this.ctx.quality.config.preset,
      autoScale: this.ctx.quality.autoScale,
      worldTitle: this.metadata.title,
      contextMode: mode,
      speedKmh: Math.round(Math.abs(this.shipForwardSpeed) * 3.6),
      headingDeg,
      windAngleDeg: relWindDeg,
      staminaRatio: this.stamina / 100,
      healthRatio: (this.atHelm ? this.hullHealth : this.health) / 100,
      credits: this.doubloons,
      weatherLabel: this.cameraUnderwater
        ? 'Plongée Sous-Marine • Caustiques'
        : `Alizés ${Math.round(this.windSpeed * 1.94)} kt • Cap ${headingDeg}°`,
      statusHint: hint
    });
  }

  public onWorldEvent(event: NetWorldEventPacket): void {
    if (event.senderId === this.ctx.network.selfPeerId) return;

    if (event.type === 'weather_sync') {
      const remoteWave = Number(event.payload.waveTime ?? this.waveTime);
      this.waveClockBase += (remoteWave - this.waveTime) * 0.5;
      if (typeof event.payload.windAngle === 'number') {
        this.windAngleRad = event.payload.windAngle;
      }
    } else if (event.type === 'projectile_fire') {
      const origin = new THREE.Vector3(
        Number(event.payload.x ?? 0),
        Number(event.payload.y ?? 2),
        Number(event.payload.z ?? 0)
      );
      const vel = new THREE.Vector3(
        Number(event.payload.vx ?? 0),
        Number(event.payload.vy ?? 8),
        Number(event.payload.vz ?? 0)
      );
      this.spawnCannonball(origin, vel, true);
      this.spawnSmokePuff(origin, vel.clone().multiplyScalar(0.06));
      this.ctx.audio.playCannonFire(origin.distanceTo(this.playerPos));
    }
  }

  public getMinimapMarkers(): MinimapMarker[] {
    const markers: MinimapMarker[] = [
      {
        id: 'flagship_galleon_marker',
        x: this.shipPos.x,
        z: this.shipPos.z,
        color: '#19d4c6',
        type: 'vehicle',
        label: 'Galion'
      },
      {
        id: 'treasure_x_beacon',
        x: this.treasurePos.x,
        z: this.treasurePos.z,
        color: '#ffd166',
        type: 'objective',
        label: '✖ Coffre $1,000'
      }
    ];

    for (const isl of ARCHIPELAGO_ISLANDS) {
      markers.push({
        id: isl.id,
        x: isl.x,
        z: isl.z,
        color: '#8ce99a',
        type: 'poi',
        label: isl.name
      });
    }

    for (const fort of this.coastalForts) {
      if (fort.hp > 0) {
        markers.push({
          id: fort.id,
          x: fort.pos.x,
          z: fort.pos.z,
          color: '#ff8748',
          type: 'danger',
          label: 'Fort Pirate'
        });
      }
    }

    for (const es of this.enemyShips) {
      if (es.hp > 0) {
        markers.push({
          id: es.id,
          x: es.pos.x,
          z: es.pos.z,
          color: '#ff495c',
          type: 'danger',
          label: es.name
        });
      }
    }

    return markers;
  }

  public getGPSRoute(): Array<{ x: number; z: number }> {
    return [
      { x: this.playerPos.x, z: this.playerPos.z },
      { x: this.treasurePos.x, z: this.treasurePos.z }
    ];
  }

  public dispose(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.prevSceneAfterRender) {
      this.ctx.scene.onAfterRender = this.prevSceneAfterRender;
      this.prevSceneAfterRender = null;
    }

    this.ctx.ui.setWorldToolbarHTML('');
    this.ctx.postFX.setSpeedFactor(0);
    this.ctx.audio.updateWindRush(0);

    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.windHandles = [];

    this.coastalForts = [];
    this.enemyShips = [];
    this.sailPivots = [];
    this.sailMeshes = [];

    this.ctx.scene.remove(this.worldRoot);
    this.worldRoot.clear();
  }
}
