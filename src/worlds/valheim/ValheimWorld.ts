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
  type SurfaceMaterialType,
  type WorldInterface
} from '../../core/types';
import { ProceduralNoise, SeededRandom } from '../../core/math/Noise';
import { applyWindSwayToMaterial } from '../../core/graphics/Shaders';

type BiomeType = 'forest' | 'alpine' | 'beach' | 'river' | 'crystal';

type BuildPieceKind = 'foundation' | 'wall' | 'roof' | 'bridge' | 'torch' | 'campfire';

interface TerrainSample {
  height: number;
  biome: BiomeType;
  slope: number;
  r: number;
  g: number;
  b: number;
  riverMask: number;
  crystalMask: number;
}

interface TreeRecord {
  id: string;
  chunkKey: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotY: number;
  hits: number;
  shakeTimer: number;
  slotIndex: number;
}

interface RockRecord {
  id: string;
  chunkKey: string;
  kind: 'boulder' | 'iron' | 'crystal';
  x: number;
  y: number;
  z: number;
  scale: number;
  rotY: number;
  hits: number;
  shakeTimer: number;
  slotIndex: number;
}

interface StaticPropInstance {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotY: number;
  tiltX: number;
  tiltZ: number;
}

interface TerrainChunkData {
  key: string;
  cx: number;
  cz: number;
  geometry: THREE.BufferGeometry;
  trees: TreeRecord[];
  rocks: RockRecord[];
  ferns: StaticPropInstance[];
  monoliths: StaticPropInstance[];
  canopySpots: Array<{ x: number; y: number; z: number }>;
}

interface FallingTreeEntity {
  group: THREE.Group;
  origin: THREE.Vector3;
  fallAxis: THREE.Vector3;
  fallDir: THREE.Vector3;
  height: number;
  tiltAngle: number;
  angVel: number;
  maxTilt: number;
  bounced: boolean;
  settleTimer: number;
}

interface LootDrop {
  id: string;
  kind: 'wood' | 'stone' | 'iron';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotY: number;
  age: number;
}

interface ParticleSpark {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  scale: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface PlacedBuildPiece {
  id: string;
  kind: BuildPieceKind;
  x: number;
  y: number;
  z: number;
  rotY: number;
}

interface NightWraith {
  id: string;
  group: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  hitFlash: number;
  animPhase: number;
  isElder: boolean;
}

const STORAGE_KEY_VALHEIM = 'omniverse_valheim_builds_v1';
const WATER_LEVEL = 0.0;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const BUILD_CATALOG: ReadonlyArray<{
  kind: BuildPieceKind;
  label: string;
  shortLabel: string;
  woodCost: number;
  stoneCost: number;
}> = [
  { kind: 'foundation', label: 'Fondation Bois 4×4m', shortLabel: 'Fondation', woodCost: 2, stoneCost: 0 },
  { kind: 'wall', label: 'Mur Rondins Nordique', shortLabel: 'Mur Bois', woodCost: 2, stoneCost: 0 },
  { kind: 'roof', label: 'Toit Chaume & Poutres', shortLabel: 'Toit 35°', woodCost: 2, stoneCost: 0 },
  { kind: 'bridge', label: 'Pont de Rivière 4×4m', shortLabel: 'Pont', woodCost: 3, stoneCost: 0 },
  { kind: 'torch', label: 'Torche Dynamique', shortLabel: 'Torche', woodCost: 1, stoneCost: 0 },
  { kind: 'campfire', label: 'Feu de Camp & Aura', shortLabel: 'Feu Camp', woodCost: 2, stoneCost: 2 }
];

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

export class ValheimWorld implements WorldInterface {
  public readonly id = 'valheim' as const;
  public readonly metadata = WORLD_CATALOG[2];

  private ctx!: EngineContext;
  private worldRoot = new THREE.Group();
  private readonly noise = new ProceduralNoise(90421);
  private readonly detailNoise = new ProceduralNoise(33107);

  private readonly chunkSize = 48;
  private readonly chunkSegments = 24;
  private chunks = new Map<string, TerrainChunkData>();
  private pendingChunkCoords: Array<{ cx: number; cz: number; distSq: number }> = [];
  private lastStreamCenterCx = Number.NaN;
  private lastStreamCenterCz = Number.NaN;
  private quadrantsDirty = false;
  private propsDirty = false;

  private quadrantMeshes: Array<THREE.Mesh | null> = [null, null, null, null];
  private terrainMat!: THREE.MeshStandardMaterial;
  private waterMesh!: THREE.Mesh;
  private waterMat!: THREE.ShaderMaterial;
  private godRayInst!: THREE.InstancedMesh;
  private godRayMat!: THREE.ShaderMaterial;

  // Global Pooled Prop InstancedMeshes
  private pineTrunkInst!: THREE.InstancedMesh;
  private pineFoliageInst!: THREE.InstancedMesh;
  private fernInst!: THREE.InstancedMesh;
  private boulderInst!: THREE.InstancedMesh;
  private ironOreInst!: THREE.InstancedMesh;
  private crystalInst!: THREE.InstancedMesh;
  private monolithInst!: THREE.InstancedMesh;

  private activeTrees: TreeRecord[] = [];
  private activeBoulders: RockRecord[] = [];
  private activeIrons: RockRecord[] = [];
  private activeCrystals: RockRecord[] = [];
  private choppedTreeIds = new Set<string>();
  private minedRockIds = new Set<string>();

  // Falling Trees, Collectible Loot & Particle Pool
  private fallingTrees: FallingTreeEntity[] = [];
  private pineTrunkGeo!: THREE.BufferGeometry;
  private pineFoliageGeo!: THREE.BufferGeometry;
  private barkMat!: THREE.MeshStandardMaterial;
  private pineStaticFoliageMat!: THREE.MeshStandardMaterial;

  private lootDrops: LootDrop[] = [];
  private woodDropInst!: THREE.InstancedMesh;
  private stoneDropInst!: THREE.InstancedMesh;
  private ironDropInst!: THREE.InstancedMesh;

  private particles: ParticleSpark[] = [];
  private particleInst!: THREE.InstancedMesh;
  private fireParticles: ParticleSpark[] = [];
  private fireParticleInst!: THREE.InstancedMesh;

  // Modular Construction System
  private buildMode = false;
  private bulldozeMode = false;
  private selectedBuildKind: BuildPieceKind = 'foundation';
  private buildRotSteps = 0; // multiples of 45 deg or 90 deg
  private placedPieces = new Map<string, PlacedBuildPiece>();
  private buildInstMeshes!: Record<BuildPieceKind, THREE.InstancedMesh>;
  private torchFlameInst!: THREE.InstancedMesh;
  private ghostGroup = new THREE.Group();
  private ghostMeshes!: Record<BuildPieceKind, THREE.Mesh>;
  private ghostMat!: THREE.ShaderMaterial;
  private ghostTargetPos = new THREE.Vector3();
  private ghostTargetRotY = 0;
  private ghostValid = true;
  private hoveredRemoveId: string | null = null;
  private warmLights: THREE.PointLight[] = [];
  private crystalLight!: THREE.PointLight;

  // Night Wraiths / Runic Greydwarfs
  private wraiths: NightWraith[] = [];
  private wraithTorsoGeo!: THREE.BufferGeometry;
  private wraithLimbGeo!: THREE.BufferGeometry;
  private wraithBodyMat!: THREE.MeshStandardMaterial;
  private wraithEyeMat!: THREE.MeshStandardMaterial;
  private wraithSpawnTimer = 0;
  private wasNight = false;

  // Player Survival & Inventory State
  private playerPos = new THREE.Vector3(0, 6, 8);
  private playerVel = new THREE.Vector3();
  private playerYaw = 0;
  private onGround = true;
  private health = 100;
  private maxHealth = 100;
  private stamina = 100;
  private maxStamina = 100;
  private nearWarmth = false;
  private currentBiome: BiomeType = 'forest';
  private woodCount = 60;
  private stoneCount = 30;
  private ironCount = 12;
  private wraithKills = 0;

  private attackAnimTimer = 0;
  private footstepTimer = 0;
  private timeOfDay = 9.35; // Crisp morning with volumetric forest sunbeams
  private telemetryTimer = 0;
  private netSyncTimer = 0;
  private smoothedFps = 60;
  private lastDrawCalls = 36;
  private lastTriangles = 64000;

  private disposables: Array<{ dispose(): void }> = [];
  private windHandles: Array<{ update(time: number): void }> = [];
  private unsubQuality: (() => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private prevSceneAfterRender: THREE.Object3D['onAfterRender'] | null = null;

  private readonly dummy = new THREE.Object3D();
  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpVecB = new THREE.Vector3();
  private readonly tmpVecC = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();

  public async load(ctx: EngineContext): Promise<void> {
    this.ctx = ctx;
    this.worldRoot.name = 'ValheimWildlandsRoot';
    this.ctx.scene.add(this.worldRoot);

    this.prevSceneAfterRender = this.ctx.scene.onAfterRender;
    this.ctx.scene.onAfterRender = (renderer) => {
      this.lastDrawCalls = renderer.info.render.calls;
      this.lastTriangles = renderer.info.render.triangles;
    };

    // Configure Atmosphere & Avatar
    this.ctx.sky.setSpaceBlend(0);
    this.ctx.sky.setWeather('clear', 0.12);
    this.ctx.sky.setTimeOfDay(this.timeOfDay);
    this.ctx.input.setContextMode('ON_FOOT');
    this.ctx.localAvatar.setEquippedTool('axe');
    this.ctx.localAvatar.setParagliderVisible(false);
    this.ctx.localAvatar.setJetpackFlame(0);

    // Build PBR & Custom Shader Materials + Shared Geometries
    this.initMaterialsAndProps();
    this.initWaterAndGodRays();
    this.initModularBuildSystem();
    this.initWraithAssets();

    // Load persisted Viking builds (or create starter Hearth Campfire & Torches)
    this.loadPersistedBuilds();

    // Position player in scenic Boreal Forest glade near river, beach & crystal sanctuary
    const spawnTerrain = this.evaluateTerrain(0, 10);
    this.playerPos.set(0, Math.max(WATER_LEVEL + 0.8, spawnTerrain.height), 10);
    this.ctx.localAvatar.root.position.copy(this.playerPos);

    // Pre-generate initial surrounding chunks synchronously so spawn has zero pop-in
    this.updateChunkStreaming(true);
    this.rebuildTerrainQuadrants();
    this.rebuildPropInstances();
    this.rebuildBuildInstances();

    // Setup Camera cleanly behind player
    const pivot = this.tmpVecA.set(this.playerPos.x, this.playerPos.y + 1.6, this.playerPos.z);
    const camPos = this.ctx.input.computeSafeCameraPosition(pivot, 6.2, []);
    this.ctx.camera.position.copy(camPos);
    this.ctx.camera.lookAt(pivot);

    // Setup Radial Menu, Toolbar & Keyboard Shortcuts
    this.setupUIAndControls();

    this.unsubQuality = this.ctx.quality.onChange(() => {
      this.lastStreamCenterCx = Number.NaN;
      this.updateChunkStreaming(false);
    });
  }

  private trackDisposable<T extends { dispose(): void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private initMaterialsAndProps(): void {
    // 1. Multi-biome Vertex-Colored PBR Terrain Material
    this.terrainMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('rock', {
        repeatX: 16,
        repeatY: 16,
        tint: 0xdadada,
        roughness: 0.88,
        metalness: 0.05,
        normalScale: 0.85
      })
    );
    this.terrainMat.vertexColors = true;

    // 2. Boreal Pine Trunk & Swaying Foliage
    this.barkMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('bark', {
        repeatX: 2,
        repeatY: 6,
        tint: 0x9b7453,
        roughness: 0.92,
        metalness: 0.02
      })
    );
    this.barkMat.vertexColors = true;

    const pineWindMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('foliage', {
        repeatX: 3,
        repeatY: 3,
        tint: 0x4ea35c,
        roughness: 0.82,
        metalness: 0.02
      })
    );
    pineWindMat.vertexColors = true;
    this.windHandles.push(applyWindSwayToMaterial(pineWindMat, 0.36, 12.0));

    // Separate non-wind material for physically tipping/falling trees
    this.pineStaticFoliageMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('foliage', {
        repeatX: 3,
        repeatY: 3,
        tint: 0x4ea35c,
        roughness: 0.82,
        metalness: 0.02
      })
    );
    this.pineStaticFoliageMat.vertexColors = true;

    // Sculpted Pine Trunk (tapered trunk + root flare)
    const trunkMain = new THREE.CylinderGeometry(0.16, 0.36, 8.8, 7);
    trunkMain.translate(0, 4.4, 0);
    const trunkBase = new THREE.CylinderGeometry(0.34, 0.52, 1.1, 7);
    trunkBase.translate(0, 0.55, 0);
    this.pineTrunkGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(trunkMain, 0.92, 0.78, 0.64),
          preparePartGeometry(trunkBase, 0.72, 0.6, 0.48)
        ],
        false
      )
    );

    // Sculpted 4-tier Nordic Pine Canopy
    const c1 = new THREE.ConeGeometry(2.45, 3.8, 8);
    c1.translate(0, 4.6, 0);
    const c2 = new THREE.ConeGeometry(2.0, 3.5, 8);
    c2.translate(0, 6.7, 0);
    const c3 = new THREE.ConeGeometry(1.45, 3.1, 8);
    c3.translate(0, 8.6, 0);
    const c4 = new THREE.ConeGeometry(0.85, 2.4, 7);
    c4.translate(0, 10.3, 0);
    this.pineFoliageGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(c1, 0.76, 0.92, 0.74),
          preparePartGeometry(c2, 0.86, 1.0, 0.82),
          preparePartGeometry(c3, 0.95, 1.08, 0.88),
          preparePartGeometry(c4, 1.05, 1.16, 0.95)
        ],
        false
      )
    );

    const maxTrees = 1800;
    this.pineTrunkInst = new THREE.InstancedMesh(this.pineTrunkGeo, this.barkMat, maxTrees);
    this.pineTrunkInst.castShadow = true;
    this.pineTrunkInst.receiveShadow = true;
    this.pineTrunkInst.count = 0;
    this.pineTrunkInst.frustumCulled = false;
    this.worldRoot.add(this.pineTrunkInst);

    this.pineFoliageInst = new THREE.InstancedMesh(this.pineFoliageGeo, pineWindMat, maxTrees);
    this.pineFoliageInst.castShadow = true;
    this.pineFoliageInst.receiveShadow = true;
    this.pineFoliageInst.count = 0;
    this.pineFoliageInst.frustumCulled = false;
    this.worldRoot.add(this.pineFoliageInst);

    // 3. Swaying Forest Ferns
    const fernParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const frond = new THREE.ConeGeometry(0.24, 1.15, 4);
      frond.scale(1.0, 1.0, 0.18);
      frond.translate(0, 0.55, 0);
      frond.rotateX(0.68);
      frond.rotateY(angle);
      fernParts.push(preparePartGeometry(frond, 0.75 + (i % 2) * 0.18, 1.12, 0.62));
    }
    const fernGeo = this.trackDisposable(mergeGeometries(fernParts, false));
    const fernMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('foliage', {
        repeatX: 2,
        repeatY: 2,
        tint: 0x62c45e,
        roughness: 0.75,
        metalness: 0.02
      })
    );
    fernMat.vertexColors = true;
    this.windHandles.push(applyWindSwayToMaterial(fernMat, 0.28, 1.4));

    this.fernInst = new THREE.InstancedMesh(fernGeo, fernMat, 2200);
    this.fernInst.receiveShadow = true;
    this.fernInst.count = 0;
    this.fernInst.frustumCulled = false;
    this.worldRoot.add(this.fernInst);

    // 4. Granite Boulders & Iron Ore Veins & Cavern Crystals & Runic Monoliths
    const rawRockA = new THREE.DodecahedronGeometry(1.15, 1);
    rawRockA.scale(1.25, 0.85, 1.05);
    rawRockA.translate(0, 0.55, 0);
    const rawRockB = new THREE.DodecahedronGeometry(0.72, 0);
    rawRockB.translate(0.65, 0.35, 0.35);
    const boulderGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(rawRockA, 0.86, 0.88, 0.92),
          preparePartGeometry(rawRockB, 0.72, 0.76, 0.78)
        ],
        false
      )
    );
    const boulderMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('rock', {
        repeatX: 2,
        repeatY: 2,
        roughness: 0.86,
        metalness: 0.06
      })
    );
    boulderMat.vertexColors = true;

    this.boulderInst = new THREE.InstancedMesh(boulderGeo, boulderMat, 900);
    this.boulderInst.castShadow = true;
    this.boulderInst.receiveShadow = true;
    this.boulderInst.count = 0;
    this.boulderInst.frustumCulled = false;
    this.worldRoot.add(this.boulderInst);

    // Iron Ore Vein (dark rock studded with metallic rust-iron nodules)
    const oreBase = new THREE.DodecahedronGeometry(1.05, 0);
    oreBase.scale(1.15, 0.9, 1.1);
    oreBase.translate(0, 0.55, 0);
    const oreVein1 = new THREE.OctahedronGeometry(0.55, 0);
    oreVein1.translate(0.45, 0.78, 0.32);
    const oreVein2 = new THREE.OctahedronGeometry(0.48, 0);
    oreVein2.translate(-0.42, 0.65, -0.35);
    const ironGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(oreBase, 0.45, 0.42, 0.44),
          preparePartGeometry(oreVein1, 1.35, 0.74, 0.42),
          preparePartGeometry(oreVein2, 1.25, 0.68, 0.38)
        ],
        false
      )
    );
    const ironMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('rust', {
        repeatX: 2,
        repeatY: 2,
        roughness: 0.48,
        metalness: 0.78
      })
    );
    ironMat.vertexColors = true;

    this.ironOreInst = new THREE.InstancedMesh(ironGeo, ironMat, 450);
    this.ironOreInst.castShadow = true;
    this.ironOreInst.receiveShadow = true;
    this.ironOreInst.count = 0;
    this.ironOreInst.frustumCulled = false;
    this.worldRoot.add(this.ironOreInst);

    // Glowing Crystal Cavern Spires (Cluster of 3 hexagonal prisms + points)
    const crys1 = new THREE.CylinderGeometry(0.12, 0.42, 3.4, 6);
    crys1.translate(0, 1.7, 0);
    const crys2 = new THREE.CylinderGeometry(0.08, 0.3, 2.3, 6);
    crys2.translate(0, 1.15, 0);
    crys2.rotateZ(0.38);
    crys2.translate(0.35, 0, 0.15);
    const crys3 = new THREE.CylinderGeometry(0.08, 0.28, 2.0, 6);
    crys3.translate(0, 1.0, 0);
    crys3.rotateZ(-0.34);
    crys3.rotateY(1.1);
    crys3.translate(-0.3, 0, -0.2);
    const crystalGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(crys1, 0.42, 0.95, 1.2),
          preparePartGeometry(crys2, 0.68, 0.55, 1.25),
          preparePartGeometry(crys3, 0.38, 1.05, 1.15)
        ],
        false
      )
    );
    const crystalMat = this.trackDisposable(
      new THREE.MeshPhysicalMaterial({
        color: 0x6ef7ff,
        emissive: 0x1aa8d9,
        emissiveIntensity: 1.65,
        roughness: 0.14,
        metalness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        vertexColors: true
      })
    );
    this.crystalInst = new THREE.InstancedMesh(crystalGeo, crystalMat, 360);
    this.crystalInst.castShadow = true;
    this.crystalInst.count = 0;
    this.crystalInst.frustumCulled = false;
    this.worldRoot.add(this.crystalInst);

    // Towering Runic Monoliths (Obsidian stele + glowing Nordic rune band)
    const monoBody = new THREE.BoxGeometry(1.35, 6.2, 0.72);
    monoBody.translate(0, 3.1, 0);
    const monoTip = new THREE.ConeGeometry(0.95, 1.5, 4);
    monoTip.rotateY(Math.PI * 0.25);
    monoTip.scale(1.0, 1.0, 0.54);
    monoTip.translate(0, 6.95, 0);
    const monoRune = new THREE.BoxGeometry(0.32, 4.4, 0.78);
    monoRune.translate(0, 3.2, 0);
    const monolithGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(monoBody, 0.24, 0.26, 0.34),
          preparePartGeometry(monoTip, 0.28, 0.3, 0.38),
          preparePartGeometry(monoRune, 0.35, 1.65, 1.85)
        ],
        false
      )
    );
    const monolithMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x0b3948,
        emissiveIntensity: 0.9,
        roughness: 0.55,
        metalness: 0.35,
        vertexColors: true
      })
    );
    this.monolithInst = new THREE.InstancedMesh(monolithGeo, monolithMat, 160);
    this.monolithInst.castShadow = true;
    this.monolithInst.receiveShadow = true;
    this.monolithInst.count = 0;
    this.monolithInst.frustumCulled = false;
    this.worldRoot.add(this.monolithInst);

    // Ambient point light over the Elder Crystal Sanctuary near (-52, y, -18)
    this.crystalLight = new THREE.PointLight(0x3ce8ff, 4.5, 36, 1.6);
    const crysSpot = this.evaluateTerrain(-52, -18);
    this.crystalLight.position.set(-52, crysSpot.height + 4.5, -18);
    this.worldRoot.add(this.crystalLight);

    // 5. Collectible Wood / Stone / Iron Pickups & Woodchip/Ember Particle InstancedMeshes
    const woodLogGeo = new THREE.CylinderGeometry(0.18, 0.2, 1.35, 7);
    woodLogGeo.rotateZ(Math.PI * 0.5);
    this.trackDisposable(woodLogGeo);
    const woodLogMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('bark', {
        tint: 0xc9935b,
        roughness: 0.78
      })
    );
    this.woodDropInst = new THREE.InstancedMesh(woodLogGeo, woodLogMat, 96);
    this.woodDropInst.castShadow = true;
    this.woodDropInst.count = 0;
    this.woodDropInst.frustumCulled = false;
    this.worldRoot.add(this.woodDropInst);

    const stoneChunkGeo = this.trackDisposable(new THREE.DodecahedronGeometry(0.28, 0));
    this.stoneDropInst = new THREE.InstancedMesh(stoneChunkGeo, boulderMat, 96);
    this.stoneDropInst.castShadow = true;
    this.stoneDropInst.count = 0;
    this.stoneDropInst.frustumCulled = false;
    this.worldRoot.add(this.stoneDropInst);

    const ironChunkGeo = this.trackDisposable(new THREE.OctahedronGeometry(0.28, 0));
    const ironDropMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xd88c56,
        emissive: 0x3b1908,
        roughness: 0.32,
        metalness: 0.88
      })
    );
    this.ironDropInst = new THREE.InstancedMesh(ironChunkGeo, ironDropMat, 96);
    this.ironDropInst.castShadow = true;
    this.ironDropInst.count = 0;
    this.ironDropInst.frustumCulled = false;
    this.worldRoot.add(this.ironDropInst);

    // Wood chips / rock sparks / wraith sap particles
    const chipGeo = this.trackDisposable(new THREE.BoxGeometry(0.16, 0.07, 0.24));
    const chipMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65,
        metalness: 0.1
      })
    );
    this.particleInst = new THREE.InstancedMesh(chipGeo, chipMat, 160);
    this.particleInst.count = 0;
    this.particleInst.frustumCulled = false;
    this.worldRoot.add(this.particleInst);
    for (let i = 0; i < 160; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        scale: 1,
        life: 0,
        maxLife: 1,
        color: new THREE.Color(0xd8a368)
      });
    }

    // Crackling Campfire Flames & Embers
    const emberGeo = this.trackDisposable(new THREE.OctahedronGeometry(0.18, 0));
    const emberMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffb347,
        emissive: 0xff6a14,
        emissiveIntensity: 3.0,
        roughness: 0.3,
        metalness: 0.0
      })
    );
    this.fireParticleInst = new THREE.InstancedMesh(emberGeo, emberMat, 140);
    this.fireParticleInst.count = 0;
    this.fireParticleInst.frustumCulled = false;
    this.worldRoot.add(this.fireParticleInst);
    for (let i = 0; i < 140; i++) {
      this.fireParticles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        scale: 1,
        life: 0,
        maxLife: 1,
        color: new THREE.Color(0xff7722)
      });
    }
  }

  private initWaterAndGodRays(): void {
    // 1. Reflective Winding Rivers & Nordic Fjord Water Shader
    const waterGeo = this.trackDisposable(new THREE.PlaneGeometry(1800, 1800, 96, 96));
    waterGeo.rotateX(-Math.PI * 0.5);

    this.waterMat = this.trackDisposable(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3) },
          uCameraPos: { value: new THREE.Vector3() },
          uDayFactor: { value: 1.0 }
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vWorldPos;
          varying vec2 vUvCoord;
          void main() {
            vUvCoord = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            float ripple = sin(wp.x * 0.65 + uTime * 1.9) * 0.035
                         + cos(wp.z * 0.55 - uTime * 1.5) * 0.035;
            wp.y += ripple;
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uSunDir;
          uniform vec3 uCameraPos;
          uniform float uDayFactor;
          varying vec3 vWorldPos;

          float waveNoise(vec2 p) {
            return sin(p.x * 1.7 + sin(p.y * 1.3 + uTime * 1.4)) * 0.5
                 + cos(p.y * 2.1 - cos(p.x * 1.6 - uTime * 1.1)) * 0.5;
          }

          void main() {
            vec2 p = vWorldPos.xz * 0.42;
            float e = 0.08;
            float h0 = waveNoise(p);
            float hx = waveNoise(p + vec2(e, 0.0));
            float hz = waveNoise(p + vec2(0.0, e));
            vec3 n = normalize(vec3((h0 - hx) * 0.36, 1.0, (h0 - hz) * 0.36));

            vec3 viewDir = normalize(uCameraPos - vWorldPos);
            float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 4.0);

            vec3 deepCol = mix(vec3(0.02, 0.06, 0.11), vec3(0.04, 0.20, 0.28), uDayFactor);
            vec3 skyRefl = mix(vec3(0.06, 0.12, 0.24), vec3(0.46, 0.74, 0.94), uDayFactor);
            vec3 col = mix(deepCol, skyRefl, clamp(fresnel * 0.88 + 0.12, 0.0, 1.0));

            vec3 sunDir = normalize(uSunDir);
            vec3 halfVec = normalize(sunDir + viewDir);
            float spec = pow(max(dot(n, halfVec), 0.0), 140.0) * max(sunDir.y + 0.1, 0.0);
            vec3 sunTint = mix(vec3(0.45, 0.62, 0.95), vec3(1.0, 0.92, 0.74), uDayFactor);
            col += sunTint * spec * 1.9;

            gl_FragColor = vec4(col, 0.88);
          }
        `,
        transparent: true,
        depthWrite: false
      })
    );

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.y = WATER_LEVEL;
    this.worldRoot.add(this.waterMesh);

    // 2. Atmospheric Volumetric God-Ray Light Shafts (Custom Shader Cones)
    const shaftGeo = this.trackDisposable(new THREE.CylinderGeometry(1.3, 5.4, 38, 16, 1, true));
    this.godRayMat = this.trackDisposable(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0xffe6a3) },
          uIntensity: { value: 0.24 }
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vNormalView;
          varying vec3 vViewPos;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vec4 mvPos = viewMatrix * worldPos;
            vViewPos = -mvPos.xyz;
            mat3 instMat3 = mat3(modelMatrix * instanceMatrix);
            vNormalView = normalize(normalMatrix * (instMat3 * normal));
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec2 vUv;
          varying vec3 vNormalView;
          varying vec3 vViewPos;
          varying vec3 vWorldPos;

          void main() {
            vec3 viewDir = normalize(vViewPos);
            float edgeSoftness = pow(clamp(abs(dot(normalize(vNormalView), viewDir)), 0.0, 1.0), 1.85);
            float vertFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
            float dust = 0.78 + 0.22 * sin(vWorldPos.x * 0.35 + uTime * 0.7 + sin(vWorldPos.y * 0.25 - uTime * 0.5));
            float distFade = smoothstep(160.0, 22.0, length(vViewPos)) * smoothstep(3.0, 12.0, length(vViewPos));
            float alpha = edgeSoftness * vertFade * dust * distFade * uIntensity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
    );

    this.godRayInst = new THREE.InstancedMesh(shaftGeo, this.godRayMat, 28);
    this.godRayInst.frustumCulled = false;
    this.worldRoot.add(this.godRayInst);
  }

  private initModularBuildSystem(): void {
    const timberMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('ship_wood', {
        repeatX: 2,
        repeatY: 2,
        tint: 0xc79562,
        roughness: 0.78,
        metalness: 0.04
      })
    );
    timberMat.vertexColors = true;

    const logMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('bark', {
        repeatX: 2,
        repeatY: 2,
        tint: 0xb68454,
        roughness: 0.85,
        metalness: 0.03
      })
    );
    logMat.vertexColors = true;

    const hearthMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('rock', {
        repeatX: 2,
        repeatY: 2,
        roughness: 0.82,
        metalness: 0.08
      })
    );
    hearthMat.vertexColors = true;

    // 1. Wood Foundation (4x4m deck + 4 pilings extending 3.2m downward for sloped hills)
    const fDeck = new THREE.BoxGeometry(4.0, 0.28, 4.0);
    fDeck.translate(0, -0.14, 0);
    const fParts: THREE.BufferGeometry[] = [preparePartGeometry(fDeck, 1.0, 0.92, 0.8)];
    const postOffsets = [
      [-1.82, -1.82],
      [1.82, -1.82],
      [-1.82, 1.82],
      [1.82, 1.82]
    ];
    for (const [px, pz] of postOffsets) {
      const post = new THREE.CylinderGeometry(0.16, 0.18, 3.4, 6);
      post.translate(px, -1.7, pz);
      fParts.push(preparePartGeometry(post, 0.76, 0.66, 0.54));
    }
    const foundationGeo = this.trackDisposable(mergeGeometries(fParts, false));

    // 2. Log Wall (4m wide x 3.0m tall stacked horizontal logs + end posts)
    const wParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const log = new THREE.CylinderGeometry(0.22, 0.22, 4.08, 8);
      log.rotateZ(Math.PI * 0.5);
      log.translate(0, 0.22 + i * 0.41, 0);
      const shade = 0.88 + (i % 2) * 0.12;
      wParts.push(preparePartGeometry(log, shade, shade * 0.92, shade * 0.82));
    }
    for (const sx of [-1.92, 1.92]) {
      const vPost = new THREE.CylinderGeometry(0.24, 0.25, 3.05, 8);
      vPost.translate(sx, 1.52, 0);
      wParts.push(preparePartGeometry(vPost, 0.72, 0.62, 0.5));
    }
    const wallGeo = this.trackDisposable(mergeGeometries(wParts, false));

    // 3. Pitched Thatch/Timber Roof (4x4m gabled Nordic roof with dragon ridge beam)
    const rLeft = new THREE.BoxGeometry(2.55, 0.2, 4.2);
    rLeft.rotateZ(0.58);
    rLeft.translate(-1.02, 0.72, 0);
    const rRight = new THREE.BoxGeometry(2.55, 0.2, 4.2);
    rRight.rotateZ(-0.58);
    rRight.translate(1.02, 0.72, 0);
    const rRidge = new THREE.CylinderGeometry(0.16, 0.16, 4.45, 7);
    rRidge.rotateX(Math.PI * 0.5);
    rRidge.translate(0, 1.44, 0);
    const rHornF = new THREE.ConeGeometry(0.16, 0.75, 5);
    rHornF.rotateX(-0.55);
    rHornF.translate(0, 1.72, 2.22);
    const rHornB = new THREE.ConeGeometry(0.16, 0.75, 5);
    rHornB.rotateX(0.55);
    rHornB.translate(0, 1.72, -2.22);
    const roofGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(rLeft, 1.12, 0.94, 0.58),
          preparePartGeometry(rRight, 1.08, 0.9, 0.55),
          preparePartGeometry(rRidge, 0.62, 0.48, 0.36),
          preparePartGeometry(rHornF, 0.55, 0.42, 0.3),
          preparePartGeometry(rHornB, 0.55, 0.42, 0.3)
        ],
        false
      )
    );

    // 4. Wooden Bridge (4x4m plank span + twin railings & support beams)
    const bParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      const plank = new THREE.BoxGeometry(3.9, 0.18, 0.44);
      plank.translate(0, -0.09, -1.75 + i * 0.5);
      bParts.push(preparePartGeometry(plank, 0.96 + (i % 2) * 0.08, 0.86, 0.72));
    }
    for (const sx of [-1.85, 1.85]) {
      const railTop = new THREE.BoxGeometry(0.14, 0.12, 4.05);
      railTop.translate(sx, 0.98, 0);
      bParts.push(preparePartGeometry(railTop, 0.78, 0.66, 0.52));
      for (const sz of [-1.85, 0, 1.85]) {
        const railPost = new THREE.BoxGeometry(0.16, 1.25, 0.16);
        railPost.translate(sx, 0.42, sz);
        bParts.push(preparePartGeometry(railPost, 0.68, 0.56, 0.44));
      }
    }
    const bridgeGeo = this.trackDisposable(mergeGeometries(bParts, false));

    // 5. Standing Flickering Torch (timber stake + iron basket)
    const tStake = new THREE.CylinderGeometry(0.07, 0.09, 1.75, 7);
    tStake.translate(0, 0.87, 0);
    const tCup = new THREE.CylinderGeometry(0.18, 0.09, 0.28, 7);
    tCup.translate(0, 1.78, 0);
    const torchGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(tStake, 0.75, 0.58, 0.42),
          preparePartGeometry(tCup, 0.32, 0.32, 0.36)
        ],
        false
      )
    );

    // 6. Hearth Campfire (ring of 10 river stones + teepee of logs + glowing ember bed)
    const cParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const stone = new THREE.DodecahedronGeometry(0.24, 0);
      stone.scale(1.2, 0.75, 1.0);
      stone.translate(Math.cos(a) * 0.92, 0.14, Math.sin(a) * 0.92);
      cParts.push(preparePartGeometry(stone, 0.62, 0.64, 0.68));
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const fLog = new THREE.CylinderGeometry(0.08, 0.11, 1.15, 6);
      fLog.translate(0, 0.48, 0);
      fLog.rotateZ(0.55);
      fLog.rotateY(a);
      cParts.push(preparePartGeometry(fLog, 0.52, 0.36, 0.24));
    }
    const emberCore = new THREE.CylinderGeometry(0.58, 0.72, 0.16, 8);
    emberCore.translate(0, 0.09, 0);
    cParts.push(preparePartGeometry(emberCore, 2.2, 0.72, 0.18));
    const campfireGeo = this.trackDisposable(mergeGeometries(cParts, false));

    const maxPieces = 512;
    const mkInst = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const inst = new THREE.InstancedMesh(geo, mat, maxPieces);
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.count = 0;
      inst.frustumCulled = false;
      this.worldRoot.add(inst);
      return inst;
    };

    this.buildInstMeshes = {
      foundation: mkInst(foundationGeo, timberMat),
      wall: mkInst(wallGeo, logMat),
      roof: mkInst(roofGeo, timberMat),
      bridge: mkInst(bridgeGeo, timberMat),
      torch: mkInst(torchGeo, logMat),
      campfire: mkInst(campfireGeo, hearthMat)
    };

    // Emissive Animated Flames for Torches & Campfires
    const flameGeo = this.trackDisposable(new THREE.ConeGeometry(0.22, 0.62, 7));
    flameGeo.translate(0, 0.28, 0);
    const flameMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffd269,
        emissive: 0xff6b12,
        emissiveIntensity: 3.4,
        roughness: 0.25,
        metalness: 0.0
      })
    );
    this.torchFlameInst = new THREE.InstancedMesh(flameGeo, flameMat, maxPieces);
    this.torchFlameInst.count = 0;
    this.torchFlameInst.frustumCulled = false;
    this.worldRoot.add(this.torchFlameInst);

    // Dynamic Warm PointLights Pool (8 lights dynamically assigned to nearest torches/campfires)
    for (let i = 0; i < 8; i++) {
      const pl = new THREE.PointLight(0xff8c32, 0, 18, 1.7);
      pl.visible = false;
      this.worldRoot.add(pl);
      this.warmLights.push(pl);
    }

    // Translucent Holographic Ghost Placement Preview
    this.ghostMat = this.trackDisposable(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x66f2a5) }
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorldPos;
          varying vec3 vNormalView;
          varying vec3 vViewPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            vec4 mv = viewMatrix * wp;
            vViewPos = -mv.xyz;
            vNormalView = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColor;
          varying vec3 vWorldPos;
          varying vec3 vNormalView;
          varying vec3 vViewPos;
          void main() {
            float rim = 1.0 - abs(dot(normalize(vNormalView), normalize(vViewPos)));
            float scan = 0.72 + 0.28 * sin(vWorldPos.y * 16.0 - uTime * 7.0);
            float alpha = clamp(0.24 + pow(rim, 1.6) * 0.58, 0.2, 0.85) * scan;
            gl_FragColor = vec4(uColor * 1.25, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );

    this.ghostMeshes = {
      foundation: new THREE.Mesh(foundationGeo, this.ghostMat),
      wall: new THREE.Mesh(wallGeo, this.ghostMat),
      roof: new THREE.Mesh(roofGeo, this.ghostMat),
      bridge: new THREE.Mesh(bridgeGeo, this.ghostMat),
      torch: new THREE.Mesh(torchGeo, this.ghostMat),
      campfire: new THREE.Mesh(campfireGeo, this.ghostMat)
    };
    for (const k of Object.keys(this.ghostMeshes) as BuildPieceKind[]) {
      this.ghostMeshes[k].visible = false;
      this.ghostGroup.add(this.ghostMeshes[k]);
    }
    this.ghostGroup.visible = false;
    this.worldRoot.add(this.ghostGroup);
  }

  private initWraithAssets(): void {
    // Articulated Runic Greydwarf / Forest Wraith shared geometries & materials
    const torso = new THREE.CylinderGeometry(0.38, 0.28, 1.05, 7);
    torso.translate(0, 1.15, 0);
    const shoulders = new THREE.DodecahedronGeometry(0.48, 0);
    shoulders.scale(1.35, 0.55, 0.82);
    shoulders.translate(0, 1.56, 0);
    const head = new THREE.DodecahedronGeometry(0.3, 0);
    head.translate(0, 1.94, 0.08);
    const hornL = new THREE.ConeGeometry(0.08, 0.48, 5);
    hornL.rotateZ(0.45);
    hornL.translate(-0.26, 2.22, 0.06);
    const hornR = new THREE.ConeGeometry(0.08, 0.48, 5);
    hornR.rotateZ(-0.45);
    hornR.translate(0.26, 2.22, 0.06);

    this.wraithTorsoGeo = this.trackDisposable(
      mergeGeometries(
        [
          preparePartGeometry(torso, 0.34, 0.28, 0.22),
          preparePartGeometry(shoulders, 0.26, 0.48, 0.28),
          preparePartGeometry(head, 0.42, 0.36, 0.28),
          preparePartGeometry(hornL, 0.24, 0.2, 0.16),
          preparePartGeometry(hornR, 0.24, 0.2, 0.16)
        ],
        false
      )
    );

    const limb = new THREE.CylinderGeometry(0.1, 0.07, 0.78, 6);
    limb.translate(0, -0.36, 0);
    this.wraithLimbGeo = this.trackDisposable(preparePartGeometry(limb, 0.32, 0.26, 0.2));

    this.wraithBodyMat = this.trackDisposable(
      this.ctx.textures.createPBRMaterial('bark', {
        tint: 0x8f8a78,
        roughness: 0.88,
        metalness: 0.05
      })
    );
    this.wraithBodyMat.vertexColors = true;

    this.wraithEyeMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x7df9ff,
        emissive: 0x24e5ff,
        emissiveIntensity: 3.8,
        roughness: 0.2,
        metalness: 0.0
      })
    );
  }

  private loadPersistedBuilds(): void {
    this.placedPieces.clear();
    let loadedAny = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VALHEIM);
      if (raw) {
        const parsed = JSON.parse(raw) as PlacedBuildPiece[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const p of parsed) {
            if (p && p.id && p.kind) {
              this.placedPieces.set(p.id, p);
              loadedAny = true;
            }
          }
        }
      }
    } catch {
      // Ignore storage access errors in private browsing
    }

    if (!loadedAny) {
      // Place a welcoming Nordic Hearth Campfire + 2 Flickering Torches at the starter clearing
      const h0 = this.evaluateTerrain(5, 4).height;
      const h1 = this.evaluateTerrain(2.2, 2.5).height;
      const h2 = this.evaluateTerrain(7.8, 2.5).height;
      const starters: PlacedBuildPiece[] = [
        { id: 'starter_campfire', kind: 'campfire', x: 5, y: h0, z: 4, rotY: 0 },
        { id: 'starter_torch_1', kind: 'torch', x: 2.2, y: h1, z: 2.5, rotY: 0.4 },
        { id: 'starter_torch_2', kind: 'torch', x: 7.8, y: h2, z: 2.5, rotY: -0.4 }
      ];
      for (const s of starters) {
        this.placedPieces.set(s.id, s);
      }
      this.savePersistedBuilds();
    }
  }

  private savePersistedBuilds(): void {
    try {
      const arr = Array.from(this.placedPieces.values());
      localStorage.setItem(STORAGE_KEY_VALHEIM, JSON.stringify(arr));
    } catch {
      // Ignore storage quota errors
    }
  }

  private setupUIAndControls(): void {
    const radialItems: RadialWheelItem[] = [
      { id: 'tool_axe', label: 'Hache Nordique', icon: '🪓', category: 'tool' },
      { id: 'tool_hammer', label: 'Pioche / Marteau', icon: '⛏️', category: 'tool' },
      { id: 'tool_sword', label: 'Épée Viking', icon: '⚔️', category: 'weapon' },
      { id: 'toggle_build', label: 'Mode Construction', icon: '🏗️', category: 'tool' },
      { id: 'build_foundation', label: 'Fondation 4×4m', icon: '🪵', category: 'tool' },
      { id: 'build_wall', label: 'Mur de Rondins', icon: '🧱', category: 'tool' },
      { id: 'build_roof', label: 'Toit de Chaume', icon: '🏠', category: 'tool' },
      { id: 'build_campfire', label: 'Feu de Camp', icon: '🔥', category: 'tool' }
    ];

    this.ctx.ui.setRadialItems(radialItems, (item) => {
      this.ctx.audio.playUIClick();
      if (item.id === 'tool_axe') {
        this.buildMode = false;
        this.ctx.localAvatar.setEquippedTool('axe');
      } else if (item.id === 'tool_hammer') {
        this.buildMode = false;
        this.ctx.localAvatar.setEquippedTool('hammer');
      } else if (item.id === 'tool_sword') {
        this.buildMode = false;
        this.ctx.localAvatar.setEquippedTool('sword');
      } else if (item.id === 'toggle_build') {
        this.buildMode = !this.buildMode;
        if (this.buildMode) this.ctx.localAvatar.setEquippedTool('hammer');
      } else if (item.id.startsWith('build_')) {
        this.buildMode = true;
        this.bulldozeMode = false;
        this.selectedBuildKind = item.id.replace('build_', '') as BuildPieceKind;
        this.ctx.localAvatar.setEquippedTool('hammer');
      }
      this.refreshToolbar();
    });

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'KeyB') {
        this.buildMode = !this.buildMode;
        this.bulldozeMode = false;
        if (this.buildMode) {
          this.ctx.localAvatar.setEquippedTool('hammer');
        } else {
          this.ctx.localAvatar.setEquippedTool('axe');
        }
        this.ctx.audio.playUIClick();
        this.refreshToolbar();
      } else if (e.code === 'KeyR' && this.buildMode) {
        this.buildRotSteps = (this.buildRotSteps + 1) % 8;
        this.ctx.audio.playUIClick();
      } else if (e.code === 'KeyX' && this.buildMode) {
        this.bulldozeMode = !this.bulldozeMode;
        this.ctx.audio.playUIClick();
        this.refreshToolbar();
      } else if (e.code.startsWith('Digit')) {
        const num = Number(e.code.replace('Digit', ''));
        if (this.buildMode && num >= 1 && num <= BUILD_CATALOG.length) {
          this.selectedBuildKind = BUILD_CATALOG[num - 1].kind;
          this.bulldozeMode = false;
          this.ctx.audio.playUIClick();
          this.refreshToolbar();
        } else if (!this.buildMode) {
          if (num === 1) this.ctx.localAvatar.setEquippedTool('axe');
          if (num === 2) this.ctx.localAvatar.setEquippedTool('hammer');
          if (num === 3) this.ctx.localAvatar.setEquippedTool('sword');
          this.refreshToolbar();
        }
      }
    };
    window.addEventListener('keydown', this.keydownHandler);

    this.refreshToolbar();
  }

  private refreshToolbar(): void {
    const tool = this.ctx.localAvatar.getEquippedTool();
    const isNight = this.timeOfDay >= 19.0 || this.timeOfDay <= 5.3;

    const btnStyle = (active: boolean, danger = false) =>
      `padding:6px 10px;border-radius:8px;border:1px solid ${
        active ? (danger ? '#ff6b6b' : '#66f2a5') : 'rgba(255,255,255,0.16)'
      };background:${
        active
          ? danger
            ? 'rgba(255,80,80,0.28)'
            : 'rgba(102,242,165,0.24)'
          : 'rgba(10,18,26,0.72)'
      };color:#f3fff8;font-size:12px;font-weight:600;cursor:pointer;backdrop-filter:blur(6px);`;

    const piecesHtml = this.buildMode
      ? BUILD_CATALOG.map(
          (b, idx) =>
            `<button data-build="${b.kind}" style="${btnStyle(
              !this.bulldozeMode && this.selectedBuildKind === b.kind
            )}">[${idx + 1}] ${b.shortLabel}</button>`
        ).join('') +
        `<button data-act="rotate" style="${btnStyle(false)}">↻ [R]</button>` +
        `<button data-act="bulldoze" style="${btnStyle(this.bulldozeMode, true)}">🗑️ Démolir [X]</button>`
      : `<button data-tool="axe" style="${btnStyle(tool === 'axe')}">🪓 Hache [1]</button>` +
        `<button data-tool="hammer" style="${btnStyle(tool === 'hammer')}">⛏️ Pioche [2]</button>` +
        `<button data-tool="sword" style="${btnStyle(tool === 'sword')}">⚔️ Épée [3]</button>`;

    const html = `
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;pointer-events:auto;">
        <span style="padding:5px 10px;border-radius:8px;background:rgba(8,16,22,0.82);border:1px solid rgba(102,242,165,0.35);color:#a9ffd1;font-size:12px;font-weight:700;">
          🪵 ${this.woodCount} &nbsp; 🪨 ${this.stoneCount} &nbsp; ⛏️ ${this.ironCount}
        </span>
        <button data-act="toggle_build" style="${btnStyle(this.buildMode)}">
          ${this.buildMode ? '🏗️ Construction ON [B]' : '🏗️ Construire [B]'}
        </button>
        ${piecesHtml}
        <button data-act="cycle_time" style="${btnStyle(isNight)}">
          ${isNight ? '☀️ Aube' : '🌙 Nuit Coop'}
        </button>
      </div>
    `;

    this.ctx.ui.setWorldToolbarHTML(html, (container) => {
      container.querySelectorAll<HTMLButtonElement>('button[data-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const t = btn.dataset.tool as EquippedToolType;
          this.buildMode = false;
          this.ctx.localAvatar.setEquippedTool(t);
          this.ctx.audio.playUIClick();
          this.refreshToolbar();
        });
      });

      container.querySelectorAll<HTMLButtonElement>('button[data-build]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.buildMode = true;
          this.bulldozeMode = false;
          this.selectedBuildKind = btn.dataset.build as BuildPieceKind;
          this.ctx.localAvatar.setEquippedTool('hammer');
          this.ctx.audio.playUIClick();
          this.refreshToolbar();
        });
      });

      container.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.act;
          this.ctx.audio.playUIClick();
          if (act === 'toggle_build') {
            this.buildMode = !this.buildMode;
            this.bulldozeMode = false;
            this.ctx.localAvatar.setEquippedTool(this.buildMode ? 'hammer' : 'axe');
            this.refreshToolbar();
          } else if (act === 'rotate') {
            this.buildRotSteps = (this.buildRotSteps + 1) % 8;
          } else if (act === 'bulldoze') {
            this.bulldozeMode = !this.bulldozeMode;
            this.refreshToolbar();
          } else if (act === 'cycle_time') {
            const curNight = this.timeOfDay >= 19.0 || this.timeOfDay <= 5.3;
            this.timeOfDay = curNight ? 8.8 : 19.6;
            this.ctx.sky.setTimeOfDay(this.timeOfDay);
            this.refreshToolbar();
          }
        });
      });
    });
  }

  /**
   * Deterministic continuous 5-biome Nordic terrain & vertex-color evaluator:
   * 1. Boreal Pine Forest
   * 2. Snow-Capped Alpine Peaks
   * 3. Golden Beaches
   * 4. Winding Reflective Rivers
   * 5. Glowing Crystal Caverns / Monoliths
   */
  private evaluateTerrain(x: number, z: number): TerrainSample {
    return this.sampleHeightOnly(x, z, true);
  }

  private sampleHeightOnly(x: number, z: number, fullColor = false): TerrainSample {
    // Domain warp for organic meandering rivers & coastlines
    const warpX = this.noise.simplex2D(x * 0.0028 + 4.1, z * 0.0028 - 2.3) * 34.0;
    const warpZ = this.noise.simplex2D(x * 0.0028 - 7.4, z * 0.0028 + 5.9) * 34.0;

    // Continental elevation shaped so (0, 10) is a Boreal Forest valley, z > 52 opens to Golden Beach & Fjord,
    // z < -62 rises into Alpine Snow Peaks, and (-52, -18) hosts the Elder Crystal Monolith Sanctuary.
    const macro = this.noise.fbm2D((x + 40) * 0.0018, (z - 35) * 0.0018, 4);
    const shoreTrend = Math.max(-12.0, Math.min(18.0, (48.0 - z) * 0.14));
    const hills = (this.noise.fbm2D(x * 0.0085, z * 0.0085, 4) * 0.5 + 0.5) * 14.5;

    // Alpine mountain chains (north of spawn & across high macro zones)
    const alpineDriver = Math.max(
      0,
      Math.min(1, (-z - 35) * 0.011 + macro * 0.85)
    );
    const ridged = this.noise.ridged2D(x * 0.0046 + 1.7, z * 0.0046 - 0.9, 5);
    const alpineHeight = alpineDriver * alpineDriver * (18.0 + ridged * 58.0);

    let height = shoreTrend + macro * 13.0 + hills * 0.65 + alpineHeight;

    // Starter Sanctuary Clearing flattening near (0, 8)
    const distSpawn = Math.hypot(x, z - 8);
    if (distSpawn < 24) {
      const flatBlend = 1 - distSpawn / 24;
      height = height * (1 - flatBlend * 0.72) + 4.8 * (flatBlend * 0.72);
    }

    // Winding Reflective River Channels (one winds near x ≈ 26..34 so a Wooden Bridge can span it!)
    const riverSignal = Math.abs(
      this.noise.simplex2D((x - 28 + warpX * 0.45) * 0.0044, (z + warpZ * 0.45) * 0.0044)
    );
    const riverMask = Math.max(0, Math.min(1, 1.0 - riverSignal / 0.085));
    if (riverMask > 0 && alpineDriver < 0.58) {
      const carveStrength = riverMask * riverMask * (1.0 - alpineDriver * 1.4);
      if (carveStrength > 0) {
        const riverBedY = -1.45;
        height = height * (1 - carveStrength) + riverBedY * carveStrength;
      }
    }

    // Glowing Crystal Cavern / Monolith Basins (Guaranteed Elder Grotto at (-52, -18) + procedural Worley cells)
    const distElderCrys = Math.hypot(x + 52, z + 18);
    const elderMask = Math.max(0, 1 - distElderCrys / 34);
    const worley = this.detailNoise.worley2D(x * 0.0042 + 2.2, z * 0.0042 - 1.6);
    const procCrystal =
      worley.cellId > 0.76 && height > 3.5 && alpineDriver < 0.55
        ? Math.max(0, 1 - worley.f1 / 0.34)
        : 0;
    const crystalMask = Math.max(elderMask, procCrystal);

    if (crystalMask > 0.05) {
      // Sculpt natural amphitheater rim & glowing cavern basin
      const rim = Math.sin(Math.min(1, crystalMask) * Math.PI) * 5.2;
      const bowl = crystalMask > 0.45 ? (crystalMask - 0.45) * 6.5 : 0;
      height += rim - bowl;
    }

    if (!fullColor) {
      let biomeQuick: BiomeType = 'forest';
      if (crystalMask > 0.35) biomeQuick = 'crystal';
      else if (riverMask > 0.48 && height < 1.6) biomeQuick = 'river';
      else if (height < 2.8) biomeQuick = 'beach';
      else if (height > 23.5) biomeQuick = 'alpine';
      return {
        height,
        biome: biomeQuick,
        slope: 0,
        r: 1,
        g: 1,
        b: 1,
        riverMask,
        crystalMask
      };
    }

    // Compute finite-difference slope for cliff rock exposure
    const eps = 1.4;
    const hx = this.sampleHeightOnly(x + eps, z, false).height;
    const hz = this.sampleHeightOnly(x, z + eps, false).height;
    const slope = Math.min(1, Math.hypot(hx - height, hz - height) / eps);

    // Biome classification & smooth PBR vertex colors
    const micro = this.detailNoise.simplex2D(x * 0.09, z * 0.09) * 0.5 + 0.5;
    let biome: BiomeType = 'forest';
    let r = 0.36 + micro * 0.14;
    let g = 0.68 + micro * 0.18;
    let b = 0.3 + micro * 0.09;

    // Beach & underwater bed
    if (height < 3.1) {
      const beachT = Math.max(0, Math.min(1, (3.1 - height) / 2.2));
      const wetT = Math.max(0, Math.min(1, (0.5 - height) / 1.6));
      const sandR = 1.22 - wetT * 0.48;
      const sandG = 1.06 - wetT * 0.42;
      const sandB = 0.72 - wetT * 0.25;
      r = r * (1 - beachT) + sandR * beachT;
      g = g * (1 - beachT) + sandG * beachT;
      b = b * (1 - beachT) + sandB * beachT;
      biome = riverMask > 0.42 ? 'river' : 'beach';
    } else if (riverMask > 0.36 && height < 4.5) {
      biome = 'river';
      r = 0.44 + micro * 0.1;
      g = 0.62 + micro * 0.12;
      b = 0.42 + micro * 0.08;
    }

    // Crystal Cavern / Monolith obsidian & glowing cyan veins
    if (crystalMask > 0.22) {
      const cT = Math.min(1, (crystalMask - 0.22) / 0.45);
      const vein = Math.max(0, this.detailNoise.simplex2D(x * 0.22, z * 0.22) - 0.52) * 2.1;
      const cr = 0.25 + vein * 0.25;
      const cg = 0.22 + vein * 1.15;
      const cb = 0.4 + vein * 1.45;
      r = r * (1 - cT) + cr * cT;
      g = g * (1 - cT) + cg * cT;
      b = b * (1 - cT) + cb * cT;
      if (crystalMask > 0.35) biome = 'crystal';
    }

    // Steep cliff granite exposure
    if (slope > 0.52) {
      const rockT = Math.min(1, (slope - 0.52) / 0.42);
      r = r * (1 - rockT) + 0.58 * rockT;
      g = g * (1 - rockT) + 0.6 * rockT;
      b = b * (1 - rockT) + 0.65 * rockT;
    }

    // Snow-Capped Alpine Peaks
    if (height > 21.0) {
      biome = 'alpine';
      const snowLine = 22.5 + micro * 3.5 + slope * 9.0;
      const snowT = Math.max(0, Math.min(1, (height - snowLine) / 6.5));
      r = r * (1 - snowT) + 1.32 * snowT;
      g = g * (1 - snowT) + 1.38 * snowT;
      b = b * (1 - snowT) + 1.48 * snowT;
    }

    return { height, biome, slope, r, g, b, riverMask, crystalMask };
  }

  private getSupportHeight(x: number, z: number, currentPlayerY: number): { y: number; surface: SurfaceMaterialType; biome: BiomeType } {
    const sample = this.sampleHeightOnly(x, z, false);
    let bestY = sample.height;
    let surface: SurfaceMaterialType = 'grass';

    if (sample.height < WATER_LEVEL - 0.2) surface = 'water';
    else if (sample.biome === 'beach') surface = 'sand';
    else if (sample.biome === 'alpine' && sample.height > 25) surface = 'snow';
    else if (sample.biome === 'crystal') surface = 'rock';

    // Check walkable modular Foundations & Wooden Bridges
    for (const p of this.placedPieces.values()) {
      if (p.kind !== 'foundation' && p.kind !== 'bridge') continue;
      const dx = x - p.x;
      const dz = z - p.z;
      const cosR = Math.cos(-p.rotY);
      const sinR = Math.sin(-p.rotY);
      const lx = dx * cosR - dz * sinR;
      const lz = dx * sinR + dz * cosR;
      if (Math.abs(lx) <= 2.08 && Math.abs(lz) <= 2.08) {
        if (p.y >= bestY - 0.2 && p.y <= currentPlayerY + 1.35) {
          bestY = p.y;
          surface = 'wood';
        }
      }
    }

    return { y: bestY, surface, biome: sample.biome };
  }

  private generateChunk(cx: number, cz: number): TerrainChunkData {
    const key = `${cx},${cz}`;
    const segs = this.chunkSegments;
    const size = this.chunkSize;
    const originX = cx * size;
    const originZ = cz * size;

    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI * 0.5);
    geo.translate(originX + size * 0.5, 0, originZ + size * 0.5);

    const pos = geo.getAttribute('position');
    const vCount = pos.count;
    const colors = new Float32Array(vCount * 3);

    for (let i = 0; i < vCount; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const s = this.evaluateTerrain(vx, vz);
      pos.setY(i, s.height);
      colors[i * 3] = s.r;
      colors[i * 3 + 1] = s.g;
      colors[i * 3 + 2] = s.b;
    }

    geo.computeVertexNormals();
    const nonIdx = geo.toNonIndexed();
    geo.dispose();

    // Copy interpolated vertex colors to non-indexed buffer
    const niPos = nonIdx.getAttribute('position');
    const niColors = new Float32Array(niPos.count * 3);
    for (let i = 0; i < niPos.count; i++) {
      const s = this.evaluateTerrain(niPos.getX(i), niPos.getZ(i));
      niColors[i * 3] = s.r;
      niColors[i * 3 + 1] = s.g;
      niColors[i * 3 + 2] = s.b;
    }
    nonIdx.setAttribute('color', new THREE.BufferAttribute(niColors, 3));

    // Deterministically populate Pine Trees, Ferns, Boulders, Iron Veins & Cavern Crystals
    const seed = ((cx * 73856093) ^ (cz * 19349663) ^ 0x5f3759df) >>> 0;
    const rng = new SeededRandom(seed);

    const trees: TreeRecord[] = [];
    const rocks: RockRecord[] = [];
    const ferns: StaticPropInstance[] = [];
    const monoliths: StaticPropInstance[] = [];
    const canopySpots: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < 18; i++) {
      const tx = originX + rng.range(2.2, size - 2.2);
      const tz = originZ + rng.range(2.2, size - 2.2);
      if (Math.hypot(tx - 3, tz - 6) < 9.5) continue; // Keep hearth clearing open

      const s = this.evaluateTerrain(tx, tz);
      if (
        (s.biome === 'forest' || (s.biome === 'alpine' && s.height < 26)) &&
        s.height > WATER_LEVEL + 1.4 &&
        s.slope < 0.56 &&
        s.crystalMask < 0.25 &&
        s.riverMask < 0.35
      ) {
        const treeId = `${key}:T${i}`;
        trees.push({
          id: treeId,
          chunkKey: key,
          x: tx,
          y: s.height - 0.15,
          z: tz,
          scale: rng.range(0.82, 1.38),
          rotY: rng.range(0, Math.PI * 2),
          hits: 0,
          shakeTimer: 0,
          slotIndex: -1
        });

        if (canopySpots.length < 3 && rng.next() < 0.45) {
          canopySpots.push({ x: tx + rng.range(-3, 3), y: s.height, z: tz + rng.range(-3, 3) });
        }
      }
    }

    // Forest Ferns
    for (let i = 0; i < 20; i++) {
      const fx = originX + rng.range(1.5, size - 1.5);
      const fz = originZ + rng.range(1.5, size - 1.5);
      const s = this.sampleHeightOnly(fx, fz, false);
      if (s.biome === 'forest' && s.height > WATER_LEVEL + 1.1 && s.riverMask < 0.4) {
        ferns.push({
          x: fx,
          y: s.height - 0.05,
          z: fz,
          scale: rng.range(0.75, 1.35),
          rotY: rng.range(0, Math.PI * 2),
          tiltX: rng.range(-0.08, 0.08),
          tiltZ: rng.range(-0.08, 0.08)
        });
      }
    }

    // Boulders, Iron Ore Veins & Glowing Cavern Crystals
    for (let i = 0; i < 9; i++) {
      const rx = originX + rng.range(2.5, size - 2.5);
      const rz = originZ + rng.range(2.5, size - 2.5);
      if (Math.hypot(rx - 3, rz - 6) < 7.0) continue;

      const s = this.evaluateTerrain(rx, rz);
      if (s.height < WATER_LEVEL + 0.2) continue;

      const rockId = `${key}:R${i}`;
      if (s.crystalMask > 0.34) {
        rocks.push({
          id: rockId,
          chunkKey: key,
          kind: i % 3 === 0 ? 'iron' : 'crystal',
          x: rx,
          y: s.height - 0.15,
          z: rz,
          scale: rng.range(0.85, 1.65),
          rotY: rng.range(0, Math.PI * 2),
          hits: 0,
          shakeTimer: 0,
          slotIndex: -1
        });
        if (i === 0 || (Math.hypot(rx + 52, rz + 18) < 28 && i < 4)) {
          monoliths.push({
            x: rx + rng.range(-2.5, 2.5),
            y: s.height - 0.3,
            z: rz + rng.range(-2.5, 2.5),
            scale: rng.range(0.9, 1.35),
            rotY: rng.range(0, Math.PI * 2),
            tiltX: rng.range(-0.12, 0.12),
            tiltZ: rng.range(-0.12, 0.12)
          });
        }
      } else if (s.biome === 'alpine' && i % 2 === 0) {
        rocks.push({
          id: rockId,
          chunkKey: key,
          kind: 'iron',
          x: rx,
          y: s.height - 0.2,
          z: rz,
          scale: rng.range(0.85, 1.4),
          rotY: rng.range(0, Math.PI * 2),
          hits: 0,
          shakeTimer: 0,
          slotIndex: -1
        });
      } else if (i < 5) {
        rocks.push({
          id: rockId,
          chunkKey: key,
          kind: 'boulder',
          x: rx,
          y: s.height - 0.25,
          z: rz,
          scale: rng.range(0.75, 1.55),
          rotY: rng.range(0, Math.PI * 2),
          hits: 0,
          shakeTimer: 0,
          slotIndex: -1
        });
      }
    }

    return { key, cx, cz, geometry: nonIdx, trees, rocks, ferns, monoliths, canopySpots };
  }

  private updateChunkStreaming(immediate: boolean): void {
    const centerCx = Math.floor(this.playerPos.x / this.chunkSize);
    const centerCz = Math.floor(this.playerPos.z / this.chunkSize);
    const radius = Math.max(2, Math.min(4, this.ctx.quality.config.chunkRadius));

    if (centerCx !== this.lastStreamCenterCx || centerCz !== this.lastStreamCenterCz) {
      this.lastStreamCenterCx = centerCx;
      this.lastStreamCenterCz = centerCz;

      const wanted = new Set<string>();
      this.pendingChunkCoords = [];

      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const cx = centerCx + dx;
          const cz = centerCz + dz;
          const key = `${cx},${cz}`;
          wanted.add(key);
          if (!this.chunks.has(key)) {
            this.pendingChunkCoords.push({ cx, cz, distSq: dx * dx + dz * dz });
          }
        }
      }

      this.pendingChunkCoords.sort((a, b) => a.distSq - b.distSq);

      // Unload out-of-range chunks cleanly
      let removedAny = false;
      for (const [key, chunk] of this.chunks.entries()) {
        if (!wanted.has(key)) {
          chunk.geometry.dispose();
          this.chunks.delete(key);
          removedAny = true;
        }
      }
      if (removedAny) {
        this.quadrantsDirty = true;
        this.propsDirty = true;
      }
    }

    const budget = immediate ? this.pendingChunkCoords.length : 2;
    let builtCount = 0;
    while (this.pendingChunkCoords.length > 0 && builtCount < budget) {
      const next = this.pendingChunkCoords.shift()!;
      const key = `${next.cx},${next.cz}`;
      if (!this.chunks.has(key)) {
        const chunk = this.generateChunk(next.cx, next.cz);
        this.chunks.set(key, chunk);
        builtCount++;
      }
    }

    if (builtCount > 0) {
      this.quadrantsDirty = true;
      this.propsDirty = true;
    }

    if (this.quadrantsDirty && (immediate || this.pendingChunkCoords.length === 0 || builtCount > 0)) {
      this.rebuildTerrainQuadrants();
    }
    if (this.propsDirty && (immediate || this.pendingChunkCoords.length === 0 || builtCount > 0)) {
      this.rebuildPropInstances();
    }
  }

  /**
   * Batches all active terrain chunks into 4 regional Quadrant Meshes (NW, NE, SW, SE)
   * so infinite streaming terrain renders in at most 4 draw calls!
   */
  private rebuildTerrainQuadrants(): void {
    this.quadrantsDirty = false;
    const buckets: THREE.BufferGeometry[][] = [[], [], [], []];

    for (const chunk of this.chunks.values()) {
      const qx = chunk.cx >= this.lastStreamCenterCx ? 1 : 0;
      const qz = chunk.cz >= this.lastStreamCenterCz ? 2 : 0;
      buckets[qx + qz].push(chunk.geometry);
    }

    for (let q = 0; q < 4; q++) {
      const prev = this.quadrantMeshes[q];
      if (prev) {
        this.worldRoot.remove(prev);
        prev.geometry.dispose();
        this.quadrantMeshes[q] = null;
      }
      if (buckets[q].length > 0) {
        const merged = mergeGeometries(buckets[q], false);
        const mesh = new THREE.Mesh(merged, this.terrainMat);
        mesh.receiveShadow = true;
        this.worldRoot.add(mesh);
        this.quadrantMeshes[q] = mesh;
      }
    }
  }

  private rebuildPropInstances(): void {
    this.propsDirty = false;
    const mult = this.ctx.quality.config.maxInstancesMultiplier;

    this.activeTrees = [];
    this.activeBoulders = [];
    this.activeIrons = [];
    this.activeCrystals = [];

    let treeSlot = 0;
    let fernSlot = 0;
    let boulderSlot = 0;
    let ironSlot = 0;
    let crystalSlot = 0;
    let monoSlot = 0;
    const canopyPool: Array<{ x: number; y: number; z: number }> = [];

    const maxFerns = Math.min(2200, Math.floor(2200 * mult));

    for (const chunk of this.chunks.values()) {
      for (const spot of chunk.canopySpots) {
        canopyPool.push(spot);
      }

      for (const t of chunk.trees) {
        if (this.choppedTreeIds.has(t.id)) {
          t.slotIndex = -1;
          continue;
        }
        if (treeSlot >= this.pineTrunkInst.instanceMatrix.count) break;
        t.slotIndex = treeSlot;
        this.dummy.position.set(t.x, t.y, t.z);
        this.dummy.rotation.set(0, t.rotY, 0);
        this.dummy.scale.setScalar(t.scale);
        this.dummy.updateMatrix();
        this.pineTrunkInst.setMatrixAt(treeSlot, this.dummy.matrix);
        this.pineFoliageInst.setMatrixAt(treeSlot, this.dummy.matrix);
        this.activeTrees.push(t);
        treeSlot++;
      }

      for (const f of chunk.ferns) {
        if (fernSlot >= maxFerns) break;
        this.dummy.position.set(f.x, f.y, f.z);
        this.dummy.rotation.set(f.tiltX, f.rotY, f.tiltZ);
        this.dummy.scale.setScalar(f.scale);
        this.dummy.updateMatrix();
        this.fernInst.setMatrixAt(fernSlot, this.dummy.matrix);
        fernSlot++;
      }

      for (const m of chunk.monoliths) {
        if (monoSlot >= this.monolithInst.instanceMatrix.count) break;
        this.dummy.position.set(m.x, m.y, m.z);
        this.dummy.rotation.set(m.tiltX, m.rotY, m.tiltZ);
        this.dummy.scale.setScalar(m.scale);
        this.dummy.updateMatrix();
        this.monolithInst.setMatrixAt(monoSlot, this.dummy.matrix);
        monoSlot++;
      }

      for (const r of chunk.rocks) {
        if (this.minedRockIds.has(r.id)) {
          r.slotIndex = -1;
          continue;
        }
        this.dummy.position.set(r.x, r.y, r.z);
        this.dummy.rotation.set(0, r.rotY, 0);
        this.dummy.scale.setScalar(r.scale);
        this.dummy.updateMatrix();

        if (r.kind === 'boulder' && boulderSlot < this.boulderInst.instanceMatrix.count) {
          r.slotIndex = boulderSlot;
          this.boulderInst.setMatrixAt(boulderSlot, this.dummy.matrix);
          this.activeBoulders.push(r);
          boulderSlot++;
        } else if (r.kind === 'iron' && ironSlot < this.ironOreInst.instanceMatrix.count) {
          r.slotIndex = ironSlot;
          this.ironOreInst.setMatrixAt(ironSlot, this.dummy.matrix);
          this.activeIrons.push(r);
          ironSlot++;
        } else if (r.kind === 'crystal' && crystalSlot < this.crystalInst.instanceMatrix.count) {
          r.slotIndex = crystalSlot;
          this.crystalInst.setMatrixAt(crystalSlot, this.dummy.matrix);
          this.activeCrystals.push(r);
          crystalSlot++;
        }
      }
    }

    this.pineTrunkInst.count = treeSlot;
    this.pineTrunkInst.instanceMatrix.needsUpdate = true;
    this.pineFoliageInst.count = treeSlot;
    this.pineFoliageInst.instanceMatrix.needsUpdate = true;

    this.fernInst.count = fernSlot;
    this.fernInst.instanceMatrix.needsUpdate = true;

    this.boulderInst.count = boulderSlot;
    this.boulderInst.instanceMatrix.needsUpdate = true;

    this.ironOreInst.count = ironSlot;
    this.ironOreInst.instanceMatrix.needsUpdate = true;

    this.crystalInst.count = crystalSlot;
    this.crystalInst.instanceMatrix.needsUpdate = true;

    this.monolithInst.count = monoSlot;
    this.monolithInst.instanceMatrix.needsUpdate = true;

    this.cachedCanopySpots = canopyPool;
  }

  private cachedCanopySpots: Array<{ x: number; y: number; z: number }> = [];

  private updateGodRays(elapsed: number): void {
    const sunDir = this.ctx.sky.sunDirection;
    const dayFactor = Math.max(0, Math.min(1, (sunDir.y + 0.08) / 0.45));
    const moonFactor = sunDir.y < -0.05 ? Math.min(1, (-sunDir.y - 0.05) / 0.35) : 0;

    this.godRayMat.uniforms.uTime.value = elapsed;
    if (dayFactor > 0.02) {
      const dawnTint = Math.max(0, 1 - sunDir.y * 1.8);
      this.godRayMat.uniforms.uColor.value.setRGB(
        1.0,
        0.88 - dawnTint * 0.16,
        0.62 - dawnTint * 0.25
      );
      this.godRayMat.uniforms.uIntensity.value = 0.22 * dayFactor;
    } else {
      // Subtle silver-cyan Nordic moonlight shafts at night
      this.godRayMat.uniforms.uColor.value.setRGB(0.42, 0.72, 0.98);
      this.godRayMat.uniforms.uIntensity.value = 0.085 * moonFactor;
    }

    const rayAxis = this.tmpVecB.copy(sunDir);
    if (rayAxis.y < 0.05) {
      rayAxis.set(-sunDir.x, Math.max(0.35, -sunDir.y), -sunDir.z).normalize();
    } else {
      rayAxis.y = Math.max(0.28, rayAxis.y);
      rayAxis.normalize();
    }
    this.tmpQuat.setFromUnitVectors(WORLD_UP, rayAxis);

    const spots = this.cachedCanopySpots;
    const maxShafts = Math.min(28, spots.length);
    let written = 0;
    const step = Math.max(1, Math.floor(spots.length / 28));

    for (let i = 0; i < spots.length && written < maxShafts; i += step) {
      const sp = spots[i];
      const distSq = (sp.x - this.playerPos.x) ** 2 + (sp.z - this.playerPos.z) ** 2;
      if (distSq > 135 * 135) continue;

      this.dummy.position.set(
        sp.x + rayAxis.x * 16.0,
        sp.y + 15.0,
        sp.z + rayAxis.z * 16.0
      );
      this.dummy.quaternion.copy(this.tmpQuat);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.godRayInst.setMatrixAt(written, this.dummy.matrix);
      written++;
    }
    this.godRayInst.count = written;
    this.godRayInst.instanceMatrix.needsUpdate = true;
  }

  private rebuildBuildInstances(): void {
    const counts: Record<BuildPieceKind, number> = {
      foundation: 0,
      wall: 0,
      roof: 0,
      bridge: 0,
      torch: 0,
      campfire: 0
    };

    for (const piece of this.placedPieces.values()) {
      const idx = counts[piece.kind];
      const mesh = this.buildInstMeshes[piece.kind];
      if (!mesh || idx >= mesh.instanceMatrix.count) continue;

      this.dummy.position.set(piece.x, piece.y, piece.z);
      this.dummy.rotation.set(0, piece.rotY, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(idx, this.dummy.matrix);
      counts[piece.kind] = idx + 1;
    }

    for (const k of Object.keys(this.buildInstMeshes) as BuildPieceKind[]) {
      this.buildInstMeshes[k].count = counts[k];
      this.buildInstMeshes[k].instanceMatrix.needsUpdate = true;
    }
  }

  public update(dt: number, elapsed: number): void {
    this.smoothedFps = this.smoothedFps * 0.92 + (1 / Math.max(0.001, dt)) * 0.08;

    // 1. Advance Nordic Day/Night Cycle
    this.timeOfDay = (this.timeOfDay + dt * 0.14) % 24;
    this.ctx.sky.setTimeOfDay(this.timeOfDay);
    this.ctx.sky.update(dt, this.playerPos);

    const isNight = this.timeOfDay >= 19.0 || this.timeOfDay <= 5.3;
    if (isNight !== this.wasNight) {
      this.wasNight = isNight;
      if (isNight) {
        this.ctx.ui.notify(
          '🌙 La Nuit Nordique Tombe',
          'Des Spectres Sylvestres & Greydwarfs Runiques émergent des bois ! Défendez votre feu de camp !',
          'warning'
        );
      } else {
        this.ctx.ui.notify(
          '☀️ L’Aube Se Lève',
          'Les rayons du soleil dissipent les spectres de la nuit.',
          'success'
        );
      }
      this.refreshToolbar();
    }

    // 2. Player Movement, Camera, Melee/Harvesting & Modular Construction
    this.updatePlayerAndCamera(dt);
    this.updateChunkStreaming(false);

    if (this.buildMode) {
      this.updateBuildGhostAndActions(elapsed);
    } else {
      this.ghostGroup.visible = false;
      if (this.ctx.input.state.primaryJustPressed && this.attackAnimTimer <= 0) {
        this.performSwingAction();
      }
    }

    // 3. Physical Tree Shudders, Falling Trunks, Collectible Drops & Particles
    this.updateTreeShuddersAndFalls(dt);
    this.updateLootDrops(dt, elapsed);
    this.updateParticlesAndFires(dt, elapsed);

    // 4. Night Defense Wraiths & Campfire Warmth/Heal Aura
    this.updateCampfireLightsAndAura(dt, elapsed);
    this.updateNightWraiths(dt, isNight);

    // 5. Water & Volumetric God-Ray Shaders
    this.waterMesh.position.x = Math.round(this.playerPos.x / 16) * 16;
    this.waterMesh.position.z = Math.round(this.playerPos.z / 16) * 16;
    this.waterMat.uniforms.uTime.value = elapsed;
    this.waterMat.uniforms.uSunDir.value.copy(this.ctx.sky.sunDirection);
    this.waterMat.uniforms.uCameraPos.value.copy(this.ctx.camera.position);
    this.waterMat.uniforms.uDayFactor.value = Math.max(
      0.08,
      Math.min(1, (this.ctx.sky.sunDirection.y + 0.12) / 0.5)
    );

    for (const wh of this.windHandles) {
      wh.update(elapsed);
    }
    this.crystalLight.intensity = 3.8 + Math.sin(elapsed * 2.7) * 1.1;
    this.updateGodRays(elapsed);

    // 6. P2P Player Sync & HUD Telemetry
    this.netSyncTimer += dt;
    if (this.netSyncTimer >= 0.05) {
      this.netSyncTimer = 0;
      const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
      let anim: AvatarAnimState = 'idle';
      if (this.attackAnimTimer > 0) anim = 'attack';
      else if (this.playerPos.y < WATER_LEVEL - 0.55) anim = 'swim';
      else if (!this.onGround) anim = 'jump';
      else if (horizSpeed > 5.2) anim = 'run';
      else if (horizSpeed > 0.35) anim = 'walk';

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
        vehicleId: null,
        seatIndex: -1
      });
    }

    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.1) {
      this.telemetryTimer = 0;
      const biomeNames: Record<BiomeType, string> = {
        forest: 'Forêt Boréale',
        alpine: 'Pics Alpins Enneigés',
        beach: 'Plages Dorées',
        river: 'Rivière Réflective',
        crystal: 'Sanctuaire Cristal Runique'
      };
      const hh = Math.floor(this.timeOfDay);
      const mm = Math.floor((this.timeOfDay - hh) * 60);
      const clockStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

      let hint = `🪓 Clic Gauche: Abattre Arbres / Miner • [B] Mode Construction P2P • 🪵 ${this.woodCount} 🪨 ${this.stoneCount}`;
      if (this.buildMode) {
        const meta = BUILD_CATALOG.find((c) => c.kind === this.selectedBuildKind);
        hint = this.bulldozeMode
          ? '🗑️ Mode Démolition: Clic Gauche/Droit pour retirer une pièce • [X] Annuler'
          : `🏗️ ${meta?.label ?? ''} • Clic Gauche: Poser • Clic Droit: Retirer • [R] Tourner`;
      } else if (this.nearWarmth) {
        hint = `🔥 Aura du Feu de Camp (+Vie/+Endurance) • 🪵 ${this.woodCount} 🪨 ${this.stoneCount} ⛏️ ${this.ironCount}`;
      } else if (this.wraiths.length > 0) {
        hint = `⚔️ ${this.wraiths.length} Greydwarfs Runiques actifs ! Défendez le campement !`;
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
        contextMode: 'ON_FOOT',
        speedKmh: Math.round(Math.hypot(this.playerVel.x, this.playerVel.z) * 3.6),
        altitudeM: Math.round(this.playerPos.y),
        staminaRatio: this.stamina / this.maxStamina,
        healthRatio: this.health / this.maxHealth,
        credits: this.wraithKills * 50 + this.ironCount * 10,
        weatherLabel: `${biomeNames[this.currentBiome]} • ${clockStr}`,
        statusHint: hint
      });
    }
  }

  private updatePlayerAndCamera(dt: number): void {
    const inp = this.ctx.input.state;
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    }

    // Compute camera-relative planar directions directly from camera->pivot vector
    const pivot = this.tmpVecA.set(this.playerPos.x, this.playerPos.y + 1.62, this.playerPos.z);
    const camForward = this.tmpVecB.set(
      pivot.x - this.ctx.camera.position.x,
      0,
      pivot.z - this.ctx.camera.position.z
    );
    if (camForward.lengthSq() < 1e-4) camForward.set(0, 0, -1);
    else camForward.normalize();

    const camRight = this.tmpVecC.crossVectors(camForward, WORLD_UP).normalize();

    const moveDir = new THREE.Vector3()
      .addScaledVector(camForward, inp.moveZ)
      .addScaledVector(camRight, inp.moveX);
    const moveMag = Math.min(1, moveDir.length());
    if (moveMag > 1e-3) moveDir.normalize();

    const isSwimming = this.playerPos.y < WATER_LEVEL - 0.65;
    const wantsSprint = inp.sprint && moveMag > 0.1 && this.stamina > 3 && !isSwimming;
    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - dt * 15);
    } else {
      const regen = this.nearWarmth ? 28 : 16;
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * regen);
    }

    const targetSpeed = isSwimming ? 4.4 : wantsSprint ? 8.6 : 5.2;
    const desiredVx = moveDir.x * moveMag * targetSpeed;
    const desiredVz = moveDir.z * moveMag * targetSpeed;
    const accel = this.onGround ? 14.0 : 5.5;
    this.playerVel.x += (desiredVx - this.playerVel.x) * Math.min(1, dt * accel);
    this.playerVel.z += (desiredVz - this.playerVel.z) * Math.min(1, dt * accel);

    // Jump / Buoyancy / Gravity
    if (isSwimming) {
      const targetSwimY = WATER_LEVEL - 0.72;
      this.playerVel.y += (targetSwimY - this.playerPos.y) * 6.5 * dt;
      this.playerVel.y *= Math.max(0, 1 - dt * 3.5);
      if (inp.jumpJustPressed) this.playerVel.y = 4.5;
    } else {
      if (this.onGround && inp.jumpJustPressed && this.stamina >= 8) {
        this.playerVel.y = 7.2;
        this.onGround = false;
        this.stamina = Math.max(0, this.stamina - 8);
      }
      this.playerVel.y -= 19.6 * dt;
    }

    let nextX = this.playerPos.x + this.playerVel.x * dt;
    let nextZ = this.playerPos.z + this.playerVel.z * dt;

    // Collide gently against placed Log Walls so interiors feel solid
    for (const p of this.placedPieces.values()) {
      if (p.kind !== 'wall') continue;
      if (this.playerPos.y + 1.6 < p.y || this.playerPos.y > p.y + 3.0) continue;
      const dx = nextX - p.x;
      const dz = nextZ - p.z;
      const cosR = Math.cos(-p.rotY);
      const sinR = Math.sin(-p.rotY);
      const lx = dx * cosR - dz * sinR;
      let lz = dx * sinR + dz * cosR;
      if (Math.abs(lx) < 2.1 && Math.abs(lz) < 0.52) {
        lz = lz >= 0 ? 0.52 : -0.52;
        const cosF = Math.cos(p.rotY);
        const sinF = Math.sin(p.rotY);
        nextX = p.x + lx * cosF - lz * sinF;
        nextZ = p.z + lx * sinF + lz * cosF;
      }
    }

    this.playerPos.x = nextX;
    this.playerPos.z = nextZ;
    this.playerPos.y += this.playerVel.y * dt;

    const support = this.getSupportHeight(this.playerPos.x, this.playerPos.z, this.playerPos.y);
    this.currentBiome = support.biome;

    if (this.playerPos.y <= support.y) {
      this.playerPos.y = support.y;
      if (this.playerVel.y < 0) this.playerVel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Smooth Avatar Facing
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.buildMode || this.attackAnimTimer > 0) {
      this.playerYaw = Math.atan2(camForward.x, camForward.z);
    } else if (horizSpeed > 0.25) {
      const targetYaw = Math.atan2(this.playerVel.x, this.playerVel.z);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * Math.min(1, dt * 12);
    }

    this.ctx.localAvatar.root.position.copy(this.playerPos);
    this.ctx.localAvatar.root.rotation.set(0, this.playerYaw, 0);

    let animState: AvatarAnimState = 'idle';
    if (this.attackAnimTimer > 0) animState = 'attack';
    else if (isSwimming) animState = 'swim';
    else if (!this.onGround) animState = 'jump';
    else if (horizSpeed > 6.0) animState = 'run';
    else if (horizSpeed > 0.3) animState = 'walk';

    this.ctx.localAvatar.updateAnimation(dt, animState, horizSpeed, 0, 0);
    this.ctx.audio.updateWindRush(Math.min(0.45, Math.max(0, (this.playerPos.y - 22) * 0.012)));

    // Footstep Audio
    if (this.onGround && horizSpeed > 0.6 && !isSwimming) {
      this.footstepTimer -= dt * (wantsSprint ? 1.55 : 1.0);
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.42;
        this.ctx.audio.playFootstep(support.surface, wantsSprint);
      }
    }

    // Update Orbit Camera above terrain
    pivot.set(this.playerPos.x, this.playerPos.y + 1.62, this.playerPos.z);
    const desiredCam = this.ctx.input.computeSafeCameraPosition(pivot, 6.2, []);
    const camGround = this.sampleHeightOnly(desiredCam.x, desiredCam.z, false).height + 0.55;
    if (desiredCam.y < camGround) desiredCam.y = camGround;
    this.ctx.camera.position.lerp(desiredCam, Math.min(1, dt * 18));
    this.ctx.camera.lookAt(pivot);
  }

  private performSwingAction(): void {
    this.attackAnimTimer = 0.36;
    const tool = this.ctx.localAvatar.getEquippedTool();

    const forward = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));
    const hitCenter = this.tmpVecA
      .copy(this.playerPos)
      .addScaledVector(forward, 2.15);

    // 1. Prioritize hitting hostile Night Wraiths in melee arc!
    let hitAnyWraith = false;
    for (let i = this.wraiths.length - 1; i >= 0; i--) {
      const w = this.wraiths[i];
      const d = w.pos.distanceTo(hitCenter);
      if (d < 2.85) {
        hitAnyWraith = true;
        const dmg = tool === 'sword' ? 45 : tool === 'axe' ? 35 : 28;
        w.hp -= dmg;
        w.hitFlash = 0.22;
        const kb = this.tmpVecB.subVectors(w.pos, this.playerPos).setY(0).normalize();
        w.vel.addScaledVector(kb, 9.5);
        w.vel.y = 3.5;

        this.spawnParticleBurst(
          new THREE.Vector3(w.pos.x, w.pos.y + 1.3, w.pos.z),
          12,
          new THREE.Color(0x36f3ff),
          4.8
        );

        if (w.hp <= 0) {
          this.killWraith(i);
        }
      }
    }
    if (hitAnyWraith) {
      this.ctx.audio.playSwordSlash();
      this.ctx.input.vibrate(70, 0.55, 0.3);
      return;
    }

    // 2. Check nearby Pine Trees (chop with Axe or Sword)
    let bestTree: TreeRecord | null = null;
    let bestTreeDist = 3.4;
    if (tool !== 'hammer') {
      for (const t of this.activeTrees) {
        if (this.choppedTreeIds.has(t.id)) continue;
        const d = Math.hypot(t.x - hitCenter.x, t.z - hitCenter.z);
        if (d < bestTreeDist && Math.abs(t.y - this.playerPos.y) < 4.5) {
          bestTreeDist = d;
          bestTree = t;
        }
      }
    }

    if (bestTree) {
      bestTree.hits += 1;
      bestTree.shakeTimer = 0.38;
      this.spawnParticleBurst(
        new THREE.Vector3(bestTree.x, bestTree.y + 1.35, bestTree.z),
        14,
        new THREE.Color(0xd79f62),
        4.6
      );

      if (bestTree.hits >= 3) {
        this.ctx.audio.playTreeChop(true);
        this.ctx.input.vibrate(140, 0.85, 0.45);
        this.fellTree(bestTree, forward, true);
      } else {
        this.ctx.audio.playTreeChop(false);
        this.ctx.input.vibrate(55, 0.4, 0.2);
      }
      return;
    }

    // 3. Check nearby Boulders / Iron Ore Veins / Cavern Crystals
    const allRocks = [...this.activeIrons, ...this.activeCrystals, ...this.activeBoulders];
    let bestRock: RockRecord | null = null;
    let bestRockDist = 3.5;
    for (const r of allRocks) {
      if (this.minedRockIds.has(r.id)) continue;
      const d = Math.hypot(r.x - hitCenter.x, r.z - hitCenter.z);
      if (d < bestRockDist && Math.abs(r.y - this.playerPos.y) < 4.0) {
        bestRockDist = d;
        bestRock = r;
      }
    }

    if (bestRock) {
      bestRock.hits += tool === 'hammer' ? 2 : 1;
      bestRock.shakeTimer = 0.3;
      const sparkColor =
        bestRock.kind === 'crystal'
          ? new THREE.Color(0x52f2ff)
          : bestRock.kind === 'iron'
          ? new THREE.Color(0xff9f4a)
          : new THREE.Color(0x9ca4ad);
      this.spawnParticleBurst(
        new THREE.Vector3(bestRock.x, bestRock.y + 0.9, bestRock.z),
        14,
        sparkColor,
        5.0
      );
      this.ctx.audio.playBuildSnap();
      this.ctx.input.vibrate(75, 0.55, 0.3);

      if (bestRock.hits >= 3) {
        this.shatterRock(bestRock);
      }
      return;
    }

    // Empty swing swoosh
    this.ctx.audio.playSwordSlash();
  }

  private fellTree(tree: TreeRecord, pushDir: THREE.Vector3, broadcast: boolean): void {
    if (this.choppedTreeIds.has(tree.id)) return;
    this.choppedTreeIds.add(tree.id);

    // Hide static instanced tree immediately in O(1)
    if (tree.slotIndex >= 0) {
      this.dummy.position.set(tree.x, tree.y - 50, tree.z);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.pineTrunkInst.setMatrixAt(tree.slotIndex, this.dummy.matrix);
      this.pineFoliageInst.setMatrixAt(tree.slotIndex, this.dummy.matrix);
      this.pineTrunkInst.instanceMatrix.needsUpdate = true;
      this.pineFoliageInst.instanceMatrix.needsUpdate = true;
    }

    if (broadcast) {
      this.ctx.network.broadcastWorldEvent('tree_chop', this.id, {
        treeId: tree.id,
        x: tree.x,
        z: tree.z,
        dx: pushDir.x,
        dz: pushDir.z
      });
    }

    const dir = pushDir.clone().setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
    dir.normalize();
    const axis = new THREE.Vector3().crossVectors(WORLD_UP, dir).normalize();

    // Compute slope-aware ground impact angle
    const tipDist = 8.5 * tree.scale;
    const tipGroundY = this.sampleHeightOnly(tree.x + dir.x * tipDist, tree.z + dir.z * tipDist, false).height;
    const dy = tipGroundY - tree.y;
    const maxTilt = Math.max(1.15, Math.min(1.85, Math.PI * 0.5 - Math.atan2(dy, tipDist)));

    const group = new THREE.Group();
    group.position.set(tree.x, tree.y, tree.z);

    const inner = new THREE.Group();
    inner.rotation.y = tree.rotY;
    inner.scale.setScalar(tree.scale);

    const trunkMesh = new THREE.Mesh(this.pineTrunkGeo, this.barkMat);
    trunkMesh.castShadow = true;
    const foliageMesh = new THREE.Mesh(this.pineFoliageGeo, this.pineStaticFoliageMat);
    foliageMesh.castShadow = true;
    inner.add(trunkMesh, foliageMesh);
    group.add(inner);
    this.worldRoot.add(group);

    this.fallingTrees.push({
      group,
      origin: new THREE.Vector3(tree.x, tree.y, tree.z),
      fallAxis: axis,
      fallDir: dir,
      height: 10.5 * tree.scale,
      tiltAngle: 0.04,
      angVel: 0.55,
      maxTilt,
      bounced: false,
      settleTimer: 0
    });
  }

  private shatterRock(rock: RockRecord): void {
    this.minedRockIds.add(rock.id);
    const targetInst =
      rock.kind === 'boulder'
        ? this.boulderInst
        : rock.kind === 'iron'
        ? this.ironOreInst
        : this.crystalInst;

    if (rock.slotIndex >= 0) {
      this.dummy.position.set(rock.x, rock.y - 50, rock.z);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      targetInst.setMatrixAt(rock.slotIndex, this.dummy.matrix);
      targetInst.instanceMatrix.needsUpdate = true;
    }

    this.ctx.audio.playTreeChop(true);
    const dropKind: LootDrop['kind'] = rock.kind === 'boulder' ? 'stone' : 'iron';
    const count = rock.kind === 'boulder' ? 3 : 3;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random();
      this.lootDrops.push({
        id: `${rock.id}_drop_${i}`,
        kind: dropKind,
        pos: new THREE.Vector3(rock.x, rock.y + 0.7, rock.z),
        vel: new THREE.Vector3(Math.cos(a) * 2.6, 4.4 + Math.random() * 1.5, Math.sin(a) * 2.6),
        rotY: Math.random() * Math.PI * 2,
        age: 0
      });
    }
    if (rock.kind !== 'boulder') {
      this.lootDrops.push({
        id: `${rock.id}_stone_bonus`,
        kind: 'stone',
        pos: new THREE.Vector3(rock.x, rock.y + 0.8, rock.z),
        vel: new THREE.Vector3(0, 4.8, 0),
        rotY: 0,
        age: 0
      });
    }
  }

  private updateTreeShuddersAndFalls(dt: number): void {
    let treesDirty = false;
    for (const t of this.activeTrees) {
      if (t.shakeTimer > 0 && t.slotIndex >= 0 && !this.choppedTreeIds.has(t.id)) {
        t.shakeTimer = Math.max(0, t.shakeTimer - dt);
        const amp = (t.shakeTimer / 0.38) * 0.085;
        const tilt = Math.sin(t.shakeTimer * 48) * amp;
        this.dummy.position.set(t.x, t.y, t.z);
        this.dummy.rotation.set(tilt, t.rotY, tilt * 0.7);
        this.dummy.scale.setScalar(t.scale);
        this.dummy.updateMatrix();
        this.pineTrunkInst.setMatrixAt(t.slotIndex, this.dummy.matrix);
        this.pineFoliageInst.setMatrixAt(t.slotIndex, this.dummy.matrix);
        treesDirty = true;
      }
    }
    if (treesDirty) {
      this.pineTrunkInst.instanceMatrix.needsUpdate = true;
      this.pineFoliageInst.instanceMatrix.needsUpdate = true;
    }

    // Rock shudders
    const updateRockGroup = (arr: RockRecord[], inst: THREE.InstancedMesh) => {
      let dirty = false;
      for (const r of arr) {
        if (r.shakeTimer > 0 && r.slotIndex >= 0 && !this.minedRockIds.has(r.id)) {
          r.shakeTimer = Math.max(0, r.shakeTimer - dt);
          const j = Math.sin(r.shakeTimer * 55) * 0.08 * (r.shakeTimer / 0.3);
          this.dummy.position.set(r.x + j, r.y, r.z - j);
          this.dummy.rotation.set(0, r.rotY, 0);
          this.dummy.scale.setScalar(r.scale);
          this.dummy.updateMatrix();
          inst.setMatrixAt(r.slotIndex, this.dummy.matrix);
          dirty = true;
        }
      }
      if (dirty) inst.instanceMatrix.needsUpdate = true;
    };
    updateRockGroup(this.activeBoulders, this.boulderInst);
    updateRockGroup(this.activeIrons, this.ironOreInst);
    updateRockGroup(this.activeCrystals, this.crystalInst);

    // Physically tipping & bouncing felled trees
    for (let i = this.fallingTrees.length - 1; i >= 0; i--) {
      const ft = this.fallingTrees[i];
      const angAcc = 7.4 * Math.sin(Math.max(0.08, ft.tiltAngle));
      ft.angVel += angAcc * dt;
      ft.tiltAngle += ft.angVel * dt;

      if (ft.tiltAngle >= ft.maxTilt) {
        ft.tiltAngle = ft.maxTilt;
        if (!ft.bounced) {
          ft.bounced = true;
          ft.angVel = -Math.abs(ft.angVel) * 0.32;
          this.ctx.audio.playTreeChop(false);
          this.ctx.input.vibrate(95, 0.65, 0.35);

          const mid = ft.origin.clone().addScaledVector(ft.fallDir, ft.height * 0.55);
          mid.y = this.sampleHeightOnly(mid.x, mid.z, false).height + 0.4;
          this.spawnParticleBurst(mid, 18, new THREE.Color(0xd6a165), 5.2);
        } else {
          ft.angVel *= 0.4;
          ft.settleTimer += dt;
        }
      }

      ft.group.setRotationFromAxisAngle(ft.fallAxis, ft.tiltAngle);

      if (ft.bounced && ft.settleTimer > 0.35) {
        // Burst felled trunk into 4 collectible 3D Wood Logs!
        for (let k = 0; k < 4; k++) {
          const dist = 1.6 + k * (ft.height * 0.2);
          const lx = ft.origin.x + ft.fallDir.x * dist;
          const lz = ft.origin.z + ft.fallDir.z * dist;
          const ly = this.sampleHeightOnly(lx, lz, false).height + 0.55;
          this.lootDrops.push({
            id: `wood_${Date.now()}_${i}_${k}`,
            kind: 'wood',
            pos: new THREE.Vector3(lx, ly, lz),
            vel: new THREE.Vector3(
              (Math.random() - 0.5) * 2.4,
              3.6 + Math.random() * 1.6,
              (Math.random() - 0.5) * 2.4
            ),
            rotY: Math.atan2(ft.fallDir.z, ft.fallDir.x) + (Math.random() - 0.5) * 0.4,
            age: 0
          });
        }

        this.worldRoot.remove(ft.group);
        this.fallingTrees.splice(i, 1);
      }
    }
  }

  private updateLootDrops(dt: number, elapsed: number): void {
    let wCount = 0;
    let sCount = 0;
    let iCount = 0;
    let collectedWood = 0;
    let collectedStone = 0;
    let collectedIron = 0;

    const playerChest = this.tmpVecA.set(this.playerPos.x, this.playerPos.y + 1.0, this.playerPos.z);

    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const d = this.lootDrops[i];
      d.age += dt;
      d.vel.y -= 14.5 * dt;
      d.pos.addScaledVector(d.vel, dt);

      const groundY = this.sampleHeightOnly(d.pos.x, d.pos.z, false).height + 0.25;
      if (d.pos.y < groundY) {
        d.pos.y = groundY;
        d.vel.y = Math.abs(d.vel.y) * 0.28;
        d.vel.x *= 0.72;
        d.vel.z *= 0.72;
      }

      // Magnetic pull toward player after brief pop
      const dist = d.pos.distanceTo(playerChest);
      if (d.age > 0.35 && dist < 5.5) {
        const pull = this.tmpVecB.subVectors(playerChest, d.pos).normalize();
        d.pos.addScaledVector(pull, dt * (9.5 - dist));
        if (dist < 1.25) {
          if (d.kind === 'wood') collectedWood += 2;
          else if (d.kind === 'stone') collectedStone += 2;
          else collectedIron += 1;
          this.lootDrops.splice(i, 1);
          continue;
        }
      }

      if (d.age > 45) {
        this.lootDrops.splice(i, 1);
        continue;
      }

      const bob = Math.sin(elapsed * 3.5 + i) * 0.08;
      this.dummy.position.set(d.pos.x, d.pos.y + bob, d.pos.z);
      this.dummy.rotation.set(0, d.rotY + elapsed * 1.1, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();

      if (d.kind === 'wood' && wCount < 96) {
        this.woodDropInst.setMatrixAt(wCount++, this.dummy.matrix);
      } else if (d.kind === 'stone' && sCount < 96) {
        this.stoneDropInst.setMatrixAt(sCount++, this.dummy.matrix);
      } else if (d.kind === 'iron' && iCount < 96) {
        this.ironDropInst.setMatrixAt(iCount++, this.dummy.matrix);
      }
    }

    this.woodDropInst.count = wCount;
    this.woodDropInst.instanceMatrix.needsUpdate = true;
    this.stoneDropInst.count = sCount;
    this.stoneDropInst.instanceMatrix.needsUpdate = true;
    this.ironDropInst.count = iCount;
    this.ironDropInst.instanceMatrix.needsUpdate = true;

    if (collectedWood > 0 || collectedStone > 0 || collectedIron > 0) {
      this.woodCount += collectedWood;
      this.stoneCount += collectedStone;
      this.ironCount += collectedIron;
      this.ctx.audio.playUIClick();
      this.refreshToolbar();
    }
  }

  private spawnParticleBurst(origin: THREE.Vector3, count: number, color: THREE.Color, speed: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.pos.copy(origin);
      const a = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.8) * speed;
      p.vel.set(Math.cos(a) * spd, 2.2 + Math.random() * speed * 0.85, Math.sin(a) * spd);
      p.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      p.scale = 0.7 + Math.random() * 0.8;
      p.life = 0;
      p.maxLife = 0.5 + Math.random() * 0.4;
      p.color.copy(color);
      spawned++;
      if (spawned >= count) break;
    }
  }

  private updateParticlesAndFires(dt: number, elapsed: number): void {
    let pCount = 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.vel.y -= 15.0 * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += dt * 7.0;
      p.rot.z += dt * 5.0;
      const fade = 1 - p.life / p.maxLife;
      this.dummy.position.copy(p.pos);
      this.dummy.rotation.copy(p.rot);
      this.dummy.scale.setScalar(p.scale * fade);
      this.dummy.updateMatrix();
      this.particleInst.setMatrixAt(pCount, this.dummy.matrix);
      this.particleInst.setColorAt(pCount, p.color);
      pCount++;
    }
    this.particleInst.count = pCount;
    this.particleInst.instanceMatrix.needsUpdate = true;
    if (this.particleInst.instanceColor) {
      this.particleInst.instanceColor.needsUpdate = true;
    }

    // Update Torch & Campfire animated flames + rising fire sparks
    let flameCount = 0;
    for (const piece of this.placedPieces.values()) {
      if (piece.kind !== 'torch' && piece.kind !== 'campfire') continue;
      if (flameCount >= this.torchFlameInst.instanceMatrix.count) break;

      const fy = piece.kind === 'torch' ? piece.y + 1.82 : piece.y + 0.16;
      const flicker = 0.88 + 0.24 * Math.sin(elapsed * 14.0 + piece.x * 3.1 + piece.z * 1.7);
      const baseScale = piece.kind === 'campfire' ? 1.85 : 0.85;
      this.dummy.position.set(piece.x, fy, piece.z);
      this.dummy.rotation.set(
        Math.sin(elapsed * 9 + piece.x) * 0.12,
        elapsed * 2.0,
        Math.cos(elapsed * 11 + piece.z) * 0.12
      );
      this.dummy.scale.set(baseScale, baseScale * flicker, baseScale);
      this.dummy.updateMatrix();
      this.torchFlameInst.setMatrixAt(flameCount++, this.dummy.matrix);

      // Spawn rising crackling embers from nearby campfires
      if (
        piece.kind === 'campfire' &&
        Math.random() < dt * 22 &&
        Math.hypot(piece.x - this.playerPos.x, piece.z - this.playerPos.z) < 55
      ) {
        for (const fp of this.fireParticles) {
          if (fp.active) continue;
          fp.active = true;
          fp.pos.set(
            piece.x + (Math.random() - 0.5) * 0.55,
            piece.y + 0.3,
            piece.z + (Math.random() - 0.5) * 0.55
          );
          fp.vel.set(
            (Math.random() - 0.5) * 0.7,
            1.6 + Math.random() * 1.8,
            (Math.random() - 0.5) * 0.7
          );
          fp.life = 0;
          fp.maxLife = 0.75 + Math.random() * 0.65;
          fp.scale = 0.55 + Math.random() * 0.65;
          break;
        }
      }
    }
    this.torchFlameInst.count = flameCount;
    this.torchFlameInst.instanceMatrix.needsUpdate = true;

    let fpCount = 0;
    for (const fp of this.fireParticles) {
      if (!fp.active) continue;
      fp.life += dt;
      if (fp.life >= fp.maxLife) {
        fp.active = false;
        continue;
      }
      fp.pos.addScaledVector(fp.vel, dt);
      fp.pos.x += Math.sin(elapsed * 8 + fp.life * 6) * dt * 0.35;
      const s = fp.scale * (1 - fp.life / fp.maxLife);
      this.dummy.position.copy(fp.pos);
      this.dummy.rotation.set(fp.life * 4, fp.life * 3, 0);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.fireParticleInst.setMatrixAt(fpCount++, this.dummy.matrix);
    }
    this.fireParticleInst.count = fpCount;
    this.fireParticleInst.instanceMatrix.needsUpdate = true;
  }

  private updateCampfireLightsAndAura(dt: number, elapsed: number): void {
    const emitters: Array<{ piece: PlacedBuildPiece; distSq: number }> = [];
    let closestCampfireSq = Number.POSITIVE_INFINITY;

    for (const p of this.placedPieces.values()) {
      if (p.kind !== 'torch' && p.kind !== 'campfire') continue;
      const dSq = (p.x - this.playerPos.x) ** 2 + (p.z - this.playerPos.z) ** 2;
      emitters.push({ piece: p, distSq: dSq });
      if (p.kind === 'campfire' && dSq < closestCampfireSq) {
        closestCampfireSq = dSq;
      }
    }

    emitters.sort((a, b) => a.distSq - b.distSq);

    for (let i = 0; i < this.warmLights.length; i++) {
      const light = this.warmLights[i];
      if (i < emitters.length && emitters[i].distSq < 68 * 68) {
        const em = emitters[i].piece;
        const isFire = em.kind === 'campfire';
        light.visible = true;
        light.position.set(em.x, em.y + (isFire ? 0.95 : 2.05), em.z);
        const flicker = Math.sin(elapsed * 13.5 + i * 2.1) * 0.45 + Math.cos(elapsed * 21.0 + i) * 0.25;
        light.intensity = (isFire ? 4.8 : 2.9) + flicker;
        light.distance = isFire ? 20 : 13;
      } else {
        light.visible = false;
      }
    }

    // Campfire Warmth & Heal Aura within 8.5 meters!
    this.nearWarmth = closestCampfireSq <= 8.5 * 8.5;
    if (this.nearWarmth && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + dt * 6.5);
    }
  }

  private updateBuildGhostAndActions(elapsed: number): void {
    this.ghostMat.uniforms.uTime.value = elapsed;

    // Aim ray from camera forward to terrain / existing structures
    const camPos = this.ctx.camera.position;
    const camDir = new THREE.Vector3();
    this.ctx.camera.getWorldDirection(camDir);

    let hitPoint: THREE.Vector3 | null = null;
    for (let dist = 2.5; dist <= 15.0; dist += 0.45) {
      const px = camPos.x + camDir.x * dist;
      const py = camPos.y + camDir.y * dist;
      const pz = camPos.z + camDir.z * dist;
      const groundY = this.getSupportHeight(px, pz, py + 2.0).y;
      if (py <= groundY + 0.12) {
        hitPoint = new THREE.Vector3(px, groundY, pz);
        break;
      }
    }
    if (!hitPoint) {
      const fallbackX = this.playerPos.x + Math.sin(this.playerYaw) * 5.0;
      const fallbackZ = this.playerPos.z + Math.cos(this.playerYaw) * 5.0;
      hitPoint = new THREE.Vector3(
        fallbackX,
        this.getSupportHeight(fallbackX, fallbackZ, this.playerPos.y + 2).y,
        fallbackZ
      );
    }

    // Check closest existing piece near aim point for Right-Click / Bulldoze removal
    this.hoveredRemoveId = null;
    let bestRemDist = 2.8;
    for (const p of this.placedPieces.values()) {
      const d = Math.hypot(p.x - hitPoint.x, p.z - hitPoint.z);
      if (d < bestRemDist && Math.abs(p.y - hitPoint.y) < 3.6) {
        bestRemDist = d;
        this.hoveredRemoveId = p.id;
      }
    }

    const inp = this.ctx.input.state;
    const wantsRemove =
      inp.secondaryJustPressed || (this.bulldozeMode && inp.primaryJustPressed);
    if (wantsRemove && this.hoveredRemoveId) {
      const rem = this.placedPieces.get(this.hoveredRemoveId);
      if (rem) {
        this.placedPieces.delete(rem.id);
        this.woodCount += 1;
        this.rebuildBuildInstances();
        this.savePersistedBuilds();
        this.ctx.audio.playBuildSnap();
        this.ctx.network.broadcastWorldEvent('block_remove', this.id, { id: rem.id });
        this.refreshToolbar();
      }
      return;
    }

    if (this.bulldozeMode) {
      this.ghostGroup.visible = false;
      return;
    }

    // Grid & Edge Snapping for Modular Viking Architecture
    const kind = this.selectedBuildKind;
    const grid = 4.0;
    let gx = Math.round(hitPoint.x / grid) * grid;
    let gz = Math.round(hitPoint.z / grid) * grid;
    let gy = this.sampleHeightOnly(gx, gz, false).height;
    let rotY = (this.buildRotSteps * Math.PI) * 0.25;

    // Check highest foundation / wall in the 4x4 cell
    let cellBaseY: number | null = null;
    let cellTopWallY: number | null = null;
    for (const p of this.placedPieces.values()) {
      if (Math.hypot(p.x - gx, p.z - gz) < 2.6) {
        if (p.kind === 'foundation' || p.kind === 'bridge') {
          cellBaseY = cellBaseY === null ? p.y : Math.max(cellBaseY, p.y);
        } else if (p.kind === 'wall') {
          cellTopWallY = cellTopWallY === null ? p.y + 3.0 : Math.max(cellTopWallY, p.y + 3.0);
        }
      }
    }

    if (kind === 'foundation' || kind === 'bridge') {
      rotY = (this.buildRotSteps % 4) * (Math.PI * 0.5);
      gy = Math.max(WATER_LEVEL + 0.65, gy + 0.35);
      if (cellBaseY !== null && hitPoint.y > cellBaseY + 1.2) {
        gy = cellBaseY + 3.0;
      } else if (cellBaseY !== null) {
        gy = cellBaseY;
      }
    } else if (kind === 'wall') {
      const edgeIdx = this.buildRotSteps % 4;
      rotY = (edgeIdx % 2 === 0 ? 0 : Math.PI * 0.5);
      if (edgeIdx === 0) gz -= 2.0;
      else if (edgeIdx === 1) gx += 2.0;
      else if (edgeIdx === 2) gz += 2.0;
      else gx -= 2.0;
      gy = cellBaseY !== null ? cellBaseY : this.sampleHeightOnly(gx, gz, false).height;
    } else if (kind === 'roof') {
      rotY = (this.buildRotSteps % 4) * (Math.PI * 0.5);
      if (cellTopWallY !== null) gy = cellTopWallY;
      else if (cellBaseY !== null) gy = cellBaseY + 3.0;
      else gy += 2.8;
    } else {
      // Torches & Campfires use fine 0.5m placement
      gx = Math.round(hitPoint.x * 2) * 0.5;
      gz = Math.round(hitPoint.z * 2) * 0.5;
      gy = this.getSupportHeight(gx, gz, hitPoint.y + 1.5).y;
    }

    this.ghostTargetPos.set(gx, gy, gz);
    this.ghostTargetRotY = rotY;

    const spec = BUILD_CATALOG.find((b) => b.kind === kind)!;
    this.ghostValid = this.woodCount >= spec.woodCost && this.stoneCount >= spec.stoneCost;
    this.ghostMat.uniforms.uColor.value.setHex(this.ghostValid ? 0x66f2a5 : 0xff5a5f);

    this.ghostGroup.visible = true;
    this.ghostGroup.position.copy(this.ghostTargetPos);
    this.ghostGroup.rotation.set(0, this.ghostTargetRotY, 0);
    for (const k of Object.keys(this.ghostMeshes) as BuildPieceKind[]) {
      this.ghostMeshes[k].visible = k === kind;
    }

    if (inp.primaryJustPressed) {
      if (!this.ghostValid) {
        this.ctx.ui.notify(
          'Ressources Insuffisantes',
          `Il faut ${spec.woodCost} Bois${spec.stoneCost ? ` et ${spec.stoneCost} Pierre` : ''} ! Abattez un pin ou minez un rocher.`,
          'warning'
        );
        return;
      }

      this.woodCount -= spec.woodCost;
      this.stoneCount -= spec.stoneCost;

      const newPiece: PlacedBuildPiece = {
        id: `blk_${this.ctx.network.selfPeerId.slice(0, 5)}_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        kind,
        x: Number(this.ghostTargetPos.x.toFixed(2)),
        y: Number(this.ghostTargetPos.y.toFixed(2)),
        z: Number(this.ghostTargetPos.z.toFixed(2)),
        rotY: Number(this.ghostTargetRotY.toFixed(3))
      };

      this.placedPieces.set(newPiece.id, newPiece);
      this.rebuildBuildInstances();
      this.savePersistedBuilds();
      this.ctx.audio.playBuildSnap();
      this.ctx.input.vibrate(55, 0.45, 0.25);
      this.spawnParticleBurst(
        new THREE.Vector3(newPiece.x, newPiece.y + 0.6, newPiece.z),
        10,
        new THREE.Color(0x66f2a5),
        3.5
      );

      this.ctx.network.broadcastWorldEvent('block_place', this.id, {
        id: newPiece.id,
        kind: newPiece.kind,
        x: newPiece.x,
        y: newPiece.y,
        z: newPiece.z,
        rotY: newPiece.rotY
      });
      this.refreshToolbar();
    }
  }

  private spawnNightWraith(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 14;
    const sx = this.playerPos.x + Math.cos(angle) * dist;
    const sz = this.playerPos.z + Math.sin(angle) * dist;
    const sy = Math.max(WATER_LEVEL + 0.2, this.sampleHeightOnly(sx, sz, false).height);

    const isElder = Math.random() < 0.25;
    const scale = isElder ? 1.38 : 1.0;

    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const body = new THREE.Mesh(this.wraithTorsoGeo, this.wraithBodyMat);
    body.castShadow = true;
    group.add(body);

    const eyeGeo = this.trackDisposable(new THREE.SphereGeometry(0.055, 6, 6));
    const eyeL = new THREE.Mesh(eyeGeo, this.wraithEyeMat);
    eyeL.position.set(-0.1, 1.98, 0.34);
    const eyeR = new THREE.Mesh(eyeGeo, this.wraithEyeMat);
    eyeR.position.set(0.1, 1.98, 0.34);
    const runeCore = new THREE.Mesh(eyeGeo, this.wraithEyeMat);
    runeCore.scale.setScalar(2.1);
    runeCore.position.set(0, 1.28, 0.28);
    group.add(eyeL, eyeR, runeCore);

    const leftArm = new THREE.Mesh(this.wraithLimbGeo, this.wraithBodyMat);
    leftArm.position.set(-0.52, 1.52, 0);
    const rightArm = new THREE.Mesh(this.wraithLimbGeo, this.wraithBodyMat);
    rightArm.position.set(0.52, 1.52, 0);
    const leftLeg = new THREE.Mesh(this.wraithLimbGeo, this.wraithBodyMat);
    leftLeg.position.set(-0.2, 0.72, 0);
    const rightLeg = new THREE.Mesh(this.wraithLimbGeo, this.wraithBodyMat);
    rightLeg.position.set(0.2, 0.72, 0);
    group.add(leftArm, rightArm, leftLeg, rightLeg);

    group.position.set(sx, sy, sz);
    this.worldRoot.add(group);

    this.wraiths.push({
      id: `wraith_${Date.now()}_${Math.random()}`,
      group,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      pos: new THREE.Vector3(sx, sy, sz),
      vel: new THREE.Vector3(),
      yaw: 0,
      hp: isElder ? 110 : 65,
      maxHp: isElder ? 110 : 65,
      attackCooldown: 0.8,
      hitFlash: 0,
      animPhase: Math.random() * 6.28,
      isElder
    });
  }

  private killWraith(index: number): void {
    const w = this.wraiths[index];
    if (!w) return;
    this.wraithKills++;
    this.spawnParticleBurst(
      new THREE.Vector3(w.pos.x, w.pos.y + 1.2, w.pos.z),
      20,
      new THREE.Color(0x4bf5ff),
      6.0
    );
    this.lootDrops.push({
      id: `${w.id}_wood`,
      kind: 'wood',
      pos: w.pos.clone().add(new THREE.Vector3(0, 0.8, 0)),
      vel: new THREE.Vector3(1.5, 4.2, -1.2),
      rotY: 0,
      age: 0
    });
    if (w.isElder) {
      this.lootDrops.push({
        id: `${w.id}_iron`,
        kind: 'iron',
        pos: w.pos.clone().add(new THREE.Vector3(0, 0.9, 0)),
        vel: new THREE.Vector3(-1.4, 4.6, 1.4),
        rotY: 0,
        age: 0
      });
    }
    this.worldRoot.remove(w.group);
    this.wraiths.splice(index, 1);
  }

  private updateNightWraiths(dt: number, isNight: boolean): void {
    if (isNight) {
      this.wraithSpawnTimer -= dt;
      if (this.wraithSpawnTimer <= 0 && this.wraiths.length < 6) {
        this.wraithSpawnTimer = 5.5;
        this.spawnNightWraith();
      }
    } else if (this.wraiths.length > 0) {
      // Burn & dissolve remaining night wraiths in morning sunlight
      for (let i = this.wraiths.length - 1; i >= 0; i--) {
        this.wraiths[i].hp -= dt * 35;
        if (this.wraiths[i].hp <= 0) {
          this.killWraith(i);
        }
      }
    }

    for (let i = this.wraiths.length - 1; i >= 0; i--) {
      const w = this.wraiths[i];
      if (!w) continue;

      if (w.pos.distanceTo(this.playerPos) > 110) {
        this.worldRoot.remove(w.group);
        this.wraiths.splice(i, 1);
        continue;
      }

      // Target player or nearest Campfire if closer
      let targetX = this.playerPos.x;
      let targetZ = this.playerPos.z;
      let bestDist = Math.hypot(targetX - w.pos.x, targetZ - w.pos.z);

      for (const p of this.placedPieces.values()) {
        if (p.kind !== 'campfire') continue;
        const cd = Math.hypot(p.x - w.pos.x, p.z - w.pos.z);
        if (cd < bestDist * 0.7) {
          bestDist = cd;
          targetX = p.x;
          targetZ = p.z;
        }
      }

      const dx = targetX - w.pos.x;
      const dz = targetZ - w.pos.z;
      const dist = Math.max(0.01, Math.hypot(dx, dz));
      w.yaw = Math.atan2(dx, dz);

      const moveSpeed = w.isElder ? 3.8 : 4.5;
      if (dist > 1.75) {
        w.vel.x += ((dx / dist) * moveSpeed - w.vel.x) * Math.min(1, dt * 6);
        w.vel.z += ((dz / dist) * moveSpeed - w.vel.z) * Math.min(1, dt * 6);
      } else {
        w.vel.x *= Math.max(0, 1 - dt * 8);
        w.vel.z *= Math.max(0, 1 - dt * 8);
      }

      w.vel.y -= 18.0 * dt;
      w.pos.addScaledVector(w.vel, dt);
      const groundY = this.sampleHeightOnly(w.pos.x, w.pos.z, false).height;
      if (w.pos.y < groundY) {
        w.pos.y = groundY;
        if (w.vel.y < 0) w.vel.y = 0;
      }

      // Articulated Stalk & Claw Lunge Animation
      w.animPhase += dt * 7.5;
      w.attackCooldown = Math.max(0, w.attackCooldown - dt);
      w.hitFlash = Math.max(0, w.hitFlash - dt);

      const swing = Math.sin(w.animPhase) * 0.65;
      w.leftLeg.rotation.x = swing;
      w.rightLeg.rotation.x = -swing;
      w.leftArm.rotation.x = -0.55 - swing * 0.6;
      w.rightArm.rotation.x = -0.55 + swing * 0.6;

      // Melee strike against player
      const playerDist = w.pos.distanceTo(this.playerPos);
      if (playerDist < 2.05 && w.attackCooldown <= 0) {
        w.attackCooldown = 1.45;
        w.leftArm.rotation.x = -1.75;
        w.rightArm.rotation.x = -1.75;
        this.health = Math.max(0, this.health - (w.isElder ? 14 : 9));
        this.ctx.audio.playTreeChop(false);
        this.ctx.input.vibrate(110, 0.7, 0.4);

        if (this.health <= 0) {
          this.health = this.maxHealth;
          const sp = this.evaluateTerrain(0, 10);
          this.playerPos.set(0, sp.height + 0.5, 10);
          this.ctx.ui.notify(
            'Régénération d’Odin',
            'Les Valkyries vous ramènent au Sanctuaire du Feu de Camp.',
            'info'
          );
        }
      }

      w.group.position.copy(w.pos);
      w.group.rotation.set(w.hitFlash > 0 ? -0.28 : 0, w.yaw, 0);
    }
  }

  public onWorldEvent(event: NetWorldEventPacket): void {
    if (event.senderId === this.ctx.network.selfPeerId) return;

    if (event.type === 'block_place') {
      const id = String(event.payload.id ?? '');
      const kind = event.payload.kind as BuildPieceKind;
      if (!id || !kind) return;
      const piece: PlacedBuildPiece = {
        id,
        kind,
        x: Number(event.payload.x ?? 0),
        y: Number(event.payload.y ?? 0),
        z: Number(event.payload.z ?? 0),
        rotY: Number(event.payload.rotY ?? 0)
      };
      this.placedPieces.set(id, piece);
      this.rebuildBuildInstances();
      this.savePersistedBuilds();
      this.ctx.audio.playBuildSnap();
    } else if (event.type === 'block_remove') {
      const id = String(event.payload.id ?? '');
      if (this.placedPieces.delete(id)) {
        this.rebuildBuildInstances();
        this.savePersistedBuilds();
        this.ctx.audio.playBuildSnap();
      }
    } else if (event.type === 'tree_chop') {
      const treeId = String(event.payload.treeId ?? '');
      const found = this.activeTrees.find((t) => t.id === treeId);
      if (found) {
        const dir = new THREE.Vector3(
          Number(event.payload.dx ?? 1),
          0,
          Number(event.payload.dz ?? 0)
        );
        this.fellTree(found, dir, false);
      } else if (treeId) {
        this.choppedTreeIds.add(treeId);
      }
    }
  }

  public getMinimapMarkers(): MinimapMarker[] {
    const markers: MinimapMarker[] = [
      {
        id: 'crystal_sanctuary',
        x: -52,
        z: -18,
        color: '#4af2ff',
        type: 'poi',
        label: 'Cristal Runique'
      },
      {
        id: 'alpine_peak',
        x: 0,
        z: -95,
        color: '#e5f4ff',
        type: 'poi',
        label: 'Pic Alpin'
      },
      {
        id: 'golden_beach',
        x: -18,
        z: 72,
        color: '#ffd166',
        type: 'poi',
        label: 'Plage Dorée'
      }
    ];

    let campfireIdx = 0;
    for (const p of this.placedPieces.values()) {
      if (p.kind === 'campfire' && campfireIdx < 6) {
        campfireIdx++;
        markers.push({
          id: `fire_${p.id}`,
          x: p.x,
          z: p.z,
          color: '#ff9238',
          type: 'objective',
          label: 'Feu de Camp'
        });
      }
    }

    for (const w of this.wraiths) {
      markers.push({
        id: w.id,
        x: w.pos.x,
        z: w.pos.z,
        color: '#ff495c',
        type: 'danger',
        label: 'Greydwarf'
      });
    }

    return markers;
  }

  public dispose(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.unsubQuality) {
      this.unsubQuality();
      this.unsubQuality = null;
    }
    if (this.prevSceneAfterRender) {
      this.ctx.scene.onAfterRender = this.prevSceneAfterRender;
      this.prevSceneAfterRender = null;
    }

    this.ctx.ui.setWorldToolbarHTML('');

    for (const chunk of this.chunks.values()) {
      chunk.geometry.dispose();
    }
    this.chunks.clear();

    for (const qMesh of this.quadrantMeshes) {
      qMesh?.geometry.dispose();
    }
    this.quadrantMeshes = [null, null, null, null];

    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.windHandles = [];

    this.fallingTrees = [];
    this.wraiths = [];
    this.lootDrops = [];
    this.warmLights = [];

    this.ctx.scene.remove(this.worldRoot);
    this.worldRoot.clear();
  }
}
