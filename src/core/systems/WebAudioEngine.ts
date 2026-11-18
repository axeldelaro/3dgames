import type { IWebAudioEngine, SurfaceMaterialType, WorldId } from '../types';

type SoundscapeId = WorldId | 'hub';

interface SoundscapeProfile {
  bpm: number;
  padChords: ReadonlyArray<ReadonlyArray<number>>;
  arpNotes: ReadonlyArray<number>;
  bassNotes: ReadonlyArray<number>;
  padWaveform: OscillatorType;
  arpWaveform: OscillatorType;
  padFilterHz: number;
  reverbSend: number;
  pulseBass: boolean;
  percussionChance: number;
}

const SOUNDSCAPE_PROFILES: Record<SoundscapeId, SoundscapeProfile> = {
  hub: {
    bpm: 76,
    padChords: [
      [146.83, 220.0, 277.18, 329.63, 440.0], // Dmaj9
      [123.47, 185.0, 220.0, 293.66, 369.99], // Bm11
      [196.0, 246.94, 293.66, 369.99, 440.0], // Gmaj9
      [164.81, 220.0, 246.94, 329.63, 415.3]  // Asus4 -> E
    ],
    arpNotes: [587.33, 659.25, 739.99, 880.0, 1108.73, 1174.66],
    bassNotes: [73.42, 61.74, 98.0, 82.41],
    padWaveform: 'sine',
    arpWaveform: 'sine',
    padFilterHz: 1150,
    reverbSend: 0.58,
    pulseBass: false,
    percussionChance: 0.12
  },
  metropolis: {
    bpm: 104,
    padChords: [
      [130.81, 155.56, 196.0, 233.08, 293.66], // Cm9
      [103.83, 155.56, 196.0, 261.63, 311.13], // Abmaj9
      [174.61, 207.65, 261.63, 311.13, 392.0], // Fm9
      [98.0, 146.83, 174.61, 233.08, 293.66]   // Gm7
    ],
    arpNotes: [261.63, 311.13, 392.0, 466.16, 523.25, 587.33, 622.25],
    bassNotes: [65.41, 51.91, 87.31, 49.0],
    padWaveform: 'sawtooth',
    arpWaveform: 'triangle',
    padFilterHz: 780,
    reverbSend: 0.42,
    pulseBass: true,
    percussionChance: 0.35
  },
  starfield: {
    bpm: 64,
    padChords: [
      [174.61, 261.63, 329.63, 369.99, 440.0], // F Lydian (#11 = B4 493.88 / F# mix) -> F A C E G B
      [174.61, 220.0, 261.63, 329.63, 493.88], // Fmaj7(#11)
      [196.0, 246.94, 293.66, 392.0, 493.88],  // G/F
      [146.83, 220.0, 261.63, 329.63, 440.0]   // Dm9
    ],
    arpNotes: [523.25, 659.25, 783.99, 987.77, 1046.5, 1174.66],
    bassNotes: [87.31, 87.31, 98.0, 73.42],
    padWaveform: 'triangle',
    arpWaveform: 'sine',
    padFilterHz: 950,
    reverbSend: 0.68,
    pulseBass: false,
    percussionChance: 0.08
  },
  valheim: {
    bpm: 72,
    padChords: [
      [146.83, 220.0, 293.66, 329.63], // D5 add9 open nordic fifths
      [130.81, 196.0, 261.63, 293.66], // C5 add9
      [196.0, 293.66, 349.23, 392.0],  // Gm / fifths
      [146.83, 220.0, 261.63, 329.63]  // D Dorian
    ],
    arpNotes: [293.66, 329.63, 349.23, 440.0, 493.88, 523.25, 587.33],
    bassNotes: [73.42, 65.41, 98.0, 73.42],
    padWaveform: 'triangle',
    arpWaveform: 'triangle',
    padFilterHz: 680,
    reverbSend: 0.52,
    pulseBass: false,
    percussionChance: 0.25
  },
  seaOfLegends: {
    bpm: 92,
    padChords: [
      [196.0, 233.08, 293.66, 392.0],  // Gm
      [174.61, 220.0, 261.63, 349.23], // F
      [130.81, 196.0, 246.94, 329.63], // C (Dorian IV)
      [146.83, 220.0, 293.66, 349.23]  // Dm7
    ],
    arpNotes: [392.0, 440.0, 466.16, 587.33, 659.25, 698.46, 783.99],
    bassNotes: [98.0, 87.31, 65.41, 73.42],
    padWaveform: 'sawtooth',
    arpWaveform: 'triangle',
    padFilterHz: 840,
    reverbSend: 0.46,
    pulseBass: false,
    percussionChance: 0.3
  },
  aetheria: {
    bpm: 80,
    padChords: [
      [155.56, 233.08, 293.66, 349.23, 466.16], // Ebmaj9
      [130.81, 196.0, 233.08, 293.66, 392.0],   // Cm9
      [207.65, 261.63, 311.13, 392.0, 466.16],  // Abmaj9
      [116.54, 174.61, 220.0, 261.63, 349.23]   // Bb13sus
    ],
    arpNotes: [622.25, 698.46, 783.99, 932.33, 1046.5, 1174.66, 1396.91],
    bassNotes: [77.78, 65.41, 103.83, 58.27],
    padWaveform: 'sine',
    arpWaveform: 'sine',
    padFilterHz: 1400,
    reverbSend: 0.62,
    pulseBass: false,
    percussionChance: 0.1
  },
  extremeHorizon: {
    bpm: 124,
    padChords: [
      [164.81, 246.94, 329.63, 392.0], // Em
      [130.81, 196.0, 246.94, 329.63], // Cmaj7
      [146.83, 220.0, 293.66, 369.99], // D
      [123.47, 185.0, 246.94, 293.66]  // Bm7
    ],
    arpNotes: [329.63, 392.0, 493.88, 587.33, 659.25, 783.99],
    bassNotes: [82.41, 65.41, 73.42, 61.74],
    padWaveform: 'sawtooth',
    arpWaveform: 'sawtooth',
    padFilterHz: 1100,
    reverbSend: 0.36,
    pulseBass: true,
    percussionChance: 0.45
  }
};

interface EngineSynthGraph {
  oscPrimary: OscillatorNode;
  oscSub: OscillatorNode;
  oscHarmonic: OscillatorNode;
  oscFmMod: OscillatorNode;
  fmModGain: GainNode;
  exhaustFilter: BiquadFilterNode;
  driveShaper: WaveShaperNode;
  engineGain: GainNode;
  tireNoise: AudioBufferSourceNode;
  tireFilterA: BiquadFilterNode;
  tireFilterB: BiquadFilterNode;
  tireGain: GainNode;
}

interface AmbienceLoopGraph {
  windSource: AudioBufferSourceNode;
  windFilterLow: BiquadFilterNode;
  windFilterHigh: BiquadFilterNode;
  windGain: GainNode;
  rainSource: AudioBufferSourceNode;
  rainBand: BiquadFilterNode;
  rainHighShelf: BiquadFilterNode;
  rainGain: GainNode;
}

interface SpaceThrusterGraph {
  rumbleOsc: OscillatorNode;
  plasmaNoise: AudioBufferSourceNode;
  plasmaFilter: BiquadFilterNode;
  thrusterGain: GainNode;
  warpOscs: OscillatorNode[];
  warpFilter: BiquadFilterNode;
  warpGain: GainNode;
}

export class WebAudioEngine implements IWebAudioEngine {
  private ctx: AudioContext | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private sfxReverbSend: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicReverbSend: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbReturnGain: GainNode | null = null;

  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  private vehicleGraph: EngineSynthGraph | null = null;
  private ambienceGraph: AmbienceLoopGraph | null = null;
  private spaceGraph: SpaceThrusterGraph | null = null;

  private masterVolume = 0.82;
  private musicVolume = 0.38;
  private currentWorld: SoundscapeId = 'hub';
  private lastFootstepAt = 0;

  private padOscillators: OscillatorNode[] = [];
  private padGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private musicTimerId: number | null = null;
  private stepIndex = 0;
  private chordIndex = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const autoUnlock = (): void => {
        this.unlock();
      };
      window.addEventListener('pointerdown', autoUnlock, { once: true, passive: true });
      window.addEventListener('keydown', autoUnlock, { once: true, passive: true });
      window.addEventListener('touchstart', autoUnlock, { once: true, passive: true });
    }
  }

  public unlock(): void {
    if (!this.ctx) {
      this.initializeContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private initializeContext(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioCtxCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtxCtor) {
      return;
    }

    try {
      const ctx = new AudioCtxCtor();
      this.ctx = ctx;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 4.2;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.18;

      const masterGain = ctx.createGain();
      masterGain.gain.value = this.masterVolume;

      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      const convolver = ctx.createConvolver();
      convolver.buffer = this.createStereoReverbImpulse(ctx, 2.6, 2.8);

      const reverbReturn = ctx.createGain();
      reverbReturn.gain.value = 0.42;
      convolver.connect(reverbReturn);
      reverbReturn.connect(compressor);

      const sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.92;
      sfxBus.connect(compressor);

      const sfxReverbSend = ctx.createGain();
      sfxReverbSend.gain.value = 0.22;
      sfxBus.connect(sfxReverbSend);
      sfxReverbSend.connect(convolver);

      const musicBus = ctx.createGain();
      musicBus.gain.value = this.musicVolume;
      musicBus.connect(compressor);

      const musicReverbSend = ctx.createGain();
      musicReverbSend.gain.value = SOUNDSCAPE_PROFILES[this.currentWorld].reverbSend;
      musicBus.connect(musicReverbSend);
      musicReverbSend.connect(convolver);

      this.masterCompressor = compressor;
      this.masterGain = masterGain;
      this.convolver = convolver;
      this.reverbReturnGain = reverbReturn;
      this.sfxBus = sfxBus;
      this.sfxReverbSend = sfxReverbSend;
      this.musicBus = musicBus;
      this.musicReverbSend = musicReverbSend;

      this.whiteNoiseBuffer = this.createNoiseBuffer(ctx, 3.0, 'white');
      this.pinkNoiseBuffer = this.createNoiseBuffer(ctx, 3.5, 'pink');

      this.buildVehicleGraph(ctx, sfxBus);
      this.buildAmbienceGraph(ctx, sfxBus);
      this.buildSpaceGraph(ctx, sfxBus);
      this.startSoundscapeEngine();
    } catch {
      this.ctx = null;
    }
  }

  private createStereoReverbImpulse(
    ctx: AudioContext,
    durationSeconds: number,
    decayRate: number
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSeconds);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let lpState = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, decayRate);
        // Early reflections boost in first 45ms + smooth high-frequency air damping
        const early = i < sampleRate * 0.045 && i % 397 < 6 ? 0.55 : 0;
        const raw = (Math.random() * 2 - 1) * env + early * (Math.random() * 2 - 1);
        const dampAlpha = 0.38 - t * 0.24;
        lpState += dampAlpha * (raw - lpState);
        data[i] = lpState * 0.65;
      }
    }

    return impulse;
  }

  private createNoiseBuffer(
    ctx: AudioContext,
    durationSeconds: number,
    color: 'white' | 'pink'
  ): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const out = buffer.getChannelData(0);

    if (color === 'white') {
      for (let i = 0; i < length; i++) {
        out[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    // Paul Kellet's 7-pole pink noise filter
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private createSoftClipCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 512;
    const curve = new Float32Array(samples);
    const k = Math.max(1, amount);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  private buildVehicleGraph(ctx: AudioContext, destination: AudioNode): void {
    if (!this.whiteNoiseBuffer) {
      return;
    }

    const oscPrimary = ctx.createOscillator();
    oscPrimary.type = 'sawtooth';
    oscPrimary.frequency.value = 65;

    const oscSub = ctx.createOscillator();
    oscSub.type = 'triangle';
    oscSub.frequency.value = 32.5;

    const oscHarmonic = ctx.createOscillator();
    oscHarmonic.type = 'sawtooth';
    oscHarmonic.frequency.value = 97.5;

    const oscFmMod = ctx.createOscillator();
    oscFmMod.type = 'sine';
    oscFmMod.frequency.value = 130;

    const fmModGain = ctx.createGain();
    fmModGain.gain.value = 18;
    oscFmMod.connect(fmModGain);
    fmModGain.connect(oscPrimary.frequency);

    const subMix = ctx.createGain();
    subMix.gain.value = 0.55;
    oscSub.connect(subMix);

    const harmMix = ctx.createGain();
    harmMix.gain.value = 0.32;
    oscHarmonic.connect(harmMix);

    const driveShaper = ctx.createWaveShaper();
    driveShaper.curve = this.createSoftClipCurve(3.5);
    driveShaper.oversample = '2x';

    oscPrimary.connect(driveShaper);
    subMix.connect(driveShaper);
    harmMix.connect(driveShaper);

    const exhaustFilter = ctx.createBiquadFilter();
    exhaustFilter.type = 'bandpass';
    exhaustFilter.frequency.value = 220;
    exhaustFilter.Q.value = 1.65;

    const lowBody = ctx.createBiquadFilter();
    lowBody.type = 'lowshelf';
    lowBody.frequency.value = 140;
    lowBody.gain.value = 5.5;

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;

    driveShaper.connect(exhaustFilter);
    exhaustFilter.connect(lowBody);
    lowBody.connect(engineGain);
    engineGain.connect(destination);

    // Tire slip high-Q dual resonant screech
    const tireNoise = ctx.createBufferSource();
    tireNoise.buffer = this.whiteNoiseBuffer;
    tireNoise.loop = true;

    const tireFilterA = ctx.createBiquadFilter();
    tireFilterA.type = 'bandpass';
    tireFilterA.frequency.value = 1850;
    tireFilterA.Q.value = 15;

    const tireFilterB = ctx.createBiquadFilter();
    tireFilterB.type = 'bandpass';
    tireFilterB.frequency.value = 2620;
    tireFilterB.Q.value = 18;

    const tireGain = ctx.createGain();
    tireGain.gain.value = 0.0;

    tireNoise.connect(tireFilterA);
    tireNoise.connect(tireFilterB);
    tireFilterA.connect(tireGain);
    tireFilterB.connect(tireGain);
    tireGain.connect(destination);

    oscPrimary.start();
    oscSub.start();
    oscHarmonic.start();
    oscFmMod.start();
    tireNoise.start();

    this.vehicleGraph = {
      oscPrimary,
      oscSub,
      oscHarmonic,
      oscFmMod,
      fmModGain,
      exhaustFilter,
      driveShaper,
      engineGain,
      tireNoise,
      tireFilterA,
      tireFilterB,
      tireGain
    };
  }

  private buildAmbienceGraph(ctx: AudioContext, destination: AudioNode): void {
    if (!this.pinkNoiseBuffer || !this.whiteNoiseBuffer) {
      return;
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = this.pinkNoiseBuffer;
    windSource.loop = true;

    const windFilterLow = ctx.createBiquadFilter();
    windFilterLow.type = 'bandpass';
    windFilterLow.frequency.value = 320;
    windFilterLow.Q.value = 1.4;

    const windFilterHigh = ctx.createBiquadFilter();
    windFilterHigh.type = 'bandpass';
    windFilterHigh.frequency.value = 950;
    windFilterHigh.Q.value = 2.2;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.0;

    windSource.connect(windFilterLow);
    windSource.connect(windFilterHigh);
    windFilterLow.connect(windGain);
    windFilterHigh.connect(windGain);
    windGain.connect(destination);

    const rainSource = ctx.createBufferSource();
    rainSource.buffer = this.whiteNoiseBuffer;
    rainSource.loop = true;

    const rainBand = ctx.createBiquadFilter();
    rainBand.type = 'bandpass';
    rainBand.frequency.value = 1950;
    rainBand.Q.value = 0.65;

    const rainHighShelf = ctx.createBiquadFilter();
    rainHighShelf.type = 'highshelf';
    rainHighShelf.frequency.value = 5400;
    rainHighShelf.gain.value = 4.0;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.0;

    rainSource.connect(rainBand);
    rainBand.connect(rainHighShelf);
    rainHighShelf.connect(rainGain);
    rainGain.connect(destination);

    windSource.start();
    rainSource.start();

    this.ambienceGraph = {
      windSource,
      windFilterLow,
      windFilterHigh,
      windGain,
      rainSource,
      rainBand,
      rainHighShelf,
      rainGain
    };
  }

  private buildSpaceGraph(ctx: AudioContext, destination: AudioNode): void {
    if (!this.pinkNoiseBuffer) {
      return;
    }

    const rumbleOsc = ctx.createOscillator();
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.value = 48;

    const rumbleLowpass = ctx.createBiquadFilter();
    rumbleLowpass.type = 'lowpass';
    rumbleLowpass.frequency.value = 180;

    const plasmaNoise = ctx.createBufferSource();
    plasmaNoise.buffer = this.pinkNoiseBuffer;
    plasmaNoise.loop = true;

    const plasmaFilter = ctx.createBiquadFilter();
    plasmaFilter.type = 'bandpass';
    plasmaFilter.frequency.value = 280;
    plasmaFilter.Q.value = 1.9;

    const thrusterGain = ctx.createGain();
    thrusterGain.gain.value = 0.0;

    rumbleOsc.connect(rumbleLowpass);
    rumbleLowpass.connect(thrusterGain);
    plasmaNoise.connect(plasmaFilter);
    plasmaFilter.connect(thrusterGain);
    thrusterGain.connect(destination);

    // Quantum warp Lydian shimmer chord: C3, G3, D4, F#4, A4
    const warpFreqs = [130.81, 196.0, 293.66, 369.99, 440.0];
    const warpFilter = ctx.createBiquadFilter();
    warpFilter.type = 'lowpass';
    warpFilter.frequency.value = 1600;
    warpFilter.Q.value = 2.0;

    const warpGain = ctx.createGain();
    warpGain.gain.value = 0.0;

    const warpOscs: OscillatorNode[] = [];
    for (let i = 0; i < warpFreqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = warpFreqs[i];
      osc.detune.value = (i - 2) * 7;
      osc.connect(warpFilter);
      osc.start();
      warpOscs.push(osc);
    }

    warpFilter.connect(warpGain);
    warpGain.connect(destination);
    if (this.sfxReverbSend) {
      warpGain.connect(this.sfxReverbSend);
    }

    rumbleOsc.start();
    plasmaNoise.start();

    this.spaceGraph = {
      rumbleOsc,
      plasmaNoise,
      plasmaFilter,
      thrusterGain,
      warpOscs,
      warpFilter,
      warpGain
    };
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.musicBus) {
      this.musicBus.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.08);
    }
  }

  public setWorldSoundscape(worldId: WorldId | 'hub'): void {
    const changed = this.currentWorld !== worldId;
    this.currentWorld = worldId;
    this.chordIndex = 0;
    this.stepIndex = 0;

    if (!this.ctx || !this.musicBus) {
      return;
    }

    const profile = SOUNDSCAPE_PROFILES[worldId];
    if (this.musicReverbSend) {
      this.musicReverbSend.gain.setTargetAtTime(profile.reverbSend, this.ctx.currentTime, 0.35);
    }

    if (changed || this.padOscillators.length === 0) {
      this.rebuildSoundscapePad();
      this.restartSoundscapeTimer();
    }
  }

  private startSoundscapeEngine(): void {
    this.rebuildSoundscapePad();
    this.restartSoundscapeTimer();
  }

  private rebuildSoundscapePad(): void {
    if (!this.ctx || !this.musicBus) {
      return;
    }

    const now = this.ctx.currentTime;
    if (this.padGain) {
      const oldGain = this.padGain;
      const oldOscs = this.padOscillators;
      oldGain.gain.setTargetAtTime(0.0001, now, 0.35);
      window.setTimeout(() => {
        for (const osc of oldOscs) {
          try {
            osc.stop();
            osc.disconnect();
          } catch {
            // Already stopped
          }
        }
        oldGain.disconnect();
      }, 1500);
    }

    const profile = SOUNDSCAPE_PROFILES[this.currentWorld];
    const chord = profile.padChords[0];

    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = profile.padFilterHz;
    padFilter.Q.value = 0.85;

    const padGain = this.ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.setTargetAtTime(0.11, now + 0.05, 0.7);

    padFilter.connect(padGain);
    padGain.connect(this.musicBus);

    const newOscs: OscillatorNode[] = [];
    for (let i = 0; i < chord.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = profile.padWaveform;
      osc.frequency.value = chord[i];
      osc.detune.value = (i % 2 === 0 ? 1 : -1) * (3 + i * 1.5);
      osc.connect(padFilter);
      osc.start(now);
      newOscs.push(osc);
    }

    this.padFilter = padFilter;
    this.padGain = padGain;
    this.padOscillators = newOscs;
  }

  private restartSoundscapeTimer(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (this.musicTimerId !== null) {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }

    const profile = SOUNDSCAPE_PROFILES[this.currentWorld];
    const eighthNoteMs = Math.max(140, Math.round((60 / profile.bpm / 2) * 1000));

    this.musicTimerId = window.setInterval(() => {
      this.tickGenerativeMusic();
    }, eighthNoteMs);
  }

  private tickGenerativeMusic(): void {
    if (!this.ctx || !this.musicBus || this.ctx.state !== 'running' || this.musicVolume <= 0.005) {
      return;
    }

    const profile = SOUNDSCAPE_PROFILES[this.currentWorld];
    const now = this.ctx.currentTime;
    const barStep = this.stepIndex % 16;

    // Advance chord every 16 eighth-notes (2 bars)
    if (barStep === 0 && this.stepIndex > 0) {
      this.chordIndex = (this.chordIndex + 1) % profile.padChords.length;
      const nextChord = profile.padChords[this.chordIndex];
      for (let i = 0; i < this.padOscillators.length; i++) {
        const targetFreq = nextChord[i % nextChord.length];
        this.padOscillators[i].frequency.setTargetAtTime(targetFreq, now, 0.45);
      }
      if (this.padFilter) {
        const lfoCutoff = profile.padFilterHz * (0.85 + 0.3 * Math.sin(this.chordIndex * 1.4));
        this.padFilter.frequency.setTargetAtTime(lfoCutoff, now, 0.8);
      }
    }

    // Bass pulse / drone note
    const bassFreq = profile.bassNotes[this.chordIndex % profile.bassNotes.length];
    if (profile.pulseBass) {
      if (barStep % 2 === 0) {
        this.triggerSynthNote(bassFreq, 'sawtooth', 0.22, 0.14, 340, now);
      }
    } else if (barStep === 0) {
      this.triggerSynthNote(bassFreq, 'sine', 2.4, 0.14, 240, now);
    }

    // Generative melodic arpeggio / harp / bell piano
    const arpProbability =
      this.currentWorld === 'metropolis' || this.currentWorld === 'extremeHorizon' ? 0.62 : 0.42;
    if (Math.random() < arpProbability) {
      const noteIdx = (barStep * 2 + Math.floor(Math.random() * 3)) % profile.arpNotes.length;
      const freq = profile.arpNotes[noteIdx];
      const decay = this.currentWorld === 'aetheria' || this.currentWorld === 'starfield' ? 1.35 : 0.55;
      const cutoff = this.currentWorld === 'valheim' ? 1500 : 2800;
      this.triggerSynthNote(freq, profile.arpWaveform, decay, 0.065, cutoff, now);
    }

    // Subtle procedural percussion pulse
    if ((barStep === 0 || barStep === 8 || (barStep === 12 && Math.random() < profile.percussionChance)) && profile.percussionChance > 0.15) {
      this.triggerSoftKickOrTom(barStep === 0 ? 92 : 120, 0.08, now);
    }

    this.stepIndex++;
  }

  private triggerSynthNote(
    freq: number,
    waveform: OscillatorType,
    duration: number,
    peakGain: number,
    filterHz: number,
    startTime: number
  ): void {
    if (!this.ctx || !this.musicBus) {
      return;
    }

    const osc = this.ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, startTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterHz, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(140, filterHz * 0.35), startTime + duration);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + 0.016);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.musicBus);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
  }

  private triggerSoftKickOrTom(startHz: number, peakGain: number, startTime: number): void {
    if (!this.ctx || !this.musicBus) {
      return;
    }

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startHz, startTime);
    osc.frequency.exponentialRampToValueAtTime(36, startTime + 0.16);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

    osc.connect(env);
    env.connect(this.musicBus);
    osc.start(startTime);
    osc.stop(startTime + 0.25);
  }

  public playFootstep(surface: SurfaceMaterialType, sprint = false): void {
    if (!this.ctx || !this.sfxBus || !this.whiteNoiseBuffer) {
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const perfNow = performance.now();
    if (perfNow - this.lastFootstepAt < 65) {
      return;
    }
    this.lastFootstepAt = perfNow;

    const now = this.ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;
    const gainBoost = sprint ? 1.32 : 0.92;

    switch (surface) {
      case 'asphalt': {
        this.playFilteredNoiseBurst(1750 * jitter, 2.4, 0.055, 0.11 * gainBoost, 'bandpass', now);
        this.playPitchDropThump(125 * jitter, 52, 0.065, 0.16 * gainBoost, 'sine', now);
        break;
      }
      case 'grass': {
        this.playFilteredNoiseBurst(3400 * jitter, 1.3, 0.095, 0.085 * gainBoost, 'bandpass', now);
        this.playPitchDropThump(82 * jitter, 42, 0.055, 0.08 * gainBoost, 'sine', now);
        break;
      }
      case 'wood': {
        this.playFilteredNoiseBurst(680 * jitter, 5.2, 0.075, 0.14 * gainBoost, 'bandpass', now);
        this.playPitchDropThump(195 * jitter, 118, 0.085, 0.2 * gainBoost, 'triangle', now);
        break;
      }
      case 'metal': {
        this.playFilteredNoiseBurst(2600 * jitter, 3.2, 0.06, 0.12 * gainBoost, 'highpass', now);
        // Metallic inharmonic FM ring
        const carrier = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const ringGain = this.ctx.createGain();
        carrier.type = 'triangle';
        carrier.frequency.setValueAtTime(510 * jitter, now);
        mod.type = 'sine';
        mod.frequency.setValueAtTime(793 * jitter, now);
        modGain.gain.setValueAtTime(240, now);
        modGain.gain.exponentialRampToValueAtTime(8, now + 0.14);
        ringGain.gain.setValueAtTime(0.11 * gainBoost, now);
        ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        mod.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(ringGain);
        ringGain.connect(this.sfxBus);
        mod.start(now);
        carrier.start(now);
        mod.stop(now + 0.17);
        carrier.stop(now + 0.17);
        break;
      }
      case 'water': {
        const src = this.ctx.createBufferSource();
        src.buffer = this.whiteNoiseBuffer;
        src.playbackRate.value = 0.85 + Math.random() * 0.3;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 3.8;
        bp.frequency.setValueAtTime(480 * jitter, now);
        bp.frequency.exponentialRampToValueAtTime(2100 * jitter, now + 0.14);
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.18 * gainBoost, now + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        src.connect(bp);
        bp.connect(env);
        env.connect(this.sfxBus);
        src.start(now, Math.random() * 1.5, 0.25);
        break;
      }
      case 'sand': {
        this.playFilteredNoiseBurst(2350 * jitter, 1.15, 0.115, 0.11 * gainBoost, 'bandpass', now);
        this.playPitchDropThump(92 * jitter, 46, 0.06, 0.09 * gainBoost, 'sine', now);
        break;
      }
      case 'snow': {
        this.playFilteredNoiseBurst(1380 * jitter, 1.9, 0.12, 0.13 * gainBoost, 'bandpass', now);
        this.playFilteredNoiseBurst(4600 * jitter, 2.8, 0.075, 0.08 * gainBoost, 'highpass', now + 0.012);
        break;
      }
      case 'rock': {
        this.playFilteredNoiseBurst(2150 * jitter, 3.1, 0.055, 0.13 * gainBoost, 'bandpass', now);
        this.playPitchDropThump(148 * jitter, 64, 0.07, 0.18 * gainBoost, 'triangle', now);
        break;
      }
    }
  }

  private playFilteredNoiseBurst(
    freq: number,
    q: number,
    duration: number,
    peakGain: number,
    filterType: BiquadFilterType,
    startTime: number
  ): void {
    if (!this.ctx || !this.sfxBus || !this.whiteNoiseBuffer) {
      return;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, startTime);
    filter.Q.setValueAtTime(q, startTime);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxBus);

    const offset = Math.random() * Math.max(0.1, this.whiteNoiseBuffer.duration - duration - 0.05);
    src.start(startTime, offset, duration + 0.02);
  }

  private playPitchDropThump(
    startFreq: number,
    endFreq: number,
    duration: number,
    peakGain: number,
    waveform: OscillatorType,
    startTime: number
  ): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }

    const osc = this.ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(18, endFreq), startTime + duration);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(env);
    env.connect(this.sfxBus);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public updateVehicleEngine(
    active: boolean,
    rpmNormalized: number,
    load = 0.5,
    tireSlip = 0
  ): void {
    if (!this.ctx || !this.vehicleGraph) {
      return;
    }

    const now = this.ctx.currentTime;
    const g = this.vehicleGraph;

    if (!active) {
      g.engineGain.gain.setTargetAtTime(0.0, now, 0.08);
      g.tireGain.gain.setTargetAtTime(0.0, now, 0.06);
      return;
    }

    const rpm = Math.max(0, Math.min(1, rpmNormalized));
    const clampedLoad = Math.max(0, Math.min(1, load));
    const clampedSlip = Math.max(0, Math.min(1, tireSlip));

    const baseHz = 60 + rpm * 260; // 60..320 Hz
    g.oscPrimary.frequency.setTargetAtTime(baseHz, now, 0.035);
    g.oscSub.frequency.setTargetAtTime(baseHz * 0.5, now, 0.035);
    g.oscHarmonic.frequency.setTargetAtTime(baseHz * 1.5, now, 0.035);
    g.oscFmMod.frequency.setTargetAtTime(baseHz * 2.0, now, 0.035);
    g.fmModGain.gain.setTargetAtTime(10 + clampedLoad * 42 + rpm * 24, now, 0.04);

    const exhaustCutoff = 190 + rpm * 1050 + clampedLoad * 320;
    g.exhaustFilter.frequency.setTargetAtTime(exhaustCutoff, now, 0.04);
    g.engineGain.gain.setTargetAtTime(0.09 + rpm * 0.11 + clampedLoad * 0.06, now, 0.05);

    if (clampedSlip > 0.08) {
      const screechGain = Math.min(0.18, (clampedSlip - 0.08) * 0.22);
      const flutter = Math.sin(performance.now() * 0.028) * 110;
      g.tireFilterA.frequency.setTargetAtTime(1780 + rpm * 260 + flutter, now, 0.03);
      g.tireFilterB.frequency.setTargetAtTime(2560 + rpm * 310 - flutter * 0.7, now, 0.03);
      g.tireGain.gain.setTargetAtTime(screechGain, now, 0.04);
    } else {
      g.tireGain.gain.setTargetAtTime(0.0, now, 0.05);
    }
  }

  public updateWindRush(intensity: number): void {
    if (!this.ctx || !this.ambienceGraph) {
      return;
    }

    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, intensity));
    const g = this.ambienceGraph;

    g.windFilterLow.frequency.setTargetAtTime(240 + clamped * 820, now, 0.08);
    g.windFilterHigh.frequency.setTargetAtTime(680 + clamped * 1950, now, 0.08);
    g.windGain.gain.setTargetAtTime(clamped * clamped * 0.24, now, 0.09);
  }

  public updateRainAmbience(intensity: number): void {
    if (!this.ctx || !this.ambienceGraph) {
      return;
    }

    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, intensity));
    this.ambienceGraph.rainBand.frequency.setTargetAtTime(1650 + clamped * 650, now, 0.15);
    this.ambienceGraph.rainGain.gain.setTargetAtTime(clamped * 0.2, now, 0.2);
  }

  public updateSpaceThruster(active: boolean, thrustNormalized: number, warpActive = false): void {
    if (!this.ctx || !this.spaceGraph) {
      return;
    }

    const now = this.ctx.currentTime;
    const g = this.spaceGraph;

    if (!active) {
      g.thrusterGain.gain.setTargetAtTime(0.0, now, 0.1);
      g.warpGain.gain.setTargetAtTime(0.0, now, 0.12);
      return;
    }

    const thrust = Math.max(0, Math.min(1, thrustNormalized));
    g.rumbleOsc.frequency.setTargetAtTime(42 + thrust * 74, now, 0.06);
    g.plasmaFilter.frequency.setTargetAtTime(160 + thrust * 760, now, 0.06);
    g.thrusterGain.gain.setTargetAtTime(0.05 + thrust * 0.19, now, 0.07);

    if (warpActive) {
      g.warpFilter.frequency.setTargetAtTime(2600, now, 0.18);
      g.warpGain.gain.setTargetAtTime(0.14, now, 0.16);
    } else {
      g.warpFilter.frequency.setTargetAtTime(650, now, 0.15);
      g.warpGain.gain.setTargetAtTime(0.0, now, 0.14);
    }
  }

  public playCannonFire(distance = 0): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus || !this.pinkNoiseBuffer) {
      return;
    }

    const now = this.ctx.currentTime;
    const atten = 1 / (1 + Math.max(0, distance) * 0.018);
    const airCutoff = Math.max(380, 3800 - Math.max(0, distance) * 14);

    // Sub-bass cannon punch
    this.playPitchDropThump(105, 24, 0.52, 0.48 * atten, 'sine', now);

    // Explosive gunpowder blast roar
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.pinkNoiseBuffer;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(airCutoff, now);
    lowpass.frequency.exponentialRampToValueAtTime(160, now + 0.95);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.createSoftClipCurve(5);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.46 * atten, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

    noise.connect(shaper);
    shaper.connect(lowpass);
    lowpass.connect(env);
    env.connect(this.sfxBus);
    if (this.sfxReverbSend) {
      env.connect(this.sfxReverbSend);
    }

    noise.start(now, 0, 1.1);
  }

  public playLaserPulse(): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus) {
      return;
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1680, now);
    osc.frequency.exponentialRampToValueAtTime(185, now + 0.16);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(420, now);
    modGain.gain.setValueAtTime(320, now);
    modGain.gain.exponentialRampToValueAtTime(12, now + 0.15);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    filter.Q.value = 2.4;

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.24, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxBus);

    mod.start(now);
    osc.start(now);
    mod.stop(now + 0.19);
    osc.stop(now + 0.19);
  }

  public playSwordSlash(): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus || !this.whiteNoiseBuffer) {
      return;
    }

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteNoiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3.2;
    bp.frequency.setValueAtTime(520, now);
    bp.frequency.exponentialRampToValueAtTime(2900, now + 0.075);
    bp.frequency.exponentialRampToValueAtTime(680, now + 0.21);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.24, now + 0.045);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    src.connect(bp);
    bp.connect(env);
    env.connect(this.sfxBus);
    src.start(now, Math.random(), 0.24);

    // Subtle steel harmonic gleam
    const gleam = this.ctx.createOscillator();
    const gleamGain = this.ctx.createGain();
    gleam.type = 'sine';
    gleam.frequency.setValueAtTime(2850, now);
    gleam.frequency.exponentialRampToValueAtTime(1420, now + 0.14);
    gleamGain.gain.setValueAtTime(0.055, now);
    gleamGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    gleam.connect(gleamGain);
    gleamGain.connect(this.sfxBus);
    gleam.start(now);
    gleam.stop(now + 0.16);
  }

  public playBowShot(): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus) {
      return;
    }

    const now = this.ctx.currentTime;
    // Plucked taut bowstring
    const strOsc = this.ctx.createOscillator();
    const strGain = this.ctx.createGain();
    strOsc.type = 'triangle';
    strOsc.frequency.setValueAtTime(192, now);
    strOsc.frequency.exponentialRampToValueAtTime(128, now + 0.18);
    strGain.gain.setValueAtTime(0.22, now);
    strGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    strOsc.connect(strGain);
    strGain.connect(this.sfxBus);
    strOsc.start(now);
    strOsc.stop(now + 0.21);

    // Arrow fletching air zip
    this.playFilteredNoiseBurst(3800, 2.6, 0.14, 0.15, 'highpass', now + 0.01);
  }

  public playMagicCast(element: 'fire' | 'ice'): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus || !this.pinkNoiseBuffer) {
      return;
    }

    const now = this.ctx.currentTime;

    if (element === 'fire') {
      const roar = this.ctx.createBufferSource();
      roar.buffer = this.pinkNoiseBuffer;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.6;
      bp.frequency.setValueAtTime(220, now);
      bp.frequency.exponentialRampToValueAtTime(1450, now + 0.16);
      bp.frequency.exponentialRampToValueAtTime(340, now + 0.58);

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.32, now + 0.05);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);

      roar.connect(bp);
      bp.connect(env);
      env.connect(this.sfxBus);
      roar.start(now, Math.random(), 0.65);

      this.playPitchDropThump(160, 48, 0.35, 0.24, 'sawtooth', now);
      return;
    }

    // Crystalline frost cascade for 'ice'
    const crystalNotes = [1567.98, 2093.0, 2637.02, 3520.0];
    for (let i = 0; i < crystalNotes.length; i++) {
      const t = now + i * 0.042;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(crystalNotes[i], t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(g);
      g.connect(this.sfxBus);
      if (this.sfxReverbSend) {
        g.connect(this.sfxReverbSend);
      }
      osc.start(t);
      osc.stop(t + 0.45);
    }
    this.playFilteredNoiseBurst(5200, 3.5, 0.32, 0.09, 'highpass', now);
  }

  public playTreeChop(fell = false): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus) {
      return;
    }

    const now = this.ctx.currentTime;
    // Solid axe-into-timber thwack
    this.playPitchDropThump(165, 62, 0.11, 0.34, 'triangle', now);
    this.playFilteredNoiseBurst(860, 4.4, 0.09, 0.24, 'bandpass', now);

    if (fell) {
      // Creaking trunk fiber + leafy canopy crash
      const creak = this.ctx.createOscillator();
      const creakFilter = this.ctx.createBiquadFilter();
      const creakGain = this.ctx.createGain();
      creak.type = 'sawtooth';
      creak.frequency.setValueAtTime(118, now + 0.14);
      creak.frequency.exponentialRampToValueAtTime(48, now + 0.95);
      creakFilter.type = 'bandpass';
      creakFilter.frequency.value = 420;
      creakFilter.Q.value = 4.5;
      creakGain.gain.setValueAtTime(0.001, now + 0.14);
      creakGain.gain.linearRampToValueAtTime(0.16, now + 0.3);
      creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      creak.connect(creakFilter);
      creakFilter.connect(creakGain);
      creakGain.connect(this.sfxBus);
      creak.start(now + 0.14);
      creak.stop(now + 1.02);

      this.playFilteredNoiseBurst(1600, 0.9, 0.75, 0.26, 'bandpass', now + 0.85);
      this.playPitchDropThump(88, 28, 0.42, 0.35, 'sine', now + 0.9);
    }
  }

  public playBuildSnap(): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus) {
      return;
    }

    const now = this.ctx.currentTime;
    this.playPitchDropThump(280, 160, 0.055, 0.2, 'triangle', now);
    this.playPitchDropThump(540, 380, 0.065, 0.18, 'sine', now + 0.038);
    this.playFilteredNoiseBurst(1900, 3.8, 0.045, 0.11, 'bandpass', now + 0.035);
  }

  public playHorn(): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus) {
      return;
    }

    const now = this.ctx.currentTime;
    const freqs = [415.3, 523.25]; // Dual-tone automotive horn (Ab4 + C5)
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1750;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.22, now + 0.018);
    env.gain.setValueAtTime(0.2, now + 0.28);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    lp.connect(env);
    env.connect(this.sfxBus);

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(lp);
      osc.start(now);
      osc.stop(now + 0.44);
    }
  }

  public playSonicBoom(): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus || !this.pinkNoiseBuffer) {
      return;
    }

    const now = this.ctx.currentTime;
    // N-wave shock crack + atmospheric sub rumble
    this.playPitchDropThump(135, 19, 0.85, 0.52, 'sine', now);
    this.playFilteredNoiseBurst(2200, 0.8, 0.12, 0.38, 'bandpass', now);

    const boomNoise = this.ctx.createBufferSource();
    boomNoise.buffer = this.pinkNoiseBuffer;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, now);
    lp.frequency.exponentialRampToValueAtTime(95, now + 1.4);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.45, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

    boomNoise.connect(lp);
    lp.connect(env);
    env.connect(this.sfxBus);
    if (this.sfxReverbSend) {
      env.connect(this.sfxReverbSend);
    }
    boomNoise.start(now, 0, 1.5);
  }

  public playUIClick(): void {
    this.unlock();
    if (!this.ctx || !this.sfxBus) {
      return;
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.exponentialRampToValueAtTime(2240, now + 0.038);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.09, now + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);

    osc.connect(env);
    env.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.052);
  }
}
