import * as THREE from 'three';
import type { PBRTextureSet } from '../types';

export interface GerstnerWaveConfig {
  steepness: number;
  wavelength: number;
  dirX: number;
  dirZ: number;
  speed: number;
}

export const DEFAULT_OCEAN_WAVES: GerstnerWaveConfig[] = [
  { steepness: 0.24, wavelength: 48.0, dirX: 0.88, dirZ: 0.47, speed: 1.05 },
  { steepness: 0.18, wavelength: 26.0, dirX: 0.42, dirZ: -0.91, speed: 1.12 },
  { steepness: 0.14, wavelength: 13.5, dirX: -0.76, dirZ: 0.65, speed: 1.18 },
  { steepness: 0.10, wavelength: 6.8, dirX: 0.25, dirZ: 0.97, speed: 1.25 }
];

const GRAVITY = 9.81;
const TWO_PI = Math.PI * 2.0;

function evaluateGerstnerDisplacementAndNormal(
  rx: number,
  rz: number,
  time: number,
  waves: readonly GerstnerWaveConfig[]
): { dx: number; dy: number; dz: number; nx: number; ny: number; nz: number } {
  let dxSum = 0.0;
  let dySum = 0.0;
  let dzSum = 0.0;

  let dPdxX = 1.0;
  let dPdxY = 0.0;
  let dPdxZ = 0.0;

  let dPdzX = 0.0;
  let dPdzY = 0.0;
  let dPdzZ = 1.0;

  const count = Math.min(4, waves.length);
  for (let i = 0; i < count; i++) {
    const w = waves[i];
    const dirLen = Math.hypot(w.dirX, w.dirZ) || 1.0;
    const wx = w.dirX / dirLen;
    const wz = w.dirZ / dirLen;

    const wavelength = Math.max(0.5, w.wavelength);
    const k = TWO_PI / wavelength;
    const omega = Math.sqrt(GRAVITY * k) * w.speed;
    const q = w.steepness;
    const amp = q / k;

    const phase = k * (wx * rx + wz * rz) - omega * time;
    const s = Math.sin(phase);
    const c = Math.cos(phase);

    dxSum += wx * amp * c;
    dySum += amp * s;
    dzSum += wz * amp * c;

    dPdxX -= q * wx * wx * s;
    dPdxY += q * wx * c;
    dPdxZ -= q * wx * wz * s;

    dPdzX -= q * wx * wz * s;
    dPdzY += q * wz * c;
    dPdzZ -= q * wz * wz * s;
  }

  // Exact surface normal = normalize(cross(dP/dz, dP/dx)) pointing +Y
  const cx = dPdzY * dPdxZ - dPdzZ * dPdxY;
  const cy = dPdzZ * dPdxX - dPdzX * dPdxZ;
  const cz = dPdzX * dPdxY - dPdzY * dPdxX;
  const invLen = 1.0 / (Math.hypot(cx, cy, cz) || 1.0);

  return {
    dx: dxSum,
    dy: dySum,
    dz: dzSum,
    nx: cx * invLen,
    ny: cy * invLen,
    nz: cz * invLen
  };
}

/**
 * Exact CPU match to GPU 4-wave Gerstner vertex displacement (including 2-step Picard
 * horizontal inversion so world-space queries align crest-for-crest with displaced vertices).
 */
export function sampleGerstnerOcean(
  x: number,
  z: number,
  time: number,
  waves: GerstnerWaveConfig[] = DEFAULT_OCEAN_WAVES
): { height: number; normal: THREE.Vector3 } {
  let rx = x;
  let rz = z;

  // Invert horizontal Gerstner shift so (rx + dx, rz + dz) lands on world (x, z)
  for (let iter = 0; iter < 2; iter++) {
    const est = evaluateGerstnerDisplacementAndNormal(rx, rz, time, waves);
    rx = x - est.dx;
    rz = z - est.dz;
  }

  const res = evaluateGerstnerDisplacementAndNormal(rx, rz, time, waves);
  return {
    height: res.dy,
    normal: new THREE.Vector3(res.nx, res.ny, res.nz)
  };
}

function packWaveUniforms(waves: readonly GerstnerWaveConfig[]): {
  waveDirSteepLen: THREE.Vector4[];
  waveSpeedVec: THREE.Vector4;
} {
  const dirs: THREE.Vector4[] = [];
  const speeds = [0, 0, 0, 0];

  for (let i = 0; i < 4; i++) {
    const w = waves[i] ?? { steepness: 0.0, wavelength: 10.0, dirX: 1.0, dirZ: 0.0, speed: 1.0 };
    const len = Math.hypot(w.dirX, w.dirZ) || 1.0;
    dirs.push(
      new THREE.Vector4(
        w.dirX / len,
        w.dirZ / len,
        w.steepness,
        Math.max(0.5, w.wavelength)
      )
    );
    speeds[i] = w.speed;
  }

  return {
    waveDirSteepLen: dirs,
    waveSpeedVec: new THREE.Vector4(speeds[0], speeds[1], speeds[2], speeds[3])
  };
}

const OCEAN_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform vec4 uWaves[4]; // xy = normalized dir, z = steepness, w = wavelength
uniform vec4 uWaveSpeeds;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vWaveHeight;
varying float vJacobianFoam;

const float TWO_PI = 6.28318530718;
const float GRAVITY = 9.81;

void main() {
  #ifdef USE_INSTANCING
    vec4 worldBase = modelMatrix * instanceMatrix * vec4(position, 1.0);
  #else
    vec4 worldBase = modelMatrix * vec4(position, 1.0);
  #endif

  vec2 restXZ = worldBase.xz;
  vec3 disp = vec3(0.0);

  vec3 dPdx = vec3(1.0, 0.0, 0.0);
  vec3 dPdz = vec3(0.0, 0.0, 1.0);
  float jacobianDiag = 1.0;

  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    float speed = (i == 0) ? uWaveSpeeds.x : (i == 1) ? uWaveSpeeds.y : (i == 2) ? uWaveSpeeds.z : uWaveSpeeds.w;
    vec2 dir = w.xy;
    float q = w.z;
    float k = TWO_PI / max(w.w, 0.5);
    float omega = sqrt(GRAVITY * k) * speed;
    float amp = q / k;

    float phase = k * dot(dir, restXZ) - omega * uTime;
    float s = sin(phase);
    float c = cos(phase);

    disp.x += dir.x * amp * c;
    disp.y += amp * s;
    disp.z += dir.y * amp * c;

    dPdx.x -= q * dir.x * dir.x * s;
    dPdx.y += q * dir.x * c;
    dPdx.z -= q * dir.x * dir.y * s;

    dPdz.x -= q * dir.x * dir.y * s;
    dPdz.y += q * dir.y * c;
    dPdz.z -= q * dir.y * dir.y * s;

    jacobianDiag -= q * s * 0.45;
  }

  vec3 worldPos = worldBase.xyz + disp;
  vec3 analyticalNormal = normalize(cross(dPdz, dPdx));

  vWorldPos = worldPos;
  vWorldNormal = analyticalNormal;
  vWaveHeight = disp.y;
  vJacobianFoam = clamp(1.0 - jacobianDiag, 0.0, 1.0);

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
`;

const OCEAN_FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uCameraPos;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vWaveHeight;
varying float vJacobianFoam;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm2D(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    sum += amp * noise2D(p);
    p = rot * p * 2.05 + vec2(19.3, 41.7);
    amp *= 0.5;
  }
  return sum;
}

// Animated dual-grid cellular caustics pattern
float causticsPattern(vec2 uv, float t) {
  vec2 p1 = uv * 0.55 + vec2(t * 0.18, -t * 0.14);
  vec2 p2 = uv * 0.72 + vec2(-t * 0.15, t * 0.21);
  float n1 = abs(noise2D(p1 * 3.2) - 0.5) * 2.0;
  float n2 = abs(noise2D(p2 * 3.6 + vec2(7.4, 3.1)) - 0.5) * 2.0;
  float ridges = pow(1.0 - min(n1, n2), 4.5);
  return ridges;
}

void main() {
  vec3 viewVec = uCameraPos - vWorldPos;
  float dist = length(viewVec);
  vec3 V = viewVec / max(dist, 0.0001);
  vec3 L = normalize(uSunDirection);

  // Fine capillary micro-ripples attenuated over distance to avoid aliasing
  float microFade = 1.0 - smoothstep(25.0, 260.0, dist);
  vec2 wp = vWorldPos.xz;
  float r1 = noise2D(wp * 1.45 + vec2(uTime * 0.85, uTime * 0.42));
  float r2 = noise2D(wp * 3.10 - vec2(uTime * 0.62, uTime * 0.95));
  vec3 ripplePerturb = vec3((r1 - 0.5) * 0.18 + (r2 - 0.5) * 0.10, 0.0, (r2 - 0.5) * 0.18 - (r1 - 0.5) * 0.10) * microFade;

  vec3 N = normalize(vWorldNormal + ripplePerturb);
  float NdotV = max(dot(N, V), 0.001);
  float NdotL = max(dot(N, L), 0.0);

  // Schlick Fresnel (water IOR 1.333 -> F0 = 0.02)
  float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);

  // Sky reflection gradient adapting to sun elevation
  float sunElev = L.y;
  float dayAmt = smoothstep(-0.08, 0.28, sunElev);
  float sunsetAmt = exp(-pow((sunElev - 0.02) / 0.16, 2.0));
  vec3 reflDir = reflect(-V, N);
  float reflUp = clamp(reflDir.y, 0.0, 1.0);

  vec3 skyZenith = mix(vec3(0.01, 0.02, 0.06), vec3(0.08, 0.28, 0.65), dayAmt);
  vec3 skyHorizon = mix(vec3(0.03, 0.05, 0.11), vec3(0.46, 0.72, 0.94), dayAmt);
  skyHorizon += vec3(1.05, 0.42, 0.14) * sunsetAmt * 0.85;
  vec3 skyReflection = mix(skyHorizon, skyZenith, pow(reflUp, 0.65));

  // Depth absorption & translucent emerald wave-crest subsurface scattering
  float shallowMix = clamp(pow(1.0 - NdotV, 1.8) * 0.35 + smoothstep(-0.8, 1.8, vWaveHeight) * 0.45, 0.0, 1.0);
  vec3 waterBody = mix(uDeepColor, uShallowColor, shallowMix) * (0.22 + 0.78 * dayAmt + 0.18 * sunsetAmt);

  float backLight = pow(max(dot(V, -L + N * 0.55), 0.0), 3.2);
  float crestMask = smoothstep(0.15, 1.65, vWaveHeight);
  vec3 sssColor = uShallowColor * 1.65 * backLight * (0.35 + 0.65 * crestMask) * max(dayAmt, sunsetAmt * 0.6);

  // Procedural underwater solar caustics
  float caustics = causticsPattern(wp + N.xz * 1.4, uTime) * NdotL * (1.0 - smoothstep(15.0, 140.0, dist));
  waterBody += uShallowColor * caustics * 0.55 * dayAmt;

  vec3 color = mix(waterBody + sssColor, skyReflection, clamp(fresnel, 0.0, 0.92));

  // Dual-lobe solar specular glitter (tight diamond sparkles + warm sun path)
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float sunVis = smoothstep(-0.04, 0.08, sunElev);
  vec3 sunSpecTint = mix(vec3(1.2, 0.52, 0.22), vec3(1.0, 0.97, 0.90), dayAmt);
  float specSharp = pow(NdotH, 340.0) * 4.2;
  float specBroad = pow(NdotH, 36.0) * 0.24;
  color += sunSpecTint * (specSharp + specBroad) * sunVis;

  // Turbulent crest & shoreline whitecap foam
  float foamTex = fbm2D(wp * 0.48 + vec2(uTime * 0.16, -uTime * 0.12));
  float slopeSteep = 1.0 - clamp(vWorldNormal.y, 0.0, 1.0);
  float crestSignal = smoothstep(0.52, 1.45, vWaveHeight + slopeSteep * 1.9 + vJacobianFoam * 0.65);
  float lacyFoam = smoothstep(0.42, 0.72, crestSignal * 0.75 + foamTex * 0.52) * crestSignal;
  vec3 foamColor = mix(vec3(0.18, 0.22, 0.30), vec3(0.95, 0.97, 1.0), dayAmt + sunsetAmt * 0.4);
  color = mix(color, foamColor, clamp(lacyFoam * 0.88, 0.0, 0.92));

  // Aerial perspective horizon blend
  float haze = 1.0 - exp(-dist * 0.00045);
  color = mix(color, skyHorizon, clamp(haze, 0.0, 0.88));

  gl_FragColor = vec4(max(color, vec3(0.0)), 0.96);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createGerstnerOceanMaterial(options?: {
  sunDirection?: THREE.Vector3;
  deepColor?: THREE.ColorRepresentation;
  shallowColor?: THREE.ColorRepresentation;
  waves?: GerstnerWaveConfig[];
}): THREE.ShaderMaterial {
  const packed = packWaveUniforms(options?.waves ?? DEFAULT_OCEAN_WAVES);
  const sunDir = (options?.sunDirection ?? new THREE.Vector3(0.45, 0.75, 0.48)).clone().normalize();
  const deepCol = new THREE.Color(options?.deepColor ?? 0x041e34);
  const shallowCol = new THREE.Color(options?.shallowColor ?? 0x0d8a96);

  return new THREE.ShaderMaterial({
    name: 'GerstnerOceanMaterial',
    vertexShader: OCEAN_VERTEX_SHADER,
    fragmentShader: OCEAN_FRAGMENT_SHADER,
    transparent: true,
    side: THREE.FrontSide,
    toneMapped: true,
    fog: false,
    uniforms: {
      uTime: { value: 0.0 },
      uWaves: { value: packed.waveDirSteepLen },
      uWaveSpeeds: { value: packed.waveSpeedVec },
      uSunDirection: { value: sunDir },
      uCameraPos: { value: new THREE.Vector3(0, 10, 0) },
      uDeepColor: { value: deepCol },
      uShallowColor: { value: shallowCol }
    }
  });
}

export function updateOceanMaterial(
  mat: THREE.ShaderMaterial,
  time: number,
  sunDir: THREE.Vector3,
  cameraPos: THREE.Vector3
): void {
  if (mat.uniforms.uTime) {
    mat.uniforms.uTime.value = time;
  }
  if (mat.uniforms.uSunDirection) {
    (mat.uniforms.uSunDirection.value as THREE.Vector3).copy(sunDir).normalize();
  }
  if (mat.uniforms.uCameraPos) {
    (mat.uniforms.uCameraPos.value as THREE.Vector3).copy(cameraPos);
  }
}

/**
 * Injects sinusoidal + gusting vertex wind sway into a Three.js MeshStandardMaterial via
 * onBeforeCompile while preserving full PBR shading, instancing, and shadow maps.
 */
export function applyWindSwayToMaterial(
  material: THREE.MeshStandardMaterial,
  strength = 0.35,
  heightScale = 4.0
): { update(time: number): void } {
  const uWindTime = { value: 0.0 };
  const uWindStrength = { value: strength };
  const uWindHeightScale = { value: Math.max(0.1, heightScale) };

  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  const cacheTag = `omniverse_wind_${strength.toFixed(3)}_${heightScale.toFixed(2)}`;
  material.customProgramCacheKey = (): string => cacheTag;

  material.onBeforeCompile = (
    shader: THREE.WebGLProgramParametersWithUniforms,
    renderer: THREE.WebGLRenderer
  ): void => {
    previousOnBeforeCompile(shader, renderer);

    shader.uniforms.uWindTime = uWindTime;
    shader.uniforms.uWindStrength = uWindStrength;
    shader.uniforms.uWindHeightScale = uWindHeightScale;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */ `
      #include <common>
      uniform float uWindTime;
      uniform float uWindStrength;
      uniform float uWindHeightScale;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */ `
      #include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vec4 windAnchor = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #else
          vec4 windAnchor = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #endif
        float hNorm = clamp(max(position.y, 0.0) / uWindHeightScale, 0.0, 1.75);
        float bend = hNorm * hNorm;
        float phase = windAnchor.x * 0.21 + windAnchor.z * 0.17;
        float gust = 0.66 + 0.34 * sin(uWindTime * 0.78 + phase * 0.42);
        float swayX = sin(uWindTime * 2.15 + phase + position.y * 0.32);
        float swayZ = cos(uWindTime * 1.74 + phase * 1.27 + position.x * 0.28) * 0.68;
        float leafFlutter = sin(uWindTime * 6.2 + dot(position, vec3(3.3, 2.5, 3.7))) * 0.075 * hNorm;
        transformed.x += (swayX * bend + leafFlutter) * uWindStrength * gust;
        transformed.z += (swayZ * bend + leafFlutter * 0.75) * uWindStrength * gust;
        transformed.y -= abs(swayX) * bend * uWindStrength * 0.07;
      }
      `
    );
  };

  material.needsUpdate = true;

  return {
    update(time: number): void {
      uWindTime.value = time;
    }
  };
}

const INTERIOR_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vBuildingSeed;

float hash12v(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vUv = uv;

  #ifdef USE_INSTANCING
    mat4 worldMat = modelMatrix * instanceMatrix;
  #else
    mat4 worldMat = modelMatrix;
  #endif

  vec4 worldPos = worldMat * vec4(position, 1.0);
  vec4 originWorld = worldMat * vec4(0.0, 0.0, 0.0, 1.0);

  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(worldMat) * normal);
  vBuildingSeed = hash12v(floor(originWorld.xz * 0.25) + vec2(13.7, 29.3));

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const INTERIOR_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uFacadeMap;
uniform sampler2D uRoughnessMap;
uniform sampler2D uMetalnessMap;
uniform float uFloors;
uniform float uRoomsPerFloor;
uniform float uNightFactor;
uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vBuildingSeed;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(uCameraPos - vWorldPos);

  float dayAmt = smoothstep(-0.08, 0.28, L.y);
  float NdotL = max(dot(N, L), 0.0);
  vec3 outColor = vec3(0.0);

  // Horizontal rooftop surfaces render weathered architectural concrete/gravel
  if (abs(N.y) > 0.72) {
    vec3 roofTex = texture2D(uFacadeMap, vWorldPos.xz * 0.12).rgb;
    outColor = roofTex * (0.14 + 0.86 * NdotL * dayAmt + 0.12 * (1.0 - uNightFactor));
  } else {
    // Orthonormal facade wall basis: X = wallRight, Y = wallUp, +Z = inward into room
    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    vec3 wallRight = normalize(cross(worldUp, N));
    vec3 wallUp = normalize(cross(N, wallRight));

    // Tile room grid cleanly using UVs scaled by roomsPerFloor x floors
    vec2 gridCoord = vec2(vUv.x * uRoomsPerFloor, vUv.y * uFloors);
    vec2 roomIdx = floor(gridCoord);
    vec2 cellUv = fract(gridCoord);

    // Structural masonry/curtain-wall mullion frame vs recessed glass window opening
    float frameMarginX = 0.13;
    float frameMarginBottom = 0.16;
    float frameMarginTop = 0.12;

    bool isWindow =
      cellUv.x > frameMarginX &&
      cellUv.x < (1.0 - frameMarginX) &&
      cellUv.y > frameMarginBottom &&
      cellUv.y < (1.0 - frameMarginTop);

    vec2 texUv = vec2(vUv.x * (uRoomsPerFloor * 0.5), vUv.y * (uFloors * 0.5));
    vec3 facadeAlbedo = texture2D(uFacadeMap, texUv).rgb;
    float facadeRough = texture2D(uRoughnessMap, texUv).g;
    float facadeMetal = texture2D(uMetalnessMap, texUv).b;

    vec3 sunColor = mix(vec3(1.05, 0.50, 0.24), vec3(1.0, 0.96, 0.90), dayAmt) * dayAmt;
    vec3 skyAmb = mix(vec3(0.035, 0.05, 0.095), vec3(0.26, 0.34, 0.46), dayAmt);

    if (!isWindow) {
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), mix(12.0, 64.0, 1.0 - facadeRough)) * (0.04 + facadeMetal * 0.35);
      outColor = facadeAlbedo * (skyAmb + sunColor * NdotL) + sunColor * spec;
    } else {
      // Normalized window-pane coordinates in [0, 1]^2
      vec2 winUv = vec2(
        (cellUv.x - frameMarginX) / (1.0 - 2.0 * frameMarginX),
        (cellUv.y - frameMarginBottom) / (1.0 - frameMarginBottom - frameMarginTop)
      );

      // Ray-box parallax Interior Mapping inside unit room [0,1] x [0,1] x [0, roomDepth]
      float roomDepth = 0.82;
      vec3 viewRayWorld = -V;
      vec3 localRay = vec3(
        dot(viewRayWorld, wallRight),
        dot(viewRayWorld, wallUp),
        max(dot(viewRayWorld, -N), 0.04)
      );

      float eps = 0.0001;
      float targetX = localRay.x >= 0.0 ? 1.0 : 0.0;
      float targetY = localRay.y >= 0.0 ? 1.0 : 0.0;
      float denomX = abs(localRay.x) < eps ? (localRay.x >= 0.0 ? eps : -eps) : localRay.x;
      float denomY = abs(localRay.y) < eps ? (localRay.y >= 0.0 ? eps : -eps) : localRay.y;

      float tBack = roomDepth / localRay.z;
      float tSide = (targetX - winUv.x) / denomX;
      float tVert = (targetY - winUv.y) / denomY;

      float tHit = min(tBack, min(tSide, tVert));
      vec3 hit = vec3(winUv, 0.0) + localRay * tHit;

      bool hitCeiling = (tVert <= tBack && tVert <= tSide && localRay.y > 0.0);
      bool hitFloor = (tVert <= tBack && tVert <= tSide && localRay.y <= 0.0);
      bool hitBack = (tBack <= tSide && tBack <= tVert);

      // Per-room deterministic seed & occupancy state
      float rSeed = hash13(vec3(roomIdx, floor(vBuildingSeed * 127.0)));
      float rTone = hash13(vec3(roomIdx + vec2(41.0, 17.0), floor(vBuildingSeed * 63.0)));
      float blindHeight = 0.72 + 0.28 * hash13(vec3(roomIdx + vec2(9.0, 83.0), 3.0));

      // Window Venetian blinds at top of pane
      float blindMask = smoothstep(blindHeight - 0.02, blindHeight + 0.02, winUv.y);
      float blindSlats = 0.72 + 0.28 * sin(winUv.y * 95.0);

      // Room color palette (warm tungsten residential, crisp daylight office, cyan-magenta studio)
      vec3 warmLamp = vec3(1.28, 0.86, 0.46);
      vec3 coolOffice = vec3(0.82, 0.94, 1.18);
      vec3 studioAccent = vec3(0.62, 0.78, 1.25);
      vec3 lightTint = (rTone < 0.56) ? warmLamp : (rTone < 0.88 ? coolOffice : studioAccent);

      // Procedural interior geometry shading on ceiling, back wall, side walls, and floor
      vec3 roomSurface = vec3(0.18, 0.17, 0.16);
      float fixtureEmit = 0.0;

      if (hitCeiling) {
        // Glowing recessed ceiling light panel
        float panelX = smoothstep(0.24, 0.30, hit.x) * (1.0 - smoothstep(0.70, 0.76, hit.x));
        float panelZ = smoothstep(0.22, 0.30, hit.z / roomDepth) * (1.0 - smoothstep(0.68, 0.76, hit.z / roomDepth));
        fixtureEmit = panelX * panelZ * 1.65;
        roomSurface = vec3(0.62, 0.62, 0.65);
      } else if (hitFloor) {
        float planks = 0.85 + 0.15 * sin(hit.x * 32.0);
        roomSurface = vec3(0.24, 0.17, 0.12) * planks;
      } else if (hitBack) {
        // Back wall with desk/console silhouette & monitor glow
        float desk = (hit.y < 0.34 && hit.x > 0.15 && hit.x < 0.85) ? 0.28 : 1.0;
        float monitorGlow = (hit.y > 0.34 && hit.y < 0.52 && hit.x > 0.40 && hit.x < 0.62 && rSeed > 0.5) ? 0.85 : 0.0;
        float wallGrad = 0.55 + 0.45 * hit.y;
        roomSurface = mix(vec3(0.36, 0.34, 0.32), vec3(0.52, 0.50, 0.47), rTone) * wallGrad * desk;
        fixtureEmit += monitorGlow * (0.88 + 0.12 * sin(uTime * 3.7 + rSeed * 30.0));
      } else {
        // Side walls with bookshelf horizontal bands
        float shelves = (hit.z > 0.25 * roomDepth && fract(hit.y * 4.0) < 0.14) ? 0.42 : 1.0;
        roomSurface = vec3(0.42, 0.40, 0.38) * (0.5 + 0.5 * hit.y) * shelves;
      }

      float depthAO = 1.0 - 0.45 * (hit.z / roomDepth);
      float litProbability = mix(0.14, 0.68, uNightFactor);
      float isRoomLit = step(1.0 - litProbability, rSeed);
      float subtleFlicker = 0.96 + 0.04 * sin(uTime * 1.9 + rSeed * 50.0);

      float interiorExposure = mix(0.22 * dayAmt, (0.95 + fixtureEmit) * subtleFlicker, isRoomLit * max(uNightFactor, 0.22));
      vec3 interiorColor = (roomSurface * depthAO * lightTint * interiorExposure) + lightTint * fixtureEmit * isRoomLit * uNightFactor;
      interiorColor = mix(interiorColor, vec3(0.14, 0.13, 0.12) * blindSlats * (0.2 + interiorExposure * 0.45), blindMask * 0.88);

      // Exterior architectural glass Fresnel reflection + solar specular highlight
      float NdotV = max(dot(N, V), 0.01);
      float glassFresnel = 0.05 + 0.90 * pow(1.0 - NdotV, 4.2);
      vec3 reflDir = reflect(-V, N);
      vec3 skyRefl = mix(
        mix(vec3(0.02, 0.03, 0.07), vec3(0.45, 0.68, 0.92), dayAmt),
        mix(vec3(0.006, 0.012, 0.03), vec3(0.08, 0.25, 0.60), dayAmt),
        clamp(reflDir.y, 0.0, 1.0)
      );
      vec3 H = normalize(L + V);
      float glassSpec = pow(max(dot(N, H), 0.0), 180.0) * 2.2 * dayAmt;

      float glassReflectivity = clamp(glassFresnel * mix(0.32, 0.82, dayAmt), 0.06, 0.88);
      outColor = mix(interiorColor, skyRefl, glassReflectivity) + sunColor * glassSpec;
    }
  }

  gl_FragColor = vec4(max(outColor, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * GLSL Interior Mapping shader performing parallax ray-box intersection inside skyscraper
 * windows for 3D furnished lit rooms at night + PBR facade & Fresnel sky reflection by day.
 */
export function createInteriorMappingMaterial(
  facadeTex: PBRTextureSet,
  options?: { floors?: number; roomsPerFloor?: number; nightFactor?: number }
): THREE.ShaderMaterial {
  const floors = Math.max(1, options?.floors ?? 12);
  const roomsPerFloor = Math.max(1, options?.roomsPerFloor ?? 6);
  const nightFactor = THREE.MathUtils.clamp(options?.nightFactor ?? 0.35, 0.0, 1.0);

  return new THREE.ShaderMaterial({
    name: 'InteriorMappingMaterial',
    vertexShader: INTERIOR_VERTEX_SHADER,
    fragmentShader: INTERIOR_FRAGMENT_SHADER,
    side: THREE.FrontSide,
    toneMapped: true,
    fog: false,
    uniforms: {
      uFacadeMap: { value: facadeTex.map },
      uRoughnessMap: { value: facadeTex.roughnessMap },
      uMetalnessMap: { value: facadeTex.metalnessMap },
      uFloors: { value: floors },
      uRoomsPerFloor: { value: roomsPerFloor },
      uNightFactor: { value: nightFactor },
      uTime: { value: 0.0 },
      uSunDirection: { value: new THREE.Vector3(0.45, 0.72, 0.52).normalize() },
      uCameraPos: { value: new THREE.Vector3(0, 10, 20) }
    }
  });
}

export function updateInteriorMaterial(
  mat: THREE.ShaderMaterial,
  time: number,
  sunDir: THREE.Vector3,
  cameraPos: THREE.Vector3,
  nightFactor: number
): void {
  if (mat.uniforms.uTime) {
    mat.uniforms.uTime.value = time;
  }
  if (mat.uniforms.uSunDirection) {
    (mat.uniforms.uSunDirection.value as THREE.Vector3).copy(sunDir).normalize();
  }
  if (mat.uniforms.uCameraPos) {
    (mat.uniforms.uCameraPos.value as THREE.Vector3).copy(cameraPos);
  }
  if (mat.uniforms.uNightFactor) {
    mat.uniforms.uNightFactor.value = THREE.MathUtils.clamp(nightFactor, 0.0, 1.0);
  }
}

/**
 * MeshPhysicalMaterial with clearcoat + world-space procedural rain puddle mask modulating
 * albedo darkening, normal flattening, roughness, and clearcoat for city roads.
 */
export function createWetAsphaltMaterial(
  asphaltTex: PBRTextureSet,
  wetness = 0.75
): THREE.MeshPhysicalMaterial {
  const clampedWetness = THREE.MathUtils.clamp(wetness, 0.0, 1.0);
  const uWetness = { value: clampedWetness };

  const material = new THREE.MeshPhysicalMaterial({
    name: 'WetAsphaltPhysicalMaterial',
    map: asphaltTex.map,
    normalMap: asphaltTex.normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: asphaltTex.roughnessMap,
    roughness: 1.0,
    metalnessMap: asphaltTex.metalnessMap,
    metalness: 0.05,
    bumpMap: asphaltTex.bumpMap,
    bumpScale: 0.015,
    clearcoat: Math.max(0.15, clampedWetness),
    clearcoatRoughness: 0.08,
    ior: 1.5,
    reflectivity: 0.7
  });

  material.userData.uWetness = uWetness;
  material.userData.setWetness = (w: number): void => {
    uWetness.value = THREE.MathUtils.clamp(w, 0.0, 1.0);
  };

  material.customProgramCacheKey = (): string => 'omniverse_wet_asphalt_v1';

  material.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms): void => {
    shader.uniforms.uWetness = uWetness;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */ `
      #include <common>
      varying vec3 vWetWorldPos;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */ `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vWetWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vWetWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      /* glsl */ `
      #include <common>
      uniform float uWetness;
      varying vec3 vWetWorldPos;

      float wetHash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float wetNoise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = wetHash12(i);
        float b = wetHash12(i + vec2(1.0, 0.0));
        float c = wetHash12(i + vec2(0.0, 1.0));
        float d = wetHash12(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float evaluatePuddleField(vec2 xz) {
        float n1 = wetNoise2D(xz * 0.075);
        float n2 = wetNoise2D(xz * 0.19 + vec2(17.3, 43.1));
        float n3 = wetNoise2D(xz * 0.42 + vec2(81.7, 12.9));
        return n1 * 0.56 + n2 * 0.30 + n3 * 0.14;
      }
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      /* glsl */ `
      #include <map_fragment>
      float puddleRaw = evaluatePuddleField(vWetWorldPos.xz);
      float puddleThreshold = mix(0.85, 0.40, uWetness);
      float puddleDamp = smoothstep(puddleThreshold - 0.14, puddleThreshold + 0.06, puddleRaw) * uWetness;
      float puddleStanding = smoothstep(puddleThreshold + 0.02, puddleThreshold + 0.16, puddleRaw) * uWetness;
      // Wet porous asphalt absorbs light and darkens
      diffuseColor.rgb *= mix(1.0, 0.44, clamp(puddleDamp * 0.85 + uWetness * 0.25, 0.0, 1.0));
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      /* glsl */ `
      #include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.22, uWetness * 0.45);
      roughnessFactor = mix(roughnessFactor, 0.05, puddleStanding);
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      /* glsl */ `
      #include <normal_fragment_maps>
      // Standing water puddles level out coarse asphalt aggregate normals into a mirror film
      normal = normalize(mix(normal, nonPerturbedNormal, puddleStanding * 0.88));
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      /* glsl */ `
      #include <lights_physical_fragment>
      #ifdef USE_CLEARCOAT
        material.clearcoat = clamp(mix(uWetness * 0.35, 1.0, puddleStanding), 0.0, 1.0);
        material.clearcoatRoughness = mix(0.16, 0.045, puddleStanding);
      #endif
      `
    );
  };

  return material;
}

const CEL_TOON_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uWindSway;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vBaseTint;

void main() {
  vec3 pos = position;

  #ifdef USE_INSTANCING
    mat4 worldMat = modelMatrix * instanceMatrix;
  #else
    mat4 worldMat = modelMatrix;
  #endif

  vec4 anchorWorld = worldMat * vec4(0.0, 0.0, 0.0, 1.0);

  if (uWindSway > 0.0005) {
    float hMask = clamp(max(pos.y, 0.0) * 0.25, 0.0, 1.6);
    float bend = hMask * hMask;
    float phase = anchorWorld.x * 0.24 + anchorWorld.z * 0.19;
    float gust = 0.70 + 0.30 * sin(uTime * 0.85 + phase * 0.5);
    pos.x += sin(uTime * 2.3 + phase + pos.y * 0.4) * bend * uWindSway * gust;
    pos.z += cos(uTime * 1.9 + phase * 1.3 + pos.x * 0.3) * bend * uWindSway * 0.7 * gust;
  }

  vec3 tint = vec3(1.0);
  #if defined(USE_COLOR_ALPHA) || defined(USE_COLOR)
    tint *= color.rgb;
  #endif
  #ifdef USE_INSTANCING_COLOR
    tint *= instanceColor.rgb;
  #endif
  vBaseTint = tint;

  vec4 worldPos = worldMat * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(worldMat) * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const CEL_TOON_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uRimColor;
uniform vec3 uSunDirection;
uniform float uSteps;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vBaseTint;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(cameraPosition - vWorldPos);

  float dayAmt = smoothstep(-0.10, 0.25, L.y);
  float halfLambert = dot(N, L) * 0.5 + 0.5;

  // Anti-aliased N-band cel quantization (3 crisp anime shading bands by default)
  float bands = max(2.0, uSteps);
  float scaled = halfLambert * bands;
  float bandIdx = floor(scaled);
  float bandFrac = fract(scaled);
  float smoothEdge = smoothstep(0.44, 0.56, bandFrac);
  float celLevel = clamp((bandIdx + smoothEdge) / bands, 0.0, 1.0);

  vec3 albedo = uBaseColor * vBaseTint;

  // Stylized anime cool lavender-indigo shadow vs warm sunlit key color
  vec3 shadowTone = albedo * mix(vec3(0.24, 0.26, 0.40), vec3(0.42, 0.44, 0.58), dayAmt);
  vec3 midTone = albedo * mix(vec3(0.42, 0.48, 0.64), vec3(0.86, 0.85, 0.88), dayAmt);
  vec3 litTone = albedo * mix(vec3(0.58, 0.66, 0.86), vec3(1.14, 1.10, 1.02), dayAmt);

  vec3 shaded = celLevel < 0.5
    ? mix(shadowTone, midTone, celLevel * 2.0)
    : mix(midTone, litTone, (celLevel - 0.5) * 2.0);

  // Quantized anime specular highlight pill
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float celSpec = smoothstep(0.91, 0.94, pow(NdotH, 24.0)) * 0.22 * dayAmt;

  // Crisp sunlit Fresnel rim-light silhouette
  float NdotV = max(dot(N, V), 0.0);
  float rimRaw = pow(1.0 - NdotV, 3.6) * smoothstep(-0.2, 0.45, dot(N, L));
  float crispRim = smoothstep(0.36, 0.48, rimRaw);
  vec3 rimContribution = uRimColor * crispRim * mix(0.28, 0.72, dayAmt);

  vec3 finalColor = shaded + vec3(celSpec) + rimContribution;

  gl_FragColor = vec4(max(finalColor, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Hybrid Toon/PBR multi-band cel-shaded ShaderMaterial with crisp rim light and optional
 * vertex wind sway for World 5 (Aetheria Chronicles).
 */
export function createCelToonMaterial(
  color: THREE.ColorRepresentation,
  options?: { rimColor?: THREE.ColorRepresentation; steps?: number; windSway?: number }
): THREE.ShaderMaterial {
  const baseColor = new THREE.Color(color);
  const rimColor = new THREE.Color(options?.rimColor ?? 0xfff1c4);
  const steps = Math.max(2, Math.round(options?.steps ?? 3));
  const windSway = options?.windSway ?? 0.0;

  return new THREE.ShaderMaterial({
    name: 'CelToonMaterial',
    vertexShader: CEL_TOON_VERTEX_SHADER,
    fragmentShader: CEL_TOON_FRAGMENT_SHADER,
    side: THREE.FrontSide,
    toneMapped: true,
    fog: false,
    uniforms: {
      uBaseColor: { value: baseColor },
      uRimColor: { value: rimColor },
      uSunDirection: { value: new THREE.Vector3(0.45, 0.78, 0.42).normalize() },
      uSteps: { value: steps },
      uTime: { value: 0.0 },
      uWindSway: { value: windSway }
    }
  });
}

export function updateCelToonMaterial(
  mat: THREE.ShaderMaterial,
  time: number,
  sunDir: THREE.Vector3
): void {
  if (mat.uniforms.uTime) {
    mat.uniforms.uTime.value = time;
  }
  if (mat.uniforms.uSunDirection) {
    (mat.uniforms.uSunDirection.value as THREE.Vector3).copy(sunDir).normalize();
  }
}

const OUTLINE_VERTEX_SHADER = /* glsl */ `
uniform float uThickness;

void main() {
  #ifdef USE_INSTANCING
    mat4 worldMat = modelMatrix * instanceMatrix;
  #else
    mat4 worldMat = modelMatrix;
  #endif

  vec4 worldBase = worldMat * vec4(position, 1.0);
  vec3 worldNorm = normalize(mat3(worldMat) * normal);

  // Subtle distance compensation keeps anime ink lines legible without distant bloat
  float camDist = length(cameraPosition - worldBase.xyz);
  float distScale = clamp(0.65 + camDist * 0.018, 0.65, 2.4);

  vec3 extrudedWorld = worldBase.xyz + worldNorm * (uThickness * distScale);
  gl_Position = projectionMatrix * viewMatrix * vec4(extrudedWorld, 1.0);
}
`;

const OUTLINE_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uOutlineColor;

void main() {
  gl_FragColor = vec4(uOutlineColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Inverted-hull back-face ink outline ShaderMaterial for World 5 (Aetheria Chronicles).
 */
export function createOutlineMaterial(
  thickness = 0.035,
  color: THREE.ColorRepresentation = 0x14121d
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'InvertedHullOutlineMaterial',
    vertexShader: OUTLINE_VERTEX_SHADER,
    fragmentShader: OUTLINE_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: true,
    toneMapped: true,
    fog: false,
    uniforms: {
      uThickness: { value: thickness },
      uOutlineColor: { value: new THREE.Color(color) }
    }
  });
}

const WARP_TUNNEL_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vLocalPos;

void main() {
  vUv = uv;
  vLocalPos = position;

  // Relativistic radial breathing distortion during quantum jump
  vec3 warpedPos = position;
  float wave = sin(position.z * 0.12 + uTime * 14.0) * 0.045 * uIntensity;
  warpedPos.xy *= 1.0 + wave;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(warpedPos, 1.0);
}
`;

const WARP_TUNNEL_FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vLocalPos;

float warpHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float warpNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = warpHash12(i);
  float b = warpHash12(i + vec2(1.0, 0.0));
  float c = warpHash12(i + vec2(0.0, 1.0));
  float d = warpHash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  float intensity = clamp(uIntensity, 0.0, 1.5);
  if (intensity <= 0.001) {
    discard;
  }

  // Works seamlessly on cylindrical tunnels, cones, or full-screen quads
  float angle = atan(vLocalPos.y, vLocalPos.x);
  float normAngle = angle * 0.15915494 + 0.5; // [-pi, pi] -> [0, 1]
  float axial = vUv.y;

  // Helical twist & relativistic star-streak rush
  float twist = normAngle + axial * 0.22 * sin(uTime * 1.4) + uTime * 0.08;
  float rushSpeed = uTime * (4.5 + intensity * 12.0);

  // Layer 1: High-velocity Cherenkov star-streaks
  float angularLanes1 = floor(twist * 96.0);
  float laneFrac1 = abs(fract(twist * 96.0) - 0.5) * 2.0;
  float laneSeed1 = warpHash12(vec2(angularLanes1, 11.0));
  float streakZ1 = fract(axial * 3.0 + rushSpeed * (0.6 + laneSeed1 * 0.9) + laneSeed1 * 17.0);
  float streakLen1 = mix(0.06, 0.72, clamp(intensity, 0.0, 1.0));
  float streak1 =
    (1.0 - smoothstep(0.0, 0.42, laneFrac1)) *
    smoothstep(1.0 - streakLen1, 1.0, streakZ1) *
    step(0.32, laneSeed1);

  // Layer 2: Dense hyper-luminous inner filaments
  float angularLanes2 = floor((normAngle - uTime * 0.05) * 160.0);
  float laneFrac2 = abs(fract((normAngle - uTime * 0.05) * 160.0) - 0.5) * 2.0;
  float laneSeed2 = warpHash12(vec2(angularLanes2, 47.0));
  float streakZ2 = fract(axial * 5.0 + rushSpeed * (1.1 + laneSeed2 * 0.8) + laneSeed2 * 31.0);
  float streak2 =
    (1.0 - smoothstep(0.0, 0.35, laneFrac2)) *
    smoothstep(0.35, 1.0, streakZ2) *
    step(0.45, laneSeed2);

  // Quantum plasma nebula waves & shockwave rings
  float plasma = warpNoise(vec2(twist * 14.0, axial * 6.0 + rushSpeed * 0.35));
  float plasma2 = warpNoise(vec2(normAngle * 22.0 - uTime * 0.9, axial * 10.0 + rushSpeed * 0.55));
  float shockRing = pow(0.5 + 0.5 * sin(axial * 28.0 + rushSpeed * 2.2), 6.0);

  // Relativistic Doppler shift palette (electric cyan -> royal violet -> white-gold core)
  vec3 cherenkovCyan = vec3(0.12, 0.78, 1.65);
  vec3 quantumViolet = vec3(0.72, 0.22, 1.45);
  vec3 coreGold = vec3(1.85, 1.65, 1.25);

  vec3 color =
    cherenkovCyan * (streak1 * 2.4 + plasma * plasma2 * 0.85) +
    quantumViolet * (plasma * 0.65 + shockRing * 0.55) +
    coreGold * (streak2 * 2.8);

  // Smooth fade at both ends of tunnel geometry so no hard mesh edges appear
  float edgeFade = sin(clamp(vUv.y, 0.0, 1.0) * 3.14159265);
  float alpha = clamp((streak1 * 0.9 + streak2 * 0.9 + plasma * 0.38 + shockRing * 0.25) * edgeFade * intensity, 0.0, 1.0);

  gl_FragColor = vec4(color * intensity * edgeFade, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Quantum hyperdrive star-streak distortion ShaderMaterial for World 2 (Starfield Odyssey)
 * exposing uTime and uIntensity uniforms.
 */
export function createWarpTunnelMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'QuantumWarpTunnelMaterial',
    vertexShader: WARP_TUNNEL_VERTEX_SHADER,
    fragmentShader: WARP_TUNNEL_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
    fog: false,
    uniforms: {
      uTime: { value: 0.0 },
      uIntensity: { value: 0.0 }
    }
  });
}
