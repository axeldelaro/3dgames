import type { IQualityManager, QualityConfig, QualityPreset } from '../types';

interface FrameSample {
  dt: number;
}

export class QualityManager implements IQualityManager {
  private currentConfig: QualityConfig;
  public autoScale = true;

  private readonly listeners = new Set<(config: QualityConfig) => void>();
  private readonly samples: FrameSample[] = [];
  private sampleDurationSum = 0;

  private smoothedFps = 60;
  private cooldownRemaining = 2.5;
  private highFpsDuration = 0;
  private autoDownscaled = false;
  private readonly initialPreset: QualityPreset;

  constructor(initialPreset?: QualityPreset) {
    const isMobileViewport =
      typeof navigator !== 'undefined' &&
      typeof window !== 'undefined' &&
      navigator.maxTouchPoints > 1 &&
      window.innerWidth < 1024;

    this.initialPreset = initialPreset ?? (isMobileViewport ? 'HIGH' : 'ULTRA');
    this.currentConfig = QualityManager.createConfigForPreset(this.initialPreset);
  }

  public get config(): QualityConfig {
    return this.currentConfig;
  }

  public static createConfigForPreset(preset: QualityPreset): QualityConfig {
    const rawDpr =
      typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
        ? window.devicePixelRatio
        : 1;

    switch (preset) {
      case 'ULTRA':
        return {
          preset: 'ULTRA',
          pixelRatio: Math.min(rawDpr, 2),
          shadowMapSize: 2048,
          enableBloom: true,
          enableSSAO: true,
          enableChromatic: true,
          chunkRadius: 4,
          maxInstancesMultiplier: 1.0,
          textureSize: 1024
        };
      case 'HIGH':
        return {
          preset: 'HIGH',
          pixelRatio: Math.min(rawDpr, 1.5),
          shadowMapSize: 1536,
          enableBloom: true,
          enableSSAO: false,
          enableChromatic: true,
          chunkRadius: 3,
          maxInstancesMultiplier: 0.75,
          textureSize: 1024
        };
      case 'MOBILE_PERF':
        return {
          preset: 'MOBILE_PERF',
          pixelRatio: Math.min(rawDpr, 1.15),
          shadowMapSize: 1024,
          enableBloom: false,
          enableSSAO: false,
          enableChromatic: false,
          chunkRadius: 2,
          maxInstancesMultiplier: 0.45,
          textureSize: 512
        };
    }
  }

  public setPreset(preset: QualityPreset): void {
    this.currentConfig = QualityManager.createConfigForPreset(preset);
    this.autoDownscaled = false;
    this.highFpsDuration = 0;
    this.cooldownRemaining = 2.5;
    this.clearRollingSamples();
    this.emitChange();
  }

  public recordFrame(dt: number): number {
    if (!Number.isFinite(dt) || dt <= 0) {
      return this.smoothedFps;
    }

    // Ignore background tab suspension spikes (> 400ms) so tab switching does not trigger false scaling
    if (dt > 0.4) {
      this.cooldownRemaining = Math.max(this.cooldownRemaining, 1.5);
      return this.smoothedFps;
    }

    const clampedDt = Math.max(0.001, Math.min(0.25, dt));
    const instantFps = 1 / clampedDt;
    const alpha = 1 - Math.exp(-clampedDt * 6.0);
    this.smoothedFps += (instantFps - this.smoothedFps) * alpha;

    this.samples.push({ dt: clampedDt });
    this.sampleDurationSum += clampedDt;

    while (this.sampleDurationSum > 3.0 && this.samples.length > 2) {
      const oldest = this.samples.shift();
      if (oldest) {
        this.sampleDurationSum -= oldest.dt;
      }
    }

    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - clampedDt);
      return this.smoothedFps;
    }

    if (!this.autoScale || this.sampleDurationSum < 2.85 || this.samples.length < 20) {
      return this.smoothedFps;
    }

    const rollingAvgFps = this.samples.length / this.sampleDurationSum;

    if (rollingAvgFps < 44) {
      this.highFpsDuration = 0;
      this.stepDownQuality();
    } else if (this.autoDownscaled && rollingAvgFps > 58 && this.smoothedFps > 58) {
      this.highFpsDuration += clampedDt;
      if (this.highFpsDuration >= 8.0) {
        this.highFpsDuration = 0;
        this.gentlyRestoreDpr();
      }
    } else if (rollingAvgFps < 56) {
      this.highFpsDuration = 0;
    }

    return this.smoothedFps;
  }

  public onChange(listener: (config: QualityConfig) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private stepDownQuality(): void {
    if (this.currentConfig.preset === 'ULTRA') {
      this.currentConfig = QualityManager.createConfigForPreset('HIGH');
      this.autoDownscaled = true;
      this.cooldownRemaining = 3.5;
      this.clearRollingSamples();
      this.emitChange();
      return;
    }

    if (this.currentConfig.preset === 'HIGH') {
      this.currentConfig = QualityManager.createConfigForPreset('MOBILE_PERF');
      this.autoDownscaled = true;
      this.cooldownRemaining = 3.5;
      this.clearRollingSamples();
      this.emitChange();
      return;
    }

    if (this.currentConfig.pixelRatio > 0.85) {
      this.currentConfig = {
        ...this.currentConfig,
        pixelRatio: 0.85
      };
      this.autoDownscaled = true;
      this.cooldownRemaining = 4.5;
      this.clearRollingSamples();
      this.emitChange();
    }
  }

  private gentlyRestoreDpr(): void {
    const basePresetDpr = QualityManager.createConfigForPreset(this.currentConfig.preset).pixelRatio;
    const ceilingDpr = QualityManager.createConfigForPreset(this.initialPreset).pixelRatio;
    const targetMaxDpr = Math.max(basePresetDpr, Math.min(ceilingDpr, basePresetDpr + 0.25));

    if (this.currentConfig.pixelRatio < targetMaxDpr - 0.02) {
      const restoredDpr = Math.min(targetMaxDpr, Number((this.currentConfig.pixelRatio + 0.15).toFixed(2)));
      this.currentConfig = {
        ...this.currentConfig,
        pixelRatio: restoredDpr
      };
      if (restoredDpr >= ceilingDpr - 0.02 && this.currentConfig.preset === this.initialPreset) {
        this.autoDownscaled = false;
      }
      this.cooldownRemaining = 5.0;
      this.clearRollingSamples();
      this.emitChange();
    } else {
      this.autoDownscaled = false;
    }
  }

  private clearRollingSamples(): void {
    this.samples.length = 0;
    this.sampleDurationSum = 0;
  }

  private emitChange(): void {
    const snapshot: QualityConfig = { ...this.currentConfig };
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
