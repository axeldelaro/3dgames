import type * as THREE from 'three';

export type WorldId =
  | 'metropolis'
  | 'starfield'
  | 'valheim'
  | 'seaOfLegends'
  | 'aetheria'
  | 'extremeHorizon';

export type QualityPreset = 'ULTRA' | 'HIGH' | 'MOBILE_PERF';

export interface QualityConfig {
  preset: QualityPreset;
  pixelRatio: number;
  shadowMapSize: number;
  enableBloom: boolean;
  enableSSAO: boolean;
  enableChromatic: boolean;
  chunkRadius: number;
  maxInstancesMultiplier: number;
  textureSize: 1024 | 512;
}

export type ControlContextMode =
  | 'HUB'
  | 'ON_FOOT'
  | 'DRIVING'
  | 'FLIGHT_SPACE'
  | 'NAVAL';

export type SurfaceMaterialType =
  | 'asphalt'
  | 'grass'
  | 'wood'
  | 'metal'
  | 'water'
  | 'sand'
  | 'snow'
  | 'rock';

export type PBRMaterialName =
  | 'asphalt'
  | 'cobblestone'
  | 'facade_brick'
  | 'facade_glass'
  | 'bark'
  | 'foliage'
  | 'rock'
  | 'sand'
  | 'rust'
  | 'ship_wood'
  | 'carbon';

export interface PBRTextureSet {
  name: PBRMaterialName;
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
  metalnessMap: THREE.DataTexture;
  emissiveMap: THREE.DataTexture;
  bumpMap: THREE.DataTexture;
}

export type AvatarAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'roll'
  | 'swim'
  | 'climb'
  | 'drive'
  | 'glide'
  | 'attack';

export type EquippedToolType =
  | 'none'
  | 'sword'
  | 'bow'
  | 'laser'
  | 'axe'
  | 'hammer'
  | 'magic_fire'
  | 'magic_ice';

export interface InputState {
  moveX: number;        // -1 (left) .. +1 (right)
  moveZ: number;        // -1 (back) .. +1 (forward)
  lookDeltaX: number;   // radians delta this frame
  lookDeltaY: number;   // radians delta this frame
  cameraYaw: number;    // accumulated camera yaw
  cameraPitch: number;  // accumulated camera pitch
  sprint: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
  crouch: boolean;
  interactJustPressed: boolean;
  primaryAction: boolean;
  primaryJustPressed: boolean;
  secondaryAction: boolean;
  secondaryJustPressed: boolean;
  handbrake: boolean;
  hornJustPressed: boolean;
  switchModeJustPressed: boolean;
  cameraToggleJustPressed: boolean;
  radialMenuOpen: boolean;
  throttle: number;     // 0..1 continuous throttle for flight/driving
  brake: number;        // 0..1 continuous brake/reverse
  rollAxis: number;     // -1..1 roll in flight / sail trim in naval
  usingTouch: boolean;
  usingGamepad: boolean;
  pointerLocked: boolean;
}

export interface RadialWheelItem {
  id: string;
  label: string;
  icon: string;
  category: 'weapon' | 'tool' | 'vehicle' | 'emote';
}

export interface MinimapMarker {
  id: string;
  x: number;
  z: number;
  color: string;
  type: 'player' | 'peer' | 'vehicle' | 'poi' | 'objective' | 'danger';
  label?: string;
}

export interface HUDTelemetry {
  fps: number;
  drawCalls: number;
  triangles: number;
  pingMs: number;
  peerCount: number;
  qualityPreset: QualityPreset;
  autoScale: boolean;
  worldTitle: string;
  contextMode: ControlContextMode;
  speedKmh?: number;
  rpm?: number;
  gear?: string;
  altitudeM?: number;
  mach?: number;
  headingDeg?: number;
  windAngleDeg?: number;
  staminaRatio?: number;   // 0..1
  healthRatio?: number;    // 0..1
  credits?: number;
  weatherLabel?: string;
  statusHint?: string;
}

export interface NetPlayerPacket {
  peerId: string;
  name: string;
  color: string;
  worldId: WorldId;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  anim: AvatarAnimState;
  tool: EquippedToolType;
  vehicleId: string | null;
  seatIndex: number; // 0 = driver/pilot, 1+ = passenger/gunner
  ts: number;
}

export interface NetVehiclePacket {
  vehicleId: string;
  kind: 'car' | 'moto' | 'heli' | 'starfighter' | 'galleon' | 'jet' | 'truck4x4';
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  steering: number;
  wheelSpin: number;
  extra: number; // sail trim / rotor rpm / afterburner
  ts: number;
}

export interface NetWorldEventPacket {
  type:
    | 'world_travel'
    | 'city_change'
    | 'block_place'
    | 'block_remove'
    | 'projectile_fire'
    | 'weather_sync'
    | 'tree_chop';
  senderId: string;
  worldId: WorldId;
  payload: Record<string, number | string | boolean | null>;
  ts: number;
}

export interface ConnectedPeerSummary {
  peerId: string;
  name: string;
  color: string;
  pingMs: number;
  isHost: boolean;
  worldId: WorldId;
}

export interface WorldMetadata {
  id: WorldId;
  title: string;
  subtitle: string;
  genre: string;
  accentColor: string;
  description: string;
  features: string[];
}

export interface EngineContext {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly textures: IProceduralTextureGenerator;
  readonly sky: IAtmosphereSky;
  readonly postFX: IPostProcessingPipeline;
  readonly audio: IWebAudioEngine;
  readonly input: IInputManager;
  readonly network: INetworkManager;
  readonly quality: IQualityManager;
  readonly localAvatar: IPlayerAvatar;
  readonly ui: IUIManager;
  switchWorld(worldId: WorldId, options?: Record<string, string | number>): Promise<void>;
  returnToHub(): void;
}

export interface IProceduralTextureGenerator {
  getTextureSet(name: PBRMaterialName): PBRTextureSet;
  createPBRMaterial(
    name: PBRMaterialName,
    options?: {
      repeatX?: number;
      repeatY?: number;
      tint?: THREE.ColorRepresentation;
      roughness?: number;
      metalness?: number;
      emissiveIntensity?: number;
      bumpScale?: number;
      normalScale?: number;
    }
  ): THREE.MeshStandardMaterial;
  dispose(): void;
}

export interface IAtmosphereSky {
  readonly sunLight: THREE.DirectionalLight;
  readonly hemiLight: THREE.HemisphereLight;
  readonly sunDirection: THREE.Vector3;
  setTimeOfDay(hours24: number): void;
  getTimeOfDay(): number;
  setWeather(weather: 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm', intensity?: number): void;
  setSpaceBlend(spaceFactor: number): void; // 0 = planetary Rayleigh sky, 1 = deep space starfield/nebulae
  update(dt: number, playerPosition: THREE.Vector3): void;
  refreshEnvironmentMap(renderer: THREE.WebGLRenderer): void;
}

export interface IPostProcessingPipeline {
  setSpeedFactor(normalizedSpeed: number): void; // 0..1 drives subtle high-speed chromatic aberration & FOV feel
  applyQuality(config: QualityConfig): void;
  setSize(width: number, height: number, pixelRatio: number): void;
  render(dt: number): void;
}

export interface IWebAudioEngine {
  unlock(): void;
  setMasterVolume(vol: number): void;
  setMusicVolume(vol: number): void;
  setWorldSoundscape(worldId: WorldId | 'hub'): void;
  playFootstep(surface: SurfaceMaterialType, sprint?: boolean): void;
  updateVehicleEngine(active: boolean, rpmNormalized: number, load?: number, tireSlip?: number): void;
  updateWindRush(intensity: number): void;
  updateRainAmbience(intensity: number): void;
  updateSpaceThruster(active: boolean, thrustNormalized: number, warpActive?: boolean): void;
  playCannonFire(distance?: number): void;
  playLaserPulse(): void;
  playSwordSlash(): void;
  playBowShot(): void;
  playMagicCast(element: 'fire' | 'ice'): void;
  playTreeChop(fell?: boolean): void;
  playBuildSnap(): void;
  playHorn(): void;
  playSonicBoom(): void;
  playUIClick(): void;
}

export interface IInputManager {
  readonly state: InputState;
  setContextMode(mode: ControlContextMode): void;
  getContextMode(): ControlContextMode;
  update(dt: number): void;
  vibrate(durationMs?: number, strongMagnitude?: number, weakMagnitude?: number): void;
  computeSafeCameraPosition(
    pivot: THREE.Vector3,
    desiredDistance: number,
    colliders: THREE.Object3D[],
    upVector?: THREE.Vector3
  ): THREE.Vector3;
}

export interface IPlayerAvatar {
  readonly root: THREE.Group;
  setAccentColor(hex: string): void;
  setEquippedTool(tool: EquippedToolType): void;
  getEquippedTool(): EquippedToolType;
  setParagliderVisible(visible: boolean): void;
  setJetpackFlame(intensity: number): void;
  updateAnimation(
    dt: number,
    state: AvatarAnimState,
    speed: number,
    turnRate?: number,
    groundSlope?: number
  ): void;
}

export interface INetworkManager {
  readonly selfPeerId: string;
  readonly roomCode: string;
  readonly isHost: boolean;
  playerName: string;
  playerColor: string;
  joinOrCreateRoom(code: string): Promise<void>;
  leaveRoom(): Promise<void>;
  getInviteUrl(): string;
  getConnectedPeers(): ConnectedPeerSummary[];
  broadcastLocalPlayer(packet: Omit<NetPlayerPacket, 'peerId' | 'name' | 'color' | 'ts'>): void;
  broadcastVehicle(packet: Omit<NetVehiclePacket, 'ownerId' | 'ts'>): void;
  broadcastWorldEvent(
    type: NetWorldEventPacket['type'],
    worldId: WorldId,
    payload: NetWorldEventPacket['payload']
  ): void;
  onWorldEvent(listener: (ev: NetWorldEventPacket) => void): () => void;
  onPeersChanged(listener: (peers: ConnectedPeerSummary[]) => void): () => void;
  syncRemoteEntities(scene: THREE.Scene, currentWorldId: WorldId, dt: number): MinimapMarker[];
  getAveragePing(): number;
}

export interface IQualityManager {
  readonly config: QualityConfig;
  autoScale: boolean;
  setPreset(preset: QualityPreset): void;
  recordFrame(dt: number): number; // returns smoothed FPS
  onChange(listener: (config: QualityConfig) => void): () => void;
}

export interface IUIManager {
  showHub(visible: boolean): void;
  setLoading(visible: boolean, label?: string, progress?: number): void;
  notify(title: string, message: string, tone?: 'info' | 'success' | 'warning'): void;
  updateTelemetry(telemetry: HUDTelemetry): void;
  updateMinimap(
    playerPos: { x: number; z: number },
    playerYaw: number,
    markers: MinimapMarker[],
    gpsRoute?: Array<{ x: number; z: number }>
  ): void;
  setWorldToolbarHTML(html: string, bindEvents?: (container: HTMLElement) => void): void;
  setRadialItems(items: RadialWheelItem[], onSelect: (item: RadialWheelItem) => void): void;
  setFighterHUDVisible(visible: boolean, pitchDeg?: number, rollDeg?: number, mach?: number, alt?: number, stall?: boolean): void;
}

export interface WorldInterface {
  readonly id: WorldId;
  readonly metadata: WorldMetadata;
  load(ctx: EngineContext, options?: Record<string, string | number>): Promise<void>;
  update(dt: number, elapsed: number): void;
  onWorldEvent?(event: NetWorldEventPacket): void;
  getMinimapMarkers(): MinimapMarker[];
  getGPSRoute?(): Array<{ x: number; z: number }>;
  dispose(): void;
}

export const WORLD_CATALOG: ReadonlyArray<WorldMetadata> = [
  {
    id: 'metropolis',
    title: 'METROPOLIS OSM 1:1',
    subtitle: 'Vraies Villes Réelles & GTA Sandbox',
    genre: 'Open-World Urbain • OSM Overpass • Météo Live',
    accentColor: '#28e0ff',
    description:
      'Reconstruction 3D 1:1 de n’importe quelle ville sur Terre (Paris, Tokyo, NYC, Nominatim & GPS réel), météo Open-Meteo en direct, Interior Mapping nocturne, voitures à suspension raycast, motos, hélicoptères et missions.',
    features: ['Overpass 3D + Cache IndexedDB', 'Météo Live Open-Meteo', 'Voitures Drift, Motos & Hélicos', 'Immobilier & Livraisons GPS']
  },
  {
    id: 'starfield',
    title: 'STARFIELD ODYSSEY',
    subtitle: 'Exploration Spatiale Sans Chargement',
    genre: 'Sci-Fi Planétaire • Gravité Sphérique 3D',
    accentColor: '#ffb347',
    description:
      'Système stellaire complet avec planètes sphériques à gravité directionnelle 3D, transition continue sol-atmosphère-espace sans écran de chargement, minage laser, hyperpropulsion Warp et combats spatiaux.',
    features: ['Gravité Sphérique 3D', 'Surface → Espace Continu', 'Hyperpropulsion Warp Shader', 'Cockpit & Dogfights P2P']
  },
  {
    id: 'valheim',
    title: 'VALHEIM WILDLANDS',
    subtitle: 'Survie, Craft & Construction Coop',
    genre: 'Survie Nordique • Construction Modulaire P2P',
    accentColor: '#66f2a5',
    description:
      'Continent sauvage infini (forêts boréales, pics enneigés, plages, rivières), abattage physique d’arbres, minage, construction modulaire synchronisée en P2P, feux de camp et défense nocturne coopérative.',
    features: ['Abattage Physique d’Arbres', 'Construction Modulaire P2P', 'Biomes & Rayons Volumétriques', 'Survie & Défense Nocturne']
  },
  {
    id: 'seaOfLegends',
    title: 'SEA OF LEGENDS',
    subtitle: 'Océan Photoréaliste & Batailles Navales',
    genre: 'Piraterie Multijoueur • Océan de Gerstner',
    accentColor: '#19d4c6',
    description:
      'Océan physique gouverné par des vagues de Gerstner synchronisées en P2P, galion à flottabilité multi-points, réglage des voiles selon le vent, duels au canon balistique, plongée sous-marine et chasse au trésor.',
    features: ['Vagues de Gerstner + Caustiques', 'Galion à Flottabilité 4-Points', 'Voiles, Gouvernail & Canons', 'Archipels & Coffres au Trésor']
  },
  {
    id: 'aetheria',
    title: 'AETHERIA CHRONICLES',
    subtitle: 'Action-RPG Cel-Shaded, Escalade & Paravoile',
    genre: 'Fantasy Anime • Escalade 360° & Magie',
    accentColor: '#ffd166',
    description:
      'Royaume fantastique stylisé Toon/PBR avec contours Outline, escalade libre à 360° sur toutes les falaises, paravoile à courants thermiques ascendants, épée à traînées lumineuses, arc et magie du feu interactive.',
    features: ['Escalade Libre 360° + Endurance', 'Paravoile & Courants Thermiques', 'Sword Trails & Tir à l’Arc', 'Feu Élémentaire Interactif']
  },
  {
    id: 'extremeHorizon',
    title: 'EXTREME HORIZON',
    subtitle: 'Vol Supersonique & Off-Road 4x4 Trial',
    genre: 'Simulation Aérienne Mach 2 & Franchissement',
    accentColor: '#ff6b57',
    description:
      'Massifs montagneux haute résolution (Alpes, Grand Canyon, Mont Fuji, Fjord) avec bascule instantanée entre avion de chasse supersonique (portance, postcombustion, bang Mach 1, HUD) et 4x4 Trial articulé.',
    features: ['Alpes, Canyon, Fuji & Fjord', 'Chasseur Supersonique + HUD', '4x4 Suspension Articulée', 'Courses Checkpoints P2P']
  }
];
