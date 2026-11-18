import * as THREE from 'three';
import type { IAtmosphereSky } from '../types';

export type WeatherPreset = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm';

const SKY_VERTEX_SHADER = /* glsl */ `
varying vec3 vWorldDir;

void main() {
  vWorldDir = normalize(position);
  vec4 rotViewPos = mat4(mat3(viewMatrix)) * vec4(position, 1.0);
  vec4 clipPos = projectionMatrix * rotViewPos;
  gl_Position = clipPos.xyww;
}
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uSunDirection;
uniform float uTime;
uniform float uSpaceBlend;
uniform float uCloudCoverage;
uniform float uCloudDarkness;
uniform float uHaziness;
uniform float uPrecipitation;
uniform vec3 uWeatherTint;

varying vec3 vWorldDir;

const float PI = 3.14159265359;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);

  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm3D(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat3 rot = mat3(
    0.00,  0.80,  0.60,
   -0.80,  0.36, -0.48,
   -0.60, -0.48,  0.64
  );
  for (int i = 0; i < 4; i++) {
    sum += amp * noise3D(p);
    p = rot * p * 2.04 + vec3(13.7, 29.1, 7.3);
    amp *= 0.5;
  }
  return sum;
}

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

float cloudFbm(vec2 p) {
  float v = 0.0;
  float a = 0.52;
  mat2 m = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise2D(p);
    p = m * p * 2.03 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

vec3 starLayer(vec3 dir, float scale, float threshold, float twinkleAmt) {
  vec3 p = dir * scale;
  vec3 cell = floor(p);
  vec3 f = fract(p) - 0.5;
  vec3 rnd = hash33(cell);
  if (rnd.x < threshold) {
    return vec3(0.0);
  }
  vec3 starOffset = (rnd - 0.5) * 0.62;
  float dist = length(f - starOffset);
  float brightness = smoothstep(0.24, 0.0, dist);
  brightness = pow(brightness, 3.2) * ((rnd.x - threshold) / (1.0 - threshold));

  // Blackbody stellar chromaticity (O/B blue-white, A/G white-gold, K/M warm orange)
  vec3 hotStar = vec3(0.68, 0.82, 1.0);
  vec3 warmStar = vec3(1.0, 0.78, 0.52);
  vec3 starCol = mix(hotStar, warmStar, rnd.y);
  starCol = mix(starCol, vec3(1.0, 0.98, 0.95), 0.35);

  float twinkle = 1.0 + sin(uTime * (2.2 + rnd.z * 5.0) + rnd.x * 60.0) * twinkleAmt;
  return starCol * brightness * twinkle * 2.8;
}

vec3 evaluateCosmos(vec3 dir, float spaceFactor, float twinkleAmt) {
  // Galactic plane rotation for realistic tilted Milky Way band
  mat3 galRot = mat3(
    0.866, -0.354,  0.354,
    0.433,  0.884, -0.177,
   -0.250,  0.306,  0.919
  );
  vec3 gDir = galRot * dir;

  float galBand = exp(-abs(gDir.y) * 5.8);
  float galCore = exp(-length(vec2(gDir.x - 0.35, gDir.y * 2.2)) * 2.4);

  // Galactic star-clouds & dark dust rifts
  float starCloud = fbm3D(gDir * 3.8);
  float dustRift = smoothstep(0.42, 0.68, fbm3D(gDir * 6.5 + vec3(4.2, -1.8, 9.1)));
  float milkyLum = galBand * (0.35 + 0.95 * starCloud) * (1.0 - dustRift * 0.72) + galCore * 0.32;

  vec3 milkyCol = mix(vec3(0.32, 0.42, 0.68), vec3(0.95, 0.82, 0.64), galCore * 0.75 + starCloud * 0.35);
  vec3 cosmos = milkyCol * milkyLum * mix(0.55, 1.15, spaceFactor);

  // Colorful deep-space emission nebulae (H-alpha crimson/magenta, O-III cyan-teal, gold dust)
  vec3 nebWarp = gDir * 2.4 + vec3(fbm3D(gDir * 2.1) * 0.85);
  float nebA = smoothstep(0.48, 0.84, fbm3D(nebWarp + vec3(11.3, 4.7, -6.2)));
  float nebB = smoothstep(0.50, 0.86, fbm3D(nebWarp * 1.35 + vec3(-8.4, 15.1, 3.9)));
  float nebMask = mix(0.32, 1.0, spaceFactor) * (0.35 + 0.65 * galBand);

  vec3 hAlpha = vec3(0.76, 0.14, 0.44) * nebA;
  vec3 oIII = vec3(0.08, 0.56, 0.74) * nebB;
  vec3 goldDust = vec3(0.82, 0.48, 0.16) * (nebA * nebB * 1.4);
  cosmos += (hAlpha + oIII + goldDust) * nebMask * 0.78;

  // Multi-scale procedural 3D stars (zero UV pole artifacts)
  cosmos += starLayer(dir, 95.0, 0.915, twinkleAmt) * 1.35;
  cosmos += starLayer(dir, 210.0, 0.945, twinkleAmt * 0.6) * 0.75;

  return cosmos;
}

void main() {
  vec3 dir = normalize(vWorldDir);
  vec3 sunDir = normalize(uSunDirection);
  float mu = clamp(dot(dir, sunDir), -1.0, 1.0);
  float sunElev = sunDir.y;

  // Day/Twilight/Night factors
  float dayFactor = smoothstep(-0.08, 0.25, sunElev);
  float twilightFactor = exp(-pow((sunElev - 0.02) / 0.16, 2.0));
  float nightFactor = smoothstep(0.08, -0.22, sunElev);

  // Physical Rayleigh & Henyey-Greenstein Mie phase functions
  float phaseR = (3.0 / (16.0 * PI)) * (1.0 + mu * mu);
  float g = mix(0.76, 0.86, uHaziness);
  float g2 = g * g;
  float phaseM = (1.0 - g2) / (4.0 * PI * pow(max(1.0 + g2 - 2.0 * g * mu, 0.0002), 1.5));

  // Chapman-like horizon optical depth
  float viewElev = max(dir.y, 0.0);
  float horizonGlow = pow(1.0 - clamp(abs(dir.y), 0.0, 1.0), 4.2);
  float airMass = 1.0 / (viewElev + 0.14);

  // Rayleigh & Mie extinction + in-scattering palette
  vec3 betaR = vec3(0.065, 0.185, 0.465);
  vec3 extinction = exp(-betaR * airMass * mix(0.45, 1.15, 1.0 - dayFactor * 0.5));

  vec3 dayZenith = vec3(0.055, 0.195, 0.56);
  vec3 dayHorizon = vec3(0.36, 0.62, 0.90);
  vec3 nightZenith = vec3(0.004, 0.009, 0.026);
  vec3 nightHorizon = vec3(0.015, 0.028, 0.065);

  vec3 skyGrad = mix(
    mix(nightZenith, nightHorizon, horizonGlow),
    mix(dayZenith, dayHorizon, pow(1.0 - viewElev, 2.4)),
    dayFactor
  );

  // Rayleigh angular brightening
  skyGrad += betaR * phaseR * dayFactor * 0.85;

  // Golden/crimson twilight horizon & anti-solar Belt of Venus
  float sunAzimuthGlow = pow(max(mu, 0.0), 3.2) * 0.72 + 0.28;
  vec3 sunsetFire = mix(vec3(1.15, 0.32, 0.10), vec3(1.35, 0.68, 0.22), clamp(viewElev * 3.0, 0.0, 1.0));
  vec3 beltOfVenus = vec3(0.38, 0.20, 0.46) * pow(max(-mu, 0.0), 1.6) * exp(-pow((viewElev - 0.12) / 0.14, 2.0));
  skyGrad += sunsetFire * twilightFactor * horizonGlow * sunAzimuthGlow * 1.15;
  skyGrad += beltOfVenus * twilightFactor * 0.65;

  // Mie forward scatter haze & solar aureole
  vec3 mieTint = mix(vec3(1.0, 0.95, 0.86), vec3(1.25, 0.55, 0.24), twilightFactor);
  float mieStrength = (0.018 + uHaziness * 0.085) * (dayFactor * 0.85 + twilightFactor * 0.65);
  skyGrad += mieTint * min(phaseM, 18.0) * mieStrength * (1.0 - extinction * 0.35);

  // Weather overcast / fog / storm modulation
  float overcastAmt = clamp(uCloudDarkness * 0.75 + uHaziness * 0.45, 0.0, 0.92);
  float skyLum = dot(skyGrad, vec3(0.2126, 0.7152, 0.0722));
  vec3 overcastCol = uWeatherTint * mix(0.04, 0.55, dayFactor + twilightFactor * 0.35);
  skyGrad = mix(skyGrad, mix(vec3(skyLum), overcastCol, 0.72), overcastAmt);

  // Cosmic backdrop (stars, Milky Way, nebulae)
  float atmoStarVis = nightFactor * (1.0 - overcastAmt * 0.92) * smoothstep(-0.02, 0.18, dir.y);
  float cosmicVis = clamp(mix(atmoStarVis, 1.0, uSpaceBlend), 0.0, 1.0);
  vec3 cosmos = vec3(0.0);
  if (cosmicVis > 0.002) {
    float twinkle = (1.0 - uSpaceBlend) * 0.28;
    cosmos = evaluateCosmos(dir, uSpaceBlend, twinkle);
  }

  // Solar disc & corona (in both planetary sky and deep space)
  float sunDisc = smoothstep(0.99935, 0.99982, mu);
  float sunCorona = pow(max(mu, 0.0), 96.0) * 0.85 + pow(max(mu, 0.0), 12.0) * 0.14;
  float atmoSunVis = smoothstep(-0.06, 0.03, dir.y) * (1.0 - uCloudDarkness * 0.88);
  float sunVis = mix(atmoSunVis, 1.0, uSpaceBlend);
  vec3 sunColor = mix(vec3(1.4, 0.42, 0.12), vec3(1.0, 0.96, 0.88), clamp(smoothstep(-0.02, 0.32, sunElev) + uSpaceBlend, 0.0, 1.0));
  vec3 solarRadiance = sunColor * (sunDisc * 16.0 + sunCorona * 1.45) * sunVis;

  // Subtle Moon disc at night in planetary mode
  vec3 moonDir = normalize(vec3(-sunDir.x, -sunDir.y + 0.14, -sunDir.z + 0.16));
  float moonMu = clamp(dot(dir, moonDir), -1.0, 1.0);
  float moonDisc = smoothstep(0.99945, 0.99978, moonMu);
  float moonHalo = pow(max(moonMu, 0.0), 48.0) * 0.18;
  float moonVis = nightFactor * smoothstep(0.0, 0.08, dir.y) * (1.0 - uCloudDarkness * 0.85) * (1.0 - uSpaceBlend);
  vec3 lunarRadiance = vec3(0.72, 0.82, 1.0) * (moonDisc * 2.4 + moonHalo) * moonVis;

  // Volumetric FBM Clouds on curved atmospheric shell
  vec3 atmoColor = skyGrad + cosmos * atmoStarVis + solarRadiance * (1.0 - uSpaceBlend) + lunarRadiance;
  float cloudSpaceFade = 1.0 - smoothstep(0.10, 0.72, uSpaceBlend);

  if (dir.y > -0.03 && uCloudCoverage > 0.01 && cloudSpaceFade > 0.005) {
    float shellDist = 1.0 / max(dir.y + 0.12, 0.055);
    vec2 wind = vec2(uTime * 0.014, uTime * 0.006);
    vec2 cloudUv = dir.xz * shellDist * 0.85 + wind;

    float baseDensity = cloudFbm(cloudUv);
    float thresh = mix(0.68, 0.24, uCloudCoverage);
    float cloudAlpha = smoothstep(thresh, thresh + 0.26, baseDensity);

    // Directional derivative toward sun for volumetric self-shadowing & silver lining
    float sunSample = cloudFbm(cloudUv + sunDir.xz * 0.11 + vec2(0.04));
    float selfShadow = clamp((sunSample - baseDensity) * 2.6 + 0.35, 0.0, 1.0);
    float lightTerm = 1.0 - selfShadow * 0.78;
    float silverLining = pow(max(mu, 0.0), 6.0) * (1.0 - cloudAlpha * 0.55) * 0.85;

    vec3 cloudLitCol = mix(
      mix(vec3(0.06, 0.08, 0.13), vec3(1.12, 0.52, 0.26), twilightFactor),
      vec3(0.98, 0.97, 0.95),
      dayFactor
    );
    vec3 cloudShadowCol = mix(
      vec3(0.02, 0.03, 0.05),
      mix(vec3(0.42, 0.48, 0.58), vec3(0.16, 0.18, 0.23), uCloudDarkness),
      dayFactor + twilightFactor * 0.5
    );

    vec3 cloudCol = mix(cloudShadowCol, cloudLitCol, lightTerm) + sunColor * silverLining * (dayFactor + twilightFactor);
    float horizonFade = smoothstep(-0.02, 0.14, dir.y);
    float finalCloudMask = cloudAlpha * horizonFade * cloudSpaceFade * mix(0.82, 0.97, uCloudDarkness);
    atmoColor = mix(atmoColor, cloudCol, finalCloudMask);
  }

  // Precipitation atmospheric veil
  if (uPrecipitation > 0.01 && uSpaceBlend < 0.8) {
    float streak = noise2D(vec2(atan(dir.z, dir.x) * 28.0, dir.y * 18.0 + uTime * 3.8));
    vec3 veilCol = uWeatherTint * mix(0.08, 0.48, dayFactor + twilightFactor * 0.4);
    atmoColor = mix(atmoColor, veilCol, uPrecipitation * (0.22 + streak * 0.12) * (1.0 - uSpaceBlend));
  }

  // Lower planetary hemisphere subtle horizon ground bounce so reflections on cars/water are natural
  if (dir.y < 0.0) {
    float nadirT = smoothstep(0.0, -0.45, dir.y);
    vec3 groundBounce = mix(atmoColor, mix(vec3(0.015, 0.02, 0.03), vec3(0.11, 0.13, 0.16), dayFactor) * uWeatherTint, nadirT);
    atmoColor = groundBounce;
  }

  // Deep space full-360 blend for seamless surface-to-orbit transition in World 2
  vec3 spaceColor = cosmos + solarRadiance;
  vec3 finalColor = mix(atmoColor, spaceColor, uSpaceBlend);

  gl_FragColor = vec4(max(finalColor, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Physical Rayleigh/Mie atmospheric sky dome, volumetric FBM clouds, starry Milky Way & nebulae,
 * texel-snapped PCFSoft directional sun/moon lighting, dynamic fog, and PMREM PBR probe.
 */
export class AtmosphereSky implements IAtmosphereSky {
  readonly sunLight: THREE.DirectionalLight;
  readonly hemiLight: THREE.HemisphereLight;
  readonly cascadeFillLight: THREE.DirectionalLight;
  readonly sunDirection = new THREE.Vector3(0.45, 0.78, 0.43).normalize();
  readonly skyMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  readonly fog: THREE.FogExp2;

  private readonly scene: THREE.Scene;
  private readonly skyMaterial: THREE.ShaderMaterial;
  private readonly envScene: THREE.Scene;
  private readonly envSkyMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private pmremRenderer: THREE.WebGLRenderer | null = null;
  private envRenderTarget: THREE.WebGLCubeRenderTarget | null = null;

  private timeOfDay = 10.5;
  private weather: WeatherPreset = 'clear';
  private weatherIntensity = 1.0;
  private spaceBlend = 0.0;
  private elapsedTime = 0.0;
  private shadowMapSize = 2048;
  private readonly shadowExtent = 95.0;
  private readonly shadowDistance = 160.0;

  // Preallocated scratch vectors/colors to ensure zero per-frame GC allocations
  private readonly _activeLightDir = new THREE.Vector3();
  private readonly _moonDir = new THREE.Vector3();
  private readonly _lightRight = new THREE.Vector3();
  private readonly _lightUp = new THREE.Vector3();
  private readonly _snappedTarget = new THREE.Vector3();
  private readonly _worldUp = new THREE.Vector3(0, 1, 0);
  private readonly _fallbackUp = new THREE.Vector3(0, 0, 1);
  private readonly _sunColor = new THREE.Color();
  private readonly _hemiSkyColor = new THREE.Color();
  private readonly _hemiGroundColor = new THREE.Color();
  private readonly _fogColor = new THREE.Color();
  private readonly _weatherTint = new THREE.Color(1, 1, 1);

  constructor(scene: THREE.Scene, rendererOrShadowSize?: THREE.WebGLRenderer | number) {
    this.scene = scene;

    if (typeof rendererOrShadowSize === 'number') {
      this.shadowMapSize = Math.max(512, Math.min(4096, Math.round(rendererOrShadowSize)));
    }

    this.skyMaterial = new THREE.ShaderMaterial({
      name: 'OmniverseAtmosphereSky',
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      depthFunc: THREE.LessEqualDepth,
      toneMapped: true,
      fog: false,
      uniforms: {
        uSunDirection: { value: this.sunDirection.clone() },
        uTime: { value: 0.0 },
        uSpaceBlend: { value: 0.0 },
        uCloudCoverage: { value: 0.22 },
        uCloudDarkness: { value: 0.08 },
        uHaziness: { value: 0.12 },
        uPrecipitation: { value: 0.0 },
        uWeatherTint: { value: new THREE.Color(1.0, 1.0, 1.0) }
      }
    });

    const skyGeometry = new THREE.SphereGeometry(60, 48, 32);
    this.skyMesh = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.skyMesh.name = 'AtmosphereSkyDome';
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -1000;
    this.scene.add(this.skyMesh);

    // Primary shadow-casting directional sun/moon light with texel snapping
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 2.6);
    this.sunLight.name = 'AtmosphereSunLight';
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(this.shadowMapSize, this.shadowMapSize);
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 360.0;
    this.sunLight.shadow.camera.left = -this.shadowExtent;
    this.sunLight.shadow.camera.right = this.shadowExtent;
    this.sunLight.shadow.camera.top = this.shadowExtent;
    this.sunLight.shadow.camera.bottom = -this.shadowExtent;
    this.sunLight.shadow.bias = -0.00035;
    this.sunLight.shadow.normalBias = 0.035;
    this.sunLight.shadow.camera.updateProjectionMatrix();
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Secondary wide-cascade directional sky/bounce fill light (CSM-compatible dual rig)
    this.cascadeFillLight = new THREE.DirectionalLight(0x8cb8ff, 0.42);
    this.cascadeFillLight.name = 'AtmosphereCascadeFillLight';
    this.cascadeFillLight.castShadow = false;
    this.scene.add(this.cascadeFillLight);
    this.scene.add(this.cascadeFillLight.target);

    // Hemisphere ambient sky/ground irradiance
    this.hemiLight = new THREE.HemisphereLight(0x87beff, 0x3b352c, 0.72);
    this.hemiLight.name = 'AtmosphereHemiLight';
    this.scene.add(this.hemiLight);

    // Dynamic exponential atmospheric fog
    this.fog = new THREE.FogExp2(0x9ec5e8, 0.00045);
    this.scene.fog = this.fog;

    // Dedicated mini scene for fast PMREM PBR environment reflection probes
    this.envScene = new THREE.Scene();
    const envGeo = new THREE.SphereGeometry(40, 24, 16);
    this.envSkyMesh = new THREE.Mesh(envGeo, this.skyMaterial);
    this.envSkyMesh.frustumCulled = false;
    this.envScene.add(this.envSkyMesh);

    this.recomputeAtmosphereState();

    if (rendererOrShadowSize && typeof rendererOrShadowSize !== 'number') {
      this.refreshEnvironmentMap(rendererOrShadowSize);
    }
  }

  setShadowMapSize(size: number): void {
    const clamped = Math.max(512, Math.min(4096, Math.round(size)));
    if (clamped !== this.shadowMapSize) {
      this.shadowMapSize = clamped;
      this.sunLight.shadow.mapSize.set(clamped, clamped);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
    }
  }

  setTimeOfDay(hours24: number): void {
    const wrapped = ((hours24 % 24) + 24) % 24;
    this.timeOfDay = wrapped;
    this.recomputeAtmosphereState();
  }

  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  setWeather(weather: WeatherPreset, intensity = 1.0): void {
    this.weather = weather;
    this.weatherIntensity = Math.max(0.0, Math.min(1.0, intensity));
    this.recomputeAtmosphereState();
  }

  getWeather(): WeatherPreset {
    return this.weather;
  }

  setSpaceBlend(spaceFactor: number): void {
    this.spaceBlend = Math.max(0.0, Math.min(1.0, spaceFactor));
    this.recomputeAtmosphereState();
  }

  getSpaceBlend(): number {
    return this.spaceBlend;
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    this.elapsedTime += dt;
    this.skyMaterial.uniforms.uTime.value = this.elapsedTime;
    this.skyMesh.position.copy(playerPosition);

    // Choose solar or lunar shadow-casting direction so shadows never project from underground
    const sunElev = this.sunDirection.y;
    if (this.spaceBlend > 0.65 || sunElev >= -0.04) {
      this._activeLightDir.copy(this.sunDirection);
      if (this.spaceBlend <= 0.65 && this._activeLightDir.y < 0.06) {
        this._activeLightDir.y = 0.06;
        this._activeLightDir.normalize();
      }
    } else {
      this._moonDir
        .set(-this.sunDirection.x, -this.sunDirection.y + 0.14, -this.sunDirection.z + 0.16)
        .normalize();
      if (this._moonDir.y < 0.12) {
        this._moonDir.y = 0.12;
        this._moonDir.normalize();
      }
      this._activeLightDir.copy(this._moonDir);
    }

    // Texel-snapped orthographic shadow camera projection to eliminate shadow edge shimmer
    const refUp =
      Math.abs(this._activeLightDir.y) > 0.98 ? this._fallbackUp : this._worldUp;
    this._lightRight.crossVectors(refUp, this._activeLightDir).normalize();
    this._lightUp.crossVectors(this._activeLightDir, this._lightRight).normalize();

    const texelSize = (this.shadowExtent * 2.0) / this.shadowMapSize;
    const snappedRight = Math.round(playerPosition.dot(this._lightRight) / texelSize) * texelSize;
    const snappedUp = Math.round(playerPosition.dot(this._lightUp) / texelSize) * texelSize;
    const forwardProj = playerPosition.dot(this._activeLightDir);

    this._snappedTarget
      .set(0, 0, 0)
      .addScaledVector(this._lightRight, snappedRight)
      .addScaledVector(this._lightUp, snappedUp)
      .addScaledVector(this._activeLightDir, forwardProj);

    this.sunLight.target.position.copy(this._snappedTarget);
    this.sunLight.target.updateMatrixWorld();

    this.sunLight.position
      .copy(this._snappedTarget)
      .addScaledVector(this._activeLightDir, this.shadowDistance);

    // Opposite wide-angle sky bounce fill direction
    this.cascadeFillLight.position.set(
      playerPosition.x - this._activeLightDir.x * 80.0,
      playerPosition.y + 90.0,
      playerPosition.z - this._activeLightDir.z * 80.0
    );
    this.cascadeFillLight.target.position.copy(playerPosition);
    this.cascadeFillLight.target.updateMatrixWorld();
  }

  refreshEnvironmentMap(renderer: THREE.WebGLRenderer): void {
    if (!this.pmremGenerator || this.pmremRenderer !== renderer) {
      if (this.pmremGenerator) {
        this.pmremGenerator.dispose();
      }
      this.pmremGenerator = new THREE.PMREMGenerator(renderer);
      this.pmremGenerator.compileCubemapShader();
      this.pmremRenderer = renderer;
    }

    const prevTarget = this.envRenderTarget;
    this.envRenderTarget = this.pmremGenerator.fromScene(this.envScene, 0.02, 0.1, 150.0);
    this.scene.environment = this.envRenderTarget.texture;

    if (prevTarget) {
      prevTarget.dispose();
    }
  }

  dispose(): void {
    this.scene.remove(this.skyMesh);
    this.scene.remove(this.sunLight);
    this.scene.remove(this.sunLight.target);
    this.scene.remove(this.cascadeFillLight);
    this.scene.remove(this.cascadeFillLight.target);
    this.scene.remove(this.hemiLight);

    this.skyMesh.geometry.dispose();
    this.envSkyMesh.geometry.dispose();
    this.skyMaterial.dispose();

    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
    }
    if (this.envRenderTarget) {
      if (this.scene.environment === this.envRenderTarget.texture) {
        this.scene.environment = null;
      }
      this.envRenderTarget.dispose();
      this.envRenderTarget = null;
    }
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }
  }

  private recomputeAtmosphereState(): void {
    // Solar orbital trajectory: 6:00 sunrise, 12:00 high transit, 18:00 sunset
    const solarAngle = ((this.timeOfDay - 6.0) / 24.0) * Math.PI * 2.0;
    const azimuthTilt = 0.34;
    const elev = Math.sin(solarAngle);
    const horiz = Math.cos(solarAngle);

    this.sunDirection
      .set(
        horiz * Math.cos(azimuthTilt),
        elev,
        horiz * Math.sin(azimuthTilt) + 0.22
      )
      .normalize();

    const sunUniform = this.skyMaterial.uniforms.uSunDirection.value as THREE.Vector3;
    sunUniform.copy(this.sunDirection);

    // Weather optical parameters
    const wInt = this.weatherIntensity;
    let coverage = 0.20;
    let darkness = 0.06;
    let haziness = 0.12;
    let precip = 0.0;
    let baseFogDensity = 0.00042;
    this._weatherTint.setRGB(1.0, 1.0, 1.0);

    switch (this.weather) {
      case 'clear':
        coverage = 0.18;
        darkness = 0.05;
        haziness = 0.10;
        precip = 0.0;
        baseFogDensity = 0.00038;
        break;
      case 'cloudy':
        coverage = 0.22 + 0.56 * wInt;
        darkness = 0.10 + 0.35 * wInt;
        haziness = 0.16 + 0.28 * wInt;
        precip = 0.0;
        baseFogDensity = 0.00045 + 0.00075 * wInt;
        this._weatherTint.setRGB(0.90, 0.93, 0.98);
        break;
      case 'rain':
        coverage = 0.45 + 0.48 * wInt;
        darkness = 0.35 + 0.45 * wInt;
        haziness = 0.35 + 0.45 * wInt;
        precip = 0.65 * wInt;
        baseFogDensity = 0.00065 + 0.0022 * wInt;
        this._weatherTint.setRGB(0.72, 0.80, 0.90);
        break;
      case 'snow':
        coverage = 0.42 + 0.50 * wInt;
        darkness = 0.18 + 0.26 * wInt;
        haziness = 0.45 + 0.45 * wInt;
        precip = 0.78 * wInt;
        baseFogDensity = 0.00080 + 0.0030 * wInt;
        this._weatherTint.setRGB(0.92, 0.95, 1.0);
        break;
      case 'fog':
        coverage = 0.35 + 0.45 * wInt;
        darkness = 0.15 + 0.25 * wInt;
        haziness = 0.60 + 0.38 * wInt;
        precip = 0.15 * wInt;
        baseFogDensity = 0.0012 + 0.0072 * wInt;
        this._weatherTint.setRGB(0.86, 0.90, 0.94);
        break;
      case 'storm':
        coverage = 0.65 + 0.33 * wInt;
        darkness = 0.55 + 0.40 * wInt;
        haziness = 0.50 + 0.42 * wInt;
        precip = 0.92 * wInt;
        baseFogDensity = 0.0010 + 0.0038 * wInt;
        this._weatherTint.setRGB(0.58, 0.66, 0.78);
        break;
    }

    this.skyMaterial.uniforms.uSpaceBlend.value = this.spaceBlend;
    this.skyMaterial.uniforms.uCloudCoverage.value = coverage;
    this.skyMaterial.uniforms.uCloudDarkness.value = darkness;
    this.skyMaterial.uniforms.uHaziness.value = haziness;
    this.skyMaterial.uniforms.uPrecipitation.value = precip;
    (this.skyMaterial.uniforms.uWeatherTint.value as THREE.Color).copy(this._weatherTint);

    // Smooth day / twilight / night curves
    const sunY = this.sunDirection.y;
    const dayFactor = THREE.MathUtils.smoothstep(sunY, -0.06, 0.30);
    const twilightFactor = Math.exp(-Math.pow((sunY - 0.02) / 0.16, 2.0));
    const nightFactor = 1.0 - THREE.MathUtils.smoothstep(sunY, -0.20, 0.06);
    const cloudAtten = 1.0 - darkness * 0.62;

    // Sun / Moon light color & intensity
    if (this.spaceBlend > 0.75) {
      this._sunColor.setRGB(1.0, 0.98, 0.94);
      this.sunLight.color.copy(this._sunColor);
      this.sunLight.intensity = THREE.MathUtils.lerp(2.4, 3.2, this.spaceBlend);
    } else if (sunY >= -0.04) {
      // Sunrise/sunset golden-amber transitioning to crisp warm daylight
      this._sunColor.setRGB(1.0, 0.48, 0.20).lerp(new THREE.Color(1.0, 0.96, 0.89), dayFactor);
      this._sunColor.multiply(this._weatherTint);
      this.sunLight.color.copy(this._sunColor);
      const crossoverDip = THREE.MathUtils.smoothstep(sunY, -0.04, 0.06);
      this.sunLight.intensity = (0.35 + 2.45 * dayFactor + 0.55 * twilightFactor) * cloudAtten * crossoverDip;
    } else {
      // Cool silver-blue moonlight at night
      const moonIn = THREE.MathUtils.smoothstep(-sunY, 0.04, 0.18);
      this.sunLight.color.setRGB(0.62, 0.76, 1.0).multiply(this._weatherTint);
      this.sunLight.intensity = 0.32 * moonIn * cloudAtten;
    }

    // Hemisphere & cascade fill lights
    this._hemiSkyColor
      .setRGB(0.08, 0.13, 0.26)
      .lerp(new THREE.Color(0.54, 0.75, 1.0), dayFactor);
    if (twilightFactor > 0.01) {
      this._hemiSkyColor.lerp(new THREE.Color(0.86, 0.48, 0.34), twilightFactor * 0.48);
    }
    this._hemiSkyColor.multiply(this._weatherTint);

    this._hemiGroundColor
      .setRGB(0.03, 0.035, 0.05)
      .lerp(new THREE.Color(0.24, 0.21, 0.17), dayFactor);

    this.hemiLight.color.copy(this._hemiSkyColor);
    this.hemiLight.groundColor.copy(this._hemiGroundColor);
    this.hemiLight.intensity = THREE.MathUtils.lerp(
      (0.28 + 0.56 * dayFactor) * (1.0 - darkness * 0.25),
      0.16,
      this.spaceBlend
    );

    this.cascadeFillLight.color.copy(this._hemiSkyColor);
    this.cascadeFillLight.intensity = THREE.MathUtils.lerp(
      0.14 + 0.32 * dayFactor + 0.12 * nightFactor,
      0.08,
      this.spaceBlend
    );

    // Dynamic horizon-matched exponential fog (strictly 0 density in deep space!)
    this._fogColor
      .setRGB(0.025, 0.04, 0.085)
      .lerp(new THREE.Color(0.62, 0.79, 0.95), dayFactor);
    if (twilightFactor > 0.01) {
      this._fogColor.lerp(new THREE.Color(0.92, 0.50, 0.28), twilightFactor * 0.62);
    }
    this._fogColor.multiply(this._weatherTint);
    this._fogColor.multiplyScalar(1.0 - this.spaceBlend);

    this.fog.color.copy(this._fogColor);
    const spaceFogScale = Math.pow(Math.max(0.0, 1.0 - this.spaceBlend), 2.6);
    const nightMistBoost = 1.0 + nightFactor * 0.22;
    this.fog.density = this.spaceBlend >= 0.995 ? 0.0 : baseFogDensity * nightMistBoost * spaceFogScale;
  }
}
