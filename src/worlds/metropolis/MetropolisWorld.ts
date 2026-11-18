import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {
  EngineContext,
  MinimapMarker,
  NetWorldEventPacket,
  RadialWheelItem,
  WorldInterface
} from '../../core/types';
import { WORLD_CATALOG } from '../../core/types';
import { SeededRandom } from '../../core/math/Noise';
import { TileCacheDB } from '../../core/systems/TileCacheDB';
import {
  applyWindSwayToMaterial,
  createGerstnerOceanMaterial,
  createInteriorMappingMaterial,
  createWetAsphaltMaterial,
  updateInteriorMaterial,
  updateOceanMaterial
} from '../../core/graphics/Shaders';
import {
  RaycastVehicle,
  TireSmokePool,
  type BuildingColliderAABB,
  type MetropolisVehicleKind
} from './RaycastVehicle';

interface OSMBuildingData {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  angle: number;
  name?: string;
  kind?: string;
}

interface OSMRoadData {
  points: Array<[number, number]>;
  width: number;
}

interface OSMParkData {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface OSMWaterData {
  points: Array<[number, number]>;
  width: number;
}

interface OSMPOIData {
  x: number;
  z: number;
  name: string;
  category: string;
}

interface ParsedCityPayload {
  buildings: OSMBuildingData[];
  roads: OSMRoadData[];
  parks: OSMParkData[];
  water: OSMWaterData[];
  pois: OSMPOIData[];
}

interface CityPreset {
  id: string;
  name: string;
  lat: number;
  lon: number;
  landmark: 'paris' | 'lyon' | 'tokyo' | 'nyc' | 'london' | 'dubai' | 'generic';
}

const CITY_PRESETS: ReadonlyArray<CityPreset> = [
  { id: 'paris', name: 'Paris', lat: 48.8584, lon: 2.2945, landmark: 'paris' },
  { id: 'lyon', name: 'Lyon', lat: 45.7640, lon: 4.8357, landmark: 'lyon' },
  { id: 'tokyo', name: 'Tokyo', lat: 35.6595, lon: 139.7004, landmark: 'tokyo' },
  { id: 'nyc', name: 'New York', lat: 40.7580, lon: -73.9855, landmark: 'nyc' },
  { id: 'london', name: 'London', lat: 51.5074, lon: -0.1278, landmark: 'london' },
  { id: 'dubai', name: 'Dubai', lat: 25.1972, lon: 55.2744, landmark: 'dubai' }
];

interface TrafficAgent {
  roadIdx: number;
  segIdx: number;
  t: number;
  speed: number;
  dir: 1 | -1;
  laneOffset: number;
  x: number;
  z: number;
  yaw: number;
}

interface PedestrianAgent {
  roadIdx: number;
  segIdx: number;
  t: number;
  speed: number;
  dir: 1 | -1;
  sideOffset: number;
  phase: number;
  x: number;
  z: number;
  yaw: number;
}

interface DeliveryMission {
  stage: 'pickup' | 'dropoff';
  pickupPos: THREE.Vector3;
  dropoffPos: THREE.Vector3;
  pickupLabel: string;
  dropoffLabel: string;
  timeRemaining: number;
  reward: number;
}

const PENTHOUSE_POS = new THREE.Vector3(-34, 0, -28);
const PENTHOUSE_HEIGHT = 46;
const PENTHOUSE_PRICE = 2500;

function ensureNonIndexedAttributes(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIdx = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!nonIdx.getAttribute('normal')) {
    nonIdx.computeVertexNormals();
  }
  if (!nonIdx.getAttribute('uv')) {
    const count = nonIdx.getAttribute('position').count;
    nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return nonIdx;
}

function mergeAndDisposeTemp(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;
  const prepared = geos.map(ensureNonIndexedAttributes);
  for (const g of geos) g.dispose();
  const merged = mergeGeometries(prepared, false);
  for (const p of prepared) p.dispose();
  return merged;
}

function hashCitySeed(lat: number, lon: number): number {
  const a = Math.round((lat + 90) * 10000);
  const b = Math.round((lon + 180) * 10000);
  return ((Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0) || 133742;
}

export class MetropolisWorld implements WorldInterface {
  public readonly id = 'metropolis' as const;
  public readonly metadata = WORLD_CATALOG[0];

  private ctx!: EngineContext;
  private readonly worldRoot = new THREE.Group();
  private readonly cityGroup = new THREE.Group();
  private readonly dynamicGroup = new THREE.Group();

  private osmWorker: Worker | null = null;
  private workerReqCounter = 1;
  private readonly pendingWorkerRequests = new Map<
    number,
    { resolve: (data: ParsedCityPayload) => void; timer: ReturnType<typeof setTimeout> }
  >();

  private currentCityName = 'Paris';
  private currentLat = 48.8584;
  private currentLon = 2.2945;
  private manualTimeOverride = false;
  private cityLoadGeneration = 0;

  // Player & economy state
  private readonly playerPos = new THREE.Vector3(0, 0, 10);
  private readonly playerVel = new THREE.Vector3();
  private playerYaw = 0;
  private playerGrounded = true;
  private footstepAccum = 0;
  private credits = 3200;
  private ownsPenthouse = false;
  private passiveIncomeTimer = 0;
  private firstPersonCam = false;

  // Vehicles
  private readonly vehicles: RaycastVehicle[] = [];
  private activeVehicle: RaycastVehicle | null = null;
  private smokePool: TireSmokePool | null = null;

  // Colliders & city layout
  private readonly buildingColliders: BuildingColliderAABB[] = [];
  private activeRoads: OSMRoadData[] = [];
  private activePOIs: OSMPOIData[] = [];

  // Shader / Dynamic materials
  private glassInteriorMat: ReturnType<typeof createInteriorMappingMaterial> | null = null;
  private brickInteriorMat: ReturnType<typeof createInteriorMappingMaterial> | null = null;
  private wetAsphaltMat: ReturnType<typeof createWetAsphaltMaterial> | null = null;
  private riverOceanMat: ReturnType<typeof createGerstnerOceanMaterial> | null = null;
  private windSwayHandle: { update(time: number): void } | null = null;
  private streetlightBulbMat: THREE.MeshStandardMaterial | null = null;
  private poiSignMesh: THREE.Mesh | null = null;
  private poiAtlasTexture: THREE.CanvasTexture | null = null;

  // Weather state & GPU particle system
  private wetness = 0.25;
  private weatherKind: 'clear' | 'rain' | 'snow' | 'fog' | 'cloudy' | 'storm' = 'clear';
  private weatherIntensity = 0;
  private weatherLabel = 'Paris • 19°C • Ciel Dégagé';
  private weatherParticlesMesh: THREE.InstancedMesh | null = null;
  private weatherParticleMat: THREE.MeshStandardMaterial | null = null;
  private readonly weatherSeeds = new Float32Array(900 * 3);

  // AI Traffic & Pedestrians (InstancedMesh)
  private trafficBodyMesh: THREE.InstancedMesh | null = null;
  private trafficLightMesh: THREE.InstancedMesh | null = null;
  private readonly trafficAgents: TrafficAgent[] = [];

  private pedBodyMesh: THREE.InstancedMesh | null = null;
  private pedHeadMesh: THREE.InstancedMesh | null = null;
  private readonly pedAgents: PedestrianAgent[] = [];

  // Missions & Penthouse interactive markers
  private mission: DeliveryMission | null = null;
  private missionBeaconMesh: THREE.Mesh | null = null;
  private missionRingMesh: THREE.Mesh | null = null;
  private gpsRibbonMesh: THREE.Mesh | null = null;
  private gpsRibbonGeo: THREE.BufferGeometry | null = null;
  private gpsRoutePoints: Array<{ x: number; z: number }> = [];
  private penthouseBeaconMat: THREE.MeshStandardMaterial | null = null;

  // Disposables tracking
  private readonly cityGeometries: THREE.BufferGeometry[] = [];
  private readonly cityMaterials: THREE.Material[] = [];
  private readonly persistentGeometries: THREE.BufferGeometry[] = [];
  private readonly persistentMaterials: THREE.Material[] = [];

  private readonly dummy = new THREE.Object3D();
  private readonly tempVecA = new THREE.Vector3();
  private readonly tempVecB = new THREE.Vector3();

  async load(ctx: EngineContext, options?: Record<string, string | number>): Promise<void> {
    this.ctx = ctx;
    this.ctx.scene.add(this.worldRoot);
    this.worldRoot.add(this.cityGroup);
    this.worldRoot.add(this.dynamicGroup);

    this.ctx.sky.setSpaceBlend(0);
    this.ctx.sky.setTimeOfDay(16.5);
    this.ctx.sky.setWeather('clear', 0.15);
    this.ctx.audio.setWorldSoundscape('metropolis');
    this.ctx.input.setContextMode('ON_FOOT');
    this.ctx.ui.setFighterHUDVisible(false);

    // Ensure local avatar is in scene and configured for urban exploration
    if (!this.ctx.localAvatar.root.parent) {
      this.ctx.scene.add(this.ctx.localAvatar.root);
    }
    this.ctx.localAvatar.root.visible = true;
    this.ctx.localAvatar.root.up.set(0, 1, 0);
    this.ctx.localAvatar.setEquippedTool('none');
    this.ctx.localAvatar.setParagliderVisible(false);
    this.ctx.localAvatar.setJetpackFlame(0);
    this.ctx.camera.up.set(0, 1, 0);

    // Initialize OSM Web Worker
    this.initWorker();

    // Initialize shared Tire Smoke Pool & Weather Particle Pool & Mission Beacons
    this.smokePool = new TireSmokePool(112);
    this.dynamicGroup.add(this.smokePool.mesh);
    this.initWeatherParticleSystem();
    this.initMissionVisuals();
    this.setupRadialMenu();
    this.setupToolbarUI();

    if (options && typeof options.lat === 'number' && typeof options.lon === 'number') {
      this.currentLat = options.lat;
      this.currentLon = options.lon;
      if (typeof options.city === 'string') this.currentCityName = options.city;
    }

    this.ctx.ui.setLoading(true, `Reconstruction 3D OSM 1:1 — ${this.currentCityName}...`, 0.25);
    await this.loadCityAtCoordinates(this.currentCityName, this.currentLat, this.currentLon, false);
    this.ctx.ui.setLoading(false);
  }

  private normalizePointList(pts: unknown): Array<[number, number]> {
    if (!Array.isArray(pts)) return [];
    const out: Array<[number, number]> = [];
    for (const pt of pts) {
      if (Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
        out.push([pt[0], pt[1]]);
      } else if (pt && typeof pt === 'object') {
        const rec = pt as Record<string, unknown>;
        if (typeof rec.x === 'number' && typeof rec.z === 'number') {
          out.push([rec.x, rec.z]);
        }
      }
    }
    return out;
  }

  private normalizeCityPayload(raw: Record<string, unknown>): ParsedCityPayload {
    const buildings: OSMBuildingData[] = [];
    if (Array.isArray(raw.buildings)) {
      for (const item of raw.buildings) {
        if (!item || typeof item !== 'object') continue;
        const b = item as Record<string, unknown>;
        const x = typeof b.x === 'number' ? b.x : typeof b.centerX === 'number' ? b.centerX : 0;
        const z = typeof b.z === 'number' ? b.z : typeof b.centerZ === 'number' ? b.centerZ : 0;
        const w = typeof b.w === 'number' ? b.w : typeof b.width === 'number' ? b.width : 16;
        const d = typeof b.d === 'number' ? b.d : typeof b.depth === 'number' ? b.depth : 16;
        const h = typeof b.h === 'number' ? b.h : typeof b.height === 'number' ? b.height : 20;
        const angle = typeof b.angle === 'number' ? b.angle : 0;
        const name = typeof b.name === 'string' && b.name.length > 0 ? b.name : undefined;
        const kind =
          typeof b.kind === 'string'
            ? b.kind
            : typeof b.style === 'string'
              ? b.style
              : undefined;
        buildings.push({ x, z, w, d, h, angle, name, kind });
      }
    }

    const roads: OSMRoadData[] = [];
    if (Array.isArray(raw.roads)) {
      for (const item of raw.roads) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const points = this.normalizePointList(r.points);
        if (points.length >= 2) {
          roads.push({
            points,
            width: typeof r.width === 'number' ? r.width : 10
          });
        }
      }
    }

    const parks: OSMParkData[] = [];
    if (Array.isArray(raw.parks)) {
      for (const item of raw.parks) {
        if (!item || typeof item !== 'object') continue;
        const p = item as Record<string, unknown>;
        parks.push({
          x: typeof p.x === 'number' ? p.x : typeof p.centerX === 'number' ? p.centerX : 0,
          z: typeof p.z === 'number' ? p.z : typeof p.centerZ === 'number' ? p.centerZ : 0,
          w: typeof p.w === 'number' ? p.w : typeof p.width === 'number' ? p.width : 36,
          d: typeof p.d === 'number' ? p.d : typeof p.depth === 'number' ? p.depth : 36
        });
      }
    }

    const water: OSMWaterData[] = [];
    if (Array.isArray(raw.water)) {
      for (const item of raw.water) {
        if (!item || typeof item !== 'object') continue;
        const w = item as Record<string, unknown>;
        const points = this.normalizePointList(w.points);
        if (points.length >= 2) {
          water.push({
            points,
            width: typeof w.width === 'number' ? w.width : 28
          });
        }
      }
    }

    const pois: OSMPOIData[] = [];
    if (Array.isArray(raw.pois)) {
      for (const item of raw.pois) {
        if (!item || typeof item !== 'object') continue;
        const poi = item as Record<string, unknown>;
        if (typeof poi.x === 'number' && typeof poi.z === 'number') {
          pois.push({
            x: poi.x,
            z: poi.z,
            name: typeof poi.name === 'string' && poi.name.length > 0 ? poi.name : 'Commerce',
            category: typeof poi.category === 'string' ? poi.category : 'shop'
          });
        }
      }
    }

    return { buildings, roads, parks, water, pois };
  }

  private initWorker(): void {
    try {
      this.osmWorker = new Worker(new URL('../../workers/osmTerrainWorker.ts', import.meta.url), {
        type: 'module'
      });
      this.osmWorker.onmessage = (ev: MessageEvent) => {
        const msg = ev.data as Record<string, unknown> | null;
        if (!msg || typeof msg.id !== 'number') return;
        const pending = this.pendingWorkerRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingWorkerRequests.delete(msg.id);
          pending.resolve(this.normalizeCityPayload(msg));
        }
      };
      this.osmWorker.onerror = () => {
        for (const [id, pending] of this.pendingWorkerRequests.entries()) {
          clearTimeout(pending.timer);
          this.pendingWorkerRequests.delete(id);
          pending.resolve(this.buildLocalEmergencyCity(this.currentLat, this.currentLon));
        }
      };
    } catch {
      this.osmWorker = null;
    }
  }

  private callWorker(payload: Record<string, unknown>, timeoutMs = 2600): Promise<ParsedCityPayload> {
    if (!this.osmWorker) {
      return Promise.resolve(this.buildLocalEmergencyCity(this.currentLat, this.currentLon));
    }
    const id = this.workerReqCounter++;
    return new Promise<ParsedCityPayload>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingWorkerRequests.delete(id);
        resolve(this.buildLocalEmergencyCity(this.currentLat, this.currentLon));
      }, timeoutMs);
      this.pendingWorkerRequests.set(id, { resolve, timer });
      this.osmWorker!.postMessage({ ...payload, id });
    });
  }

  private buildLocalEmergencyCity(lat: number, lon: number): ParsedCityPayload {
    const rng = new SeededRandom(hashCitySeed(lat, lon));
    const buildings: OSMBuildingData[] = [];
    const roads: OSMRoadData[] = [];
    const parks: OSMParkData[] = [];
    const water: OSMWaterData[] = [];
    const pois: OSMPOIData[] = [];

    const gridSpacing = 68;
    for (let i = -5; i <= 5; i++) {
      const coord = i * gridSpacing;
      roads.push({
        points: [[-360, coord], [360, coord]],
        width: i === 0 ? 16 : 11
      });
      roads.push({
        points: [[coord, -360], [coord, 360]],
        width: i === 0 ? 16 : 11
      });
    }

    water.push({
      points: [[-380, 168], [-120, 152], [120, 174], [380, 158]],
      width: 34
    });

    const shopNames = [
      'Café Lumière', 'Bistro Étoile', 'CyberOptic', 'Maison Royale',
      'Galerie Néo', 'Hôtel Horizon', 'Boulangerie Dorée', 'Pharmacie Centrale',
      'Cinéma Rex', 'Station Métro', 'Librairie Nova', 'Brasserie du Parc'
    ];

    for (let gx = -5; gx < 5; gx++) {
      for (let gz = -5; gz < 5; gz++) {
        if (gz === 2) continue; // River corridor
        const cx = (gx + 0.5) * gridSpacing;
        const cz = (gz + 0.5) * gridSpacing;
        if (Math.hypot(cx, cz) < 38) continue;

        if ((gx === 1 && gz === -1) || (gx === -2 && gz === 1)) {
          parks.push({ x: cx, z: cz, w: 46, d: 46 });
          continue;
        }

        const subCount = rng.int(2, 4);
        for (let s = 0; s < subCount; s++) {
          const ox = (s % 2 === 0 ? -1 : 1) * rng.range(10, 16);
          const oz = (s < 2 ? -1 : 1) * rng.range(10, 16);
          const distCenter = Math.hypot(cx + ox, cz + oz);
          const tallChance = distCenter < 180 ? 0.48 : 0.18;
          const h = rng.next() < tallChance ? rng.range(32, 96) : rng.range(14, 30);
          const w = rng.range(13, 21);
          const d = rng.range(13, 21);
          buildings.push({
            x: cx + ox,
            z: cz + oz,
            w,
            d,
            h,
            angle: 0,
            kind: h > 34 ? 'office' : 'apartments'
          });
        }

        if (pois.length < 16 && rng.next() < 0.45) {
          pois.push({
            x: cx,
            z: cz - 22,
            name: shopNames[pois.length % shopNames.length],
            category: pois.length % 2 === 0 ? 'cafe' : 'shop'
          });
        }
      }
    }

    return { buildings, roads, parks, water, pois };
  }

  private async fetchCityData(lat: number, lon: number): Promise<{ data: ParsedCityPayload; source: 'cache' | 'osm' | 'procedural' }> {
    const cacheKey = `metropolis_osm_v3_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const cachedRaw = await TileCacheDB.get<Record<string, unknown>>(cacheKey);
    if (cachedRaw && typeof cachedRaw === 'object') {
      const cached = this.normalizeCityPayload(cachedRaw);
      if (cached.buildings.length > 0 && cached.roads.length > 0) {
        return { data: cached, source: 'cache' };
      }
    }

    const seed = hashCitySeed(lat, lon);
    let osmData: ParsedCityPayload | null = null;

    // Strict 3000ms AbortController timeout on Overpass API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const overpassQuery = `[out:json][timeout:3];(way["building"](around:480,${lat},${lon});way["highway"~"^(primary|secondary|tertiary|residential|trunk|unclassified|pedestrian)$"](around:520,${lat},${lon});way["leisure"="park"](around:520,${lat},${lon});way["waterway"](around:580,${lat},${lon});way["natural"="water"](around:580,${lat},${lon});node["name"]["shop"](around:420,${lat},${lon});node["name"]["amenity"~"^(cafe|restaurant|bar|bank|cinema|theatre|pharmacy)$"](around:420,${lat},${lon});node["name"]["tourism"](around:480,${lat},${lon}););out body;>;out skel qt;`;

      const resp = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const json = (await resp.json()) as { elements?: unknown[] };
        if (Array.isArray(json.elements) && json.elements.length > 0) {
          osmData = await this.callWorker({
            type: 'parse_osm',
            elements: json.elements,
            centerLat: lat,
            centerLon: lon
          });
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }

    if (!osmData || (osmData.buildings.length === 0 && osmData.roads.length === 0)) {
      const fallback = await this.callWorker({
        type: 'generate_fallback_city',
        seed,
        radius: 620,
        centerLat: lat,
        centerLon: lon
      });
      await TileCacheDB.set(cacheKey, fallback, 7 * 24 * 3600 * 1000);
      return { data: fallback, source: 'procedural' };
    }

    // Merge procedural detail seamlessly if Overpass data in this sector is sparse
    if (osmData.buildings.length < 36 || osmData.roads.length < 5) {
      const proc = await this.callWorker({
        type: 'generate_fallback_city',
        seed,
        radius: 600,
        centerLat: lat,
        centerLon: lon
      });

      for (const pb of proc.buildings) {
        const overlaps = osmData.buildings.some(
          (eb) => Math.abs(eb.x - pb.x) < (eb.w + pb.w) * 0.55 && Math.abs(eb.z - pb.z) < (eb.d + pb.d) * 0.55
        );
        if (!overlaps) {
          osmData.buildings.push(pb);
        }
      }
      if (osmData.roads.length < 5) {
        osmData.roads.push(...proc.roads);
      }
      if (osmData.parks.length === 0) {
        osmData.parks.push(...proc.parks);
      }
      if (osmData.pois.length < 6) {
        osmData.pois.push(...proc.pois.slice(0, 10));
      }
    }

    await TileCacheDB.set(cacheKey, osmData, 7 * 24 * 3600 * 1000);
    return { data: osmData, source: 'osm' };
  }

  private async fetchLiveWeather(cityName: string, lat: number, lon: number, gen: number): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,precipitation,rain,snowfall,weather_code,is_day`;
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok || gen !== this.cityLoadGeneration) return;

      const json = (await resp.json()) as {
        current?: {
          temperature_2m?: number;
          precipitation?: number;
          rain?: number;
          snowfall?: number;
          weather_code?: number;
          is_day?: number;
        };
      };

      if (!json.current || gen !== this.cityLoadGeneration) return;
      const c = json.current;
      const temp = typeof c.temperature_2m === 'number' ? c.temperature_2m : 18;
      const code = typeof c.weather_code === 'number' ? c.weather_code : 0;
      const rainMm = typeof c.rain === 'number' ? c.rain : 0;
      const snowCm = typeof c.snowfall === 'number' ? c.snowfall : 0;
      const isDay = c.is_day !== 0;

      if (!this.manualTimeOverride) {
        const targetHour = isDay ? 15.5 : 22.2;
        this.ctx.sky.setTimeOfDay(targetHour);
      }

      let desc = 'Ciel Dégagé';
      if (snowCm > 0 || (code >= 71 && code <= 77) || code === 85 || code === 86) {
        this.weatherKind = 'snow';
        this.weatherIntensity = THREE.MathUtils.clamp(0.45 + snowCm * 0.3, 0.45, 1.0);
        this.wetness = 0.35;
        desc = 'Chutes de Neige';
      } else if (code >= 95) {
        this.weatherKind = 'storm';
        this.weatherIntensity = 0.95;
        this.wetness = 0.92;
        desc = 'Orage & Pluie';
      } else if (rainMm > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
        this.weatherKind = 'rain';
        this.weatherIntensity = THREE.MathUtils.clamp(0.45 + rainMm * 0.2, 0.45, 0.95);
        this.wetness = 0.85;
        desc = 'Pluie Live';
      } else if (code === 45 || code === 48) {
        this.weatherKind = 'fog';
        this.weatherIntensity = 0.65;
        this.wetness = 0.45;
        desc = 'Brouillard Urbain';
      } else if (code >= 1 && code <= 3) {
        this.weatherKind = 'cloudy';
        this.weatherIntensity = 0.35;
        this.wetness = 0.22;
        desc = 'Partiellement Nuageux';
      } else {
        this.weatherKind = 'clear';
        this.weatherIntensity = 0.0;
        this.wetness = 0.16;
        desc = isDay ? 'Ensoleillé' : 'Nuit Claire';
      }

      this.applyWeatherState();
      this.weatherLabel = `${cityName} • ${temp.toFixed(1)}°C • ${desc}`;
    } catch {
      clearTimeout(timer);
      if (gen === this.cityLoadGeneration) {
        this.weatherLabel = `${cityName} • Météo Standard`;
      }
    }
  }

  private applyWeatherState(): void {
    this.ctx.sky.setWeather(this.weatherKind, this.weatherIntensity);
    const rainAudio =
      this.weatherKind === 'rain' || this.weatherKind === 'storm' ? this.weatherIntensity : 0;
    this.ctx.audio.updateRainAmbience(rainAudio);

    if (this.wetAsphaltMat) {
      const setWetness = this.wetAsphaltMat.userData.setWetness as ((w: number) => void) | undefined;
      if (typeof setWetness === 'function') {
        setWetness(this.wetness);
      }
      this.wetAsphaltMat.clearcoat = Math.max(0.15, this.wetness);
    }
  }

  private async loadCityAtCoordinates(
    name: string,
    lat: number,
    lon: number,
    broadcastToPeers: boolean
  ): Promise<void> {
    const gen = ++this.cityLoadGeneration;
    this.currentCityName = name;
    this.currentLat = lat;
    this.currentLon = lon;

    if (broadcastToPeers && this.ctx.network.isHost) {
      this.ctx.network.broadcastWorldEvent('city_change', 'metropolis', {
        name,
        lat,
        lon
      });
    }

    this.ctx.ui.notify('METROPOLIS 1:1', `Reconstruction de ${name} (${lat.toFixed(3)}, ${lon.toFixed(3)})...`, 'info');

    const { data, source } = await this.fetchCityData(lat, lon);
    if (gen !== this.cityLoadGeneration) return;

    this.clearCurrentCityMeshes();
    this.reconstructCity3D(data, name, lat, lon);
    this.spawnInitialVehicleFleet();
    this.spawnTrafficAndPedestrians();
    this.startNewDeliveryMission(false);

    // Reset player safely in Central Plaza if on foot
    if (this.activeVehicle) {
      this.exitVehicle();
    }
    this.playerPos.set(0, 0, 12);
    this.playerVel.set(0, 0, 0);
    this.ctx.localAvatar.root.position.copy(this.playerPos);

    const badge =
      source === 'cache' ? 'Cache IndexedDB' : source === 'osm' ? 'OSM Overpass Live' : 'Synthèse Urbaine 3s';
    this.weatherLabel = `${name} • ${badge}`;
    this.ctx.ui.notify(
      name.toUpperCase(),
      `Ville reconstruite (${data.buildings.length} bâtiments • ${badge})`,
      'success'
    );

    this.setupToolbarUI();
    void this.fetchLiveWeather(name, lat, lon, gen);
  }

  private clearCurrentCityMeshes(): void {
    while (this.cityGroup.children.length > 0) {
      this.cityGroup.remove(this.cityGroup.children[0]);
    }
    for (const g of this.cityGeometries) g.dispose();
    for (const m of this.cityMaterials) m.dispose();
    this.cityGeometries.length = 0;
    this.cityMaterials.length = 0;

    if (this.poiAtlasTexture) {
      this.poiAtlasTexture.dispose();
      this.poiAtlasTexture = null;
    }
    this.poiSignMesh = null;
    this.glassInteriorMat = null;
    this.brickInteriorMat = null;
    this.wetAsphaltMat = null;
    this.riverOceanMat = null;
    this.windSwayHandle = null;
    this.streetlightBulbMat = null;
    this.penthouseBeaconMat = null;

    this.trafficBodyMesh = null;
    this.trafficLightMesh = null;
    this.pedBodyMesh = null;
    this.pedHeadMesh = null;
    this.trafficAgents.length = 0;
    this.pedAgents.length = 0;
    this.buildingColliders.length = 0;

    for (const v of this.vehicles) {
      this.dynamicGroup.remove(v.root);
      v.dispose();
    }
    this.vehicles.length = 0;
    this.activeVehicle = null;
  }

  private trackCityGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.cityGeometries.push(geo);
    return geo;
  }

  private trackCityMat<T extends THREE.Material>(mat: T): T {
    this.cityMaterials.push(mat);
    return mat;
  }

  private reconstructCity3D(data: ParsedCityPayload, cityName: string, lat: number, lon: number): void {
    const rng = new SeededRandom(hashCitySeed(lat, lon));

    // 1. Base Urban Ground Plane (PBR Cobblestone/Concrete Plaza)
    const groundMat = this.trackCityMat(
      this.ctx.textures.createPBRMaterial('cobblestone', {
        repeatX: 90,
        repeatY: 90,
        roughness: 0.82,
        metalness: 0.06
      })
    );
    const groundMesh = new THREE.Mesh(
      this.trackCityGeo(new THREE.PlaneGeometry(1600, 1600)),
      groundMat
    );
    groundMesh.rotation.x = -Math.PI * 0.5;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    this.cityGroup.add(groundMesh);

    // Ensure guaranteed main avenues crossing near Central Plaza if OSM roads don't cross (0,0)
    const roads: OSMRoadData[] = data.roads.filter((r) => r.points && r.points.length >= 2);
    const hasCentralRoad = roads.some((r) =>
      r.points.some((pt) => Math.hypot(pt[0], pt[1]) < 45)
    );
    if (!hasCentralRoad) {
      roads.unshift(
        { points: [[-420, 0], [420, 0]], width: 15 },
        { points: [[0, -420], [0, 420]], width: 15 }
      );
    }
    this.activeRoads = roads;

    // 2. Wet Reflective Asphalt Roads, Sidewalks & Lane Markings (Batched!)
    this.buildRoadNetworkMeshes(roads);

    // 3. Gerstner Reflective River / Waterway
    this.buildRiverMeshes(data.water);

    // 4. Green Parks + Wind-Swaying Instanced Trees
    this.buildParksAndTrees(data.parks, roads, rng);

    // 5. Skyscrapers & Urban Buildings with Interior Mapping + PBR Roofs
    this.buildSkyscrapersAndBuildings(data.buildings, rng);

    // 6. Purchasable Luxury Penthouse Spire + Rooftop Helipad
    this.buildLuxuryPenthouse();

    // 7. City Landmark Monument (Tour Eiffel, Tokyo Tower, Empire Spire, Burj, etc.)
    this.buildCityLandmark(cityName);

    // 8. Instanced Urban Streetlights along Roads
    this.buildStreetlights(roads);

    // 9. Single-Draw-Call 3D Holographic POI / Shop Signs with Real OSM Names
    this.activePOIs = data.pois.length > 0 ? data.pois : this.synthesizeFallbackPOIs(roads);
    this.buildHolographicPOISigns(this.activePOIs);
  }

  private buildRoadNetworkMeshes(roads: OSMRoadData[]): void {
    const asphaltGeos: THREE.BufferGeometry[] = [];
    const sidewalkGeos: THREE.BufferGeometry[] = [];
    const stripeGeos: THREE.BufferGeometry[] = [];

    for (let r = 0; r < Math.min(roads.length, 220); r++) {
      const road = roads[r];
      const w = THREE.MathUtils.clamp(road.width || 10, 6, 22);
      const pts = road.points;

      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i];
        const [x1, z1] = pts[i + 1];
        const dx = x1 - x0;
        const dz = z1 - z0;
        const len = Math.hypot(dx, dz);
        if (len < 1.5 || len > 900) continue;

        const cx = (x0 + x1) * 0.5;
        const cz = (z0 + z1) * 0.5;
        const angle = Math.atan2(dx, dz);

        // Asphalt surface ribbon segment (slightly overlapping ends for seamless joints)
        const segGeo = new THREE.PlaneGeometry(w, len + w * 0.45);
        segGeo.rotateX(-Math.PI * 0.5);
        segGeo.rotateY(angle);
        segGeo.translate(cx, 0.045, cz);
        const uv = segGeo.getAttribute('uv') as THREE.BufferAttribute;
        for (let k = 0; k < uv.count; k++) {
          uv.setXY(k, uv.getX(k) * (w / 6), uv.getY(k) * (len / 6));
        }
        asphaltGeos.push(segGeo);

        // Raised curbs / sidewalks on left & right sides
        const swWidth = 1.85;
        const nx = Math.cos(angle);
        const nz = -Math.sin(angle);
        const sideDist = w * 0.5 + swWidth * 0.5;

        for (const side of [-1, 1]) {
          const sw = new THREE.BoxGeometry(swWidth, 0.16, len);
          sw.rotateY(angle);
          sw.translate(cx + nx * sideDist * side, 0.08, cz + nz * sideDist * side);
          sidewalkGeos.push(sw);
        }

        // Dashed lane markings along centerline
        const dashSpacing = 8.5;
        const dashCount = Math.floor(len / dashSpacing);
        const dirX = dx / len;
        const dirZ = dz / len;
        for (let d = 0; d < dashCount; d++) {
          const distAlong = (d + 0.5) * dashSpacing;
          const mx = x0 + dirX * distAlong;
          const mz = z0 + dirZ * distAlong;
          const stripe = new THREE.PlaneGeometry(0.24, 3.2);
          stripe.rotateX(-Math.PI * 0.5);
          stripe.rotateY(angle);
          stripe.translate(mx, 0.062, mz);
          stripeGeos.push(stripe);
        }
      }
    }

    const mergedAsphalt = mergeAndDisposeTemp(asphaltGeos);
    if (mergedAsphalt) {
      this.trackCityGeo(mergedAsphalt);
      const asphaltTex = this.ctx.textures.getTextureSet('asphalt');
      this.wetAsphaltMat = this.trackCityMat(createWetAsphaltMaterial(asphaltTex, this.wetness));
      const roadMesh = new THREE.Mesh(mergedAsphalt, this.wetAsphaltMat);
      roadMesh.receiveShadow = true;
      this.cityGroup.add(roadMesh);
    }

    const mergedSidewalk = mergeAndDisposeTemp(sidewalkGeos);
    if (mergedSidewalk) {
      this.trackCityGeo(mergedSidewalk);
      const swMat = this.trackCityMat(
        new THREE.MeshStandardMaterial({
          color: 0x7b828c,
          roughness: 0.78,
          metalness: 0.08
        })
      );
      const swMesh = new THREE.Mesh(mergedSidewalk, swMat);
      swMesh.receiveShadow = true;
      this.cityGroup.add(swMesh);
    }

    const mergedStripes = mergeAndDisposeTemp(stripeGeos);
    if (mergedStripes) {
      this.trackCityGeo(mergedStripes);
      const stripeMat = this.trackCityMat(
        new THREE.MeshStandardMaterial({
          color: 0xf4f7fb,
          emissive: 0xdce8f8,
          emissiveIntensity: 0.35,
          roughness: 0.4,
          metalness: 0.1
        })
      );
      const stripeMesh = new THREE.Mesh(mergedStripes, stripeMat);
      this.cityGroup.add(stripeMesh);
    }
  }

  private buildRiverMeshes(waterWays: OSMWaterData[]): void {
    const waterGeos: THREE.BufferGeometry[] = [];
    const activeWater: OSMWaterData[] =
      waterWays.length > 0
        ? waterWays
        : [
            {
              points: [
                [-520, 172],
                [-180, 148],
                [140, 184],
                [520, 160]
              ],
              width: 38
            }
          ];

    for (const wItem of activeWater) {
      const width = Math.max(18, wItem.width || 28);
      for (let i = 0; i < wItem.points.length - 1; i++) {
        const [x0, z0] = wItem.points[i];
        const [x1, z1] = wItem.points[i + 1];
        const dx = x1 - x0;
        const dz = z1 - z0;
        const len = Math.hypot(dx, dz);
        if (len < 2) continue;
        const seg = new THREE.PlaneGeometry(width, len + width * 0.4, 8, Math.max(4, Math.floor(len / 14)));
        seg.rotateX(-Math.PI * 0.5);
        seg.rotateY(Math.atan2(dx, dz));
        seg.translate((x0 + x1) * 0.5, 0.08, (z0 + z1) * 0.5);
        waterGeos.push(seg);
      }
    }

    const mergedRiver = mergeAndDisposeTemp(waterGeos);
    if (mergedRiver) {
      this.trackCityGeo(mergedRiver);
      this.riverOceanMat = this.trackCityMat(
        createGerstnerOceanMaterial({
          waves: [
            { steepness: 0.06, wavelength: 18.0, dirX: 0.92, dirZ: 0.39, speed: 0.9 },
            { steepness: 0.05, wavelength: 10.0, dirX: 0.45, dirZ: -0.89, speed: 1.05 },
            { steepness: 0.04, wavelength: 5.5, dirX: -0.76, dirZ: 0.65, speed: 1.15 },
            { steepness: 0.03, wavelength: 3.2, dirX: 0.25, dirZ: 0.97, speed: 1.2 }
          ]
        })
      );
      const riverMesh = new THREE.Mesh(mergedRiver, this.riverOceanMat);
      this.cityGroup.add(riverMesh);
    }
  }

  private buildParksAndTrees(parks: OSMParkData[], roads: OSMRoadData[], rng: SeededRandom): void {
    const parkGeos: THREE.BufferGeometry[] = [];
    const treePositions: Array<{ x: number; z: number; scale: number }> = [];

    const effectiveParks =
      parks.length > 0
        ? parks
        : [
            { x: 52, z: 48, w: 42, d: 42 },
            { x: -78, z: 62, w: 48, d: 38 }
          ];

    for (const park of effectiveParks) {
      if (Math.hypot(park.x, park.z) < 20) continue;
      const w = THREE.MathUtils.clamp(park.w, 12, 120);
      const d = THREE.MathUtils.clamp(park.d, 12, 120);
      const lawn = new THREE.BoxGeometry(w, 0.14, d);
      lawn.translate(park.x, 0.06, park.z);
      parkGeos.push(lawn);

      const treeCount = Math.min(18, Math.max(4, Math.floor((w * d) / 140)));
      for (let t = 0; t < treeCount; t++) {
        treePositions.push({
          x: park.x + (rng.next() - 0.5) * (w - 5),
          z: park.z + (rng.next() - 0.5) * (d - 5),
          scale: rng.range(0.85, 1.45)
        });
      }
    }

    // Boulevard trees along major avenues
    for (let r = 0; r < Math.min(roads.length, 32) && treePositions.length < 280; r++) {
      const road = roads[r];
      if ((road.width || 10) < 11 || road.points.length < 2) continue;
      const [x0, z0] = road.points[0];
      const [x1, z1] = road.points[road.points.length - 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 36) continue;
      const nx = dz / len;
      const nz = -dx / len;
      const offset = (road.width || 12) * 0.5 + 2.4;
      const steps = Math.min(10, Math.floor(len / 26));
      for (let s = 1; s < steps; s++) {
        const frac = s / steps;
        const bx = x0 + dx * frac + nx * offset * (s % 2 === 0 ? 1 : -1);
        const bz = z0 + dz * frac + nz * offset * (s % 2 === 0 ? 1 : -1);
        if (Math.hypot(bx, bz) > 18) {
          treePositions.push({ x: bx, z: bz, scale: rng.range(0.8, 1.2) });
        }
      }
    }

    const mergedParks = mergeAndDisposeTemp(parkGeos);
    if (mergedParks) {
      this.trackCityGeo(mergedParks);
      const lawnMat = this.trackCityMat(
        this.ctx.textures.createPBRMaterial('foliage', {
          repeatX: 16,
          repeatY: 16,
          tint: 0x3fa35b,
          roughness: 0.88,
          metalness: 0.02
        })
      );
      const parkMesh = new THREE.Mesh(mergedParks, lawnMat);
      parkMesh.receiveShadow = true;
      this.cityGroup.add(parkMesh);
    }

    if (treePositions.length > 0) {
      const trunkGeo = this.trackCityGeo(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 7));
      trunkGeo.translate(0, 1.3, 0);
      const trunkMat = this.trackCityMat(
        this.ctx.textures.createPBRMaterial('bark', { roughness: 0.9, metalness: 0.02 })
      );

      const crownGeo = this.trackCityGeo(new THREE.IcosahedronGeometry(1.95, 1));
      crownGeo.translate(0, 3.8, 0);
      const crownMat = this.trackCityMat(
        this.ctx.textures.createPBRMaterial('foliage', {
          tint: 0x4cc468,
          roughness: 0.78,
          metalness: 0.04
        })
      );
      this.windSwayHandle = applyWindSwayToMaterial(crownMat, 0.36, 5.5);

      const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
      const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treePositions.length);
      trunkInst.castShadow = true;
      crownInst.castShadow = true;
      crownInst.receiveShadow = true;

      for (let i = 0; i < treePositions.length; i++) {
        const tp = treePositions[i];
        this.dummy.position.set(tp.x, 0, tp.z);
        this.dummy.rotation.set(0, i * 1.37, 0);
        this.dummy.scale.setScalar(tp.scale);
        this.dummy.updateMatrix();
        trunkInst.setMatrixAt(i, this.dummy.matrix);
        crownInst.setMatrixAt(i, this.dummy.matrix);
      }
      trunkInst.instanceMatrix.needsUpdate = true;
      crownInst.instanceMatrix.needsUpdate = true;
      this.cityGroup.add(trunkInst, crownInst);
    }
  }

  private buildSkyscrapersAndBuildings(buildings: OSMBuildingData[], rng: SeededRandom): void {
    const glassWallGeos: THREE.BufferGeometry[] = [];
    const brickWallGeos: THREE.BufferGeometry[] = [];
    const roofGeos: THREE.BufferGeometry[] = [];

    const maxBuildings = Math.min(buildings.length, 480);

    for (let i = 0; i < maxBuildings; i++) {
      const b = buildings[i];
      const w = THREE.MathUtils.clamp(b.w || 16, 7, 68);
      const d = THREE.MathUtils.clamp(b.d || 16, 7, 68);
      const h = THREE.MathUtils.clamp(b.h || 20, 8, 155);

      // Keep Central Spawn Plaza & Penthouse footprint clear
      if (Math.hypot(b.x, b.z) < 22 + Math.max(w, d) * 0.5) continue;
      if (Math.hypot(b.x - PENTHOUSE_POS.x, b.z - PENTHOUSE_POS.z) < 16 + Math.max(w, d) * 0.5) continue;

      const angle = b.angle || 0;
      const box = new THREE.BoxGeometry(w, h, d);

      // Scale UVs cleanly to room/floor dimensions for crisp Interior Mapping parallax rooms!
      const uv = box.getAttribute('uv') as THREE.BufferAttribute;
      const pos = box.getAttribute('position') as THREE.BufferAttribute;
      const norm = box.getAttribute('normal') as THREE.BufferAttribute;
      for (let v = 0; v < uv.count; v++) {
        const nx = Math.abs(norm.getX(v));
        const px = pos.getX(v);
        const py = pos.getY(v) + h * 0.5;
        const pz = pos.getZ(v);
        if (nx > 0.5) {
          uv.setXY(v, (pz + d * 0.5) / 12.0, py / 12.0);
        } else {
          uv.setXY(v, (px + w * 0.5) / 12.0, py / 12.0);
        }
      }

      box.rotateY(angle);
      box.translate(b.x, h * 0.5, b.z);

      const isGlassTower =
        h >= 28 ||
        b.kind === 'glass' ||
        b.kind === 'landmark' ||
        b.kind === 'office' ||
        b.kind === 'commercial' ||
        rng.next() < 0.35;
      if (isGlassTower) {
        glassWallGeos.push(box);
      } else {
        brickWallGeos.push(box);
      }

      // Roof cap + mechanical HVAC penthouse
      const roofCap = new THREE.BoxGeometry(w + 0.35, 0.45, d + 0.35);
      roofCap.rotateY(angle);
      roofCap.translate(b.x, h + 0.22, b.z);
      roofGeos.push(roofCap);

      if (h > 26 && w > 12 && d > 12) {
        const hvac = new THREE.BoxGeometry(w * 0.38, 2.4, d * 0.38);
        hvac.rotateY(angle);
        hvac.translate(b.x, h + 1.4, b.z);
        roofGeos.push(hvac);
      }

      // Axis-aligned bounding box collider for vehicle & avatar physics
      const cosA = Math.abs(Math.cos(angle));
      const sinA = Math.abs(Math.sin(angle));
      const halfExtentX = (w * cosA + d * sinA) * 0.5;
      const halfExtentZ = (w * sinA + d * cosA) * 0.5;
      this.buildingColliders.push({
        minX: b.x - halfExtentX,
        maxX: b.x + halfExtentX,
        minZ: b.z - halfExtentZ,
        maxZ: b.z + halfExtentZ,
        maxY: h
      });
    }

    const mergedGlass = mergeAndDisposeTemp(glassWallGeos);
    if (mergedGlass) {
      this.trackCityGeo(mergedGlass);
      const glassTex = this.ctx.textures.getTextureSet('facade_glass');
      this.glassInteriorMat = this.trackCityMat(
        createInteriorMappingMaterial(glassTex, { floors: 3.5, roomsPerFloor: 3 })
      );
      const glassMesh = new THREE.Mesh(mergedGlass, this.glassInteriorMat);
      glassMesh.castShadow = true;
      glassMesh.receiveShadow = true;
      this.cityGroup.add(glassMesh);
    }

    const mergedBrick = mergeAndDisposeTemp(brickWallGeos);
    if (mergedBrick) {
      this.trackCityGeo(mergedBrick);
      const brickTex = this.ctx.textures.getTextureSet('facade_brick');
      this.brickInteriorMat = this.trackCityMat(
        createInteriorMappingMaterial(brickTex, { floors: 3.5, roomsPerFloor: 3 })
      );
      const brickMesh = new THREE.Mesh(mergedBrick, this.brickInteriorMat);
      brickMesh.castShadow = true;
      brickMesh.receiveShadow = true;
      this.cityGroup.add(brickMesh);
    }

    const mergedRoofs = mergeAndDisposeTemp(roofGeos);
    if (mergedRoofs) {
      this.trackCityGeo(mergedRoofs);
      const roofMat = this.trackCityMat(
        this.ctx.textures.createPBRMaterial('asphalt', {
          repeatX: 4,
          repeatY: 4,
          tint: 0x454c56,
          roughness: 0.85,
          metalness: 0.18
        })
      );
      const roofMesh = new THREE.Mesh(mergedRoofs, roofMat);
      roofMesh.castShadow = true;
      roofMesh.receiveShadow = true;
      this.cityGroup.add(roofMesh);
    }
  }

  private buildLuxuryPenthouse(): void {
    const px = PENTHOUSE_POS.x;
    const pz = PENTHOUSE_POS.z;
    const h = PENTHOUSE_HEIGHT;

    const towerMat = this.trackCityMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x162638,
        metalness: 0.82,
        roughness: 0.14,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04
      })
    );

    const goldTrimMat = this.trackCityMat(
      new THREE.MeshStandardMaterial({
        color: 0xffc857,
        emissive: 0xff9f1c,
        emissiveIntensity: 1.4,
        metalness: 0.85,
        roughness: 0.22
      })
    );

    const tower = new THREE.Mesh(this.trackCityGeo(new THREE.BoxGeometry(18, h, 18)), towerMat);
    tower.position.set(px, h * 0.5, pz);
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.cityGroup.add(tower);

    // Rooftop Helipad Deck with glowing 'H' markings
    const padDeck = new THREE.Mesh(
      this.trackCityGeo(new THREE.CylinderGeometry(9.2, 9.8, 0.6, 24)),
      this.trackCityMat(
        new THREE.MeshStandardMaterial({
          color: 0x262d38,
          roughness: 0.65,
          metalness: 0.35
        })
      )
    );
    padDeck.position.set(px, h + 0.2, pz);
    padDeck.receiveShadow = true;
    this.cityGroup.add(padDeck);

    const hRing = new THREE.Mesh(this.trackCityGeo(new THREE.RingGeometry(6.2, 6.7, 32)), goldTrimMat);
    hRing.rotation.x = -Math.PI * 0.5;
    hRing.position.set(px, h + 0.52, pz);
    this.cityGroup.add(hRing);

    // Street-level Luxury Penthouse Lobby Portal
    this.penthouseBeaconMat = this.trackCityMat(
      new THREE.MeshStandardMaterial({
        color: this.ownsPenthouse ? 0x38f29d : 0xffc857,
        emissive: this.ownsPenthouse ? 0x18d882 : 0xffaa22,
        emissiveIntensity: 2.4,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0.78
      })
    );
    const lobbyPortal = new THREE.Mesh(
      this.trackCityGeo(new THREE.CylinderGeometry(2.1, 2.1, 3.2, 20, 1, true)),
      this.penthouseBeaconMat
    );
    lobbyPortal.position.set(px + 11.5, 1.6, pz);
    this.cityGroup.add(lobbyPortal);

    this.buildingColliders.push({
      minX: px - 9.2,
      maxX: px + 9.2,
      minZ: pz - 9.2,
      maxZ: pz + 9.2,
      maxY: h + 0.5,
      walkableRoof: true
    });
  }

  private buildCityLandmark(cityName: string): void {
    const lower = cityName.toLowerCase();
    const lx = 78;
    const lz = -86;
    const geos: THREE.BufferGeometry[] = [];

    let colorHex = 0x9aa8b8;
    let emissiveHex = 0x28e0ff;

    if (lower.includes('paris')) {
      // Sculpted Eiffel-style tiered lattice tower
      colorHex = 0xb5895a;
      emissiveHex = 0xffcf70;
      const tiers = [
        { y: 14, wTop: 14, wBot: 26, h: 28 },
        { y: 42, wTop: 8.5, wBot: 14, h: 28 },
        { y: 76, wTop: 3.2, wBot: 8.5, h: 40 },
        { y: 108, wTop: 0.5, wBot: 3.0, h: 24 }
      ];
      for (const t of tiers) {
        const g = new THREE.CylinderGeometry(t.wTop, t.wBot, t.h, 4);
        g.rotateY(Math.PI * 0.25);
        g.translate(lx, t.y, lz);
        geos.push(g);
      }
    } else if (lower.includes('tokyo')) {
      colorHex = 0xff4738;
      emissiveHex = 0xff6b57;
      const base = new THREE.CylinderGeometry(3.2, 18, 95, 4);
      base.rotateY(Math.PI * 0.25);
      base.translate(lx, 47.5, lz);
      const spire = new THREE.CylinderGeometry(0.4, 2.8, 36, 8);
      spire.translate(lx, 112, lz);
      geos.push(base, spire);
    } else if (lower.includes('dubai')) {
      // Stepped Y-plan supertall needle spire
      colorHex = 0xdce8f5;
      emissiveHex = 0x52e5ff;
      for (let s = 0; s < 6; s++) {
        const r = 13 - s * 2.0;
        const segH = 26;
        const g = new THREE.CylinderGeometry(r * 0.78, r, segH, 6);
        g.translate(lx, s * 24 + segH * 0.5, lz);
        geos.push(g);
      }
    } else {
      // Modern obelisk/spire landmark (NYC, London, Lyon, Custom GPS)
      colorHex = 0xaec2d8;
      emissiveHex = 0x28e0ff;
      const main = new THREE.CylinderGeometry(4.5, 11.5, 96, 8);
      main.translate(lx, 48, lz);
      const spire = new THREE.CylinderGeometry(0.3, 3.8, 32, 8);
      spire.translate(lx, 112, lz);
      geos.push(main, spire);
    }

    const merged = mergeAndDisposeTemp(geos);
    if (merged) {
      this.trackCityGeo(merged);
      const landmarkMat = this.trackCityMat(
        new THREE.MeshPhysicalMaterial({
          color: colorHex,
          emissive: emissiveHex,
          emissiveIntensity: 0.35,
          metalness: 0.78,
          roughness: 0.24,
          clearcoat: 0.8
        })
      );
      const mesh = new THREE.Mesh(merged, landmarkMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.cityGroup.add(mesh);

      this.buildingColliders.push({
        minX: lx - 11,
        maxX: lx + 11,
        minZ: lz - 11,
        maxZ: lz + 11,
        maxY: 120
      });
    }
  }

  private buildStreetlights(roads: OSMRoadData[]): void {
    const lampTransforms: Array<{ x: number; z: number; angle: number }> = [];

    for (let r = 0; r < Math.min(roads.length, 48) && lampTransforms.length < 220; r++) {
      const road = roads[r];
      if (road.points.length < 2) continue;
      const w = THREE.MathUtils.clamp(road.width || 10, 6, 22);
      const [x0, z0] = road.points[0];
      const [x1, z1] = road.points[road.points.length - 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 30) continue;

      const angle = Math.atan2(dx, dz);
      const nx = Math.cos(angle);
      const nz = -Math.sin(angle);
      const count = Math.min(8, Math.floor(len / 34));

      for (let i = 1; i <= count && lampTransforms.length < 220; i++) {
        const t = i / (count + 1);
        const side = i % 2 === 0 ? 1 : -1;
        lampTransforms.push({
          x: x0 + dx * t + nx * (w * 0.5 + 1.2) * side,
          z: z0 + dz * t + nz * (w * 0.5 + 1.2) * side,
          angle: angle + (side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5)
        });
      }
    }

    if (lampTransforms.length === 0) return;

    const poleGeo = this.trackCityGeo(new THREE.CylinderGeometry(0.08, 0.12, 6.2, 6));
    poleGeo.translate(0, 3.1, 0);
    const poleMat = this.trackCityMat(
      new THREE.MeshStandardMaterial({ color: 0x2b333d, metalness: 0.82, roughness: 0.32 })
    );

    const bulbGeo = this.trackCityGeo(new THREE.BoxGeometry(0.75, 0.14, 0.28));
    bulbGeo.translate(0.32, 6.18, 0);
    this.streetlightBulbMat = this.trackCityMat(
      new THREE.MeshStandardMaterial({
        color: 0xfff0d4,
        emissive: 0xffb85c,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.1
      })
    );

    const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampTransforms.length);
    const bulbInst = new THREE.InstancedMesh(bulbGeo, this.streetlightBulbMat, lampTransforms.length);

    for (let i = 0; i < lampTransforms.length; i++) {
      const lt = lampTransforms[i];
      this.dummy.position.set(lt.x, 0, lt.z);
      this.dummy.rotation.set(0, lt.angle, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      poleInst.setMatrixAt(i, this.dummy.matrix);
      bulbInst.setMatrixAt(i, this.dummy.matrix);
    }
    poleInst.instanceMatrix.needsUpdate = true;
    bulbInst.instanceMatrix.needsUpdate = true;
    this.cityGroup.add(poleInst, bulbInst);
  }

  private synthesizeFallbackPOIs(roads: OSMRoadData[]): OSMPOIData[] {
    const names = [
      { name: 'Café de la Paix', category: 'cafe' },
      { name: 'Cyber Boutique', category: 'shop' },
      { name: 'Grand Hôtel Métropole', category: 'tourism' },
      { name: 'Brasserie Centrale', category: 'restaurant' },
      { name: 'Cinéma Omniverse', category: 'cinema' },
      { name: 'Banque Continentale', category: 'bank' },
      { name: 'Pharmacie Étoile', category: 'pharmacy' },
      { name: 'Galerie Horizon', category: 'shop' }
    ];
    const out: OSMPOIData[] = [];
    for (let i = 0; i < names.length; i++) {
      const road = roads[i % Math.max(1, roads.length)];
      const pt = road && road.points.length > 0 ? road.points[0] : [Math.cos(i) * 85, Math.sin(i) * 85];
      out.push({
        x: THREE.MathUtils.clamp(pt[0], -220, 220),
        z: THREE.MathUtils.clamp(pt[1], -220, 220),
        name: names[i].name,
        category: names[i].category
      });
    }
    return out;
  }

  /**
   * Renders up to 16 real OSM shop/POI floating 3D holographic signs in ONE single draw call
   * using a dynamically rasterized CanvasTexture atlas + MeshStandardMaterial emissive.
   */
  private buildHolographicPOISigns(pois: OSMPOIData[]): void {
    const selected = pois.slice(0, 16);
    if (selected.length === 0) return;

    const cols = 4;
    const rows = 4;
    const cellW = 512;
    const cellH = 200;

    const canvas = document.createElement('canvas');
    canvas.width = cols * cellW;
    canvas.height = rows * cellH;
    const c2d = canvas.getContext('2d');

    if (c2d) {
      c2d.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < selected.length; i++) {
        const poi = selected[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ox = col * cellW;
        const oy = row * cellH;

        const accent = i % 3 === 0 ? '#28e0ff' : i % 3 === 1 ? '#ffb347' : '#ff4d94';

        c2d.fillStyle = 'rgba(8, 16, 30, 0.86)';
        c2d.beginPath();
        c2d.roundRect(ox + 16, oy + 20, cellW - 32, cellH - 40, 22);
        c2d.fill();

        c2d.lineWidth = 5;
        c2d.strokeStyle = accent;
        c2d.stroke();

        c2d.fillStyle = accent;
        c2d.font = 'bold 24px system-ui, sans-serif';
        c2d.fillText(`◆ ${(poi.category || 'POI').toUpperCase()}`, ox + 38, oy + 68);

        c2d.fillStyle = '#ffffff';
        c2d.font = 'bold 34px system-ui, sans-serif';
        const label = poi.name.length > 22 ? `${poi.name.slice(0, 21)}…` : poi.name;
        c2d.fillText(label, ox + 38, oy + 124);
      }
    }

    this.poiAtlasTexture = new THREE.CanvasTexture(canvas);
    this.poiAtlasTexture.colorSpace = THREE.SRGBColorSpace;
    this.poiAtlasTexture.needsUpdate = true;

    const signGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < selected.length; i++) {
      const poi = selected[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const u0 = col / cols;
      const u1 = (col + 1) / cols;
      // Canvas Y=0 is top; UV V=1 is top
      const v1 = 1 - row / rows;
      const v0 = 1 - (row + 1) / rows;

      const card = new THREE.PlaneGeometry(7.2, 2.8);
      const uv = card.getAttribute('uv') as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) {
        const u = uv.getX(k) < 0.5 ? u0 : u1;
        const v = uv.getY(k) < 0.5 ? v0 : v1;
        uv.setXY(k, u, v);
      }
      card.rotateY((i * 0.9) % (Math.PI * 2));
      card.translate(poi.x, 8.5, poi.z);
      signGeos.push(card);
    }

    const mergedSigns = mergeAndDisposeTemp(signGeos);
    if (mergedSigns) {
      this.trackCityGeo(mergedSigns);
      const signMat = this.trackCityMat(
        new THREE.MeshStandardMaterial({
          map: this.poiAtlasTexture,
          emissiveMap: this.poiAtlasTexture,
          emissive: 0xffffff,
          emissiveIntensity: 1.75,
          roughness: 0.2,
          metalness: 0.15,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      this.poiSignMesh = new THREE.Mesh(mergedSigns, signMat);
      this.cityGroup.add(this.poiSignMesh);
    }
  }

  private spawnInitialVehicleFleet(): void {
    if (!this.smokePool) return;

    const fleetSpecs: Array<{
      id: string;
      kind: MetropolisVehicleKind;
      color: number;
      accent: number;
      pos: THREE.Vector3;
      heading: number;
    }> = [
      {
        id: 'metro_car_1',
        kind: 'car',
        color: 0x0f8cff,
        accent: 0x28e0ff,
        pos: new THREE.Vector3(6.5, 0.1, 4.0),
        heading: 0.35
      },
      {
        id: 'metro_car_2',
        kind: 'car',
        color: 0xe61c3c,
        accent: 0xffb347,
        pos: new THREE.Vector3(-8.5, 0.1, 3.0),
        heading: -0.45
      },
      {
        id: 'metro_moto_1',
        kind: 'moto',
        color: 0x161b24,
        accent: 0x38f29d,
        pos: new THREE.Vector3(3.2, 0.1, 8.2),
        heading: 0.15
      },
      {
        id: 'metro_heli_1',
        kind: 'heli',
        color: 0x1e2c40,
        accent: 0x28e0ff,
        pos: new THREE.Vector3(0, 0.1, -12.5),
        heading: 0
      },
      {
        id: 'metro_heli_penthouse',
        kind: 'heli',
        color: 0xf5b82e,
        accent: 0xffffff,
        pos: new THREE.Vector3(PENTHOUSE_POS.x, PENTHOUSE_HEIGHT + 0.55, PENTHOUSE_POS.z),
        heading: 0.8
      }
    ];

    for (const spec of fleetSpecs) {
      const v = new RaycastVehicle(this.ctx, {
        id: spec.id,
        kind: spec.kind,
        paintColor: spec.color,
        accentColor: spec.accent,
        position: spec.pos,
        heading: spec.heading
      });
      this.vehicles.push(v);
      this.dynamicGroup.add(v.root);
    }
  }

  public spawnVehicleNearPlayer(kind: MetropolisVehicleKind): void {
    if (this.activeVehicle) {
      this.exitVehicle();
    }

    const forwardX = -Math.sin(this.playerYaw);
    const forwardZ = -Math.cos(this.playerYaw);
    const spawnPos = new THREE.Vector3(
      this.playerPos.x + forwardX * 4.5,
      this.playerPos.y + 0.25,
      this.playerPos.z + forwardZ * 4.5
    );

    // Reuse or create vehicle
    const palette =
      kind === 'car' ? 0x28e0ff : kind === 'moto' ? 0xff3b5c : 0x2a3b52;
    const v = new RaycastVehicle(this.ctx, {
      id: `spawn_${kind}_${Date.now() % 100000}`,
      kind,
      paintColor: palette,
      accentColor: 0xffc857,
      position: spawnPos,
      heading: this.playerYaw
    });

    if (this.vehicles.length >= 8) {
      const oldest = this.vehicles.find((veh) => veh !== this.activeVehicle);
      if (oldest) {
        this.dynamicGroup.remove(oldest.root);
        oldest.dispose();
        const idx = this.vehicles.indexOf(oldest);
        if (idx >= 0) this.vehicles.splice(idx, 1);
      }
    }

    this.vehicles.push(v);
    this.dynamicGroup.add(v.root);
    this.enterVehicle(v);
  }

  private spawnTrafficAndPedestrians(): void {
    const validRoads = this.activeRoads.filter((r) => r.points.length >= 2);
    if (validRoads.length === 0) return;

    // 1. AI Automobile Traffic (2 InstancedMesh draw calls!)
    const carCount = 42;
    const carBodyGeo = this.trackCityGeo(new THREE.BoxGeometry(1.82, 0.95, 4.1));
    carBodyGeo.translate(0, 0.62, 0);
    const carBodyMat = this.trackCityMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.72,
        roughness: 0.24,
        clearcoat: 0.85
      })
    );

    const carLightGeo = this.trackCityGeo(new THREE.BoxGeometry(1.66, 0.16, 4.16));
    carLightGeo.translate(0, 0.58, 0);
    const carLightMat = this.trackCityMat(
      new THREE.MeshStandardMaterial({
        color: 0xffe8c2,
        emissive: 0xffaa44,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.1
      })
    );

    this.trafficBodyMesh = new THREE.InstancedMesh(carBodyGeo, carBodyMat, carCount);
    this.trafficLightMesh = new THREE.InstancedMesh(carLightGeo, carLightMat, carCount);
    this.trafficBodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.trafficLightMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.trafficBodyMesh.castShadow = true;

    const palette = [0xd8e2ec, 0x243447, 0xc82838, 0x2b7de9, 0xe8a838, 0x3b424c, 0x1db992];
    const colorObj = new THREE.Color();

    for (let i = 0; i < carCount; i++) {
      const roadIdx = i % validRoads.length;
      const road = validRoads[roadIdx];
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      this.trafficAgents.push({
        roadIdx,
        segIdx: 0,
        t: (i * 0.19) % 1,
        speed: 9.5 + (i % 5) * 2.1,
        dir,
        laneOffset: (road.width || 10) * 0.24,
        x: 0,
        z: 0,
        yaw: 0
      });
      colorObj.setHex(palette[i % palette.length]);
      this.trafficBodyMesh.setColorAt(i, colorObj);
    }
    if (this.trafficBodyMesh.instanceColor) this.trafficBodyMesh.instanceColor.needsUpdate = true;
    this.cityGroup.add(this.trafficBodyMesh, this.trafficLightMesh);

    // 2. Animated Sidewalk Pedestrians (2 InstancedMesh draw calls!)
    const pedCount = 84;
    const pedBodyGeo = this.trackCityGeo(new THREE.CapsuleGeometry(0.24, 0.85, 4, 8));
    pedBodyGeo.translate(0, 0.72, 0);
    const pedBodyMat = this.trackCityMat(
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.08 })
    );

    const pedHeadGeo = this.trackCityGeo(new THREE.SphereGeometry(0.19, 8, 8));
    pedHeadGeo.translate(0, 1.48, 0);
    const pedHeadMat = this.trackCityMat(
      new THREE.MeshStandardMaterial({ color: 0xe8be9e, roughness: 0.65, metalness: 0.05 })
    );

    this.pedBodyMesh = new THREE.InstancedMesh(pedBodyGeo, pedBodyMat, pedCount);
    this.pedHeadMesh = new THREE.InstancedMesh(pedHeadGeo, pedHeadMat, pedCount);
    this.pedBodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pedHeadMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const coatPalette = [0x38bdf8, 0xf43f5e, 0xfbbf24, 0xa855f7, 0x34d399, 0xe2e8f0, 0x475569];
    for (let i = 0; i < pedCount; i++) {
      const roadIdx = i % validRoads.length;
      const road = validRoads[roadIdx];
      this.pedAgents.push({
        roadIdx,
        segIdx: 0,
        t: (i * 0.13) % 1,
        speed: 1.25 + (i % 4) * 0.22,
        dir: i % 2 === 0 ? 1 : -1,
        sideOffset: (road.width || 10) * 0.5 + 1.15,
        phase: i * 0.8,
        x: 0,
        z: 0,
        yaw: 0
      });
      colorObj.setHex(coatPalette[i % coatPalette.length]);
      this.pedBodyMesh.setColorAt(i, colorObj);
    }
    if (this.pedBodyMesh.instanceColor) this.pedBodyMesh.instanceColor.needsUpdate = true;
    this.cityGroup.add(this.pedBodyMesh, this.pedHeadMesh);
  }

  private initWeatherParticleSystem(): void {
    const count = 900;
    const dropGeo = new THREE.BoxGeometry(0.035, 0.65, 0.035);
    this.persistentGeometries.push(dropGeo);

    this.weatherParticleMat = new THREE.MeshStandardMaterial({
      color: 0xcbe8ff,
      emissive: 0x88c4ff,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    this.persistentMaterials.push(this.weatherParticleMat);

    this.weatherParticlesMesh = new THREE.InstancedMesh(dropGeo, this.weatherParticleMat, count);
    this.weatherParticlesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.weatherParticlesMesh.frustumCulled = false;
    this.weatherParticlesMesh.visible = false;

    for (let i = 0; i < count; i++) {
      this.weatherSeeds[i * 3 + 0] = (Math.random() - 0.5) * 76;
      this.weatherSeeds[i * 3 + 1] = Math.random() * 38;
      this.weatherSeeds[i * 3 + 2] = (Math.random() - 0.5) * 76;
    }

    this.dynamicGroup.add(this.weatherParticlesMesh);
  }

  private initMissionVisuals(): void {
    const beaconGeo = new THREE.CylinderGeometry(2.2, 2.2, 16, 24, 1, true);
    beaconGeo.translate(0, 8, 0);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x28e0ff,
      emissive: 0x28e0ff,
      emissiveIntensity: 2.6,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.persistentGeometries.push(beaconGeo);
    this.persistentMaterials.push(beaconMat);
    this.missionBeaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.dynamicGroup.add(this.missionBeaconMesh);

    const ringGeo = new THREE.TorusGeometry(2.5, 0.14, 10, 32);
    ringGeo.rotateX(Math.PI * 0.5);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x28e0ff,
      emissiveIntensity: 3.2,
      roughness: 0.2,
      metalness: 0.3
    });
    this.persistentGeometries.push(ringGeo);
    this.persistentMaterials.push(ringMat);
    this.missionRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.dynamicGroup.add(this.missionRingMesh);

    this.gpsRibbonGeo = new THREE.BufferGeometry();
    const gpsMat = new THREE.MeshStandardMaterial({
      color: 0x28e0ff,
      emissive: 0x28e0ff,
      emissiveIntensity: 2.8,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.persistentMaterials.push(gpsMat);
    this.gpsRibbonMesh = new THREE.Mesh(this.gpsRibbonGeo, gpsMat);
    this.gpsRibbonMesh.frustumCulled = false;
    this.dynamicGroup.add(this.gpsRibbonMesh);
  }

  public startNewDeliveryMission(notifyUser = true): void {
    const candidates = this.activePOIs.filter((p) => Math.hypot(p.x, p.z) > 35);
    let pickupPos = new THREE.Vector3(58, 0, 42);
    let dropoffPos = new THREE.Vector3(-115, 0, -95);
    let pickupLabel = 'Hub Logistique';
    let dropoffLabel = 'Tour Horizon';

    if (candidates.length >= 2) {
      const idxA = Math.floor(Math.random() * candidates.length);
      let idxB = (idxA + Math.max(1, Math.floor(candidates.length / 2))) % candidates.length;
      if (idxB === idxA) idxB = (idxA + 1) % candidates.length;
      pickupPos = new THREE.Vector3(candidates[idxA].x, 0, candidates[idxA].z);
      dropoffPos = new THREE.Vector3(candidates[idxB].x, 0, candidates[idxB].z);
      pickupLabel = candidates[idxA].name;
      dropoffLabel = candidates[idxB].name;
    }

    const dist = pickupPos.distanceTo(dropoffPos);
    this.mission = {
      stage: 'pickup',
      pickupPos,
      dropoffPos,
      pickupLabel,
      dropoffLabel,
      timeRemaining: Math.max(65, Math.round(dist * 0.42)),
      reward: 850 + Math.round(dist * 2.2)
    };

    if (notifyUser) {
      this.ctx.ui.notify(
        'NOUVELLE MISSION EXPRESS',
        `Récupérez le colis à "${pickupLabel}" (Récompense: $${this.mission.reward})`,
        'info'
      );
    }
  }

  private buyOrVisitPenthouse(): void {
    if (!this.ownsPenthouse) {
      if (this.credits < PENTHOUSE_PRICE) {
        this.ctx.ui.notify(
          'CRÉDITS INSUFFISANTS',
          `Il vous faut $${PENTHOUSE_PRICE} (Solde actuel: $${this.credits}). Complétez des livraisons GPS !`,
          'warning'
        );
        return;
      }
      this.credits -= PENTHOUSE_PRICE;
      this.ownsPenthouse = true;
      if (this.penthouseBeaconMat) {
        this.penthouseBeaconMat.color.setHex(0x38f29d);
        this.penthouseBeaconMat.emissive.setHex(0x18d882);
      }
      this.ctx.audio.playBuildSnap();
      this.ctx.ui.notify(
        'PENTHOUSE ACQUIS !',
        'Héliport privé débloqué + Revenu immobilier passif (+$120 / 15s) !',
        'success'
      );
      this.setupToolbarUI();
    }

    // Teleport player onto Penthouse Rooftop Helipad
    if (this.activeVehicle) {
      this.exitVehicle();
    }
    this.playerPos.set(PENTHOUSE_POS.x, PENTHOUSE_HEIGHT + 0.55, PENTHOUSE_POS.z + 5.5);
    this.playerVel.set(0, 0, 0);
    this.ctx.localAvatar.root.position.copy(this.playerPos);
  }

  private setupRadialMenu(): void {
    const items: RadialWheelItem[] = [
      { id: 'spawn_car', label: 'Supercar Drift', icon: '🏎️', category: 'vehicle' },
      { id: 'spawn_moto', label: 'Superbike', icon: '🏍️', category: 'vehicle' },
      { id: 'spawn_heli', label: 'Hélicoptère', icon: '🚁', category: 'vehicle' },
      { id: 'mission_gps', label: 'Mission GPS', icon: '📦', category: 'tool' },
      { id: 'penthouse', label: 'Penthouse', icon: '🏢', category: 'emote' }
    ];
    this.ctx.ui.setRadialItems(items, (item) => {
      if (item.id === 'spawn_car') this.spawnVehicleNearPlayer('car');
      else if (item.id === 'spawn_moto') this.spawnVehicleNearPlayer('moto');
      else if (item.id === 'spawn_heli') this.spawnVehicleNearPlayer('heli');
      else if (item.id === 'mission_gps') this.startNewDeliveryMission(true);
      else if (item.id === 'penthouse') this.buyOrVisitPenthouse();
    });
  }

  private setupToolbarUI(): void {
    const presetOptions = CITY_PRESETS.map((p) => {
      const isActive = this.currentCityName.toLowerCase().includes(p.name.toLowerCase());
      return `<option value="${p.id}" ${isActive ? 'selected' : ''}>🌆 ${p.name}</option>`;
    }).join('');

    const curHour = this.ctx.sky.getTimeOfDay();
    const aptLabel = this.ownsPenthouse ? '🏢 Penthouse' : `🏢 Apt $${PENTHOUSE_PRICE}`;
    const pillStyle =
      'border:1px solid rgba(255,255,255,0.18);background:rgba(12,22,38,0.78);color:#eaf6ff;cursor:pointer;';

    const html = `
      <div>
        <select id="metro-city-select" title="Choisir une métropole réelle">${presetOptions}</select>
        <input id="metro-nominatim-input" type="text" placeholder="Ville OSM..." style="border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.45);color:#fff;outline:none;" />
        <button id="metro-nominatim-go" style="border:1px solid #38e2ff;background:rgba(56,226,255,0.2);color:#84f1ff;cursor:pointer;">🔍</button>
        <button id="metro-real-gps" style="border:1px solid #66f2a5;background:rgba(102,242,165,0.18);color:#66f2a5;cursor:pointer;">📍 GPS</button>
        <label style="display:inline-flex;align-items:center;gap:3px;">
          ☀️<input id="metro-tod-slider" type="range" min="0" max="24" step="0.25" value="${curHour.toFixed(2)}" style="accent-color:#38e2ff;cursor:pointer;" />
        </label>
        <button data-spawn="car" style="${pillStyle}" title="Appeler Supercar">🏎️ Auto</button>
        <button data-spawn="moto" style="${pillStyle}" title="Appeler Moto">🏍️ Moto</button>
        <button data-spawn="heli" style="${pillStyle}" title="Appeler Hélicoptère">🚁 Héli</button>
        <button id="metro-buy-apt" style="border:1px solid #ffb347;background:rgba(255,179,71,0.18);color:#ffd166;cursor:pointer;">${aptLabel}</button>
        <button id="metro-new-mission" style="border:1px solid #ff7b54;background:rgba(255,123,84,0.2);color:#ffb399;cursor:pointer;">📦 Mission</button>
      </div>
    `;

    this.ctx.ui.setWorldToolbarHTML(html, (container) => {
      const citySelect = container.querySelector<HTMLSelectElement>('#metro-city-select');
      citySelect?.addEventListener('change', () => {
        this.ctx.audio.playUIClick();
        const preset = CITY_PRESETS.find((p) => p.id === citySelect.value);
        if (preset) {
          void this.loadCityAtCoordinates(preset.name, preset.lat, preset.lon, true);
        }
      });

      const searchInput = container.querySelector<HTMLInputElement>('#metro-nominatim-input');
      const searchBtn = container.querySelector<HTMLButtonElement>('#metro-nominatim-go');
      const runNominatimSearch = async () => {
        const query = searchInput?.value.trim();
        if (!query) return;
        this.ctx.audio.playUIClick();
        this.ctx.ui.notify('RECHERCHE NOMINATIM', `Géolocalisation de "${query}"...`, 'info');
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 4000);
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
            { signal: controller.signal }
          );
          clearTimeout(t);
          if (!resp.ok) throw new Error('HTTP error');
          const results = (await resp.json()) as Array<{ display_name?: string; lat?: string; lon?: string }>;
          if (results.length > 0 && results[0].lat && results[0].lon) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            const shortName = (results[0].display_name || query).split(',')[0].trim();
            await this.loadCityAtCoordinates(shortName, lat, lon, true);
          } else {
            this.ctx.ui.notify('INTROUVABLE', `Aucun résultat Nominatim pour "${query}".`, 'warning');
          }
        } catch {
          this.ctx.ui.notify('MODE HORS-LIGNE', `Génération procédurale pour "${query}"...`, 'warning');
          const pseudoSeed = Array.from(query).reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
          const lat = ((pseudoSeed % 9000) / 100) - 45;
          const lon = (((pseudoSeed >> 4) % 18000) / 100) - 90;
          await this.loadCityAtCoordinates(query, lat, lon, true);
        }
      };

      if (searchInput) {
        searchInput.addEventListener('keydown', (ev) => {
          ev.stopPropagation();
          if (ev.key === 'Enter') {
            void runNominatimSearch();
            searchInput.blur();
          }
        });
      }
      searchBtn?.addEventListener('click', () => void runNominatimSearch());

      const gpsBtn = container.querySelector<HTMLButtonElement>('#metro-real-gps');
      gpsBtn?.addEventListener('click', () => {
        this.ctx.audio.playUIClick();
        if (!('geolocation' in navigator)) {
          this.ctx.ui.notify('GPS INDISPONIBLE', 'La géolocalisation navigateur n’est pas supportée.', 'warning');
          return;
        }
        this.ctx.ui.notify('GPS RÉEL', 'Acquisition de votre position satellite...', 'info');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            void this.loadCityAtCoordinates(
              'Position GPS Réelle',
              pos.coords.latitude,
              pos.coords.longitude,
              true
            );
          },
          () => {
            this.ctx.ui.notify('GPS REFUSÉ', 'Autorisez l’accès GPS dans le navigateur.', 'warning');
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      });

      const todSlider = container.querySelector<HTMLInputElement>('#metro-tod-slider');
      todSlider?.addEventListener('input', () => {
        const val = parseFloat(todSlider.value);
        if (Number.isFinite(val)) {
          this.manualTimeOverride = true;
          this.ctx.sky.setTimeOfDay(val);
        }
      });

      container.querySelectorAll<HTMLButtonElement>('button[data-spawn]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.ctx.audio.playUIClick();
          const kind = btn.dataset.spawn as MetropolisVehicleKind;
          this.spawnVehicleNearPlayer(kind);
        });
      });

      container.querySelector<HTMLButtonElement>('#metro-buy-apt')?.addEventListener('click', () => {
        this.ctx.audio.playUIClick();
        this.buyOrVisitPenthouse();
      });

      container.querySelector<HTMLButtonElement>('#metro-new-mission')?.addEventListener('click', () => {
        this.ctx.audio.playUIClick();
        this.startNewDeliveryMission(true);
      });
    });
  }

  private enterVehicle(v: RaycastVehicle): void {
    if (this.activeVehicle) {
      this.activeVehicle.isOccupied = false;
      this.activeVehicle.setActiveLights(false);
    }
    this.activeVehicle = v;
    v.isOccupied = true;
    v.setActiveLights(true);
    this.ctx.input.setContextMode(v.kind === 'heli' ? 'FLIGHT_SPACE' : 'DRIVING');

    const label =
      v.kind === 'car' ? 'Supercar GT (Espace = Drift)' : v.kind === 'moto' ? 'Superbike (Shift = Wheelie)' : 'Hélicoptère Urbain (Espace/C = Collectif)';
    this.ctx.ui.notify('VÉHICULE ACTIVÉ', label, 'info');
  }

  private exitVehicle(): void {
    if (!this.activeVehicle) return;
    const v = this.activeVehicle;
    v.isOccupied = false;
    v.setActiveLights(false);
    this.ctx.audio.updateVehicleEngine(false, 0, 0, 0);

    const rightX = Math.cos(v.headingRad);
    const rightZ = -Math.sin(v.headingRad);
    this.playerPos.set(v.position.x - rightX * 2.1, Math.max(0, v.position.y + 0.15), v.position.z - rightZ * 2.1);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = v.headingRad;
    this.activeVehicle = null;
    this.ctx.localAvatar.root.visible = true;
    this.ctx.localAvatar.root.position.copy(this.playerPos);
    this.ctx.input.setContextMode('ON_FOOT');
  }

  update(dt: number, elapsed: number): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const input = this.ctx.input.state;

    if (input.cameraToggleJustPressed) {
      this.firstPersonCam = !this.firstPersonCam;
    }

    if (input.hornJustPressed && this.activeVehicle) {
      this.ctx.audio.playHorn();
    }

    // Compute night factor from solar time
    const hour = this.ctx.sky.getTimeOfDay();
    const nightFactor =
      hour < 6.5 ? 1.0 - Math.max(0, (hour - 5.0) / 1.5) : hour > 18.5 ? Math.min(1.0, (hour - 18.5) / 1.5) : 0.0;

    // Update custom interior mapping & Gerstner river shaders
    if (this.glassInteriorMat) {
      updateInteriorMaterial(
        this.glassInteriorMat,
        elapsed,
        this.ctx.sky.sunDirection,
        this.ctx.camera.position,
        nightFactor
      );
    }
    if (this.brickInteriorMat) {
      updateInteriorMaterial(
        this.brickInteriorMat,
        elapsed,
        this.ctx.sky.sunDirection,
        this.ctx.camera.position,
        nightFactor
      );
    }
    if (this.riverOceanMat) {
      updateOceanMaterial(this.riverOceanMat, elapsed, this.ctx.sky.sunDirection, this.ctx.camera.position);
    }
    if (this.windSwayHandle) {
      this.windSwayHandle.update(elapsed);
    }
    if (this.streetlightBulbMat) {
      this.streetlightBulbMat.emissiveIntensity = THREE.MathUtils.lerp(0.35, 3.8, nightFactor);
    }
    if (this.poiSignMesh) {
      this.poiSignMesh.position.y = Math.sin(elapsed * 2.1) * 0.35;
    }

    // Passive Penthouse real-estate income
    if (this.ownsPenthouse) {
      this.passiveIncomeTimer += safeDt;
      if (this.passiveIncomeTimer >= 15.0) {
        this.passiveIncomeTimer = 0;
        this.credits += 120;
      }
    }

    // Enter / Exit vehicles or Penthouse Elevator with E
    if (input.interactJustPressed) {
      if (this.activeVehicle) {
        this.exitVehicle();
      } else {
        // Check Penthouse street lobby elevator first
        const distLobby = Math.hypot(
          this.playerPos.x - (PENTHOUSE_POS.x + 11.5),
          this.playerPos.z - PENTHOUSE_POS.z
        );
        if (distLobby < 3.2 && this.playerPos.y < 4) {
          this.buyOrVisitPenthouse();
        } else {
          let bestVeh: RaycastVehicle | null = null;
          let bestDist = 4.6;
          for (const v of this.vehicles) {
            const d = v.position.distanceTo(this.playerPos);
            if (d < bestDist) {
              bestDist = d;
              bestVeh = v;
            }
          }
          if (bestVeh) {
            this.enterVehicle(bestVeh);
          }
        }
      }
    }

    const sampleGround = (_x: number, _z: number) => 0.05;

    // Update all driveable/flyable vehicles
    if (this.smokePool) {
      for (const v of this.vehicles) {
        const isControlled = v === this.activeVehicle;
        v.update(
          safeDt,
          isControlled ? input : null,
          sampleGround,
          this.buildingColliders,
          this.smokePool,
          nightFactor
        );
      }
      this.smokePool.update(safeDt);
    }

    // Update Player Controller & Camera
    let statusHint = '[E] Entrer véhicule • [Tab] Roue radiale';
    if (this.activeVehicle) {
      const v = this.activeVehicle;
      this.playerPos.copy(v.position);
      this.playerYaw = v.headingRad;

      // Seat avatar inside moto/cockpit or hide in closed car first-person
      this.ctx.localAvatar.root.visible = !this.firstPersonCam && v.kind !== 'car';
      if (this.ctx.localAvatar.root.visible) {
        this.tempVecA.copy(v.driverSeatOffset).applyQuaternion(v.quaternion);
        this.ctx.localAvatar.root.position.copy(v.position).add(this.tempVecA);
        this.ctx.localAvatar.root.quaternion.copy(v.quaternion);
        this.ctx.localAvatar.updateAnimation(safeDt, 'drive', 0);
      }

      const rpmNorm = THREE.MathUtils.clamp((v.rpm - 900) / 7200, 0.05, 1.0);
      const load = Math.max(input.throttle, Math.abs(input.moveZ));
      this.ctx.audio.updateVehicleEngine(true, rpmNorm, load, v.tireSlip);
      this.ctx.audio.updateWindRush(THREE.MathUtils.clamp(v.speedKmh / 240, 0, 0.85));
      this.ctx.postFX.setSpeedFactor(THREE.MathUtils.clamp(v.speedKmh / 230, 0, 1));

      this.updateVehicleCamera(safeDt, v);
      this.ctx.network.broadcastVehicle(v.toNetPacket());
      statusHint =
        v.kind === 'heli'
          ? '[Espace/C] Monter/Descendre • [WASD] Cyclique • [E] Sortir'
          : v.kind === 'moto'
            ? '[Shift] Wheelie Boost • [Espace] Frein • [C] Caméra • [E] Sortir'
            : '[Espace] Drift Frein à main • [Shift] Nitro • [H] Klaxon • [E] Sortir';
    } else {
      this.ctx.audio.updateVehicleEngine(false, 0, 0, 0);
      this.ctx.postFX.setSpeedFactor(0);
      this.updateOnFootPlayer(safeDt, statusHint);

      // Show prompt if near a vehicle
      for (const v of this.vehicles) {
        if (v.position.distanceTo(this.playerPos) < 4.5) {
          const name = v.kind === 'car' ? 'Supercar' : v.kind === 'moto' ? 'Superbike' : 'Hélicoptère';
          statusHint = `[E] Piloter ${name}`;
          break;
        }
      }
    }

    // Update AI Traffic, Pedestrians, Weather Particles & Delivery Mission
    this.updateAITrafficAndPedestrians(safeDt, elapsed);
    this.updateWeatherParticles(safeDt, elapsed);
    this.updateDeliveryMission(safeDt, elapsed);

    // Atmosphere & Network sync
    this.ctx.sky.update(safeDt, this.playerPos);
    const remoteMarkers = this.ctx.network.syncRemoteEntities(this.ctx.scene, 'metropolis', safeDt);

    this.ctx.network.broadcastLocalPlayer({
      worldId: 'metropolis',
      x: this.playerPos.x,
      y: this.playerPos.y,
      z: this.playerPos.z,
      vx: this.activeVehicle ? this.activeVehicle.velocity.x : this.playerVel.x,
      vy: this.activeVehicle ? this.activeVehicle.velocity.y : this.playerVel.y,
      vz: this.activeVehicle ? this.activeVehicle.velocity.z : this.playerVel.z,
      yaw: this.playerYaw,
      pitch: input.cameraPitch,
      anim: this.activeVehicle ? 'drive' : !this.playerGrounded ? 'jump' : Math.hypot(this.playerVel.x, this.playerVel.z) > 5.5 ? 'run' : Math.hypot(this.playerVel.x, this.playerVel.z) > 0.4 ? 'walk' : 'idle',
      tool: 'none',
      vehicleId: this.activeVehicle ? this.activeVehicle.id : null,
      seatIndex: 0
    });

    const markers = [...this.getMinimapMarkers(), ...remoteMarkers];
    this.ctx.ui.updateMinimap(
      { x: this.playerPos.x, z: this.playerPos.z },
      this.playerYaw,
      markers,
      this.getGPSRoute()
    );

    const fps = this.ctx.quality.recordFrame(safeDt);
    const missionStatus = this.mission
      ? ` • 📦 ${this.mission.stage === 'pickup' ? 'Collecte' : `${Math.ceil(this.mission.timeRemaining)}s`}`
      : '';

    this.ctx.ui.updateTelemetry({
      fps,
      drawCalls: this.ctx.renderer.info.render.calls,
      triangles: this.ctx.renderer.info.render.triangles,
      pingMs: this.ctx.network.getAveragePing(),
      peerCount: this.ctx.network.getConnectedPeers().length,
      qualityPreset: this.ctx.quality.config.preset,
      autoScale: this.ctx.quality.autoScale,
      worldTitle: `${this.metadata.title} — ${this.currentCityName}`,
      contextMode: this.ctx.input.getContextMode(),
      speedKmh: this.activeVehicle ? Math.round(this.activeVehicle.speedKmh) : Math.round(Math.hypot(this.playerVel.x, this.playerVel.z) * 3.6),
      rpm: this.activeVehicle ? this.activeVehicle.rpm : undefined,
      gear: this.activeVehicle ? this.activeVehicle.gear : undefined,
      altitudeM: Math.round(this.playerPos.y),
      headingDeg: this.activeVehicle ? Math.round(this.activeVehicle.headingDeg) : Math.round(((-this.playerYaw * 180) / Math.PI + 360) % 360),
      credits: this.credits,
      weatherLabel: `${this.weatherLabel}${missionStatus}`,
      statusHint
    });
  }

  private updateOnFootPlayer(dt: number, _hint: string): void {
    const input = this.ctx.input.state;
    const camYaw = input.cameraYaw;
    const camPitch = THREE.MathUtils.clamp(input.cameraPitch, -1.1, 0.85);

    const forwardX = -Math.sin(camYaw);
    const forwardZ = -Math.cos(camYaw);
    const rightX = Math.cos(camYaw);
    const rightZ = -Math.sin(camYaw);

    const wishX = forwardX * input.moveZ + rightX * input.moveX;
    const wishZ = forwardZ * input.moveZ + rightZ * input.moveX;
    const wishLen = Math.hypot(wishX, wishZ);

    const moveSpeed = input.sprint ? 8.6 : 4.8;
    if (wishLen > 0.02) {
      const nx = wishX / wishLen;
      const nz = wishZ / wishLen;
      this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, nx * moveSpeed, 1 - Math.exp(-dt * 14));
      this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, nz * moveSpeed, 1 - Math.exp(-dt * 14));
      const targetYaw = Math.atan2(-nx, -nz);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * (1 - Math.exp(-dt * 14));
    } else {
      this.playerVel.x *= Math.exp(-dt * 14);
      this.playerVel.z *= Math.exp(-dt * 14);
    }

    // Check walkable rooftop height (Penthouse helipad)
    let floorY = 0;
    for (let i = 0; i < this.buildingColliders.length; i++) {
      const c = this.buildingColliders[i];
      if (!c.walkableRoof) continue;
      if (
        this.playerPos.x >= c.minX &&
        this.playerPos.x <= c.maxX &&
        this.playerPos.z >= c.minZ &&
        this.playerPos.z <= c.maxZ &&
        this.playerPos.y >= c.maxY - 1.4
      ) {
        floorY = Math.max(floorY, c.maxY);
      }
    }

    if (this.playerGrounded && input.jumpJustPressed) {
      this.playerVel.y = 7.8;
      this.playerGrounded = false;
    }

    this.playerVel.y -= 21.0 * dt;
    this.playerPos.addScaledVector(this.playerVel, dt);

    if (this.playerPos.y <= floorY) {
      this.playerPos.y = floorY;
      this.playerVel.y = 0;
      this.playerGrounded = true;
    } else {
      this.playerGrounded = false;
    }

    // Resolve horizontal AABB building collisions on foot
    const playerRadius = 0.45;
    for (let i = 0; i < this.buildingColliders.length; i++) {
      const b = this.buildingColliders[i];
      if (this.playerPos.y >= b.maxY - 0.25) continue;
      const cx = Math.max(b.minX, Math.min(this.playerPos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(this.playerPos.z, b.maxZ));
      const dx = this.playerPos.x - cx;
      const dz = this.playerPos.z - cz;
      const dSq = dx * dx + dz * dz;
      if (dSq < playerRadius * playerRadius) {
        const d = Math.sqrt(dSq);
        if (d > 1e-4) {
          this.playerPos.x += (dx / d) * (playerRadius - d);
          this.playerPos.z += (dz / d) * (playerRadius - d);
        } else {
          this.playerPos.z = b.maxZ + playerRadius;
        }
      }
    }

    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.playerGrounded && horizSpeed > 0.6) {
      this.footstepAccum += horizSpeed * dt;
      const stride = input.sprint ? 2.6 : 1.95;
      if (this.footstepAccum >= stride) {
        this.footstepAccum = 0;
        this.ctx.audio.playFootstep('asphalt', input.sprint);
      }
    }

    this.ctx.audio.updateWindRush(0);
    this.ctx.localAvatar.root.visible = !this.firstPersonCam;
    this.ctx.localAvatar.root.position.copy(this.playerPos);
    this.ctx.localAvatar.root.rotation.set(0, this.playerYaw, 0, 'YXZ');

    const anim = !this.playerGrounded
      ? 'jump'
      : horizSpeed > 6.0
        ? 'run'
        : horizSpeed > 0.35
          ? 'walk'
          : 'idle';
    this.ctx.localAvatar.updateAnimation(dt, anim, horizSpeed);

    // Camera follow
    const pivot = this.tempVecA.set(this.playerPos.x, this.playerPos.y + 1.55, this.playerPos.z);
    if (this.firstPersonCam) {
      this.ctx.camera.position.copy(pivot);
      this.tempVecB.set(
        pivot.x - Math.sin(camYaw) * Math.cos(camPitch) * 10,
        pivot.y + Math.sin(camPitch) * 10,
        pivot.z - Math.cos(camYaw) * Math.cos(camPitch) * 10
      );
      this.ctx.camera.lookAt(this.tempVecB);
    } else {
      const dist = 4.4;
      const desiredCam = this.tempVecB.set(
        pivot.x + Math.sin(camYaw) * Math.cos(camPitch) * dist,
        Math.max(this.playerPos.y + 0.45, pivot.y - Math.sin(camPitch) * dist),
        pivot.z + Math.cos(camYaw) * Math.cos(camPitch) * dist
      );
      this.ctx.camera.position.lerp(desiredCam, 1 - Math.exp(-dt * 18));
      this.ctx.camera.lookAt(pivot);
    }
  }

  private updateVehicleCamera(dt: number, v: RaycastVehicle): void {
    const input = this.ctx.input.state;
    if (this.firstPersonCam) {
      // Hood / Cockpit camera
      const localEye =
        v.kind === 'heli'
          ? this.tempVecA.set(0, 1.32, -1.15)
          : v.kind === 'moto'
            ? this.tempVecA.set(0, 1.26, -0.15)
            : this.tempVecA.set(0, 1.08, -0.35);
      localEye.applyQuaternion(v.quaternion).add(v.position);
      this.ctx.camera.position.copy(localEye);

      const lookFwd = this.tempVecB.set(0, 0.95, -25).applyQuaternion(v.quaternion).add(v.position);
      this.ctx.camera.lookAt(lookFwd);
      return;
    }

    const baseDist = v.kind === 'heli' ? 10.5 : v.kind === 'moto' ? 5.2 : 6.6;
    const speedZoom = Math.min(1.6, v.speedKmh / 140);
    const dist = baseDist + speedZoom;

    const orbitYaw = v.headingRad + (input.pointerLocked ? (input.cameraYaw - v.headingRad) * 0.18 : 0);
    const heightOffset = v.kind === 'heli' ? 3.8 : 2.15;

    const desiredPos = this.tempVecA.set(
      v.position.x + Math.sin(orbitYaw) * dist,
      v.position.y + heightOffset,
      v.position.z + Math.cos(orbitYaw) * dist
    );
    this.ctx.camera.position.lerp(desiredPos, 1 - Math.exp(-dt * 10.5));

    const lookTarget = this.tempVecB.set(
      v.position.x - Math.sin(v.headingRad) * 3.2,
      v.position.y + (v.kind === 'heli' ? 1.5 : 1.0),
      v.position.z - Math.cos(v.headingRad) * 3.2
    );
    this.ctx.camera.lookAt(lookTarget);
  }

  private updateAITrafficAndPedestrians(dt: number, elapsed: number): void {
    const validRoads = this.activeRoads.filter((r) => r.points.length >= 2);
    if (validRoads.length === 0) return;

    if (this.trafficBodyMesh && this.trafficLightMesh) {
      for (let i = 0; i < this.trafficAgents.length; i++) {
        const ag = this.trafficAgents[i];
        const road = validRoads[ag.roadIdx % validRoads.length];
        const pts = road.points;
        const segIdx = Math.min(ag.segIdx, pts.length - 2);
        const [x0, z0] = pts[segIdx];
        const [x1, z1] = pts[segIdx + 1];
        const dx = x1 - x0;
        const dz = z1 - z0;
        const segLen = Math.max(1, Math.hypot(dx, dz));

        // Yield smoothly if close to player
        const distPlayer = Math.hypot(ag.x - this.playerPos.x, ag.z - this.playerPos.z);
        const speedFactor = distPlayer < 9.5 ? 0.15 : 1.0;

        ag.t += ((ag.speed * speedFactor * dt) / segLen) * ag.dir;
        if (ag.t > 1) {
          if (segIdx + 2 < pts.length) {
            ag.segIdx = segIdx + 1;
            ag.t = 0;
          } else {
            ag.t = 1;
            ag.dir = -1;
          }
        } else if (ag.t < 0) {
          if (segIdx > 0) {
            ag.segIdx = segIdx - 1;
            ag.t = 1;
          } else {
            ag.t = 0;
            ag.dir = 1;
          }
        }

        const nx = dz / segLen;
        const nz = -dx / segLen;
        ag.x = x0 + dx * ag.t + nx * ag.laneOffset * ag.dir;
        ag.z = z0 + dz * ag.t + nz * ag.laneOffset * ag.dir;
        ag.yaw = Math.atan2(-dx * ag.dir, -dz * ag.dir);

        this.dummy.position.set(ag.x, 0.05, ag.z);
        this.dummy.rotation.set(0, ag.yaw, 0);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.trafficBodyMesh.setMatrixAt(i, this.dummy.matrix);
        this.trafficLightMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.trafficBodyMesh.instanceMatrix.needsUpdate = true;
      this.trafficLightMesh.instanceMatrix.needsUpdate = true;
    }

    if (this.pedBodyMesh && this.pedHeadMesh) {
      for (let i = 0; i < this.pedAgents.length; i++) {
        const p = this.pedAgents[i];
        const road = validRoads[p.roadIdx % validRoads.length];
        const pts = road.points;
        const segIdx = Math.min(p.segIdx, pts.length - 2);
        const [x0, z0] = pts[segIdx];
        const [x1, z1] = pts[segIdx + 1];
        const dx = x1 - x0;
        const dz = z1 - z0;
        const segLen = Math.max(1, Math.hypot(dx, dz));

        p.t += ((p.speed * dt) / segLen) * p.dir;
        if (p.t > 1) {
          p.t = 1;
          p.dir = -1;
        } else if (p.t < 0) {
          p.t = 0;
          p.dir = 1;
        }

        const nx = dz / segLen;
        const nz = -dx / segLen;
        const sideSign = i % 2 === 0 ? 1 : -1;
        p.x = x0 + dx * p.t + nx * p.sideOffset * sideSign;
        p.z = z0 + dz * p.t + nz * p.sideOffset * sideSign;
        p.yaw = Math.atan2(-dx * p.dir, -dz * p.dir);

        const stridePhase = elapsed * p.speed * 5.2 + p.phase;
        const bob = Math.abs(Math.sin(stridePhase)) * 0.09;
        const sway = Math.sin(stridePhase) * 0.08;

        this.dummy.position.set(p.x, 0.08 + bob, p.z);
        this.dummy.rotation.set(0, p.yaw, sway);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.pedBodyMesh.setMatrixAt(i, this.dummy.matrix);
        this.pedHeadMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.pedBodyMesh.instanceMatrix.needsUpdate = true;
      this.pedHeadMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateWeatherParticles(dt: number, elapsed: number): void {
    if (!this.weatherParticlesMesh || !this.weatherParticleMat) return;
    const isRain = this.weatherKind === 'rain' || this.weatherKind === 'storm';
    const isSnow = this.weatherKind === 'snow';

    if (!isRain && !isSnow) {
      this.weatherParticlesMesh.visible = false;
      return;
    }

    this.weatherParticlesMesh.visible = true;
    const camPos = this.ctx.camera.position;
    const fallSpeed = isRain ? 28.0 : 3.4;

    if (isSnow) {
      this.weatherParticleMat.color.setHex(0xffffff);
      this.weatherParticleMat.emissive.setHex(0xdbeafe);
    } else {
      this.weatherParticleMat.color.setHex(0xa5d8ff);
      this.weatherParticleMat.emissive.setHex(0x60a5fa);
    }

    const count = 900;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.weatherSeeds[idx + 1] -= fallSpeed * dt;
      if (this.weatherSeeds[idx + 1] < -6) {
        this.weatherSeeds[idx + 1] += 38;
      }

      const swirlX = isSnow ? Math.sin(elapsed * 1.8 + i) * 1.4 : 0;
      const swirlZ = isSnow ? Math.cos(elapsed * 1.5 + i * 0.7) * 1.4 : 0;

      this.dummy.position.set(
        camPos.x + this.weatherSeeds[idx + 0] + swirlX,
        camPos.y - 10 + this.weatherSeeds[idx + 1],
        camPos.z + this.weatherSeeds[idx + 2] + swirlZ
      );
      this.dummy.rotation.set(0, 0, isRain ? 0.06 : elapsed + i);
      if (isSnow) {
        this.dummy.scale.set(2.4, 0.16, 2.4);
      } else {
        this.dummy.scale.set(1, 1.15, 1);
      }
      this.dummy.updateMatrix();
      this.weatherParticlesMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.weatherParticlesMesh.instanceMatrix.needsUpdate = true;
  }

  private updateDeliveryMission(dt: number, elapsed: number): void {
    if (!this.mission || !this.missionBeaconMesh || !this.missionRingMesh) return;

    const target = this.mission.stage === 'pickup' ? this.mission.pickupPos : this.mission.dropoffPos;
    const beaconMat = this.missionBeaconMesh.material as THREE.MeshStandardMaterial;
    const ringMat = this.missionRingMesh.material as THREE.MeshStandardMaterial;

    const accentHex = this.mission.stage === 'pickup' ? 0x28e0ff : 0xffb347;
    beaconMat.color.setHex(accentHex);
    beaconMat.emissive.setHex(accentHex);
    ringMat.emissive.setHex(accentHex);

    this.missionBeaconMesh.position.set(target.x, 0, target.z);
    this.missionRingMesh.position.set(target.x, 0.45 + Math.sin(elapsed * 3.5) * 0.25, target.z);
    this.missionRingMesh.scale.setScalar(1 + Math.sin(elapsed * 4.0) * 0.12);

    if (this.mission.stage === 'dropoff') {
      this.mission.timeRemaining -= dt;
      if (this.mission.timeRemaining <= 0) {
        this.ctx.ui.notify('TEMPS ÉCOULÉ', 'La livraison express a expiré. Nouvelle mission assignée !', 'warning');
        this.startNewDeliveryMission(false);
        return;
      }
    }

    const horizDist = Math.hypot(this.playerPos.x - target.x, this.playerPos.z - target.z);
    if (horizDist < 5.5 && this.playerPos.y < 10) {
      if (this.mission.stage === 'pickup') {
        this.mission.stage = 'dropoff';
        this.ctx.audio.playBuildSnap();
        this.ctx.ui.notify(
          'COLIS RÉCUPÉRÉ !',
          `Livrez à "${this.mission.dropoffLabel}" avant la fin du compte à rebours !`,
          'info'
        );
      } else {
        const bonus = Math.round(this.mission.timeRemaining * 8);
        const total = this.mission.reward + bonus;
        this.credits += total;
        this.ctx.audio.playBuildSnap();
        this.ctx.ui.notify(
          'LIVRAISON RÉUSSIE !',
          `+$${total} crédités (Bonus vitesse: +$${bonus}) !`,
          'success'
        );
        this.startNewDeliveryMission(false);
      }
    }

    this.rebuildGPSRouteRibbon(target);
  }

  private rebuildGPSRouteRibbon(target: THREE.Vector3): void {
    // Build orthogonal / avenue-aligned L-bend waypoints from player to target
    const sx = this.playerPos.x;
    const sz = this.playerPos.z;
    const tx = target.x;
    const tz = target.z;

    const midX = Math.abs(tx - sx) > Math.abs(tz - sz) ? (sx + tx) * 0.5 : tx;
    const midZ = Math.abs(tx - sx) > Math.abs(tz - sz) ? sz : (sz + tz) * 0.5;

    this.gpsRoutePoints = [
      { x: sx, z: sz },
      { x: midX, z: midZ },
      { x: tx, z: tz }
    ];

    if (!this.gpsRibbonGeo) return;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const halfW = 0.85;
    const y = 0.22;

    for (let i = 0; i < this.gpsRoutePoints.length - 1; i++) {
      const a = this.gpsRoutePoints[i];
      const b = this.gpsRoutePoints[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.5) continue;
      const nx = (dz / len) * halfW;
      const nz = (-dx / len) * halfW;

      const x0 = a.x - nx, z0 = a.z - nz;
      const x1 = a.x + nx, z1 = a.z + nz;
      const x2 = b.x + nx, z2 = b.z + nz;
      const x3 = b.x - nx, z3 = b.z - nz;

      positions.push(x0, y, z0, x1, y, z1, x2, y, z2);
      positions.push(x0, y, z0, x2, y, z2, x3, y, z3);
      for (let k = 0; k < 6; k++) normals.push(0, 1, 0);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    }

    this.gpsRibbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.gpsRibbonGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.gpsRibbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.gpsRibbonGeo.computeBoundingSphere();
  }

  onWorldEvent(event: NetWorldEventPacket): void {
    if (event.worldId !== 'metropolis') return;
    if (event.type === 'city_change') {
      const name = typeof event.payload.name === 'string' ? event.payload.name : 'Ville P2P';
      const lat = typeof event.payload.lat === 'number' ? event.payload.lat : this.currentLat;
      const lon = typeof event.payload.lon === 'number' ? event.payload.lon : this.currentLon;
      if (Math.abs(lat - this.currentLat) > 1e-4 || Math.abs(lon - this.currentLon) > 1e-4) {
        void this.loadCityAtCoordinates(name, lat, lon, false);
      }
    }
  }

  getMinimapMarkers(): MinimapMarker[] {
    const markers: MinimapMarker[] = [];

    for (const v of this.vehicles) {
      if (v === this.activeVehicle) continue;
      markers.push({
        id: v.id,
        x: v.position.x,
        z: v.position.z,
        color: v.kind === 'heli' ? '#f5b82e' : '#38bdf8',
        type: 'vehicle',
        label: v.kind.toUpperCase()
      });
    }

    markers.push({
      id: 'penthouse',
      x: PENTHOUSE_POS.x,
      z: PENTHOUSE_POS.z,
      color: this.ownsPenthouse ? '#38f29d' : '#ffc857',
      type: 'poi',
      label: 'Penthouse'
    });

    if (this.mission) {
      const t = this.mission.stage === 'pickup' ? this.mission.pickupPos : this.mission.dropoffPos;
      markers.push({
        id: 'mission_target',
        x: t.x,
        z: t.z,
        color: this.mission.stage === 'pickup' ? '#28e0ff' : '#ffb347',
        type: 'objective',
        label: this.mission.stage === 'pickup' ? this.mission.pickupLabel : this.mission.dropoffLabel
      });
    }

    return markers;
  }

  getGPSRoute(): Array<{ x: number; z: number }> {
    return this.gpsRoutePoints;
  }

  dispose(): void {
    this.cityLoadGeneration++;
    this.ctx.audio.updateVehicleEngine(false, 0, 0, 0);
    this.ctx.audio.updateRainAmbience(0);
    this.ctx.audio.updateWindRush(0);
    this.ctx.postFX.setSpeedFactor(0);
    this.ctx.ui.setWorldToolbarHTML('');

    if (this.osmWorker) {
      this.osmWorker.terminate();
      this.osmWorker = null;
    }
    for (const pending of this.pendingWorkerRequests.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingWorkerRequests.clear();

    this.clearCurrentCityMeshes();

    if (this.smokePool) {
      this.smokePool.dispose();
      this.smokePool = null;
    }
    if (this.gpsRibbonGeo) {
      this.gpsRibbonGeo.dispose();
      this.gpsRibbonGeo = null;
    }
    for (const g of this.persistentGeometries) g.dispose();
    for (const m of this.persistentMaterials) m.dispose();
    this.persistentGeometries.length = 0;
    this.persistentMaterials.length = 0;

    this.ctx.scene.remove(this.worldRoot);
  }
}
