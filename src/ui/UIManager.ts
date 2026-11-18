import '../styles/main.css';
import {
  WORLD_CATALOG,
  type ConnectedPeerSummary,
  type ControlContextMode,
  type HUDTelemetry,
  type INetworkManager,
  type IPlayerAvatar,
  type IQualityManager,
  type IUIManager,
  type IWebAudioEngine,
  type MinimapMarker,
  type QualityPreset,
  type RadialWheelItem,
  type WorldId,
  type WorldMetadata
} from '../core/types';
import { Minimap3DRadar } from './Minimap3DRadar';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface UIManagerOptions {
  onSelectWorld: (worldId: WorldId) => void;
  onReturnHub: () => void;
  network: INetworkManager;
  quality: IQualityManager;
  audio: IWebAudioEngine;
  avatar: IPlayerAvatar;
  container?: HTMLElement;
}

const APK_DOWNLOAD_URL = 'https://github.com/axeldelaro/3dgames/releases/latest/download/3dgames.apk';
const BASE_INVITE_URL = 'https://axeldelaro.github.io/3dgames/';

// Strictly Zero Purple / Zero Violet tactical Cyber-Glass avatar palette
const AVATAR_COLOR_SWATCHES: ReadonlyArray<{ hex: string; name: string }> = [
  { hex: '#38e2ff', name: 'Cyan Glaciaire' },
  { hex: '#ffb347', name: 'Ambre Solaire' },
  { hex: '#66f2a5', name: 'Menthe Bio' },
  { hex: '#19d4c6', name: 'Teal Océanique' },
  { hex: '#ffd166', name: 'Or Éthéré' },
  { hex: '#ff6b57', name: 'Corail Supersonique' },
  { hex: '#e6f4ff', name: 'Titane Polaire' }
];

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const CONTEXT_LABELS: Record<ControlContextMode, string> = {
  HUB: 'HUB',
  ON_FOOT: 'À PIED',
  DRIVING: 'CONDUITE',
  FLIGHT_SPACE: 'VOL',
  NAVAL: 'NAVIRE'
};

const PRESET_SHORT_LABELS: Record<QualityPreset, string> = {
  ULTRA: 'ULTRA',
  HIGH: 'ÉLEVÉ',
  MOBILE_PERF: 'MOBILE'
};

const RADIAL_CATEGORY_LABELS: Record<RadialWheelItem['category'], string> = {
  weapon: 'ARME',
  tool: 'OUTIL',
  vehicle: 'VÉHICULE',
  emote: 'ACTION'
};

const GAUGE_ARC_CIRCUMFERENCE = 289; // 240-deg arc for r = 69

export class UIManager implements IUIManager {
  private readonly onSelectWorld: (worldId: WorldId) => void;
  private readonly onReturnHub: () => void;
  private readonly network: INetworkManager;
  private readonly quality: IQualityManager;
  private readonly audio: IWebAudioEngine;
  private readonly avatar: IPlayerAvatar;
  private readonly root: HTMLElement;

  // Core Layer Containers
  private readonly hubEl: HTMLElement;
  private readonly hudEl: HTMLElement;
  private readonly controlsModalEl: HTMLElement;
  private readonly radialWheelEl: HTMLElement;
  private readonly toastStackEl: HTMLElement;
  private readonly loaderEl: HTMLElement;

  // Hub Elements & Popover Drawers
  private readonly pwaBtnEl: HTMLButtonElement;
  private readonly resumeBtnEl: HTMLButtonElement;
  private readonly toggleLobbyBtnEl: HTMLButtonElement;
  private readonly toggleSettingsBtnEl: HTMLButtonElement;
  private readonly lobbyDrawerEl: HTMLElement;
  private readonly settingsDrawerEl: HTMLElement;
  private readonly netStatusPillEl: HTMLElement;
  private readonly playerNameInputEl: HTMLInputElement;
  private readonly colorSwatchesEl: HTMLElement;
  private readonly roomCodeInputEl: HTMLInputElement;
  private readonly leaveRoomBtnEl: HTMLButtonElement;
  private readonly inviteBtnEl: HTMLButtonElement;
  private readonly invitePreviewEl: HTMLElement;
  private readonly squadListEl: HTMLElement;
  private readonly qualityButtons = new Map<QualityPreset, HTMLButtonElement>();
  private readonly autoScaleBtnEl: HTMLButtonElement;
  private readonly masterValEl: HTMLElement;
  private readonly musicValEl: HTMLElement;

  // HUD Elements
  private readonly minimap: Minimap3DRadar;
  private readonly radarCoordsEl: HTMLElement;
  private readonly healthRowEl: HTMLElement;
  private readonly healthFillEl: HTMLElement;
  private readonly staminaRowEl: HTMLElement;
  private readonly staminaFillEl: HTMLElement;
  private readonly creditsRowEl: HTMLElement;
  private readonly creditsValEl: HTMLElement;

  private readonly worldTitleHudEl: HTMLElement;
  private readonly contextTagHudEl: HTMLElement;
  private readonly weatherTagHudEl: HTMLElement;
  private readonly statusHintHudEl: HTMLElement;
  private readonly toolbarToggleBtnEl: HTMLButtonElement;
  private readonly worldToolbarEl: HTMLElement;

  private readonly telFpsEl: HTMLElement;
  private readonly telDrawEl: HTMLElement;
  private readonly telPingEl: HTMLElement;
  private readonly telPresetEl: HTMLElement;
  private readonly hudInviteBtnEl: HTMLButtonElement;
  private readonly hudInviteLabelEl: HTMLElement;

  // Speedometer / Flight / Naval Gauge Elements
  private readonly speedGaugeEl: HTMLElement;
  private readonly gaugeArcFillEl: SVGPathElement;
  private readonly speedValueEl: HTMLElement;
  private readonly speedUnitEl: HTMLElement;
  private readonly gearBadgeEl: HTMLElement;
  private readonly subMetricLeftEl: HTMLElement;
  private readonly subMetricRightEl: HTMLElement;
  private readonly windRoseWrapEl: HTMLElement;
  private readonly windArrowSvgEl: SVGElement;

  // Center Reticle, Fighter HUD & Radial Elements
  private readonly crosshairEl: HTMLElement;
  private readonly fighterHudEl: HTMLElement;
  private readonly fighterPitchGroupEl: SVGGElement;
  private readonly fighterRollGroupEl: SVGGElement;
  private readonly fighterMachTextEl: SVGTextElement;
  private readonly fighterAltTextEl: SVGTextElement;
  private readonly fighterStallEl: HTMLElement;

  private readonly radialContainerEl: HTMLElement;
  private readonly radialSvgEl: SVGSVGElement;
  private readonly radialLabelsLayerEl: HTMLElement;
  private readonly radialCenterCatEl: HTMLElement;
  private readonly radialCenterNameEl: HTMLElement;

  // Loader Elements
  private readonly loaderArcEl: SVGCircleElement;
  private readonly loaderPctEl: HTMLElement;
  private readonly loaderStatusEl: HTMLElement;

  // Internal UI State & Caches
  private hubVisible = true;
  private hasActiveWorld = false;
  private controlsModalOpen = false;
  private toolbarCollapsed = false;
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  private inviteCopiedTimer: number | null = null;
  private lobbyRefreshInterval: number | null = null;

  private radialItems: RadialWheelItem[] = [];
  private onRadialSelect: ((item: RadialWheelItem) => void) | null = null;
  private radialOpen = false;
  private inputRadialHeld = false;
  private manualRadialLatch = false;
  private radialCommitted = false;
  private hoveredRadialIndex = -1;
  private radialSliceEls: SVGPathElement[] = [];
  private radialLabelEls: HTMLElement[] = [];
  private radialVirtualX = 0;
  private radialVirtualY = 0;

  private lastHudCache = {
    fpsText: '',
    fpsWarn: false,
    drawText: '',
    pingText: '',
    presetText: '',
    worldTitle: '',
    contextMode: '' as ControlContextMode | '',
    weather: '',
    hint: '',
    coords: '',
    credits: -1,
    gaugeVisible: false,
    speedVal: '',
    gearVal: '',
    subLeft: '',
    subRight: ''
  };

  constructor(options: UIManagerOptions) {
    this.onSelectWorld = options.onSelectWorld;
    this.onReturnHub = options.onReturnHub;
    this.network = options.network;
    this.quality = options.quality;
    this.audio = options.audio;
    this.avatar = options.avatar;
    this.root = options.container ?? document.getElementById('omniverse-ui') ?? document.body;

    // Build modular UI layers cleanly without clearing sibling elements inside #omniverse-ui
    this.hubEl = this.createHubDOM();
    this.hudEl = this.createHudDOM();
    this.radialWheelEl = this.createRadialWheelDOM();
    this.controlsModalEl = this.createControlsModalDOM();
    this.toastStackEl = this.createToastStackDOM();
    this.loaderEl = this.createLoaderDOM();

    this.root.appendChild(this.hudEl);
    this.root.appendChild(this.radialWheelEl);
    this.root.appendChild(this.hubEl);
    this.root.appendChild(this.controlsModalEl);
    this.root.appendChild(this.toastStackEl);
    this.root.appendChild(this.loaderEl);

    // Query bound Hub elements
    this.pwaBtnEl = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-pwa-install-btn');
    this.resumeBtnEl = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-resume-world-btn');
    this.toggleLobbyBtnEl = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-toggle-lobby-btn');
    this.toggleSettingsBtnEl = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-toggle-settings-btn');
    this.lobbyDrawerEl = this.mustQuery<HTMLElement>(this.hubEl, '#omni-lobby-drawer');
    this.settingsDrawerEl = this.mustQuery<HTMLElement>(this.hubEl, '#omni-settings-drawer');
    this.netStatusPillEl = this.mustQuery<HTMLElement>(this.hubEl, '#omni-net-status-pill');
    this.playerNameInputEl = this.mustQuery<HTMLInputElement>(this.hubEl, '#omni-player-name');
    this.colorSwatchesEl = this.mustQuery<HTMLElement>(this.hubEl, '#omni-color-swatches');
    this.roomCodeInputEl = this.mustQuery<HTMLInputElement>(this.hubEl, '#omni-room-code');
    this.leaveRoomBtnEl = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-leave-room-btn');
    this.inviteBtnEl = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-copy-invite-btn');
    this.invitePreviewEl = this.mustQuery<HTMLElement>(this.hubEl, '#omni-invite-preview');
    this.squadListEl = this.mustQuery<HTMLElement>(this.hubEl, '#omni-squad-list');
    this.autoScaleBtnEl = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-autoscale-btn');
    this.masterValEl = this.mustQuery<HTMLElement>(this.hubEl, '#omni-master-val');
    this.musicValEl = this.mustQuery<HTMLElement>(this.hubEl, '#omni-music-val');

    // Query bound HUD elements
    const radarCanvas = this.mustQuery<HTMLCanvasElement>(this.hudEl, '#omniverse-radar-canvas');
    this.minimap = new Minimap3DRadar(radarCanvas, 180);
    this.radarCoordsEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-radar-coords');
    this.healthRowEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-health-row');
    this.healthFillEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-health-fill');
    this.staminaRowEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-stamina-row');
    this.staminaFillEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-stamina-fill');
    this.creditsRowEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-credits-row');
    this.creditsValEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-credits-val');

    this.worldTitleHudEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-hud-world-title');
    this.contextTagHudEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-hud-context-tag');
    this.weatherTagHudEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-hud-weather-tag');
    this.statusHintHudEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-hud-status-hint');
    this.toolbarToggleBtnEl = this.mustQuery<HTMLButtonElement>(this.hudEl, '#omni-toolbar-toggle-btn');
    this.worldToolbarEl = this.mustQuery<HTMLElement>(this.hudEl, '#omniverse-world-toolbar');

    this.telFpsEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-tel-fps');
    this.telDrawEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-tel-draws');
    this.telPingEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-tel-ping');
    this.telPresetEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-tel-preset');
    this.hudInviteBtnEl = this.mustQuery<HTMLButtonElement>(this.hudEl, '#omni-hud-invite-btn');
    this.hudInviteLabelEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-hud-invite-label');

    // Speedometer Gauge
    this.speedGaugeEl = this.mustQuery<HTMLElement>(this.hudEl, '#omniverse-speed-gauge');
    this.gaugeArcFillEl = this.mustQuery<SVGPathElement>(this.hudEl, '#omni-gauge-arc-fill');
    this.speedValueEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-speed-value');
    this.speedUnitEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-speed-unit');
    this.gearBadgeEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-gear-badge');
    this.subMetricLeftEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-gauge-sub-left');
    this.subMetricRightEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-gauge-sub-right');
    this.windRoseWrapEl = this.mustQuery<HTMLElement>(this.hudEl, '#omni-wind-rose');
    this.windArrowSvgEl = this.mustQuery<SVGElement>(this.hudEl, '#omni-wind-arrow-svg');

    // Center Overlays
    this.crosshairEl = this.mustQuery<HTMLElement>(this.hudEl, '#omniverse-crosshair');
    this.fighterHudEl = this.mustQuery<HTMLElement>(this.hudEl, '#omniverse-fighter-hud');
    this.fighterPitchGroupEl = this.mustQuery<SVGGElement>(
      this.fighterHudEl,
      '#omni-fighter-pitch-group'
    );
    this.fighterRollGroupEl = this.mustQuery<SVGGElement>(
      this.fighterHudEl,
      '#omni-fighter-roll-group'
    );
    this.fighterMachTextEl = this.mustQuery<SVGTextElement>(
      this.fighterHudEl,
      '#omni-fighter-mach'
    );
    this.fighterAltTextEl = this.mustQuery<SVGTextElement>(this.fighterHudEl, '#omni-fighter-alt');
    this.fighterStallEl = this.mustQuery<HTMLElement>(this.fighterHudEl, '#omni-fighter-stall');

    // Radial Wheel
    this.radialContainerEl = this.mustQuery<HTMLElement>(
      this.radialWheelEl,
      '.omni-radial-container'
    );
    this.radialSvgEl = this.mustQuery<SVGSVGElement>(this.radialWheelEl, '.omni-radial-svg');
    this.radialLabelsLayerEl = this.mustQuery<HTMLElement>(
      this.radialWheelEl,
      '#omni-radial-labels'
    );
    this.radialCenterCatEl = this.mustQuery<HTMLElement>(
      this.radialWheelEl,
      '#omni-radial-center-cat'
    );
    this.radialCenterNameEl = this.mustQuery<HTMLElement>(
      this.radialWheelEl,
      '#omni-radial-center-name'
    );

    // Loader
    this.loaderArcEl = this.mustQuery<SVGCircleElement>(this.loaderEl, '#omni-loader-arc');
    this.loaderPctEl = this.mustQuery<HTMLElement>(this.loaderEl, '#omni-loader-pct');
    this.loaderStatusEl = this.mustQuery<HTMLElement>(this.loaderEl, '#omni-loader-status');

    this.initializeSwatchesAndCards();
    this.bindEvents();
    this.syncQualityUI();
    this.refreshLobbyUI();
    this.showHub(true);
  }

  /* ========================================================================
     PUBLIC IUIManager IMPLEMENTATION
     ======================================================================== */

  public showHub(visible: boolean): void {
    this.hubVisible = visible;
    this.hubEl.classList.toggle('is-hidden', !visible);
    this.hudEl.classList.toggle('is-hidden', visible);
    document.body.classList.toggle('omni-hub-open', visible);
    this.resumeBtnEl.classList.toggle('is-hidden', !this.hasActiveWorld);

    if (visible) {
      if (this.radialOpen) {
        this.hoveredRadialIndex = -1;
        this.manualRadialLatch = false;
        this.inputRadialHeld = false;
        this.applyRadialState(false);
      }
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {
          // Ignore pointer lock exit restrictions
        }
      }
      this.refreshLobbyUI();
    } else {
      this.closeAllHubDrawers();
    }
  }

  public isHubVisible(): boolean {
    return this.hubVisible;
  }

  public setLoading(visible: boolean, label?: string, progress?: number): void {
    this.loaderEl.classList.toggle('is-hidden', !visible);
    if (!visible) {
      return;
    }

    this.loaderStatusEl.textContent =
      label ?? 'Compilation des shaders WebGL2 PBR & streaming procédural…';

    const circumference = 264;
    if (typeof progress === 'number' && Number.isFinite(progress)) {
      const normalized = progress >= 0 && progress <= 1 ? progress * 100 : progress;
      const clampedPct = Math.max(0, Math.min(100, Math.round(normalized)));
      const offset = circumference * (1 - clampedPct / 100);
      this.loaderArcEl.style.strokeDashoffset = `${offset.toFixed(1)}`;
      this.loaderPctEl.textContent = `${clampedPct}%`;
    } else {
      this.loaderArcEl.style.strokeDashoffset = '84';
      this.loaderPctEl.textContent = 'PBR';
    }
  }

  public notify(
    title: string,
    message: string,
    tone: 'info' | 'success' | 'warning' = 'info'
  ): void {
    while (this.toastStackEl.children.length >= 2) {
      const first = this.toastStackEl.firstElementChild;
      if (first) {
        first.remove();
      } else {
        break;
      }
    }

    const toast = document.createElement('div');
    toast.className = `omni-toast ${tone === 'success' ? 'is-success' : tone === 'warning' ? 'is-warning' : ''}`;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'omni-toast-icon';
    iconWrap.innerHTML = this.getToastIconSVG(tone);

    const body = document.createElement('div');
    body.className = 'omni-toast-body';

    const titleEl = document.createElement('div');
    titleEl.className = 'omni-toast-title';
    titleEl.textContent = title;

    const msgEl = document.createElement('div');
    msgEl.className = 'omni-toast-msg';
    msgEl.textContent = message;

    body.appendChild(titleEl);
    body.appendChild(msgEl);
    toast.appendChild(iconWrap);
    toast.appendChild(body);
    this.toastStackEl.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => {
        toast.remove();
      }, 220);
    }, 2900);
  }

  public updateTelemetry(telemetry: HUDTelemetry): void {
    // 1. Top-Right Compact Telemetry Pill
    const fpsRounded = Math.max(0, Math.round(telemetry.fps));
    const fpsText = `${fpsRounded} FPS`;
    if (fpsText !== this.lastHudCache.fpsText) {
      this.lastHudCache.fpsText = fpsText;
      this.telFpsEl.textContent = fpsText;
    }
    const fpsWarn = fpsRounded < 42;
    if (fpsWarn !== this.lastHudCache.fpsWarn) {
      this.lastHudCache.fpsWarn = fpsWarn;
      this.telFpsEl.classList.toggle('is-warn', fpsWarn);
    }

    const drawText = `${telemetry.drawCalls} DC`;
    if (drawText !== this.lastHudCache.drawText) {
      this.lastHudCache.drawText = drawText;
      this.telDrawEl.textContent = drawText;
    }

    const pingText =
      telemetry.peerCount > 0
        ? `${Math.round(telemetry.pingMs)}ms•${telemetry.peerCount}P`
        : 'P2P';
    if (pingText !== this.lastHudCache.pingText) {
      this.lastHudCache.pingText = pingText;
      this.telPingEl.textContent = pingText;
    }

    const presetText = PRESET_SHORT_LABELS[telemetry.qualityPreset];
    if (presetText !== this.lastHudCache.presetText) {
      this.lastHudCache.presetText = presetText;
      this.telPresetEl.textContent = presetText;
      this.syncQualityUI();
    }

    // 2. Top-Center Active World & Context Status Pill
    if (telemetry.worldTitle !== this.lastHudCache.worldTitle) {
      this.lastHudCache.worldTitle = telemetry.worldTitle;
      const shortTitle = (telemetry.worldTitle || 'OMNIVERSE').split('—')[0].split('&')[0].trim();
      this.worldTitleHudEl.textContent = shortTitle;
    }

    if (telemetry.contextMode !== this.lastHudCache.contextMode) {
      this.lastHudCache.contextMode = telemetry.contextMode;
      this.contextTagHudEl.textContent = CONTEXT_LABELS[telemetry.contextMode];
      const showCrosshair =
        telemetry.contextMode === 'ON_FOOT' ||
        telemetry.contextMode === 'FLIGHT_SPACE' ||
        telemetry.contextMode === 'NAVAL';
      this.crosshairEl.classList.toggle('is-hidden', !showCrosshair);
    }

    const weather = telemetry.weatherLabel ?? '';
    if (weather !== this.lastHudCache.weather) {
      this.lastHudCache.weather = weather;
      this.weatherTagHudEl.textContent = weather ? `• ${weather}` : '';
      this.weatherTagHudEl.classList.toggle('is-hidden', !weather);
    }

    const hint = telemetry.statusHint ?? '';
    if (hint !== this.lastHudCache.hint) {
      this.lastHudCache.hint = hint;
      this.statusHintHudEl.textContent = hint ? `• ${hint}` : '';
      this.statusHintHudEl.classList.toggle('is-hidden', !hint);
    }

    // 3. Top-Left Health, Stamina & Credits
    if (telemetry.healthRatio !== undefined) {
      const hp = Math.max(0, Math.min(1, telemetry.healthRatio));
      this.healthRowEl.classList.remove('is-hidden');
      this.healthFillEl.style.width = `${(hp * 100).toFixed(1)}%`;
      this.healthFillEl.classList.toggle('is-critical', hp < 0.28);
    } else {
      this.healthRowEl.classList.add('is-hidden');
    }

    if (telemetry.staminaRatio !== undefined) {
      const st = Math.max(0, Math.min(1, telemetry.staminaRatio));
      this.staminaRowEl.classList.remove('is-hidden');
      this.staminaFillEl.style.width = `${(st * 100).toFixed(1)}%`;
      this.staminaFillEl.classList.toggle('is-low', st < 0.25);
    } else {
      this.staminaRowEl.classList.add('is-hidden');
    }

    if (telemetry.credits !== undefined) {
      const roundedCredits = Math.round(telemetry.credits);
      if (roundedCredits !== this.lastHudCache.credits) {
        this.lastHudCache.credits = roundedCredits;
        this.creditsValEl.textContent = `$ ${roundedCredits.toLocaleString('fr-FR')}`;
      }
      this.creditsRowEl.classList.remove('is-hidden');
    } else {
      this.creditsRowEl.classList.add('is-hidden');
    }

    // 4. Compact Vectorial Speedometer / Flight / Naval Gauge
    const showGauge =
      telemetry.contextMode === 'DRIVING' ||
      telemetry.contextMode === 'FLIGHT_SPACE' ||
      telemetry.contextMode === 'NAVAL';

    if (showGauge !== this.lastHudCache.gaugeVisible) {
      this.lastHudCache.gaugeVisible = showGauge;
      this.speedGaugeEl.classList.toggle('is-hidden', !showGauge);
    }

    if (showGauge) {
      const speed = Math.max(0, telemetry.speedKmh ?? 0);
      const speedStr = `${Math.round(speed)}`;
      if (speedStr !== this.lastHudCache.speedVal) {
        this.lastHudCache.speedVal = speedStr;
        this.speedValueEl.textContent = speedStr;
      }

      this.speedUnitEl.textContent = telemetry.contextMode === 'NAVAL' ? 'KTS' : 'KM/H';

      const maxScaleSpeed =
        telemetry.contextMode === 'FLIGHT_SPACE'
          ? 2400
          : telemetry.contextMode === 'NAVAL'
            ? 90
            : 280;

      const arcRatio =
        telemetry.rpm !== undefined && telemetry.contextMode === 'DRIVING'
          ? Math.max(0, Math.min(1, telemetry.rpm / 8000))
          : Math.max(0, Math.min(1, speed / maxScaleSpeed));

      const dashOffset = GAUGE_ARC_CIRCUMFERENCE * (1 - arcRatio);
      this.gaugeArcFillEl.style.strokeDashoffset = dashOffset.toFixed(1);

      const gear =
        telemetry.gear ??
        (telemetry.contextMode === 'FLIGHT_SPACE'
          ? telemetry.mach !== undefined && telemetry.mach >= 1
            ? 'MACH+'
            : 'THR'
          : telemetry.contextMode === 'NAVAL'
            ? 'VOILES'
            : 'D');
      if (gear !== this.lastHudCache.gearVal) {
        this.lastHudCache.gearVal = gear;
        this.gearBadgeEl.textContent = gear;
      }

      const subLeft =
        telemetry.altitudeM !== undefined
          ? `${Math.round(telemetry.altitudeM)}m`
          : telemetry.rpm !== undefined
            ? `${Math.round(telemetry.rpm)}tr`
            : telemetry.headingDeg !== undefined
              ? `${Math.round(telemetry.headingDeg)}°`
              : 'PBR';
      if (subLeft !== this.lastHudCache.subLeft) {
        this.lastHudCache.subLeft = subLeft;
        this.subMetricLeftEl.textContent = subLeft;
      }

      if (telemetry.windAngleDeg !== undefined) {
        this.windRoseWrapEl.classList.remove('is-hidden');
        this.subMetricRightEl.classList.add('is-hidden');
        this.windArrowSvgEl.style.transform = `rotate(${telemetry.windAngleDeg.toFixed(0)}deg)`;
      } else {
        this.windRoseWrapEl.classList.add('is-hidden');
        this.subMetricRightEl.classList.remove('is-hidden');
        const subRight =
          telemetry.mach !== undefined
            ? `M${telemetry.mach.toFixed(1)}`
            : telemetry.headingDeg !== undefined
              ? `${Math.round(telemetry.headingDeg)}°`
              : '';
        if (subRight !== this.lastHudCache.subRight) {
          this.lastHudCache.subRight = subRight;
          this.subMetricRightEl.textContent = subRight;
        }
      }
    }
  }

  public updateMinimap(
    playerPos: { x: number; z: number },
    playerYaw: number,
    markers: MinimapMarker[],
    gpsRoute?: Array<{ x: number; z: number }>
  ): void {
    this.minimap.render(playerPos, playerYaw, markers, gpsRoute);

    const compassDeg = ((Math.round((-playerYaw * 180) / Math.PI) % 360) + 360) % 360;
    const coordsText = `${String(compassDeg).padStart(3, '0')}° • ${Math.round(playerPos.x)},${Math.round(playerPos.z)}`;
    if (coordsText !== this.lastHudCache.coords) {
      this.lastHudCache.coords = coordsText;
      this.radarCoordsEl.textContent = coordsText;
    }
  }

  public setWorldToolbarHTML(html: string, bindEvents?: (container: HTMLElement) => void): void {
    const trimmed = html.trim();
    this.worldToolbarEl.innerHTML = trimmed;
    const isEmpty = trimmed.length === 0;
    this.worldToolbarEl.classList.toggle('is-empty', isEmpty);
    this.toolbarToggleBtnEl.classList.toggle('is-hidden', isEmpty);
    this.worldToolbarEl.classList.toggle('is-collapsed', !isEmpty && this.toolbarCollapsed);
    if (!isEmpty && bindEvents) {
      bindEvents(this.worldToolbarEl);
    }
  }

  public setRadialItems(items: RadialWheelItem[], onSelect: (item: RadialWheelItem) => void): void {
    this.radialItems = items.slice();
    this.onRadialSelect = onSelect;
    this.hoveredRadialIndex = -1;
    this.rebuildRadialSlices();
  }

  public openRadialMenu(open: boolean): void {
    this.inputRadialHeld = open;
    this.applyRadialState(this.inputRadialHeld || this.manualRadialLatch);
  }

  private applyRadialState(open: boolean): void {
    if (open === this.radialOpen) {
      return;
    }

    if (open) {
      if (this.hubVisible || this.radialItems.length === 0) {
        return;
      }
      this.radialOpen = true;
      this.radialCommitted = false;
      this.radialVirtualX = 0;
      this.radialVirtualY = 0;
      this.setHoveredRadialSlice(-1);
      this.radialWheelEl.classList.remove('is-hidden');
      this.audio.playUIClick();
    } else {
      const selectedIdx = this.hoveredRadialIndex;
      const shouldCommit =
        !this.radialCommitted && selectedIdx >= 0 && selectedIdx < this.radialItems.length;
      this.radialOpen = false;
      this.manualRadialLatch = false;
      this.hoveredRadialIndex = -1;
      this.radialWheelEl.classList.add('is-hidden');
      window.dispatchEvent(new CustomEvent('omniverse:close-radial'));

      if (shouldCommit) {
        this.radialCommitted = true;
        const chosen = this.radialItems[selectedIdx];
        this.audio.playUIClick();
        this.onRadialSelect?.(chosen);
      }
    }
  }

  public isRadialMenuOpen(): boolean {
    return this.radialOpen;
  }

  public setFighterHUDVisible(
    visible: boolean,
    pitchDeg = 0,
    rollDeg = 0,
    mach = 0,
    alt = 0,
    stall = false
  ): void {
    this.fighterHudEl.classList.toggle('is-hidden', !visible);
    if (!visible) {
      return;
    }

    const clampedPitchPx = Math.max(-110, Math.min(110, pitchDeg * 3.1));
    this.fighterPitchGroupEl.setAttribute(
      'transform',
      `rotate(${(-rollDeg).toFixed(1)} 200 160) translate(0 ${clampedPitchPx.toFixed(1)})`
    );
    this.fighterRollGroupEl.setAttribute('transform', `rotate(${(-rollDeg).toFixed(1)} 200 160)`);
    this.fighterMachTextEl.textContent = `MACH ${mach.toFixed(2)}`;
    this.fighterAltTextEl.textContent = `ALT ${Math.round(alt)} M`;
    this.fighterStallEl.classList.toggle('is-hidden', !stall);
  }

  /* ========================================================================
     DOM CONSTRUCTION (COMPACT HUB, HUD, RADIAL, MODAL, LOADER)
     ======================================================================== */

  private createHubDOM(): HTMLElement {
    const hub = document.createElement('section');
    hub.id = 'omniverse-hub';
    hub.setAttribute('aria-label', '3D GAMES : OMNIVERSE AAA Hub Principal');

    hub.innerHTML = `
      <header class="omni-hub-header">
        <div class="omni-brand-cluster">
          <div class="omni-brand-emblem" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <polygon points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5" stroke="#38e2ff" stroke-width="2" fill="rgba(56,226,255,0.12)"/>
              <circle cx="16" cy="16" r="4" fill="#ffb347"/>
            </svg>
          </div>
          <div class="omni-brand-title-row">
            <h1 class="omni-brand-title">3D GAMES : <span>OMNIVERSE</span></h1>
            <span class="omni-engine-badge"><span class="omni-pulse-dot"></span>PBR • P2P</span>
          </div>
        </div>

        <div class="omni-header-actions">
          <button type="button" id="omni-resume-world-btn" class="omni-resume-btn is-hidden">
            ▶ Reprendre
          </button>
          <button type="button" id="omni-toggle-lobby-btn" class="omni-hdr-btn" title="Salon Multijoueur WebRTC P2P">
            🌐 <span>Salon</span>
            <span id="omni-net-status-pill" class="omni-net-status-pill">SOLO</span>
          </button>
          <button type="button" id="omni-toggle-settings-btn" class="omni-hdr-btn" title="Qualité Graphique PBR & Audio">
            ⚙ <span class="omni-btn-label-long">Options</span>
          </button>
          <button type="button" id="omni-open-controls-btn" class="omni-hdr-btn" title="Aide & Commandes">
            🎮 <span class="omni-btn-label-long">Aide</span>
          </button>
          <button type="button" id="omni-pwa-install-btn" class="omni-pwa-btn is-hidden">
            ⚡ App
          </button>
          <a
            class="omni-apk-btn"
            href="${APK_DOWNLOAD_URL}"
            target="_blank"
            rel="noopener"
            title="Télécharger l'APK Android natif (3dgames.apk)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>
            </svg>
            <span>APK</span>
          </a>
        </div>
      </header>

      <!-- Slide-Over Popover 1: Serverless WebRTC P2P Lobby -->
      <aside id="omni-lobby-drawer" class="omni-hub-drawer is-hidden" aria-label="Salon Multijoueur WebRTC P2P">
        <div class="omni-panel-header">
          <div class="omni-panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
              <line x1="10.5" y1="7.5" x2="6.5" y2="16.5"/><line x1="13.5" y1="7.5" x2="17.5" y2="16.5"/>
            </svg>
            <span>SALON MULTIJOUEUR P2P</span>
          </div>
          <button type="button" id="omni-close-lobby-btn" class="omni-drawer-close-btn" aria-label="Fermer">✕</button>
        </div>

        <div class="omni-field-group">
          <label class="omni-field-label" for="omni-player-name">Pseudo Joueur</label>
          <input
            id="omni-player-name"
            class="omni-input"
            type="text"
            maxlength="18"
            placeholder="Pilote-Alpha"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="omni-field-group">
          <span class="omni-field-label">Couleur Avatar</span>
          <div id="omni-color-swatches" class="omni-color-swatches" role="radiogroup" aria-label="Couleur Avatar"></div>
        </div>

        <div class="omni-field-group">
          <label class="omni-field-label" for="omni-room-code">Code Salon (4 caract.)</label>
          <div class="omni-room-row">
            <input
              id="omni-room-code"
              class="omni-room-code-input"
              type="text"
              maxlength="4"
              placeholder="ABCD"
              autocomplete="off"
              spellcheck="false"
            />
            <div class="omni-room-actions">
              <button type="button" id="omni-create-room-btn" class="omni-btn is-amber">Créer</button>
              <button type="button" id="omni-join-room-btn" class="omni-btn">Joindre</button>
              <button type="button" id="omni-leave-room-btn" class="omni-btn is-danger is-hidden" title="Quitter">✕</button>
            </div>
          </div>
        </div>

        <button type="button" id="omni-copy-invite-btn" class="omni-invite-btn">
          <span>🔗 Copier lien d'invitation</span>
        </button>
        <div id="omni-invite-preview" class="omni-invite-url-preview">${BASE_INVITE_URL}?room=----</div>

        <div class="omni-squad-section">
          <span class="omni-field-label">Escouade Connectée</span>
          <div id="omni-squad-list" class="omni-squad-list"></div>
        </div>
      </aside>

      <!-- Slide-Over Popover 2: PBR Graphics & Audio Settings -->
      <aside id="omni-settings-drawer" class="omni-hub-drawer is-hidden" aria-label="Options Graphiques et Audio">
        <div class="omni-panel-header">
          <div class="omni-panel-title">
            <span>⚙ QUALITÉ PBR & AUDIO</span>
          </div>
          <button type="button" id="omni-close-settings-btn" class="omni-drawer-close-btn" aria-label="Fermer">✕</button>
        </div>

        <div class="omni-field-group">
          <span class="omni-field-label">Préréglage Rendu PBR</span>
          <div class="omni-segmented" role="group" aria-label="Qualité Graphique">
            <button type="button" class="omni-seg-btn" data-preset="ULTRA">Ultra</button>
            <button type="button" class="omni-seg-btn" data-preset="HIGH">Élevé</button>
            <button type="button" class="omni-seg-btn" data-preset="MOBILE_PERF">Mobile</button>
          </div>
        </div>

        <button type="button" id="omni-autoscale-btn" class="omni-toggle-btn">
          <span>Auto-Scale 60 FPS</span>
          <span class="omni-toggle-track"><span class="omni-toggle-thumb"></span></span>
        </button>

        <div class="omni-field-group">
          <span class="omni-field-label">Volume Principal</span>
          <div class="omni-slider-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <input id="omni-master-vol" class="omni-range" type="range" min="0" max="100" value="80" />
            <span id="omni-master-val" class="omni-slider-val">80%</span>
          </div>
        </div>

        <div class="omni-field-group">
          <span class="omni-field-label">Musique Adaptative</span>
          <div class="omni-slider-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            <input id="omni-music-vol" class="omni-range" type="range" min="0" max="100" value="55" />
            <span id="omni-music-val" class="omni-slider-val">55%</span>
          </div>
        </div>
      </aside>

      <!-- Centered 6 Open-World Cards -->
      <main class="omni-hub-main">
        <div id="omni-worlds-grid" class="omni-worlds-grid" aria-label="Catalogue des 6 Mondes Ouverts"></div>
      </main>
    `;

    return hub;
  }

  private createHudDOM(): HTMLElement {
    const hud = document.createElement('section');
    hud.id = 'omniverse-hud';
    hud.className = 'is-hidden';
    hud.setAttribute('aria-label', 'Interface tête haute en jeu');

    hud.innerHTML = `
      <!-- Top-Left: Side-by-Side Compact Radar + Vitals -->
      <div class="omni-hud-topleft">
        <div class="omni-radar-shell">
          <div class="omni-radar-bezel">
            <canvas id="omniverse-radar-canvas"></canvas>
          </div>
        </div>

        <div class="omni-topleft-side">
          <div id="omni-radar-coords" class="omni-radar-coords">000° • 0,0</div>
          <div class="omni-vitals-stack">
            <div id="omni-health-row" class="omni-vital-bar-row is-hidden">
              <span class="omni-vital-label">PV</span>
              <div class="omni-vital-track">
                <div id="omni-health-fill" class="omni-vital-fill is-health"></div>
              </div>
            </div>
            <div id="omni-stamina-row" class="omni-vital-bar-row is-hidden">
              <span class="omni-vital-label">END</span>
              <div class="omni-vital-track">
                <div id="omni-stamina-fill" class="omni-vital-fill is-stamina"></div>
              </div>
            </div>
            <div id="omni-credits-row" class="omni-credits-row is-hidden">
              <span id="omni-credits-val">$ 0</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top-Center: Compact Status Pill + Collapsible Single-Row World Toolbar -->
      <div class="omni-hud-topcenter">
        <div class="omni-world-status-pill">
          <span id="omni-hud-world-title">OMNIVERSE</span>
          <span id="omni-hud-context-tag" class="omni-context-tag">À PIED</span>
          <span id="omni-hud-weather-tag" class="omni-weather-tag is-hidden"></span>
          <span id="omni-hud-status-hint" class="omni-status-hint is-hidden"></span>
          <button type="button" id="omni-toolbar-toggle-btn" class="omni-toolbar-toggle-btn is-hidden" title="Afficher / Masquer les outils du monde">
            ▴
          </button>
        </div>
        <div id="omniverse-world-toolbar" class="is-empty"></div>
      </div>

      <!-- Top-Right: Single-Row Compact Telemetry & Actions -->
      <div class="omni-hud-topright">
        <div class="omni-telemetry-pill">
          <span id="omni-tel-fps" class="omni-tel-fps">60 FPS</span>
          <span class="omni-tel-sep omni-tel-extra">•</span>
          <span id="omni-tel-draws" class="omni-tel-extra">0 DC</span>
          <span class="omni-tel-sep omni-tel-ping-wrap">•</span>
          <span id="omni-tel-ping" class="omni-tel-ping-wrap">P2P</span>
          <span class="omni-tel-sep omni-tel-extra">•</span>
          <span id="omni-tel-preset" class="omni-tel-extra">ULTRA</span>
        </div>

        <div class="omni-topright-row">
          <button type="button" id="omni-hud-radial-btn" class="omni-hud-action-btn" title="Roue d'équipement (Tab)">
            ☸
          </button>
          <button type="button" id="omni-hud-invite-btn" class="omni-hud-action-btn is-amber" title="Copier le lien d'invitation P2P">
            🔗 <span id="omni-hud-invite-label" class="omni-btn-label-long">P2P</span>
          </button>
          <button type="button" id="omni-hud-hub-btn" class="omni-hud-action-btn" title="Retour au Hub des 6 Mondes">
            ⌂ <span>HUB</span>
          </button>
        </div>
      </div>

      <!-- Compact Vectorial Speedometer (Bottom-Right on PC, Bottom-Center on Mobile) -->
      <div id="omniverse-speed-gauge" class="is-hidden">
        <div class="omni-gauge-svg-wrap">
          <svg class="omni-gauge-svg" viewBox="0 0 160 120">
            <defs>
              <linearGradient id="omniGaugeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#38e2ff"/>
                <stop offset="68%" stop-color="#66f2a5"/>
                <stop offset="100%" stop-color="#ffb347"/>
              </linearGradient>
            </defs>
            <path
              d="M 20.2 112.5 A 69 69 0 1 1 139.8 112.5"
              fill="none"
              stroke="rgba(56, 226, 255, 0.16)"
              stroke-width="9"
              stroke-linecap="round"
            />
            <path
              id="omni-gauge-arc-fill"
              d="M 20.2 112.5 A 69 69 0 1 1 139.8 112.5"
              fill="none"
              stroke="url(#omniGaugeGrad)"
              stroke-width="9"
              stroke-linecap="round"
              stroke-dasharray="${GAUGE_ARC_CIRCUMFERENCE}"
              stroke-dashoffset="${GAUGE_ARC_CIRCUMFERENCE}"
            />
          </svg>
          <div class="omni-gauge-center-readout">
            <span id="omni-speed-value" class="omni-speed-value">0</span>
            <span id="omni-speed-unit" class="omni-speed-unit">KM/H</span>
            <span id="omni-gear-badge" class="omni-gear-badge">D</span>
          </div>
        </div>

        <div class="omni-gauge-submetrics">
          <span id="omni-gauge-sub-left">0tr</span>
          <span id="omni-gauge-sub-right"></span>
          <span id="omni-wind-rose" class="omni-wind-rose is-hidden">
            <span>VENT</span>
            <svg id="omni-wind-arrow-svg" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" stroke="rgba(25,212,198,0.45)" stroke-width="1.2"/>
              <path d="M10 3 L13.5 14 L10 11.5 L6.5 14 Z" fill="#19d4c6"/>
            </svg>
          </span>
        </div>
      </div>

      <!-- Center Precision Crosshair -->
      <div id="omniverse-crosshair" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="1.8" fill="#eef6ff"/>
          <path d="M12 4v3.5M12 16.5V20M4 12h3.5M16.5 12H20" stroke="rgba(56,226,255,0.8)" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- Center Holographic Fighter Jet Pitch-Ladder HUD -->
      <div id="omniverse-fighter-hud" class="is-hidden" aria-hidden="true">
        <svg viewBox="0 0 400 320" fill="none">
          <defs>
            <clipPath id="omniFighterLadderClip">
              <rect x="78" y="38" width="244" height="244" rx="14"/>
            </clipPath>
          </defs>
          <path d="M 130 56 A 92 92 0 0 1 270 56" stroke="rgba(56,226,255,0.55)" stroke-width="1.4"/>
          <g id="omni-fighter-roll-group">
            <polygon points="200,40 195,50 205,50" fill="#ffb347"/>
          </g>
          <g clip-path="url(#omniFighterLadderClip)">
            <g id="omni-fighter-pitch-group">
              <path d="M145 98h32v6 M255 98h-32v6" stroke="#38e2ff" stroke-width="1.5"/>
              <text x="136" y="102" fill="#38e2ff" font-family="Rajdhani, sans-serif" font-size="10" font-weight="700" text-anchor="end">+20</text>
              <path d="M152 129h26v5 M248 129h-26v5" stroke="#38e2ff" stroke-width="1.5"/>
              <text x="144" y="133" fill="#38e2ff" font-family="Rajdhani, sans-serif" font-size="10" font-weight="700" text-anchor="end">+10</text>
              <line x1="108" y1="160" x2="176" y2="160" stroke="#66f2a5" stroke-width="2"/>
              <line x1="224" y1="160" x2="292" y2="160" stroke="#66f2a5" stroke-width="2"/>
              <path d="M152 191h26v-5 M248 191h-26v-5" stroke="#ffb347" stroke-width="1.5" stroke-dasharray="5 3"/>
              <text x="144" y="195" fill="#ffb347" font-family="Rajdhani, sans-serif" font-size="10" font-weight="700" text-anchor="end">-10</text>
              <path d="M145 222h32v-6 M255 222h-32v-6" stroke="#ffb347" stroke-width="1.5" stroke-dasharray="5 3"/>
              <text x="136" y="226" fill="#ffb347" font-family="Rajdhani, sans-serif" font-size="10" font-weight="700" text-anchor="end">-20</text>
            </g>
          </g>
          <path d="M182 160h10l4 6 4-6 4 6 4-6h10" stroke="#eef6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="8" y="144" width="76" height="30" rx="5" fill="rgba(5,12,22,0.72)" stroke="rgba(56,226,255,0.55)" stroke-width="1.3"/>
          <text id="omni-fighter-mach" x="46" y="163" fill="#7ceeff" font-family="Orbitron, sans-serif" font-size="10.5" font-weight="800" text-anchor="middle">MACH 0.00</text>
          <rect x="316" y="144" width="76" height="30" rx="5" fill="rgba(5,12,22,0.72)" stroke="rgba(56,226,255,0.55)" stroke-width="1.3"/>
          <text id="omni-fighter-alt" x="354" y="163" fill="#7ceeff" font-family="Orbitron, sans-serif" font-size="10.5" font-weight="800" text-anchor="middle">ALT 0 M</text>
        </svg>
        <div id="omni-fighter-stall" class="omni-fighter-stall is-hidden">⚠ DÉCROCHAGE</div>
      </div>
    `;

    return hud;
  }

  private createRadialWheelDOM(): HTMLElement {
    const radial = document.createElement('div');
    radial.id = 'omniverse-radial-wheel';
    radial.className = 'is-hidden';
    radial.setAttribute('aria-label', 'Roue radiale de sélection rapide');

    radial.innerHTML = `
      <div class="omni-radial-container">
        <svg class="omni-radial-svg" viewBox="-170 -170 340 340"></svg>
        <div id="omni-radial-labels"></div>
        <div class="omni-radial-center">
          <span id="omni-radial-center-cat" class="omni-radial-center-cat">ROUE</span>
          <span id="omni-radial-center-name" class="omni-radial-center-name">Choisir</span>
        </div>
      </div>
    `;

    return radial;
  }

  private createControlsModalDOM(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'omniverse-controls-modal';
    modal.className = 'is-hidden';

    modal.innerHTML = `
      <div class="omni-modal-card" role="dialog" aria-modal="true" aria-labelledby="omni-controls-modal-title">
        <div class="omni-modal-header">
          <h3 id="omni-controls-modal-title" class="omni-modal-title">COMMANDES UNIVERSELLES — OMNIVERSE AAA</h3>
          <button type="button" id="omni-close-controls-btn" class="omni-btn">✕ Fermer</button>
        </div>

        <div class="omni-controls-columns">
          <div class="omni-controls-col">
            <h4>CLAVIER & SOURIS (PC)</h4>
            <div class="omni-bind-row"><span>Déplacement / Vol</span><span class="omni-kbd">ZQSD / WASD</span></div>
            <div class="omni-bind-row"><span>Caméra / Visée</span><span class="omni-kbd">Souris</span></div>
            <div class="omni-bind-row"><span>Sprint / Boost</span><span class="omni-kbd">Shift</span></div>
            <div class="omni-bind-row"><span>Saut / Paravoile</span><span class="omni-kbd">Espace</span></div>
            <div class="omni-bind-row"><span>Véhicule / Interagir</span><span class="omni-kbd">E / F</span></div>
            <div class="omni-bind-row"><span>Action / Tir</span><span class="omni-kbd">Clic G</span></div>
            <div class="omni-bind-row"><span>Viser / Frein</span><span class="omni-kbd">Clic D</span></div>
            <div class="omni-bind-row"><span>Roue Radiale</span><span class="omni-kbd">Tab</span></div>
            <div class="omni-bind-row"><span>Retour Hub</span><span class="omni-kbd">Échap</span></div>
          </div>

          <div class="omni-controls-col">
            <h4>MANETTE (XBOX / PS5)</h4>
            <div class="omni-bind-row"><span>Mouvement</span><span class="omni-kbd">Stick G</span></div>
            <div class="omni-bind-row"><span>Caméra 360°</span><span class="omni-kbd">Stick D</span></div>
            <div class="omni-bind-row"><span>Gaz / Tir</span><span class="omni-kbd">RT / R2</span></div>
            <div class="omni-bind-row"><span>Frein / Viser</span><span class="omni-kbd">LT / L2</span></div>
            <div class="omni-bind-row"><span>Saut / Planeur</span><span class="omni-kbd">A / Croix</span></div>
            <div class="omni-bind-row"><span>Interagir</span><span class="omni-kbd">X / Carré</span></div>
            <div class="omni-bind-row"><span>Roue Radiale</span><span class="omni-kbd">LB / L1</span></div>
          </div>

          <div class="omni-controls-col">
            <h4>TACTILE (ANDROID / APK)</h4>
            <div class="omni-bind-row"><span>Déplacement 360°</span><span class="omni-kbd">Stick Gauche</span></div>
            <div class="omni-bind-row"><span>Caméra Libre</span><span class="omni-kbd">Glisser Droite</span></div>
            <div class="omni-bind-row"><span>Actions Contextuelles</span><span class="omni-kbd">Boutons SVG</span></div>
            <div class="omni-bind-row"><span>Roue d'Équipement</span><span class="omni-kbd">☸ Haut-Droite</span></div>
            <div class="omni-bind-row"><span>Replier Outils Monde</span><span class="omni-kbd">▴ Haut-Centre</span></div>
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  private createToastStackDOM(): HTMLElement {
    const stack = document.createElement('div');
    stack.id = 'omniverse-toast-stack';
    stack.setAttribute('aria-live', 'polite');
    return stack;
  }

  private createLoaderDOM(): HTMLElement {
    const loader = document.createElement('div');
    loader.id = 'omniverse-loader';
    loader.className = 'is-hidden';

    loader.innerHTML = `
      <div class="omni-loader-orbital">
        <svg viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" stroke="rgba(56,226,255,0.16)" stroke-width="4"/>
          <circle
            id="omni-loader-arc"
            cx="50"
            cy="50"
            r="42"
            stroke="#38e2ff"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="264"
            stroke-dashoffset="84"
            transform="rotate(-90 50 50)"
          />
          <g class="omni-loader-spin-outer">
            <circle cx="50" cy="8" r="3" fill="#ffb347"/>
          </g>
          <g class="omni-loader-spin-inner">
            <circle cx="50" cy="50" r="29" stroke="rgba(255,179,71,0.35)" stroke-width="1.5" stroke-dasharray="18 14"/>
          </g>
        </svg>
        <span id="omni-loader-pct" class="omni-loader-pct">PBR</span>
      </div>
      <div class="omni-loader-title">3D GAMES : OMNIVERSE AAA</div>
      <div id="omni-loader-status" class="omni-loader-status">Initialisation du moteur WebGL2 PBR…</div>
    `;

    return loader;
  }

  /* ========================================================================
     WORLD CARDS, AVATAR SWATCHES & EVENT BINDING
     ======================================================================== */

  private initializeSwatchesAndCards(): void {
    const initialColor = this.network.playerColor || AVATAR_COLOR_SWATCHES[0].hex;
    this.colorSwatchesEl.innerHTML = '';

    for (let i = 0; i < AVATAR_COLOR_SWATCHES.length; i++) {
      const swatch = AVATAR_COLOR_SWATCHES[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `omni-color-swatch ${swatch.hex.toLowerCase() === initialColor.toLowerCase() ? 'is-active' : ''}`;
      btn.style.setProperty('--swatch-color', swatch.hex);
      btn.title = swatch.name;
      btn.setAttribute('aria-label', swatch.name);

      btn.addEventListener('click', () => {
        this.audio.unlock();
        this.audio.playUIClick();
        this.network.playerColor = swatch.hex;
        this.avatar.setAccentColor(swatch.hex);

        const all = this.colorSwatchesEl.querySelectorAll('.omni-color-swatch');
        all.forEach((el) => el.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.refreshLobbyUI();
      });

      this.colorSwatchesEl.appendChild(btn);
    }

    const grid = this.mustQuery<HTMLElement>(this.hubEl, '#omni-worlds-grid');
    grid.innerHTML = '';

    for (let i = 0; i < WORLD_CATALOG.length; i++) {
      const world = WORLD_CATALOG[i];
      const card = this.buildWorldCard(world);
      grid.appendChild(card);
    }

    const segBtns = this.hubEl.querySelectorAll<HTMLButtonElement>('.omni-seg-btn[data-preset]');
    segBtns.forEach((btn) => {
      const preset = btn.dataset.preset as QualityPreset | undefined;
      if (preset) {
        this.qualityButtons.set(preset, btn);
      }
    });
  }

  private buildWorldCard(world: WorldMetadata): HTMLElement {
    const card = document.createElement('article');
    card.className = 'omni-world-card';
    card.style.setProperty('--world-accent', world.accentColor);

    const featuresHTML = world.features
      .slice(0, 3)
      .map((feat) => `<span class="omni-feature-chip">${this.escapeHTML(feat)}</span>`)
      .join('');

    card.innerHTML = `
      <div class="omni-world-card-head">
        <div class="omni-world-emblem" aria-hidden="true">
          ${this.getWorldEmblemSVG(world.id)}
        </div>
        <div class="omni-world-headings">
          <h2 class="omni-world-title">${this.escapeHTML(world.title)}</h2>
          <div class="omni-world-subtitle">${this.escapeHTML(world.subtitle)}</div>
        </div>
        <span class="omni-world-play-pill">JOUER →</span>
      </div>
      <p class="omni-world-desc">${this.escapeHTML(world.description)}</p>
      <div class="omni-world-features">${featuresHTML}</div>
    `;

    card.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUIClick();
      this.hasActiveWorld = true;
      this.showHub(false);
      this.onSelectWorld(world.id);
    });
    return card;
  }

  private toggleHubDrawer(which: 'lobby' | 'settings'): void {
    const isLobbyOpen = !this.lobbyDrawerEl.classList.contains('is-hidden');
    const isSettingsOpen = !this.settingsDrawerEl.classList.contains('is-hidden');

    if (which === 'lobby') {
      const next = !isLobbyOpen;
      this.lobbyDrawerEl.classList.toggle('is-hidden', !next);
      this.settingsDrawerEl.classList.add('is-hidden');
      this.toggleLobbyBtnEl.classList.toggle('is-active', next);
      this.toggleSettingsBtnEl.classList.remove('is-active');
    } else {
      const next = !isSettingsOpen;
      this.settingsDrawerEl.classList.toggle('is-hidden', !next);
      this.lobbyDrawerEl.classList.add('is-hidden');
      this.toggleSettingsBtnEl.classList.toggle('is-active', next);
      this.toggleLobbyBtnEl.classList.remove('is-active');
    }
  }

  private closeAllHubDrawers(): void {
    this.lobbyDrawerEl.classList.add('is-hidden');
    this.settingsDrawerEl.classList.add('is-hidden');
    this.toggleLobbyBtnEl.classList.remove('is-active');
    this.toggleSettingsBtnEl.classList.remove('is-active');
  }

  private bindEvents(): void {
    // Hub Slide-over Drawers
    this.toggleLobbyBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.audio.unlock();
      this.audio.playUIClick();
      this.toggleHubDrawer('lobby');
    });

    this.toggleSettingsBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.audio.unlock();
      this.audio.playUIClick();
      this.toggleHubDrawer('settings');
    });

    this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-close-lobby-btn').addEventListener('click', () => {
      this.audio.playUIClick();
      this.closeAllHubDrawers();
    });

    this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-close-settings-btn').addEventListener('click', () => {
      this.audio.playUIClick();
      this.closeAllHubDrawers();
    });

    this.lobbyDrawerEl.addEventListener('click', (e) => e.stopPropagation());
    this.settingsDrawerEl.addEventListener('click', (e) => e.stopPropagation());
    this.hubEl.addEventListener('click', () => {
      this.closeAllHubDrawers();
    });

    // HUD World Toolbar Collapse Toggle
    this.toolbarToggleBtnEl.addEventListener('click', () => {
      this.audio.playUIClick();
      this.toolbarCollapsed = !this.toolbarCollapsed;
      this.worldToolbarEl.classList.toggle('is-collapsed', this.toolbarCollapsed);
      this.toolbarToggleBtnEl.textContent = this.toolbarCollapsed ? '▾' : '▴';
    });

    // Player Name Input
    this.playerNameInputEl.value = this.network.playerName || 'Explorateur';
    this.playerNameInputEl.addEventListener('input', () => {
      const clean = this.playerNameInputEl.value.trim().slice(0, 18);
      if (clean.length > 0) {
        this.network.playerName = clean;
        this.renderSquadList(this.network.getConnectedPeers());
      }
    });

    // Room Code Input
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = this.sanitizeRoomCode(urlParams.get('room') ?? '');
    const initialCode =
      this.sanitizeRoomCode(this.network.roomCode) || urlRoom || this.generateRandomRoomCode();
    this.roomCodeInputEl.value = initialCode;

    this.roomCodeInputEl.addEventListener('input', () => {
      const code = this.sanitizeRoomCode(this.roomCodeInputEl.value);
      this.roomCodeInputEl.value = code;
      this.updateInvitePreviewText(code);
    });

    this.roomCodeInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void this.handleJoinRoom(this.roomCodeInputEl.value);
      }
    });

    // Create / Join / Leave Room
    const createBtn = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-create-room-btn');
    createBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUIClick();
      const randomCode = this.generateRandomRoomCode();
      this.roomCodeInputEl.value = randomCode;
      void this.handleJoinRoom(randomCode);
    });

    const joinBtn = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-join-room-btn');
    joinBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUIClick();
      const targetCode =
        this.sanitizeRoomCode(this.roomCodeInputEl.value) || this.generateRandomRoomCode();
      this.roomCodeInputEl.value = targetCode;
      void this.handleJoinRoom(targetCode);
    });

    this.leaveRoomBtnEl.addEventListener('click', () => {
      this.audio.playUIClick();
      void this.network.leaveRoom().then(() => {
        this.notify('Salon quitté', 'Mode Solo local activé.', 'info');
        this.refreshLobbyUI();
      });
    });

    // Direct Invite Copy
    this.inviteBtnEl.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUIClick();
      void this.copyDirectInviteLink();
    });

    this.hudInviteBtnEl.addEventListener('click', () => {
      this.audio.playUIClick();
      void this.copyDirectInviteLink();
    });

    this.network.onPeersChanged(() => {
      this.refreshLobbyUI();
    });

    this.lobbyRefreshInterval = window.setInterval(() => {
      if (this.hubVisible) {
        this.refreshLobbyUI();
      }
    }, 1800);

    // Quality Preset Selector & Auto-Scale
    this.qualityButtons.forEach((btn, preset) => {
      btn.addEventListener('click', () => {
        this.audio.unlock();
        this.audio.playUIClick();
        this.quality.setPreset(preset);
        this.syncQualityUI();
      });
    });

    this.autoScaleBtnEl.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUIClick();
      this.quality.autoScale = !this.quality.autoScale;
      this.syncQualityUI();
    });

    this.quality.onChange(() => {
      this.syncQualityUI();
    });

    // Audio Volume Sliders
    const masterSlider = this.mustQuery<HTMLInputElement>(this.hubEl, '#omni-master-vol');
    const musicSlider = this.mustQuery<HTMLInputElement>(this.hubEl, '#omni-music-vol');

    masterSlider.addEventListener('input', () => {
      const pct = Number(masterSlider.value);
      this.masterValEl.textContent = `${pct}%`;
      this.audio.unlock();
      this.audio.setMasterVolume(pct / 100);
    });

    musicSlider.addEventListener('input', () => {
      const pct = Number(musicSlider.value);
      this.musicValEl.textContent = `${pct}%`;
      this.audio.unlock();
      this.audio.setMusicVolume(pct / 100);
    });

    // Controls Cheat-Sheet Modal
    const openControlsBtn = this.mustQuery<HTMLButtonElement>(this.hubEl, '#omni-open-controls-btn');
    const closeControlsBtn = this.mustQuery<HTMLButtonElement>(
      this.controlsModalEl,
      '#omni-close-controls-btn'
    );

    openControlsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.audio.playUIClick();
      this.closeAllHubDrawers();
      this.setControlsModalOpen(true);
    });

    closeControlsBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      this.setControlsModalOpen(false);
    });

    this.controlsModalEl.addEventListener('click', (e) => {
      if (e.target === this.controlsModalEl) {
        this.setControlsModalOpen(false);
      }
    });

    // Resume World & HUD Hub Trigger
    this.resumeBtnEl.addEventListener('click', () => {
      this.audio.playUIClick();
      this.showHub(false);
    });

    const hudHubBtn = this.mustQuery<HTMLButtonElement>(this.hudEl, '#omni-hud-hub-btn');
    hudHubBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      this.onReturnHub();
      this.showHub(true);
    });

    // HUD Touch-Friendly Radial Trigger (latches cleanly across frames)
    const hudRadialBtn = this.mustQuery<HTMLButtonElement>(this.hudEl, '#omni-hud-radial-btn');
    hudRadialBtn.addEventListener('click', () => {
      this.manualRadialLatch = !this.radialOpen;
      this.applyRadialState(this.manualRadialLatch);
    });

    // PWA beforeinstallprompt Handler
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredInstallPrompt = event as BeforeInstallPromptEvent;
      this.pwaBtnEl.classList.remove('is-hidden');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      this.pwaBtnEl.classList.add('is-hidden');
      this.notify('Application installée', 'Omniverse AAA prêt sur votre appareil.', 'success');
    });

    this.pwaBtnEl.addEventListener('click', () => {
      this.audio.playUIClick();
      if (!this.deferredInstallPrompt) {
        return;
      }
      const promptEvent = this.deferredInstallPrompt;
      void promptEvent
        .prompt()
        .then(() => promptEvent.userChoice)
        .then((choice) => {
          if (choice.outcome === 'accepted') {
            this.pwaBtnEl.classList.add('is-hidden');
            this.deferredInstallPrompt = null;
          }
        });
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (this.isTypingInInput(e.target)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.code === 'Escape') {
        if (this.controlsModalOpen) {
          e.preventDefault();
          this.setControlsModalOpen(false);
          return;
        }
        if (
          !this.lobbyDrawerEl.classList.contains('is-hidden') ||
          !this.settingsDrawerEl.classList.contains('is-hidden')
        ) {
          e.preventDefault();
          this.closeAllHubDrawers();
          return;
        }
        if (this.radialOpen) {
          e.preventDefault();
          this.hoveredRadialIndex = -1;
          this.manualRadialLatch = false;
          this.applyRadialState(false);
          return;
        }
        if (!this.hubVisible) {
          e.preventDefault();
          this.audio.playUIClick();
          this.onReturnHub();
          this.showHub(true);
        } else if (this.hasActiveWorld) {
          e.preventDefault();
          this.audio.playUIClick();
          this.showHub(false);
        }
        return;
      }

      if (e.code === 'Tab' && !this.hubVisible) {
        e.preventDefault();
        if (!e.repeat) {
          this.inputRadialHeld = true;
          this.applyRadialState(true);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Tab' && this.radialOpen) {
        e.preventDefault();
        this.inputRadialHeld = false;
        this.manualRadialLatch = false;
        this.applyRadialState(false);
      }
    });

    // Radial Wheel Mouse & Touch Slice Selection
    window.addEventListener('mousemove', (e) => {
      if (!this.radialOpen) {
        return;
      }
      if (document.pointerLockElement) {
        this.radialVirtualX = Math.max(-110, Math.min(110, this.radialVirtualX + e.movementX));
        this.radialVirtualY = Math.max(-110, Math.min(110, this.radialVirtualY + e.movementY));
        this.updateRadialSelectionFromOffset(this.radialVirtualX, this.radialVirtualY);
      } else {
        const rect = this.radialContainerEl.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width * 0.5);
        const dy = e.clientY - (rect.top + rect.height * 0.5);
        this.updateRadialSelectionFromOffset(dx, dy);
      }
    });

    this.radialWheelEl.addEventListener('mousedown', (e) => {
      if (!this.radialOpen) {
        return;
      }
      if (this.hoveredRadialIndex >= 0 && this.hoveredRadialIndex < this.radialItems.length) {
        const item = this.radialItems[this.hoveredRadialIndex];
        this.radialCommitted = true;
        this.audio.playUIClick();
        this.onRadialSelect?.(item);
        this.manualRadialLatch = false;
        this.applyRadialState(false);
      } else if (e.target === this.radialWheelEl) {
        this.manualRadialLatch = false;
        this.applyRadialState(false);
      }
    });

    this.radialWheelEl.addEventListener(
      'touchstart',
      (e) => {
        if (!this.radialOpen || e.touches.length === 0) {
          return;
        }
        const touch = e.touches[0];
        const rect = this.radialContainerEl.getBoundingClientRect();
        const dx = touch.clientX - (rect.left + rect.width * 0.5);
        const dy = touch.clientY - (rect.top + rect.height * 0.5);
        this.updateRadialSelectionFromOffset(dx, dy);
      },
      { passive: true }
    );

    this.radialWheelEl.addEventListener(
      'touchmove',
      (e) => {
        if (!this.radialOpen || e.touches.length === 0) {
          return;
        }
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.radialContainerEl.getBoundingClientRect();
        const dx = touch.clientX - (rect.left + rect.width * 0.5);
        const dy = touch.clientY - (rect.top + rect.height * 0.5);
        this.updateRadialSelectionFromOffset(dx, dy);
      },
      { passive: false }
    );

    this.radialWheelEl.addEventListener('touchend', (e) => {
      if (!this.radialOpen) {
        return;
      }
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const rect = this.radialContainerEl.getBoundingClientRect();
        const dx = touch.clientX - (rect.left + rect.width * 0.5);
        const dy = touch.clientY - (rect.top + rect.height * 0.5);
        this.updateRadialSelectionFromOffset(dx, dy);
      }
      this.manualRadialLatch = false;
      this.inputRadialHeld = false;
      this.applyRadialState(false);
    });
  }

  /* ========================================================================
     WEBRTC P2P LOBBY & INVITE CLIPBOARD LOGIC
     ======================================================================== */

  private async handleJoinRoom(rawCode: string): Promise<void> {
    const code = this.sanitizeRoomCode(rawCode);
    if (code.length < 2) {
      this.notify('Code Salon invalide', 'Entrez 4 caractères (ex: ABCD).', 'warning');
      return;
    }

    this.netStatusPillEl.textContent = '…';
    try {
      await this.network.joinOrCreateRoom(code);
      this.roomCodeInputEl.value = this.network.roomCode || code;
      this.refreshLobbyUI();
      this.notify(
        `Salon P2P #${this.network.roomCode || code}`,
        'Synchronisation WebRTC active.',
        'success'
      );
    } catch {
      this.notify('Connexion P2P', 'Mode local maintenu.', 'warning');
      this.refreshLobbyUI();
    }
  }

  private async copyDirectInviteLink(): Promise<void> {
    let activeCode = this.sanitizeRoomCode(this.network.roomCode);
    if (!activeCode) {
      activeCode =
        this.sanitizeRoomCode(this.roomCodeInputEl.value) || this.generateRandomRoomCode();
      this.roomCodeInputEl.value = activeCode;
      try {
        await this.network.joinOrCreateRoom(activeCode);
      } catch {
        // Proceed with copying link
      }
      this.refreshLobbyUI();
    }

    const netInvite = this.network.getInviteUrl();
    const inviteUrl =
      netInvite && netInvite.includes('?room=')
        ? netInvite
        : `${BASE_INVITE_URL}?room=${encodeURIComponent(activeCode)}`;

    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      const tempArea = document.createElement('textarea');
      tempArea.value = inviteUrl;
      tempArea.style.position = 'fixed';
      tempArea.style.opacity = '0';
      document.body.appendChild(tempArea);
      tempArea.select();
      try {
        document.execCommand('copy');
        copied = true;
      } catch {
        copied = false;
      }
      tempArea.remove();
    }

    if (copied) {
      this.inviteBtnEl.classList.add('is-copied');
      this.inviteBtnEl.innerHTML = '<span>✓ Lien copié !</span>';
      this.hudInviteLabelEl.textContent = 'COPIÉ';
      this.notify('Invitation copiée !', inviteUrl, 'success');

      if (this.inviteCopiedTimer !== null) {
        window.clearTimeout(this.inviteCopiedTimer);
      }
      this.inviteCopiedTimer = window.setTimeout(() => {
        this.inviteBtnEl.classList.remove('is-copied');
        this.inviteBtnEl.innerHTML = "<span>🔗 Copier lien d'invitation</span>";
        this.hudInviteLabelEl.textContent = this.network.roomCode
          ? `#${this.network.roomCode}`
          : 'P2P';
      }, 2000);
    }
  }

  private refreshLobbyUI(): void {
    const activeRoom = this.sanitizeRoomCode(this.network.roomCode);
    const peers = this.network.getConnectedPeers();

    if (activeRoom) {
      this.roomCodeInputEl.value = activeRoom;
      this.netStatusPillEl.textContent = `#${activeRoom}`;
      this.netStatusPillEl.classList.add('is-online');
      this.leaveRoomBtnEl.classList.remove('is-hidden');
      this.hudInviteLabelEl.textContent = `#${activeRoom}`;
      this.updateInvitePreviewText(activeRoom);
    } else {
      this.netStatusPillEl.textContent = 'SOLO';
      this.netStatusPillEl.classList.remove('is-online');
      this.leaveRoomBtnEl.classList.add('is-hidden');
      this.hudInviteLabelEl.textContent = 'P2P';
      this.updateInvitePreviewText(this.sanitizeRoomCode(this.roomCodeInputEl.value) || '----');
    }

    this.renderSquadList(peers);
  }

  private updateInvitePreviewText(code: string): void {
    const clean = code || '----';
    this.invitePreviewEl.textContent = `${BASE_INVITE_URL}?room=${clean}`;
  }

  private renderSquadList(peers: ConnectedPeerSummary[]): void {
    this.squadListEl.innerHTML = '';

    const selfRow = document.createElement('div');
    selfRow.className = 'omni-peer-row';
    const selfColor = this.network.playerColor || '#38e2ff';
    const selfRole = this.network.roomCode ? (this.network.isHost ? 'HÔTE' : 'VOUS') : 'LOCAL';
    selfRow.innerHTML = `
      <div class="omni-peer-ident">
        <span class="omni-peer-dot" style="color:${this.escapeHTML(selfColor)};background:${this.escapeHTML(selfColor)}"></span>
        <span class="omni-peer-name">${this.escapeHTML(this.network.playerName || 'Vous')}</span>
        <span class="omni-peer-badge">${selfRole}</span>
      </div>
      <div class="omni-peer-meta">
        <span class="omni-peer-ping">0 ms</span>
      </div>
    `;
    this.squadListEl.appendChild(selfRow);

    for (let i = 0; i < peers.length; i++) {
      const peer = peers[i];
      if (peer.peerId === this.network.selfPeerId) {
        continue;
      }
      const ping = Math.max(1, Math.round(peer.pingMs));
      const pingClass = ping >= 120 ? 'is-high' : ping >= 60 ? 'is-mid' : '';
      const row = document.createElement('div');
      row.className = 'omni-peer-row';
      row.innerHTML = `
        <div class="omni-peer-ident">
          <span class="omni-peer-dot" style="color:${this.escapeHTML(peer.color)};background:${this.escapeHTML(peer.color)}"></span>
          <span class="omni-peer-name">${this.escapeHTML(peer.name)}</span>
          ${peer.isHost ? '<span class="omni-peer-badge">HÔTE</span>' : ''}
        </div>
        <div class="omni-peer-meta">
          <span class="omni-peer-world">${this.escapeHTML(peer.worldId)}</span>
          <span class="omni-peer-ping ${pingClass}">${ping} ms</span>
        </div>
      `;
      this.squadListEl.appendChild(row);
    }
  }

  private syncQualityUI(): void {
    const activePreset = this.quality.config.preset;
    this.qualityButtons.forEach((btn, preset) => {
      btn.classList.toggle('is-active', preset === activePreset);
    });
    this.autoScaleBtnEl.classList.toggle('is-active', this.quality.autoScale);
  }

  private setControlsModalOpen(open: boolean): void {
    this.controlsModalOpen = open;
    this.controlsModalEl.classList.toggle('is-hidden', !open);
  }

  /* ========================================================================
     RADIAL WHEEL SVG GENERATION & ANGLE SELECTION
     ======================================================================== */

  private rebuildRadialSlices(): void {
    this.radialSvgEl.innerHTML = '';
    this.radialLabelsLayerEl.innerHTML = '';
    this.radialSliceEls = [];
    this.radialLabelEls = [];

    const count = this.radialItems.length;
    if (count === 0) {
      this.radialCenterCatEl.textContent = 'VIDE';
      this.radialCenterNameEl.textContent = 'Aucun item';
      return;
    }

    const innerR = 62;
    const outerR = 156;
    const labelR = 109;
    const stepRad = (Math.PI * 2) / count;
    const gapRad = count > 1 ? 0.024 : 0;

    for (let i = 0; i < count; i++) {
      const item = this.radialItems[i];
      const centerAngle = -Math.PI * 0.5 + i * stepRad;
      const startAngle = centerAngle - stepRad * 0.5 + gapRad * 0.5;
      const endAngle = centerAngle + stepRad * 0.5 - gapRad * 0.5;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'omni-radial-slice');
      path.setAttribute(
        'd',
        this.describeAnnularSector(innerR, outerR, startAngle, endAngle, count === 1)
      );
      this.radialSvgEl.appendChild(path);
      this.radialSliceEls.push(path);

      const labelEl = document.createElement('div');
      labelEl.className = 'omni-radial-item-label';
      const lx = 170 + Math.cos(centerAngle) * labelR;
      const ly = 170 + Math.sin(centerAngle) * labelR;
      labelEl.style.left = `${((lx / 340) * 100).toFixed(2)}%`;
      labelEl.style.top = `${((ly / 340) * 100).toFixed(2)}%`;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'omni-radial-item-icon';
      iconWrap.innerHTML = this.resolveRadialIconHTML(item.icon, item.category);

      const textEl = document.createElement('div');
      textEl.className = 'omni-radial-item-text';
      textEl.textContent = item.label;

      labelEl.appendChild(iconWrap);
      labelEl.appendChild(textEl);
      this.radialLabelsLayerEl.appendChild(labelEl);
      this.radialLabelEls.push(labelEl);
    }
  }

  private describeAnnularSector(
    innerR: number,
    outerR: number,
    startRad: number,
    endRad: number,
    fullCircle: boolean
  ): string {
    if (fullCircle) {
      return [
        `M 0 ${-outerR}`,
        `A ${outerR} ${outerR} 0 1 1 0 ${outerR}`,
        `A ${outerR} ${outerR} 0 1 1 0 ${-outerR}`,
        `M 0 ${-innerR}`,
        `A ${innerR} ${innerR} 0 1 0 0 ${innerR}`,
        `A ${innerR} ${innerR} 0 1 0 0 ${-innerR}`,
        'Z'
      ].join(' ');
    }

    const x0 = Math.cos(startRad) * outerR;
    const y0 = Math.sin(startRad) * outerR;
    const x1 = Math.cos(endRad) * outerR;
    const y1 = Math.sin(endRad) * outerR;
    const x2 = Math.cos(endRad) * innerR;
    const y2 = Math.sin(endRad) * innerR;
    const x3 = Math.cos(startRad) * innerR;
    const y3 = Math.sin(startRad) * innerR;
    const largeArc = endRad - startRad > Math.PI ? 1 : 0;

    return [
      `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  private updateRadialSelectionFromOffset(dx: number, dy: number): void {
    const count = this.radialItems.length;
    if (count === 0) {
      return;
    }

    const dist = Math.hypot(dx, dy);
    if (dist < 18) {
      this.setHoveredRadialSlice(-1);
      return;
    }

    const stepRad = (Math.PI * 2) / count;
    let relAngle = Math.atan2(dy, dx) + Math.PI * 0.5 + stepRad * 0.5;
    while (relAngle < 0) {
      relAngle += Math.PI * 2;
    }
    relAngle %= Math.PI * 2;

    const index = Math.min(count - 1, Math.floor(relAngle / stepRad));
    this.setHoveredRadialSlice(index);
  }

  private setHoveredRadialSlice(index: number): void {
    if (index === this.hoveredRadialIndex && index !== -1) {
      return;
    }
    this.hoveredRadialIndex = index;

    for (let i = 0; i < this.radialSliceEls.length; i++) {
      const active = i === index;
      this.radialSliceEls[i].classList.toggle('is-hovered', active);
      this.radialLabelEls[i]?.classList.toggle('is-hovered', active);
    }

    if (index >= 0 && index < this.radialItems.length) {
      const item = this.radialItems[index];
      this.radialCenterCatEl.textContent = RADIAL_CATEGORY_LABELS[item.category];
      this.radialCenterNameEl.textContent = item.label;
    } else {
      this.radialCenterCatEl.textContent = 'ROUE';
      this.radialCenterNameEl.textContent = 'Choisir';
    }
  }

  /* ========================================================================
     BESPOKE VECTOR SVG EMBLEMS & UTILITIES
     ======================================================================== */

  private getWorldEmblemSVG(worldId: WorldId): string {
    switch (worldId) {
      case 'metropolis':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="9" width="6" height="12"/><rect x="9" y="4" width="6" height="17"/><rect x="15" y="11" width="6" height="10"/>
        </svg>`;
      case 'starfield':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5.5"/>
          <ellipse cx="12" cy="12" rx="10.5" ry="3.8" transform="rotate(-24 12 12)"/>
        </svg>`;
      case 'valheim':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12,3 5,13 9,13 6,19 18,19 15,13 19,13"/><line x1="12" y1="19" x2="12" y2="22"/>
        </svg>`;
      case 'seaOfLegends':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12"/><path d="M12 4l7 9h-7"/><path d="M12 6l-5 7h5"/>
          <path d="M3 16h18l-2.5 3.5H5.5L3 16z"/>
        </svg>`;
      case 'aetheria':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="14.5,3.5 20.5,3.5 20.5,9.5 10.5,19.5 4.5,13.5"/>
          <line x1="3.5" y1="20.5" x2="8.5" y2="15.5"/>
        </svg>`;
      case 'extremeHorizon':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 3L10 14"/><polygon points="21,3 14,21 10,14 3,10"/>
        </svg>`;
    }
  }

  private getToastIconSVG(tone: 'info' | 'success' | 'warning'): string {
    if (tone === 'success') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.3 2.3 4.8-5"/></svg>`;
    }
    if (tone === 'warning') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,3 22,20 2,20"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17.2" r="0.6" fill="currentColor"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.6" fill="currentColor"/></svg>`;
  }

  private resolveRadialIconHTML(
    icon: string,
    category: RadialWheelItem['category']
  ): string {
    const trimmed = icon.trim();
    if (trimmed.startsWith('<svg')) {
      return trimmed;
    }

    switch (trimmed.toLowerCase()) {
      case 'sword':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4l5.5 5.5-9.5 9.5H5v-5.5L14.5 4z"/><path d="M3 21l4-4"/></svg>`;
      case 'bow':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4c9 2 13 6 15 15"/><line x1="5" y1="4" x2="20" y2="19"/></svg>`;
      case 'laser':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`;
      case 'axe':
      case 'hammer':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4l6 6-4 4-6-6 4-4z"/><line x1="4" y1="20" x2="13" y2="11"/></svg>`;
      case 'magic_fire':
      case 'fire':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c2 4 6 6 6 11a6 6 0 1 1-12 0c0-3 2-5 3-7 0 2 2 3 3-4z"/></svg>`;
      case 'magic_ice':
      case 'ice':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`;
      case 'car':
      case 'moto':
      case 'truck4x4':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 16l2-6h10l2 6"/><rect x="3" y="14" width="18" height="4" rx="1"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>`;
      case 'heli':
      case 'jet':
      case 'starfighter':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="21,3 14,21 10,14 3,10"/></svg>`;
      default:
        if (trimmed.length <= 4) {
          return `<span>${this.escapeHTML(trimmed)}</span>`;
        }
        return category === 'vehicle'
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,3 20,19 12,15 4,19"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 22,12 12,22 2,12"/></svg>`;
    }
  }

  private sanitizeRoomCode(raw: string): string {
    return raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4);
  }

  private generateRandomRoomCode(): string {
    let code = '';
    for (let i = 0; i < 4; i++) {
      const idx = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
      code += ROOM_CODE_ALPHABET[idx];
    }
    return code;
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  private escapeHTML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private mustQuery<T extends Element>(parent: ParentNode, selector: string): T {
    const found = parent.querySelector<T>(selector);
    if (!found) {
      throw new Error(`UIManager: Missing required element "${selector}"`);
    }
    return found;
  }

  public dispose(): void {
    if (this.lobbyRefreshInterval !== null) {
      window.clearInterval(this.lobbyRefreshInterval);
      this.lobbyRefreshInterval = null;
    }
    if (this.inviteCopiedTimer !== null) {
      window.clearTimeout(this.inviteCopiedTimer);
      this.inviteCopiedTimer = null;
    }
  }
}
