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
import { SeededRandom, sharedNoise } from '../../core/math/Noise';
import {
  createGerstnerOceanMaterial,
  createWarpTunnelMaterial,
  updateOceanMaterial
} from '../../core/graphics/Shaders';

type PlanetArchetype = 'terra' | 'lava' | 'ice' | 'ringed';

interface PlanetBody {
  id: string;
  name: string;
  archetype: PlanetArchetype;
  center: THREE.Vector3;
  radius: number;
  gravity: number;
  hasAtmosphere: boolean;
  accentHex: string;
  cloudMesh?: THREE.Mesh;
}

interface NavTarget {
  id: string;
  name: string;
  position: THREE.Vector3;
  stopDistance: number;
  color: string;
}

interface CrystalNode {
  active: boolean;
  respawnTimer: number;
  hp: number;
  planetIndex: number;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  scale: number;
  quat: THREE.Quaternion;
}

interface PlasmaBolt {
  active: boolean;
  age: number;
  life: number;
  isEnemy: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

interface SparkParticle {
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  colorHex: number;
}

interface PirateDrone {
  alive: boolean;
  respawnTimer: number;
  hp: number;
  anchor: THREE.Vector3;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  fireCooldown: number;
}

const STAR_POS = new THREE.Vector3(0, 920, -3500);
const STAR_RADIUS = 275;
const STATION_POS = new THREE.Vector3(740, 540, -2160);
const STATION_DECK_Y = STATION_POS.y + 1.2;

const Y_UP = new THREE.Vector3(0, 1, 0);
const Z_FWD = new THREE.Vector3(0, 0, -1);

function prepareNonIndexed(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) {
    const count = g.getAttribute('position').count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return g;
}

export class StarfieldWorld implements WorldInterface {
  public readonly id = 'starfield' as const;
  public readonly metadata = WORLD_CATALOG[1];

  private ctx!: EngineContext;
  private readonly worldRoot = new THREE.Group();

  private readonly planets: PlanetBody[] = [];
  private readonly navTargets: NavTarget[] = [];
  private selectedTargetId = 'pyros_iv';

  // Custom Shaders & Dynamic Meshes
  private starCoreMat: THREE.ShaderMaterial | null = null;
  private starCoronaMat: THREE.ShaderMaterial | null = null;
  private novaOceanMat: ReturnType<typeof createGerstnerOceanMaterial> | null = null;
  private novaCloudMat: THREE.ShaderMaterial | null = null;
  private pyrosMagmaMat: THREE.ShaderMaterial | null = null;
  private warpTunnelMat: ReturnType<typeof createWarpTunnelMaterial> | null = null;
  private warpTunnelMesh: THREE.Mesh | null = null;
  private stationCentrifugeGroup: THREE.Group | null = null;
  private asteroidBeltGroup: THREE.Group | null = null;

  // Player Spherical Walking State
  private pilotingShip = false;
  private cockpitFirstPerson = false;
  private readonly playerPos = new THREE.Vector3(0, 168, 12);
  private readonly playerVel = new THREE.Vector3();
  private readonly currentUp = new THREE.Vector3(0, 1, 0);
  private readonly playerFrameQuat = new THREE.Quaternion();
  private playerLocalYaw = 0;
  private playerGrounded = true;
  private footstepAccum = 0;
  private credits = 1500;
  private quantumOre = 0;

  // Starfighter State & Visuals
  private readonly shipGroup = new THREE.Group();
  private readonly shipCockpitHudGroup = new THREE.Group();
  private readonly shipLandingGearGroup = new THREE.Group();
  private shipThrusterMat: THREE.MeshStandardMaterial | null = null;
  private readonly shipPos = new THREE.Vector3(0, 166.35, -8);
  private readonly shipVel = new THREE.Vector3();
  private readonly shipQuat = new THREE.Quaternion();
  private readonly shipAngVel = new THREE.Vector3();
  private shipThrottle = 0;
  private warpActive = false;
  private warpIntensity = 0;
  private cannonCooldown = 0;
  private cannonSideToggle = false;
  private baseFov = 65;

  // Mining Laser & Crystals
  private readonly crystals: CrystalNode[] = [];
  private crystalInstMesh: THREE.InstancedMesh | null = null;
  private readonly laserBeamGroup = new THREE.Group();
  private laserOuterMesh: THREE.Mesh | null = null;
  private laserAudioTimer = 0;

  // Instanced Projectiles, Sparks & Pirate Interceptors
  private readonly bolts: PlasmaBolt[] = [];
  private boltInstMesh: THREE.InstancedMesh | null = null;
  private boltCursor = 0;

  private readonly sparks: SparkParticle[] = [];
  private sparkInstMesh: THREE.InstancedMesh | null = null;
  private sparkCursor = 0;

  private readonly pirates: PirateDrone[] = [];
  private pirateHullInst: THREE.InstancedMesh | null = null;
  private pirateGlowInst: THREE.InstancedMesh | null = null;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  private readonly dummy = new THREE.Object3D();
  private readonly tempVecA = new THREE.Vector3();
  private readonly tempVecB = new THREE.Vector3();
  private readonly tempVecC = new THREE.Vector3();
  private readonly tempQuatA = new THREE.Quaternion();
  private readonly tempQuatB = new THREE.Quaternion();
  private readonly tempColor = new THREE.Color();

  async load(ctx: EngineContext): Promise<void> {
    this.ctx = ctx;
    this.baseFov = this.ctx.camera.fov;
    this.ctx.scene.add(this.worldRoot);

    this.ctx.sky.setWeather('clear', 0);
    this.ctx.sky.setTimeOfDay(13.5);
    this.ctx.sky.setSpaceBlend(0);
    this.ctx.audio.setWorldSoundscape('starfield');
    this.ctx.input.setContextMode('ON_FOOT');
    this.ctx.ui.setFighterHUDVisible(false);

    if (!this.ctx.localAvatar.root.parent) {
      this.ctx.scene.add(this.ctx.localAvatar.root);
    }
    this.ctx.localAvatar.root.visible = true;
    this.ctx.localAvatar.setEquippedTool('laser');
    this.ctx.localAvatar.setParagliderVisible(false);
    this.ctx.localAvatar.setJetpackFlame(0);

    this.ctx.ui.setLoading(true, 'Génération du Système Stellaire & Planètes Sphériques 3D...', 0.35);

    this.initPlanetsCatalog();
    this.buildCentralStar();
    this.buildAllPlanets();
    this.buildOrbitalSpaceStation();
    this.buildInstancedAsteroidBelt();
    this.buildQuantumCrystalNodes();
    this.buildStarfighter();
    this.buildMiningLaserAndCombatPools();
    this.buildPirateSquadron();

    // Place player on Nova Terra Horizon Launchpad Base next to Starfighter
    const startDir = new THREE.Vector3(0, 1, 0.06).normalize();
    const surfR = this.samplePlanetSurfaceRadius(this.planets[0], startDir.x, startDir.y, startDir.z);
    this.playerPos.copy(startDir).multiplyScalar(surfR).add(this.planets[0].center);
    this.currentUp.copy(startDir);
    this.playerFrameQuat.setFromUnitVectors(Y_UP, this.currentUp);

    const shipDir = new THREE.Vector3(0, 1, -0.05).normalize();
    const shipR = this.samplePlanetSurfaceRadius(this.planets[0], shipDir.x, shipDir.y, shipDir.z);
    this.shipPos.copy(shipDir).multiplyScalar(shipR + 1.25).add(this.planets[0].center);
    this.shipQuat.setFromUnitVectors(Y_UP, shipDir);
    this.shipGroup.position.copy(this.shipPos);
    this.shipGroup.quaternion.copy(this.shipQuat);

    this.setupRadialMenu();
    this.setupToolbarUI();

    this.ctx.ui.setLoading(false);
    this.ctx.ui.notify(
      'STARFIELD ODYSSEY',
      'Marchez à 360° sur Nova Terra, minez au laser [Clic] ou pilotez le Chasseur [E] vers l’espace sans chargement !',
      'info'
    );
  }

  private trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.geometries.push(geo);
    return geo;
  }

  private trackMat<T extends THREE.Material>(mat: T): T {
    this.materials.push(mat);
    return mat;
  }

  private initPlanetsCatalog(): void {
    this.planets.length = 0;
    this.planets.push(
      {
        id: 'nova_terra',
        name: 'Nova Terra',
        archetype: 'terra',
        center: new THREE.Vector3(0, 0, 0),
        radius: 165,
        gravity: 16.5,
        hasAtmosphere: true,
        accentHex: '#38f29d'
      },
      {
        id: 'pyros_iv',
        name: 'Pyros IV',
        archetype: 'lava',
        center: new THREE.Vector3(1580, 180, -1350),
        radius: 138,
        gravity: 14.8,
        hasAtmosphere: false,
        accentHex: '#ff5d38'
      },
      {
        id: 'cryo_borealis',
        name: 'Cryo Borealis',
        archetype: 'ice',
        center: new THREE.Vector3(-1680, -210, -1580),
        radius: 148,
        gravity: 13.5,
        hasAtmosphere: true,
        accentHex: '#52e5ff'
      },
      {
        id: 'aurelia_prime',
        name: 'Aurelia Prime',
        archetype: 'ringed',
        center: new THREE.Vector3(380, 440, -2480),
        radius: 205,
        gravity: 18.2,
        hasAtmosphere: true,
        accentHex: '#ffb347'
      }
    );

    this.navTargets.length = 0;
    for (const p of this.planets) {
      this.navTargets.push({
        id: p.id,
        name: p.name,
        position: p.center.clone(),
        stopDistance: p.radius + 95,
        color: p.accentHex
      });
    }
    this.navTargets.push({
      id: 'aegis_station',
      name: 'Station Orbitale Aegis',
      position: STATION_POS.clone(),
      stopDistance: 72,
      color: '#c084fc'
    });
  }

  /**
   * Deterministic 3D seam-free surface radius sampler shared between sphere geometry generation and 360° physics!
   */
  private samplePlanetSurfaceRadius(planet: PlanetBody, nx: number, ny: number, nz: number): number {
    if (planet.archetype === 'terra') {
      const cont = sharedNoise.fbm3D(nx * 2.1 + 3.1, ny * 2.1 - 1.4, nz * 2.1 + 0.8, 5);
      const detail = sharedNoise.simplex3D(nx * 9.5, ny * 9.5, nz * 9.5) * 1.4;
      let disp = cont * 11.5 + detail;
      // Flatten North Pole plateau smoothly for Horizon Launchpad Base
      const poleBlend = THREE.MathUtils.smoothstep(ny, 0.91, 0.965);
      disp = THREE.MathUtils.lerp(disp, 1.35, poleBlend);
      return planet.radius + disp;
    }

    if (planet.archetype === 'lava') {
      const canyonRaw = 1.0 - Math.abs(sharedNoise.simplex3D(nx * 3.2 + 7.4, ny * 3.2, nz * 3.2 - 2.1));
      const ridge = canyonRaw * canyonRaw * 13.0 - 5.2;
      const crag = sharedNoise.fbm3D(nx * 7.5, ny * 7.5, nz * 7.5, 4) * 2.6;
      return planet.radius + ridge + crag;
    }

    if (planet.archetype === 'ice') {
      const glacier = sharedNoise.fbm3D(nx * 2.7 - 5.2, ny * 2.7 + 4.1, nz * 2.7, 5) * 9.5;
      const shelf = Math.sign(glacier) * Math.pow(Math.abs(glacier) / 9.5, 0.75) * 8.5;
      return planet.radius + shelf;
    }

    // Aurelia Prime: sculpted golden plateaus & craters
    const bands = Math.sin(ny * 14.0 + sharedNoise.simplex3D(nx * 3.0, ny * 3.0, nz * 3.0) * 2.2) * 2.4;
    const highland = sharedNoise.fbm3D(nx * 2.4 + 11.0, ny * 2.4, nz * 2.4 - 6.0, 4) * 7.5;
    return planet.radius + bands + highland;
  }

  private buildCentralStar(): void {
    // Blinding central star core with animated convective boiling & solar flare shader
    this.starCoreMat = this.trackMat(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }
        },
        vertexShader: `
          varying vec3 vNormalDir;
          varying vec3 vLocalPos;
          varying vec3 vViewDir;
          void main() {
            vLocalPos = normalize(position);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vNormalDir = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vNormalDir;
          varying vec3 vLocalPos;
          varying vec3 vViewDir;

          float hash3(vec3 p) {
            p = fract(p * vec3(443.897, 441.423, 437.195));
            p += dot(p, p.yzx + 19.19);
            return fract((p.x + p.y) * p.z);
          }

          float noise3(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
                  mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
              mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                  mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
              f.z
            );
          }

          void main() {
            vec3 q = vLocalPos * 6.5 + vec3(uTime * 0.18, -uTime * 0.14, uTime * 0.11);
            float n = noise3(q) * 0.55 + noise3(q * 2.3 - uTime * 0.3) * 0.30 + noise3(q * 5.1) * 0.15;
            float fresnel = 1.0 - max(0.0, dot(normalize(vNormalDir), normalize(vViewDir)));
            vec3 hotCore = vec3(1.0, 0.97, 0.84);
            vec3 midPlasma = vec3(1.0, 0.62, 0.14);
            vec3 darkSpot = vec3(0.82, 0.22, 0.04);
            vec3 col = mix(darkSpot, midPlasma, smoothstep(0.25, 0.62, n));
            col = mix(col, hotCore, smoothstep(0.60, 0.92, n));
            col += vec3(1.0, 0.48, 0.12) * pow(fresnel, 2.2) * 1.4;
            gl_FragColor = vec4(col * 2.1, 1.0);
          }
        `
      })
    );

    const starMesh = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(STAR_RADIUS, 48, 36)),
      this.starCoreMat
    );
    starMesh.position.copy(STAR_POS);
    starMesh.frustumCulled = false;
    this.worldRoot.add(starMesh);

    // Volumetric Solar Flare Corona Halo
    this.starCoronaMat = this.trackMat(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          varying vec3 vDir;
          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float rim = max(0.0, dot(-vNormal, viewDir));
            float rays = 0.78 + 0.22 * sin(vDir.x * 14.0 + uTime * 1.6) * cos(vDir.y * 12.0 - uTime * 1.3);
            float glow = pow(rim, 3.2) * rays;
            vec3 coronaCol = mix(vec3(1.0, 0.35, 0.06), vec3(1.0, 0.88, 0.52), pow(rim, 2.0));
            gl_FragColor = vec4(coronaCol * glow * 1.85, glow);
          }
        `
      })
    );

    const coronaMesh = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(STAR_RADIUS * 1.62, 40, 32)),
      this.starCoronaMat
    );
    coronaMesh.position.copy(STAR_POS);
    coronaMesh.frustumCulled = false;
    this.worldRoot.add(coronaMesh);
  }

  private buildAllPlanets(): void {
    for (const planet of this.planets) {
      const sphereGeo = this.trackGeo(new THREE.IcosahedronGeometry(planet.radius, 5));
      const posAttr = sphereGeo.getAttribute('position') as THREE.BufferAttribute;
      const colors = new Float32Array(posAttr.count * 3);
      const c = new THREE.Color();

      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const vz = posAttr.getZ(i);
        const invLen = 1 / Math.hypot(vx, vy, vz);
        const nx = vx * invLen;
        const ny = vy * invLen;
        const nz = vz * invLen;

        const r = this.samplePlanetSurfaceRadius(planet, nx, ny, nz);
        posAttr.setXYZ(i, nx * r, ny * r, nz * r);

        const hRel = r - planet.radius;
        if (planet.archetype === 'terra') {
          if (ny > 0.935) {
            c.setHex(0x6c7888); // Launchpad concrete/titanium plateau
          } else if (hRel < -0.4) {
            c.setHex(0x1f5a73); // Underwater seabed
          } else if (hRel < 0.9) {
            c.setHex(0xd9c38c); // Sandy coast
          } else if (hRel < 5.5) {
            c.setHex(0x2f9e56); // Lush emerald continents
          } else if (hRel < 8.6) {
            c.setHex(0x5b636e); // Alpine rock
          } else {
            c.setHex(0xf1f6fb); // Snow caps
          }
        } else if (planet.archetype === 'lava') {
          if (hRel < -1.2) {
            c.setHex(0x1c1214); // Deep scorched obsidian canyon floor
          } else if (hRel < 3.5) {
            c.setHex(0x8c2f1c); // Rust-red volcanic rock
          } else {
            c.setHex(0xc44d29); // Sunbaked iron-oxide ridges
          }
        } else if (planet.archetype === 'ice') {
          if (hRel < -1.5) {
            c.setHex(0x1d6ea3); // Deep sapphire glacier crevasse
          } else if (hRel < 3.5) {
            c.setHex(0x9ee6ff); // Glacial cyan ice
          } else {
            c.setHex(0xf2fbff); // Pure frost ridge
          }
        } else {
          // Aurelia Prime banded amber/gold crust
          const bandVal = Math.sin(ny * 16.0);
          if (bandVal > 0.3) c.setHex(0xd69a45);
          else if (bandVal > -0.3) c.setHex(0x8f6234);
          else c.setHex(0xb87e3c);
        }

        colors[i * 3 + 0] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      sphereGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      sphereGeo.computeVertexNormals();
      sphereGeo.computeBoundingSphere();

      const rockSet = this.ctx.textures.getTextureSet(planet.archetype === 'lava' ? 'rust' : 'rock');
      const terrainMat =
        planet.archetype === 'ice'
          ? this.trackMat(
              new THREE.MeshPhysicalMaterial({
                vertexColors: true,
                normalMap: rockSet.normalMap,
                roughness: 0.22,
                metalness: 0.1,
                clearcoat: 0.85,
                clearcoatRoughness: 0.12
              })
            )
          : this.trackMat(
              new THREE.MeshStandardMaterial({
                vertexColors: true,
                normalMap: rockSet.normalMap,
                roughness: planet.archetype === 'terra' ? 0.78 : 0.84,
                metalness: planet.archetype === 'ringed' ? 0.25 : 0.08
              })
            );

      const planetMesh = new THREE.Mesh(sphereGeo, terrainMat);
      planetMesh.position.copy(planet.center);
      planetMesh.castShadow = true;
      planetMesh.receiveShadow = true;
      this.worldRoot.add(planetMesh);

      if (planet.archetype === 'terra') {
        this.buildNovaTerraDetails(planet);
      } else if (planet.archetype === 'lava') {
        this.buildPyrosLavaVeins(planet);
      } else if (planet.archetype === 'ice') {
        this.buildCryoSpiresAndMoon(planet);
      } else if (planet.archetype === 'ringed') {
        this.buildAureliaRings(planet);
      }
    }
  }

  private buildNovaTerraDetails(planet: PlanetBody): void {
    // 1. Gerstner Ocean Sphere
    this.novaOceanMat = this.trackMat(
      createGerstnerOceanMaterial({
        waves: [
          { steepness: 0.07, wavelength: 22.0, dirX: 0.88, dirZ: 0.47, speed: 0.9 },
          { steepness: 0.05, wavelength: 13.0, dirX: 0.42, dirZ: -0.91, speed: 1.05 },
          { steepness: 0.04, wavelength: 7.5, dirX: -0.76, dirZ: 0.65, speed: 1.15 },
          { steepness: 0.03, wavelength: 4.2, dirX: 0.25, dirZ: 0.97, speed: 1.25 }
        ]
      })
    );
    const oceanSphere = new THREE.Mesh(
      this.trackGeo(new THREE.IcosahedronGeometry(planet.radius - 0.35, 4)),
      this.novaOceanMat
    );
    oceanSphere.position.copy(planet.center);
    this.worldRoot.add(oceanSphere);

    // 2. Animated Volumetric Cloud Shell
    this.novaCloudMat = this.trackMat(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSunDir: { value: new THREE.Vector3(0, 0.5, -1).normalize() }
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec3 vUnitPos;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vUnitPos = normalize(position);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uSunDir;
          varying vec3 vUnitPos;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;

          float hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }
          float vnoise(vec3 x) {
            vec3 i = floor(x);
            vec3 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                  mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
              mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                  mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
              f.z
            );
          }

          void main() {
            vec3 p = vUnitPos * 4.2 + vec3(uTime * 0.015, 0.0, -uTime * 0.01);
            float c = vnoise(p) * 0.6 + vnoise(p * 2.4) * 0.4;
            float cloudAlpha = smoothstep(0.52, 0.78, c) * 0.58;
            float camDist = distance(cameraPosition, vWorldPos);
            cloudAlpha *= smoothstep(6.0, 26.0, camDist);
            float ndl = max(0.18, dot(vWorldNormal, normalize(uSunDir)) * 0.5 + 0.5);
            vec3 col = mix(vec3(0.45, 0.62, 0.85), vec3(1.0, 0.99, 0.97), ndl);
            gl_FragColor = vec4(col, cloudAlpha);
          }
        `
      })
    );
    const cloudSphere = new THREE.Mesh(
      this.trackGeo(new THREE.IcosahedronGeometry(planet.radius + 15.5, 4)),
      this.novaCloudMat
    );
    cloudSphere.position.copy(planet.center);
    planet.cloudMesh = cloudSphere;
    this.worldRoot.add(cloudSphere);

    // 3. Instanced Continental Trees radially aligned to sphere surface
    const rng = new SeededRandom(90125);
    const treeDirs: THREE.Vector3[] = [];
    for (let i = 0; i < 360 && treeDirs.length < 130; i++) {
      const u = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const nx = s * Math.cos(theta);
      const ny = u;
      const nz = s * Math.sin(theta);
      if (ny > 0.91) continue; // Keep launchpad clear
      const r = this.samplePlanetSurfaceRadius(planet, nx, ny, nz);
      if (r > planet.radius + 1.1 && r < planet.radius + 5.2) {
        treeDirs.push(new THREE.Vector3(nx, ny, nz));
      }
    }

    if (treeDirs.length > 0) {
      const trunkGeo = this.trackGeo(new THREE.CylinderGeometry(0.22, 0.35, 3.2, 6));
      trunkGeo.translate(0, 1.6, 0);
      const trunkMat = this.trackMat(this.ctx.textures.createPBRMaterial('bark', { roughness: 0.88 }));

      const crownGeo = this.trackGeo(new THREE.ConeGeometry(2.1, 4.8, 7));
      crownGeo.translate(0, 4.6, 0);
      const crownMat = this.trackMat(
        this.ctx.textures.createPBRMaterial('foliage', { tint: 0x34d399, roughness: 0.72 })
      );

      const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeDirs.length);
      const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeDirs.length);

      for (let i = 0; i < treeDirs.length; i++) {
        const dir = treeDirs[i];
        const r = this.samplePlanetSurfaceRadius(planet, dir.x, dir.y, dir.z);
        this.dummy.position.copy(dir).multiplyScalar(r - 0.15).add(planet.center);
        this.dummy.quaternion.setFromUnitVectors(Y_UP, dir);
        this.dummy.scale.setScalar(0.85 + (i % 5) * 0.14);
        this.dummy.updateMatrix();
        trunkInst.setMatrixAt(i, this.dummy.matrix);
        crownInst.setMatrixAt(i, this.dummy.matrix);
      }
      trunkInst.instanceMatrix.needsUpdate = true;
      crownInst.instanceMatrix.needsUpdate = true;
      this.worldRoot.add(trunkInst, crownInst);
    }

    // 4. Horizon Launchpad Base at North Pole
    const poleY = planet.radius + 1.35;
    const padMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x2a3444, metalness: 0.78, roughness: 0.34 })
    );
    const padGlowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x28e0ff,
        emissive: 0x28e0ff,
        emissiveIntensity: 2.8,
        roughness: 0.2,
        metalness: 0.3
      })
    );

    const padDisc = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(16, 18.5, 0.8, 32)), padMat);
    padDisc.position.set(planet.center.x, planet.center.y + poleY, planet.center.z);
    padDisc.receiveShadow = true;
    this.worldRoot.add(padDisc);

    const padRing = new THREE.Mesh(this.trackGeo(new THREE.RingGeometry(11.5, 12.3, 36)), padGlowMat);
    padRing.rotation.x = -Math.PI * 0.5;
    padRing.position.set(planet.center.x, planet.center.y + poleY + 0.43, planet.center.z);
    this.worldRoot.add(padRing);

    const domeMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        metalness: 0.45,
        roughness: 0.2,
        clearcoat: 0.9
      })
    );
    const habDome = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(5.5, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      domeMat
    );
    habDome.position.set(planet.center.x + 17.5, planet.center.y + poleY - 0.6, planet.center.z - 6);
    this.worldRoot.add(habDome);
  }

  private buildPyrosLavaVeins(planet: PlanetBody): void {
    this.pyrosMagmaMat = this.trackMat(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }
        },
        vertexShader: `
          varying vec3 vUnit;
          void main() {
            vUnit = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vUnit;
          void main() {
            float flow = sin(vUnit.x * 18.0 + uTime * 1.4) * cos(vUnit.z * 18.0 - uTime * 1.1);
            float pulse = 0.6 + 0.4 * sin(uTime * 2.3 + flow * 3.0);
            vec3 darkCrust = vec3(0.22, 0.03, 0.01);
            vec3 brightLava = vec3(1.0, 0.46, 0.05) * (1.5 + pulse * 0.8);
            vec3 col = mix(darkCrust, brightLava, smoothstep(-0.3, 0.45, flow));
            gl_FragColor = vec4(col, 1.0);
          }
        `
      })
    );

    const magmaSphere = new THREE.Mesh(
      this.trackGeo(new THREE.IcosahedronGeometry(planet.radius - 0.9, 4)),
      this.pyrosMagmaMat
    );
    magmaSphere.position.copy(planet.center);
    this.worldRoot.add(magmaSphere);
  }

  private buildCryoSpiresAndMoon(planet: PlanetBody): void {
    const rng = new SeededRandom(77441);
    const count = 72;
    const spireGeo = this.trackGeo(new THREE.ConeGeometry(2.2, 16.5, 5));
    spireGeo.translate(0, 7.5, 0);
    const spireMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x7ce8ff,
        emissive: 0x1aa3e8,
        emissiveIntensity: 0.75,
        roughness: 0.12,
        metalness: 0.15,
        clearcoat: 1.0,
        transparent: true,
        opacity: 0.86
      })
    );

    const spireInst = new THREE.InstancedMesh(spireGeo, spireMat, count);
    for (let i = 0; i < count; i++) {
      const u = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const dir = this.tempVecA.set(s * Math.cos(theta), u, s * Math.sin(theta));
      const r = this.samplePlanetSurfaceRadius(planet, dir.x, dir.y, dir.z);
      this.dummy.position.copy(dir).multiplyScalar(r - 0.8).add(planet.center);
      this.dummy.quaternion.setFromUnitVectors(Y_UP, dir);
      this.dummy.scale.set(rng.range(0.7, 1.5), rng.range(0.7, 1.7), rng.range(0.7, 1.5));
      this.dummy.updateMatrix();
      spireInst.setMatrixAt(i, this.dummy.matrix);
    }
    spireInst.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(spireInst);

    // Ringed Frost Moon orbiting Cryo Borealis
    const moonPos = new THREE.Vector3(planet.center.x + 310, planet.center.y + 135, planet.center.z + 145);
    const moonMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xcbe8f8, roughness: 0.65, metalness: 0.12 })
    );
    const moonMesh = new THREE.Mesh(this.trackGeo(new THREE.IcosahedronGeometry(36, 3)), moonMat);
    moonMesh.position.copy(moonPos);
    this.worldRoot.add(moonMesh);

    const moonRingMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x8be9fd,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.2,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
      })
    );
    const moonRing = new THREE.Mesh(this.trackGeo(new THREE.RingGeometry(48, 76, 48)), moonRingMat);
    moonRing.position.copy(moonPos);
    moonRing.rotation.set(Math.PI * 0.42, 0.3, 0.2);
    this.worldRoot.add(moonRing);
  }

  private buildAureliaRings(planet: PlanetBody): void {
    const ringMat = this.trackMat(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec2 vPos2D;
          void main() {
            vPos2D = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vPos2D;
          void main() {
            float r = length(vPos2D);
            float normR = clamp((r - 255.0) / (435.0 - 255.0), 0.0, 1.0);
            float bands = 0.6 + 0.4 * sin(normR * 68.0) * cos(normR * 23.0);
            float cassiniGap = smoothstep(0.03, 0.07, abs(normR - 0.56));
            float edgeFade = smoothstep(0.0, 0.08, normR) * (1.0 - smoothstep(0.90, 1.0, normR));
            vec3 col = mix(vec3(0.68, 0.52, 0.34), vec3(0.98, 0.84, 0.58), bands);
            float alpha = bands * cassiniGap * edgeFade * 0.78;
            gl_FragColor = vec4(col, alpha);
          }
        `
      })
    );

    const ringMesh = new THREE.Mesh(this.trackGeo(new THREE.RingGeometry(255, 435, 96, 2)), ringMat);
    ringMesh.position.copy(planet.center);
    ringMesh.rotation.set(Math.PI * 0.43, 0.22, -0.18);
    this.worldRoot.add(ringMesh);
  }

  private buildOrbitalSpaceStation(): void {
    const stationRoot = new THREE.Group();
    stationRoot.position.copy(STATION_POS);
    this.worldRoot.add(stationRoot);

    const hullMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xd0dae8,
        metalness: 0.82,
        roughness: 0.24,
        clearcoat: 0.6
      })
    );
    const darkDeckMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1e2634,
        metalness: 0.72,
        roughness: 0.42
      })
    );
    const dockBeaconMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x28e0ff,
        emissive: 0x28e0ff,
        emissiveIntensity: 3.0,
        roughness: 0.2,
        metalness: 0.3
      })
    );

    // Non-rotating Central Dockable Landing Pad Bay
    const deck = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(38, 2.4, 38)), darkDeckMat);
    deck.receiveShadow = true;
    stationRoot.add(deck);

    const centralSpindle = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(6.5, 8.5, 26, 16)), hullMat);
    centralSpindle.position.y = -13;
    stationRoot.add(centralSpindle);

    const controlTower = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(10, 12, 8)), hullMat);
    controlTower.position.set(0, 6.5, -15);
    stationRoot.add(controlTower);

    // Glowing cyan magnetic landing guide rails
    const railGeo = this.trackGeo(new THREE.BoxGeometry(0.6, 0.35, 28));
    for (const sx of [-12, 12]) {
      const rail = new THREE.Mesh(railGeo, dockBeaconMat);
      rail.position.set(sx, 1.35, 2);
      stationRoot.add(rail);
    }

    // Rotating Centrifuge Habitat Ring + Spokes
    this.stationCentrifugeGroup = new THREE.Group();
    this.stationCentrifugeGroup.position.y = -8;
    stationRoot.add(this.stationCentrifugeGroup);

    const ringGeos: THREE.BufferGeometry[] = [];
    ringGeos.push(prepareNonIndexed(new THREE.TorusGeometry(52, 4.4, 14, 48)).rotateX(Math.PI * 0.5));
    for (let s = 0; s < 4; s++) {
      const spoke = prepareNonIndexed(new THREE.CylinderGeometry(1.4, 1.4, 100, 8));
      spoke.rotateZ(Math.PI * 0.5);
      spoke.rotateY((s * Math.PI) / 2);
      ringGeos.push(spoke);
    }
    const mergedRing = mergeGeometries(ringGeos, false);
    for (const g of ringGeos) g.dispose();
    if (mergedRing) {
      this.trackGeo(mergedRing);
      const centrifugeMesh = new THREE.Mesh(mergedRing, hullMat);
      this.stationCentrifugeGroup.add(centrifugeMesh);
    }

    const windowRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(56.5, 0.35, 8, 64).rotateX(Math.PI * 0.5)),
      dockBeaconMat
    );
    this.stationCentrifugeGroup.add(windowRing);
  }

  /**
   * 3,200+ Instanced 3D Asteroid Belt in ONLY 2 Draw Calls!
   */
  private buildInstancedAsteroidBelt(): void {
    this.asteroidBeltGroup = new THREE.Group();
    this.asteroidBeltGroup.position.copy(STAR_POS);
    this.worldRoot.add(this.asteroidBeltGroup);

    const rng = new SeededRandom(424242);

    const makeCraggyGeo = (radius: number, seedOffset: number) => {
      const g = this.trackGeo(new THREE.IcosahedronGeometry(radius, 1));
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const n = 0.78 + 0.36 * sharedNoise.simplex3D(vx * 0.4 + seedOffset, vy * 0.4, vz * 0.4);
        pos.setXYZ(i, vx * n, vy * n * 0.82, vz * n);
      }
      g.computeVertexNormals();
      return g;
    };

    const rockGeo = makeCraggyGeo(6.5, 1.7);
    const oreGeo = makeCraggyGeo(5.2, 9.3);

    const rockMat = this.trackMat(
      this.ctx.textures.createPBRMaterial('rock', {
        tint: 0x7c828d,
        roughness: 0.88,
        metalness: 0.12
      })
    );
    const oreMat = this.trackMat(
      this.ctx.textures.createPBRMaterial('rust', {
        tint: 0xa67c58,
        roughness: 0.62,
        metalness: 0.58
      })
    );

    const countA = 1700;
    const countB = 1500; // Total = 3,200 3D Asteroids in 2 draw calls!
    const instA = new THREE.InstancedMesh(rockGeo, rockMat, countA);
    const instB = new THREE.InstancedMesh(oreGeo, oreMat, countB);
    instA.frustumCulled = false;
    instB.frustumCulled = false;

    const populate = (inst: THREE.InstancedMesh, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = rng.range(0, Math.PI * 2);
        const beltRadius = rng.range(1850, 2950);
        const verticalSpread = rng.range(-480, 480);
        this.dummy.position.set(
          Math.cos(angle) * beltRadius,
          verticalSpread - 580,
          Math.sin(angle) * beltRadius
        );
        this.dummy.rotation.set(rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28));
        const s = rng.range(0.55, 2.85);
        this.dummy.scale.set(s, s * rng.range(0.7, 1.3), s);
        this.dummy.updateMatrix();
        inst.setMatrixAt(i, this.dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    };

    populate(instA, countA);
    populate(instB, countB);
    this.asteroidBeltGroup.add(instA, instB);
  }

  private buildQuantumCrystalNodes(): void {
    const rng = new SeededRandom(551199);
    const totalNodes = 140;

    const crystalGeo = this.trackGeo(new THREE.OctahedronGeometry(0.95, 0));
    crystalGeo.scale(0.65, 2.1, 0.65);
    crystalGeo.translate(0, 1.2, 0);

    const crystalMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.45,
        roughness: 0.14,
        metalness: 0.25,
        clearcoat: 1.0
      })
    );

    this.crystalInstMesh = new THREE.InstancedMesh(crystalGeo, crystalMat, totalNodes);
    this.crystalInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.crystalInstMesh.frustumCulled = false;

    const palette = [0x28e0ff, 0xff7b38, 0x67e8f9, 0xffc857];

    for (let i = 0; i < totalNodes; i++) {
      const pIdx = i < 56 ? 0 : (i % 3) + 1; // Rich cluster on Nova Terra + nodes on all planets
      const planet = this.planets[pIdx];

      let dir = new THREE.Vector3(0, 1, 0);
      let r = planet.radius;
      for (let attempt = 0; attempt < 12; attempt++) {
        const u = pIdx === 0 && i < 16 ? rng.range(0.65, 0.91) : rng.range(-1, 1);
        const theta = rng.range(0, Math.PI * 2);
        const s = Math.sqrt(Math.max(0, 1 - u * u));
        dir.set(s * Math.cos(theta), u, s * Math.sin(theta));
        r = this.samplePlanetSurfaceRadius(planet, dir.x, dir.y, dir.z);
        if (pIdx !== 0 || r > planet.radius + 0.3) break;
      }

      const worldPos = dir.clone().multiplyScalar(r).add(planet.center);
      const quat = new THREE.Quaternion().setFromUnitVectors(Y_UP, dir);
      const scale = rng.range(0.85, 1.55);

      this.crystals.push({
        active: true,
        respawnTimer: 0,
        hp: 1.4,
        planetIndex: pIdx,
        position: worldPos,
        normal: dir.clone(),
        scale,
        quat
      });

      this.dummy.position.copy(worldPos);
      this.dummy.quaternion.copy(quat);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.crystalInstMesh.setMatrixAt(i, this.dummy.matrix);

      this.tempColor.setHex(palette[pIdx]);
      this.crystalInstMesh.setColorAt(i, this.tempColor);
    }

    this.crystalInstMesh.instanceMatrix.needsUpdate = true;
    if (this.crystalInstMesh.instanceColor) this.crystalInstMesh.instanceColor.needsUpdate = true;
    this.worldRoot.add(this.crystalInstMesh);
  }

  private buildStarfighter(): void {
    const hullMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xe6eef8,
        metalness: 0.76,
        roughness: 0.22,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08
      })
    );

    const carbonMat = this.trackMat(
      this.ctx.textures.createPBRMaterial('carbon', {
        repeatX: 2,
        repeatY: 2,
        roughness: 0.34,
        metalness: 0.55
      })
    );

    const accentMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff9f2e,
        emissive: 0xff7b1c,
        emissiveIntensity: 0.85,
        metalness: 0.65,
        roughness: 0.28
      })
    );

    const canopyGlassMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x0b192c,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.58,
        transparent: true,
        opacity: 0.74,
        clearcoat: 1.0
      })
    );

    this.shipThrusterMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x7be9ff,
        emissive: 0x28d8ff,
        emissiveIntensity: 3.2,
        roughness: 0.15,
        metalness: 0.1
      })
    );

    // Sculpted Valkyrie Starfighter fuselage (-Z is forward)
    const fuselage = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.75, 0.92, 6.2)), hullMat);
    fuselage.position.set(0, 0.2, 0.2);
    fuselage.castShadow = true;
    this.shipGroup.add(fuselage);

    const noseCone = new THREE.Mesh(
      this.trackGeo(new THREE.ConeGeometry(0.95, 3.4, 6).rotateX(-Math.PI * 0.5)),
      hullMat
    );
    noseCone.scale.set(0.95, 0.58, 1.0);
    noseCone.position.set(0, 0.12, -4.4);
    noseCone.castShadow = true;
    this.shipGroup.add(noseCone);

    // Swept Delta Wings + Orange Starfield Stripes
    const deltaWing = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(8.6, 0.14, 2.85)), hullMat);
    deltaWing.position.set(0, 0.05, 0.85);
    deltaWing.castShadow = true;
    this.shipGroup.add(deltaWing);

    const wingAccent = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(7.6, 0.16, 0.52)), accentMat);
    wingAccent.position.set(0, 0.06, 0.25);
    this.shipGroup.add(wingAccent);

    // Twin Vertical Tail Stabilizers & Twin Wingtip Plasma Cannons
    for (const sx of [-1.45, 1.45]) {
      const fin = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.14, 1.45, 1.75)), carbonMat);
      fin.position.set(sx, 0.82, 2.15);
      fin.rotation.z = sx < 0 ? 0.28 : -0.28;
      this.shipGroup.add(fin);

      const thrusterNozzle = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.38, 0.52, 0.85, 14).rotateX(Math.PI * 0.5)),
        carbonMat
      );
      thrusterNozzle.position.set(sx * 0.52, 0.18, 3.55);
      this.shipGroup.add(thrusterNozzle);

      const ionPlume = new THREE.Mesh(
        this.trackGeo(new THREE.ConeGeometry(0.36, 1.8, 12).rotateX(Math.PI * 0.5)),
        this.shipThrusterMat
      );
      ionPlume.position.set(sx * 0.52, 0.18, 4.45);
      this.shipGroup.add(ionPlume);
    }

    const cannonBarrelGeo = this.trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 2.3, 8).rotateX(Math.PI * 0.5));
    for (const sx of [-4.15, 4.15]) {
      const cannon = new THREE.Mesh(cannonBarrelGeo, carbonMat);
      cannon.position.set(sx, 0.05, -0.45);
      this.shipGroup.add(cannon);
    }

    // Teardrop Glass Cockpit Canopy
    const canopy = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.86, 18, 14)), canopyGlassMat);
    canopy.scale.set(0.85, 0.68, 2.15);
    canopy.position.set(0, 0.72, -0.95);
    this.shipGroup.add(canopy);

    // 1st-Person Cockpit Interior Console & Canopy Struts
    const hudEmissiveMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x28e0ff,
        emissive: 0x28e0ff,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.3
      })
    );
    const dashPanel = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.05, 0.28, 0.42)), carbonMat);
    dashPanel.position.set(0, 0.58, -1.78);
    this.shipCockpitHudGroup.add(dashPanel);

    const holoScreen = new THREE.Mesh(this.trackGeo(new THREE.PlaneGeometry(0.68, 0.22)), hudEmissiveMat);
    holoScreen.position.set(0, 0.76, -1.62);
    holoScreen.rotation.x = -0.25;
    this.shipCockpitHudGroup.add(holoScreen);
    this.shipGroup.add(this.shipCockpitHudGroup);

    // Retractable Landing Gear Struts
    const gearGeo = this.trackGeo(new THREE.BoxGeometry(0.18, 0.85, 0.45));
    for (const [gx, gz] of [
      [0, -2.5],
      [-1.8, 1.4],
      [1.8, 1.4]
    ]) {
      const strut = new THREE.Mesh(gearGeo, carbonMat);
      strut.position.set(gx, -0.62, gz);
      this.shipLandingGearGroup.add(strut);
    }
    this.shipGroup.add(this.shipLandingGearGroup);
    this.worldRoot.add(this.shipGroup);

    // Quantum Hyperdrive Warp Tunnel Cylinder attached to Starfighter
    this.warpTunnelMat = this.trackMat(createWarpTunnelMaterial());
    this.warpTunnelMat.side = THREE.DoubleSide;
    this.warpTunnelMat.transparent = true;
    this.warpTunnelMat.depthWrite = false;

    const tunnelGeo = this.trackGeo(new THREE.CylinderGeometry(11, 11, 120, 32, 1, true));
    tunnelGeo.rotateX(Math.PI * 0.5);
    this.warpTunnelMesh = new THREE.Mesh(tunnelGeo, this.warpTunnelMat);
    this.warpTunnelMesh.visible = false;
    this.warpTunnelMesh.frustumCulled = false;
    this.shipGroup.add(this.warpTunnelMesh);
  }

  private buildMiningLaserAndCombatPools(): void {
    // 1. Mining Laser Beam Group
    const outerGeo = this.trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 1, 10));
    outerGeo.rotateX(Math.PI * 0.5);
    outerGeo.translate(0, 0, 0.5);
    const outerMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38f29d,
        emissive: 0x28e0ff,
        emissiveIntensity: 4.2,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85
      })
    );
    this.laserOuterMesh = new THREE.Mesh(outerGeo, outerMat);
    this.laserBeamGroup.add(this.laserOuterMesh);
    this.laserBeamGroup.visible = false;
    this.worldRoot.add(this.laserBeamGroup);

    // 2. Plasma Cannon Bolts InstancedMesh (72 bolts in 1 draw call)
    const boltCount = 72;
    const boltGeo = this.trackGeo(new THREE.CapsuleGeometry(0.18, 2.6, 4, 8));
    boltGeo.rotateX(Math.PI * 0.5);
    const boltMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38f29d,
        emissiveIntensity: 4.0,
        roughness: 0.1,
        metalness: 0.1
      })
    );
    this.boltInstMesh = new THREE.InstancedMesh(boltGeo, boltMat, boltCount);
    this.boltInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.boltInstMesh.frustumCulled = false;

    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < boltCount; i++) {
      this.bolts.push({
        active: false,
        age: 0,
        life: 2.2,
        isEnemy: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3()
      });
      this.boltInstMesh.setMatrixAt(i, zeroMat);
      this.boltInstMesh.setColorAt(i, new THREE.Color(0x38f29d));
    }
    this.boltInstMesh.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(this.boltInstMesh);

    // 3. Plasma Sparks & Explosion Fireballs InstancedMesh (96 particles in 1 draw call)
    const sparkCount = 96;
    const sparkGeo = this.trackGeo(new THREE.IcosahedronGeometry(0.35, 0));
    const sparkMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffaa33,
        emissiveIntensity: 3.6,
        roughness: 0.2,
        metalness: 0.1
      })
    );
    this.sparkInstMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, sparkCount);
    this.sparkInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparkInstMesh.frustumCulled = false;

    for (let i = 0; i < sparkCount; i++) {
      this.sparks.push({
        active: false,
        age: 0,
        life: 0.8,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 1,
        colorHex: 0xffaa33
      });
      this.sparkInstMesh.setMatrixAt(i, zeroMat);
      this.sparkInstMesh.setColorAt(i, new THREE.Color(0xffaa33));
    }
    this.sparkInstMesh.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(this.sparkInstMesh);
  }

  private buildPirateSquadron(): void {
    const droneCount = 12;
    const hullGeo = this.trackGeo(new THREE.ConeGeometry(2.6, 6.2, 4).rotateX(-Math.PI * 0.5));
    const hullMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x222733,
        metalness: 0.85,
        roughness: 0.25,
        clearcoat: 0.7
      })
    );

    const wingGlowGeo = this.trackGeo(new THREE.BoxGeometry(7.2, 0.25, 1.8));
    const wingGlowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff2942,
        emissive: 0xff1834,
        emissiveIntensity: 3.5,
        roughness: 0.2,
        metalness: 0.2
      })
    );

    this.pirateHullInst = new THREE.InstancedMesh(hullGeo, hullMat, droneCount);
    this.pirateGlowInst = new THREE.InstancedMesh(wingGlowGeo, wingGlowMat, droneCount);
    this.pirateHullInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pirateGlowInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pirateHullInst.frustumCulled = false;
    this.pirateGlowInst.frustumCulled = false;

    const patrolAnchors = [
      new THREE.Vector3(620, 120, -680),
      new THREE.Vector3(1320, 220, -1120),
      new THREE.Vector3(-920, -80, -1080),
      new THREE.Vector3(580, 480, -2180)
    ];

    for (let i = 0; i < droneCount; i++) {
      const anchor = patrolAnchors[i % patrolAnchors.length];
      this.pirates.push({
        alive: true,
        respawnTimer: 0,
        hp: 3,
        anchor: anchor.clone(),
        orbitRadius: 95 + (i % 4) * 42,
        orbitSpeed: 0.42 + (i % 3) * 0.14,
        phase: (i * Math.PI * 2) / droneCount,
        pos: anchor.clone(),
        vel: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        fireCooldown: 1.5 + (i % 4) * 0.5
      });
    }

    this.worldRoot.add(this.pirateHullInst, this.pirateGlowInst);
  }

  private spawnBolt(origin: THREE.Vector3, velocity: THREE.Vector3, isEnemy: boolean): void {
    if (!this.boltInstMesh) return;
    const b = this.bolts[this.boltCursor];
    this.boltCursor = (this.boltCursor + 1) % this.bolts.length;
    b.active = true;
    b.age = 0;
    b.life = 2.4;
    b.isEnemy = isEnemy;
    b.pos.copy(origin);
    b.vel.copy(velocity);

    this.tempColor.setHex(isEnemy ? 0xff2942 : 0x38f29d);
    this.boltInstMesh.setColorAt(
      (this.boltCursor + this.bolts.length - 1) % this.bolts.length,
      this.tempColor
    );
    if (this.boltInstMesh.instanceColor) this.boltInstMesh.instanceColor.needsUpdate = true;
  }

  private spawnSparkBurst(center: THREE.Vector3, count: number, colorHex: number, speed = 16): void {
    if (!this.sparkInstMesh) return;
    for (let n = 0; n < count; n++) {
      const idx = this.sparkCursor;
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      const sp = this.sparks[idx];
      sp.active = true;
      sp.age = 0;
      sp.life = 0.45 + Math.random() * 0.55;
      sp.pos.copy(center);
      sp.vel.set(
        (Math.random() - 0.5) * 2 * speed,
        (Math.random() - 0.5) * 2 * speed,
        (Math.random() - 0.5) * 2 * speed
      );
      sp.scale = 0.6 + Math.random() * 1.4;
      sp.colorHex = colorHex;
      this.tempColor.setHex(colorHex);
      this.sparkInstMesh.setColorAt(idx, this.tempColor);
    }
    if (this.sparkInstMesh.instanceColor) this.sparkInstMesh.instanceColor.needsUpdate = true;
  }

  private summonAndBoardStarfighter(): void {
    if (!this.pilotingShip) {
      this.shipPos.copy(this.playerPos).addScaledVector(this.currentUp, 2.2);
      this.shipQuat.copy(this.playerFrameQuat);
      this.shipVel.set(0, 0, 0);
      this.enterStarfighter();
    }
  }

  private enterStarfighter(): void {
    this.pilotingShip = true;
    this.ctx.localAvatar.root.visible = false;
    this.ctx.localAvatar.setJetpackFlame(0);
    this.laserBeamGroup.visible = false;
    this.ctx.input.setContextMode('FLIGHT_SPACE');
    this.ctx.ui.setFighterHUDVisible(true, 0, 0, 0, 0, false);
    this.ctx.ui.notify(
      'CHASSEUR VALKYRIE ACTIVÉ',
      '[W/S] Poussée • [Espace] Décollage VTOL • [Shift] Hyperpropulsion Warp • [Clic] Canons Plasma • [C] Cockpit 1P/3P',
      'info'
    );
  }

  private exitStarfighter(): void {
    if (!this.pilotingShip) return;
    this.pilotingShip = false;
    this.warpActive = false;
    this.warpIntensity = 0;
    if (this.warpTunnelMesh) this.warpTunnelMesh.visible = false;
    this.ctx.camera.fov = this.baseFov;
    this.ctx.camera.updateProjectionMatrix();
    this.ctx.audio.updateSpaceThruster(false, 0, false);
    this.ctx.postFX.setSpeedFactor(0);
    this.ctx.ui.setFighterHUDVisible(false);
    this.ctx.input.setContextMode('ON_FOOT');

    // Place player safely beside the Starfighter aligned to local planetary or station gravity
    const rightSide = this.tempVecA.set(3.8, 0.5, 0).applyQuaternion(this.shipQuat);
    this.playerPos.copy(this.shipPos).add(rightSide);
    this.playerVel.set(0, 0, 0);

    const gravInfo = this.computeGravityAt(this.playerPos);
    this.currentUp.copy(gravInfo.up);
    this.playerFrameQuat.setFromUnitVectors(Y_UP, this.currentUp);
    this.ctx.localAvatar.root.visible = true;
    this.ctx.localAvatar.setEquippedTool('laser');
  }

  private engageQuantumWarpTo(targetId: string): void {
    this.selectedTargetId = targetId;
    if (!this.pilotingShip) {
      this.summonAndBoardStarfighter();
    }
    const target = this.navTargets.find((t) => t.id === targetId);
    if (!target) return;

    // Lift slightly if landed before engaging Quantum Hyperdrive
    this.shipPos.addScaledVector(this.currentUp, 18);
    this.warpActive = true;
    this.ctx.audio.playSonicBoom();
    this.ctx.ui.notify('HYPERPROPULSION QUANTIQUE', `Verrouillage Warp vers ${target.name} !`, 'success');
    this.setupToolbarUI();
  }

  private setupRadialMenu(): void {
    const items: RadialWheelItem[] = [
      { id: 'summon_ship', label: 'Chasseur Valkyrie', icon: '🚀', category: 'vehicle' },
      { id: 'cockpit_cam', label: 'Vue Cockpit 1P/3P', icon: '🎛️', category: 'tool' },
      { id: 'warp_nova', label: 'Warp Nova Terra', icon: '🌍', category: 'emote' },
      { id: 'warp_pyros', label: 'Warp Pyros IV', icon: '🌋', category: 'emote' },
      { id: 'warp_cryo', label: 'Warp Cryo Borealis', icon: '❄️', category: 'emote' },
      { id: 'warp_station', label: 'Warp Station Aegis', icon: '🛰️', category: 'emote' }
    ];
    this.ctx.ui.setRadialItems(items, (item) => {
      if (item.id === 'summon_ship') this.summonAndBoardStarfighter();
      else if (item.id === 'cockpit_cam') this.cockpitFirstPerson = !this.cockpitFirstPerson;
      else if (item.id === 'warp_nova') this.engageQuantumWarpTo('nova_terra');
      else if (item.id === 'warp_pyros') this.engageQuantumWarpTo('pyros_iv');
      else if (item.id === 'warp_cryo') this.engageQuantumWarpTo('cryo_borealis');
      else if (item.id === 'warp_station') this.engageQuantumWarpTo('aegis_station');
    });
  }

  private setupToolbarUI(): void {
    const navButtons = this.navTargets
      .map((t) => {
        const active = this.selectedTargetId === t.id;
        const bg = active ? 'rgba(255,179,71,0.25)' : 'rgba(12,18,32,0.7)';
        const border = active ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.16)';
        return `<button data-warp="${t.id}" style="padding:5px 9px;border-radius:7px;border:${border};background:${bg};color:#fff;font-size:12px;cursor:pointer;font-weight:600;">⚡ ${t.name}</button>`;
      })
      .join('');

    const html = `
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 10px;border-radius:12px;background:rgba(8,12,24,0.8);backdrop-filter:blur(12px);border:1px solid rgba(255,179,71,0.34);color:#f8fafc;font-family:system-ui,sans-serif;font-size:12px;">
        <button id="sf-spawn-ship" style="padding:5px 10px;border-radius:7px;border:1px solid #38f29d;background:rgba(56,242,157,0.18);color:#38f29d;cursor:pointer;font-weight:700;">🚀 Appeler Chasseur</button>
        <button id="sf-toggle-cockpit" style="padding:5px 9px;border-radius:7px;border:1px solid #28e0ff;background:rgba(40,224,255,0.16);color:#28e0ff;cursor:pointer;font-weight:600;">🎛️ Cockpit 1P / 3P</button>
        <span style="opacity:0.65;margin:0 2px;">Hyperdrive:</span>
        ${navButtons}
        <span id="sf-ore-counter" style="margin-left:6px;padding:4px 8px;border-radius:6px;background:rgba(56,189,248,0.16);color:#7dd3fc;font-weight:700;">💎 Minerai: ${this.quantumOre}</span>
      </div>
    `;

    this.ctx.ui.setWorldToolbarHTML(html, (container) => {
      container.querySelector<HTMLButtonElement>('#sf-spawn-ship')?.addEventListener('click', () => {
        this.ctx.audio.playUIClick();
        this.summonAndBoardStarfighter();
      });
      container.querySelector<HTMLButtonElement>('#sf-toggle-cockpit')?.addEventListener('click', () => {
        this.ctx.audio.playUIClick();
        this.cockpitFirstPerson = !this.cockpitFirstPerson;
      });
      container.querySelectorAll<HTMLButtonElement>('button[data-warp]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.ctx.audio.playUIClick();
          const targetId = btn.dataset.warp;
          if (targetId) this.engageQuantumWarpTo(targetId);
        });
      });
    });
  }

  private computeGravityAt(pos: THREE.Vector3): {
    up: THREE.Vector3;
    planet: PlanetBody | null;
    onStation: boolean;
    altitude: number;
  } {
    // Check Orbital Space Station artificial gravity docking volume
    if (
      Math.abs(pos.x - STATION_POS.x) < 20 &&
      Math.abs(pos.z - STATION_POS.z) < 20 &&
      pos.y >= STATION_DECK_Y - 3 &&
      pos.y <= STATION_DECK_Y + 22
    ) {
      return {
        up: Y_UP.clone(),
        planet: null,
        onStation: true,
        altitude: pos.y - STATION_DECK_Y
      };
    }

    let closestPlanet = this.planets[0];
    let bestAlt = Infinity;
    for (const p of this.planets) {
      const dist = pos.distanceTo(p.center);
      const alt = dist - p.radius;
      if (alt < bestAlt) {
        bestAlt = alt;
        closestPlanet = p;
      }
    }

    const up = pos.clone().sub(closestPlanet.center);
    if (up.lengthSq() < 1e-5) up.set(0, 1, 0);
    else up.normalize();

    const exactR = this.samplePlanetSurfaceRadius(closestPlanet, up.x, up.y, up.z);
    const exactAlt = pos.distanceTo(closestPlanet.center) - exactR;

    return {
      up,
      planet: closestPlanet,
      onStation: false,
      altitude: exactAlt
    };
  }

  update(dt: number, elapsed: number): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const input = this.ctx.input.state;

    if (input.cameraToggleJustPressed) {
      this.cockpitFirstPerson = !this.cockpitFirstPerson;
    }

    // Animate Star, Clouds, Lava, Ocean, Orbital Station & Asteroid Belt
    const activePos = this.pilotingShip ? this.shipPos : this.playerPos;
    const starToPlayerDir = this.tempVecA.copy(STAR_POS).sub(activePos).normalize();

    if (this.starCoreMat) this.starCoreMat.uniforms.uTime.value = elapsed;
    if (this.starCoronaMat) this.starCoronaMat.uniforms.uTime.value = elapsed;
    if (this.pyrosMagmaMat) this.pyrosMagmaMat.uniforms.uTime.value = elapsed;
    if (this.novaCloudMat) {
      this.novaCloudMat.uniforms.uTime.value = elapsed;
      this.novaCloudMat.uniforms.uSunDir.value.copy(starToPlayerDir);
    }
    if (this.novaOceanMat) {
      updateOceanMaterial(this.novaOceanMat, elapsed, starToPlayerDir, this.ctx.camera.position);
    }
    for (const p of this.planets) {
      if (p.cloudMesh) p.cloudMesh.rotation.y = elapsed * 0.014;
    }
    if (this.stationCentrifugeGroup) {
      this.stationCentrifugeGroup.rotation.y = elapsed * 0.28;
    }
    if (this.asteroidBeltGroup) {
      this.asteroidBeltGroup.rotation.y = elapsed * 0.012;
    }

    // Seamless Atmosphere-to-Space Sky Blend (ZERO Loading Screen!)
    const grav = this.computeGravityAt(activePos);
    let spaceBlend = 1.0;
    if (grav.planet && grav.planet.hasAtmosphere) {
      spaceBlend = THREE.MathUtils.clamp((grav.altitude - 18.0) / 145.0, 0, 1);
    }
    this.ctx.sky.setSpaceBlend(spaceBlend);

    // Handle boarding / exiting Starfighter with [E]
    if (input.interactJustPressed) {
      if (this.pilotingShip) {
        if (grav.altitude < 22 || grav.onStation) {
          this.exitStarfighter();
        } else {
          this.ctx.ui.notify(
            'ALTITUDE ÉLEVÉE',
            'Approchez-vous de la surface d’une planète ou du pont de la Station Aegis pour sortir à pied.',
            'warning'
          );
        }
      } else if (this.playerPos.distanceTo(this.shipPos) < 8.5) {
        this.enterStarfighter();
      }
    }

    let statusHint = '';
    if (this.pilotingShip) {
      this.updateStarfighterFlight(safeDt, elapsed, grav);
      statusHint = this.warpActive
        ? '⚡ HYPERPROPULSION WARP ACTIVE • [Shift] Annuler'
        : '[W/S] Poussée • [Shift] Warp • [Clic] Canons • [C] Cockpit • [E] Atterrir/Sortir';
    } else {
      this.updateSphericalOnFoot(safeDt, elapsed, grav);
      statusHint =
        this.playerPos.distanceTo(this.shipPos) < 8.5
          ? '[E] Embarquer dans le Chasseur Valkyrie'
          : '[Clic Gauche] Laser de Minage • [Espace] Jetpack • [Tab] Roue Spatiale';
    }

    // Update Crystals, Pirate Interceptors, Plasma Bolts & Sparks
    this.updateCrystalsRespawn(safeDt);
    this.updatePirateSquadron(safeDt, elapsed);
    this.updateBoltsAndSparks(safeDt);

    // Sync sky & multiplayer P2P state
    this.ctx.sky.update(safeDt, activePos);
    const remoteMarkers = this.ctx.network.syncRemoteEntities(this.ctx.scene, 'starfield', safeDt);

    if (this.pilotingShip) {
      this.ctx.network.broadcastVehicle({
        vehicleId: 'starfighter_' + this.ctx.network.selfPeerId.slice(0, 6),
        kind: 'starfighter',
        x: this.shipPos.x,
        y: this.shipPos.y,
        z: this.shipPos.z,
        vx: this.shipVel.x,
        vy: this.shipVel.y,
        vz: this.shipVel.z,
        qx: this.shipQuat.x,
        qy: this.shipQuat.y,
        qz: this.shipQuat.z,
        qw: this.shipQuat.w,
        steering: 0,
        wheelSpin: 0,
        extra: this.warpIntensity
      });
    }

    this.ctx.network.broadcastLocalPlayer({
      worldId: 'starfield',
      x: activePos.x,
      y: activePos.y,
      z: activePos.z,
      vx: this.pilotingShip ? this.shipVel.x : this.playerVel.x,
      vy: this.pilotingShip ? this.shipVel.y : this.playerVel.y,
      vz: this.pilotingShip ? this.shipVel.z : this.playerVel.z,
      yaw: this.playerLocalYaw,
      pitch: input.cameraPitch,
      anim: this.pilotingShip ? 'drive' : !this.playerGrounded ? 'jump' : this.playerVel.length() > 5.5 ? 'run' : this.playerVel.length() > 0.35 ? 'walk' : 'idle',
      tool: 'laser',
      vehicleId: this.pilotingShip ? 'starfighter' : null,
      seatIndex: 0
    });

    const markers = [...this.getMinimapMarkers(), ...remoteMarkers];
    this.ctx.ui.updateMinimap({ x: activePos.x, z: activePos.z }, this.playerLocalYaw, markers);

    const speedMs = this.pilotingShip ? this.shipVel.length() : this.playerVel.length();
    const fps = this.ctx.quality.recordFrame(safeDt);
    const zoneLabel = grav.onStation
      ? 'Station Orbitale Aegis'
      : spaceBlend > 0.85
        ? 'Espace Interplanétaire'
        : grav.planet
          ? `${grav.planet.name} (Alt: ${Math.max(0, Math.round(grav.altitude))}m)`
          : 'Orbite';

    this.ctx.ui.updateTelemetry({
      fps,
      drawCalls: this.ctx.renderer.info.render.calls,
      triangles: this.ctx.renderer.info.render.triangles,
      pingMs: this.ctx.network.getAveragePing(),
      peerCount: this.ctx.network.getConnectedPeers().length,
      qualityPreset: this.ctx.quality.config.preset,
      autoScale: this.ctx.quality.autoScale,
      worldTitle: this.metadata.title,
      contextMode: this.ctx.input.getContextMode(),
      speedKmh: Math.round(speedMs * 3.6),
      altitudeM: Math.max(0, Math.round(grav.altitude)),
      mach: Number((speedMs / 340).toFixed(2)),
      credits: this.credits,
      weatherLabel: `${zoneLabel} • 💎 ${this.quantumOre}`,
      statusHint
    });
  }

  private updateSphericalOnFoot(
    dt: number,
    elapsed: number,
    grav: { up: THREE.Vector3; planet: PlanetBody | null; onStation: boolean; altitude: number }
  ): void {
    const input = this.ctx.input.state;

    // Parallel-transport player tangent basis quaternion cleanly as gravityUp curves 360° around sphere!
    this.tempQuatA.setFromUnitVectors(this.currentUp, grav.up);
    this.playerFrameQuat.premultiply(this.tempQuatA).normalize();
    this.currentUp.copy(grav.up);

    // Accumulate mouse/touch yaw locally around the spherical surface normal
    if (Math.abs(input.lookDeltaX) > 1e-6) {
      this.tempQuatB.setFromAxisAngle(Y_UP, -input.lookDeltaX);
      this.playerFrameQuat.multiply(this.tempQuatB).normalize();
    }

    const camPitch = THREE.MathUtils.clamp(input.cameraPitch, -1.15, 1.05);

    // Tangent basis vectors on the curved sphere
    const tangentFwd = this.tempVecA.set(0, 0, -1).applyQuaternion(this.playerFrameQuat).normalize();
    const tangentRight = this.tempVecB.set(1, 0, 0).applyQuaternion(this.playerFrameQuat).normalize();

    const moveSpeed = input.sprint ? 9.2 : 5.2;
    const wishTangent = this.tempVecC
      .set(0, 0, 0)
      .addScaledVector(tangentFwd, input.moveZ)
      .addScaledVector(tangentRight, input.moveX);

    const radialVelAmt = this.playerVel.dot(this.currentUp);
    const radialVel = this.currentUp.clone().multiplyScalar(radialVelAmt);
    const currentTangentialVel = this.playerVel.clone().sub(radialVel);

    if (wishTangent.lengthSq() > 0.01) {
      wishTangent.normalize();
      currentTangentialVel.lerp(wishTangent.clone().multiplyScalar(moveSpeed), 1 - Math.exp(-dt * 14));
      // Compute local avatar heading relative to playerFrameQuat
      const localX = wishTangent.dot(tangentRight);
      const localZ = wishTangent.dot(tangentFwd);
      const targetYaw = Math.atan2(-localX, localZ);
      let dYaw = targetYaw - this.playerLocalYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      this.playerLocalYaw += dYaw * (1 - Math.exp(-dt * 14));
    } else {
      currentTangentialVel.multiplyScalar(Math.exp(-dt * 12));
    }

    // Radial gravity & Jetpack thrust
    const gStrength = grav.onStation ? 12.0 : grav.planet ? grav.planet.gravity : 4.0;
    let newRadialSpeed = radialVelAmt - gStrength * dt;

    if (this.playerGrounded && input.jumpJustPressed) {
      newRadialSpeed = 8.4;
      this.playerGrounded = false;
    } else if (!this.playerGrounded && input.jump) {
      // Low-G Jetpack thrust!
      newRadialSpeed = Math.min(14.5, newRadialSpeed + (gStrength + 11.5) * dt);
      this.ctx.localAvatar.setJetpackFlame(0.9);
    } else {
      this.ctx.localAvatar.setJetpackFlame(0);
    }

    this.playerVel.copy(currentTangentialVel).addScaledVector(this.currentUp, newRadialSpeed);
    this.playerPos.addScaledVector(this.playerVel, dt);

    // Clamp to exact curved planet surface or Orbital Station deck
    if (grav.onStation) {
      if (this.playerPos.y <= STATION_DECK_Y) {
        this.playerPos.y = STATION_DECK_Y;
        if (newRadialSpeed < 0) this.playerVel.y = 0;
        this.playerGrounded = true;
      } else {
        this.playerGrounded = false;
      }
    } else if (grav.planet) {
      const p = grav.planet;
      const dir = this.playerPos.clone().sub(p.center);
      const dist = dir.length();
      dir.divideScalar(Math.max(1e-4, dist));

      let surfR = this.samplePlanetSurfaceRadius(p, dir.x, dir.y, dir.z);
      if (p.archetype === 'terra') {
        surfR = Math.max(surfR, p.radius - 0.35); // Buoyant walking over shallow ocean
      }

      if (dist <= surfR) {
        this.playerPos.copy(dir).multiplyScalar(surfR).add(p.center);
        const vn = this.playerVel.dot(dir);
        if (vn < 0) this.playerVel.addScaledVector(dir, -vn);
        this.playerGrounded = true;
      } else {
        this.playerGrounded = dist <= surfR + 0.15;
      }
    }

    // Footstep audio
    const tangSpeed = currentTangentialVel.length();
    if (this.playerGrounded && tangSpeed > 0.65) {
      this.footstepAccum += tangSpeed * dt;
      if (this.footstepAccum >= (input.sprint ? 2.6 : 1.9)) {
        this.footstepAccum = 0;
        const surfType =
          grav.onStation
            ? 'metal'
            : grav.planet?.archetype === 'ice'
              ? 'snow'
              : grav.planet?.archetype === 'terra'
                ? 'grass'
                : 'rock';
        this.ctx.audio.playFootstep(surfType, input.sprint);
      }
    }

    // Align Avatar Quaternion to Spherical Surface Normal + Local Heading!
    this.tempQuatA.setFromAxisAngle(Y_UP, this.playerLocalYaw);
    this.ctx.localAvatar.root.visible = !this.cockpitFirstPerson;
    this.ctx.localAvatar.root.position.copy(this.playerPos);
    this.ctx.localAvatar.root.quaternion.copy(this.playerFrameQuat).multiply(this.tempQuatA);

    const anim = input.primaryAction
      ? 'attack'
      : !this.playerGrounded
        ? 'jump'
        : tangSpeed > 6.2
          ? 'run'
          : tangSpeed > 0.35
            ? 'walk'
            : 'idle';
    this.ctx.localAvatar.updateAnimation(dt, anim, tangSpeed);

    // Spherical-Up Third-Person / First-Person Camera
    this.ctx.camera.up.lerp(this.currentUp, 1 - Math.exp(-dt * 16)).normalize();
    const eyePivot = this.playerPos.clone().addScaledVector(this.currentUp, 1.62);

    // Camera view direction in curved tangent frame
    const viewDir = tangentFwd
      .clone()
      .multiplyScalar(Math.cos(camPitch))
      .addScaledVector(this.currentUp, Math.sin(camPitch))
      .normalize();

    if (this.cockpitFirstPerson) {
      this.ctx.camera.position.copy(eyePivot);
      this.ctx.camera.lookAt(eyePivot.clone().addScaledVector(viewDir, 12));
    } else {
      const camDist = 5.2;
      const desiredCam = eyePivot.clone().addScaledVector(viewDir, -camDist).addScaledVector(this.currentUp, 0.55);
      this.ctx.camera.position.lerp(desiredCam, 1 - Math.exp(-dt * 18));
      this.ctx.camera.lookAt(eyePivot.clone().addScaledVector(viewDir, 4));
    }

    // Mining Laser Beam Interaction
    this.updateMiningLaser(dt, elapsed, eyePivot, viewDir);
  }

  private updateMiningLaser(
    dt: number,
    elapsed: number,
    eyePivot: THREE.Vector3,
    viewDir: THREE.Vector3
  ): void {
    const input = this.ctx.input.state;
    if (!input.primaryAction) {
      this.laserBeamGroup.visible = false;
      return;
    }

    const emitterPos = this.playerPos
      .clone()
      .addScaledVector(this.currentUp, 1.25)
      .addScaledVector(viewDir, 0.55);

    // Find closest crystal node near aim ray within 28m
    let hitCrystal: CrystalNode | null = null;
    let hitIndex = -1;
    let bestScore = 0.86;
    let endPoint = eyePivot.clone().addScaledVector(viewDir, 24);

    for (let i = 0; i < this.crystals.length; i++) {
      const c = this.crystals[i];
      if (!c.active) continue;
      const toCrystal = this.tempVecA.copy(c.position).addScaledVector(c.normal, 1.1).sub(eyePivot);
      const dist = toCrystal.length();
      if (dist > 28 || dist < 0.5) continue;
      const align = toCrystal.divideScalar(dist).dot(viewDir);
      if (align > bestScore) {
        bestScore = align;
        hitCrystal = c;
        hitIndex = i;
        endPoint = c.position.clone().addScaledVector(c.normal, 1.1);
      }
    }

    const beamLen = emitterPos.distanceTo(endPoint);
    this.laserBeamGroup.visible = true;
    this.laserBeamGroup.position.copy(emitterPos);
    this.laserBeamGroup.lookAt(endPoint);
    if (this.laserOuterMesh) {
      const pulse = 0.85 + 0.35 * Math.sin(elapsed * 32);
      this.laserOuterMesh.scale.set(pulse, pulse, beamLen);
    }

    this.laserAudioTimer -= dt;
    if (this.laserAudioTimer <= 0) {
      this.laserAudioTimer = 0.16;
      this.ctx.audio.playLaserPulse();
    }

    if (hitCrystal && hitIndex >= 0 && this.crystalInstMesh) {
      this.spawnSparkBurst(endPoint, 2, 0x28e0ff, 9);
      hitCrystal.hp -= dt * 1.45;

      const shrink = Math.max(0.25, hitCrystal.hp / 1.4) * hitCrystal.scale;
      this.dummy.position.copy(hitCrystal.position);
      this.dummy.quaternion.copy(hitCrystal.quat);
      this.dummy.scale.setScalar(shrink);
      this.dummy.updateMatrix();
      this.crystalInstMesh.setMatrixAt(hitIndex, this.dummy.matrix);
      this.crystalInstMesh.instanceMatrix.needsUpdate = true;

      if (hitCrystal.hp <= 0) {
        hitCrystal.active = false;
        hitCrystal.respawnTimer = 25;
        this.dummy.scale.setScalar(0.0001);
        this.dummy.updateMatrix();
        this.crystalInstMesh.setMatrixAt(hitIndex, this.dummy.matrix);
        this.crystalInstMesh.instanceMatrix.needsUpdate = true;

        this.quantumOre += 1;
        this.credits += 220;
        this.spawnSparkBurst(endPoint, 16, 0x38f29d, 15);
        this.ctx.audio.playBuildSnap();
        this.ctx.ui.notify(
          'CRISTAL QUANTIQUE MINÉ !',
          `+1 Minerai Quantique • +$220 Crédits (Total: 💎 ${this.quantumOre})`,
          'success'
        );

        const counterEl = document.getElementById('sf-ore-counter');
        if (counterEl) counterEl.textContent = `💎 Minerai: ${this.quantumOre}`;
      }
    }
  }

  private updateCrystalsRespawn(dt: number): void {
    if (!this.crystalInstMesh) return;
    let changed = false;
    for (let i = 0; i < this.crystals.length; i++) {
      const c = this.crystals[i];
      if (c.active) continue;
      c.respawnTimer -= dt;
      if (c.respawnTimer <= 0) {
        c.active = true;
        c.hp = 1.4;
        this.dummy.position.copy(c.position);
        this.dummy.quaternion.copy(c.quat);
        this.dummy.scale.setScalar(c.scale);
        this.dummy.updateMatrix();
        this.crystalInstMesh.setMatrixAt(i, this.dummy.matrix);
        changed = true;
      }
    }
    if (changed) this.crystalInstMesh.instanceMatrix.needsUpdate = true;
  }

  private updateStarfighterFlight(
    dt: number,
    elapsed: number,
    grav: { up: THREE.Vector3; planet: PlanetBody | null; onStation: boolean; altitude: number }
  ): void {
    const input = this.ctx.input.state;

    // Toggle Quantum Warp with Shift (sprint) in space
    if (input.sprint && !this.warpActive && grav.altitude > 40) {
      this.warpActive = true;
      this.ctx.audio.playSonicBoom();
    } else if (this.warpActive && input.brake > 0.4) {
      this.warpActive = false;
    }

    const forward = this.tempVecA.set(0, 0, -1).applyQuaternion(this.shipQuat).normalize();
    const shipUp = this.tempVecB.set(0, 1, 0).applyQuaternion(this.shipQuat).normalize();
    const shipRight = this.tempVecC.set(1, 0, 0).applyQuaternion(this.shipQuat).normalize();

    if (this.warpActive) {
      // Quantum Hyperdrive Warp Flight
      this.warpIntensity = THREE.MathUtils.lerp(this.warpIntensity, 1.0, 1 - Math.exp(-dt * 4.5));

      const target = this.navTargets.find((t) => t.id === this.selectedTargetId);
      if (target) {
        const toTarget = target.position.clone().sub(this.shipPos);
        const dist = toTarget.length();
        if (dist <= target.stopDistance) {
          this.warpActive = false;
          this.shipVel.multiplyScalar(0.12);
          this.ctx.ui.notify('SORTIE D’HYPERESPACE', `Arrivée en orbite de ${target.name}.`, 'info');
        } else {
          toTarget.divideScalar(dist);
          const desiredQuat = this.tempQuatA.setFromUnitVectors(Z_FWD, toTarget);
          this.shipQuat.slerp(desiredQuat, 1 - Math.exp(-dt * 5.0));
        }
      }

      const warpFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuat);
      this.shipVel.copy(warpFwd).multiplyScalar(680.0);
      this.shipPos.addScaledVector(this.shipVel, dt);
    } else {
      this.warpIntensity = THREE.MathUtils.lerp(this.warpIntensity, 0.0, 1 - Math.exp(-dt * 6.0));

      // 6-DOF Quaternion Steering (Pitch, Yaw, Roll)
      const pitchInput = -input.lookDeltaY * 16.0 + (input.usingTouch ? input.moveZ * 0.4 : 0);
      const yawInput = -input.lookDeltaX * 16.0 - input.moveX * 1.45;
      const rollInput = -input.rollAxis * 2.4 - input.moveX * 0.75;

      this.shipAngVel.x = THREE.MathUtils.lerp(this.shipAngVel.x, THREE.MathUtils.clamp(pitchInput, -2.4, 2.4), 1 - Math.exp(-dt * 9));
      this.shipAngVel.y = THREE.MathUtils.lerp(this.shipAngVel.y, THREE.MathUtils.clamp(yawInput, -2.2, 2.2), 1 - Math.exp(-dt * 9));
      this.shipAngVel.z = THREE.MathUtils.lerp(this.shipAngVel.z, THREE.MathUtils.clamp(rollInput, -2.8, 2.8), 1 - Math.exp(-dt * 9));

      this.tempQuatA.setFromEuler(
        new THREE.Euler(this.shipAngVel.x * dt, this.shipAngVel.y * dt, this.shipAngVel.z * dt, 'YXZ')
      );
      this.shipQuat.multiply(this.tempQuatA).normalize();

      // Forward / Reverse Thrust + VTOL Lift
      const fwdIn = Math.max(input.throttle, Math.max(0, input.moveZ));
      const revIn = Math.max(input.brake, Math.max(0, -input.moveZ));
      this.shipThrottle = THREE.MathUtils.lerp(this.shipThrottle, fwdIn, 1 - Math.exp(-dt * 5));

      const maxSpeed = grav.altitude < 90 ? 95 : 220;
      if (fwdIn > 0.02) {
        this.shipVel.addScaledVector(forward, fwdIn * 98.0 * dt);
      }
      if (revIn > 0.02) {
        this.shipVel.addScaledVector(forward, -revIn * 54.0 * dt);
      }
      if (input.jump) {
        this.shipVel.addScaledVector(shipUp, 48.0 * dt);
      }
      if (input.crouch) {
        this.shipVel.addScaledVector(shipUp, -36.0 * dt);
      }

      // Subtle planetary gravity pull when engines idle near surface
      if (grav.altitude < 45 && fwdIn < 0.05 && !input.jump) {
        this.shipVel.addScaledVector(grav.up, -8.5 * dt);
      }

      // Inertial dampeners
      this.shipVel.multiplyScalar(Math.exp(-dt * 0.95));
      if (this.shipVel.length() > maxSpeed) {
        this.shipVel.setLength(maxSpeed);
      }

      this.shipPos.addScaledVector(this.shipVel, dt);
    }

    // Surface & Orbital Space Station Deck Landing Collision
    if (grav.onStation && this.shipPos.y < STATION_DECK_Y + 1.25) {
      this.shipPos.y = STATION_DECK_Y + 1.25;
      if (this.shipVel.y < 0) this.shipVel.y = 0;
      this.shipVel.multiplyScalar(Math.exp(-dt * 4));
    } else {
      for (const p of this.planets) {
        const toShip = this.shipPos.clone().sub(p.center);
        const dist = toShip.length();
        const dir = toShip.divideScalar(Math.max(1e-4, dist));
        const minR =
          Math.max(
            this.samplePlanetSurfaceRadius(p, dir.x, dir.y, dir.z),
            p.archetype === 'terra' ? p.radius - 0.35 : 0
          ) + 1.35;
        if (dist < minR) {
          this.shipPos.copy(dir).multiplyScalar(minR).add(p.center);
          const vn = this.shipVel.dot(dir);
          if (vn < 0) this.shipVel.addScaledVector(dir, -vn);
          this.shipVel.multiplyScalar(Math.exp(-dt * 3.5));
          if (this.warpActive) this.warpActive = false;
        }
      }
    }

    // Retract landing gear automatically in flight
    this.shipLandingGearGroup.visible = grav.altitude < 16 || grav.onStation;
    this.shipCockpitHudGroup.visible = this.cockpitFirstPerson;

    this.shipGroup.position.copy(this.shipPos);
    this.shipGroup.quaternion.copy(this.shipQuat);

    // Thruster glow & Quantum Warp Tunnel shader update
    if (this.shipThrusterMat) {
      this.shipThrusterMat.emissiveIntensity = 1.6 + this.shipThrottle * 4.2 + this.warpIntensity * 6.0;
    }
    if (this.warpTunnelMesh && this.warpTunnelMat) {
      this.warpTunnelMesh.visible = this.warpIntensity > 0.03;
      if (this.warpTunnelMat.uniforms) {
        if (this.warpTunnelMat.uniforms.uTime) this.warpTunnelMat.uniforms.uTime.value = elapsed;
        if (this.warpTunnelMat.uniforms.uIntensity) this.warpTunnelMat.uniforms.uIntensity.value = this.warpIntensity;
      }
    }

    // Dynamic FOV kick & PostFX speed chromatic feel
    const targetFov = this.baseFov + this.shipThrottle * 8 + this.warpIntensity * 28;
    if (Math.abs(this.ctx.camera.fov - targetFov) > 0.05) {
      this.ctx.camera.fov = THREE.MathUtils.lerp(this.ctx.camera.fov, targetFov, 1 - Math.exp(-dt * 8));
      this.ctx.camera.updateProjectionMatrix();
    }
    const speedNorm = THREE.MathUtils.clamp(this.shipVel.length() / 220 + this.warpIntensity, 0, 1);
    this.ctx.postFX.setSpeedFactor(speedNorm);
    this.ctx.audio.updateSpaceThruster(true, Math.max(0.15, this.shipThrottle), this.warpActive);

    // Twin Plasma Cannons Firing + P2P Broadcast!
    this.cannonCooldown -= dt;
    if (input.primaryAction && !this.warpActive && this.cannonCooldown <= 0) {
      this.cannonCooldown = 0.13;
      this.cannonSideToggle = !this.cannonSideToggle;
      const sideX = this.cannonSideToggle ? 4.15 : -4.15;

      const muzzlePos = this.shipPos
        .clone()
        .addScaledVector(shipRight, sideX)
        .addScaledVector(forward, 1.8);
      const boltVel = forward.clone().multiplyScalar(360).add(this.shipVel);

      this.spawnBolt(muzzlePos, boltVel, false);
      this.ctx.audio.playLaserPulse();

      this.ctx.network.broadcastWorldEvent('projectile_fire', 'starfield', {
        ox: muzzlePos.x,
        oy: muzzlePos.y,
        oz: muzzlePos.z,
        vx: boltVel.x,
        vy: boltVel.y,
        vz: boltVel.z
      });
    }

    // Update Starfighter Camera (1st-Person Cockpit or 3rd-Person Chase)
    this.ctx.camera.up.lerp(shipUp, 1 - Math.exp(-dt * 12)).normalize();
    if (this.cockpitFirstPerson) {
      const cockpitEye = this.shipPos
        .clone()
        .addScaledVector(shipUp, 0.88)
        .addScaledVector(forward, 0.95);
      this.ctx.camera.position.copy(cockpitEye);
      this.ctx.camera.lookAt(cockpitEye.clone().addScaledVector(forward, 50));
    } else {
      const chasePos = this.shipPos
        .clone()
        .addScaledVector(forward, -12.5)
        .addScaledVector(shipUp, 3.6);
      this.ctx.camera.position.lerp(chasePos, 1 - Math.exp(-dt * 14));
      this.ctx.camera.lookAt(this.shipPos.clone().addScaledVector(forward, 18));
    }

    // Fighter HUD pitch/roll telemetry
    const pitchDeg = Math.asin(THREE.MathUtils.clamp(forward.dot(grav.up), -1, 1)) * (180 / Math.PI);
    const rollDeg = Math.asin(THREE.MathUtils.clamp(-shipRight.dot(grav.up), -1, 1)) * (180 / Math.PI);
    this.ctx.ui.setFighterHUDVisible(
      true,
      pitchDeg,
      rollDeg,
      this.shipVel.length() / 340,
      Math.max(0, grav.altitude),
      false
    );
  }

  private updatePirateSquadron(dt: number, elapsed: number): void {
    if (!this.pirateHullInst || !this.pirateGlowInst) return;

    const zeroScale = new THREE.Vector3(0.0001, 0.0001, 0.0001);

    for (let i = 0; i < this.pirates.length; i++) {
      const p = this.pirates[i];
      if (!p.alive) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.alive = true;
          p.hp = 3;
        } else {
          this.dummy.position.set(0, -9000, 0);
          this.dummy.scale.copy(zeroScale);
          this.dummy.updateMatrix();
          this.pirateHullInst.setMatrixAt(i, this.dummy.matrix);
          this.pirateGlowInst.setMatrixAt(i, this.dummy.matrix);
          continue;
        }
      }

      const prevX = p.pos.x;
      const prevY = p.pos.y;
      const prevZ = p.pos.z;

      const ang = elapsed * p.orbitSpeed + p.phase;
      const desiredX = p.anchor.x + Math.cos(ang) * p.orbitRadius;
      const desiredY = p.anchor.y + Math.sin(ang * 1.7) * 38;
      const desiredZ = p.anchor.z + Math.sin(ang) * p.orbitRadius;

      p.pos.set(desiredX, desiredY, desiredZ);
      p.vel.set((p.pos.x - prevX) / dt, (p.pos.y - prevY) / dt, (p.pos.z - prevZ) / dt);

      if (p.vel.lengthSq() > 0.1) {
        this.tempVecA.copy(p.vel).normalize();
        p.quat.setFromUnitVectors(Z_FWD, this.tempVecA);
      }

      // Engage player Starfighter if nearby!
      if (this.pilotingShip && !this.warpActive) {
        const distToShip = p.pos.distanceTo(this.shipPos);
        p.fireCooldown -= dt;
        if (distToShip < 310 && p.fireCooldown <= 0) {
          p.fireCooldown = 1.65 + (i % 3) * 0.4;
          const aimDir = this.shipPos.clone().sub(p.pos).normalize();
          this.spawnBolt(p.pos, aimDir.multiplyScalar(230), true);
        }
      }

      this.dummy.position.copy(p.pos);
      this.dummy.quaternion.copy(p.quat);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.pirateHullInst.setMatrixAt(i, this.dummy.matrix);
      this.pirateGlowInst.setMatrixAt(i, this.dummy.matrix);
    }

    this.pirateHullInst.instanceMatrix.needsUpdate = true;
    this.pirateGlowInst.instanceMatrix.needsUpdate = true;
  }

  private updateBoltsAndSparks(dt: number): void {
    if (this.boltInstMesh) {
      let boltUpdated = false;
      for (let i = 0; i < this.bolts.length; i++) {
        const b = this.bolts[i];
        if (!b.active) continue;
        boltUpdated = true;
        b.age += dt;
        if (b.age >= b.life) {
          b.active = false;
          this.dummy.scale.setScalar(0.0001);
          this.dummy.updateMatrix();
          this.boltInstMesh.setMatrixAt(i, this.dummy.matrix);
          continue;
        }

        b.pos.addScaledVector(b.vel, dt);

        // Check hit against Pirate Interceptor Drones
        if (!b.isEnemy) {
          for (let d = 0; d < this.pirates.length; d++) {
            const pirate = this.pirates[d];
            if (!pirate.alive) continue;
            if (b.pos.distanceToSquared(pirate.pos) < 42) {
              b.active = false;
              pirate.hp -= 1;
              this.spawnSparkBurst(b.pos, 10, 0xffaa33, 22);
              if (pirate.hp <= 0) {
                pirate.alive = false;
                pirate.respawnTimer = 18;
                this.credits += 450;
                this.spawnSparkBurst(pirate.pos, 28, 0xff4d28, 36);
                this.ctx.audio.playCannonFire(40);
                this.ctx.ui.notify(
                  'INTERCEPTEUR PIRATE DÉTRUIT !',
                  '+$450 Prime de Chasseur Spatial !',
                  'success'
                );
              }
              break;
            }
          }
        } else if (this.pilotingShip && b.pos.distanceToSquared(this.shipPos) < 28) {
          b.active = false;
          this.spawnSparkBurst(b.pos, 8, 0xff2942, 18);
          this.ctx.input.vibrate(90, 0.5, 0.3);
        }

        if (b.active) {
          this.tempVecA.copy(b.vel).normalize();
          this.dummy.position.copy(b.pos);
          this.dummy.quaternion.setFromUnitVectors(Z_FWD, this.tempVecA);
          this.dummy.scale.setScalar(1);
        } else {
          this.dummy.scale.setScalar(0.0001);
        }
        this.dummy.updateMatrix();
        this.boltInstMesh.setMatrixAt(i, this.dummy.matrix);
      }
      if (boltUpdated) this.boltInstMesh.instanceMatrix.needsUpdate = true;
    }

    if (this.sparkInstMesh) {
      let sparkUpdated = false;
      for (let i = 0; i < this.sparks.length; i++) {
        const sp = this.sparks[i];
        if (!sp.active) continue;
        sparkUpdated = true;
        sp.age += dt;
        if (sp.age >= sp.life) {
          sp.active = false;
          this.dummy.scale.setScalar(0.0001);
          this.dummy.updateMatrix();
          this.sparkInstMesh.setMatrixAt(i, this.dummy.matrix);
          continue;
        }
        sp.pos.addScaledVector(sp.vel, dt);
        sp.vel.multiplyScalar(Math.exp(-dt * 2.8));
        const fade = 1.0 - sp.age / sp.life;
        this.dummy.position.copy(sp.pos);
        this.dummy.rotation.set(sp.age * 5, sp.age * 3, 0);
        this.dummy.scale.setScalar(sp.scale * fade);
        this.dummy.updateMatrix();
        this.sparkInstMesh.setMatrixAt(i, this.dummy.matrix);
      }
      if (sparkUpdated) this.sparkInstMesh.instanceMatrix.needsUpdate = true;
    }
  }

  onWorldEvent(event: NetWorldEventPacket): void {
    if (event.worldId !== 'starfield') return;
    if (event.type === 'projectile_fire') {
      const p = event.payload;
      if (
        typeof p.ox === 'number' &&
        typeof p.oy === 'number' &&
        typeof p.oz === 'number' &&
        typeof p.vx === 'number' &&
        typeof p.vy === 'number' &&
        typeof p.vz === 'number'
      ) {
        this.spawnBolt(
          new THREE.Vector3(p.ox, p.oy, p.oz),
          new THREE.Vector3(p.vx, p.vy, p.vz),
          false
        );
      }
    }
  }

  getMinimapMarkers(): MinimapMarker[] {
    const markers: MinimapMarker[] = [];

    for (const t of this.navTargets) {
      markers.push({
        id: t.id,
        x: t.position.x,
        z: t.position.z,
        color: t.color,
        type: t.id === this.selectedTargetId ? 'objective' : 'poi',
        label: t.name
      });
    }

    if (!this.pilotingShip) {
      markers.push({
        id: 'valkyrie_ship',
        x: this.shipPos.x,
        z: this.shipPos.z,
        color: '#38f29d',
        type: 'vehicle',
        label: 'Chasseur'
      });
    }

    for (let i = 0; i < this.pirates.length; i++) {
      const p = this.pirates[i];
      if (!p.alive) continue;
      markers.push({
        id: `pirate_${i}`,
        x: p.pos.x,
        z: p.pos.z,
        color: '#ff2942',
        type: 'danger'
      });
    }

    return markers;
  }

  dispose(): void {
    this.ctx.audio.updateSpaceThruster(false, 0, false);
    this.ctx.audio.updateWindRush(0);
    this.ctx.postFX.setSpeedFactor(0);
    this.ctx.ui.setFighterHUDVisible(false);
    this.ctx.ui.setWorldToolbarHTML('');
    this.ctx.sky.setSpaceBlend(0);
    this.ctx.camera.fov = this.baseFov;
    this.ctx.camera.up.set(0, 1, 0);
    this.ctx.camera.updateProjectionMatrix();
    this.ctx.localAvatar.root.up.set(0, 1, 0);
    this.ctx.localAvatar.setJetpackFlame(0);
    this.ctx.localAvatar.setEquippedTool('none');

    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;

    this.ctx.scene.remove(this.worldRoot);
  }
}
