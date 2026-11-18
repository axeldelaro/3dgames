import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  WORLD_CATALOG,
  type EngineContext,
  type MinimapMarker,
  type NetWorldEventPacket,
  type RadialWheelItem,
  type WorldInterface
} from '../../core/types';
import { ProceduralNoise, SeededRandom } from '../../core/math/Noise';
import {
  applyWindSwayToMaterial,
  createGerstnerOceanMaterial,
  updateOceanMaterial
} from '../../core/graphics/Shaders';

type OceanMaterial = ReturnType<typeof createGerstnerOceanMaterial>;
type MassifId = 'alpes' | 'canyon' | 'fuji' | 'fjord';
type VehicleMode = 'jet' | 'truck4x4';

interface MassifConfig {
  id: MassifId;
  label: string;
  shortLabel: string;
  waterLevel: number;
  deepWater: number;
  shallowWater: number;
  timeOfDay: number;
  weather: 'clear' | 'cloudy';
  weatherTitle: string;
}

interface BoulderObstacle {
  x: number;
  y: number;
  z: number;
  radiusXZ: number;
  height: number;
}

interface CheckpointGate {
  index: number;
  pos: THREE.Vector3;
  yaw: number;
  radius: number;
}

interface MudParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  color: THREE.Color;
}

interface SonicBoomWave {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  age: number;
  duration: number;
}

const MASSIF_CATALOG: Record<MassifId, MassifConfig> = {
  alpes: {
    id: 'alpes',
    label: 'Mont Blanc — Alpes',
    shortLabel: '🏔️ Alpes',
    waterLevel: 10.0,
    deepWater: 0x0b3954,
    shallowWater: 0x2ec4d6,
    timeOfDay: 10.8,
    weather: 'clear',
    weatherTitle: 'Alpin Clair • −4°C'
  },
  canyon: {
    id: 'canyon',
    label: 'Grand Canyon — Arizona',
    shortLabel: '🏜️ Grand Canyon',
    waterLevel: 11.0,
    deepWater: 0x2b4c3f,
    shallowWater: 0x5c8c67,
    timeOfDay: 16.3,
    weather: 'clear',
    weatherTitle: 'Zénith Aride • 31°C'
  },
  fuji: {
    id: 'fuji',
    label: 'Mont Fuji — Japon',
    shortLabel: '🗻 Mont Fuji',
    waterLevel: 14.0,
    deepWater: 0x0c345c,
    shallowWater: 0x3596b8,
    timeOfDay: 7.5,
    weather: 'clear',
    weatherTitle: 'Aube Sakura • Mer de Nuages'
  },
  fjord: {
    id: 'fjord',
    label: 'Fjord Nordique — Norvège',
    shortLabel: '🌊 Fjord Norvège',
    waterLevel: 16.0,
    deepWater: 0x062338,
    shallowWater: 0x16697a,
    timeOfDay: 13.6,
    weather: 'cloudy',
    weatherTitle: 'Brume Nordique • 6°C'
  }
};

const TERRAIN_SIZE = 2400;
const TERRAIN_HALF = TERRAIN_SIZE * 0.5;
const RUNWAY_X = -340;
const RUNWAY_Z_MIN = -40;
const RUNWAY_Z_MAX = 440;
const RUNWAY_Y = 52.0;
const BRIDGE_Z = 70;
const BRIDGE_HALF_SPAN = 122;
const BRIDGE_HALF_WIDTH = 7.2;
const BRIDGE_Y = 82.0;
const SOUND_SPEED_MS = 343.0;
const MAX_MUD_PARTICLES = 260;

// Muddy rocky 4x4 Trial Escarpment waypoints (Airbase -> Bridge -> Boulder Switchbacks -> Ridge Summit)
const TRAIL_WAYPOINTS: ReadonlyArray<readonly [number, number]> = [
  [-305, 195],
  [-220, 120],
  [-132, 70],
  [0, 70],
  [134, 70],
  [215, 12],
  [275, -95],
  [225, -215],
  [145, -315],
  [195, -425],
  [110, -510]
];

export class ExtremeHorizonWorld implements WorldInterface {
  public readonly id = 'extremeHorizon' as const;
  public readonly metadata = WORLD_CATALOG[5];

  private ctx!: EngineContext;
  private readonly noise = new ProceduralNoise(88412);
  private readonly worldGroup = new THREE.Group();
  private massifGroup: THREE.Group | null = null;

  private currentMassif: MassifId = 'alpes';
  private vehicleMode: VehicleMode = 'jet';

  // Shared shaders & animated environment refs
  private windController: { update(time: number): void } | null = null;
  private oceanMat: OceanMaterial | null = null;
  private cloudSeaMat: THREE.ShaderMaterial | null = null;
  private strobeMat: THREE.ShaderMaterial | null = null;
  private radarMesh: THREE.Mesh | null = null;
  private checkpointMat: THREE.ShaderMaterial | null = null;
  private checkpointInst: THREE.InstancedMesh | null = null;
  private activeGateBeacon: THREE.Mesh | null = null;

  // Boulders & Checkpoints
  private readonly boulders: BoulderObstacle[] = [];
  private readonly jetCheckpoints: CheckpointGate[] = [];
  private readonly truckCheckpoints: CheckpointGate[] = [];

  // Supersonic Fighter Jet state & meshes
  private readonly jetGroup = new THREE.Group();
  private afterburnerMat: THREE.ShaderMaterial | null = null;
  private flameLeft!: THREE.Mesh;
  private flameRight!: THREE.Mesh;
  private vaporConeMesh!: THREE.Mesh;
  private vaporConeMat!: THREE.ShaderMaterial;
  private elevonLeft!: THREE.Mesh;
  private elevonRight!: THREE.Mesh;
  private gearGroup!: THREE.Group;

  private readonly jetPos = new THREE.Vector3(RUNWAY_X, RUNWAY_Y + 1.85, 385);
  private readonly jetVel = new THREE.Vector3(0, 0, 0);
  private readonly jetQuat = new THREE.Quaternion();
  private readonly jetAngVel = new THREE.Vector3(); // pitch(x), yaw(y), roll(z)
  private jetThrottle = 0.0;
  private jetOnGround = true;
  private wasSupersonic = false;
  private isStalling = false;
  private readonly sonicBoomWaves: SonicBoomWave[] = [];

  // 4x4 Rock-Crawler Trial state & articulated suspension meshes
  private readonly truckGroup = new THREE.Group();
  private readonly wheelGroups: THREE.Group[] = [];
  private readonly strutMeshes: THREE.Mesh[] = [];
  private readonly linkMeshes: THREE.Mesh[] = [];
  private frontAxleMesh!: THREE.Mesh;
  private rearAxleMesh!: THREE.Mesh;
  private winchLineMesh!: THREE.Mesh;

  private readonly truckPos = new THREE.Vector3(-300, RUNWAY_Y + 1.35, 195);
  private readonly truckVel = new THREE.Vector3();
  private readonly truckQuat = new THREE.Quaternion();
  private truckYaw = Math.PI * 0.72;
  private truckPitch = 0;
  private truckRoll = 0;
  private truckSteer = 0;
  private truckWheelSpin = 0;
  private readonly wheelCompression = [0.3, 0.3, 0.3, 0.3];
  private readonly prevWheelCompression = [0.3, 0.3, 0.3, 0.3];

  // Mud / Dust particle pool
  private mudMesh: THREE.InstancedMesh | null = null;
  private readonly mudParticles: MudParticle[] = [];

  // Time-Trial Checkpoint Race state
  private raceActive = false;
  private currentGateIdx = 0;
  private raceTimer = 0;
  private bestJetTime = 0;
  private bestTruckTime = 0;
  private credits = 250;

  // Auxiliary input & camera state
  private readonly heldKeys = new Set<string>();
  private keydownHandler: ((ev: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((ev: KeyboardEvent) => void) | null = null;
  private modeSwitchCooldown = 0;
  private chaseCamInitialized = false;
  private readonly smoothCamPos = new THREE.Vector3();
  private readonly smoothCamLook = new THREE.Vector3();
  private cockpitView = false;

  private telemetryAcc = 0;
  private netSyncAcc = 0;
  private estimatedDrawCalls = 46;
  private estimatedTriangles = 165000;

  private readonly tmpDummy = new THREE.Object3D();
  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpVecB = new THREE.Vector3();

  public async load(ctx: EngineContext, options?: Record<string, string | number>): Promise<void> {
    this.ctx = ctx;
    this.worldGroup.name = 'ExtremeHorizonRoot';
    this.ctx.scene.add(this.worldGroup);

    const requestedMassif = options?.massif as MassifId | undefined;
    if (requestedMassif && MASSIF_CATALOG[requestedMassif]) {
      this.currentMassif = requestedMassif;
    }

    // Build permanent infrastructure, vehicles & particle systems
    this.buildAirbaseAndControlTower();
    this.buildSuspensionBridge();
    this.buildSupersonicFighterJet();
    this.buildArticulated4x4Truck();
    this.buildMudParticlePool();

    // Generate active topographic massif, water, foliage, boulder trail & checkpoints
    this.rebuildMassifEnvironment(this.currentMassif);

    // Start in Supersonic Fighter Jet lined up on the Airbase Runway ready for Afterburner takeoff!
    this.ctx.localAvatar.setParagliderVisible(false);
    this.ctx.localAvatar.setJetpackFlame(0);
    this.ctx.localAvatar.setEquippedTool('none');
    this.placeJetOnRunway();
    this.setVehicleMode('jet', false);

    this.setupUIAndControls();
    this.computeSceneMetrics();
  }

  // ============================================================================
  // TOPOGRAPHIC MASSIFS (Mont Blanc, Grand Canyon, Mont Fuji, Fjord Nordique)
  // ============================================================================

  private smoothstep(e0: number, e1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  private distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): { dist: number; t: number } {
    const vx = bx - ax;
    const vz = bz - az;
    const lenSq = vx * vx + vz * vz;
    const t = lenSq > 0.0001 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / lenSq)) : 0;
    const cx = ax + vx * t;
    const cz = az + vz * t;
    return { dist: Math.hypot(px - cx, pz - cz), t };
  }

  private sampleTrailDistance(x: number, z: number): { dist: number; progress: number } {
    let minDist = Infinity;
    let bestProg = 0;
    const segCount = TRAIL_WAYPOINTS.length - 1;
    for (let i = 0; i < segCount; i++) {
      // Skip bridge span segment (index 2..3) for ground carving so gorge stays deep underneath bridge!
      if (i === 2 || i === 3) continue;
      const [ax, az] = TRAIL_WAYPOINTS[i];
      const [bx, bz] = TRAIL_WAYPOINTS[i + 1];
      const res = this.distToSegment(x, z, ax, az, bx, bz);
      if (res.dist < minDist) {
        minDist = res.dist;
        bestProg = (i + res.t) / segCount;
      }
    }
    return { dist: minDist, progress: bestProg };
  }

  private sampleRawMassifHeight(x: number, z: number, massif: MassifId): number {
    switch (massif) {
      case 'alpes': {
        // Jagged glaciated Mont Blanc granite ridges & U-shaped alpine valley
        const ridgePrimary = this.noise.ridged2D(x * 0.0014 + 1.2, z * 0.0014 - 0.7, 5);
        const ridgeSecondary = this.noise.ridged2D(x * 0.0032, z * 0.0032, 4);
        const detail = this.noise.fbm2D(x * 0.006, z * 0.006, 3) * 18;
        let h = 28 + Math.pow(ridgePrimary, 1.45) * 335 + ridgeSecondary * 52 + detail;

        // Carve scenic glacial valley running along X=0
        const valleyDist = Math.abs(x - Math.sin(z * 0.0028) * 95);
        const valleyCarve = 1.0 - this.smoothstep(45, 290, valleyDist);
        h = THREE.MathUtils.lerp(h, 6.0 + detail * 0.2, valleyCarve * 0.88);
        return h;
      }

      case 'canyon': {
        // Grand Canyon stratified red-orange terraced mesas + meandering Colorado River gorge
        const raw = 0.52 + this.noise.fbm2D(x * 0.0013 + 4.1, z * 0.0013 + 2.3, 5) * 0.55;
        const mesaH = Math.max(0, raw) * 245;
        const stepSize = 34.0;
        const tier = Math.floor(mesaH / stepSize);
        const frac = (mesaH - tier * stepSize) / stepSize;
        const terraced = (tier + this.smoothstep(0.58, 0.88, frac)) * stepSize + 24;

        // Deep meandering Colorado River canyon slicing through X ≈ 0
        const riverCenter = Math.sin(z * 0.0036) * 115;
        const canyonDist = Math.abs(x - riverCenter);
        const gorgeFactor = 1.0 - this.smoothstep(38, 210, canyonDist);
        const innerStep = Math.floor((1.0 - gorgeFactor) * 4) / 4;
        return THREE.MathUtils.lerp(terraced, 4.5, gorgeFactor * (0.72 + 0.28 * (1 - innerStep)));
      }

      case 'fuji': {
        // Iconic symmetrical Mont Fuji volcanic cone in the north (0, -560) + Five-Lakes basin
        const coneDist = Math.hypot(x - 20, z + 580);
        const coneProfile = 435 * Math.exp(-Math.pow(coneDist / 470, 1.62));
        // Summit volcanic crater
        const craterDip = (1.0 - this.smoothstep(28, 76, coneDist)) * 38;
        // Radial lava gullies
        const angle = Math.atan2(z + 580, x - 20);
        const gullies = this.noise.simplex2D(Math.cos(angle) * 6, Math.sin(angle) * 6 + coneDist * 0.006) * 8.5 * this.smoothstep(65, 250, coneDist);
        const foothills = 26 + this.noise.fbm2D(x * 0.0022, z * 0.0022, 4) * 38;

        let h = Math.max(foothills, coneProfile - craterDip + gullies);
        // Carve shimmering lake & gorge channel near z = 70
        const lakeDist = Math.hypot((x - 10) * 0.65, z - 85);
        const lakeCarve = 1.0 - this.smoothstep(65, 215, lakeDist);
        h = THREE.MathUtils.lerp(h, 6.5, lakeCarve * 0.92);
        return h;
      }

      case 'fjord': {
        // Sheer vertical Preikestolen-style Nordic sea cliffs plunging into deep fjord channel
        const channelCenter = Math.sin(z * 0.0025) * 75;
        const distFromChannel = Math.abs(x - channelCenter);
        const cliffWall = this.smoothstep(52, 138, distFromChannel);
        const plateauTop =
          185 +
          this.noise.ridged2D(x * 0.0018 - 2.0, z * 0.0018 + 1.4, 4) * 145 +
          this.noise.fbm2D(x * 0.005, z * 0.005, 3) * 16;
        return THREE.MathUtils.lerp(-6.0, plateauTop, cliffWall);
      }
    }
  }

  private sampleTerrainHeight(x: number, z: number, massif: MassifId = this.currentMassif): number {
    let h = this.sampleRawMassifHeight(x, z, massif);

    // 1. Carve deep canyon/fjord gorge directly underneath the Suspension Bridge (|x| < 88, z ≈ 70)
    const gorgeBoxX = 1.0 - this.smoothstep(56, 112, Math.abs(x));
    const gorgeBoxZ = 1.0 - this.smoothstep(38, 135, Math.abs(z - BRIDGE_Z));
    const gorgeMask = gorgeBoxX * gorgeBoxZ;
    if (gorgeMask > 0.001) {
      h = THREE.MathUtils.lerp(h, MASSIF_CATALOG[massif].waterLevel - 6.5, gorgeMask * 0.96);
    }

    // 2. Grade West & East Suspension Bridge rock abutments cleanly to BRIDGE_Y (82m)
    for (const abutX of [-132, 132]) {
      const dAbut = Math.hypot((x - abutX) * 0.9, (z - BRIDGE_Z) * 1.15);
      if (dAbut < 68) {
        const b = 1.0 - this.smoothstep(16, 68, dAbut);
        h = THREE.MathUtils.lerp(h, BRIDGE_Y - 0.15, b);
      }
    }

    // 3. Carve & grade the winding 4x4 Trial Escarpment Trail with realistic rock ruts
    const trail = this.sampleTrailDistance(x, z);
    if (trail.dist < 28) {
      const targetTrailY =
        trail.progress < 0.25
          ? THREE.MathUtils.lerp(RUNWAY_Y, BRIDGE_Y, trail.progress / 0.25)
          : THREE.MathUtils.lerp(BRIDGE_Y, 176, (trail.progress - 0.25) / 0.75);
      const rutBump =
        trail.dist < 6.5
          ? this.noise.simplex2D(x * 0.24, z * 0.24) * 0.42 + Math.sin(x * 0.35 + z * 0.3) * 0.22
          : 0;
      const trailBlend = 1.0 - this.smoothstep(6.5, 28, trail.dist);
      h = THREE.MathUtils.lerp(h, targetTrailY + rutBump, trailBlend * 0.88);
    }

    // 4. Flatten paved Airbase Runway & Hangar Apron plateau cleanly at RUNWAY_Y (52m)
    const dxRunway = Math.max(0, Math.abs(x - RUNWAY_X) - 44);
    const dzRunway =
      z < RUNWAY_Z_MIN ? RUNWAY_Z_MIN - z : z > RUNWAY_Z_MAX ? z - RUNWAY_Z_MAX : 0;
    const distRunway = Math.hypot(dxRunway, dzRunway);
    if (distRunway < 115) {
      const flat = 1.0 - this.smoothstep(4, 115, distRunway);
      h = THREE.MathUtils.lerp(h, RUNWAY_Y, flat);
    }

    return h;
  }

  private sampleTerrainNormal(x: number, z: number, target = new THREE.Vector3()): THREE.Vector3 {
    const eps = 2.0;
    const hL = this.sampleTerrainHeight(x - eps, z);
    const hR = this.sampleTerrainHeight(x + eps, z);
    const hD = this.sampleTerrainHeight(x, z - eps);
    const hU = this.sampleTerrainHeight(x, z + eps);
    return target.set(hL - hR, 2 * eps, hD - hU).normalize();
  }

  /**
   * Samples exact wheel/ground contact elevation including terrain, paved runway,
   * Suspension Bridge roadway deck, and 3D rock-crawling boulders!
   */
  private sampleDriveSurface(
    x: number,
    z: number,
    refY: number
  ): { y: number; isBridge: boolean; isRunway: boolean; isMud: boolean; isRock: boolean } {
    let y = this.sampleTerrainHeight(x, z);
    let isBridge = false;
    let isRunway = false;
    let isRock = false;

    // Check Airbase Runway asphalt
    if (Math.abs(x - RUNWAY_X) <= 21 && z >= RUNWAY_Z_MIN && z <= RUNWAY_Z_MAX) {
      y = Math.max(y, RUNWAY_Y + 0.08);
      isRunway = true;
    }

    // Check Suspension Bridge roadway deck (only if vehicle is near/above bridge deck, allowing Jet under-passes!)
    if (
      Math.abs(x) <= BRIDGE_HALF_SPAN + 6 &&
      Math.abs(z - BRIDGE_Z) <= BRIDGE_HALF_WIDTH &&
      refY >= BRIDGE_Y - 5.5
    ) {
      // Gentle catenary camber (+1.2m at center span)
      const spanRatio = Math.min(1, Math.abs(x) / BRIDGE_HALF_SPAN);
      const deckY = BRIDGE_Y + (1.0 - spanRatio * spanRatio) * 1.15;
      if (deckY >= y) {
        y = deckY;
        isBridge = true;
      }
    }

    // Check 3D Rock-Crawler Boulder obstacles along the escarpment trail!
    if (!isBridge && !isRunway) {
      for (let i = 0; i < this.boulders.length; i++) {
        const b = this.boulders[i];
        const dx = x - b.x;
        const dz = z - b.z;
        const rSq = b.radiusXZ * b.radiusXZ;
        const dSq = dx * dx + dz * dz;
        if (dSq < rSq) {
          const dome = Math.sqrt(Math.max(0, 1.0 - dSq / rSq)) * b.height;
          const bTop = b.y + dome;
          if (bTop > y && refY >= b.y - 1.5) {
            y = bTop;
            isRock = true;
          }
        }
      }
    }

    const trailInfo = this.sampleTrailDistance(x, z);
    const isMud = !isRunway && !isBridge && trailInfo.dist < 9.5;
    return { y, isBridge, isRunway, isMud, isRock };
  }

  private mergeGeometryParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (parts.length === 0) return new THREE.BoxGeometry(0.1, 0.1, 0.1);
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

  private rebuildMassifEnvironment(massif: MassifId): void {
    this.currentMassif = massif;
    const cfg = MASSIF_CATALOG[massif];

    if (this.massifGroup) {
      this.disposeObject(this.massifGroup);
      this.worldGroup.remove(this.massifGroup);
      this.massifGroup = null;
      this.windController = null;
      this.oceanMat = null;
      this.cloudSeaMat = null;
      this.checkpointInst = null;
      this.checkpointMat = null;
      this.activeGateBeacon = null;
    }

    this.boulders.length = 0;
    this.jetCheckpoints.length = 0;
    this.truckCheckpoints.length = 0;

    const group = new THREE.Group();
    group.name = `Massif_${massif}`;

    // Sky & Weather configuration
    this.ctx.sky.setSpaceBlend(0);
    this.ctx.sky.setTimeOfDay(cfg.timeOfDay);
    this.ctx.sky.setWeather(cfg.weather, cfg.weather === 'cloudy' ? 0.35 : 0);
    this.ctx.sky.refreshEnvironmentMap(this.ctx.renderer);

    // 1. High-Resolution 240×240 Topographic Mesh (115,200 triangles in 1 draw call!)
    const segs = 236;
    const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const tmpN = new THREE.Vector3();
    const col = new THREE.Color();

    const colMud = new THREE.Color(0x4a3728);
    const colApron = new THREE.Color(0x4c525c);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.sampleTerrainHeight(x, z, massif);
      pos.setY(i, y);

      this.sampleTerrainNormal(x, z, tmpN);
      const slope = 1.0 - tmpN.y;
      const nVar = this.noise.fbm2D(x * 0.012, z * 0.012, 3) * 0.5 + 0.5;

      this.colorizeMassifVertex(massif, y, slope, nVar, cfg.waterLevel, col);

      // Blend muddy 4x4 escarpment wheel tracks
      const trail = this.sampleTrailDistance(x, z);
      if (trail.dist < 8.5 && y > cfg.waterLevel + 1) {
        col.lerp(colMud, (1.0 - trail.dist / 8.5) * 0.78);
      }

      // Blend Airbase concrete apron shoulder
      if (Math.abs(x - RUNWAY_X) < 42 && z > RUNWAY_Z_MIN - 14 && z < RUNWAY_Z_MAX + 14) {
        col.lerp(colApron, 0.82);
      }

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    terrainGeo.computeVertexNormals();
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const rockSet = this.ctx.textures.getTextureSet('rock');
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      normalMap: rockSet.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.86,
      metalness: 0.04
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    group.add(terrainMesh);

    // 2. Gerstner River / Lake / Fjord Water Plane
    const waterGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 110, 110);
    waterGeo.rotateX(-Math.PI / 2);
    this.oceanMat = createGerstnerOceanMaterial({
      sunDirection: this.ctx.sky.sunDirection,
      deepColor: cfg.deepWater,
      shallowColor: cfg.shallowWater
    });
    const waterMesh = new THREE.Mesh(waterGeo, this.oceanMat);
    waterMesh.position.y = cfg.waterLevel;
    group.add(waterMesh);

    // 3. Mont Fuji Volumetric-Style Cloud Sea Layer
    if (massif === 'fuji') {
      const cloudGeo = new THREE.RingGeometry(240, 1150, 64, 8);
      cloudGeo.rotateX(-Math.PI / 2);
      this.cloudSeaMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vWorldXZ;
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            wp.y += sin(wp.x * 0.012 + uTime * 0.4) * 4.5 + cos(wp.z * 0.012 - uTime * 0.3) * 4.5;
            vWorldXZ = wp.xz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vWorldXZ;
          uniform float uTime;
          void main() {
            float billow = sin(vWorldXZ.x * 0.015 + uTime * 0.25) * cos(vWorldXZ.y * 0.015 - uTime * 0.2) * 0.5 + 0.5;
            float dist = length(vWorldXZ - vec2(20.0, -580.0));
            float ringFade = smoothstep(230.0, 390.0, dist) * smoothstep(1180.0, 860.0, dist);
            vec3 col = mix(vec3(0.92, 0.88, 0.95), vec3(1.0, 0.97, 0.94), billow);
            gl_FragColor = vec4(col, ringFade * (0.35 + 0.28 * billow));
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const cloudMesh = new THREE.Mesh(cloudGeo, this.cloudSeaMat);
      cloudMesh.position.set(20, 168, -580);
      group.add(cloudMesh);
    }

    // 4. GPU-Instanced Massif Trees (Pines / Desert Scrub / Sakura Cherry Blossoms) + 3D Rock-Crawl Boulders
    this.populateMassifPropsAndBoulders(group, massif, cfg.waterLevel);

    // 5. Build Dual Aerial & 4x4 Checkpoint Courses
    this.buildCheckpointCourses(group);

    this.worldGroup.add(group);
    this.massifGroup = group;
    this.refreshCheckpointInstances();
    this.computeSceneMetrics();
  }

  private colorizeMassifVertex(
    massif: MassifId,
    y: number,
    slope: number,
    nVar: number,
    waterLevel: number,
    out: THREE.Color
  ): void {
    if (massif === 'alpes') {
      const grass = new THREE.Color(0x3a6b35);
      const granite = new THREE.Color(0x62666e);
      const snow = new THREE.Color(0xf2f6fc);
      if (y < waterLevel + 2) {
        out.setHex(0x8a877c);
      } else if (slope > 0.34) {
        out.copy(granite).lerp(snow, y > 210 ? 0.35 : 0.05);
      } else if (y > 142 - nVar * 22) {
        out.copy(snow);
      } else {
        out.copy(grass).lerp(granite, this.smoothstep(95, 145, y));
      }
    } else if (massif === 'canyon') {
      // Stratified Arizona sandstone bands
      const band = Math.sin(y * 0.22 + nVar * 1.4);
      const terracotta = new THREE.Color(0xb84a27);
      const ochre = new THREE.Color(0xd98a46);
      const sandstone = new THREE.Color(0xe3b778);
      const cliffRed = new THREE.Color(0x8c2f1b);
      if (band > 0.3) out.copy(sandstone);
      else if (band > -0.25) out.copy(ochre);
      else out.copy(terracotta);
      if (slope > 0.32) out.lerp(cliffRed, 0.55);
    } else if (massif === 'fuji') {
      const lushGreen = new THREE.Color(0x3d7a42);
      const sakuraMeadow = new THREE.Color(0x558b4e);
      const basalt = new THREE.Color(0x3a363b);
      const snow = new THREE.Color(0xf7f9ff);
      if (y > 225 - nVar * 18) {
        out.copy(basalt).lerp(snow, this.smoothstep(215, 255, y));
      } else if (y > 115 || slope > 0.32) {
        out.copy(basalt);
      } else {
        out.copy(lushGreen).lerp(sakuraMeadow, nVar);
      }
    } else {
      // Nordic Fjord: dark wet gneiss sea cliffs + vibrant sub-arctic emerald plateau moss
      const darkCliff = new THREE.Color(0x343a42);
      const nordicMoss = new THREE.Color(0x3b7d47);
      const snow = new THREE.Color(0xeef4fa);
      if (slope > 0.28 || y < waterLevel + 6) {
        out.copy(darkCliff);
      } else if (y > 265) {
        out.copy(nordicMoss).lerp(snow, this.smoothstep(265, 305, y));
      } else {
        out.copy(nordicMoss);
      }
    }
  }

  private populateMassifPropsAndBoulders(group: THREE.Group, massif: MassifId, waterLevel: number): void {
    const rng = new SeededRandom(massif === 'alpes' ? 101 : massif === 'canyon' ? 202 : massif === 'fuji' ? 303 : 404);

    // 1. 150 Rock-Crawling 3D Boulders right along the 4x4 Trial Escarpment Trail + scattered mountain outcrops!
    const boulderGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const rockMat = this.ctx.textures.createPBRMaterial('rock', {
      repeatX: 2,
      repeatY: 2,
      tint: massif === 'canyon' ? 0xc85a32 : massif === 'fuji' ? 0x524d54 : 0x8d9299,
      roughness: 0.88
    });

    const boulderCount = 155;
    const boulderInst = new THREE.InstancedMesh(boulderGeo, rockMat, boulderCount);
    boulderInst.castShadow = true;
    boulderInst.receiveShadow = true;

    let bIdx = 0;
    // Place technical rock-crawling boulder clusters directly on & beside the 4x4 Trail!
    const segCount = TRAIL_WAYPOINTS.length - 1;
    for (let i = 0; i < 105 && bIdx < boulderCount; i++) {
      const seg = rng.int(0, segCount - 1);
      if (seg === 2 || seg === 3) continue; // keep bridge deck clear
      const [ax, az] = TRAIL_WAYPOINTS[seg];
      const [bx, bz] = TRAIL_WAYPOINTS[seg + 1];
      const t = rng.range(0.08, 0.92);
      const lateral = (rng.next() < 0.5 ? -1 : 1) * rng.range(1.6, 6.2);
      const dirX = bx - ax;
      const dirZ = bz - az;
      const len = Math.max(1, Math.hypot(dirX, dirZ));
      const nx = -dirZ / len;
      const nz = dirX / len;

      const rx = ax + dirX * t + nx * lateral;
      const rz = az + dirZ * t + nz * lateral;
      const ry = this.sampleTerrainHeight(rx, rz, massif);
      // Moderate height on the driving line so 4x4 wheels articulate dramatically over them!
      const onLine = Math.abs(lateral) < 3.6;
      const radXZ = onLine ? rng.range(1.2, 2.3) : rng.range(2.0, 4.2);
      const height = onLine ? rng.range(0.42, 0.92) : rng.range(1.4, 3.6);

      this.tmpDummy.position.set(rx, ry - height * 0.15, rz);
      this.tmpDummy.rotation.set(rng.range(-0.2, 0.2), rng.range(0, Math.PI * 2), rng.range(-0.2, 0.2));
      this.tmpDummy.scale.set(radXZ, height, radXZ * rng.range(0.85, 1.15));
      this.tmpDummy.updateMatrix();
      boulderInst.setMatrixAt(bIdx, this.tmpDummy.matrix);

      this.boulders.push({ x: rx, y: ry - height * 0.15, z: rz, radiusXZ: radXZ * 1.05, height: height * 1.02 });
      bIdx++;
    }

    while (bIdx < boulderCount) {
      const rx = rng.range(-950, 950);
      const rz = rng.range(-950, 950);
      if (Math.abs(rx - RUNWAY_X) < 55 && rz > RUNWAY_Z_MIN - 20 && rz < RUNWAY_Z_MAX + 20) continue;
      const ry = this.sampleTerrainHeight(rx, rz, massif);
      if (ry < waterLevel + 2) continue;
      const radXZ = rng.range(2.5, 6.5);
      const height = rng.range(2.0, 5.5);
      this.tmpDummy.position.set(rx, ry, rz);
      this.tmpDummy.rotation.set(0, rng.range(0, Math.PI * 2), 0);
      this.tmpDummy.scale.set(radXZ, height, radXZ);
      this.tmpDummy.updateMatrix();
      boulderInst.setMatrixAt(bIdx, this.tmpDummy.matrix);
      this.boulders.push({ x: rx, y: ry, z: rz, radiusXZ: radXZ, height });
      bIdx++;
    }
    boulderInst.instanceMatrix.needsUpdate = true;
    group.add(boulderInst);

    // 2. GPU-Instanced Regional Trees (Alpine Pines / Sakura Cherry Blossoms / Desert Scrub)
    const treeCount = Math.round(380 * Math.max(0.6, this.ctx.quality.config.maxInstancesMultiplier));
    const trunk = new THREE.CylinderGeometry(0.35, 0.52, 2.6, 6);
    trunk.translate(0, 1.3, 0);
    let treeGeo: THREE.BufferGeometry;
    if (massif === 'fuji') {
      const canopy = new THREE.IcosahedronGeometry(3.1, 1);
      canopy.translate(0, 4.8, 0);
      treeGeo = this.mergeGeometryParts([trunk, canopy]);
    } else {
      const cone1 = new THREE.ConeGeometry(2.4, 5.5, 7);
      cone1.translate(0, 4.2, 0);
      const cone2 = new THREE.ConeGeometry(1.85, 4.6, 7);
      cone2.translate(0, 6.8, 0);
      treeGeo = this.mergeGeometryParts([trunk, cone1, cone2]);
    }

    const treeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.02
    });
    this.windController = applyWindSwayToMaterial(treeMat, 0.28, 7.5);

    const treeInst = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    treeInst.castShadow = true;
    let placedTrees = 0;
    let tries = 0;

    while (placedTrees < treeCount && tries < treeCount * 5) {
      tries++;
      const tx = rng.range(-980, 980);
      const tz = rng.range(-980, 980);
      if (Math.abs(tx - RUNWAY_X) < 62 && tz > RUNWAY_Z_MIN - 35 && tz < RUNWAY_Z_MAX + 35) continue;
      if (this.sampleTrailDistance(tx, tz).dist < 13) continue;

      const ty = this.sampleTerrainHeight(tx, tz, massif);
      if (ty < waterLevel + 3 || ty > (massif === 'alpes' ? 145 : 220)) continue;
      const n = this.sampleTerrainNormal(tx, tz, this.tmpVecA);
      if (n.y < 0.78) continue;

      const s = massif === 'canyon' ? rng.range(0.45, 0.85) : rng.range(0.9, 1.85);
      this.tmpDummy.position.set(tx, ty - 0.2, tz);
      this.tmpDummy.rotation.set(0, rng.range(0, Math.PI * 2), 0);
      this.tmpDummy.scale.setScalar(s);
      this.tmpDummy.updateMatrix();
      treeInst.setMatrixAt(placedTrees, this.tmpDummy.matrix);

      if (massif === 'fuji' && rng.next() < 0.62) {
        // Iconic pink Sakura cherry blossoms!
        treeInst.setColorAt(placedTrees, new THREE.Color().setHSL(0.93 + rng.range(-0.02, 0.02), 0.72, rng.range(0.72, 0.84)));
      } else if (massif === 'canyon') {
        treeInst.setColorAt(placedTrees, new THREE.Color(0x6c7a45));
      } else {
        treeInst.setColorAt(placedTrees, new THREE.Color().setHSL(0.34, 0.42, rng.range(0.18, 0.28)));
      }
      placedTrees++;
    }
    treeInst.count = placedTrees;
    treeInst.instanceMatrix.needsUpdate = true;
    if (treeInst.instanceColor) treeInst.instanceColor.needsUpdate = true;
    group.add(treeInst);
  }

  // ============================================================================
  // PAVED AIRBASE RUNWAY, APPROACH LIGHTS & SUSPENSION BRIDGE
  // ============================================================================

  private buildAirbaseAndControlTower(): void {
    const baseGroup = new THREE.Group();
    const runwayLen = RUNWAY_Z_MAX - RUNWAY_Z_MIN;
    const runwayCenterZ = (RUNWAY_Z_MIN + RUNWAY_Z_MAX) * 0.5;

    // 1. Paved Asphalt Runway Strip & Taxiway Apron
    const asphaltMat = this.ctx.textures.createPBRMaterial('asphalt', {
      repeatX: 6,
      repeatY: 64,
      roughness: 0.48,
      metalness: 0.08
    });
    const rwyGeo = new THREE.BoxGeometry(38, 0.2, runwayLen);
    const rwyMesh = new THREE.Mesh(rwyGeo, asphaltMat);
    rwyMesh.position.set(RUNWAY_X, RUNWAY_Y + 0.02, runwayCenterZ);
    rwyMesh.receiveShadow = true;
    baseGroup.add(rwyMesh);

    const apronMesh = new THREE.Mesh(new THREE.BoxGeometry(36, 0.18, 120), asphaltMat);
    apronMesh.position.set(RUNWAY_X + 34, RUNWAY_Y + 0.01, 210);
    apronMesh.receiveShadow = true;
    baseGroup.add(apronMesh);

    // 2. Merged White Runway Markings (Centerline Dashes + Threshold Piano Keys)
    const markParts: THREE.BufferGeometry[] = [];
    for (let z = RUNWAY_Z_MIN + 28; z <= RUNWAY_Z_MAX - 28; z += 24) {
      const dash = new THREE.BoxGeometry(0.9, 0.05, 12);
      dash.translate(RUNWAY_X, RUNWAY_Y + 0.13, z);
      markParts.push(dash);
    }
    for (const endZ of [RUNWAY_Z_MIN + 12, RUNWAY_Z_MAX - 12]) {
      for (let k = -4; k <= 4; k++) {
        if (k === 0) continue;
        const bar = new THREE.BoxGeometry(1.6, 0.05, 14);
        bar.translate(RUNWAY_X + k * 3.4, RUNWAY_Y + 0.13, endZ);
        markParts.push(bar);
      }
    }
    const markMat = new THREE.MeshStandardMaterial({
      color: 0xf4f6f8,
      emissive: 0x22262c,
      roughness: 0.55
    });
    baseGroup.add(new THREE.Mesh(this.mergeGeometryParts(markParts), markMat));

    // 3. Animated Runway Approach Strobe & Edge Lights (1 single InstancedMesh!)
    const lightCount = 64;
    const bulbGeo = new THREE.SphereGeometry(0.42, 8, 8);
    this.strobeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vWorldPos;
        uniform float uTime;
        void main() {
          float pulse = fract(vWorldPos.z * 0.012 + uTime * 2.6);
          float flash = smoothstep(0.75, 1.0, pulse);
          vec3 col = mix(vec3(0.18, 0.88, 1.0), vec3(1.0, 0.96, 0.82), flash);
          gl_FragColor = vec4(col * (1.2 + flash * 1.8), 1.0);
        }
      `
    });
    const lightInst = new THREE.InstancedMesh(bulbGeo, this.strobeMat, lightCount);
    let lIdx = 0;
    for (let i = 0; i < 24; i++) {
      const lz = RUNWAY_Z_MIN + i * ((RUNWAY_Z_MAX - RUNWAY_Z_MIN) / 23);
      for (const side of [-19.8, 19.8]) {
        if (lIdx >= lightCount) break;
        this.tmpDummy.position.set(RUNWAY_X + side, RUNWAY_Y + 0.45, lz);
        this.tmpDummy.scale.setScalar(1);
        this.tmpDummy.updateMatrix();
        lightInst.setMatrixAt(lIdx++, this.tmpDummy.matrix);
      }
    }
    // Rabbit centerline approach lights south & north of thresholds
    for (let i = 1; i <= 8 && lIdx < lightCount; i++) {
      this.tmpDummy.position.set(RUNWAY_X, RUNWAY_Y + 0.5, RUNWAY_Z_MAX + i * 14);
      this.tmpDummy.scale.setScalar(1.35);
      this.tmpDummy.updateMatrix();
      lightInst.setMatrixAt(lIdx++, this.tmpDummy.matrix);
    }
    lightInst.count = lIdx;
    lightInst.instanceMatrix.needsUpdate = true;
    baseGroup.add(lightInst);

    // 4. Airbase Hangar & Control Tower
    const towerMat = this.ctx.textures.createPBRMaterial('facade_glass', {
      repeatX: 2,
      repeatY: 4,
      roughness: 0.3,
      metalness: 0.5
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x3b424d,
      roughness: 0.42,
      metalness: 0.72
    });
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(24, 11, 38), steelMat);
    hangar.position.set(RUNWAY_X + 38, RUNWAY_Y + 5.5, 232);
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    baseGroup.add(hangar);

    const towerShaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 24, 8), towerMat);
    towerShaft.position.set(RUNWAY_X + 36, RUNWAY_Y + 12, 182);
    towerShaft.castShadow = true;
    baseGroup.add(towerShaft);

    const cabGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 4.0, 4.5, 8),
      new THREE.MeshPhysicalMaterial({
        color: 0x7ee8ff,
        emissive: 0x104459,
        roughness: 0.1,
        metalness: 0.2,
        transmission: 0.45,
        clearcoat: 1.0
      })
    );
    cabGlass.position.set(RUNWAY_X + 36, RUNWAY_Y + 25.5, 182);
    baseGroup.add(cabGlass);

    this.radarMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 1.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff6b57, emissive: 0x99281a, roughness: 0.3, metalness: 0.6 })
    );
    this.radarMesh.position.set(RUNWAY_X + 36, RUNWAY_Y + 29.2, 182);
    baseGroup.add(this.radarMesh);

    this.worldGroup.add(baseGroup);
  }

  private buildSuspensionBridge(): void {
    const bridgeGroup = new THREE.Group();
    const spanLen = BRIDGE_HALF_SPAN * 2 + 12;

    // 1. Roadway Asphalt Deck with Gentle Catenary Camber
    const deckSegs = 32;
    const deckGeo = new THREE.BoxGeometry(spanLen, 1.35, BRIDGE_HALF_WIDTH * 2, deckSegs, 1, 1);
    const dPos = deckGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < dPos.count; i++) {
      const vx = dPos.getX(i);
      const ratio = Math.min(1, Math.abs(vx) / BRIDGE_HALF_SPAN);
      const camber = (1.0 - ratio * ratio) * 1.15;
      dPos.setY(i, dPos.getY(i) + camber);
    }
    deckGeo.computeVertexNormals();

    const deckMat = this.ctx.textures.createPBRMaterial('asphalt', {
      repeatX: 28,
      repeatY: 2,
      roughness: 0.5,
      metalness: 0.12
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(0, BRIDGE_Y - 0.65, BRIDGE_Z);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    bridgeGroup.add(deckMesh);

    // 2. Twin Monumental Crimson-International-Orange H-Frame Towers + Cables + Guardrails
    const towerParts: THREE.BufferGeometry[] = [];
    const cableParts: THREE.BufferGeometry[] = [];
    const towerXPositions = [-80, 80];
    const towerTopY = BRIDGE_Y + 42;

    for (const tx of towerXPositions) {
      for (const sideZ of [-BRIDGE_HALF_WIDTH - 0.6, BRIDGE_HALF_WIDTH + 0.6]) {
        const leg = new THREE.BoxGeometry(2.8, 108, 2.8);
        leg.translate(tx, towerTopY - 54, BRIDGE_Z + sideZ);
        towerParts.push(leg);
      }
      // Cross-bracing struts above & below roadway
      for (const crossY of [BRIDGE_Y - 12, BRIDGE_Y + 18, towerTopY - 3]) {
        const beam = new THREE.BoxGeometry(2.6, 2.4, BRIDGE_HALF_WIDTH * 2 + 3.2);
        beam.translate(tx, crossY, BRIDGE_Z);
        towerParts.push(beam);
      }
    }

    // Guardrails along full bridge span
    for (const sideZ of [-BRIDGE_HALF_WIDTH + 0.3, BRIDGE_HALF_WIDTH - 0.3]) {
      const rail = new THREE.BoxGeometry(spanLen, 1.2, 0.35);
      rail.translate(0, BRIDGE_Y + 1.1, BRIDGE_Z + sideZ);
      towerParts.push(rail);
    }

    // Parabolic Main Catenary Cables & Vertical Suspender Cables
    const cableCurveY = (x: number): number => {
      if (Math.abs(x) <= 80) {
        const u = x / 80;
        return BRIDGE_Y + 3.8 + u * u * (towerTopY - (BRIDGE_Y + 3.8));
      }
      const u = (Math.abs(x) - 80) / (BRIDGE_HALF_SPAN + 6 - 80);
      return THREE.MathUtils.lerp(towerTopY, BRIDGE_Y + 1.5, Math.min(1, u));
    };

    const steps = 34;
    const minX = -BRIDGE_HALF_SPAN - 4;
    const maxX = BRIDGE_HALF_SPAN + 4;
    for (const sideZ of [-BRIDGE_HALF_WIDTH - 0.4, BRIDGE_HALF_WIDTH + 0.4]) {
      for (let s = 0; s < steps; s++) {
        const x0 = THREE.MathUtils.lerp(minX, maxX, s / steps);
        const x1 = THREE.MathUtils.lerp(minX, maxX, (s + 1) / steps);
        const y0 = cableCurveY(x0);
        const y1 = cableCurveY(x1);
        const segLen = Math.hypot(x1 - x0, y1 - y0);
        const mainSeg = new THREE.CylinderGeometry(0.28, 0.28, segLen + 0.15, 6);
        mainSeg.rotateZ(Math.atan2(y1 - y0, x1 - x0) - Math.PI * 0.5);
        mainSeg.translate((x0 + x1) * 0.5, (y0 + y1) * 0.5, BRIDGE_Z + sideZ);
        cableParts.push(mainSeg);

        // Vertical suspender cable down to deck
        const midX = (x0 + x1) * 0.5;
        const topY = (y0 + y1) * 0.5;
        const suspH = Math.max(1.0, topY - BRIDGE_Y);
        const susp = new THREE.CylinderGeometry(0.08, 0.08, suspH, 5);
        susp.translate(midX, BRIDGE_Y + suspH * 0.5, BRIDGE_Z + sideZ);
        cableParts.push(susp);
      }
    }

    const towerMat = new THREE.MeshStandardMaterial({
      color: 0xd94832,
      roughness: 0.42,
      metalness: 0.65
    });
    const towerMesh = new THREE.Mesh(this.mergeGeometryParts(towerParts), towerMat);
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    bridgeGroup.add(towerMesh);

    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x9aa4b2,
      roughness: 0.3,
      metalness: 0.85
    });
    bridgeGroup.add(new THREE.Mesh(this.mergeGeometryParts(cableParts), cableMat));

    this.worldGroup.add(bridgeGroup);
  }

  // ============================================================================
  // SUPERSONIC STEALTH FIGHTER JET (Local Nose = -Z, Right Wing = +X, Canopy = +Y)
  // ============================================================================

  private buildSupersonicFighterJet(): void {
    const carbonMat = this.ctx.textures.createPBRMaterial('carbon', {
      repeatX: 4,
      repeatY: 4,
      tint: 0x2c3340,
      roughness: 0.28,
      metalness: 0.62
    });
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x8f99a8,
      roughness: 0.22,
      metalness: 0.92
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xff6b57,
      emissive: 0x5c1810,
      roughness: 0.35,
      metalness: 0.45
    });

    // Static stealth chine fuselage, delta wings & canted twin tails
    const hullParts: THREE.BufferGeometry[] = [];

    const radome = new THREE.ConeGeometry(0.85, 4.8, 8);
    radome.scale(1.15, 0.65, 1.0);
    radome.rotateX(-Math.PI / 2); // point tip toward -Z
    radome.translate(0, 0, -6.6);
    hullParts.push(radome);

    const fuselage = new THREE.BoxGeometry(2.3, 1.05, 8.8);
    fuselage.translate(0, 0.02, -0.2);
    hullParts.push(fuselage);

    // Side air intakes
    for (const sx of [-1.45, 1.45]) {
      const intake = new THREE.BoxGeometry(0.95, 0.82, 5.8);
      intake.translate(sx, -0.05, 0.4);
      hullParts.push(intake);
    }

    // Swept stealth main delta wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 2.8);
    wingShape.lineTo(6.8, -2.6);
    wingShape.lineTo(6.8, -4.1);
    wingShape.lineTo(1.2, -3.9);
    wingShape.closePath();

    const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.14, bevelEnabled: false });
    wingExtrude.rotateX(-Math.PI / 2); // shape +Y maps to -Z (forward)
    wingExtrude.translate(0, -0.04, 0.6);
    hullParts.push(wingExtrude);

    const wingLeftShape = new THREE.Shape();
    wingLeftShape.moveTo(0, 2.8);
    wingLeftShape.lineTo(-6.8, -2.6);
    wingLeftShape.lineTo(-6.8, -4.1);
    wingLeftShape.lineTo(-1.2, -3.9);
    wingLeftShape.closePath();
    const wingLeft = new THREE.ExtrudeGeometry(wingLeftShape, { depth: 0.14, bevelEnabled: false });
    wingLeft.rotateX(-Math.PI / 2);
    wingLeft.translate(0, -0.04, 0.6);
    hullParts.push(wingLeft);

    // Canted Twin Vertical Stabilizers
    for (const sx of [-1.35, 1.35]) {
      const tailFin = new THREE.BoxGeometry(0.14, 2.35, 2.6);
      tailFin.rotateZ(-sx * 0.28);
      tailFin.translate(sx * 1.15, 1.15, 3.35);
      hullParts.push(tailFin);
    }

    const hullMesh = new THREE.Mesh(this.mergeGeometryParts(hullParts), carbonMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    this.jetGroup.add(hullMesh);

    // Wingtip accent missiles / rails
    const railParts: THREE.BufferGeometry[] = [];
    for (const sx of [-6.8, 6.8]) {
      const rail = new THREE.CylinderGeometry(0.09, 0.09, 2.5, 6);
      rail.rotateX(Math.PI / 2);
      rail.translate(sx, 0.02, 3.6);
      railParts.push(rail);
    }
    this.jetGroup.add(new THREE.Mesh(this.mergeGeometryParts(railParts), accentMat));

    // Twin Titanium Exhaust Nozzles
    const nozzleParts: THREE.BufferGeometry[] = [];
    for (const nx of [-0.72, 0.72]) {
      const noz = new THREE.CylinderGeometry(0.46, 0.56, 1.4, 12);
      noz.rotateX(Math.PI / 2);
      noz.translate(nx, 0.0, 4.65);
      nozzleParts.push(noz);
    }
    this.jetGroup.add(new THREE.Mesh(this.mergeGeometryParts(nozzleParts), titaniumMat));

    // Tinted Golden-Iridescent Bubble Canopy
    const canopyGeo = new THREE.SphereGeometry(0.82, 16, 12);
    canopyGeo.scale(0.88, 0.68, 2.45);
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffd27d,
      emissive: 0x1a1408,
      roughness: 0.06,
      metalness: 0.25,
      transmission: 0.48,
      clearcoat: 1.0
    });
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.position.set(0, 0.58, -2.55);
    this.jetGroup.add(canopyMesh);

    // Animated Elevon Control Surfaces
    const elevGeo = new THREE.BoxGeometry(2.1, 0.1, 1.15);
    this.elevonLeft = new THREE.Mesh(elevGeo, titaniumMat);
    this.elevonLeft.position.set(-2.35, -0.02, 4.55);
    this.elevonRight = new THREE.Mesh(elevGeo, titaniumMat);
    this.elevonRight.position.set(2.35, -0.02, 4.55);
    this.jetGroup.add(this.elevonLeft, this.elevonRight);

    // Retractable Tricycle Landing Gear
    this.gearGroup = new THREE.Group();
    const gearStrutParts: THREE.BufferGeometry[] = [];
    const tireCoords: ReadonlyArray<readonly [number, number, number]> = [
      [0, -1.15, -4.2],
      [-1.55, -1.15, 1.2],
      [1.55, -1.15, 1.2]
    ];
    for (const [gx, gy, gz] of tireCoords) {
      const strut = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6);
      strut.translate(gx, gy + 0.55, gz);
      const wheel = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10);
      wheel.rotateZ(Math.PI / 2);
      wheel.translate(gx, gy, gz);
      gearStrutParts.push(strut, wheel);
    }
    this.gearGroup.add(new THREE.Mesh(this.mergeGeometryParts(gearStrutParts), titaniumMat));
    this.jetGroup.add(this.gearGroup);

    // Glowing Twin Afterburner Shock-Diamond Flame Cones (Custom ShaderMaterial!)
    this.afterburnerMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.5 }
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
        uniform float uTime;
        uniform float uIntensity;
        void main() {
          float axial = 1.0 - vUv.y; // 1 at nozzle base, 0 at flame tip
          float diamonds = pow(abs(sin(axial * 15.0 - uTime * 38.0)), 3.0);
          vec3 plasmaBlue = vec3(0.32, 0.68, 1.0);
          vec3 burnerGold = vec3(1.0, 0.58, 0.16);
          vec3 whiteCore = vec3(1.0, 0.97, 0.9);

          vec3 col = mix(burnerGold, plasmaBlue, smoothstep(0.2, 0.85, uIntensity));
          col = mix(col, whiteCore, diamonds * axial * 0.75);
          float alpha = pow(axial, 1.35) * (0.45 + 0.55 * uIntensity);
          gl_FragColor = vec4(col * (1.5 + uIntensity * 1.8), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const flameGeo = new THREE.ConeGeometry(0.42, 1.0, 12, 1, true);
    flameGeo.translate(0, -0.5, 0);
    flameGeo.rotateX(-Math.PI / 2); // base at 0, tip extends toward +Z (behind tail!)
    this.flameLeft = new THREE.Mesh(flameGeo, this.afterburnerMat);
    this.flameLeft.position.set(-0.72, 0, 5.3);
    this.flameRight = new THREE.Mesh(flameGeo, this.afterburnerMat);
    this.flameRight.position.set(0.72, 0, 5.3);
    this.jetGroup.add(this.flameLeft, this.flameRight);

    // Mach 1.0+ Supersonic Prandtl-Glauert Vapor Cone!
    const vaporGeo = new THREE.ConeGeometry(5.6, 7.2, 32, 4, true);
    vaporGeo.rotateX(-Math.PI / 2); // apex forward (-Z), skirt trailing aft (+Z)
    this.vaporConeMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.0 },
        uTime: { value: 0.0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalV;
        void main() {
          vUv = uv;
          vNormalV = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalV;
        uniform float uOpacity;
        uniform float uTime;
        void main() {
          if (uOpacity <= 0.005) discard;
          float streaks = sin(vUv.x * 62.83 + uTime * 16.0) * 0.25 + 0.75;
          float bell = sin(vUv.y * 3.14159);
          float fresnel = 0.45 + 0.55 * (1.0 - abs(vNormalV.z));
          float alpha = uOpacity * bell * streaks * fresnel;
          gl_FragColor = vec4(vec3(0.92, 0.96, 1.0), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.vaporConeMesh = new THREE.Mesh(vaporGeo, this.vaporConeMat);
    this.vaporConeMesh.position.set(0, 0.1, 2.2);
    this.vaporConeMesh.visible = false;
    this.jetGroup.add(this.vaporConeMesh);

    this.worldGroup.add(this.jetGroup);
  }

  // ============================================================================
  // RUGGED 4X4 ROCK-CRAWLER WITH VISIBLE HIGH-TRAVEL ARTICULATED SUSPENSION
  // ============================================================================

  private buildArticulated4x4Truck(): void {
    const bodyPaint = new THREE.MeshStandardMaterial({
      color: 0xe85a3c,
      roughness: 0.34,
      metalness: 0.48
    });
    const armorCarbon = this.ctx.textures.createPBRMaterial('carbon', {
      repeatX: 3,
      repeatY: 3,
      tint: 0x22262e,
      roughness: 0.62,
      metalness: 0.35
    });
    const steelChassis = new THREE.MeshStandardMaterial({
      color: 0x323842,
      roughness: 0.45,
      metalness: 0.8
    });
    const springYellow = new THREE.MeshStandardMaterial({
      color: 0xffc83d,
      roughness: 0.32,
      metalness: 0.55
    });
    const lightbarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xa8f0ff,
      emissiveIntensity: 3.2,
      roughness: 0.15
    });

    // 1. Lifted Expedition Chassis & Body (Hood = -Z, Tailgate = +Z)
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.42; // Lifted rock-crawler ride height above frame origin

    const paintParts: THREE.BufferGeometry[] = [];
    const lowerTub = new THREE.BoxGeometry(2.08, 0.72, 4.45);
    lowerTub.translate(0, 0.38, 0);
    const cabin = new THREE.BoxGeometry(1.94, 0.76, 2.55);
    cabin.translate(0, 1.08, 0.42);
    paintParts.push(lowerTub, cabin);
    const paintMesh = new THREE.Mesh(this.mergeGeometryParts(paintParts), bodyPaint);
    paintMesh.castShadow = true;
    paintMesh.receiveShadow = true;
    bodyGroup.add(paintMesh);

    // Fender flares, heavy steel bullbar, snorkel, roof expedition rack & rear Spare Tire!
    const trimParts: THREE.BufferGeometry[] = [];
    for (const [fx, fz] of [
      [-1.12, -1.48],
      [1.12, -1.48],
      [-1.12, 1.48],
      [1.12, 1.48]
    ]) {
      const flare = new THREE.BoxGeometry(0.32, 0.28, 1.15);
      flare.translate(fx, 0.48, fz);
      trimParts.push(flare);
    }
    const bullbar = new THREE.BoxGeometry(2.16, 0.42, 0.38);
    bullbar.translate(0, 0.26, -2.35);
    const roofRack = new THREE.BoxGeometry(1.86, 0.12, 2.35);
    roofRack.translate(0, 1.54, 0.42);
    const snorkel = new THREE.CylinderGeometry(0.07, 0.08, 1.15, 6);
    snorkel.translate(1.06, 1.12, -0.78);
    // Rear tailgate full-size Spare Tire
    const spareTire = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 14);
    spareTire.rotateX(Math.PI / 2);
    spareTire.translate(0.18, 0.68, 2.38);
    trimParts.push(bullbar, roofRack, snorkel, spareTire);

    const trimMesh = new THREE.Mesh(this.mergeGeometryParts(trimParts), armorCarbon);
    trimMesh.castShadow = true;
    bodyGroup.add(trimMesh);

    // Cabin Tinted Windows
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2634,
      roughness: 0.08,
      metalness: 0.2,
      transmission: 0.35,
      clearcoat: 1.0
    });
    const glassBox = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.56, 2.32), glassMat);
    glassBox.position.set(0, 1.1, 0.42);
    bodyGroup.add(glassBox);

    // Glowing Roof LED Lightbar + Headlights
    const lightParts: THREE.BufferGeometry[] = [];
    const lightbar = new THREE.BoxGeometry(1.62, 0.16, 0.18);
    lightbar.translate(0, 1.65, -0.68);
    const headL = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10);
    headL.rotateX(Math.PI / 2);
    headL.translate(-0.68, 0.48, -2.24);
    const headR = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10);
    headR.rotateX(Math.PI / 2);
    headR.translate(0.68, 0.48, -2.24);
    lightParts.push(lightbar, headL, headR);
    bodyGroup.add(new THREE.Mesh(this.mergeGeometryParts(lightParts), lightbarMat));

    this.truckGroup.add(bodyGroup);

    // 2. Visible Articulated Solid Axles (Front & Rear beams + Differential Pumpkins!)
    const makeAxleGeo = (): THREE.BufferGeometry => {
      const beam = new THREE.CylinderGeometry(0.09, 0.09, 2.15, 8);
      beam.rotateZ(Math.PI / 2);
      const diff = new THREE.SphereGeometry(0.24, 10, 8);
      diff.translate(0.18, 0, 0);
      return this.mergeGeometryParts([beam, diff]);
    };
    const axleGeo = makeAxleGeo();
    this.frontAxleMesh = new THREE.Mesh(axleGeo, steelChassis);
    this.rearAxleMesh = new THREE.Mesh(axleGeo, steelChassis);
    this.truckGroup.add(this.frontAxleMesh, this.rearAxleMesh);

    // 3. 4 Long-Travel Coilover Struts + 4 Trailing Control Links + 4 Knobby Mud Tires
    const strutGeo = new THREE.CylinderGeometry(0.11, 0.09, 1.0, 8);
    const linkGeo = new THREE.BoxGeometry(0.09, 0.09, 1.0);

    const tireOuter = new THREE.CylinderGeometry(0.56, 0.56, 0.42, 16);
    tireOuter.rotateZ(Math.PI / 2);
    const tireParts: THREE.BufferGeometry[] = [tireOuter];
    for (let lug = 0; lug < 12; lug++) {
      const ang = (lug / 12) * Math.PI * 2;
      const tread = new THREE.BoxGeometry(0.44, 0.07, 0.12);
      tread.rotateX(ang);
      tread.translate(0, Math.cos(ang) * 0.56, Math.sin(ang) * 0.56);
      tireParts.push(tread);
    }
    const wheelGeo = this.mergeGeometryParts(tireParts);
    const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.45, 10);
    rimGeo.rotateZ(Math.PI / 2);

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1b1e22,
      roughness: 0.88,
      metalness: 0.08
    });

    for (let i = 0; i < 4; i++) {
      const strut = new THREE.Mesh(strutGeo, springYellow);
      this.strutMeshes.push(strut);
      this.truckGroup.add(strut);

      const link = new THREE.Mesh(linkGeo, steelChassis);
      this.linkMeshes.push(link);
      this.truckGroup.add(link);

      const wGroup = new THREE.Group();
      const spinSubGroup = new THREE.Group();
      const tireMesh = new THREE.Mesh(wheelGeo, tireMat);
      tireMesh.castShadow = true;
      const rimMesh = new THREE.Mesh(rimGeo, springYellow);
      spinSubGroup.add(tireMesh, rimMesh);
      wGroup.add(spinSubGroup);
      this.wheelGroups.push(wGroup);
      this.truckGroup.add(wGroup);
    }

    // Active Winch Cable Visual (visible when holding Shift on steep rocky climbs!)
    const winchGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5);
    winchGeo.rotateX(Math.PI / 2);
    winchGeo.translate(0, 0, -0.5);
    this.winchLineMesh = new THREE.Mesh(
      winchGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xff9f1c,
        emissiveIntensity: 2.0,
        roughness: 0.3
      })
    );
    this.winchLineMesh.visible = false;
    this.worldGroup.add(this.winchLineMesh);

    this.worldGroup.add(this.truckGroup);
  }

  // ============================================================================
  // CHECKPOINT TIME-TRIAL RACES & MUD PARTICLE SYSTEM
  // ============================================================================

  private buildCheckpointCourses(group: THREE.Group): void {
    // 10 Aerial Mach Slalom Rings (Runway -> Under Bridge! -> Gorge Canyon -> Peak Crest -> Final Approach)
    const jetPts: ReadonlyArray<readonly [number, number, number]> = [
      [RUNWAY_X, RUNWAY_Y + 18, 120],
      [-210, 74, 82],
      [0, BRIDGE_Y - 26, BRIDGE_Z], // Thrilling under-bridge pass!
      [260, 118, 40],
      [480, 195, -240],
      [240, 265, -560],
      [-180, 250, -540],
      [-480, 190, -280],
      [-430, 125, 110],
      [RUNWAY_X, RUNWAY_Y + 24, 340]
    ];

    for (let i = 0; i < jetPts.length; i++) {
      const [x, rawY, z] = jetPts[i];
      const minSafeY = i === 2 ? BRIDGE_Y - 26 : Math.max(rawY, this.sampleTerrainHeight(x, z) + 38);
      const next = jetPts[(i + 1) % jetPts.length];
      this.jetCheckpoints.push({
        index: i,
        pos: new THREE.Vector3(x, minSafeY, z),
        yaw: Math.atan2(next[0] - x, next[2] - z),
        radius: 24
      });
    }

    // 10 4x4 Rock-Crawler Trial Gates along the Muddy Boulder Escarpment Trail
    for (let i = 1; i < TRAIL_WAYPOINTS.length; i++) {
      const [x, z] = TRAIL_WAYPOINTS[i];
      const prev = TRAIL_WAYPOINTS[i - 1];
      const surf = this.sampleDriveSurface(x, z, BRIDGE_Y + 20);
      this.truckCheckpoints.push({
        index: i - 1,
        pos: new THREE.Vector3(x, surf.y + 3.6, z),
        yaw: Math.atan2(x - prev[0], z - prev[1]),
        radius: 9.5
      });
    }

    const ringGeo = new THREE.TorusGeometry(1.0, 0.065, 10, 32);
    this.checkpointMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vColor;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          #ifdef USE_INSTANCING_COLOR
            vColor = instanceColor;
          #else
            vColor = vec3(1.0, 0.5, 0.2);
          #endif
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          float scan = sin(vUv.x * 25.13 - uTime * 6.0) * 0.22 + 0.85;
          gl_FragColor = vec4(vColor * scan * 1.6, 0.86);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.checkpointInst = new THREE.InstancedMesh(ringGeo, this.checkpointMat, 10);
    this.checkpointInst.frustumCulled = false;
    group.add(this.checkpointInst);

    // Tall vertical sky-beam beacon highlighting the current active race gate
    const beaconGeo = new THREE.CylinderGeometry(0.8, 2.2, 65, 12, 1, true);
    beaconGeo.translate(0, 32.5, 0);
    const beaconMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.y, 2.2) * 0.42;
          gl_FragColor = vec4(vec3(0.25, 0.95, 1.0), fade);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.activeGateBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    group.add(this.activeGateBeacon);
  }

  private refreshCheckpointInstances(): void {
    if (!this.checkpointInst) return;
    const list = this.vehicleMode === 'jet' ? this.jetCheckpoints : this.truckCheckpoints;
    const activeCol = new THREE.Color(0x32f5ff);
    const idleCol = new THREE.Color(0xff6b57);
    const passedCol = new THREE.Color(0x38d976);

    for (let i = 0; i < list.length; i++) {
      const cp = list[i];
      const scale = i === this.currentGateIdx ? cp.radius * 1.08 : cp.radius;
      this.tmpDummy.position.copy(cp.pos);
      this.tmpDummy.rotation.set(0, cp.yaw, 0);
      this.tmpDummy.scale.setScalar(scale);
      this.tmpDummy.updateMatrix();
      this.checkpointInst.setMatrixAt(i, this.tmpDummy.matrix);

      const col =
        i === this.currentGateIdx
          ? activeCol
          : this.raceActive && i < this.currentGateIdx
          ? passedCol
          : idleCol;
      this.checkpointInst.setColorAt(i, col);
    }

    this.checkpointInst.count = list.length;
    this.checkpointInst.instanceMatrix.needsUpdate = true;
    if (this.checkpointInst.instanceColor) this.checkpointInst.instanceColor.needsUpdate = true;

    if (this.activeGateBeacon && list[this.currentGateIdx]) {
      this.activeGateBeacon.position.copy(list[this.currentGateIdx].pos);
    }
  }

  private buildMudParticlePool(): void {
    const clodGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const clodMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.02
    });
    const mesh = new THREE.InstancedMesh(clodGeo, clodMat, MAX_MUD_PARTICLES);
    mesh.frustumCulled = false;

    for (let i = 0; i < MAX_MUD_PARTICLES; i++) {
      this.tmpDummy.position.set(0, -999, 0);
      this.tmpDummy.scale.setScalar(0.0001);
      this.tmpDummy.updateMatrix();
      mesh.setMatrixAt(i, this.tmpDummy.matrix);
      mesh.setColorAt(i, new THREE.Color(0x523b28));
      this.mudParticles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        life: 1,
        scale: 1,
        color: new THREE.Color(0x523b28)
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.mudMesh = mesh;
    this.worldGroup.add(mesh);
  }

  private emitMudClod(x: number, y: number, z: number, vx: number, vy: number, vz: number, hex: number, scale = 1.0): void {
    for (let i = 0; i < MAX_MUD_PARTICLES; i++) {
      const p = this.mudParticles[i];
      if (!p.active) {
        p.active = true;
        p.pos.set(x, y, z);
        p.vel.set(vx, vy, vz);
        p.age = 0;
        p.life = 0.65 + Math.random() * 0.45;
        p.scale = scale;
        p.color.setHex(hex);
        return;
      }
    }
  }

  // ============================================================================
  // INSTANT VEHICLE MODE SWITCHING, TOOLBAR & INPUT BINDINGS
  // ============================================================================

  private placeJetOnRunway(): void {
    this.jetPos.set(RUNWAY_X, RUNWAY_Y + 1.85, 392);
    this.jetVel.set(0, 0, 0);
    this.jetQuat.identity(); // Nose (-Z) aligned straight down runway!
    this.jetAngVel.set(0, 0, 0);
    this.jetThrottle = 0.0;
    this.jetOnGround = true;
    this.wasSupersonic = false;
    this.isStalling = false;
    this.chaseCamInitialized = false;
  }

  private placeTruckAtTrailhead(): void {
    const [tx, tz] = TRAIL_WAYPOINTS[0];
    const surf = this.sampleDriveSurface(tx, tz, RUNWAY_Y + 5);
    this.truckPos.set(tx, surf.y + 1.2, tz);
    this.truckVel.set(0, 0, 0);
    this.truckYaw = Math.atan2(-(TRAIL_WAYPOINTS[1][0] - tx), -(TRAIL_WAYPOINTS[1][1] - tz));
    this.truckPitch = 0;
    this.truckRoll = 0;
    this.truckQuat.setFromEuler(new THREE.Euler(0, this.truckYaw, 0, 'YXZ'));
    this.chaseCamInitialized = false;
  }

  private setVehicleMode(nextMode: VehicleMode, morphMidWorld = true): void {
    this.vehicleMode = nextMode;
    this.raceActive = false;
    this.currentGateIdx = 0;
    this.raceTimer = 0;
    this.chaseCamInitialized = false;

    if (nextMode === 'jet') {
      this.ctx.input.setContextMode('FLIGHT_SPACE');
      this.ctx.audio.updateVehicleEngine(false, 0, 0, 0);
      this.jetGroup.visible = true;
      this.truckGroup.visible = false;
      this.winchLineMesh.visible = false;

      if (morphMidWorld) {
        // Instant Horizon-style mid-world morph: launch airborne with crisp cruise airspeed!
        const safeAlt = Math.max(this.truckPos.y + 42, this.sampleTerrainHeight(this.truckPos.x, this.truckPos.z) + 48);
        this.jetPos.set(this.truckPos.x, safeAlt, this.truckPos.z);
        this.jetQuat.setFromEuler(new THREE.Euler(0.04, this.truckYaw, 0, 'YXZ'));
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.jetQuat);
        this.jetVel.copy(fwd).multiplyScalar(135);
        this.jetAngVel.set(0, 0, 0);
        this.jetThrottle = 0.72;
        this.jetOnGround = false;
        this.ctx.ui.notify('Chasseur Supersonique Activé', 'Plein gaz [W] + Postcombustion [Shift] pour franchir Mach 1 !', 'info');
      }
    } else {
      this.ctx.input.setContextMode('DRIVING');
      this.ctx.ui.setFighterHUDVisible(false);
      this.ctx.audio.updateSpaceThruster(false, 0, false);
      this.ctx.audio.updateWindRush(0);
      this.ctx.postFX.setSpeedFactor(0);
      this.jetGroup.visible = false;
      this.truckGroup.visible = true;

      if (morphMidWorld) {
        const dropSurf = this.sampleDriveSurface(this.jetPos.x, this.jetPos.z, this.jetPos.y);
        const waterLvl = MASSIF_CATALOG[this.currentMassif].waterLevel;
        if (dropSurf.y < waterLvl + 0.5) {
          this.placeTruckAtTrailhead();
        } else {
          this.truckPos.set(this.jetPos.x, dropSurf.y + 1.55, this.jetPos.z);
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.jetQuat);
          this.truckYaw = Math.atan2(-fwd.x, -fwd.z);
          this.truckPitch = 0;
          this.truckRoll = 0;
          this.truckVel.set(fwd.x * 8, -2, fwd.z * 8);
          this.truckQuat.setFromEuler(new THREE.Euler(0, this.truckYaw, 0, 'YXZ'));
        }
        this.ctx.ui.notify('4x4 Trial Franchissement Activé', 'Suspension articulée longue course • [Shift] Diff-Lock & Treuil !', 'info');
      }
    }

    this.refreshCheckpointInstances();
    this.renderToolbar();
  }

  private selectMassif(massif: MassifId, fromNetwork = false): void {
    this.rebuildMassifEnvironment(massif);
    if (this.vehicleMode === 'jet') {
      this.placeJetOnRunway();
      // Give exhilarating airborne overlook or runway start
      this.jetPos.set(RUNWAY_X, RUNWAY_Y + 1.85, 392);
    } else {
      this.placeTruckAtTrailhead();
    }
    this.raceActive = false;
    this.currentGateIdx = 0;
    this.raceTimer = 0;
    this.refreshCheckpointInstances();
    this.renderToolbar();

    if (!fromNetwork) {
      this.ctx.network.broadcastWorldEvent('city_change', this.id, { massif });
      this.ctx.ui.notify(MASSIF_CATALOG[massif].label, 'Massif haute résolution généré & synchronisé P2P', 'success');
    }
  }

  private setupUIAndControls(): void {
    const radialItems: RadialWheelItem[] = [
      { id: 'mode_jet', label: 'Chasseur Supersonique', icon: '✈️', category: 'vehicle' },
      { id: 'mode_4x4', label: '4x4 Trial Franchissement', icon: '🚙', category: 'vehicle' },
      { id: 'massif_alpes', label: 'Mont Blanc — Alpes', icon: '🏔️', category: 'tool' },
      { id: 'massif_canyon', label: 'Grand Canyon — Arizona', icon: '🏜️', category: 'tool' },
      { id: 'massif_fuji', label: 'Mont Fuji — Japon', icon: '🗻', category: 'tool' },
      { id: 'massif_fjord', label: 'Fjord Nordique — Norvège', icon: '🌊', category: 'tool' }
    ];

    this.ctx.ui.setRadialItems(radialItems, (item) => {
      this.ctx.audio.playUIClick();
      if (item.id === 'mode_jet') this.setVehicleMode('jet', true);
      else if (item.id === 'mode_4x4') this.setVehicleMode('truck4x4', true);
      else if (item.id.startsWith('massif_')) {
        const m = item.id.replace('massif_', '') as MassifId;
        this.selectMassif(m, false);
      }
    });

    this.renderToolbar();

    this.keydownHandler = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement | null)?.tagName === 'INPUT') return;
      this.heldKeys.add(ev.code);
      if (ev.code === 'KeyV' && this.modeSwitchCooldown <= 0) {
        this.modeSwitchCooldown = 0.22;
        this.ctx.audio.playUIClick();
        this.setVehicleMode(this.vehicleMode === 'jet' ? 'truck4x4' : 'jet', true);
      }
    };

    this.keyupHandler = (ev: KeyboardEvent) => {
      this.heldKeys.delete(ev.code);
    };

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
  }

  private renderToolbar(): void {
    const pill = (active: boolean, accent = '#ff6b57') =>
      `padding:6px 10px;border-radius:999px;border:1px solid ${
        active ? accent : 'rgba(255,255,255,0.18)'
      };background:${
        active ? 'rgba(255,107,87,0.26)' : 'rgba(10,16,28,0.74)'
      };color:${active ? '#ffd6cf' : '#e6eef8'};font-size:12px;font-weight:600;cursor:pointer;backdrop-filter:blur(8px);`;

    const html = `
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        <button data-veh="jet" style="${pill(this.vehicleMode === 'jet', '#32f5ff')}">✈️ Jet Mach 2 [V]</button>
        <button data-veh="truck4x4" style="${pill(this.vehicleMode === 'truck4x4', '#ff9f1c')}">🚙 4x4 Trial [V]</button>
        <span style="opacity:0.35;color:#fff;">|</span>
        <button data-massif="alpes" style="${pill(this.currentMassif === 'alpes')}">🏔️ Alpes</button>
        <button data-massif="canyon" style="${pill(this.currentMassif === 'canyon')}">🏜️ Canyon</button>
        <button data-massif="fuji" style="${pill(this.currentMassif === 'fuji')}">🗻 Fuji</button>
        <button data-massif="fjord" style="${pill(this.currentMassif === 'fjord')}">🌊 Fjord</button>
        <span style="opacity:0.35;color:#fff;">|</span>
        <button data-act="runway" style="${pill(false)}">🛫 Piste</button>
        <button data-act="race" style="${pill(this.raceActive, '#38d976')}">⏱️ Chrono</button>
      </div>
    `;

    this.ctx.ui.setWorldToolbarHTML(html, (container) => {
      container.querySelectorAll<HTMLButtonElement>('button[data-veh]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.veh as VehicleMode;
          if (target !== this.vehicleMode) {
            this.ctx.audio.playUIClick();
            this.setVehicleMode(target, true);
          }
        });
      });

      container.querySelectorAll<HTMLButtonElement>('button[data-massif]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const m = btn.dataset.massif as MassifId;
          this.ctx.audio.playUIClick();
          this.selectMassif(m, false);
        });
      });

      container.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.ctx.audio.playUIClick();
          if (btn.dataset.act === 'runway') {
            if (this.vehicleMode === 'jet') {
              this.placeJetOnRunway();
              this.ctx.ui.notify('Seuil de Piste 36', 'Aligné pour décollage postcombustion !', 'info');
            } else {
              this.placeTruckAtTrailhead();
              this.ctx.ui.notify('Départ Spéciale 4x4', 'Prêt au pied du sentier rocheux !', 'info');
            }
          } else if (btn.dataset.act === 'race') {
            this.startTimeTrial();
          }
        });
      });
    });
  }

  private startTimeTrial(): void {
    this.raceActive = true;
    this.currentGateIdx = 0;
    this.raceTimer = 0;
    if (this.vehicleMode === 'jet') {
      this.placeJetOnRunway();
      this.jetPos.y = RUNWAY_Y + 22;
      this.jetVel.set(0, 0, -145);
      this.jetThrottle = 0.85;
      this.jetOnGround = false;
    } else {
      this.placeTruckAtTrailhead();
    }
    this.refreshCheckpointInstances();
    this.renderToolbar();
    this.ctx.network.broadcastWorldEvent('weather_sync', this.id, {
      raceEvent: 'start',
      mode: this.vehicleMode,
      runner: this.ctx.network.playerName
    });
    this.ctx.ui.notify('Départ Chrono 10 Portes !', 'Franchissez les anneaux lumineux le plus vite possible !', 'success');
  }

  // ============================================================================
  // MAIN FRAME UPDATE
  // ============================================================================

  public update(dt: number, elapsed: number): void {
    const safeDt = Math.min(0.05, Math.max(0.0005, dt));
    this.modeSwitchCooldown = Math.max(0, this.modeSwitchCooldown - safeDt);

    const input = this.ctx.input.state;
    if (input.switchModeJustPressed && this.modeSwitchCooldown <= 0) {
      this.modeSwitchCooldown = 0.22;
      this.ctx.audio.playUIClick();
      this.setVehicleMode(this.vehicleMode === 'jet' ? 'truck4x4' : 'jet', true);
    }

    if (input.cameraToggleJustPressed) {
      this.cockpitView = !this.cockpitView;
      this.chaseCamInitialized = false;
    }

    if (this.vehicleMode === 'jet') {
      this.updateSupersonicJet(safeDt, elapsed);
    } else {
      this.updateArticulated4x4(safeDt, elapsed);
    }

    this.updateCheckpointRace(safeDt);
    this.updateSonicBoomWaves(safeDt);
    this.updateMudParticles(safeDt);

    const activePos = this.vehicleMode === 'jet' ? this.jetPos : this.truckPos;
    this.ctx.localAvatar.root.visible = false;
    this.ctx.localAvatar.root.position.copy(activePos);

    // Update sky, ocean, cloud sea, radar & runway strobes
    this.ctx.sky.update(safeDt, activePos);
    if (this.oceanMat) {
      updateOceanMaterial(this.oceanMat, elapsed, this.ctx.sky.sunDirection, this.ctx.camera.position);
    }
    if (this.cloudSeaMat) {
      this.cloudSeaMat.uniforms.uTime.value = elapsed;
    }
    if (this.strobeMat) {
      this.strobeMat.uniforms.uTime.value = elapsed;
    }
    if (this.checkpointMat) {
      this.checkpointMat.uniforms.uTime.value = elapsed;
    }
    if (this.radarMesh) {
      this.radarMesh.rotation.y = elapsed * 2.1;
    }
    this.windController?.update(elapsed);

    this.updateNetworkAndTelemetry(safeDt);
  }

  // ============================================================================
  // REAL AERODYNAMIC SUPERSONIC FLIGHT MODEL + MACH 1 VAPOR CONE & FIGHTER HUD
  // ============================================================================

  private updateSupersonicJet(dt: number, elapsed: number): void {
    const input = this.ctx.input.state;

    // 1. Throttle, Afterburner & Airbrake Controls (decoupled from ArrowUp/ArrowDown elevator keys)
    const arrowPitchHeld = this.heldKeys.has('ArrowUp') || this.heldKeys.has('ArrowDown');
    const throttleUp =
      this.heldKeys.has('KeyW') ||
      this.heldKeys.has('KeyZ') ||
      (!arrowPitchHeld && (input.moveZ > 0.1 || input.throttle > 0.15));
    const throttleDown =
      this.heldKeys.has('KeyS') ||
      (!arrowPitchHeld && (input.moveZ < -0.1 || input.brake > 0.15));
    const afterburner = input.sprint;
    const airbrake = (input.handbrake && !this.jetOnGround) ? 1.0 : throttleDown ? 0.55 : 0.0;

    if (afterburner) {
      this.jetThrottle = Math.min(1.0, this.jetThrottle + dt * 1.1);
    } else if (throttleUp) {
      this.jetThrottle = Math.min(0.86, this.jetThrottle + dt * 0.65);
    } else if (throttleDown) {
      this.jetThrottle = Math.max(this.jetOnGround ? 0.0 : 0.18, this.jetThrottle - dt * 0.75);
    }

    // 2. Local Body Axes (Nose = -Z, Right Wing = +X, Canopy = +Y)
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.jetQuat).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.jetQuat).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.jetQuat).normalize();

    const speed = this.jetVel.length();
    const mach = speed / SOUND_SPEED_MS;

    // 3. Control Surface Inputs (Mouse Look + Keyboard Roll/Pitch/Yaw)
    const keyPitch =
      (this.heldKeys.has('ArrowDown') || this.heldKeys.has('KeyK') ? 1 : 0) -
      (this.heldKeys.has('ArrowUp') || this.heldKeys.has('KeyI') ? 1 : 0);
    // On runway ground roll at > 60 m/s, holding W + Space/Shift gently rotates nose up for takeoff!
    const takeoffAssist = this.jetOnGround && speed > 60 && (input.jump || afterburner) ? 0.6 : 0;

    const rawPitchCmd = THREE.MathUtils.clamp(
      -input.lookDeltaY * 26.0 + keyPitch * 0.95 + takeoffAssist,
      -1.25,
      1.25
    );
    const rawRollCmd = THREE.MathUtils.clamp(
      input.rollAxis * 1.15 + input.lookDeltaX * 14.5,
      -1.35,
      1.35
    );
    const keyRudder =
      (this.heldKeys.has('KeyE') ? 1 : 0) -
      (this.heldKeys.has('KeyR') ? 1 : 0);
    const coordinatedTurnYaw = THREE.MathUtils.clamp(-right.y, -0.85, 0.85) * 0.38;
    const rawYawCmd = THREE.MathUtils.clamp(
      this.jetOnGround ? input.moveX * 0.85 : keyRudder * 0.65 + coordinatedTurnYaw + input.moveX * 0.16,
      -1.0,
      1.0
    );

    // Control authority scales with dynamic airspeed
    const controlAuth = this.jetOnGround
      ? THREE.MathUtils.clamp(speed / 58, 0.15, 1.0)
      : THREE.MathUtils.clamp(speed / 95, 0.28, 1.25);

    this.jetAngVel.x = THREE.MathUtils.lerp(this.jetAngVel.x, rawPitchCmd * 1.65 * controlAuth, Math.min(1, dt * 7.5));
    this.jetAngVel.z = THREE.MathUtils.lerp(this.jetAngVel.z, rawRollCmd * 2.85 * controlAuth, Math.min(1, dt * 8.5));
    this.jetAngVel.y = THREE.MathUtils.lerp(this.jetAngVel.y, -rawYawCmd * 0.95 * controlAuth, Math.min(1, dt * 6.5));

    // Animate Elevons visually
    this.elevonLeft.rotation.x = -rawPitchCmd * 0.35 + rawRollCmd * 0.28;
    this.elevonRight.rotation.x = -rawPitchCmd * 0.35 - rawRollCmd * 0.28;

    // 4. Real Aerodynamics: Angle of Attack, Lift ∝ v² * AoA, Induced & Parasitic Drag!
    const mass = 11200;
    const wingArea = 38.0;
    const rho = 1.225 * Math.exp(-Math.max(0, this.jetPos.y) / 8500);

    const fwdSpeed = Math.max(0, this.jetVel.dot(fwd));
    const verticalVelBody = this.jetVel.dot(up);
    const alpha =
      speed > 8 && !this.jetOnGround
        ? Math.atan2(-verticalVelBody, Math.max(10, fwdSpeed))
        : 0.035; // baseline wing incidence on gear

    const alphaCrit = 0.30; // ~17.2 deg critical stall AoA
    let cl: number;
    if (Math.abs(alpha) <= alphaCrit) {
      cl = 5.2 * alpha + 0.16;
    } else {
      const sign = Math.sign(alpha);
      const excess = Math.abs(alpha) - alphaCrit;
      cl = sign * (5.2 * alphaCrit + 0.16) * Math.max(0.18, 1.0 - excess * 2.6);
    }

    const qDyn = 0.5 * rho * speed * speed;
    const liftMag = qDyn * wingArea * cl;

    // Induced drag (∝ CL²) + Parasitic drag + Transonic wave-drag bump near Mach 1 + Airbrake
    const waveDrag = Math.exp(-Math.pow((mach - 1.0) / 0.14, 2)) * 0.018;
    const cd = 0.019 + 0.064 * cl * cl + waveDrag + airbrake * 0.14;
    const dragMag = qDyn * wingArea * cd;

    // Side-slip aerodynamic weathervane stability
    const sideVel = this.jetVel.dot(right);
    const sideForceMag = -0.5 * rho * speed * sideVel * 18.0;

    // Twin Turbofan + Afterburner Thrust (reaches Mach 1.9+)
    const dryMaxThrust = 148000;
    const burnerThrust = afterburner ? 128000 : 0;
    const thrustMag = this.jetThrottle * dryMaxThrust + burnerThrust;

    const totalForce = new THREE.Vector3(0, -mass * 9.81, 0);
    totalForce.addScaledVector(fwd, thrustMag);
    totalForce.addScaledVector(up, liftMag);
    totalForce.addScaledVector(right, sideForceMag);
    if (speed > 0.5) {
      totalForce.addScaledVector(this.jetVel, -dragMag / speed);
    }

    // Gentle aerodynamic velocity alignment toward nose when pulling high-G turns
    this.jetVel.addScaledVector(totalForce, dt / mass);
    if (!this.jetOnGround && speed > 35) {
      const turnRedirect = Math.min(1, dt * 1.85);
      const aligned = fwd.clone().multiplyScalar(this.jetVel.length());
      this.jetVel.lerp(aligned, turnRedirect * 0.32);
    }

    // Stall Warning & Post-Stall Nose Drop
    const groundSurf = this.sampleDriveSurface(this.jetPos.x, this.jetPos.z, this.jetPos.y);
    const agl = this.jetPos.y - groundSurf.y;
    this.isStalling = !this.jetOnGround && agl > 16 && (speed < 54 || Math.abs(alpha) > alphaCrit);
    if (this.isStalling) {
      // Natural aerodynamic nose-down recovery pitch in a stall
      this.jetAngVel.x -= 0.65 * dt;
      if (Math.random() < 0.2) this.ctx.input.vibrate(45, 0.25, 0.15);
    }

    // Integrate 6-DOF Quaternion Rotation
    if (!this.jetOnGround || speed > 55) {
      const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.jetAngVel.x * dt);
      const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.jetAngVel.y * dt);
      const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, -1), this.jetAngVel.z * dt);
      this.jetQuat.multiply(qYaw).multiply(qPitch).multiply(qRoll).normalize();
    } else {
      // Ground nose-wheel steering on Runway
      const qSteer = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.jetAngVel.y * dt);
      this.jetQuat.multiply(qSteer).normalize();
    }

    // Integrate Position & Keep Inside Extended Airspace (wrap softly near edges)
    this.jetPos.addScaledVector(this.jetVel, dt);
    if (Math.abs(this.jetPos.x) > TERRAIN_HALF - 60) {
      this.jetPos.x = THREE.MathUtils.clamp(this.jetPos.x, -TERRAIN_HALF + 65, TERRAIN_HALF - 65);
      this.jetVel.x *= -0.5;
    }
    if (Math.abs(this.jetPos.z) > TERRAIN_HALF - 60) {
      this.jetPos.z = THREE.MathUtils.clamp(this.jetPos.z, -TERRAIN_HALF + 65, TERRAIN_HALF - 65);
      this.jetVel.z *= -0.5;
    }

    // Ground / Runway Contact & Crash Protection
    const nextSurf = this.sampleDriveSurface(this.jetPos.x, this.jetPos.z, this.jetPos.y);
    const waterLvl = MASSIF_CATALOG[this.currentMassif].waterLevel;
    const minFloorY = Math.max(nextSurf.y, waterLvl);
    const gearClearance = 1.82;

    // Deploy landing gear automatically below 38m AGL & < 120 m/s
    this.gearGroup.visible = agl < 42 && speed < 135;

    if (this.jetPos.y <= minFloorY + gearClearance) {
      if ((nextSurf.isRunway || nextSurf.isBridge) && this.jetVel.y > -16 && up.y > 0.72) {
        // Clean Runway Roll / Touchdown!
        this.jetPos.y = minFloorY + gearClearance;
        if (this.jetVel.y < 0) this.jetVel.y = 0;
        this.jetOnGround = true;
        // Level wings & apply wheel rolling resistance / braking
        const flatFwd = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
        const targetGroundQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), flatFwd);
        this.jetQuat.slerp(targetGroundQuat, Math.min(1, dt * 6));
        const brakeDrag = input.handbrake || throttleDown ? 22.0 : 1.5;
        const newSpd = Math.max(0, this.jetVel.length() - brakeDrag * dt);
        this.jetVel.copy(flatFwd).multiplyScalar(newSpd);
      } else {
        // Emergency terrain pull-up / recovery respawn so gameplay never soft-locks!
        this.ctx.audio.playCannonFire(8);
        this.ctx.input.vibrate(280, 0.85, 0.5);
        this.jetPos.y = minFloorY + 65;
        this.jetQuat.setFromEuler(new THREE.Euler(0.08, Math.atan2(-fwd.x, -fwd.z), 0, 'YXZ'));
        const recFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.jetQuat);
        this.jetVel.copy(recFwd).multiplyScalar(140);
        this.jetAngVel.set(0, 0, 0);
        this.jetThrottle = 0.75;
        this.jetOnGround = false;
        this.ctx.ui.notify('Alerte Relief GPWS !', 'Rétablissement automatique d’altitude de sécurité', 'warning');
      }
    } else {
      this.jetOnGround = false;
    }

    // 5. Mach 1.0+ Sonic Boom & Prandtl-Glauert Vapor Cone!
    if (mach >= 1.0 && !this.wasSupersonic) {
      this.wasSupersonic = true;
      this.ctx.audio.playSonicBoom();
      this.ctx.input.vibrate(250, 0.95, 0.55);
      this.spawnSonicBoomRing();
      this.ctx.ui.notify('BANG SUPERSONIQUE — MACH 1.0 !', 'Cône de condensation de Prandtl-Glauert franchi !', 'success');
    } else if (mach < 0.94) {
      this.wasSupersonic = false;
    }

    // Vapor cone peaks visibly around Mach 0.96..1.28 and stays sleekly visible in supersonic cruise
    let vaporAlpha = 0;
    if (mach > 0.95) {
      vaporAlpha = mach < 1.18 ? this.smoothstep(0.95, 1.04, mach) * 0.72 : Math.max(0.24, 0.72 - (mach - 1.18) * 0.55);
    }
    this.vaporConeMesh.visible = vaporAlpha > 0.01;
    this.vaporConeMat.uniforms.uOpacity.value = vaporAlpha;
    this.vaporConeMat.uniforms.uTime.value = elapsed;

    // Update Twin Afterburner Flame Cones
    const burnerFactor = afterburner ? 1.0 : this.jetThrottle * 0.55;
    if (this.afterburnerMat) {
      this.afterburnerMat.uniforms.uTime.value = elapsed;
      this.afterburnerMat.uniforms.uIntensity.value = burnerFactor;
    }
    const flameLen = 0.8 + burnerFactor * 5.8 + Math.sin(elapsed * 48) * 0.28;
    const flameRad = 0.75 + burnerFactor * 0.45;
    this.flameLeft.visible = this.jetThrottle > 0.04 || afterburner;
    this.flameRight.visible = this.flameLeft.visible;
    this.flameLeft.scale.set(flameRad, flameRad, flameLen);
    this.flameRight.scale.set(flameRad, flameRad, flameLen);

    this.jetGroup.position.copy(this.jetPos);
    this.jetGroup.quaternion.copy(this.jetQuat);

    // 6. Audio, PostFX Speed Chromatic Aberration & Holographic Fighter Pitch-Ladder HUD
    this.ctx.audio.updateSpaceThruster(true, Math.max(0.1, this.jetThrottle), afterburner);
    this.ctx.audio.updateWindRush(Math.min(1.0, speed / 390));
    this.ctx.postFX.setSpeedFactor(Math.min(1.0, Math.max(0, (speed - 80) / 360)));

    const pitchDeg = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1)));
    const rollDeg = THREE.MathUtils.radToDeg(Math.atan2(-right.y, up.y));
    this.ctx.ui.setFighterHUDVisible(true, pitchDeg, rollDeg, mach, Math.round(this.jetPos.y), this.isStalling);

    // 7. Dynamic Supersonic Chase / Cockpit Camera
    const targetFov = afterburner ? 74 : 64 + Math.min(8, mach * 4);
    if (Math.abs(this.ctx.camera.fov - targetFov) > 0.1) {
      this.ctx.camera.fov = THREE.MathUtils.lerp(this.ctx.camera.fov, targetFov, Math.min(1, dt * 6));
      this.ctx.camera.updateProjectionMatrix();
    }

    if (this.cockpitView) {
      const camPos = this.jetPos.clone().addScaledVector(up, 0.88).addScaledVector(fwd, 2.35);
      this.ctx.camera.position.copy(camPos);
      this.ctx.camera.up.copy(up);
      this.ctx.camera.lookAt(camPos.clone().addScaledVector(fwd, 50));
    } else {
      const desiredCam = this.jetPos
        .clone()
        .addScaledVector(fwd, -16.5 - burnerFactor * 2.5)
        .addScaledVector(up, 4.2);
      const desiredLook = this.jetPos.clone().addScaledVector(fwd, 28);

      if (!this.chaseCamInitialized) {
        this.smoothCamPos.copy(desiredCam);
        this.smoothCamLook.copy(desiredLook);
        this.chaseCamInitialized = true;
      } else {
        this.smoothCamPos.lerp(desiredCam, Math.min(1, dt * 11));
        this.smoothCamLook.lerp(desiredLook, Math.min(1, dt * 15));
      }
      const camFloor = this.sampleTerrainHeight(this.smoothCamPos.x, this.smoothCamPos.z) + 2.0;
      if (this.smoothCamPos.y < camFloor) this.smoothCamPos.y = camFloor;

      this.ctx.camera.up.lerp(up, Math.min(1, dt * 7)).normalize();
      this.ctx.camera.position.copy(this.smoothCamPos);
      this.ctx.camera.lookAt(this.smoothCamLook);
    }
  }

  private spawnSonicBoomRing(): void {
    const geo = new THREE.RingGeometry(0.7, 1.0, 40);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uAlpha: { value: 0.9 } },
      vertexShader: /* glsl */ `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha;
        void main() {
          gl_FragColor = vec4(vec3(0.88, 0.96, 1.0), uAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.jetPos);
    mesh.quaternion.copy(this.jetQuat);
    this.worldGroup.add(mesh);
    this.sonicBoomWaves.push({ mesh, mat, age: 0, duration: 0.65 });
  }

  private updateSonicBoomWaves(dt: number): void {
    for (let i = this.sonicBoomWaves.length - 1; i >= 0; i--) {
      const w = this.sonicBoomWaves[i];
      w.age += dt;
      const t = Math.min(1, w.age / w.duration);
      w.mesh.scale.setScalar(2.0 + t * 44.0);
      w.mat.uniforms.uAlpha.value = (1.0 - t) * 0.85;
      if (w.age >= w.duration) {
        w.mesh.geometry.dispose();
        w.mat.dispose();
        this.worldGroup.remove(w.mesh);
        this.sonicBoomWaves.splice(i, 1);
      }
    }
  }

  // ============================================================================
  // 4X4 ROCK-CRAWLER PHYSICS + INDEPENDENT 4-WHEEL ARTICULATED SUSPENSION
  // ============================================================================

  private updateArticulated4x4(dt: number, elapsed: number): void {
    const input = this.ctx.input.state;
    if (input.hornJustPressed) this.ctx.audio.playHorn();

    // 1. Steering, Throttle, Brake/Reverse & Diff-Lock / Winch Boost (Shift)
    const targetSteer = -input.moveX * 0.62;
    this.truckSteer = THREE.MathUtils.lerp(this.truckSteer, targetSteer, Math.min(1, dt * 9));

    const fwdInput = input.moveZ !== 0 ? input.moveZ : input.throttle - input.brake;
    const diffLocked = input.sprint; // Shift = 4x4 Low-Range Diff-Lock + Winch Boost!

    // Local wheel mount points on chassis: [FL, FR, RL, RR] (Front = -Z, Right = +X)
    const wheelMountsLocal: ReadonlyArray<THREE.Vector3> = [
      new THREE.Vector3(-1.14, 0.32, -1.48), // FL
      new THREE.Vector3(1.14, 0.32, -1.48),  // FR
      new THREE.Vector3(-1.14, 0.32, 1.48),  // RL
      new THREE.Vector3(1.14, 0.32, 1.48)    // RR
    ];

    const restLength = 1.05;
    const wheelRadius = 0.56;
    const kSpring = 42.0;
    const kDamper = 7.2;

    const wheelHubsLocal: THREE.Vector3[] = [];
    const wheelContactsWorld: THREE.Vector3[] = [];
    let groundedWheels = 0;
    let totalVerticalAccel = -19.5; // Gravity
    let muddyWheels = 0;

    // 2. Independent 4-Wheel High-Travel Suspension Raycasts!
    for (let i = 0; i < 4; i++) {
      const mountWorld = wheelMountsLocal[i].clone().applyQuaternion(this.truckQuat).add(this.truckPos);
      const surf = this.sampleDriveSurface(mountWorld.x, mountWorld.z, mountWorld.y + 1.0);
      if (surf.isMud) muddyWheels++;

      const distToHubFloor = mountWorld.y - (surf.y + wheelRadius);
      const maxExtension = restLength + 0.25;
      const clampedDist = THREE.MathUtils.clamp(distToHubFloor, 0.22, maxExtension);

      let compression = 0;
      if (distToHubFloor <= restLength) {
        groundedWheels++;
        compression = restLength - clampedDist;
        const compVel = (compression - this.prevWheelCompression[i]) / Math.max(0.001, dt);
        const springAccel = Math.max(0, compression * kSpring + compVel * kDamper);
        totalVerticalAccel += springAccel * 0.25;
      }

      this.prevWheelCompression[i] = compression;
      this.wheelCompression[i] = compression;

      const hubYLocal = wheelMountsLocal[i].y - clampedDist;
      const hubLocal = new THREE.Vector3(wheelMountsLocal[i].x, hubYLocal, wheelMountsLocal[i].z);
      wheelHubsLocal.push(hubLocal);

      wheelContactsWorld.push(new THREE.Vector3(mountWorld.x, surf.y, mountWorld.z));
    }

    // 3. Align Chassis Pitch & Roll smoothly to the 4-Wheel Ground Plane while axles articulate independently!
    const frontMid = wheelContactsWorld[0].clone().add(wheelContactsWorld[1]).multiplyScalar(0.5);
    const rearMid = wheelContactsWorld[2].clone().add(wheelContactsWorld[3]).multiplyScalar(0.5);
    const leftMid = wheelContactsWorld[0].clone().add(wheelContactsWorld[2]).multiplyScalar(0.5);
    const rightMid = wheelContactsWorld[1].clone().add(wheelContactsWorld[3]).multiplyScalar(0.5);

    const slopePitch = Math.atan2(frontMid.y - rearMid.y, Math.max(1.5, frontMid.distanceTo(rearMid)));
    const slopeRoll = Math.atan2(leftMid.y - rightMid.y, Math.max(1.2, leftMid.distanceTo(rightMid)));

    // Dynamic body squat / dive under throttle & braking
    const accelPitch = -fwdInput * 0.045;
    this.truckPitch = THREE.MathUtils.lerp(this.truckPitch, THREE.MathUtils.clamp(slopePitch * 0.78 + accelPitch, -0.78, 0.78), Math.min(1, dt * 8));
    this.truckRoll = THREE.MathUtils.lerp(this.truckRoll, THREE.MathUtils.clamp(slopeRoll * 0.68, -0.72, 0.72), Math.min(1, dt * 8));

    // 4. Longitudinal & Lateral Off-Road Traction + Diff-Lock / Winch Crawler Boost
    const chassisFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.truckQuat).normalize();
    const chassisRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.truckQuat).normalize();

    const currentFwdSpeed = this.truckVel.dot(chassisFwd);
    const maxSpeed = diffLocked ? 34.0 : 28.0;

    if (groundedWheels > 0) {
      const tractionRatio = diffLocked ? 1.0 : groundedWheels / 4.0;
      const driveForce = fwdInput * (diffLocked ? 34.0 : 23.5) * tractionRatio;
      this.truckVel.addScaledVector(chassisFwd, driveForce * dt);

      // Lateral tire grip (tighter when diff-locked, playful dirt slide with handbrake!)
      const latSpeed = this.truckVel.dot(chassisRight);
      const latGrip = input.handbrake ? 2.2 : diffLocked ? 11.5 : 8.5;
      this.truckVel.addScaledVector(chassisRight, -latSpeed * Math.min(1, dt * latGrip));

      if (input.handbrake) {
        this.truckVel.multiplyScalar(Math.pow(0.18, dt));
      } else if (Math.abs(fwdInput) < 0.05) {
        this.truckVel.multiplyScalar(Math.pow(0.52, dt));
      }

      // Steer yaw proportional to forward rolling speed
      const steerDir = currentFwdSpeed >= -0.4 ? 1 : -1;
      const speedTurnFactor = THREE.MathUtils.clamp(Math.abs(currentFwdSpeed) / 9.0, 0, 1.0);
      this.truckYaw += this.truckSteer * steerDir * speedTurnFactor * 2.15 * dt;
    }

    // Active Winch Line & Steep Climb Boost when Shift is held!
    if (diffLocked && Math.abs(fwdInput) > 0.1) {
      const winchAnchor = this.truckPos.clone().addScaledVector(chassisFwd, 12.5);
      winchAnchor.y = this.sampleTerrainHeight(winchAnchor.x, winchAnchor.z) + 0.6;
      const winchOrigin = this.truckPos.clone().addScaledVector(chassisFwd, 2.35);
      const winchVec = winchAnchor.clone().sub(winchOrigin);
      const winchLen = winchVec.length();

      if (this.truckPitch > 0.14) {
        this.truckVel.addScaledVector(winchVec.normalize(), 12.5 * dt);
        this.winchLineMesh.visible = true;
        this.winchLineMesh.position.copy(winchOrigin);
        this.winchLineMesh.lookAt(winchAnchor);
        this.winchLineMesh.scale.set(1, 1, winchLen);
      } else {
        this.winchLineMesh.visible = false;
      }
    } else {
      this.winchLineMesh.visible = false;
    }

    // Clamp top speed & apply vertical suspension physics
    const horizSpd = Math.hypot(this.truckVel.x, this.truckVel.z);
    if (horizSpd > maxSpeed) {
      const scale = maxSpeed / horizSpd;
      this.truckVel.x *= scale;
      this.truckVel.z *= scale;
    }
    this.truckVel.y = THREE.MathUtils.clamp(this.truckVel.y + totalVerticalAccel * dt, -26, 18);
    if (groundedWheels >= 2 && this.truckVel.y > 0) {
      this.truckVel.y *= 0.88;
    }

    this.truckPos.addScaledVector(this.truckVel, dt);

    // Bridge guardrail lateral containment so you don't slip off the narrow bridge deck!
    if (Math.abs(this.truckPos.x) < BRIDGE_HALF_SPAN && Math.abs(this.truckPos.z - BRIDGE_Z) < BRIDGE_HALF_WIDTH + 1.2 && this.truckPos.y > BRIDGE_Y - 3) {
      if (Math.abs(this.truckPos.z - BRIDGE_Z) > BRIDGE_HALF_WIDTH - 1.15) {
        this.truckPos.z = BRIDGE_Z + Math.sign(this.truckPos.z - BRIDGE_Z) * (BRIDGE_HALF_WIDTH - 1.15);
        this.truckVel.z *= -0.25;
      }
    }

    // Hard chassis belly clearance & deep-water rescue
    const centerSurf = this.sampleDriveSurface(this.truckPos.x, this.truckPos.z, this.truckPos.y);
    const minChassisY = centerSurf.y + 0.72;
    if (this.truckPos.y < minChassisY) {
      this.truckPos.y = minChassisY;
      if (this.truckVel.y < 0) this.truckVel.y = 0;
    }

    const waterLvl = MASSIF_CATALOG[this.currentMassif].waterLevel;
    if (this.truckPos.y < waterLvl - 0.6 && !centerSurf.isBridge) {
      this.placeTruckAtTrailhead();
      this.ctx.ui.notify('Treuillage Hors d’Eau', '4x4 replacé sur la berge sèche', 'warning');
    }

    this.truckQuat.setFromEuler(new THREE.Euler(this.truckPitch, this.truckYaw, -this.truckRoll, 'YXZ'));
    this.truckGroup.position.copy(this.truckPos);
    this.truckGroup.quaternion.copy(this.truckQuat);

    // 5. Update Visible High-Travel Articulated Axles, Coilover Struts, Control Arms & Spinning Tires!
    const wheelSlip = groundedWheels > 0 && Math.abs(fwdInput) > 0.35 ? Math.abs(fwdInput) * 6.0 : 0;
    this.truckWheelSpin += (currentFwdSpeed + Math.sign(fwdInput) * wheelSlip) * (dt / wheelRadius);

    for (let i = 0; i < 4; i++) {
      const hub = wheelHubsLocal[i];
      const wGroup = this.wheelGroups[i];
      wGroup.position.copy(hub);
      wGroup.rotation.set(0, i < 2 ? this.truckSteer : 0, 0);
      const spinSub = wGroup.children[0];
      if (spinSub) spinSub.rotation.x = -this.truckWheelSpin;

      // Coilover strut from upper body shock tower to wheel hub
      const towerTop = new THREE.Vector3(hub.x * 0.82, 0.58, hub.z);
      const strutMid = towerTop.clone().add(hub).multiplyScalar(0.5);
      const strutLen = towerTop.distanceTo(hub);
      const strut = this.strutMeshes[i];
      strut.position.copy(strutMid);
      strut.scale.set(1, Math.max(0.25, strutLen), 1);
      strut.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        hub.clone().sub(towerTop).normalize()
      );

      // Articulated trailing control arm from central frame mount to wheel hub
      const framePivot = new THREE.Vector3(hub.x * 0.62, 0.05, hub.z * 0.32);
      const linkMid = framePivot.clone().add(hub).multiplyScalar(0.5);
      const linkLen = framePivot.distanceTo(hub);
      const link = this.linkMeshes[i];
      link.position.copy(linkMid);
      link.scale.set(1, 1, linkLen);
      link.lookAt(this.truckGroup.localToWorld(hub.clone()));
    }

    // Tilt Front Solid Axle between FL (0) & FR (1), and Rear Solid Axle between RL (2) & RR (3)!
    this.alignSolidAxle(this.frontAxleMesh, wheelHubsLocal[0], wheelHubsLocal[1]);
    this.alignSolidAxle(this.rearAxleMesh, wheelHubsLocal[2], wheelHubsLocal[3]);

    // 6. Emit Mud & Gravel Splatter Clods from Spinning Tires!
    if (groundedWheels > 0 && (Math.abs(currentFwdSpeed) > 2.2 || Math.abs(fwdInput) > 0.35)) {
      const emitChance = muddyWheels > 0 ? 0.85 : 0.42;
      if (Math.random() < emitChance) {
        const idx = Math.floor(Math.random() * 4);
        const contact = wheelContactsWorld[idx];
        const sprayBack = chassisFwd.clone().multiplyScalar(-Math.sign(fwdInput || 1) * (4.5 + Math.random() * 4.5));
        const mudHex = muddyWheels > 0 ? 0x4d3420 : 0x7d7062;
        this.emitMudClod(
          contact.x + (Math.random() - 0.5) * 0.4,
          contact.y + 0.25,
          contact.z + (Math.random() - 0.5) * 0.4,
          sprayBack.x + (Math.random() - 0.5) * 2.5,
          2.2 + Math.random() * 3.4,
          sprayBack.z + (Math.random() - 0.5) * 2.5,
          mudHex,
          muddyWheels > 0 ? 1.15 : 0.8
        );
      }
    }

    // 7. Engine Audio & Off-Road Chase Camera (angled so player clearly sees wheel & axle articulation!)
    const rpmNorm = THREE.MathUtils.clamp(0.18 + Math.abs(currentFwdSpeed) / maxSpeed * 0.65 + Math.abs(fwdInput) * 0.25, 0.15, 1.0);
    this.ctx.audio.updateVehicleEngine(true, rpmNorm, Math.abs(fwdInput), input.handbrake ? 0.8 : wheelSlip * 0.1);

    if (Math.abs(this.ctx.camera.fov - 62) > 0.1) {
      this.ctx.camera.fov = THREE.MathUtils.lerp(this.ctx.camera.fov, 62, Math.min(1, dt * 8));
      this.ctx.camera.updateProjectionMatrix();
    }
    this.ctx.camera.up.set(0, 1, 0);

    if (this.cockpitView) {
      const hoodCam = this.truckPos
        .clone()
        .add(new THREE.Vector3(0, 1.85, -0.35).applyQuaternion(this.truckQuat));
      this.ctx.camera.position.copy(hoodCam);
      this.ctx.camera.lookAt(hoodCam.clone().addScaledVector(chassisFwd, 25));
    } else {
      const orbitYaw = this.truckYaw - input.lookDeltaX * 3.0;
      const camOffset = new THREE.Vector3(Math.sin(orbitYaw) * 8.4, 3.35, Math.cos(orbitYaw) * 8.4);
      const desiredCam = this.truckPos.clone().add(camOffset);
      const desiredLook = this.truckPos.clone().add(new THREE.Vector3(0, 1.1, 0)).addScaledVector(chassisFwd, 3.5);

      if (!this.chaseCamInitialized) {
        this.smoothCamPos.copy(desiredCam);
        this.smoothCamLook.copy(desiredLook);
        this.chaseCamInitialized = true;
      } else {
        this.smoothCamPos.lerp(desiredCam, Math.min(1, dt * 8.5));
        this.smoothCamLook.lerp(desiredLook, Math.min(1, dt * 12));
      }

      const floorY = this.sampleTerrainHeight(this.smoothCamPos.x, this.smoothCamPos.z) + 1.4;
      if (this.smoothCamPos.y < floorY) this.smoothCamPos.y = floorY;

      this.ctx.camera.position.copy(this.smoothCamPos);
      this.ctx.camera.lookAt(this.smoothCamLook);
    }

    // Subtle idle chassis vibration
    void elapsed;
  }

  private alignSolidAxle(axleMesh: THREE.Mesh, hubLeft: THREE.Vector3, hubRight: THREE.Vector3): void {
    const mid = hubLeft.clone().add(hubRight).multiplyScalar(0.5);
    const tiltAngle = Math.atan2(hubRight.y - hubLeft.y, hubRight.x - hubLeft.x);
    axleMesh.position.copy(mid);
    axleMesh.rotation.set(0, 0, tiltAngle);
  }

  // ============================================================================
  // CHECKPOINT PROGRESSION, MUD PARTICLES, NETWORK P2P & TELEMETRY
  // ============================================================================

  private updateCheckpointRace(dt: number): void {
    if (this.raceActive) {
      this.raceTimer += dt;
    }

    const list = this.vehicleMode === 'jet' ? this.jetCheckpoints : this.truckCheckpoints;
    if (list.length === 0) return;

    const targetGate = list[this.currentGateIdx];
    const pos = this.vehicleMode === 'jet' ? this.jetPos : this.truckPos;
    const dist = pos.distanceTo(targetGate.pos);

    if (dist <= targetGate.radius * 1.18) {
      this.ctx.audio.playBuildSnap();

      if (!this.raceActive && this.currentGateIdx === 0) {
        this.raceActive = true;
        this.raceTimer = 0;
        this.renderToolbar();
        this.ctx.ui.notify('Chrono Déclenché !', 'Porte 1/10 franchie — foncez vers la suivante !', 'info');
      }

      this.currentGateIdx++;
      if (this.currentGateIdx >= list.length) {
        // Finished all 10 checkpoints!
        const finalTime = this.raceTimer;
        this.raceActive = false;
        this.currentGateIdx = 0;
        this.credits += 500;

        if (this.vehicleMode === 'jet') {
          if (this.bestJetTime === 0 || finalTime < this.bestJetTime) this.bestJetTime = finalTime;
        } else {
          if (this.bestTruckTime === 0 || finalTime < this.bestTruckTime) this.bestTruckTime = finalTime;
        }

        this.ctx.network.broadcastWorldEvent('weather_sync', this.id, {
          raceEvent: 'finish',
          mode: this.vehicleMode,
          timeSec: Number(finalTime.toFixed(2)),
          runner: this.ctx.network.playerName
        });

        this.ctx.ui.notify(
          `Course Terminée en ${finalTime.toFixed(2)}s !`,
          `+500 CR • Record ${this.vehicleMode === 'jet' ? 'Jet' : '4x4'} enregistré !`,
          'success'
        );
        this.renderToolbar();
      }

      this.refreshCheckpointInstances();
    }
  }

  private updateMudParticles(dt: number): void {
    if (!this.mudMesh) return;
    let dirty = false;

    for (let i = 0; i < MAX_MUD_PARTICLES; i++) {
      const p = this.mudParticles[i];
      if (!p.active) continue;
      dirty = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.tmpDummy.position.set(0, -999, 0);
        this.tmpDummy.scale.setScalar(0.0001);
        this.tmpDummy.updateMatrix();
        this.mudMesh.setMatrixAt(i, this.tmpDummy.matrix);
        continue;
      }

      p.vel.y -= 14.0 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const s = p.scale * (1.0 - p.age / p.life);
      this.tmpDummy.position.copy(p.pos);
      this.tmpDummy.rotation.set(p.age * 5, p.age * 3, 0);
      this.tmpDummy.scale.setScalar(s);
      this.tmpDummy.updateMatrix();
      this.mudMesh.setMatrixAt(i, this.tmpDummy.matrix);
      this.mudMesh.setColorAt(i, p.color);
    }

    if (dirty) {
      this.mudMesh.instanceMatrix.needsUpdate = true;
      if (this.mudMesh.instanceColor) this.mudMesh.instanceColor.needsUpdate = true;
    }
  }

  public onWorldEvent(event: NetWorldEventPacket): void {
    if (event.senderId === this.ctx.network.selfPeerId) return;

    if (event.type === 'city_change' && event.payload.massif) {
      const m = event.payload.massif as MassifId;
      if (MASSIF_CATALOG[m] && m !== this.currentMassif) {
        this.selectMassif(m, true);
        this.ctx.ui.notify(
          'Changement de Massif P2P',
          `Escouade synchronisée sur ${MASSIF_CATALOG[m].label}`,
          'info'
        );
      }
    } else if (event.type === 'weather_sync' && event.payload.raceEvent === 'finish') {
      const runner = String(event.payload.runner || 'Pilote');
      const timeSec = Number(event.payload.timeSec || 0);
      const mode = event.payload.mode === 'jet' ? 'Chasseur' : '4x4 Trial';
      this.ctx.ui.notify('Chrono Escouade P2P', `${runner} a bouclé le parcours ${mode} en ${timeSec.toFixed(2)}s !`, 'info');
    }
  }

  private updateNetworkAndTelemetry(dt: number): void {
    const isJet = this.vehicleMode === 'jet';
    const pos = isJet ? this.jetPos : this.truckPos;
    const vel = isJet ? this.jetVel : this.truckVel;
    const quat = isJet ? this.jetQuat : this.truckQuat;
    const speedMs = vel.length();
    const speedKmh = Math.round(speedMs * 3.6);
    const mach = Number((speedMs / SOUND_SPEED_MS).toFixed(2));

    this.netSyncAcc += dt;
    if (this.netSyncAcc >= 0.05) {
      this.netSyncAcc = 0;
      const vehId = `${this.ctx.network.selfPeerId}_${this.vehicleMode}`;

      this.ctx.network.broadcastVehicle({
        vehicleId: vehId,
        kind: this.vehicleMode,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        vx: vel.x,
        vy: vel.y,
        vz: vel.z,
        qx: quat.x,
        qy: quat.y,
        qz: quat.z,
        qw: quat.w,
        steering: isJet ? this.jetAngVel.z : this.truckSteer,
        wheelSpin: isJet ? 0 : this.truckWheelSpin,
        extra: isJet ? (this.ctx.input.state.sprint ? 1 : this.jetThrottle) : 0
      });

      this.ctx.network.broadcastLocalPlayer({
        worldId: this.id,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        vx: vel.x,
        vy: vel.y,
        vz: vel.z,
        yaw: this.truckYaw,
        pitch: 0,
        anim: 'drive',
        tool: 'none',
        vehicleId: vehId,
        seatIndex: 0
      });
    }

    this.telemetryAcc += dt;
    if (this.telemetryAcc >= 0.1) {
      const fps = 1 / Math.max(0.001, dt);
      this.telemetryAcc = 0;

      const racePrefix = this.raceActive
        ? `⏱️ Porte ${this.currentGateIdx + 1}/10 (${this.raceTimer.toFixed(1)}s) • `
        : '';

      const hint = isJet
        ? `${racePrefix}[W/S] Gaz • [Shift] Postcombustion Mach 2 • [Souris/Flèches] Tangage/Roulis • [V] Basculer 4x4`
        : `${racePrefix}[WASD] Franchissement 4x4 • [Shift] Diff-Lock & Treuil • [Espace] Frein • [V] Basculer Jet`;

      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
      const headingDeg = (Math.round(THREE.MathUtils.radToDeg(Math.atan2(fwd.x, -fwd.z))) + 360) % 360;

      this.ctx.ui.updateTelemetry({
        fps: Math.min(144, Math.round(fps)),
        drawCalls: this.ctx.renderer.info.render.calls || this.estimatedDrawCalls,
        triangles: this.ctx.renderer.info.render.triangles || this.estimatedTriangles,
        pingMs: Math.round(this.ctx.network.getAveragePing()),
        peerCount: this.ctx.network.getConnectedPeers().length,
        qualityPreset: this.ctx.quality.config.preset,
        autoScale: this.ctx.quality.autoScale,
        worldTitle: `${this.metadata.title} • ${MASSIF_CATALOG[this.currentMassif].shortLabel}`,
        contextMode: isJet ? 'FLIGHT_SPACE' : 'DRIVING',
        speedKmh,
        rpm: isJet ? undefined : Math.round(1100 + Math.min(5400, speedKmh * 48)),
        gear: isJet ? undefined : this.ctx.input.state.sprint ? '4L-LOCK' : speedKmh < 2 ? 'N' : '4H',
        altitudeM: Math.round(pos.y),
        mach: isJet ? mach : undefined,
        headingDeg,
        credits: this.credits,
        weatherLabel: MASSIF_CATALOG[this.currentMassif].weatherTitle,
        statusHint: hint
      });
    }
  }

  public getMinimapMarkers(): MinimapMarker[] {
    const markers: MinimapMarker[] = [
      { id: 'poi_airbase', x: RUNWAY_X, z: 200, color: '#38d976', type: 'poi', label: 'Base Aérienne' },
      { id: 'poi_bridge', x: 0, z: BRIDGE_Z, color: '#ff9f1c', type: 'poi', label: 'Pont Suspendu' }
    ];

    const list = this.vehicleMode === 'jet' ? this.jetCheckpoints : this.truckCheckpoints;
    for (let i = 0; i < list.length; i++) {
      const cp = list[i];
      markers.push({
        id: `cp_${i}`,
        x: cp.pos.x,
        z: cp.pos.z,
        color: i === this.currentGateIdx ? '#32f5ff' : '#ff6b57',
        type: i === this.currentGateIdx ? 'objective' : 'poi',
        label: i === this.currentGateIdx ? `Porte ${i + 1}` : undefined
      });
    }

    return markers;
  }

  public getGPSRoute(): Array<{ x: number; z: number }> {
    const list = this.vehicleMode === 'jet' ? this.jetCheckpoints : this.truckCheckpoints;
    if (list.length === 0) return [];
    const pos = this.vehicleMode === 'jet' ? this.jetPos : this.truckPos;
    const next = list[this.currentGateIdx] ?? list[0];
    const after = list[(this.currentGateIdx + 1) % list.length];
    return [
      { x: pos.x, z: pos.z },
      { x: next.pos.x, z: next.pos.z },
      { x: after.pos.x, z: after.pos.z }
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
        const count = (mesh as THREE.InstancedMesh).isInstancedMesh
          ? (mesh as THREE.InstancedMesh).count
          : 1;
        const single = geo.index ? geo.index.count / 3 : (geo.getAttribute('position')?.count ?? 0) / 3;
        tris += Math.round(single * count);
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
    if (this.keyupHandler) {
      window.removeEventListener('keyup', this.keyupHandler);
      this.keyupHandler = null;
    }
    this.heldKeys.clear();

    // Crucial cleanup of Fighter HUD, Audio & PostFX
    this.ctx.ui.setFighterHUDVisible(false);
    this.ctx.ui.setWorldToolbarHTML('');
    this.ctx.audio.updateVehicleEngine(false, 0, 0, 0);
    this.ctx.audio.updateSpaceThruster(false, 0, false);
    this.ctx.audio.updateWindRush(0);
    this.ctx.postFX.setSpeedFactor(0);
    this.ctx.camera.up.set(0, 1, 0);
    this.ctx.localAvatar.root.visible = true;

    this.disposeObject(this.worldGroup);
    this.ctx.scene.remove(this.worldGroup);

    this.windController = null;
    this.boulders.length = 0;
    this.jetCheckpoints.length = 0;
    this.truckCheckpoints.length = 0;
    this.mudParticles.length = 0;
    this.sonicBoomWaves.length = 0;
    this.wheelGroups.length = 0;
    this.strutMeshes.length = 0;
    this.linkMeshes.length = 0;
  }
}
