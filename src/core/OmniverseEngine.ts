import * as THREE from 'three';
import {
  WORLD_CATALOG,
  type EngineContext,
  type MinimapMarker,
  type WorldId,
  type WorldInterface
} from './types';
import { ProceduralTextureGenerator } from './graphics/ProceduralTextureGenerator';
import { AtmosphereSky } from './graphics/AtmosphereSky';
import { PostProcessingPipeline } from './graphics/PostProcessingPipeline';
import {
  createGerstnerOceanMaterial,
  createInteriorMappingMaterial,
  updateInteriorMaterial,
  updateOceanMaterial
} from './graphics/Shaders';
import { QualityManager } from './systems/QualityManager';
import { WebAudioEngine } from './systems/WebAudioEngine';
import { InputManager } from './systems/InputManager';
import { PlayerAvatar } from './systems/PlayerAvatar';
import { NetworkManager } from './systems/NetworkManager';
import { UIManager } from '../ui/UIManager';

export class OmniverseEngine implements EngineContext {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly textures: ProceduralTextureGenerator;
  public readonly sky: AtmosphereSky;
  public readonly postFX: PostProcessingPipeline;
  public readonly audio: WebAudioEngine;
  public readonly input: InputManager;
  public readonly network: NetworkManager;
  public readonly quality: QualityManager;
  public readonly localAvatar: PlayerAvatar;
  public readonly ui: UIManager;

  private activeWorld: WorldInterface | null = null;
  private hubDioramaGroup: THREE.Group | null = null;
  private hubOceanMat: THREE.ShaderMaterial | null = null;
  private hubInteriorMat: THREE.ShaderMaterial | null = null;
  private hubRingPlanet: THREE.Group | null = null;

  private clock = new THREE.Clock();
  private elapsed = 0;
  private isSwitchingWorld = false;
  private rafId = 0;
  private telemetryTimer = 0;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    // 1. WebGL2 High-Performance PBR Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
      0.15,
      18000
    );
    this.camera.position.set(0, 42, 115);

    // 2. Core Subsystems
    this.quality = new QualityManager();
    this.textures = new ProceduralTextureGenerator(this.quality.config.textureSize);
    this.sky = new AtmosphereSky(this.scene);
    this.postFX = new PostProcessingPipeline(this.renderer, this.scene, this.camera, this.quality.config);
    this.audio = new WebAudioEngine();
    this.input = new InputManager(canvas, uiRoot);
    this.localAvatar = new PlayerAvatar();
    this.network = new NetworkManager();

    this.ui = new UIManager({
      container: uiRoot,
      onSelectWorld: (worldId) => {
        this.audio.unlock();
        this.audio.playUIClick();
        void this.switchWorld(worldId);
      },
      onReturnHub: () => {
        this.audio.playUIClick();
        this.returnToHub();
      },
      network: this.network,
      quality: this.quality,
      audio: this.audio,
      avatar: this.localAvatar
    });

    // Apply initial sizing & quality
    this.applyQualitySettings();
    this.quality.onChange(() => this.applyQualitySettings());

    // Unlock WebAudio on first user gesture
    const unlockOnce = () => {
      this.audio.unlock();
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });

    window.addEventListener('resize', () => this.onResize());

    // P2P World & Event Synchronization
    this.network.onWorldEvent((ev) => {
      if (ev.type === 'world_travel' && ev.senderId !== this.network.selfPeerId) {
        const targetWorld = (ev.payload.worldId as WorldId) || ev.worldId;
        if (targetWorld && (!this.activeWorld || this.activeWorld.id !== targetWorld)) {
          const meta = WORLD_CATALOG.find((w) => w.id === targetWorld);
          this.ui.notify(
            'Voyage d’Escouade P2P',
            `L’hôte vous emmène vers ${meta ? meta.title : targetWorld}`,
            'info'
          );
          void this.switchWorld(targetWorld, undefined, true);
        }
        return;
      }
      if (this.activeWorld && ev.worldId === this.activeWorld.id) {
        this.activeWorld.onWorldEvent?.(ev);
      }
    });
  }

  public async boot(): Promise<void> {
    this.ui.setLoading(true, 'Synthèse des textures PBR 1024×1024 & compilation des Shaders GLSL…', 20);
    await new Promise((r) => requestAnimationFrame(r));

    // Pre-warm essential hub textures & PBR environment probe
    this.textures.getTextureSet('facade_glass');
    this.textures.getTextureSet('asphalt');
    this.textures.getTextureSet('rock');
    this.textures.getTextureSet('carbon');

    this.ui.setLoading(true, 'Génération de l’atmosphère Rayleigh & Mie + Probe PMREM…', 65);
    await new Promise((r) => requestAnimationFrame(r));

    this.sky.setTimeOfDay(18.35); // Golden twilight showcase
    this.sky.refreshEnvironmentMap(this.renderer);
    this.buildHubShowcaseDiorama();

    // Auto-join P2P room if ?room=XXXX is present in URL
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom && urlRoom.trim().length >= 2) {
      const cleanCode = urlRoom.trim().toUpperCase().slice(0, 8);
      void this.network.joinOrCreateRoom(cleanCode).then(() => {
        this.ui.notify(
          'Salon Multijoueur Connecté',
          `Connecté automatiquement au salon P2P #${cleanCode}`,
          'success'
        );
      });
    }

    this.input.setContextMode('HUB');
    this.audio.setWorldSoundscape('hub');
    this.ui.setLoading(false);
    this.ui.showHub(true);

    this.clock.start();
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.frame();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Builds the live 3D cinematic city + ocean + orbital ringed planet diorama
   * behind the Cyber-Glass Main Hub so the background is alive at 60 FPS.
   */
  private buildHubShowcaseDiorama(): void {
    this.disposeHubDiorama();

    const group = new THREE.Group();
    group.name = 'OmniverseHubDiorama';

    // 1. Photorealistic Gerstner Ocean Plane
    const oceanGeo = new THREE.PlaneGeometry(2400, 2400, 140, 140);
    oceanGeo.rotateX(-Math.PI / 2);
    this.hubOceanMat = createGerstnerOceanMaterial({
      sunDirection: this.sky.sunDirection,
      deepColor: 0x04182b,
      shallowColor: 0x0f5f7a
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, this.hubOceanMat);
    oceanMesh.position.y = 0;
    group.add(oceanMesh);

    // 2. Central Citadel Island Platform
    const islandMat = this.textures.createPBRMaterial('rock', {
      repeatX: 8,
      repeatY: 8,
      roughness: 0.85
    });
    const islandGeo = new THREE.CylinderGeometry(92, 118, 8, 48, 2);
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = 2.5;
    island.receiveShadow = true;
    island.castShadow = true;
    group.add(island);

    const plazaMat = this.textures.createPBRMaterial('asphalt', {
      repeatX: 14,
      repeatY: 14,
      roughness: 0.35,
      metalness: 0.15
    });
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(86, 88, 1.2, 48), plazaMat);
    plaza.position.y = 6.6;
    plaza.receiveShadow = true;
    group.add(plaza);

    // 3. Instanced Cyber-Metropolis Skyscrapers with Interior Mapping Shader
    const facadeTex = this.textures.getTextureSet('facade_glass');
    this.hubInteriorMat = createInteriorMappingMaterial(facadeTex, {
      floors: 14,
      roomsPerFloor: 6,
      nightFactor: 0.82
    });

    const towerCount = 68;
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    const towers = new THREE.InstancedMesh(towerGeo, this.hubInteriorMat, towerCount);
    towers.castShadow = true;
    towers.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < towerCount; i++) {
      const ring = i < 16 ? 18 + (i % 4) * 6 : 36 + ((i * 19) % 44);
      const angle = (i / towerCount) * Math.PI * 2 * 2.3;
      const w = 5.5 + ((i * 7) % 7);
      const d = 5.5 + ((i * 11) % 7);
      const h = i === 0 ? 78 : Math.max(14, 62 - ring * 0.55 + ((i * 13) % 24));
      dummy.position.set(
        i === 0 ? 0 : Math.cos(angle) * ring,
        7.0 + h * 0.5,
        i === 0 ? 0 : Math.sin(angle) * ring
      );
      dummy.rotation.set(0, (i % 4) * (Math.PI * 0.5), 0);
      dummy.scale.set(i === 0 ? 11 : w, h, i === 0 ? 11 : d);
      dummy.updateMatrix();
      towers.setMatrixAt(i, dummy.matrix);
    }
    towers.instanceMatrix.needsUpdate = true;
    group.add(towers);

    // 4. Majestic Ringed Planet Hanging High on the Horizon
    const planetGroup = new THREE.Group();
    planetGroup.position.set(-280, 220, -620);
    const planetMat = this.textures.createPBRMaterial('sand', {
      repeatX: 4,
      repeatY: 2,
      tint: 0x6ec8ff,
      roughness: 0.65,
      metalness: 0.1
    });
    const planetSphere = new THREE.Mesh(new THREE.SphereGeometry(76, 48, 32), planetMat);
    planetGroup.add(planetSphere);

    const ringGeo = new THREE.RingGeometry(98, 152, 64);
    ringGeo.rotateX(Math.PI * 0.42);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffc978,
      emissive: 0x3b260c,
      roughness: 0.45,
      metalness: 0.35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    planetGroup.add(ringMesh);
    planetGroup.rotation.z = 0.28;
    group.add(planetGroup);
    this.hubRingPlanet = planetGroup;

    this.scene.add(group);
    this.hubDioramaGroup = group;
  }

  private disposeHubDiorama(): void {
    if (!this.hubDioramaGroup) return;
    this.scene.remove(this.hubDioramaGroup);
    this.hubDioramaGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          m?.dispose();
        }
      }
    });
    this.hubDioramaGroup = null;
    this.hubOceanMat = null;
    this.hubInteriorMat = null;
    this.hubRingPlanet = null;
  }

  private resetWorldEnvironmentState(): void {
    this.sky.setSpaceBlend(0);
    this.sky.setWeather('clear', 0);
    this.sky.setTimeOfDay(14.5);
    this.postFX.setSpeedFactor(0);
    this.audio.updateVehicleEngine(false, 0, 0, 0);
    this.audio.updateWindRush(0);
    this.audio.updateRainAmbience(0);
    this.audio.updateSpaceThruster(false, 0, false);
    this.ui.setFighterHUDVisible(false);
    this.ui.setWorldToolbarHTML('');
    this.localAvatar.setParagliderVisible(false);
    this.localAvatar.setJetpackFlame(0);
    this.localAvatar.setEquippedTool('none');
    this.localAvatar.root.rotation.set(0, 0, 0);
    this.localAvatar.root.visible = true;
    this.camera.up.set(0, 1, 0);
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
  }

  public async switchWorld(
    worldId: WorldId,
    options?: Record<string, string | number>,
    fromNetwork = false
  ): Promise<void> {
    if (this.isSwitchingWorld) return;
    this.isSwitchingWorld = true;

    const meta = WORLD_CATALOG.find((w) => w.id === worldId);
    this.ui.showHub(false);
    this.ui.setLoading(
      true,
      `Chargement dynamique : ${meta ? meta.title : worldId}…`,
      18
    );
    await new Promise((r) => requestAnimationFrame(r));

    try {
      // 1. Cleanly dispose previous world & hub diorama
      if (this.activeWorld) {
        this.activeWorld.dispose();
        this.activeWorld = null;
      }
      this.disposeHubDiorama();
      this.resetWorldEnvironmentState();
      this.renderer.renderLists.dispose();

      this.ui.setLoading(true, `Initialisation du pipeline PBR & physique (${meta?.title ?? worldId})…`, 52);
      await new Promise((r) => requestAnimationFrame(r));

      // 2. Lazy-load the selected world module (code-split by Vite)
      let nextWorld: WorldInterface;
      switch (worldId) {
        case 'metropolis': {
          const mod = await import('../worlds/metropolis/MetropolisWorld');
          nextWorld = new mod.MetropolisWorld();
          break;
        }
        case 'starfield': {
          const mod = await import('../worlds/starfield/StarfieldWorld');
          nextWorld = new mod.StarfieldWorld();
          break;
        }
        case 'valheim': {
          const mod = await import('../worlds/valheim/ValheimWorld');
          nextWorld = new mod.ValheimWorld();
          break;
        }
        case 'seaOfLegends': {
          const mod = await import('../worlds/seaOfLegends/SeaOfLegendsWorld');
          nextWorld = new mod.SeaOfLegendsWorld();
          break;
        }
        case 'aetheria': {
          const mod = await import('../worlds/aetheria/AetheriaWorld');
          nextWorld = new mod.AetheriaWorld();
          break;
        }
        case 'extremeHorizon': {
          const mod = await import('../worlds/extremeHorizon/ExtremeHorizonWorld');
          nextWorld = new mod.ExtremeHorizonWorld();
          break;
        }
      }

      if (!this.scene.children.includes(this.localAvatar.root)) {
        this.scene.add(this.localAvatar.root);
      }

      this.ui.setLoading(true, `Génération procédurale de l’environnement (${meta?.title ?? worldId})…`, 82);
      await nextWorld.load(this, options);

      this.sky.refreshEnvironmentMap(this.renderer);
      this.audio.setWorldSoundscape(worldId);
      this.activeWorld = nextWorld;

      // Broadcast squad travel if we initiated it in an active P2P lobby
      if (!fromNetwork && this.network.isHost && this.network.getConnectedPeers().length > 0) {
        this.network.broadcastWorldEvent('world_travel', worldId, { worldId });
      }

      this.ui.setLoading(false);
      this.ui.notify(
        meta?.title ?? worldId,
        meta?.subtitle ?? 'Monde ouvert prêt — bon jeu !',
        'success'
      );
    } catch (err) {
      console.error('[OmniverseEngine] Failed to load world:', err);
      this.ui.setLoading(false);
      this.ui.notify(
        'Erreur de chargement',
        err instanceof Error ? err.message : 'Impossible de charger ce monde.',
        'warning'
      );
      this.returnToHub();
    } finally {
      this.isSwitchingWorld = false;
      this.clock.getDelta(); // flush loading spike delta
    }
  }

  public returnToHub(): void {
    if (this.activeWorld) {
      this.activeWorld.dispose();
      this.activeWorld = null;
    }
    if (this.scene.children.includes(this.localAvatar.root)) {
      this.scene.remove(this.localAvatar.root);
    }
    this.resetWorldEnvironmentState();
    this.renderer.renderLists.dispose();

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    this.sky.setTimeOfDay(18.35);
    this.sky.refreshEnvironmentMap(this.renderer);
    this.buildHubShowcaseDiorama();
    this.input.setContextMode('HUB');
    this.audio.setWorldSoundscape('hub');
    this.ui.showHub(true);
  }

  private applyQualitySettings(): void {
    const cfg = this.quality.config;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.renderer.setPixelRatio(cfg.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.postFX.applyQuality(cfg);
    this.postFX.setSize(w, h, cfg.pixelRatio);
  }

  private onResize(): void {
    this.applyQualitySettings();
  }

  private frame(): void {
    const rawDt = Math.min(0.05, Math.max(0.0005, this.clock.getDelta()));
    const fps = this.quality.recordFrame(rawDt);

    this.input.update(rawDt);

    if (this.activeWorld) {
      this.ui.openRadialMenu(this.input.state.radialMenuOpen);
    }
    const radialOpen = Boolean(this.activeWorld && (this.input.state.radialMenuOpen || this.ui.isRadialMenuOpen()));

    // Slow-motion time dilation when radial action wheel is held open in gameplay
    const timeScale = radialOpen ? 0.25 : 1.0;
    const dt = rawDt * timeScale;
    this.elapsed += dt;

    this.renderer.info.reset();

    if (this.activeWorld) {
      this.activeWorld.update(dt, this.elapsed);

      // Sync remote WebRTC P2P squadmates & vehicles
      const peerMarkers = this.network.syncRemoteEntities(
        this.scene,
        this.activeWorld.id,
        rawDt
      );
      const worldMarkers = this.activeWorld.getMinimapMarkers();
      const allMarkers: MinimapMarker[] = [...worldMarkers, ...peerMarkers];
      const gpsRoute = this.activeWorld.getGPSRoute?.();

      this.ui.updateMinimap(
        { x: this.localAvatar.root.position.x, z: this.localAvatar.root.position.z },
        this.input.state.cameraYaw,
        allMarkers,
        gpsRoute
      );
    } else {
      // Cinematic orbital camera glide over the Main Hub Diorama
      const orbitAngle = this.elapsed * 0.085;
      const radius = 118 + Math.sin(this.elapsed * 0.19) * 16;
      const camHeight = 36 + Math.sin(this.elapsed * 0.14) * 10;
      this.camera.position.set(
        Math.cos(orbitAngle) * radius,
        camHeight,
        Math.sin(orbitAngle) * radius
      );
      this.camera.lookAt(0, 22, 0);

      this.sky.update(rawDt, this.camera.position);
      if (this.hubOceanMat) {
        updateOceanMaterial(this.hubOceanMat, this.elapsed, this.sky.sunDirection, this.camera.position);
      }
      if (this.hubInteriorMat) {
        updateInteriorMaterial(
          this.hubInteriorMat,
          this.elapsed,
          this.sky.sunDirection,
          this.camera.position,
          0.84
        );
      }
      if (this.hubRingPlanet) {
        this.hubRingPlanet.rotation.y = this.elapsed * 0.03;
      }
    }

    this.postFX.render(rawDt);

    // Throttle DOM telemetry pill updates to ~10 Hz for zero layout overhead
    this.telemetryTimer += rawDt;
    if (this.telemetryTimer >= 0.1 && !this.activeWorld) {
      this.telemetryTimer = 0;
      this.ui.updateTelemetry({
        fps: Math.round(fps),
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        pingMs: Math.round(this.network.getAveragePing()),
        peerCount: this.network.getConnectedPeers().length,
        qualityPreset: this.quality.config.preset,
        autoScale: this.quality.autoScale,
        worldTitle: 'OMNIVERSE HUB',
        contextMode: 'HUB'
      });
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    if (this.activeWorld) {
      this.activeWorld.dispose();
      this.activeWorld = null;
    }
    this.disposeHubDiorama();
    this.textures.dispose();
    this.renderer.dispose();
  }
}
