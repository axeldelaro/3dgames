import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { IPostProcessingPipeline, QualityConfig } from '../types';

const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DEPTH_SSAO_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uRadius;
uniform float uAOIntensity;

varying vec2 vUv;

float linearizeDepth(float rawDepth) {
  float z = rawDepth * 2.0 - 1.0;
  return (2.0 * uCameraNear * uCameraFar) /
    max(uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear), 0.0001);
}

float interleavedGradientNoise(vec2 pixelCoord) {
  return fract(52.9829189 * fract(dot(pixelCoord, vec2(0.06711056, 0.00583715))));
}

void main() {
  vec4 baseCol = texture2D(tDiffuse, vUv);
  float rawCenter = texture2D(tDepth, vUv).r;

  // Skip sky dome & far clear plane completely
  if (rawCenter >= 0.99992) {
    gl_FragColor = baseCol;
    return;
  }

  float dC = linearizeDepth(rawCenter);
  if (dC > 240.0) {
    gl_FragColor = baseCol;
    return;
  }

  vec2 texel = 1.0 / max(uResolution, vec2(1.0));

  // Edge-preserving local depth slope estimation (avoids silhouette halos)
  float dL = linearizeDepth(texture2D(tDepth, vUv - vec2(texel.x, 0.0)).r);
  float dR = linearizeDepth(texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r);
  float dD = linearizeDepth(texture2D(tDepth, vUv - vec2(0.0, texel.y)).r);
  float dU = linearizeDepth(texture2D(tDepth, vUv + vec2(0.0, texel.y)).r);

  float slopeX = (abs(dR - dC) < abs(dC - dL)) ? (dR - dC) : (dC - dL);
  float slopeY = (abs(dU - dC) < abs(dC - dD)) ? (dU - dC) : (dC - dD);

  float rotAngle = interleavedGradientNoise(gl_FragCoord.xy) * 6.2831853;
  float cosA = cos(rotAngle);
  float sinA = sin(rotAngle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);

  // Perspective-scaled screen-space radius in pixels
  float radiusPx = clamp((uRadius * uResolution.y * 0.45) / max(dC, 0.75), 2.0, 26.0);
  float bias = 0.025 + dC * 0.0022;
  float occlusion = 0.0;

  // 8-tap Golden-Angle Vogel spiral
  for (int i = 0; i < 8; i++) {
    float fi = float(i) + 0.5;
    float r = sqrt(fi / 8.0);
    float theta = fi * 2.39996323;
    vec2 dir = rot * vec2(cos(theta), sin(theta));
    vec2 offsetPx = dir * (r * radiusPx);
    vec2 sampleUv = clamp(vUv + offsetPx * texel, vec2(0.001), vec2(0.999));

    float rawSample = texture2D(tDepth, sampleUv).r;
    if (rawSample >= 0.99992) {
      continue;
    }

    float sampleZ = linearizeDepth(rawSample);
    float expectedZ = dC + slopeX * offsetPx.x + slopeY * offsetPx.y;
    float deltaZ = expectedZ - sampleZ;

    float rangeCheck = smoothstep(0.0, 1.0, (uRadius * 2.6) / (abs(dC - sampleZ) + 0.05));
    float sampleOcc = (deltaZ > bias ? smoothstep(bias, bias + 0.45, deltaZ) : 0.0) * rangeCheck;
    occlusion += sampleOcc;
  }

  occlusion /= 8.0;
  float distFade = 1.0 - smoothstep(110.0, 240.0, dC);
  float luminance = dot(baseCol.rgb, vec3(0.2126, 0.7152, 0.0722));
  // Preserve HDR highlights and emissive light sources
  float highlightProtect = 1.0 - smoothstep(0.65, 2.2, luminance) * 0.80;
  float aoFactor = 1.0 - clamp(occlusion * uAOIntensity * distFade * highlightProtect, 0.0, 0.72);

  gl_FragColor = vec4(baseCol.rgb * aoFactor, baseCol.a);
}
`;

export const CinematicOpticsShader = {
  name: 'CinematicOpticsShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uExposure: { value: 1.05 },
    uSpeedFactor: { value: 0.0 },
    uEnableChromatic: { value: 1.0 },
    uVignetteStrength: { value: 0.34 }
  },
  vertexShader: FULLSCREEN_VERTEX_SHADER,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uSpeedFactor;
    uniform float uEnableChromatic;
    uniform float uVignetteStrength;

    varying vec2 vUv;

    // Stephen Hill's ACES Filmic RRT + ODT fit (matches Three.js ACESFilmicToneMapping)
    vec3 RRTAndODTFit(vec3 v) {
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
    }

    vec3 acesFilmic(vec3 color) {
      // sRGB / Rec.709 -> ACES AP1 (transposed column-major for GLSL mat3)
      const mat3 ACESInputMat = mat3(
        0.59719, 0.07600, 0.02840,
        0.35458, 0.90834, 0.13383,
        0.04823, 0.01566, 0.83777
      );
      // ACES AP1 -> sRGB / Rec.709
      const mat3 ACESOutputMat = mat3(
         1.60475, -0.10208, -0.00327,
        -0.53108,  1.10813, -0.07276,
        -0.07367, -0.00605,  1.07602
      );

      color *= 1.0 / 0.6;
      color = ACESInputMat * color;
      color = RRTAndODTFit(color);
      color = ACESOutputMat * color;
      return clamp(color, 0.0, 1.0);
    }

    vec3 linearToSRGB(vec3 linearRGB) {
      vec3 higher = pow(max(linearRGB, vec3(0.0)), vec3(1.0 / 2.4)) * 1.055 - 0.055;
      vec3 lower = max(linearRGB, vec3(0.0)) * 12.92;
      return mix(higher, lower, vec3(
        linearRGB.r <= 0.0031308 ? 1.0 : 0.0,
        linearRGB.g <= 0.0031308 ? 1.0 : 0.0,
        linearRGB.b <= 0.0031308 ? 1.0 : 0.0
      ));
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);

      vec3 hdrColor;
      if (uEnableChromatic > 0.5) {
        // Subtle optical dispersion at rest + dynamic radial shift at high vehicular/Mach/warp speed
        float caStrength = 0.0018 + uSpeedFactor * 0.024;
        vec2 disp = centered * r2 * caStrength;
        vec2 uvR = clamp(vUv + disp, vec2(0.001), vec2(0.999));
        vec2 uvB = clamp(vUv - disp, vec2(0.001), vec2(0.999));
        float r = texture2D(tDiffuse, uvR).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, uvB).b;
        hdrColor = vec3(r, g, b);
      } else {
        hdrColor = texture2D(tDiffuse, vUv).rgb;
      }

      // Apply renderer exposure & ACES Filmic curve
      vec3 mapped = acesFilmic(max(hdrColor, vec3(0.0)) * uExposure);

      // Subtle cinematic S-curve contrast & saturation polish
      mapped = mix(mapped, mapped * mapped * (3.0 - 2.0 * mapped), 0.14);
      float luma = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
      mapped = clamp(mix(vec3(luma), mapped, 1.06), 0.0, 1.0);

      // Natural optical lens vignette (slightly intensified under high-G speed)
      float vigAmount = uVignetteStrength + uSpeedFactor * 0.16;
      float vignette = clamp(1.0 - r2 * (vigAmount * 2.2), 0.25, 1.0);
      mapped *= vignette;

      gl_FragColor = vec4(linearToSRGB(mapped), 1.0);
    }
  `
};

class DepthSSAOPass extends ShaderPass {
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera, width: number, height: number) {
    super({
      name: 'OmniverseDepthSSAOPass',
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uResolution: { value: new THREE.Vector2(width, height) },
        uCameraNear: { value: camera.near },
        uCameraFar: { value: camera.far },
        uRadius: { value: 0.85 },
        uAOIntensity: { value: 1.15 }
      },
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: DEPTH_SSAO_FRAGMENT_SHADER
    });
    this.camera = camera;
    this.material.toneMapped = false;
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  override setSize(width: number, height: number): void {
    (this.uniforms.uResolution.value as THREE.Vector2).set(width, height);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime?: number,
    maskActive?: boolean
  ): void {
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    this.uniforms.uCameraNear.value = this.camera.near;
    this.uniforms.uCameraFar.value = this.camera.far;
    super.render(renderer, writeBuffer, readBuffer, deltaTime ?? 0, maskActive ?? false);
  }
}

/**
 * HDR WebGL2 Post-Processing Pipeline combining RenderPass, single-pass hardware-depth SSAO,
 * UnrealBloomPass, and CinematicOpticsPass (ACES Filmic grading, speed-reactive Chromatic
 * Aberration, and Optical Vignette), with automatic direct-render bypass on MOBILE_PERF.
 */
export class PostProcessingPipeline implements IPostProcessingPipeline {
  private readonly renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly ssaoPass: DepthSSAOPass;
  private readonly bloomPass: UnrealBloomPass;
  private readonly opticsPass: ShaderPass;

  private targetSpeedFactor = 0.0;
  private smoothedSpeedFactor = 0.0;
  private bypassComposer = false;
  private logicalWidth = 1280;
  private logicalHeight = 720;
  private currentPixelRatio = 1.0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    initialQuality?: QualityConfig
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Configure physical renderer defaults
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const sizeVec = this.renderer.getSize(new THREE.Vector2());
    this.logicalWidth = Math.max(1, sizeVec.width);
    this.logicalHeight = Math.max(1, sizeVec.height);
    this.currentPixelRatio = this.renderer.getPixelRatio();

    this.composer = new EffectComposer(this.renderer);
    this.attachDepthTexture(this.composer.renderTarget1);
    this.attachDepthTexture(this.composer.renderTarget2);

    const effW = Math.max(1, Math.floor(this.logicalWidth * this.currentPixelRatio));
    const effH = Math.max(1, Math.floor(this.logicalHeight * this.currentPixelRatio));

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.ssaoPass = new DepthSSAOPass(this.camera, effW, effH);
    this.composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(effW, effH), 0.34, 0.52, 0.88);
    this.composer.addPass(this.bloomPass);

    this.opticsPass = new ShaderPass(CinematicOpticsShader);
    this.opticsPass.material.toneMapped = false;
    this.composer.addPass(this.opticsPass);

    if (initialQuality) {
      this.applyQuality(initialQuality);
    }
  }

  private attachDepthTexture(rt: THREE.WebGLRenderTarget): void {
    const depthTex = new THREE.DepthTexture(rt.width, rt.height);
    depthTex.format = THREE.DepthFormat;
    depthTex.type = THREE.UnsignedIntType;
    depthTex.minFilter = THREE.NearestFilter;
    depthTex.magFilter = THREE.NearestFilter;
    depthTex.generateMipmaps = false;
    rt.depthBuffer = true;
    rt.depthTexture = depthTex;
  }

  setSceneAndCamera(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.scene = scene;
    this.camera = camera;
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.ssaoPass.setCamera(camera);
  }

  setSpeedFactor(normalizedSpeed: number): void {
    this.targetSpeedFactor = Math.max(0.0, Math.min(1.0, normalizedSpeed));
  }

  applyQuality(config: QualityConfig): void {
    this.currentPixelRatio = config.pixelRatio;
    this.renderer.setPixelRatio(config.pixelRatio);
    this.composer.setPixelRatio(config.pixelRatio);
    this.composer.setSize(this.logicalWidth, this.logicalHeight);

    this.ssaoPass.enabled = config.enableSSAO;
    this.bloomPass.enabled = config.enableBloom;
    this.opticsPass.uniforms.uEnableChromatic.value = config.enableChromatic ? 1.0 : 0.0;

    if (config.preset === 'ULTRA') {
      this.ssaoPass.uniforms.uAOIntensity.value = 1.2;
      this.bloomPass.strength = 0.36;
    } else if (config.preset === 'HIGH') {
      this.ssaoPass.uniforms.uAOIntensity.value = 1.0;
      this.bloomPass.strength = 0.30;
    } else {
      this.ssaoPass.uniforms.uAOIntensity.value = 0.85;
      this.bloomPass.strength = 0.24;
    }

    // Bypass EffectComposer on MOBILE_PERF when heavy passes are disabled for locked 60 FPS
    this.bypassComposer =
      config.preset === 'MOBILE_PERF' &&
      !config.enableBloom &&
      !config.enableSSAO &&
      !config.enableChromatic;

    // Synchronize shadow map resolution across active shadow-casting lights in the scene
    const targetShadowSize = Math.max(512, Math.min(4096, Math.round(config.shadowMapSize)));
    this.scene.traverse((obj) => {
      if ((obj as THREE.Light).isLight) {
        const light = obj as THREE.Light & { shadow?: THREE.LightShadow };
        if (light.castShadow && light.shadow) {
          if (
            light.shadow.mapSize.x !== targetShadowSize ||
            light.shadow.mapSize.y !== targetShadowSize
          ) {
            light.shadow.mapSize.set(targetShadowSize, targetShadowSize);
            if (light.shadow.map) {
              light.shadow.map.dispose();
              light.shadow.map = null;
            }
          }
        }
      }
    });
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.logicalWidth = Math.max(1, Math.floor(width));
    this.logicalHeight = Math.max(1, Math.floor(height));
    this.currentPixelRatio = Math.max(0.5, pixelRatio);

    this.renderer.setPixelRatio(this.currentPixelRatio);
    this.renderer.setSize(this.logicalWidth, this.logicalHeight, false);
    this.composer.setPixelRatio(this.currentPixelRatio);
    this.composer.setSize(this.logicalWidth, this.logicalHeight);
  }

  render(dt: number): void {
    const safeDt = Math.max(0.0, Math.min(0.1, dt));
    const lerpAlpha = 1.0 - Math.exp(-safeDt * 8.0);
    this.smoothedSpeedFactor += (this.targetSpeedFactor - this.smoothedSpeedFactor) * lerpAlpha;

    if (this.bypassComposer) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.opticsPass.uniforms.uSpeedFactor.value = this.smoothedSpeedFactor;
    this.opticsPass.uniforms.uExposure.value = this.renderer.toneMappingExposure;
    this.composer.render(safeDt);
  }

  dispose(): void {
    this.composer.renderTarget1.depthTexture?.dispose();
    this.composer.renderTarget2.depthTexture?.dispose();
    this.ssaoPass.dispose();
    this.bloomPass.dispose();
    this.opticsPass.dispose();
    this.composer.dispose();
  }
}
