import * as THREE from 'three';
import type { ControlContextMode, IInputManager, InputState } from '../types';

interface HapticActuatorLike {
  playEffect?: (
    type: string,
    params: {
      startDelay?: number;
      duration?: number;
      weakMagnitude?: number;
      strongMagnitude?: number;
    }
  ) => Promise<unknown>;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const ALT_AXIS = new THREE.Vector3(1, 0, 0);

const SVG_ICONS = {
  jump: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/><path d="M4 20h16"/></svg>`,
  attack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/></svg>`,
  interact: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
  sprint: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  radial: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>`,
  pedalGas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="3"/><line x1="10" y1="7" x2="14" y2="7"/><line x1="10" y1="12" x2="14" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></svg>`,
  pedalBrake: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="2.5"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="16" y1="10" x2="16" y2="14"/></svg>`,
  drift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18c3-3 3-9 8-12"/><path d="M11 19c3-3 3-9 8-12"/><circle cx="7" cy="19" r="2"/><circle cx="13" cy="19" r="2"/></svg>`,
  horn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  exit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  laser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="2"/></svg>`,
  warp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`,
  switchMode: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  sailMinus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v15"/><path d="M12 4C7 7 5 12 5 16h7"/><line x1="16" y1="12" x2="22" y2="12"/></svg>`,
  sailPlus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v15"/><path d="M10 4C5 7 3 12 3 16h7"/><line x1="15" y1="12" x2="21" y2="12"/><line x1="18" y1="9" x2="18" y2="15"/></svg>`,
  cannon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="17" r="3"/><path d="M4 14 19 6l2 4-11 7"/><circle cx="21" cy="5" r="1.5"/></svg>`,
  anchor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`
} as const;

export class InputManager implements IInputManager {
  public readonly state: InputState = {
    moveX: 0,
    moveZ: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    cameraYaw: 0,
    cameraPitch: -0.22,
    sprint: false,
    jump: false,
    jumpJustPressed: false,
    crouch: false,
    interactJustPressed: false,
    primaryAction: false,
    primaryJustPressed: false,
    secondaryAction: false,
    secondaryJustPressed: false,
    handbrake: false,
    hornJustPressed: false,
    switchModeJustPressed: false,
    cameraToggleJustPressed: false,
    radialMenuOpen: false,
    throttle: 0,
    brake: 0,
    rollAxis: 0,
    usingTouch: false,
    usingGamepad: false,
    pointerLocked: false
  };

  private contextMode: ControlContextMode = 'HUB';
  private readonly canvas: HTMLCanvasElement | null;
  private uiRoot: HTMLElement | null;

  private readonly keysDown = new Set<string>();
  private mouseButtonsDown = 0;
  private lastMouseClientX = 0;
  private lastMouseClientY = 0;
  private isRightDragLooking = false;

  private accumLookDX = 0;
  private accumLookDY = 0;
  private zoomMultiplier = 1.0;

  // Edge-latched inputs between frames
  private pendingJump = false;
  private pendingInteract = false;
  private pendingPrimary = false;
  private pendingSecondary = false;
  private pendingHorn = false;
  private pendingSwitchMode = false;
  private pendingCameraToggle = false;

  // Previous gamepad button states for rising-edge detection
  private prevGpJump = false;
  private prevGpPrimary = false;
  private prevGpSecondary = false;
  private prevGpInteract = false;
  private prevGpHorn = false;
  private prevGpSwitch = false;
  private prevGpCamToggle = false;

  // Touch state & DOM elements
  private touchForced: boolean | null = null;
  private touchLayer: HTMLDivElement | null = null;
  private touchActionCluster: HTMLDivElement | null = null;
  private leftStickZone: HTMLDivElement | null = null;
  private leftStickKnob: HTMLDivElement | null = null;
  private rightStickZone: HTMLDivElement | null = null;
  private rightStickKnob: HTMLDivElement | null = null;
  private throttleFillEl: HTMLDivElement | null = null;
  private throttleThumbEl: HTMLDivElement | null = null;

  private leftTouchId: number | null = null;
  private leftOriginX = 0;
  private leftOriginY = 0;
  private touchMoveX = 0;
  private touchMoveZ = 0;
  private touchAutoSprint = false;

  private rightStickTouchId: number | null = null;
  private rightStickOriginX = 0;
  private rightStickOriginY = 0;
  private rightStickRateX = 0;
  private rightStickRateY = 0;

  private swipeLookTouchId: number | null = null;
  private swipeLastX = 0;
  private swipeLastY = 0;

  private throttleSliderTouchId: number | null = null;
  private touchFlightThrottle = 0;
  private touchGasPedal = 0;
  private touchBrakePedal = 0;
  private touchRollMinus = false;
  private touchRollPlus = false;
  private touchJumpHeld = false;
  private touchPrimaryHeld = false;
  private touchSprintHeld = false;
  private touchCrouchHeld = false;
  private touchHandbrakeHeld = false;
  private touchRadialToggled = false;

  // Reusable Raycaster & vectors for obstacle-free camera positioning
  private readonly raycaster = new THREE.Raycaster();
  private readonly tmpOffset = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly safeCameraOut = new THREE.Vector3();
  private smoothedSafeRatio = 1.0;

  constructor(canvas?: HTMLCanvasElement | null, uiRoot?: HTMLElement | null) {
    this.canvas =
      canvas ??
      (typeof document !== 'undefined'
        ? (document.getElementById('omniverse-canvas') as HTMLCanvasElement | null)
        : null);
    this.uiRoot =
      uiRoot ??
      (typeof document !== 'undefined' ? document.getElementById('omniverse-ui') : null);

    if (typeof window !== 'undefined') {
      const coarsePointer =
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
        (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

      if (coarsePointer) {
        this.state.usingTouch = true;
      }

      this.bindKeyboardAndMouse();
      this.createTouchOverlay();
      this.refreshTouchOverlayVisibility();
    }
  }

  public setContextMode(mode: ControlContextMode): void {
    const changed = this.contextMode !== mode;
    this.contextMode = mode;

    if (mode === 'HUB') {
      this.touchRadialToggled = false;
      this.touchFlightThrottle = 0;
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {
          // Ignore pointer lock exit restrictions
        }
      }
    }

    if (changed) {
      this.resetTransientTouchButtons();
      this.rebuildContextualTouchButtons();
    }
    this.refreshTouchOverlayVisibility();
  }

  public getContextMode(): ControlContextMode {
    return this.contextMode;
  }

  public setTouchOverlayForced(forced: boolean | null): void {
    this.touchForced = forced;
    if (forced === true) {
      this.state.usingTouch = true;
    }
    this.refreshTouchOverlayVisibility();
  }

  private isTypingInFormField(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  private bindKeyboardAndMouse(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'F9') {
        e.preventDefault();
        this.setTouchOverlayForced(this.touchForced === true ? false : true);
        return;
      }

      if (this.isTypingInFormField(e.target)) {
        return;
      }

      if (e.code === 'Tab' && this.contextMode !== 'HUB') {
        e.preventDefault();
      }

      const isRepeat = e.repeat;
      this.keysDown.add(e.code);

      if (!isRepeat) {
        if (e.code === 'Space') {
          this.pendingJump = true;
        }
        if (e.code === 'KeyE' || e.code === 'KeyF') {
          this.pendingInteract = true;
        }
        if (e.code === 'KeyH') {
          this.pendingHorn = true;
        }
        if (e.code === 'KeyV') {
          this.pendingSwitchMode = true;
        }
        if (e.code === 'KeyR' || (e.code === 'KeyC' && this.contextMode === 'DRIVING')) {
          this.pendingCameraToggle = true;
        }
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.mouseButtonsDown = 0;
      this.isRightDragLooking = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.state.pointerLocked = Boolean(
        this.canvas && document.pointerLockElement === this.canvas
      );
    });

    const targetEl = this.canvas ?? window;

    targetEl.addEventListener('mousedown', (e: Event) => {
      const me = e as MouseEvent;
      if (this.contextMode === 'HUB') {
        return;
      }

      if (
        this.canvas &&
        me.target === this.canvas &&
        !this.state.usingTouch &&
        document.pointerLockElement !== this.canvas &&
        me.button === 0
      ) {
        try {
          void this.canvas.requestPointerLock();
        } catch {
          // Fallback to drag look if pointer lock is disallowed
        }
      }

      this.mouseButtonsDown = me.buttons;
      this.lastMouseClientX = me.clientX;
      this.lastMouseClientY = me.clientY;

      if (me.button === 0) {
        this.pendingPrimary = true;
      } else if (me.button === 2) {
        this.pendingSecondary = true;
        this.isRightDragLooking = true;
      }
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      this.mouseButtonsDown = e.buttons;
      if (e.button === 2) {
        this.isRightDragLooking = false;
      }
    });

    window.addEventListener('contextmenu', (e: MouseEvent) => {
      if (this.contextMode !== 'HUB' && e.target === this.canvas) {
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.contextMode === 'HUB') {
        return;
      }

      const sensitivity = 0.0022;
      if (this.canvas && document.pointerLockElement === this.canvas) {
        this.accumLookDX += e.movementX * sensitivity;
        this.accumLookDY += e.movementY * sensitivity;
      } else if (this.isRightDragLooking || (this.mouseButtonsDown & 1) !== 0) {
        if (e.target === this.canvas || this.isRightDragLooking) {
          const dx = e.clientX - this.lastMouseClientX;
          const dy = e.clientY - this.lastMouseClientY;
          this.accumLookDX += dx * sensitivity * 1.35;
          this.accumLookDY += dy * sensitivity * 1.35;
        }
      }

      this.lastMouseClientX = e.clientX;
      this.lastMouseClientY = e.clientY;
    });

    window.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        if (this.contextMode === 'HUB' || this.isTypingInFormField(e.target)) {
          return;
        }
        if (e.target === this.canvas || this.state.pointerLocked) {
          this.zoomMultiplier = Math.max(
            0.55,
            Math.min(1.85, this.zoomMultiplier + Math.sign(e.deltaY) * 0.08)
          );
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchstart',
      () => {
        if (!this.state.usingTouch) {
          this.state.usingTouch = true;
          this.refreshTouchOverlayVisibility();
        }
      },
      { passive: true }
    );
  }

  private createTouchOverlay(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!document.getElementById('omniverse-touch-styles')) {
      const style = document.createElement('style');
      style.id = 'omniverse-touch-styles';
      style.textContent = `
        .omni-touch-layer {
          position: fixed;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          font-family: 'Rajdhani', 'Inter', sans-serif;
        }
        .omni-touch-swipe-right {
          position: absolute;
          top: 14%;
          right: 0;
          width: 52%;
          height: 86%;
          pointer-events: auto;
          touch-action: none;
        }
        .omni-stick-zone {
          position: absolute;
          bottom: max(22px, env(safe-area-inset-bottom, 18px));
          width: 136px;
          height: 136px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 28, 48, 0.52) 0%, rgba(7, 13, 25, 0.72) 100%);
          border: 1.5px solid rgba(40, 224, 255, 0.36);
          box-shadow: 0 0 24px rgba(0, 0, 0, 0.45), inset 0 0 16px rgba(40, 224, 255, 0.12);
          pointer-events: auto;
          touch-action: none;
          backdrop-filter: blur(6px);
        }
        .omni-stick-zone.left {
          left: max(22px, env(safe-area-inset-left, 18px));
        }
        .omni-stick-zone.left.sprint-active {
          border-color: rgba(255, 190, 72, 0.9);
          box-shadow: 0 0 26px rgba(255, 179, 71, 0.42);
        }
        .omni-stick-zone.right {
          right: calc(max(22px, env(safe-area-inset-right, 18px)) + 156px);
          width: 102px;
          height: 102px;
          opacity: 0.82;
        }
        .omni-stick-knob {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 52px;
          height: 52px;
          margin-left: -26px;
          margin-top: -26px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(92, 236, 255, 0.92), rgba(18, 128, 178, 0.85));
          border: 1.5px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
          pointer-events: none;
          transition: transform 0.04s linear;
        }
        .omni-stick-zone.right .omni-stick-knob {
          width: 38px;
          height: 38px;
          margin-left: -19px;
          margin-top: -19px;
          background: radial-gradient(circle at 35% 35%, rgba(200, 225, 255, 0.85), rgba(65, 95, 145, 0.82));
        }
        .omni-touch-actions {
          position: absolute;
          right: max(18px, env(safe-area-inset-right, 16px));
          bottom: max(20px, env(safe-area-inset-bottom, 16px));
          width: 210px;
          height: 230px;
          pointer-events: none;
        }
        .omni-touch-btn {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(10, 19, 36, 0.76);
          border: 1.5px solid rgba(82, 224, 255, 0.48);
          color: #eaf6ff;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
          pointer-events: auto;
          touch-action: none;
          backdrop-filter: blur(6px);
          transition: transform 0.08s ease, background 0.08s ease, border-color 0.08s ease;
        }
        .omni-touch-btn svg {
          width: 23px;
          height: 23px;
        }
        .omni-touch-btn span {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          opacity: 0.88;
        }
        .omni-touch-btn.primary {
          width: 72px;
          height: 72px;
          border-color: rgba(40, 224, 255, 0.85);
          background: radial-gradient(circle, rgba(24, 92, 132, 0.82), rgba(10, 22, 42, 0.88));
        }
        .omni-touch-btn.pedal {
          width: 60px;
          height: 108px;
          border-radius: 16px;
        }
        .omni-touch-btn.active {
          transform: scale(0.93);
          background: rgba(40, 224, 255, 0.34);
          border-color: #ffffff;
        }
        .omni-throttle-slider {
          position: absolute;
          right: 152px;
          bottom: 112px;
          width: 42px;
          height: 138px;
          border-radius: 21px;
          background: rgba(9, 17, 32, 0.8);
          border: 1.5px solid rgba(40, 224, 255, 0.45);
          pointer-events: auto;
          touch-action: none;
          overflow: hidden;
        }
        .omni-throttle-fill {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 0%;
          background: linear-gradient(180deg, rgba(40, 224, 255, 0.72), rgba(20, 110, 190, 0.45));
          pointer-events: none;
        }
        .omni-throttle-thumb {
          position: absolute;
          left: 4px;
          right: 4px;
          bottom: 4px;
          height: 18px;
          border-radius: 9px;
          background: #eaf8ff;
          box-shadow: 0 0 10px rgba(40, 224, 255, 0.9);
          pointer-events: none;
        }
        @media (max-width: 640px) {
          .omni-stick-zone {
            width: 116px;
            height: 116px;
          }
          .omni-stick-zone.right {
            width: 86px;
            height: 86px;
            right: calc(max(14px, env(safe-area-inset-right, 12px)) + 138px);
          }
        }
      `;
      document.head.appendChild(style);
    }

    const layer = document.createElement('div');
    layer.className = 'omni-touch-layer';
    layer.style.display = 'none';

    // Full right-half camera look swipe pad
    const rightSwipe = document.createElement('div');
    rightSwipe.className = 'omni-touch-swipe-right';
    this.bindSwipeLookZone(rightSwipe);
    layer.appendChild(rightSwipe);

    // Left 360° movement thumbstick with outer sprint zone
    const leftStick = document.createElement('div');
    leftStick.className = 'omni-stick-zone left';
    const leftKnob = document.createElement('div');
    leftKnob.className = 'omni-stick-knob';
    leftStick.appendChild(leftKnob);
    this.bindLeftThumbstick(leftStick, leftKnob);
    layer.appendChild(leftStick);

    // Right dedicated camera look thumbstick
    const rightStick = document.createElement('div');
    rightStick.className = 'omni-stick-zone right';
    const rightKnob = document.createElement('div');
    rightKnob.className = 'omni-stick-knob';
    rightStick.appendChild(rightKnob);
    this.bindRightThumbstick(rightStick, rightKnob);
    layer.appendChild(rightStick);

    // Contextual SVG button cluster
    const actionCluster = document.createElement('div');
    actionCluster.className = 'omni-touch-actions';
    layer.appendChild(actionCluster);

    this.touchLayer = layer;
    this.leftStickZone = leftStick;
    this.leftStickKnob = leftKnob;
    this.rightStickZone = rightStick;
    this.rightStickKnob = rightKnob;
    this.touchActionCluster = actionCluster;

    if (!this.uiRoot) {
      this.uiRoot = document.getElementById('omniverse-ui');
    }
    const host = this.uiRoot ?? document.body;
    host.prepend(layer);

    this.rebuildContextualTouchButtons();
  }

  private bindLeftThumbstick(zone: HTMLDivElement, knob: HTMLDivElement): void {
    const maxRadius = 52;

    const updateFromTouch = (touch: Touch): void => {
      const dx = touch.clientX - this.leftOriginX;
      const dy = touch.clientY - this.leftOriginY;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(maxRadius, dist);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;

      knob.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0)`;

      const norm = dist / maxRadius;
      if (norm < 0.1) {
        this.touchMoveX = 0;
        this.touchMoveZ = 0;
        this.touchAutoSprint = false;
      } else {
        const mag = Math.min(1, (norm - 0.1) / 0.9);
        this.touchMoveX = Math.cos(angle) * mag;
        this.touchMoveZ = -Math.sin(angle) * mag; // Up on screen (-dy) is +1 forward
        this.touchAutoSprint = norm > 0.84;
      }
      zone.classList.toggle('sprint-active', this.touchAutoSprint);
    };

    zone.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        if (this.leftTouchId !== null) return;
        const t = e.changedTouches[0];
        if (!t) return;
        const rect = zone.getBoundingClientRect();
        this.leftTouchId = t.identifier;
        this.leftOriginX = rect.left + rect.width * 0.5;
        this.leftOriginY = rect.top + rect.height * 0.5;
        updateFromTouch(t);
      },
      { passive: false }
    );

    zone.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.leftTouchId) {
            updateFromTouch(t);
            break;
          }
        }
      },
      { passive: false }
    );

    const release = (e: TouchEvent): void => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.leftTouchId) {
          this.leftTouchId = null;
          this.touchMoveX = 0;
          this.touchMoveZ = 0;
          this.touchAutoSprint = false;
          knob.style.transform = 'translate3d(0, 0, 0)';
          zone.classList.remove('sprint-active');
          break;
        }
      }
    };

    zone.addEventListener('touchend', release, { passive: true });
    zone.addEventListener('touchcancel', release, { passive: true });
  }

  private bindRightThumbstick(zone: HTMLDivElement, knob: HTMLDivElement): void {
    const maxRadius = 38;

    const updateStick = (touch: Touch): void => {
      const dx = touch.clientX - this.rightStickOriginX;
      const dy = touch.clientY - this.rightStickOriginY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(maxRadius, dist);
      const angle = Math.atan2(dy, dx);
      knob.style.transform = `translate3d(${(Math.cos(angle) * clamped).toFixed(1)}px, ${(Math.sin(angle) * clamped).toFixed(1)}px, 0)`;

      const norm = Math.min(1, dist / maxRadius);
      if (norm < 0.12) {
        this.rightStickRateX = 0;
        this.rightStickRateY = 0;
      } else {
        const curved = Math.pow((norm - 0.12) / 0.88, 1.6);
        this.rightStickRateX = Math.cos(angle) * curved;
        this.rightStickRateY = Math.sin(angle) * curved;
      }
    };

    zone.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.rightStickTouchId !== null) return;
        const t = e.changedTouches[0];
        if (!t) return;
        const rect = zone.getBoundingClientRect();
        this.rightStickTouchId = t.identifier;
        this.rightStickOriginX = rect.left + rect.width * 0.5;
        this.rightStickOriginY = rect.top + rect.height * 0.5;
        updateStick(t);
      },
      { passive: false }
    );

    zone.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.rightStickTouchId) {
            updateStick(t);
            break;
          }
        }
      },
      { passive: false }
    );

    const release = (e: TouchEvent): void => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.rightStickTouchId) {
          this.rightStickTouchId = null;
          this.rightStickRateX = 0;
          this.rightStickRateY = 0;
          knob.style.transform = 'translate3d(0, 0, 0)';
          break;
        }
      }
    };

    zone.addEventListener('touchend', release, { passive: true });
    zone.addEventListener('touchcancel', release, { passive: true });
  }

  private bindSwipeLookZone(zone: HTMLDivElement): void {
    zone.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (this.swipeLookTouchId !== null) return;
        const t = e.changedTouches[0];
        if (!t) return;
        this.swipeLookTouchId = t.identifier;
        this.swipeLastX = t.clientX;
        this.swipeLastY = t.clientY;
      },
      { passive: true }
    );

    zone.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.swipeLookTouchId) {
            const dx = t.clientX - this.swipeLastX;
            const dy = t.clientY - this.swipeLastY;
            this.swipeLastX = t.clientX;
            this.swipeLastY = t.clientY;
            this.accumLookDX += dx * 0.0052;
            this.accumLookDY += dy * 0.0052;
            break;
          }
        }
      },
      { passive: true }
    );

    const release = (e: TouchEvent): void => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.swipeLookTouchId) {
          this.swipeLookTouchId = null;
          break;
        }
      }
    };

    zone.addEventListener('touchend', release, { passive: true });
    zone.addEventListener('touchcancel', release, { passive: true });
  }

  private resetTransientTouchButtons(): void {
    this.touchGasPedal = 0;
    this.touchBrakePedal = 0;
    this.touchRollMinus = false;
    this.touchRollPlus = false;
    this.touchJumpHeld = false;
    this.touchPrimaryHeld = false;
    this.touchSprintHeld = false;
    this.touchCrouchHeld = false;
    this.touchHandbrakeHeld = false;
    this.throttleSliderTouchId = null;
  }

  private refreshTouchOverlayVisibility(): void {
    if (!this.touchLayer) {
      return;
    }

    if (this.uiRoot === null && typeof document !== 'undefined') {
      const found = document.getElementById('omniverse-ui');
      if (found && this.touchLayer.parentElement !== found) {
        this.uiRoot = found;
        found.prepend(this.touchLayer);
      }
    }

    const shouldShow =
      this.contextMode !== 'HUB' &&
      (this.touchForced === true || (this.touchForced !== false && this.state.usingTouch));

    this.touchLayer.style.display = shouldShow ? 'block' : 'none';
  }

  private createTouchButton(options: {
    label: string;
    svg: string;
    rightPx: number;
    bottomPx: number;
    extraClass?: string;
    onPress: () => void;
    onMoveRatio?: (verticalRatio01: number) => void;
    onRelease?: () => void;
  }): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `omni-touch-btn ${options.extraClass ?? ''}`.trim();
    btn.style.right = `${options.rightPx}px`;
    btn.style.bottom = `${options.bottomPx}px`;
    btn.innerHTML = `${options.svg}<span>${options.label}</span>`;

    let activeTouchId: number | null = null;

    const computeRatio = (clientY: number): number => {
      const rect = btn.getBoundingClientRect();
      if (rect.height <= 1) return 1;
      // Top of pedal = 1.0 full throttle, bottom = 0.25 gentle feathering
      return Math.max(0.2, Math.min(1, 1 - (clientY - rect.top) / rect.height * 0.78));
    };

    btn.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const t = e.changedTouches[0];
        if (!t) return;
        activeTouchId = t.identifier;
        btn.classList.add('active');
        options.onPress();
        if (options.onMoveRatio) {
          options.onMoveRatio(computeRatio(t.clientY));
        }
      },
      { passive: false }
    );

    if (options.onMoveRatio) {
      const moveCb = options.onMoveRatio;
      btn.addEventListener(
        'touchmove',
        (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === activeTouchId) {
              moveCb(computeRatio(t.clientY));
              break;
            }
          }
        },
        { passive: false }
      );
    }

    const endHandler = (e: TouchEvent): void => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouchId = null;
          btn.classList.remove('active');
          options.onRelease?.();
          break;
        }
      }
    };

    btn.addEventListener('touchend', endHandler, { passive: true });
    btn.addEventListener('touchcancel', endHandler, { passive: true });
    return btn;
  }

  private rebuildContextualTouchButtons(): void {
    const cluster = this.touchActionCluster;
    if (!cluster) {
      return;
    }

    cluster.innerHTML = '';
    this.throttleFillEl = null;
    this.throttleThumbEl = null;

    if (this.contextMode === 'HUB') {
      return;
    }

    if (this.contextMode === 'ON_FOOT') {
      cluster.appendChild(
        this.createTouchButton({
          label: 'Action',
          svg: SVG_ICONS.attack,
          rightPx: 8,
          bottomPx: 8,
          extraClass: 'primary',
          onPress: () => {
            this.touchPrimaryHeld = true;
            this.pendingPrimary = true;
          },
          onRelease: () => {
            this.touchPrimaryHeld = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Saut',
          svg: SVG_ICONS.jump,
          rightPx: 92,
          bottomPx: 14,
          onPress: () => {
            this.touchJumpHeld = true;
            this.pendingJump = true;
          },
          onRelease: () => {
            this.touchJumpHeld = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Roulade',
          svg: SVG_ICONS.sprint,
          rightPx: 88,
          bottomPx: 84,
          onPress: () => {
            this.touchSprintHeld = true;
            this.touchCrouchHeld = true;
          },
          onRelease: () => {
            this.touchSprintHeld = false;
            this.touchCrouchHeld = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Interagir',
          svg: SVG_ICONS.interact,
          rightPx: 14,
          bottomPx: 94,
          onPress: () => {
            this.pendingInteract = true;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Roue',
          svg: SVG_ICONS.radial,
          rightPx: 14,
          bottomPx: 162,
          onPress: () => {
            this.touchRadialToggled = !this.touchRadialToggled;
          }
        })
      );
      return;
    }

    if (this.contextMode === 'DRIVING') {
      cluster.appendChild(
        this.createTouchButton({
          label: 'Gaz',
          svg: SVG_ICONS.pedalGas,
          rightPx: 6,
          bottomPx: 8,
          extraClass: 'pedal primary',
          onPress: () => {
            this.touchGasPedal = 1;
          },
          onMoveRatio: (ratio) => {
            this.touchGasPedal = ratio;
          },
          onRelease: () => {
            this.touchGasPedal = 0;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Frein',
          svg: SVG_ICONS.pedalBrake,
          rightPx: 76,
          bottomPx: 8,
          extraClass: 'pedal',
          onPress: () => {
            this.touchBrakePedal = 1;
          },
          onMoveRatio: (ratio) => {
            this.touchBrakePedal = ratio;
          },
          onRelease: () => {
            this.touchBrakePedal = 0;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Drift',
          svg: SVG_ICONS.drift,
          rightPx: 76,
          bottomPx: 126,
          onPress: () => {
            this.touchHandbrakeHeld = true;
          },
          onRelease: () => {
            this.touchHandbrakeHeld = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Klaxon',
          svg: SVG_ICONS.horn,
          rightPx: 8,
          bottomPx: 126,
          onPress: () => {
            this.pendingHorn = true;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Sortir',
          svg: SVG_ICONS.exit,
          rightPx: 8,
          bottomPx: 192,
          onPress: () => {
            this.pendingInteract = true;
          }
        })
      );
      return;
    }

    if (this.contextMode === 'FLIGHT_SPACE') {
      // Vertical continuous throttle slider
      const slider = document.createElement('div');
      slider.className = 'omni-throttle-slider';
      const fill = document.createElement('div');
      fill.className = 'omni-throttle-fill';
      const thumb = document.createElement('div');
      thumb.className = 'omni-throttle-thumb';
      slider.appendChild(fill);
      slider.appendChild(thumb);
      this.throttleFillEl = fill;
      this.throttleThumbEl = thumb;
      this.updateThrottleSliderUI(this.touchFlightThrottle);

      const updateSliderFromY = (clientY: number): void => {
        const rect = slider.getBoundingClientRect();
        if (rect.height <= 1) return;
        const ratio = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
        this.touchFlightThrottle = ratio;
        this.updateThrottleSliderUI(ratio);
      };

      slider.addEventListener(
        'touchstart',
        (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const t = e.changedTouches[0];
          if (!t) return;
          this.throttleSliderTouchId = t.identifier;
          updateSliderFromY(t.clientY);
        },
        { passive: false }
      );

      slider.addEventListener(
        'touchmove',
        (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === this.throttleSliderTouchId) {
              updateSliderFromY(t.clientY);
              break;
            }
          }
        },
        { passive: false }
      );

      const releaseSlider = (e: TouchEvent): void => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.throttleSliderTouchId) {
            this.throttleSliderTouchId = null;
            break;
          }
        }
      };
      slider.addEventListener('touchend', releaseSlider, { passive: true });
      slider.addEventListener('touchcancel', releaseSlider, { passive: true });
      cluster.appendChild(slider);

      cluster.appendChild(
        this.createTouchButton({
          label: 'Tir',
          svg: SVG_ICONS.laser,
          rightPx: 8,
          bottomPx: 8,
          extraClass: 'primary',
          onPress: () => {
            this.touchPrimaryHeld = true;
            this.pendingPrimary = true;
          },
          onRelease: () => {
            this.touchPrimaryHeld = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Boost',
          svg: SVG_ICONS.warp,
          rightPx: 88,
          bottomPx: 18,
          onPress: () => {
            this.touchSprintHeld = true;
            this.touchJumpHeld = true;
            this.pendingJump = true;
          },
          onRelease: () => {
            this.touchSprintHeld = false;
            this.touchJumpHeld = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Mode',
          svg: SVG_ICONS.switchMode,
          rightPx: 8,
          bottomPx: 92,
          onPress: () => {
            this.pendingSwitchMode = true;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Sortir',
          svg: SVG_ICONS.exit,
          rightPx: 8,
          bottomPx: 160,
          onPress: () => {
            this.pendingInteract = true;
          }
        })
      );
      return;
    }

    if (this.contextMode === 'NAVAL') {
      cluster.appendChild(
        this.createTouchButton({
          label: 'Canons',
          svg: SVG_ICONS.cannon,
          rightPx: 8,
          bottomPx: 8,
          extraClass: 'primary',
          onPress: () => {
            this.touchPrimaryHeld = true;
            this.pendingPrimary = true;
          },
          onRelease: () => {
            this.touchPrimaryHeld = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Voile -',
          svg: SVG_ICONS.sailMinus,
          rightPx: 90,
          bottomPx: 12,
          onPress: () => {
            this.touchRollMinus = true;
          },
          onRelease: () => {
            this.touchRollMinus = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Voile +',
          svg: SVG_ICONS.sailPlus,
          rightPx: 90,
          bottomPx: 80,
          onPress: () => {
            this.touchRollPlus = true;
          },
          onRelease: () => {
            this.touchRollPlus = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Ancre',
          svg: SVG_ICONS.anchor,
          rightPx: 12,
          bottomPx: 92,
          onPress: () => {
            this.touchHandbrakeHeld = true;
            this.touchCrouchHeld = true;
          },
          onRelease: () => {
            this.touchHandbrakeHeld = false;
            this.touchCrouchHeld = false;
          }
        })
      );

      cluster.appendChild(
        this.createTouchButton({
          label: 'Quitter',
          svg: SVG_ICONS.exit,
          rightPx: 12,
          bottomPx: 160,
          onPress: () => {
            this.pendingInteract = true;
          }
        })
      );
    }
  }

  private updateThrottleSliderUI(ratio: number): void {
    if (this.throttleFillEl) {
      this.throttleFillEl.style.height = `${(ratio * 100).toFixed(1)}%`;
    }
    if (this.throttleThumbEl) {
      const bottomPx = 4 + ratio * 112;
      this.throttleThumbEl.style.bottom = `${bottomPx.toFixed(1)}px`;
    }
  }

  private applyRadialDeadzoneAndCubic(rawX: number, rawY: number): { x: number; y: number } {
    const deadzone = 0.14;
    const len = Math.hypot(rawX, rawY);
    if (len <= deadzone) {
      return { x: 0, y: 0 };
    }
    const normalized = Math.min(1, (len - deadzone) / (1 - deadzone));
    // Smooth linear+cubic blend for micro-aim precision + full turn authority
    const curved = 0.32 * normalized + 0.68 * normalized * normalized * normalized;
    const scale = curved / len;
    return { x: rawX * scale, y: rawY * scale };
  }

  public update(dt: number): void {
    const safeDt = Math.max(0.001, Math.min(0.1, dt));

    // 1. Keyboard axes (Simultaneous ZQSD + WASD + Arrow keys)
    const kbForward =
      this.keysDown.has('KeyW') || this.keysDown.has('KeyZ') || this.keysDown.has('ArrowUp') ? 1 : 0;
    const kbBackward =
      this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown') ? 1 : 0;
    const kbLeft =
      this.keysDown.has('KeyA') || this.keysDown.has('KeyQ') || this.keysDown.has('ArrowLeft') ? 1 : 0;
    const kbRight =
      this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight') ? 1 : 0;

    let kbMoveX = kbRight - kbLeft;
    let kbMoveZ = kbForward - kbBackward;
    const kbLen = Math.hypot(kbMoveX, kbMoveZ);
    if (kbLen > 1) {
      kbMoveX /= kbLen;
      kbMoveZ /= kbLen;
    }

    const kbSprint = this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight');
    const kbJump = this.keysDown.has('Space');
    const kbCrouch =
      this.keysDown.has('ControlLeft') ||
      this.keysDown.has('ControlRight') ||
      (this.keysDown.has('KeyC') && this.contextMode !== 'DRIVING');
    const kbHandbrake = this.keysDown.has('Space');
    const kbRadial = this.keysDown.has('Tab');

    // 2. Gamepad polling
    let gpMoveX = 0;
    let gpMoveZ = 0;
    let gpLookDX = 0;
    let gpLookDY = 0;
    let gpR2 = 0;
    let gpL2 = 0;
    let gpJump = false;
    let gpCrouchOrBrake = false;
    let gpPrimary = false;
    let gpInteract = false;
    let gpLB = false;
    let gpRB = false;
    let gpL3 = false;
    let gpR3 = false;
    let gamepadActive = false;

    if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
      const pads = navigator.getGamepads();
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (!pad || !pad.connected) continue;

        const leftStick = this.applyRadialDeadzoneAndCubic(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        const rightStick = this.applyRadialDeadzoneAndCubic(pad.axes[2] ?? 0, pad.axes[3] ?? 0);

        gpMoveX = leftStick.x;
        gpMoveZ = -leftStick.y;
        gpLookDX = rightStick.x * 2.85 * safeDt;
        gpLookDY = rightStick.y * 2.25 * safeDt;

        gpJump = Boolean(pad.buttons[0]?.pressed);
        gpCrouchOrBrake = Boolean(pad.buttons[1]?.pressed);
        gpPrimary = Boolean(pad.buttons[2]?.pressed);
        gpInteract = Boolean(pad.buttons[3]?.pressed);
        gpLB = Boolean(pad.buttons[4]?.pressed);
        gpRB = Boolean(pad.buttons[5]?.pressed);
        gpL2 = pad.buttons[6]?.value ?? 0;
        gpR2 = pad.buttons[7]?.value ?? 0;
        gpL3 = Boolean(pad.buttons[10]?.pressed);
        gpR3 = Boolean(pad.buttons[11]?.pressed);

        if (
          Math.hypot(gpMoveX, gpMoveZ) > 0.01 ||
          Math.hypot(rightStick.x, rightStick.y) > 0.01 ||
          gpR2 > 0.05 ||
          gpL2 > 0.05 ||
          gpJump ||
          gpCrouchOrBrake ||
          gpPrimary ||
          gpInteract ||
          gpLB ||
          gpRB
        ) {
          gamepadActive = true;
        }
        break;
      }
    }

    if (gamepadActive) {
      this.state.usingGamepad = true;
    } else if (kbLen > 0 || this.accumLookDX !== 0 || this.accumLookDY !== 0) {
      this.state.usingGamepad = false;
    }

    const gpJumpEdge = gpJump && !this.prevGpJump;
    const gpPrimaryEdge = gpPrimary && !this.prevGpPrimary;
    const gpSecondaryEdge = gpL2 > 0.45 && !this.prevGpSecondary;
    const gpInteractEdge = gpInteract && !this.prevGpInteract;
    const gpHornEdge = gpL3 && this.contextMode === 'DRIVING' && !this.prevGpHorn;
    const gpSwitchEdge = gpRB && !this.prevGpSwitch;
    const gpCamEdge = gpR3 && !this.prevGpCamToggle;

    this.prevGpJump = gpJump;
    this.prevGpPrimary = gpPrimary;
    this.prevGpSecondary = gpL2 > 0.45;
    this.prevGpInteract = gpInteract;
    this.prevGpHorn = gpL3 && this.contextMode === 'DRIVING';
    this.prevGpSwitch = gpRB;
    this.prevGpCamToggle = gpR3;

    // 3. Combine movement axes across Keyboard, Gamepad, and Touch
    let moveX = kbMoveX + gpMoveX + this.touchMoveX;
    let moveZ = kbMoveZ + gpMoveZ + this.touchMoveZ;
    if (this.contextMode === 'DRIVING') {
      if (this.touchGasPedal > 0 || this.touchBrakePedal > 0) {
        moveZ += this.touchGasPedal - this.touchBrakePedal;
      } else if (gpR2 > 0.02 || gpL2 > 0.02) {
        moveZ += gpR2 - gpL2;
      }
    }
    moveX = Math.max(-1, Math.min(1, moveX));
    moveZ = Math.max(-1, Math.min(1, moveZ));

    // 4. Camera look deltas & Euler integration
    const touchStickDX = this.rightStickRateX * 2.75 * safeDt;
    const touchStickDY = this.rightStickRateY * 2.15 * safeDt;

    const totalLookDX = this.accumLookDX + gpLookDX + touchStickDX;
    const totalLookDY = this.accumLookDY + gpLookDY + touchStickDY;
    this.accumLookDX = 0;
    this.accumLookDY = 0;

    this.state.lookDeltaX = totalLookDX;
    this.state.lookDeltaY = totalLookDY;
    this.state.cameraYaw -= totalLookDX;
    this.state.cameraPitch = Math.max(
      -1.38,
      Math.min(1.28, this.state.cameraPitch - totalLookDY)
    );

    // 5. Continuous throttle, brake & roll/sail-trim axes
    let throttle = Math.max(
      kbForward,
      gpR2,
      this.touchGasPedal,
      this.contextMode === 'FLIGHT_SPACE' ? Math.max(this.touchFlightThrottle, Math.max(0, moveZ)) : Math.max(0, moveZ)
    );
    let brake = Math.max(kbBackward, gpL2, this.touchBrakePedal, Math.max(0, -moveZ));
    throttle = Math.max(0, Math.min(1, throttle));
    brake = Math.max(0, Math.min(1, brake));

    let rollAxis = 0;
    if (this.touchRollMinus || this.touchRollPlus) {
      rollAxis = (this.touchRollPlus ? 1 : 0) - (this.touchRollMinus ? 1 : 0);
    } else if (this.contextMode === 'NAVAL') {
      const gpTrim = (gpRB ? 1 : 0) - (gpLB ? 1 : 0);
      rollAxis = gpTrim !== 0 ? gpTrim : moveX;
    } else {
      rollAxis = moveX;
    }

    // 6. Populate state snapshot
    this.state.moveX = moveX;
    this.state.moveZ = moveZ;
    this.state.throttle = throttle;
    this.state.brake = brake;
    this.state.rollAxis = Math.max(-1, Math.min(1, rollAxis));

    this.state.sprint =
      kbSprint ||
      (gpL3 && this.contextMode !== 'DRIVING') ||
      this.touchAutoSprint ||
      this.touchSprintHeld;

    this.state.jump = kbJump || gpJump || this.touchJumpHeld;
    this.state.jumpJustPressed = this.pendingJump || gpJumpEdge;

    this.state.crouch =
      kbCrouch ||
      (gpCrouchOrBrake && this.contextMode !== 'DRIVING') ||
      this.touchCrouchHeld;

    this.state.handbrake =
      kbHandbrake ||
      (gpCrouchOrBrake && this.contextMode === 'DRIVING') ||
      this.touchHandbrakeHeld;

    const mousePrimaryHeld = (this.mouseButtonsDown & 1) !== 0 && this.contextMode !== 'HUB';
    const mouseSecondaryHeld = (this.mouseButtonsDown & 2) !== 0 && this.contextMode !== 'HUB';

    this.state.primaryAction = mousePrimaryHeld || gpPrimary || gpR2 > 0.65 || this.touchPrimaryHeld;
    this.state.primaryJustPressed = this.pendingPrimary || gpPrimaryEdge;

    this.state.secondaryAction = mouseSecondaryHeld || gpL2 > 0.45;
    this.state.secondaryJustPressed = this.pendingSecondary || gpSecondaryEdge;

    this.state.interactJustPressed = this.pendingInteract || gpInteractEdge;
    this.state.hornJustPressed = this.pendingHorn || gpHornEdge;
    this.state.switchModeJustPressed =
      this.pendingSwitchMode || (gpSwitchEdge && this.contextMode !== 'NAVAL');
    this.state.cameraToggleJustPressed = this.pendingCameraToggle || gpCamEdge;

    this.state.radialMenuOpen =
      this.contextMode !== 'HUB' &&
      (kbRadial || (gpLB && this.contextMode !== 'NAVAL') || this.touchRadialToggled);

    // Clear edge-latched impulses for next frame
    this.pendingJump = false;
    this.pendingInteract = false;
    this.pendingPrimary = false;
    this.pendingSecondary = false;
    this.pendingHorn = false;
    this.pendingSwitchMode = false;
    this.pendingCameraToggle = false;
  }

  public vibrate(durationMs = 110, strongMagnitude = 0.55, weakMagnitude = 0.25): void {
    if (typeof navigator === 'undefined') {
      return;
    }

    if (typeof navigator.getGamepads === 'function') {
      const pads = navigator.getGamepads();
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (!pad || !pad.connected) continue;
        const actuator = (pad as unknown as { vibrationActuator?: HapticActuatorLike })
          .vibrationActuator;
        if (actuator && typeof actuator.playEffect === 'function') {
          void actuator
            .playEffect('dual-rumble', {
              startDelay: 0,
              duration: Math.max(15, Math.min(2000, durationMs)),
              strongMagnitude: Math.max(0, Math.min(1, strongMagnitude)),
              weakMagnitude: Math.max(0, Math.min(1, weakMagnitude))
            })
            .catch(() => {
              // Ignore unsupported actuator error
            });
        }
      }
    }

    if (this.state.usingTouch && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(Math.min(200, Math.round(durationMs * 0.45)));
      } catch {
        // Ignore restricted vibration API
      }
    }
  }

  public computeSafeCameraPosition(
    pivot: THREE.Vector3,
    desiredDistance: number,
    colliders: THREE.Object3D[],
    upVector?: THREE.Vector3
  ): THREE.Vector3 {
    const targetDist = Math.max(0.5, desiredDistance * this.zoomMultiplier);
    const yaw = this.state.cameraYaw;
    const pitch = this.state.cameraPitch;
    const cosPitch = Math.cos(pitch);

    // Local Y-up orbit offset (aligned with Three.js YXZ camera looking along -offset)
    this.tmpOffset.set(
      Math.sin(yaw) * cosPitch,
      -Math.sin(pitch),
      Math.cos(yaw) * cosPitch
    );

    if (upVector && upVector.lengthSq() > 0.0001) {
      this.tmpUp.copy(upVector).normalize();
      if (this.tmpUp.dot(WORLD_UP) < -0.9995) {
        this.tmpQuat.setFromAxisAngle(ALT_AXIS, Math.PI);
      } else {
        this.tmpQuat.setFromUnitVectors(WORLD_UP, this.tmpUp);
      }
      this.tmpOffset.applyQuaternion(this.tmpQuat);
    }

    this.tmpDir.copy(this.tmpOffset).normalize();

    let unobstructedRatio = 1.0;

    if (colliders.length > 0) {
      this.raycaster.set(pivot, this.tmpDir);
      this.raycaster.near = 0.25;
      this.raycaster.far = targetDist + 0.35;

      const hits = this.raycaster.intersectObjects(colliders, true);
      for (let i = 0; i < hits.length; i++) {
        const hit = hits[i];
        if (!hit.object.visible || hit.object instanceof THREE.Sprite) {
          continue;
        }
        const safeDist = Math.max(0.45, hit.distance - 0.3);
        unobstructedRatio = Math.min(unobstructedRatio, safeDist / targetDist);
        break;
      }
    }

    // Snap inward rapidly on wall obstruction, recover smoothly when clear
    if (unobstructedRatio < this.smoothedSafeRatio) {
      this.smoothedSafeRatio += (unobstructedRatio - this.smoothedSafeRatio) * 0.55;
    } else {
      this.smoothedSafeRatio += (unobstructedRatio - this.smoothedSafeRatio) * 0.14;
    }

    const finalDist = Math.max(0.45, targetDist * this.smoothedSafeRatio);
    return this.safeCameraOut.copy(pivot).addScaledVector(this.tmpDir, finalDist);
  }
}
