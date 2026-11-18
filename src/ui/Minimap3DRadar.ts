import type { MinimapMarker } from '../core/types';

const LOGICAL_SIZE = 200;
const CENTER = LOGICAL_SIZE * 0.5;
const OUTER_RING_RADIUS = 95;
const INNER_CLIP_RADIUS = 88;
const MAX_BLIP_RADIUS = 83;

const TYPE_PRIORITY: Record<MinimapMarker['type'], number> = {
  player: 0,
  poi: 1,
  vehicle: 2,
  danger: 3,
  objective: 4,
  peer: 5
};

const DEFAULT_MARKER_COLORS: Record<MinimapMarker['type'], string> = {
  player: '#eef6ff',
  peer: '#38e2ff',
  vehicle: '#19d4c6',
  poi: '#ffd166',
  objective: '#ffb347',
  danger: '#ff5e57'
};

export class Minimap3DRadar {
  public readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private rangeMeters: number;
  private currentDpr = 0;
  private sortedBuffer: MinimapMarker[] = [];

  constructor(canvas?: HTMLCanvasElement, rangeMeters = 220) {
    this.canvas = canvas ?? document.createElement('canvas');
    this.canvas.id = this.canvas.id || 'omniverse-radar-canvas';
    this.rangeMeters = Math.max(40, rangeMeters);

    const context = this.canvas.getContext('2d', { alpha: true });
    if (!context) {
      throw new Error('Minimap3DRadar: Unable to initialize 2D rendering context.');
    }
    this.ctx = context;
    this.syncResolution();
  }

  public setRangeMeters(meters: number): void {
    this.rangeMeters = Math.max(40, meters);
  }

  public getRangeMeters(): number {
    return this.rangeMeters;
  }

  public syncResolution(): void {
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5);
    if (Math.abs(dpr - this.currentDpr) < 0.01) {
      return;
    }
    this.currentDpr = dpr;
    this.canvas.width = Math.round(LOGICAL_SIZE * dpr);
    this.canvas.height = Math.round(LOGICAL_SIZE * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public render(
    playerPos: { x: number; z: number },
    playerYaw: number,
    markers: MinimapMarker[],
    gpsRoute?: Array<{ x: number; z: number }>
  ): void {
    this.syncResolution();

    const ctx = this.ctx;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.0055);
    const scale = MAX_BLIP_RADIUS / this.rangeMeters;

    // Three.js convention: yaw = 0 faces -Z (North / Up on canvas), +X is East (Right)
    const headingAngle = -Math.PI * 0.5 - playerYaw;

    ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

    // 1. Deep Smoked Obsidian Circular Backdrop
    const bgGrad = ctx.createRadialGradient(CENTER, CENTER, 6, CENTER, CENTER, OUTER_RING_RADIUS);
    bgGrad.addColorStop(0, 'rgba(12, 28, 48, 0.92)');
    bgGrad.addColorStop(0.68, 'rgba(6, 14, 26, 0.95)');
    bgGrad.addColorStop(1, 'rgba(3, 8, 16, 0.98)');

    ctx.beginPath();
    ctx.arc(CENTER, CENTER, OUTER_RING_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // 2. Subtle Rotating Sonar Sweep & Concentric Grid Rings
    ctx.save();
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, INNER_CLIP_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    const sweepAngle = (now * 0.0011) % (Math.PI * 2);
    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(sweepAngle);
    const sweepGrad = ctx.createLinearGradient(0, 0, INNER_CLIP_RADIUS, 26);
    sweepGrad.addColorStop(0, 'rgba(56, 226, 255, 0.09)');
    sweepGrad.addColorStop(1, 'rgba(56, 226, 255, 0)');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, INNER_CLIP_RADIUS, -0.38, 0.04);
    ctx.closePath();
    ctx.fillStyle = sweepGrad;
    ctx.fill();
    ctx.restore();

    // Range rings (33%, 66%, 100%)
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const ringRadius = (INNER_CLIP_RADIUS / 3) * i;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = i === 3 ? 'rgba(56, 226, 255, 0.24)' : 'rgba(56, 226, 255, 0.12)';
      ctx.stroke();
    }

    // Orthogonal tactical axes
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = 'rgba(56, 226, 255, 0.13)';
    ctx.beginPath();
    ctx.moveTo(CENTER - INNER_CLIP_RADIUS, CENTER);
    ctx.lineTo(CENTER + INNER_CLIP_RADIUS, CENTER);
    ctx.moveTo(CENTER, CENTER - INNER_CLIP_RADIUS);
    ctx.lineTo(CENTER, CENTER + INNER_CLIP_RADIUS);
    ctx.stroke();
    ctx.restore();

    // 3. Rotating Player FOV Heading Cone
    const coneSpread = 0.54; // ~62 degrees total FOV
    const coneRadius = 68;
    const tipX = CENTER + Math.cos(headingAngle) * coneRadius;
    const tipY = CENTER + Math.sin(headingAngle) * coneRadius;
    const coneGrad = ctx.createRadialGradient(CENTER, CENTER, 4, CENTER, CENTER, coneRadius);
    coneGrad.addColorStop(0, 'rgba(56, 226, 255, 0.34)');
    coneGrad.addColorStop(0.65, 'rgba(56, 226, 255, 0.11)');
    coneGrad.addColorStop(1, 'rgba(56, 226, 255, 0)');

    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, coneRadius, headingAngle - coneSpread, headingAngle + coneSpread);
    ctx.closePath();
    ctx.fillStyle = coneGrad;
    ctx.fill();

    // Crisp FOV boundary rays
    ctx.strokeStyle = 'rgba(56, 226, 255, 0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(
      CENTER + Math.cos(headingAngle - coneSpread) * (coneRadius * 0.88),
      CENTER + Math.sin(headingAngle - coneSpread) * (coneRadius * 0.88)
    );
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(
      CENTER + Math.cos(headingAngle + coneSpread) * (coneRadius * 0.88),
      CENTER + Math.sin(headingAngle + coneSpread) * (coneRadius * 0.88)
    );
    ctx.stroke();

    // Subtle forward heading hairline
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.25)';
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // 4. Luminescent Cyan/Amber GPS Route Polyline
    if (gpsRoute && gpsRoute.length >= 2) {
      this.drawGPSRoute(ctx, playerPos, gpsRoute, scale, now, pulse);
    }

    // 5. Color-Coded World & P2P Squadmate Blips
    if (markers.length > 0) {
      this.drawMarkers(ctx, playerPos, markers, scale, pulse);
    }

    ctx.restore(); // End inner circular clip

    // 6. Outer Compass Bezel Ring & Cardinal N / E / S / O Ticks
    this.drawCompassRing(ctx);

    // 7. Center Local Player Delta Chevron
    this.drawLocalPlayerChevron(ctx, headingAngle);
  }

  private drawGPSRoute(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; z: number },
    gpsRoute: Array<{ x: number; z: number }>,
    scale: number,
    now: number,
    pulse: number
  ): void {
    const first = gpsRoute[0];
    const startX = CENTER + (first.x - playerPos.x) * scale;
    const startY = CENTER + (first.z - playerPos.z) * scale;
    const last = gpsRoute[gpsRoute.length - 1];
    const endX = CENTER + (last.x - playerPos.x) * scale;
    const endY = CENTER + (last.z - playerPos.z) * scale;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const tracePath = (): void => {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      for (let i = 1; i < gpsRoute.length; i++) {
        const pt = gpsRoute[i];
        ctx.lineTo(CENTER + (pt.x - playerPos.x) * scale, CENTER + (pt.z - playerPos.z) * scale);
      }
    };

    // Outer bloom halo
    tracePath();
    ctx.strokeStyle = 'rgba(56, 226, 255, 0.26)';
    ctx.lineWidth = 6.5;
    ctx.stroke();

    // Core Cyan -> Solar Amber gradient polyline
    const routeGrad = ctx.createLinearGradient(startX, startY, endX, endY);
    routeGrad.addColorStop(0, '#38e2ff');
    routeGrad.addColorStop(0.65, '#4ee8d8');
    routeGrad.addColorStop(1, '#ffb347');

    tracePath();
    ctx.strokeStyle = routeGrad;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Animated directional pulse dashes
    ctx.setLineDash([5, 11]);
    ctx.lineDashOffset = -((now * 0.036) % 16);
    tracePath();
    ctx.strokeStyle = 'rgba(255, 248, 224, 0.85)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    // Destination Beacon Pin (clamped to radar edge if far away)
    const dxEnd = endX - CENTER;
    const dyEnd = endY - CENTER;
    const distEnd = Math.hypot(dxEnd, dyEnd);
    const pinX = distEnd > MAX_BLIP_RADIUS ? CENTER + (dxEnd / distEnd) * MAX_BLIP_RADIUS : endX;
    const pinY = distEnd > MAX_BLIP_RADIUS ? CENTER + (dyEnd / distEnd) * MAX_BLIP_RADIUS : endY;

    ctx.save();
    ctx.beginPath();
    ctx.arc(pinX, pinY, 5 + pulse * 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 179, 71, ${(0.7 - pulse * 0.45).toFixed(2)})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pinX, pinY, 3.3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb347';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawMarkers(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; z: number },
    markers: MinimapMarker[],
    scale: number,
    pulse: number
  ): void {
    this.sortedBuffer.length = 0;
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      if (m.type !== 'player') {
        this.sortedBuffer.push(m);
      }
    }
    this.sortedBuffer.sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);

    for (let i = 0; i < this.sortedBuffer.length; i++) {
      const marker = this.sortedBuffer[i];
      const rawDx = (marker.x - playerPos.x) * scale;
      const rawDy = (marker.z - playerPos.z) * scale;
      const dist = Math.hypot(rawDx, rawDy);
      const color = marker.color || DEFAULT_MARKER_COLORS[marker.type];

      const isClamped = dist > MAX_BLIP_RADIUS;
      if (isClamped && marker.type === 'vehicle') {
        // Distant parked vehicles outside radar radius stay uncluttered
        continue;
      }

      const angle = Math.atan2(rawDy, rawDx);
      const bx = isClamped ? CENTER + Math.cos(angle) * MAX_BLIP_RADIUS : CENTER + rawDx;
      const by = isClamped ? CENTER + Math.sin(angle) * MAX_BLIP_RADIUS : CENTER + rawDy;

      if (isClamped) {
        this.drawClampedRimPointer(ctx, bx, by, angle, color);
        continue;
      }

      switch (marker.type) {
        case 'peer':
          this.drawPeerBlip(ctx, bx, by, color, marker.label, pulse);
          break;
        case 'objective':
          this.drawObjectiveBlip(ctx, bx, by, color, pulse);
          break;
        case 'danger':
          this.drawDangerBlip(ctx, bx, by, color, pulse);
          break;
        case 'vehicle':
          this.drawVehicleBlip(ctx, bx, by, color);
          break;
        case 'poi':
          this.drawPoiBlip(ctx, bx, by, color);
          break;
        default:
          break;
      }
    }
  }

  private drawClampedRimPointer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(4.2, 0);
    ctx.lineTo(-3.2, -3.2);
    ctx.lineTo(-1.8, 0);
    ctx.lineTo(-3.2, 3.2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(4, 9, 18, 0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawPeerBlip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    label: string | undefined,
    pulse: number
  ): void {
    ctx.save();
    // Squadmate halo
    ctx.beginPath();
    ctx.arc(x, y, 5.2 + pulse * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 226, 255, 0.2)';
    ctx.fill();

    //Squadmate diamond core
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -4.6);
    ctx.lineTo(4.6, 0);
    ctx.lineTo(0, 4.6);
    ctx.lineTo(-4.6, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (label) {
      const shortLabel = label.length > 9 ? `${label.slice(0, 8)}…` : label;
      ctx.font = '700 9px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(4, 9, 18, 0.85)';
      ctx.fillText(shortLabel, 0.6, -5.4);
      ctx.fillStyle = '#eef6ff';
      ctx.fillText(shortLabel, 0, -6);
    }
    ctx.restore();
  }

  private drawObjectiveBlip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    pulse: number
  ): void {
    ctx.save();
    // Expanding sonar ring
    ctx.beginPath();
    ctx.arc(x, y, 5 + pulse * 5, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = Math.max(0.15, 0.85 - pulse * 0.65);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Crisp target diamond
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff8eb';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  private drawDangerBlip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    pulse: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    const scale = 0.92 + pulse * 0.22;
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4.6, 3.8);
    ctx.lineTo(-4.6, 3.8);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#140608';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  private drawVehicleBlip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.roundRect(-3.8, -2.5, 7.6, 5, 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#07101e';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawPoiBlip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 4.2 : 1.8;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      if (i === 0) {
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      } else {
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  private drawCompassRing(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Outer luminous cyan bezel stroke
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, OUTER_RING_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 226, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 36 degree ticks around rim
    for (let deg = 0; deg < 360; deg += 10) {
      const rad = ((deg - 90) * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const isIntercardinal = deg % 45 === 0;
      const outerR = OUTER_RING_RADIUS - 1.5;
      const innerR = isCardinal
        ? OUTER_RING_RADIUS - 7.5
        : isIntercardinal
          ? OUTER_RING_RADIUS - 5.5
          : OUTER_RING_RADIUS - 3.5;

      ctx.beginPath();
      ctx.moveTo(CENTER + Math.cos(rad) * innerR, CENTER + Math.sin(rad) * innerR);
      ctx.lineTo(CENTER + Math.cos(rad) * outerR, CENTER + Math.sin(rad) * outerR);
      ctx.strokeStyle =
        deg === 0
          ? '#ffb347'
          : isCardinal
            ? 'rgba(124, 238, 255, 0.9)'
            : 'rgba(56, 226, 255, 0.28)';
      ctx.lineWidth = isCardinal ? 1.8 : 1;
      ctx.stroke();
    }

    // Crisp N / E / S / O labels inside bezel
    ctx.font = '800 9.5px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cardinals: Array<{ label: string; angleDeg: number; color: string }> = [
      { label: 'N', angleDeg: 0, color: '#ffb347' },
      { label: 'E', angleDeg: 90, color: '#7ceeff' },
      { label: 'S', angleDeg: 180, color: '#bfd8f2' },
      { label: 'O', angleDeg: 270, color: '#7ceeff' }
    ];

    const textRadius = OUTER_RING_RADIUS - 13.5;
    for (let i = 0; i < cardinals.length; i++) {
      const c = cardinals[i];
      const rad = ((c.angleDeg - 90) * Math.PI) / 180;
      const tx = CENTER + Math.cos(rad) * textRadius;
      const ty = CENTER + Math.sin(rad) * textRadius;
      ctx.fillStyle = 'rgba(3, 8, 16, 0.9)';
      ctx.fillText(c.label, tx + 0.6, ty + 0.8);
      ctx.fillStyle = c.color;
      ctx.fillText(c.label, tx, ty);
    }

    ctx.restore();
  }

  private drawLocalPlayerChevron(ctx: CanvasRenderingContext2D, headingAngle: number): void {
    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(headingAngle);

    // Subtle cyan glow
    ctx.shadowColor = 'rgba(56, 226, 255, 0.85)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(7.2, 0);
    ctx.lineTo(-5.4, -5);
    ctx.lineTo(-2.6, 0);
    ctx.lineTo(-5.4, 5);
    ctx.closePath();

    ctx.fillStyle = '#eef6ff';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#38e2ff';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }
}
