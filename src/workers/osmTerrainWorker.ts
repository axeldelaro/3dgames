export interface OsmPoint2D {
  x: number;
  z: number;
}

export interface ParsedBuilding {
  id: string;
  points: OsmPoint2D[];
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  angle: number;
  height: number;
  minHeight: number;
  levels: number;
  style: 'glass' | 'brick' | 'stone' | 'residential' | 'landmark';
  color: string;
  name: string;
}

export interface ParsedRoad {
  id: string;
  points: OsmPoint2D[];
  width: number;
  lanes: number;
  highway: string;
  kind: 'highway' | 'boulevard' | 'street' | 'pedestrian';
  name: string;
  oneway: boolean;
}

export interface ParsedPark {
  id: string;
  points: OsmPoint2D[];
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  radius: number;
  name: string;
  kind: string;
}

export interface ParsedWater {
  id: string;
  points: OsmPoint2D[];
  width: number;
  isArea: boolean;
  centerX: number;
  centerZ: number;
  name: string;
  kind: string;
}

export interface ParsedPOI {
  id: string;
  x: number;
  z: number;
  name: string;
  category: 'shop' | 'restaurant' | 'transit' | 'landmark' | 'service' | 'leisure';
  subType: string;
}

export interface ParsedCityData {
  centerLat: number;
  centerLon: number;
  isFallback: boolean;
  buildings: ParsedBuilding[];
  roads: ParsedRoad[];
  parks: ParsedPark[];
  water: ParsedWater[];
  pois: ParsedPOI[];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

export interface ParseOsmRequest {
  type: 'parse_osm';
  id?: string | number;
  requestId?: string | number;
  elements?: OverpassElement[];
  data?: { elements?: OverpassElement[] };
  rawJson?: string;
  centerLat?: number;
  centerLon?: number;
  lat?: number;
  lon?: number;
  lng?: number;
}

export interface GenerateFallbackCityRequest {
  type: 'generate_fallback_city';
  id?: string | number;
  requestId?: string | number;
  centerLat?: number;
  centerLon?: number;
  lat?: number;
  lon?: number;
  lng?: number;
  radius?: number;
}

export interface GenerateTerrainChunkRequest {
  type: 'generate_terrain_chunk';
  id?: string | number;
  requestId?: string | number;
  chunkX: number;
  chunkZ: number;
  chunkSize?: number;
  segments?: number;
  resolution?: number;
  seed?: number;
  preset?: string;
  biome?: string;
  worldId?: string;
  heightScale?: number;
  seaLevel?: number;
  originMode?: 'center' | 'corner' | 'world';
}

export type WorkerRequest =
  | ParseOsmRequest
  | GenerateFallbackCityRequest
  | GenerateTerrainChunkRequest;

export interface TerrainChunkResponse {
  type: 'generate_terrain_chunk';
  id?: string | number;
  requestId?: string | number;
  chunkX: number;
  chunkZ: number;
  chunkSize: number;
  segments: number;
  worldOriginX: number;
  worldOriginZ: number;
  minHeight: number;
  maxHeight: number;
  positions: Float32Array<ArrayBuffer>;
  normals: Float32Array<ArrayBuffer>;
  colors: Float32Array<ArrayBuffer>;
  uvs: Float32Array<ArrayBuffer>;
  indices: Uint32Array<ArrayBuffer>;
  heights: Float32Array<ArrayBuffer>;
}

const METERS_PER_DEG_LAT = 111320.0;

// Self-contained fast deterministic Mulberry32 PRNG + 2D Simplex / FBM / Ridged noise
class WorkerRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  public int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }
}

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const GRAD2: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1]
];

class WorkerNoise {
  private readonly perm = new Uint8Array(512);
  private readonly permMod12 = new Uint8Array(512);

  constructor(seed = 202630) {
    const rng = new WorkerRng(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  public simplex2D(xin: number, yin: number): number {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

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
      n0 = t0 * t0 * (GRAD2[gi0][0] * x0 + GRAD2[gi0][1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (GRAD2[gi1][0] * x1 + GRAD2[gi1][1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (GRAD2[gi2][0] * x2 + GRAD2[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  public fbm2D(x: number, y: number, octaves = 5, lacunarity = 2.03, gain = 0.5): number {
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

  public ridged2D(x: number, y: number, octaves = 5, lacunarity = 2.1, gain = 0.52): number {
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

const noiseCache = new Map<number, WorkerNoise>();
function getNoise(seed: number): WorkerNoise {
  let n = noiseCache.get(seed);
  if (!n) {
    if (noiseCache.size > 8) {
      noiseCache.clear();
    }
    n = new WorkerNoise(seed);
    noiseCache.set(seed, n);
  }
  return n;
}

function hashIdToFloat(id: number): number {
  let x = (id ^ 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function parseMetricNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  const num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;
  if (cleaned.includes('ft') || cleaned.includes("'")) {
    return num * 0.3048;
  }
  return num;
}

function computeOrientedFootprintStats(points: OsmPoint2D[]): {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  angle: number;
} {
  const n = points.length;
  if (n === 0) {
    return { centerX: 0, centerZ: 0, width: 10, depth: 10, angle: 0 };
  }

  // Exclude duplicate closing point if present
  const effCount =
    n > 2 &&
    Math.hypot(points[0].x - points[n - 1].x, points[0].z - points[n - 1].z) < 0.05
      ? n - 1
      : n;

  // Find longest wall segment to align oriented bounding box angle
  let longestLenSq = -1;
  let angle = 0;
  for (let i = 0; i < effCount; i++) {
    const a = points[i];
    const b = points[(i + 1) % effCount];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    if (lenSq > longestLenSq) {
      longestLenSq = lenSq;
      angle = Math.atan2(dz, dx);
    }
  }

  const cosA = Math.cos(-angle);
  const sinA = Math.sin(-angle);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (let i = 0; i < effCount; i++) {
    const px = points[i].x;
    const pz = points[i].z;
    const u = px * cosA - pz * sinA;
    const v = px * sinA + pz * cosA;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  const midU = (minU + maxU) * 0.5;
  const midV = (minV + maxV) * 0.5;
  const cosInv = Math.cos(angle);
  const sinInv = Math.sin(angle);

  return {
    centerX: midU * cosInv - midV * sinInv,
    centerZ: midU * sinInv + midV * cosInv,
    width: Math.max(3.5, maxU - minU),
    depth: Math.max(3.5, maxV - minV),
    angle
  };
}

function parseOsmElements(
  elements: OverpassElement[],
  centerLat: number,
  centerLon: number
): ParsedCityData {
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos((centerLat * Math.PI) / 180);

  const project = (lat: number, lon: number): OsmPoint2D => ({
    x: (lon - centerLon) * metersPerDegLon,
    z: -(lat - centerLat) * METERS_PER_DEG_LAT
  });

  const nodeMap = new Map<number, OsmPoint2D>();
  const buildings: ParsedBuilding[] = [];
  const roads: ParsedRoad[] = [];
  const parks: ParsedPark[] = [];
  const water: ParsedWater[] = [];
  const pois: ParsedPOI[] = [];

  // Pass 1: Index all nodes & extract node POIs
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      const pt = project(el.lat, el.lon);
      nodeMap.set(el.id, pt);

      if (el.tags) {
        const poi = classifyPoi(String(el.id), pt.x, pt.z, el.tags);
        if (poi && pois.length < 180) {
          pois.push(poi);
        }
      }
    }
  }

  // Pass 2: Extract ways (buildings, roads, parks, waterways, area POIs)
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type !== 'way' || !el.tags) continue;

    const pts: OsmPoint2D[] = [];
    if (Array.isArray(el.geometry) && el.geometry.length >= 2) {
      for (let k = 0; k < el.geometry.length; k++) {
        const g = el.geometry[k];
        pts.push(project(g.lat, g.lon));
      }
    } else if (Array.isArray(el.nodes) && el.nodes.length >= 2) {
      for (let k = 0; k < el.nodes.length; k++) {
        const n = nodeMap.get(el.nodes[k]);
        if (n) pts.push(n);
      }
    }

    if (pts.length < 2) continue;

    const tags = el.tags;

    // 1. Building footprints
    if (tags.building && tags.building !== 'no' && pts.length >= 3) {
      const obb = computeOrientedFootprintStats(pts);
      if (obb.width > 260 && obb.depth > 260) {
        continue;
      }

      const hFromTag = parseMetricNumber(tags.height);
      const lvlFromTag = parseMetricNumber(tags['building:levels']);
      const minH = parseMetricNumber(tags.min_height) ?? (parseMetricNumber(tags['building:min_level']) ?? 0) * 3.4;

      const rand = hashIdToFloat(el.id);
      const bType = tags.building;

      let height: number;
      if (hFromTag !== null && hFromTag > 2) {
        height = Math.min(320, hFromTag);
      } else if (lvlFromTag !== null && lvlFromTag >= 1) {
        height = Math.min(320, lvlFromTag * 3.45 + 1.2);
      } else if (bType === 'office' || bType === 'commercial' || bType === 'hotel') {
        height = 24 + rand * 48;
      } else if (bType === 'apartments' || bType === 'residential') {
        height = 14 + rand * 16;
      } else if (bType === 'cathedral' || bType === 'church' || bType === 'civic') {
        height = 22 + rand * 20;
      } else if (bType === 'house' || bType === 'detached' || bType === 'terrace') {
        height = 7.5 + rand * 5;
      } else {
        height = 12 + rand * 20;
      }

      const levels = Math.max(1, Math.round(height / 3.45));
      const style: ParsedBuilding['style'] =
        height > 44 || bType === 'office'
          ? 'glass'
          : bType === 'cathedral' || bType === 'civic'
            ? 'landmark'
            : rand > 0.55
              ? 'stone'
              : rand > 0.25
                ? 'brick'
                : 'residential';

      const color =
        tags['building:colour'] ??
        (style === 'glass'
          ? '#4b6b8a'
          : style === 'stone'
            ? '#dfd5c5'
            : style === 'brick'
              ? '#b56e57'
              : '#cfd6df');

      buildings.push({
        id: `b_${el.id}`,
        points: pts,
        centerX: obb.centerX,
        centerZ: obb.centerZ,
        width: obb.width,
        depth: obb.depth,
        angle: obb.angle,
        height,
        minHeight: Math.max(0, Math.min(height - 2, minH)),
        levels,
        style,
        color,
        name: tags.name ?? tags['name:fr'] ?? ''
      });

      if (tags.name && (tags.shop || tags.amenity || tags.tourism) && pois.length < 180) {
        const poi = classifyPoi(`w_${el.id}`, obb.centerX, obb.centerZ, tags);
        if (poi) pois.push(poi);
      }
      continue;
    }

    // 2. Roadways & pedestrian avenues
    if (tags.highway) {
      const hw = tags.highway;
      if (hw === 'steps' || hw === 'corridor' || hw === 'proposed' || hw === 'construction') {
        continue;
      }

      let width = 7.5;
      let kind: ParsedRoad['kind'] = 'street';
      if (hw === 'motorway' || hw === 'trunk') {
        width = 16;
        kind = 'highway';
      } else if (hw === 'primary' || hw === 'secondary') {
        width = 12;
        kind = 'boulevard';
      } else if (hw === 'tertiary' || hw === 'residential' || hw === 'unclassified' || hw === 'living_street') {
        width = 8;
        kind = 'street';
      } else if (hw === 'pedestrian' || hw === 'footway' || hw === 'path' || hw === 'cycleway') {
        width = 3.6;
        kind = 'pedestrian';
      } else {
        width = 6.5;
      }

      const parsedLanes = parseMetricNumber(tags.lanes);
      const lanes = parsedLanes !== null && parsedLanes >= 1 ? Math.round(parsedLanes) : Math.max(1, Math.round(width / 3.6));

      roads.push({
        id: `r_${el.id}`,
        points: pts,
        width,
        lanes,
        highway: hw,
        kind,
        name: tags.name ?? tags['name:fr'] ?? '',
        oneway: tags.oneway === 'yes' || hw === 'motorway'
      });
      continue;
    }

    // 3. Parks, gardens & green spaces
    if (
      (tags.leisure === 'park' ||
        tags.leisure === 'garden' ||
        tags.leisure === 'Recreation_ground' ||
        tags.landuse === 'grass' ||
        tags.landuse === 'meadow' ||
        tags.landuse === 'forest' ||
        tags.landuse === 'village_green') &&
      pts.length >= 3
    ) {
      const obb = computeOrientedFootprintStats(pts);
      parks.push({
        id: `p_${el.id}`,
        points: pts,
        centerX: obb.centerX,
        centerZ: obb.centerZ,
        width: obb.width,
        depth: obb.depth,
        radius: Math.max(obb.width, obb.depth) * 0.5,
        name: tags.name ?? tags['name:fr'] ?? 'Parc Urbain',
        kind: tags.leisure ?? tags.landuse ?? 'park'
      });
      continue;
    }

    // 4. Rivers, canals & water bodies
    if (tags.waterway || tags.natural === 'water' || tags.water) {
      const isClosed =
        pts.length >= 4 &&
        Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z) < 2.0;
      const isArea = isClosed && (tags.natural === 'water' || Boolean(tags.water));
      const obb = computeOrientedFootprintStats(pts);
      const wTag = parseMetricNumber(tags.width);
      const width =
        wTag ??
        (tags.waterway === 'river'
          ? 42
          : tags.waterway === 'canal'
            ? 20
            : 10);

      water.push({
        id: `w_${el.id}`,
        points: pts,
        width,
        isArea,
        centerX: obb.centerX,
        centerZ: obb.centerZ,
        name: tags.name ?? tags['name:fr'] ?? '',
        kind: tags.waterway ?? tags.water ?? 'water'
      });
    }
  }

  return {
    centerLat,
    centerLon,
    isFallback: false,
    buildings,
    roads,
    parks,
    water,
    pois
  };
}

function classifyPoi(
  id: string,
  x: number,
  z: number,
  tags: Record<string, string>
): ParsedPOI | null {
  const name = tags.name ?? tags['name:fr'] ?? tags.brand ?? '';
  if (!name) {
    return null;
  }

  if (tags.shop) {
    return { id: `poi_${id}`, x, z, name, category: 'shop', subType: tags.shop };
  }
  if (
    tags.amenity === 'restaurant' ||
    tags.amenity === 'cafe' ||
    tags.amenity === 'bar' ||
    tags.amenity === 'bakery' ||
    tags.amenity === 'fast_food'
  ) {
    return { id: `poi_${id}`, x, z, name, category: 'restaurant', subType: tags.amenity };
  }
  if (tags.railway === 'station' || tags.railway === 'subway_entrance' || tags.amenity === 'bus_station') {
    return { id: `poi_${id}`, x, z, name, category: 'transit', subType: tags.railway ?? 'transit' };
  }
  if (tags.tourism || tags.historic) {
    return {
      id: `poi_${id}`,
      x,
      z,
      name,
      category: 'landmark',
      subType: tags.tourism ?? tags.historic ?? 'monument'
    };
  }
  if (tags.amenity === 'bank' || tags.amenity === 'pharmacy' || tags.amenity === 'hospital' || tags.amenity === 'fuel') {
    return { id: `poi_${id}`, x, z, name, category: 'service', subType: tags.amenity };
  }
  if (tags.leisure) {
    return { id: `poi_${id}`, x, z, name, category: 'leisure', subType: tags.leisure };
  }
  return null;
}

function makeRectPolygon(
  cx: number,
  cz: number,
  width: number,
  depth: number,
  angle = 0
): OsmPoint2D[] {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const corners: ReadonlyArray<readonly [number, number]> = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
    [-hw, -hd]
  ];
  return corners.map(([lx, lz]) => ({
    x: cx + lx * c - lz * s,
    z: cz + lx * s + lz * c
  }));
}

const AVENUE_NAMES = [
  'Grand Boulevard Haussmann',
  'Avenue de la République',
  'Boulevard de l’Horizon',
  'Avenue Victor Hugo',
  'Boulevard Saint-Germain',
  'Avenue Centrale',
  'Rue de Rivoli',
  'Avenue des Nations',
  'Cours Mirabeau',
  'Rue Royale'
];

const FALLBACK_POIS: ReadonlyArray<{
  name: string;
  category: ParsedPOI['category'];
  subType: string;
}> = [
  { name: 'Boulangerie Artisanale Dorée', category: 'shop', subType: 'bakery' },
  { name: 'Grand Café de l’Opéra', category: 'restaurant', subType: 'cafe' },
  { name: 'Pharmacie Centrale 24/7', category: 'service', subType: 'pharmacy' },
  { name: 'Concession Supercar GT', category: 'shop', subType: 'car' },
  { name: 'Tour Panoramique Omniverse', category: 'landmark', subType: 'viewpoint' },
  { name: 'Gare Centrale Métropole', category: 'transit', subType: 'station' },
  { name: 'Hôtel Le Majestic 5★', category: 'landmark', subType: 'hotel' },
  { name: 'Brasserie des Boulevards', category: 'restaurant', subType: 'restaurant' },
  { name: 'Musée des Beaux-Arts', category: 'landmark', subType: 'museum' },
  { name: 'Héliport Exécutif', category: 'transit', subType: 'heliport' },
  { name: 'Cinéma Grand Rex', category: 'leisure', subType: 'cinema' },
  { name: 'Librairie & Galerie Arcade', category: 'shop', subType: 'books' },
  { name: 'Banque Internationale', category: 'service', subType: 'bank' },
  { name: 'Halle Bio & Marché Couvert', category: 'shop', subType: 'supermarket' },
  { name: 'Station Électrique HyperCharge', category: 'service', subType: 'fuel' },
  { name: 'Boutique Haute Couture', category: 'shop', subType: 'clothes' }
];

function generateFallbackCity(
  centerLat: number,
  centerLon: number,
  radius = 620
): ParsedCityData {
  const seed =
    ((Math.round(centerLat * 10000) * 73856093) ^ (Math.round(centerLon * 10000) * 19349663)) >>> 0;
  const rng = new WorkerRng(seed || 202630);

  const buildings: ParsedBuilding[] = [];
  const roads: ParsedRoad[] = [];
  const parks: ParsedPark[] = [];
  const water: ParsedWater[] = [];
  const pois: ParsedPOI[] = [];

  const riverOffsetZ = rng.range(-150, -90);
  const riverPhase = rng.range(0, Math.PI * 2);
  const riverZAt = (x: number): number =>
    riverOffsetZ + Math.sin(x * 0.0042 + riverPhase) * 58;

  // 1. Meandering urban river
  const riverPts: OsmPoint2D[] = [];
  for (let x = -radius - 80; x <= radius + 80; x += 36) {
    riverPts.push({ x, z: riverZAt(x) });
  }
  water.push({
    id: 'fb_river_main',
    points: riverPts,
    width: 46,
    isArea: false,
    centerX: 0,
    centerZ: riverOffsetZ,
    name: 'Fleuve Métropolitain',
    kind: 'river'
  });

  // 2. Central Park + Ornamental Basin (south-east of center, clear of river)
  const parkCX = 135;
  const parkCZ = 135;
  const parkW = 148;
  const parkD = 148;
  parks.push({
    id: 'fb_central_park',
    points: makeRectPolygon(parkCX, parkCZ, parkW, parkD, 0),
    centerX: parkCX,
    centerZ: parkCZ,
    width: parkW,
    depth: parkD,
    radius: 78,
    name: 'Grand Parc Central',
    kind: 'park'
  });

  water.push({
    id: 'fb_park_pond',
    points: makeRectPolygon(parkCX, parkCZ, 46, 34, 0.25),
    width: 34,
    isArea: true,
    centerX: parkCX,
    centerZ: parkCZ,
    name: 'Bassin du Parc',
    kind: 'pond'
  });

  // 3. Structured urban grid + Grand Boulevards
  const blockStep = 84;
  const gridHalf = Math.floor(radius / blockStep);
  let roadIdx = 0;

  for (let gx = -gridHalf; gx <= gridHalf; gx++) {
    const x = gx * blockStep;
    const isBoulevard = gx === 0 || Math.abs(gx) === 3;
    roads.push({
      id: `fb_road_ns_${gx}`,
      points: [
        { x, z: -radius },
        { x, z: 0 },
        { x, z: radius }
      ],
      width: isBoulevard ? 15 : 8.5,
      lanes: isBoulevard ? 4 : 2,
      highway: isBoulevard ? 'primary' : 'residential',
      kind: isBoulevard ? 'boulevard' : 'street',
      name: AVENUE_NAMES[roadIdx++ % AVENUE_NAMES.length],
      oneway: false
    });
  }

  for (let gz = -gridHalf; gz <= gridHalf; gz++) {
    const z = gz * blockStep;
    // Avoid laying a horizontal road right inside the river channel
    if (Math.abs(z - riverOffsetZ) < 28) continue;
    const isBoulevard = gz === 0 || Math.abs(gz) === 3;
    roads.push({
      id: `fb_road_ew_${gz}`,
      points: [
        { x: -radius, z },
        { x: 0, z },
        { x: radius, z }
      ],
      width: isBoulevard ? 15 : 8.5,
      lanes: isBoulevard ? 4 : 2,
      highway: isBoulevard ? 'primary' : 'residential',
      kind: isBoulevard ? 'boulevard' : 'street',
      name: AVENUE_NAMES[roadIdx++ % AVENUE_NAMES.length],
      oneway: false
    });
  }

  // Diagonal Haussmann ceremonial avenue
  roads.push({
    id: 'fb_diag_boulevard',
    points: [
      { x: -radius * 0.85, z: radius * 0.85 },
      { x: 0, z: 0 },
      { x: radius * 0.85, z: -radius * 0.85 }
    ],
    width: 14,
    lanes: 4,
    highway: 'primary',
    kind: 'boulevard',
    name: 'Grande Avenue de l’Étoile',
    oneway: false
  });

  // 4. Populate urban blocks with CBD skyscrapers, Haussmann mid-rises & named shops
  let bCount = 0;
  let poiCursor = 0;

  for (let gx = -gridHalf; gx < gridHalf; gx++) {
    for (let gz = -gridHalf; gz < gridHalf; gz++) {
      const blockCX = (gx + 0.5) * blockStep;
      const blockCZ = (gz + 0.5) * blockStep;

      // Keep clear of spawn plaza right at (0, 0)
      if (Math.hypot(blockCX, blockCZ) < 24) continue;

      // Keep clear of Central Park
      if (
        Math.abs(blockCX - parkCX) < parkW * 0.55 &&
        Math.abs(blockCZ - parkCZ) < parkD * 0.55
      ) {
        continue;
      }

      // Keep clear of winding river channel
      if (Math.abs(blockCZ - riverZAt(blockCX)) < 44) {
        continue;
      }

      // Occasional pocket green square
      if (rng.next() < 0.06) {
        parks.push({
          id: `fb_sq_${gx}_${gz}`,
          points: makeRectPolygon(blockCX, blockCZ, 54, 54, 0),
          centerX: blockCX,
          centerZ: blockCZ,
          width: 54,
          depth: 54,
          radius: 28,
          name: 'Square arboré',
          kind: 'garden'
        });
        continue;
      }

      const distCenter = Math.hypot(blockCX, blockCZ);

      // CBD High-rise signature tower on central blocks
      if (distCenter < 210 && rng.next() < 0.52) {
        const w = rng.range(26, 40);
        const d = rng.range(26, 40);
        const h = rng.range(58, 138);
        const levels = Math.round(h / 3.6);
        buildings.push({
          id: `fb_tower_${bCount++}`,
          points: makeRectPolygon(blockCX, blockCZ, w, d, 0),
          centerX: blockCX,
          centerZ: blockCZ,
          width: w,
          depth: d,
          angle: 0,
          height: h,
          minHeight: 0,
          levels,
          style: 'glass',
          color: rng.next() > 0.5 ? '#3b5d80' : '#4a6b82',
          name: bCount === 1 ? 'Tour Omniverse' : ''
        });
      } else {
        // Subdivide block into 4 perimeter urban buildings
        const offsets: ReadonlyArray<readonly [number, number]> = [
          [-16, -16],
          [16, -16],
          [-16, 16],
          [16, 16]
        ];

        for (let k = 0; k < offsets.length; k++) {
          const bx = blockCX + offsets[k][0];
          const bz = blockCZ + offsets[k][1];
          if (Math.abs(bz - riverZAt(bx)) < 36) continue;

          const w = rng.range(18, 25);
          const d = rng.range(18, 25);
          const urbanFactor = Math.max(0.25, 1 - distCenter / (radius * 1.15));
          const h = rng.range(11, 20) + urbanFactor * rng.range(8, 26);
          const levels = Math.max(2, Math.round(h / 3.45));
          const rStyle = rng.next();
          const style: ParsedBuilding['style'] =
            h > 36 ? 'glass' : rStyle > 0.5 ? 'stone' : rStyle > 0.2 ? 'brick' : 'residential';
          const color =
            style === 'glass'
              ? '#4b6c8c'
              : style === 'stone'
                ? '#dfd6c7'
                : style === 'brick'
                  ? '#b87158'
                  : '#cfd6e0';

          buildings.push({
            id: `fb_b_${bCount++}`,
            points: makeRectPolygon(bx, bz, w, d, 0),
            centerX: bx,
            centerZ: bz,
            width: w,
            depth: d,
            angle: 0,
            height: h,
            minHeight: 0,
            levels,
            style,
            color,
            name: ''
          });
        }
      }

      if (distCenter < 420 && rng.next() < 0.34 && pois.length < 36) {
        const template = FALLBACK_POIS[poiCursor++ % FALLBACK_POIS.length];
        pois.push({
          id: `fb_poi_${poiCursor}`,
          x: blockCX + rng.range(-22, 22),
          z: blockCZ + rng.range(-22, 22),
          name: template.name,
          category: template.category,
          subType: template.subType
        });
      }
    }
  }

  return {
    centerLat,
    centerLon,
    isFallback: true,
    buildings,
    roads,
    parks,
    water,
    pois
  };
}

function sampleProceduralHeight(
  wx: number,
  wz: number,
  noise: WorkerNoise,
  mode: string,
  heightScale: number
): number {
  const m = mode.toLowerCase();

  if (m.includes('fuji')) {
    const dist = Math.hypot(wx, wz) * 0.0012;
    const cone = Math.max(0, 1.35 - Math.pow(dist, 0.78)) * 310;
    const crater = dist < 0.12 ? -Math.cos((dist / 0.12) * Math.PI * 0.5) * 32 : 0;
    const detail = noise.ridged2D(wx * 0.004, wz * 0.004, 4) * 28 + noise.fbm2D(wx * 0.015, wz * 0.015, 3) * 6;
    return (cone + crater + detail) * heightScale;
  }

  if (m.includes('canyon')) {
    const base = noise.fbm2D(wx * 0.0014, wz * 0.0014, 5) * 0.5 + 0.5;
    // Terraced sandstone mesas + deep winding river gorge
    const riverMeander = Math.sin(wx * 0.0022 + noise.simplex2D(wx * 0.001, wz * 0.001) * 1.4) * 140;
    const gorgeDist = Math.abs(wz - riverMeander);
    const gorgeFactor = Math.min(1, Math.pow(gorgeDist / 165, 1.6));
    const steps = 6;
    const terraced = (Math.floor(base * steps) + Math.pow((base * steps) % 1, 3.2)) / steps;
    return (-18 + gorgeFactor * (terraced * 165 + 24) + noise.fbm2D(wx * 0.02, wz * 0.02, 3) * 3.2) * heightScale;
  }

  if (m.includes('fjord')) {
    const channel = Math.sin(wz * 0.0018) * 110 + noise.simplex2D(wx * 0.0015, wz * 0.0015) * 65;
    const wall = Math.min(1.4, Math.pow(Math.abs(wx - channel) / 140, 1.8));
    const peaks = noise.ridged2D(wx * 0.0025, wz * 0.0025, 5) * 195;
    return (-22 + wall * (65 + peaks)) * heightScale;
  }

  if (m.includes('alp') || m.includes('extreme')) {
    const macro = noise.fbm2D(wx * 0.0011, wz * 0.0011, 4) * 65;
    const ridges = noise.ridged2D(wx * 0.0022, wz * 0.0022, 6) * 210;
    const micro = noise.fbm2D(wx * 0.018, wz * 0.018, 3) * 4.5;
    return (macro + ridges + micro - 18) * heightScale;
  }

  if (m.includes('aetheria')) {
    const rolling = noise.fbm2D(wx * 0.0022, wz * 0.0022, 5) * 42;
    const spires = Math.pow(noise.ridged2D(wx * 0.0034, wz * 0.0034, 4), 1.8) * 92;
    const valley = Math.sin(wx * 0.003) * Math.cos(wz * 0.003) * 14;
    return (rolling + spires + valley + 6) * heightScale;
  }

  // Default Nordic / Valheim continent with coastal beaches, rivers, forests & snowy peaks
  const continent = noise.fbm2D(wx * 0.0009, wz * 0.0009, 4) * 52 + 14;
  const hills = noise.fbm2D(wx * 0.0035, wz * 0.0035, 4) * 22;
  const alpineMask = Math.max(0, (continent - 18) / 38);
  const peaks = alpineMask * noise.ridged2D(wx * 0.0032, wz * 0.0032, 5) * 98;

  // Carve winding river channel
  const riverRibbon = Math.abs(noise.simplex2D(wx * 0.0014 + 7.3, wz * 0.0014 - 3.1));
  const riverCut = riverRibbon < 0.055 ? (1 - riverRibbon / 0.055) * 16 : 0;

  return (continent + hills + peaks - riverCut) * heightScale;
}

function generateTerrainChunk(req: GenerateTerrainChunkRequest): TerrainChunkResponse {
  const chunkSize = req.chunkSize ?? 128;
  const segments = Math.max(4, Math.min(256, Math.round(req.segments ?? req.resolution ?? 64)));
  const seed = req.seed ?? 202630;
  const mode = req.biome ?? req.preset ?? req.worldId ?? 'valheim';
  const heightScale = req.heightScale ?? 1.0;
  const seaLevel = req.seaLevel ?? 0.0;
  const originMode = req.originMode ?? 'center';

  const noise = getNoise(seed);
  const worldOriginX = req.chunkX * chunkSize;
  const worldOriginZ = req.chunkZ * chunkSize;

  const vertsPerSide = segments + 1;
  const vertCount = vertsPerSide * vertsPerSide;

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const heights = new Float32Array(vertCount);
  const indices = new Uint32Array(segments * segments * 6);

  const halfSize = chunkSize * 0.5;
  const step = chunkSize / segments;
  const eps = Math.max(0.5, step * 0.5);
  const isCanyon = mode.toLowerCase().includes('canyon');
  const isAetheria = mode.toLowerCase().includes('aetheria');

  let minHeight = Infinity;
  let maxHeight = -Infinity;

  for (let iz = 0; iz < vertsPerSide; iz++) {
    const v = iz / segments;
    const localZ = originMode === 'corner' ? iz * step : -halfSize + iz * step;
    const wx = worldOriginX;
    const wz = worldOriginZ + (originMode === 'corner' ? iz * step - halfSize : localZ);

    for (let ix = 0; ix < vertsPerSide; ix++) {
      const u = ix / segments;
      const localX = originMode === 'corner' ? ix * step : -halfSize + ix * step;
      const sampleX = wx + (originMode === 'corner' ? ix * step - halfSize : localX);
      const sampleZ = wz;

      const h = sampleProceduralHeight(sampleX, sampleZ, noise, mode, heightScale);
      if (h < minHeight) minHeight = h;
      if (h > maxHeight) maxHeight = h;

      // Central-difference analytical normal for seamless chunk boundaries
      const hL = sampleProceduralHeight(sampleX - eps, sampleZ, noise, mode, heightScale);
      const hR = sampleProceduralHeight(sampleX + eps, sampleZ, noise, mode, heightScale);
      const hD = sampleProceduralHeight(sampleX, sampleZ - eps, noise, mode, heightScale);
      const hU = sampleProceduralHeight(sampleX, sampleZ + eps, noise, mode, heightScale);

      let nx = hL - hR;
      let ny = 2.0 * eps;
      let nz = hD - hU;
      const nLen = Math.hypot(nx, ny, nz) || 1;
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;

      const idx = iz * vertsPerSide + ix;
      const i3 = idx * 3;
      const i2 = idx * 2;

      positions[i3] = originMode === 'world' ? sampleX : localX;
      positions[i3 + 1] = h;
      positions[i3 + 2] = originMode === 'world' ? sampleZ : localZ;

      normals[i3] = nx;
      normals[i3 + 1] = ny;
      normals[i3 + 2] = nz;

      uvs[i2] = u;
      uvs[i2 + 1] = v;
      heights[idx] = h;

      // Biome & slope vertex color synthesis
      const relH = h - seaLevel;
      const slope = 1.0 - ny; // 0 = flat, 1 = vertical cliff
      const moisture = noise.simplex2D(sampleX * 0.005 + 31, sampleZ * 0.005 - 19) * 0.5 + 0.5;

      let r: number;
      let g: number;
      let b: number;

      if (isCanyon) {
        const band = Math.sin(h * 0.24) * 0.5 + 0.5;
        r = 0.68 + band * 0.16;
        g = 0.34 + band * 0.14;
        b = 0.2 + band * 0.08;
        if (relH < 2.5 && slope < 0.22) {
          r = 0.36;
          g = 0.48;
          b = 0.26;
        }
      } else if (relH < -1.5) {
        // Seabed / riverbed sand-silt
        r = 0.28;
        g = 0.33;
        b = 0.34;
      } else if (relH < 2.6 && slope < 0.26) {
        // Coastal golden beach sand
        r = 0.78;
        g = 0.72;
        b = 0.54;
      } else if (slope > 0.36) {
        // Steep granite / slate cliff rock
        r = 0.36;
        g = 0.37;
        b = 0.4;
      } else if (relH > 68 * heightScale) {
        // High-altitude alpine snowpack
        r = 0.92;
        g = 0.95;
        b = 0.99;
      } else if (relH > 46 * heightScale) {
        // Tundra & sub-alpine scree
        const snowMix = Math.max(0, Math.min(1, (relH - 46 * heightScale) / (22 * heightScale)));
        r = 0.42 + snowMix * 0.48;
        g = 0.44 + snowMix * 0.5;
        b = 0.41 + snowMix * 0.56;
      } else if (isAetheria) {
        // Vivid emerald & sunlit meadow greens
        r = 0.24 + moisture * 0.12;
        g = 0.64 + moisture * 0.14;
        b = 0.28 + moisture * 0.08;
      } else {
        // Boreal forest moss & lush grass
        r = 0.2 + moisture * 0.11;
        g = 0.44 + moisture * 0.16;
        b = 0.18 + moisture * 0.07;
      }

      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;
    }
  }

  let ptr = 0;
  for (let iz = 0; iz < segments; iz++) {
    for (let ix = 0; ix < segments; ix++) {
      const a = iz * vertsPerSide + ix;
      const b = a + 1;
      const c = (iz + 1) * vertsPerSide + ix;
      const d = c + 1;

      indices[ptr++] = a;
      indices[ptr++] = c;
      indices[ptr++] = b;

      indices[ptr++] = b;
      indices[ptr++] = c;
      indices[ptr++] = d;
    }
  }

  return {
    type: 'generate_terrain_chunk',
    id: req.id,
    requestId: req.requestId,
    chunkX: req.chunkX,
    chunkZ: req.chunkZ,
    chunkSize,
    segments,
    worldOriginX,
    worldOriginZ,
    minHeight,
    maxHeight,
    positions,
    normals,
    colors,
    uvs,
    indices,
    heights
  };
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<WorkerRequest>): void => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') {
    return;
  }

  if (msg.type === 'parse_osm') {
    const centerLat = msg.centerLat ?? msg.lat ?? 48.8566;
    const centerLon = msg.centerLon ?? msg.lon ?? msg.lng ?? 2.3522;

    let elements: OverpassElement[] = [];
    if (Array.isArray(msg.elements)) {
      elements = msg.elements;
    } else if (msg.data && Array.isArray(msg.data.elements)) {
      elements = msg.data.elements;
    } else if (typeof msg.rawJson === 'string') {
      try {
        const parsed = JSON.parse(msg.rawJson) as { elements?: OverpassElement[] };
        if (Array.isArray(parsed.elements)) {
          elements = parsed.elements;
        }
      } catch {
        elements = [];
      }
    }

    const parsedCity = parseOsmElements(elements, centerLat, centerLon);
    workerScope.postMessage({
      type: 'parse_osm',
      id: msg.id,
      requestId: msg.requestId,
      ...parsedCity
    });
    return;
  }

  if (msg.type === 'generate_fallback_city') {
    const centerLat = msg.centerLat ?? msg.lat ?? 48.8566;
    const centerLon = msg.centerLon ?? msg.lon ?? msg.lng ?? 2.3522;
    const fallbackCity = generateFallbackCity(centerLat, centerLon, msg.radius ?? 620);

    workerScope.postMessage({
      type: 'generate_fallback_city',
      id: msg.id,
      requestId: msg.requestId,
      ...fallbackCity
    });
    return;
  }

  if (msg.type === 'generate_terrain_chunk') {
    const chunk = generateTerrainChunk(msg);
    workerScope.postMessage(chunk, [
      chunk.positions.buffer,
      chunk.normals.buffer,
      chunk.colors.buffer,
      chunk.uvs.buffer,
      chunk.indices.buffer,
      chunk.heights.buffer
    ]);
  }
};
