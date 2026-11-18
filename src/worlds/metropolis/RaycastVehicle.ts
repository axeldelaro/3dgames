import * as THREE from 'three';
import type { EngineContext, InputState, NetVehiclePacket } from '../../core/types';

export type MetropolisVehicleKind = 'car' | 'moto' | 'heli';

export interface BuildingColliderAABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
  walkableRoof?: boolean;
}

export interface RaycastVehicleOptions {
  id: string;
  kind: MetropolisVehicleKind;
  paintColor: number;
  accentColor?: number;
  position: THREE.Vector3;
  heading?: number;
}

interface SmokeParticle {
  active: boolean;
  age: number;
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
}

/**
 * Single-draw-call GPU InstancedMesh particle pool for drift & burnout tire smoke.
 */
export class TireSmokePool {
  public readonly mesh: THREE.InstancedMesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly particles: SmokeParticle[] = [];
  private readonly capacity: number;
  private cursor = 0;
  private readonly dummy = new THREE.Object3D();

  constructor(capacity = 112) {
    this.capacity = capacity;
    this.geometry = new THREE.IcosahedronGeometry(0.32, 1);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xdce6f2,
      emissive: 0x222a35,
      emissiveIntensity: 0.25,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;

    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) {
      this.particles.push({
        active: false,
        age: 0,
        life: 1,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 0.001
      });
      this.mesh.setMatrixAt(i, zeroMat);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, baseScale = 0.65): void {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.capacity;
    p.active = true;
    p.age = 0;
    p.life = 0.65 + Math.random() * 0.55;
    p.x = x + (Math.random() - 0.5) * 0.22;
    p.y = y + 0.08 + Math.random() * 0.1;
    p.z = z + (Math.random() - 0.5) * 0.22;
    p.vx = vx * 0.25 + (Math.random() - 0.5) * 1.1;
    p.vy = vy + 0.85 + Math.random() * 0.9;
    p.vz = vz * 0.25 + (Math.random() - 0.5) * 1.1;
    p.scale = baseScale * (0.8 + Math.random() * 0.45);
  }

  update(dt: number): void {
    let anyUpdated = false;
    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyUpdated = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.dummy.position.set(0, -500, 0);
        this.dummy.scale.setScalar(0.0001);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      const t = p.age / p.life;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= Math.max(0, 1 - dt * 2.4);
      p.vz *= Math.max(0, 1 - dt * 2.4);
      p.vy *= Math.max(0, 1 - dt * 1.2);

      const fade = Math.sin(t * Math.PI);
      const s = p.scale * (0.55 + t * 2.15) * Math.max(0.05, fade);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(t * 1.7, i * 0.4 + t * 1.3, t * 0.9);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    if (anyUpdated) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

interface WheelAssembly {
  mountLocal: THREE.Vector3;
  isFront: boolean;
  isLeft: boolean;
  knuckle: THREE.Group;
  spinner: THREE.Group;
  prevCompression: number;
  compression: number;
  contactWorld: THREE.Vector3;
  grounded: boolean;
}

const GEAR_RATIOS = [3.65, 2.48, 1.84, 1.39, 1.09, 0.86];
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const TEMP_VEC_A = new THREE.Vector3();
const TEMP_VEC_B = new THREE.Vector3();
const TEMP_QUAT = new THREE.Quaternion();

/**
 * Multi-modal PBR Vehicle with 4-Wheel Raycast Spring-Damper Suspension, Ackermann Steering,
 * Handbrake Drift Slip-Angle Physics, Dynamic-Lean Superbike, and Collective/Cyclic Urban Helicopter.
 */
export class RaycastVehicle {
  public readonly id: string;
  public readonly kind: MetropolisVehicleKind;
  public readonly root = new THREE.Group();
  public readonly velocity = new THREE.Vector3();
  public readonly driverSeatOffset = new THREE.Vector3(0, 0.75, 0.1);

  public speedKmh = 0;
  public rpm = 900;
  public gear = 'N';
  public tireSlip = 0;
  public steeringAngle = 0;
  public wheelSpin = 0;
  public extraMetric = 0;
  public isOccupied = false;

  private yaw = 0;
  private bodyPitch = 0;
  private bodyRoll = 0;
  private bodyHeave = 0;
  private bodyHeaveVel = 0;
  private yawRate = 0;
  private currentGearIndex = 0;
  private smokeTimer = 0;

  // Moto specific state
  private leanAngle = 0;
  private wheelieAngle = 0;
  private wheelieVel = 0;

  // Helicopter specific state
  private rotorRpm = 0;
  private heliPitch = 0;
  private heliRoll = 0;
  private mainRotorAngle = 0;

  // Visual sub-hierarchies
  private readonly chassisGroup = new THREE.Group();
  private readonly motoLeanGroup = new THREE.Group();
  private readonly motoPitchGroup = new THREE.Group();
  private mainRotorGroup: THREE.Group | null = null;
  private tailRotorGroup: THREE.Group | null = null;
  private rotorBlurMesh: THREE.Mesh | null = null;

  private readonly wheels: WheelAssembly[] = [];
  private readonly spotLights: THREE.SpotLight[] = [];
  private brakeLightMat: THREE.MeshStandardMaterial | null = null;
  private headlightEmissiveMat: THREE.MeshStandardMaterial | null = null;

  private readonly ownedGeometries: THREE.BufferGeometry[] = [];
  private readonly ownedMaterials: THREE.Material[] = [];

  constructor(ctx: EngineContext, options: RaycastVehicleOptions) {
    this.id = options.id;
    this.kind = options.kind;
    this.yaw = options.heading ?? 0;

    this.root.position.copy(options.position);
    this.root.rotation.set(0, this.yaw, 0, 'YXZ');
    this.root.add(this.chassisGroup);

    const accent = options.accentColor ?? 0x28e0ff;

    if (this.kind === 'car') {
      this.driverSeatOffset.set(-0.42, 0.55, 0.05);
      this.buildSportsCarModel(ctx, options.paintColor, accent);
    } else if (this.kind === 'moto') {
      this.driverSeatOffset.set(0, 0.88, 0.18);
      this.buildSuperbikeModel(ctx, options.paintColor, accent);
    } else {
      this.driverSeatOffset.set(-0.38, 0.92, -0.45);
      this.buildHelicopterModel(ctx, options.paintColor, accent);
    }

    this.setActiveLights(false);
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  get quaternion(): THREE.Quaternion {
    return this.root.quaternion;
  }

  get headingRad(): number {
    return this.yaw;
  }

  get headingDeg(): number {
    const deg = ((-this.yaw * 180) / Math.PI) % 360;
    return (deg + 360) % 360;
  }

  private trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.ownedGeometries.push(geo);
    return geo;
  }

  private trackMat<T extends THREE.Material>(mat: T): T {
    this.ownedMaterials.push(mat);
    return mat;
  }

  private buildSportsCarModel(ctx: EngineContext, paintHex: number, accentHex: number): void {
    const paintMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: paintHex,
        metalness: 0.78,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06
      })
    );

    const carbonMat = this.trackMat(
      ctx.textures.createPBRMaterial('carbon', {
        repeatX: 2,
        repeatY: 2,
        roughness: 0.32,
        metalness: 0.48
      })
    );

    const darkTrimMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x151922,
        metalness: 0.65,
        roughness: 0.42
      })
    );

    const glassMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x0b1624,
        metalness: 0.12,
        roughness: 0.06,
        transmission: 0.48,
        transparent: true,
        opacity: 0.84,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04
      })
    );

    const accentStripMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 1.6,
        roughness: 0.25,
        metalness: 0.3
      })
    );

    this.headlightEmissiveMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xd8f4ff,
        emissiveIntensity: 3.4,
        roughness: 0.15,
        metalness: 0.1
      })
    );

    this.brakeLightMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff2238,
        emissive: 0xff102b,
        emissiveIntensity: 2.0,
        roughness: 0.2,
        metalness: 0.15
      })
    );

    // Main sculpted lower monocoque tub (-Z is forward)
    const lowerBody = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.94, 0.44, 4.35)), paintMat);
    lowerBody.position.set(0, 0.52, 0);
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisGroup.add(lowerBody);

    // Sloped aerodynamic front hood wedge
    const frontHood = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.84, 0.26, 1.35)), paintMat);
    frontHood.position.set(0, 0.66, -1.48);
    frontHood.rotation.x = 0.14;
    frontHood.castShadow = true;
    this.chassisGroup.add(frontHood);

    // Muscular wide front & rear fender arches
    const fenderGeo = this.trackGeo(new THREE.BoxGeometry(2.08, 0.34, 1.12));
    const frontFenders = new THREE.Mesh(fenderGeo, paintMat);
    frontFenders.position.set(0, 0.56, -1.38);
    frontFenders.castShadow = true;
    this.chassisGroup.add(frontFenders);

    const rearFenders = new THREE.Mesh(fenderGeo, paintMat);
    rearFenders.position.set(0, 0.60, 1.35);
    rearFenders.castShadow = true;
    this.chassisGroup.add(rearFenders);

    // Rear engine fastback deck with carbon vents
    const rearDeck = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.82, 0.32, 1.48)), paintMat);
    rearDeck.position.set(0, 0.78, 1.22);
    rearDeck.rotation.x = -0.11;
    rearDeck.castShadow = true;
    this.chassisGroup.add(rearDeck);

    const engineLouvers = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.06, 0.08, 1.1)), carbonMat);
    engineLouvers.position.set(0, 0.94, 1.15);
    engineLouvers.rotation.x = -0.11;
    this.chassisGroup.add(engineLouvers);

    // Sculpted teardrop glass canopy
    const canopy = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.48, 0.46, 1.88)), glassMat);
    canopy.position.set(0, 0.98, -0.08);
    canopy.castShadow = true;
    this.chassisGroup.add(canopy);

    const roofCap = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.34, 0.07, 1.12)), carbonMat);
    roofCap.position.set(0, 1.22, 0.02);
    this.chassisGroup.add(roofCap);

    // Carbon front splitter, side skirts & rear aero diffuser
    const frontSplitter = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.04, 0.07, 0.55)), carbonMat);
    frontSplitter.position.set(0, 0.28, -2.08);
    this.chassisGroup.add(frontSplitter);

    const sideSkirtGeo = this.trackGeo(new THREE.BoxGeometry(2.08, 0.08, 2.05));
    const sideSkirts = new THREE.Mesh(sideSkirtGeo, carbonMat);
    sideSkirts.position.set(0, 0.29, 0.0);
    this.chassisGroup.add(sideSkirts);

    const sideAccent = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.1, 0.03, 1.75)), accentStripMat);
    sideAccent.position.set(0, 0.34, 0.0);
    this.chassisGroup.add(sideAccent);

    const rearDiffuser = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.92, 0.22, 0.36)), carbonMat);
    rearDiffuser.position.set(0, 0.34, 2.12);
    this.chassisGroup.add(rearDiffuser);

    // Twin chrome exhausts
    const exhaustGeo = this.trackGeo(new THREE.CylinderGeometry(0.065, 0.065, 0.24, 12));
    exhaustGeo.rotateX(Math.PI * 0.5);
    for (const sx of [-0.42, 0.42]) {
      const ex = new THREE.Mesh(exhaustGeo, darkTrimMat);
      ex.position.set(sx, 0.38, 2.24);
      this.chassisGroup.add(ex);
    }

    // Elevated Carbon GT Rear Spoiler + Twin Pylons
    const pylonGeo = this.trackGeo(new THREE.BoxGeometry(0.06, 0.28, 0.32));
    for (const sx of [-0.58, 0.58]) {
      const pylon = new THREE.Mesh(pylonGeo, carbonMat);
      pylon.position.set(sx, 1.02, 1.94);
      pylon.rotation.x = -0.18;
      this.chassisGroup.add(pylon);
    }
    const gtWing = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.98, 0.06, 0.34)), carbonMat);
    gtWing.position.set(0, 1.16, 2.02);
    gtWing.rotation.x = 0.09;
    gtWing.castShadow = true;
    this.chassisGroup.add(gtWing);

    // Dual glowing laser LED headlights + Real SpotLights
    const hlGeo = this.trackGeo(new THREE.BoxGeometry(0.42, 0.08, 0.12));
    for (const sx of [-0.66, 0.66]) {
      const hl = new THREE.Mesh(hlGeo, this.headlightEmissiveMat);
      hl.position.set(sx, 0.62, -2.16);
      hl.rotation.y = sx < 0 ? 0.12 : -0.12;
      this.chassisGroup.add(hl);

      const spot = new THREE.SpotLight(0xdff6ff, 0, 56, 0.52, 0.48, 1.3);
      spot.position.set(sx, 0.64, -2.18);
      spot.castShadow = false;
      spot.target.position.set(sx * 0.8, 0.05, -24.0);
      this.chassisGroup.add(spot);
      this.chassisGroup.add(spot.target);
      this.spotLights.push(spot);
    }

    // Full-width cyberpunk tail light strip + dual brake clusters
    const tailStrip = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.86, 0.065, 0.08)), this.brakeLightMat);
    tailStrip.position.set(0, 0.74, 2.18);
    this.chassisGroup.add(tailStrip);

    const brakeClusterGeo = this.trackGeo(new THREE.BoxGeometry(0.38, 0.12, 0.09));
    for (const sx of [-0.68, 0.68]) {
      const bc = new THREE.Mesh(brakeClusterGeo, this.brakeLightMat);
      bc.position.set(sx, 0.72, 2.18);
      this.chassisGroup.add(bc);
    }

    // 4 Rotating 3D Wheels with Ventilated Brake Discs & Fixed Racing Calipers
    const tireMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x141619,
        roughness: 0.86,
        metalness: 0.08
      })
    );
    const rimMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd4dde8,
        roughness: 0.22,
        metalness: 0.92
      })
    );
    const rotorMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x8f99a6,
        roughness: 0.34,
        metalness: 0.88
      })
    );
    const caliperMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff2a3c,
        roughness: 0.28,
        metalness: 0.55
      })
    );

    const tireGeo = this.trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 20));
    tireGeo.rotateZ(Math.PI * 0.5);
    const rimGeo = this.trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.29, 14));
    rimGeo.rotateZ(Math.PI * 0.5);
    const spokeGeo = this.trackGeo(new THREE.BoxGeometry(0.30, 0.42, 0.055));
    const rotorGeo = this.trackGeo(new THREE.CylinderGeometry(0.20, 0.20, 0.04, 16));
    rotorGeo.rotateZ(Math.PI * 0.5);
    const caliperGeo = this.trackGeo(new THREE.BoxGeometry(0.08, 0.15, 0.11));

    const wheelSpecs: Array<{ x: number; y: number; z: number; isFront: boolean; isLeft: boolean }> = [
      { x: -0.94, y: 0.36, z: -1.40, isFront: true, isLeft: true },
      { x: 0.94, y: 0.36, z: -1.40, isFront: true, isLeft: false },
      { x: -0.96, y: 0.36, z: 1.38, isFront: false, isLeft: true },
      { x: 0.96, y: 0.36, z: 1.38, isFront: false, isLeft: false }
    ];

    for (const spec of wheelSpecs) {
      const knuckle = new THREE.Group();
      knuckle.position.set(spec.x, spec.y, spec.z);
      this.root.add(knuckle);

      // Non-spinning brake caliper attached to steering knuckle
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(spec.isLeft ? 0.05 : -0.05, 0.08, spec.isFront ? 0.12 : -0.12);
      knuckle.add(caliper);

      const spinner = new THREE.Group();
      knuckle.add(spinner);

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      spinner.add(tire);

      const rim = new THREE.Mesh(rimGeo, rimMat);
      spinner.add(rim);

      const spokeA = new THREE.Mesh(spokeGeo, darkTrimMat);
      const spokeB = new THREE.Mesh(spokeGeo, darkTrimMat);
      spokeB.rotation.x = Math.PI * 0.5;
      spinner.add(spokeA, spokeB);

      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.position.x = spec.isLeft ? 0.04 : -0.04;
      spinner.add(rotor);

      this.wheels.push({
        mountLocal: new THREE.Vector3(spec.x, 0.64, spec.z),
        isFront: spec.isFront,
        isLeft: spec.isLeft,
        knuckle,
        spinner,
        prevCompression: 0.12,
        compression: 0.12,
        contactWorld: new THREE.Vector3(),
        grounded: true
      });
    }
  }

  private buildSuperbikeModel(ctx: EngineContext, paintHex: number, accentHex: number): void {
    this.chassisGroup.add(this.motoLeanGroup);
    this.motoPitchGroup.position.set(0, 0.33, 0.68); // Pivot around rear axle for realistic wheelies!
    this.motoLeanGroup.add(this.motoPitchGroup);

    const bodyOffset = new THREE.Group();
    bodyOffset.position.set(0, -0.33, -0.68);
    this.motoPitchGroup.add(bodyOffset);

    const paintMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: paintHex,
        metalness: 0.76,
        roughness: 0.17,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05
      })
    );

    const carbonMat = this.trackMat(
      ctx.textures.createPBRMaterial('carbon', {
        repeatX: 2,
        repeatY: 2,
        roughness: 0.3,
        metalness: 0.48
      })
    );

    const goldForkMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe6b43c,
        metalness: 0.9,
        roughness: 0.2
      })
    );

    const darkMetalMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1c222b,
        metalness: 0.72,
        roughness: 0.36
      })
    );

    const tireMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x14161a,
        roughness: 0.85,
        metalness: 0.06
      })
    );

    const accentMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 1.8,
        roughness: 0.25,
        metalness: 0.4
      })
    );

    this.headlightEmissiveMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xdff7ff,
        emissiveIntensity: 3.8,
        roughness: 0.15,
        metalness: 0.1
      })
    );

    this.brakeLightMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff2038,
        emissive: 0xff1028,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.1
      })
    );

    // Engine block & trellis frame
    const engineBlock = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.36, 0.42, 0.58)), darkMetalMat);
    engineBlock.position.set(0, 0.52, -0.05);
    engineBlock.castShadow = true;
    bodyOffset.add(engineBlock);

    const trellisGeo = this.trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8));
    trellisGeo.rotateX(Math.PI * 0.36);
    for (const sx of [-0.19, 0.19]) {
      const rail = new THREE.Mesh(trellisGeo, accentMat);
      rail.position.set(sx, 0.72, -0.22);
      bodyOffset.add(rail);
    }

    // Sculpted fuel tank + aerodynamic side shrouds
    const fuelTank = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.44, 0.30, 0.62)), paintMat);
    fuelTank.position.set(0, 0.88, -0.18);
    fuelTank.rotation.x = 0.16;
    fuelTank.castShadow = true;
    bodyOffset.add(fuelTank);

    // Carbon belly pan
    const bellyPan = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.38, 0.16, 0.78)), carbonMat);
    bellyPan.position.set(0, 0.28, -0.06);
    bodyOffset.add(bellyPan);

    // Rider saddle & sharp streetfighter tail cowl
    const saddle = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.32, 0.11, 0.46)), carbonMat);
    saddle.position.set(0, 0.82, 0.28);
    bodyOffset.add(saddle);

    const tailCowl = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.30, 0.16, 0.48)), paintMat);
    tailCowl.position.set(0, 0.92, 0.64);
    tailCowl.rotation.x = 0.22;
    tailCowl.castShadow = true;
    bodyOffset.add(tailCowl);

    const tailLed = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.22, 0.055, 0.07)), this.brakeLightMat);
    tailLed.position.set(0, 0.97, 0.88);
    bodyOffset.add(tailLed);

    // Angled titanium exhaust muffler
    const mufflerGeo = this.trackGeo(new THREE.CylinderGeometry(0.055, 0.045, 0.52, 12));
    mufflerGeo.rotateX(Math.PI * 0.38);
    const muffler = new THREE.Mesh(mufflerGeo, darkMetalMat);
    muffler.position.set(0.23, 0.48, 0.48);
    bodyOffset.add(muffler);

    // Front steering assembly (USD gold forks, handlebars, streetfighter headlight cowl & front wheel)
    const frontSteer = new THREE.Group();
    frontSteer.position.set(0, 0.33, -0.72);
    bodyOffset.add(frontSteer);

    const forkGeo = this.trackGeo(new THREE.CylinderGeometry(0.028, 0.024, 0.78, 10));
    for (const sx of [-0.11, 0.11]) {
      const fork = new THREE.Mesh(forkGeo, goldForkMat);
      fork.position.set(sx, 0.36, 0.10);
      fork.rotation.x = -0.34;
      frontSteer.add(fork);
    }

    const handlebar = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.68, 8)), darkMetalMat);
    handlebar.rotation.z = Math.PI * 0.5;
    handlebar.position.set(0, 0.70, 0.22);
    frontSteer.add(handlebar);

    const noseCowl = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.34, 0.26, 0.24)), paintMat);
    noseCowl.position.set(0, 0.56, 0.02);
    noseCowl.rotation.x = 0.28;
    frontSteer.add(noseCowl);

    const hlStrip = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.28, 0.07, 0.06)), this.headlightEmissiveMat);
    hlStrip.position.set(0, 0.53, -0.10);
    frontSteer.add(hlStrip);

    const motoSpot = new THREE.SpotLight(0xdff7ff, 0, 52, 0.5, 0.45, 1.3);
    motoSpot.position.set(0, 0.55, -0.12);
    motoSpot.castShadow = false;
    motoSpot.target.position.set(0, -0.3, -22.0);
    frontSteer.add(motoSpot);
    frontSteer.add(motoSpot.target);
    this.spotLights.push(motoSpot);

    const frontFender = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.18, 0.08, 0.34)), carbonMat);
    frontFender.position.set(0, 0.34, -0.02);
    frontSteer.add(frontFender);

    // Front & Rear 3D Wheels
    const wheelTireGeo = this.trackGeo(new THREE.CylinderGeometry(0.33, 0.33, 0.16, 20));
    wheelTireGeo.rotateZ(Math.PI * 0.5);
    const rearTireGeo = this.trackGeo(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20));
    rearTireGeo.rotateZ(Math.PI * 0.5);
    const brakeDiscGeo = this.trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 16));
    brakeDiscGeo.rotateZ(Math.PI * 0.5);

    const frontSpinner = new THREE.Group();
    frontSteer.add(frontSpinner);
    const frontTire = new THREE.Mesh(wheelTireGeo, tireMat);
    frontTire.castShadow = true;
    frontSpinner.add(frontTire);
    for (const sx of [-0.085, 0.085]) {
      const disc = new THREE.Mesh(brakeDiscGeo, goldForkMat);
      disc.position.x = sx;
      frontSpinner.add(disc);
    }

    const rearKnuckle = new THREE.Group();
    rearKnuckle.position.set(0, 0.34, 0.68);
    bodyOffset.add(rearKnuckle);
    const swingarm = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.26, 0.09, 0.58)), darkMetalMat);
    swingarm.position.set(0, 0.04, -0.26);
    rearKnuckle.add(swingarm);

    const rearSpinner = new THREE.Group();
    rearKnuckle.add(rearSpinner);
    const rearTire = new THREE.Mesh(rearTireGeo, tireMat);
    rearTire.castShadow = true;
    rearSpinner.add(rearTire);
    const rearRim = new THREE.Mesh(brakeDiscGeo, accentMat);
    rearSpinner.add(rearRim);

    this.wheels.push(
      {
        mountLocal: new THREE.Vector3(0, 0.58, -0.72),
        isFront: true,
        isLeft: true,
        knuckle: frontSteer,
        spinner: frontSpinner,
        prevCompression: 0.1,
        compression: 0.1,
        contactWorld: new THREE.Vector3(),
        grounded: true
      },
      {
        mountLocal: new THREE.Vector3(0, 0.58, 0.68),
        isFront: false,
        isLeft: false,
        knuckle: rearKnuckle,
        spinner: rearSpinner,
        prevCompression: 0.1,
        compression: 0.1,
        contactWorld: new THREE.Vector3(),
        grounded: true
      }
    );
  }

  private buildHelicopterModel(ctx: EngineContext, paintHex: number, accentHex: number): void {
    const hullMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: paintHex,
        metalness: 0.72,
        roughness: 0.22,
        clearcoat: 0.95,
        clearcoatRoughness: 0.08
      })
    );

    const carbonMat = this.trackMat(
      ctx.textures.createPBRMaterial('carbon', {
        repeatX: 2,
        repeatY: 2,
        roughness: 0.34,
        metalness: 0.5
      })
    );

    const glassMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x0b1a2b,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.55,
        transparent: true,
        opacity: 0.78,
        clearcoat: 1.0
      })
    );

    const darkMetalMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1b212a,
        metalness: 0.8,
        roughness: 0.32
      })
    );

    const accentEmissiveMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.3
      })
    );

    const redStrobeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff2233,
        emissive: 0xff1122,
        emissiveIntensity: 3.2,
        roughness: 0.2,
        metalness: 0.1
      })
    );

    const greenStrobeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x22ff88,
        emissive: 0x11ee77,
        emissiveIntensity: 3.2,
        roughness: 0.2,
        metalness: 0.1
      })
    );

    this.headlightEmissiveMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe6f8ff,
        emissiveIntensity: 4.0,
        roughness: 0.12,
        metalness: 0.1
      })
    );

    // Tubular Landing Skids
    const skidTubeGeo = this.trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 10));
    skidTubeGeo.rotateX(Math.PI * 0.5);
    const strutGeo = this.trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.68, 8));
    for (const sx of [-0.95, 0.95]) {
      const skid = new THREE.Mesh(skidTubeGeo, darkMetalMat);
      skid.position.set(sx, 0.08, -0.15);
      skid.castShadow = true;
      this.chassisGroup.add(skid);

      for (const sz of [-0.95, 0.72]) {
        const strut = new THREE.Mesh(strutGeo, darkMetalMat);
        strut.position.set(sx * 0.82, 0.38, sz);
        strut.rotation.z = sx < 0 ? -0.32 : 0.32;
        this.chassisGroup.add(strut);
      }
    }

    // Main sculpted fuselage cabin & twin-turbine top cowling
    const cabinBase = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.78, 1.16, 3.15)), hullMat);
    cabinBase.position.set(0, 1.18, 0.05);
    cabinBase.castShadow = true;
    this.chassisGroup.add(cabinBase);

    // Panoramic Glass Bubble Nose Cockpit
    const glassNose = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.94, 20, 16)), glassMat);
    glassNose.scale.set(0.92, 0.78, 1.38);
    glassNose.position.set(0, 1.18, -1.18);
    this.chassisGroup.add(glassNose);

    // Interior cockpit seats & illuminated avionics console
    const avionicsConsole = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.92, 0.32, 0.38)), accentEmissiveMat);
    avionicsConsole.position.set(0, 0.96, -1.42);
    avionicsConsole.rotation.x = -0.35;
    this.chassisGroup.add(avionicsConsole);

    const turbineCowl = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.18, 0.48, 2.25)), carbonMat);
    turbineCowl.position.set(0, 1.96, 0.25);
    turbineCowl.castShadow = true;
    this.chassisGroup.add(turbineCowl);

    // Side accent stripes & navigation strobes
    const sideStripe = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.82, 0.09, 2.85)), accentEmissiveMat);
    sideStripe.position.set(0, 1.12, 0.1);
    this.chassisGroup.add(sideStripe);

    const strobeGeo = this.trackGeo(new THREE.SphereGeometry(0.07, 10, 10));
    const portLight = new THREE.Mesh(strobeGeo, redStrobeMat);
    portLight.position.set(-0.94, 1.15, -0.3);
    const starboardLight = new THREE.Mesh(strobeGeo, greenStrobeMat);
    starboardLight.position.set(0.94, 1.15, -0.3);
    this.chassisGroup.add(portLight, starboardLight);

    // Tail boom + swept vertical fin + horizontal stabilizers
    const tailBoom = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.18, 0.34, 3.65, 12)), hullMat);
    tailBoom.rotation.x = Math.PI * 0.5;
    tailBoom.position.set(0, 1.42, 3.25);
    tailBoom.castShadow = true;
    this.chassisGroup.add(tailBoom);

    const hStab = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.62, 0.06, 0.34)), carbonMat);
    hStab.position.set(0, 1.44, 4.15);
    this.chassisGroup.add(hStab);

    const vFin = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.12, 1.28, 0.68)), hullMat);
    vFin.position.set(0, 1.88, 4.92);
    vFin.rotation.x = 0.26;
    this.chassisGroup.add(vFin);

    // Main Rotor Mast & 4-Blade Rotor + Motion Blur Disc
    const mast = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.10, 0.14, 0.42, 12)), darkMetalMat);
    mast.position.set(0, 2.34, 0.08);
    this.chassisGroup.add(mast);

    this.mainRotorGroup = new THREE.Group();
    this.mainRotorGroup.position.set(0, 2.52, 0.08);
    this.chassisGroup.add(this.mainRotorGroup);

    const bladeGeo = this.trackGeo(new THREE.BoxGeometry(7.8, 0.035, 0.26));
    const bladeA = new THREE.Mesh(bladeGeo, darkMetalMat);
    const bladeB = new THREE.Mesh(bladeGeo, darkMetalMat);
    bladeB.rotation.y = Math.PI * 0.5;
    bladeA.castShadow = true;
    bladeB.castShadow = true;
    this.mainRotorGroup.add(bladeA, bladeB);

    const blurMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x9bb2c9,
        roughness: 0.35,
        metalness: 0.4,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.rotorBlurMesh = new THREE.Mesh(this.trackGeo(new THREE.RingGeometry(0.45, 3.9, 32)), blurMat);
    this.rotorBlurMesh.rotation.x = -Math.PI * 0.5;
    this.mainRotorGroup.add(this.rotorBlurMesh);

    // Spinning 4-Blade Tail Rotor
    this.tailRotorGroup = new THREE.Group();
    this.tailRotorGroup.position.set(0.14, 2.02, 5.02);
    this.chassisGroup.add(this.tailRotorGroup);

    const tailBladeGeo = this.trackGeo(new THREE.BoxGeometry(0.03, 1.24, 0.12));
    const tBladeA = new THREE.Mesh(tailBladeGeo, darkMetalMat);
    const tBladeB = new THREE.Mesh(tailBladeGeo, darkMetalMat);
    tBladeB.rotation.x = Math.PI * 0.5;
    this.tailRotorGroup.add(tBladeA, tBladeB);

    // Under-chin Gimbaled Searchlight
    const pod = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.16, 12, 12)), this.headlightEmissiveMat);
    pod.position.set(0, 0.56, -2.02);
    this.chassisGroup.add(pod);

    const searchlight = new THREE.SpotLight(0xe6f8ff, 0, 95, 0.58, 0.5, 1.2);
    searchlight.position.set(0, 0.52, -2.06);
    searchlight.castShadow = false;
    searchlight.target.position.set(0, -14.0, -28.0);
    this.chassisGroup.add(searchlight);
    this.chassisGroup.add(searchlight.target);
    this.spotLights.push(searchlight);
  }

  setActiveLights(active: boolean): void {
    const targetIntensity = active ? (this.kind === 'heli' ? 55 : 36) : 0;
    for (const light of this.spotLights) {
      light.intensity = targetIntensity;
    }
  }

  /**
   * Steps vehicle physics, suspension/lean/rotors, tire smoke, and building collisions.
   */
  update(
    dt: number,
    input: InputState | null,
    getGroundHeight: (x: number, z: number) => number,
    colliders: ReadonlyArray<BuildingColliderAABB>,
    smokePool: TireSmokePool,
    nightFactor: number
  ): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));

    if (this.headlightEmissiveMat) {
      const activeGlow = this.isOccupied || nightFactor > 0.35 ? 3.8 : 1.1;
      this.headlightEmissiveMat.emissiveIntensity = activeGlow;
    }

    if (this.kind === 'heli') {
      this.updateHelicopterPhysics(safeDt, input, getGroundHeight, colliders);
    } else if (this.kind === 'moto') {
      this.updateMotoPhysics(safeDt, input, getGroundHeight, colliders, smokePool);
    } else {
      this.updateCarPhysics(safeDt, input, getGroundHeight, colliders, smokePool);
    }
  }

  private sampleSupportHeight(
    wx: number,
    wz: number,
    currentY: number,
    getGroundHeight: (x: number, z: number) => number,
    colliders: ReadonlyArray<BuildingColliderAABB>
  ): number {
    let h = getGroundHeight(wx, wz);
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c.walkableRoof) continue;
      if (wx >= c.minX && wx <= c.maxX && wz >= c.minZ && wz <= c.maxZ) {
        if (currentY >= c.maxY - 1.5 && c.maxY > h) {
          h = c.maxY;
        }
      }
    }
    return h;
  }

  private resolveHorizontalCollisions(colliders: ReadonlyArray<BuildingColliderAABB>, radius: number): void {
    const px = this.root.position.x;
    const py = this.root.position.y;
    const pz = this.root.position.z;

    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (py >= b.maxY - 0.35) continue;

      const closestX = Math.max(b.minX, Math.min(px, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(pz, b.maxZ));
      const dx = px - closestX;
      const dz = pz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        let nx = 0;
        let nz = 1;
        let overlap = radius - dist;
        if (dist > 1e-4) {
          nx = dx / dist;
          nz = dz / dist;
        } else {
          const leftPen = Math.abs(px - b.minX);
          const rightPen = Math.abs(b.maxX - px);
          const frontPen = Math.abs(pz - b.minZ);
          const backPen = Math.abs(b.maxZ - pz);
          const minPen = Math.min(leftPen, rightPen, frontPen, backPen);
          overlap = minPen + radius;
          if (minPen === leftPen) { nx = -1; nz = 0; }
          else if (minPen === rightPen) { nx = 1; nz = 0; }
          else if (minPen === frontPen) { nx = 0; nz = -1; }
          else { nx = 0; nz = 1; }
        }

        this.root.position.x += nx * overlap;
        this.root.position.z += nz * overlap;

        const vn = this.velocity.x * nx + this.velocity.z * nz;
        if (vn < 0) {
          this.velocity.x -= (1.35 * vn) * nx;
          this.velocity.z -= (1.35 * vn) * nz;
          this.velocity.multiplyScalar(0.72);
        }
      }
    }
  }

  private updateCarPhysics(
    dt: number,
    input: InputState | null,
    getGroundHeight: (x: number, z: number) => number,
    colliders: ReadonlyArray<BuildingColliderAABB>,
    smokePool: TireSmokePool
  ): void {
    const forward = TEMP_VEC_A.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = TEMP_VEC_B.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const vForward = this.velocity.x * forward.x + this.velocity.z * forward.z;
    const vLateral = this.velocity.x * right.x + this.velocity.z * right.z;
    const absSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.speedKmh = absSpeed * 3.6;

    let throttleIn = 0;
    let brakeIn = 0;
    let steerIn = 0;
    let handbrake = false;
    let nitro = false;

    if (input) {
      throttleIn = Math.max(input.throttle, Math.max(0, input.moveZ));
      brakeIn = Math.max(input.brake, Math.max(0, -input.moveZ));
      steerIn = -input.moveX; // A (-1) steers left (+yaw), D (+1) steers right (-yaw)
      handbrake = input.handbrake || input.jump;
      nitro = input.sprint;
    } else {
      handbrake = absSpeed < 0.8;
    }

    // Speed-sensitive Ackermann steering
    const maxSteer = THREE.MathUtils.lerp(0.58, 0.21, THREE.MathUtils.clamp(this.speedKmh / 190, 0, 1));
    const targetSteer = steerIn * maxSteer;
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, targetSteer, 1 - Math.exp(-dt * 11.5));

    const wheelbase = 2.78;
    const trackWidth = 1.88;
    let ackermannLeft = this.steeringAngle;
    let ackermannRight = this.steeringAngle;
    if (Math.abs(this.steeringAngle) > 0.004) {
      const turnRadius = wheelbase / Math.tan(Math.abs(this.steeringAngle));
      const inner = Math.atan(wheelbase / Math.max(0.6, turnRadius - trackWidth * 0.5));
      const outer = Math.atan(wheelbase / (turnRadius + trackWidth * 0.5));
      if (this.steeringAngle > 0) {
        ackermannLeft = inner;
        ackermannRight = outer;
      } else {
        ackermannLeft = -outer;
        ackermannRight = -inner;
      }
    }

    // 4-Wheel Raycast & Spring-Damper Suspension
    const restLength = 0.28;
    const wheelRadius = 0.36;
    const kSpring = 46.0;
    const kDamper = 6.8;

    let totalSupportForce = 0;
    let frontForce = 0;
    let rearForce = 0;
    let leftForce = 0;
    let rightForce = 0;
    let groundedWheels = 0;

    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i];
      const wx = this.root.position.x + w.mountLocal.x * right.x - w.mountLocal.z * forward.x;
      const wz = this.root.position.z + w.mountLocal.x * right.z - w.mountLocal.z * forward.z;
      const mountY = this.root.position.y + w.mountLocal.y;

      const groundY = this.sampleSupportHeight(wx, wz, this.root.position.y, getGroundHeight, colliders);
      w.contactWorld.set(wx, groundY, wz);

      const distToGround = mountY - groundY;
      const maxRay = restLength + wheelRadius;

      w.prevCompression = w.compression;
      if (distToGround <= maxRay + 0.08) {
        w.grounded = true;
        groundedWheels++;
        const suspLen = THREE.MathUtils.clamp(distToGround - wheelRadius, 0.02, restLength);
        w.compression = restLength - suspLen;
        const compVel = (w.compression - w.prevCompression) / dt;
        const force = Math.max(0, w.compression * kSpring + compVel * kDamper);

        totalSupportForce += force;
        if (w.isFront) frontForce += force;
        else rearForce += force;
        if (w.isLeft) leftForce += force;
        else rightForce += force;

        w.knuckle.position.y = Math.max(0.22, wheelRadius - w.compression * 0.45);
      } else {
        w.grounded = false;
        w.compression = THREE.MathUtils.lerp(w.compression, 0, dt * 8);
        w.knuckle.position.y = wheelRadius - restLength * 0.35;
      }

      if (w.isFront) {
        w.knuckle.rotation.y = w.isLeft ? ackermannLeft : ackermannRight;
      }
      w.spinner.rotation.x = this.wheelSpin;
    }

    // Vertical gravity & spring balance
    const gravity = 22.0;
    if (groundedWheels > 0) {
      const avgGround =
        (this.wheels[0].contactWorld.y +
          this.wheels[1].contactWorld.y +
          this.wheels[2].contactWorld.y +
          this.wheels[3].contactWorld.y) *
        0.25;
      this.velocity.y += (totalSupportForce - gravity) * dt;
      this.root.position.y += this.velocity.y * dt;
      if (this.root.position.y < avgGround) {
        this.root.position.y = avgGround;
        if (this.velocity.y < 0) this.velocity.y = 0;
      }
      this.velocity.y *= Math.exp(-dt * 6.5);
    } else {
      this.velocity.y -= gravity * dt;
      this.root.position.y += this.velocity.y * dt;
      const centerGround = this.sampleSupportHeight(
        this.root.position.x,
        this.root.position.z,
        this.root.position.y,
        getGroundHeight,
        colliders
      );
      if (this.root.position.y < centerGround) {
        this.root.position.y = centerGround;
        this.velocity.y = 0;
      }
    }

    // Longitudinal acceleration, braking & reverse
    let longAccel = 0;
    const isBrakingForward = brakeIn > 0.05 && vForward > 1.2;
    if (groundedWheels >= 2) {
      if (throttleIn > 0.02) {
        const boostMult = nitro ? 1.38 : 1.0;
        const speedTaper = 1.0 - THREE.MathUtils.clamp(this.speedKmh / (nitro ? 265 : 225), 0, 0.92);
        longAccel += throttleIn * 26.5 * boostMult * speedTaper;
      }
      if (isBrakingForward) {
        longAccel -= brakeIn * 34.0;
      } else if (brakeIn > 0.05 && vForward <= 1.2) {
        // Engage Reverse
        const revTaper = 1.0 - THREE.MathUtils.clamp(Math.abs(vForward) / 16.0, 0, 0.9);
        longAccel -= brakeIn * 14.5 * revTaper;
      }
      if (handbrake) {
        longAccel -= Math.sign(vForward) * Math.min(Math.abs(vForward) * 8.0, 14.0);
      }
    }

    // Rolling resistance + aerodynamic drag
    const newVForward = (vForward + longAccel * dt) * Math.exp(-dt * 0.24);

    // Lateral Slip Angle & Handbrake Drift Physics
    const slipAngle = Math.atan2(vLateral, Math.max(1.6, Math.abs(vForward)));
    const cornerGrip = handbrake ? 2.15 : throttleIn > 0.7 && Math.abs(this.steeringAngle) > 0.22 ? 5.8 : 9.6;
    const newVLateral = vLateral * Math.exp(-dt * (groundedWheels > 0 ? cornerGrip : 0.5));

    // Yaw rate integration with drift counter-steer authority
    if (groundedWheels > 0) {
      const speedSign = vForward >= -0.35 ? 1 : -1;
      const moveFactor = THREE.MathUtils.clamp(Math.abs(vForward) / 4.2, 0, 1);
      const driftYawBoost = handbrake && Math.abs(vForward) > 4.0 ? 1.55 : 1.0;
      const targetYawRate = (this.steeringAngle * speedSign * Math.min(22, Math.abs(vForward) * 0.78) * driftYawBoost) / wheelbase;
      this.yawRate = THREE.MathUtils.lerp(this.yawRate, targetYawRate * moveFactor, 1 - Math.exp(-dt * 9.0));
      this.yaw += this.yawRate * dt;
    } else {
      this.yawRate *= Math.exp(-dt * 1.8);
      this.yaw += this.yawRate * dt;
    }

    // Reconstruct world horizontal velocity
    forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.velocity.x = forward.x * newVForward + right.x * newVLateral;
    this.velocity.z = forward.z * newVForward + right.z * newVLateral;

    this.root.position.x += this.velocity.x * dt;
    this.root.position.z += this.velocity.z * dt;
    this.resolveHorizontalCollisions(colliders, 1.32);

    this.root.rotation.set(0, this.yaw, 0, 'YXZ');

    // Chassis pitch squat/dive & roll body transfer
    const targetPitch = THREE.MathUtils.clamp(
      -longAccel * 0.0024 + (rearForce - frontForce) * 0.002,
      -0.085,
      0.085
    );
    const targetRoll = THREE.MathUtils.clamp(
      -this.yawRate * vForward * 0.0032 + (rightForce - leftForce) * 0.002,
      -0.11,
      0.11
    );
    this.bodyPitch = THREE.MathUtils.lerp(this.bodyPitch, targetPitch, 1 - Math.exp(-dt * 9.5));
    this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, targetRoll, 1 - Math.exp(-dt * 9.5));
    this.bodyHeaveVel += (-this.bodyHeave * 42 - this.bodyHeaveVel * 8) * dt;
    this.bodyHeave += this.bodyHeaveVel * dt;

    this.chassisGroup.position.y = this.bodyHeave;
    this.chassisGroup.rotation.set(this.bodyPitch, 0, this.bodyRoll, 'YXZ');

    // Wheel spin & brake light intensity
    const burnoutSpin = handbrake && throttleIn > 0.5 ? throttleIn * 24 : 0;
    this.wheelSpin -= ((newVForward / wheelRadius) + burnoutSpin * 0.4) * dt;

    if (this.brakeLightMat) {
      this.brakeLightMat.emissiveIntensity = isBrakingForward || handbrake ? 5.8 : 2.0;
    }

    // Tire slip & Drift Smoke emission
    const lateralSlipNorm = absSpeed > 3.5 ? THREE.MathUtils.clamp(Math.abs(slipAngle) * 1.85, 0, 1) : 0;
    const launchSlip = throttleIn > 0.8 && absSpeed < 8 && groundedWheels > 0 ? 0.55 : 0;
    const hbSlip = handbrake && absSpeed > 4.5 ? 0.85 : 0;
    this.tireSlip = groundedWheels > 0 ? Math.max(lateralSlipNorm, launchSlip, hbSlip) : 0;
    this.extraMetric = this.tireSlip;

    if (this.tireSlip > 0.26 && groundedWheels >= 2) {
      this.smokeTimer += dt * (14 + this.tireSlip * 28);
      while (this.smokeTimer >= 1) {
        this.smokeTimer -= 1;
        for (let i = 2; i < 4; i++) {
          const rw = this.wheels[i];
          if (rw && rw.grounded) {
            smokePool.spawn(
              rw.contactWorld.x,
              rw.contactWorld.y,
              rw.contactWorld.z,
              -this.velocity.x * 0.18,
              0.45,
              -this.velocity.z * 0.18,
              0.55 + this.tireSlip * 0.55
            );
          }
        }
      }
    }

    // 6-Speed Gearbox & Engine RPM Simulation
    this.updateGearboxAndRpm(dt, newVForward, throttleIn);
  }

  private updateMotoPhysics(
    dt: number,
    input: InputState | null,
    getGroundHeight: (x: number, z: number) => number,
    colliders: ReadonlyArray<BuildingColliderAABB>,
    smokePool: TireSmokePool
  ): void {
    const forward = TEMP_VEC_A.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = TEMP_VEC_B.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const vForward = this.velocity.x * forward.x + this.velocity.z * forward.z;
    const vLateral = this.velocity.x * right.x + this.velocity.z * right.z;
    const absSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.speedKmh = absSpeed * 3.6;

    let throttleIn = 0;
    let brakeIn = 0;
    let steerIn = 0;
    let handbrake = false;
    let boost = false;

    if (input) {
      throttleIn = Math.max(input.throttle, Math.max(0, input.moveZ));
      brakeIn = Math.max(input.brake, Math.max(0, -input.moveZ));
      steerIn = -input.moveX;
      handbrake = input.handbrake;
      boost = input.sprint || input.jump;
    } else {
      handbrake = absSpeed < 0.8;
    }

    const groundY = this.sampleSupportHeight(
      this.root.position.x,
      this.root.position.z,
      this.root.position.y,
      getGroundHeight,
      colliders
    );
    const grounded = this.root.position.y <= groundY + 0.14;
    if (grounded) {
      this.root.position.y = groundY;
      if (this.velocity.y < 0) this.velocity.y = 0;
    } else {
      this.velocity.y -= 22.0 * dt;
      this.root.position.y += this.velocity.y * dt;
      if (this.root.position.y < groundY) {
        this.root.position.y = groundY;
        this.velocity.y = 0;
      }
    }

    // High-thrust superbike acceleration
    let longAccel = 0;
    if (grounded) {
      if (throttleIn > 0.02) {
        const boostMult = boost ? 1.45 : 1.0;
        const taper = 1.0 - THREE.MathUtils.clamp(this.speedKmh / (boost ? 285 : 245), 0, 0.92);
        longAccel += throttleIn * 33.5 * boostMult * taper;
      }
      if (brakeIn > 0.05 && vForward > 1.0) {
        longAccel -= brakeIn * 36.0;
      } else if (brakeIn > 0.05 && vForward <= 1.0) {
        longAccel -= brakeIn * 11.0 * (1 - THREE.MathUtils.clamp(Math.abs(vForward) / 10, 0, 0.9));
      }
    }

    const newVForward = (vForward + longAccel * dt) * Math.exp(-dt * 0.22);
    const grip = handbrake ? 2.8 : 11.5;
    const newVLateral = vLateral * Math.exp(-dt * grip);

    const maxSteer = THREE.MathUtils.lerp(0.55, 0.24, THREE.MathUtils.clamp(this.speedKmh / 180, 0, 1));
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, steerIn * maxSteer, 1 - Math.exp(-dt * 12.0));

    if (grounded) {
      const moveFactor = THREE.MathUtils.clamp(Math.abs(vForward) / 3.2, 0, 1);
      const speedSign = vForward >= -0.3 ? 1 : -1;
      const yawRate = (this.steeringAngle * speedSign * Math.min(24, Math.abs(vForward) * 0.88)) / 1.42;
      this.yaw += yawRate * moveFactor * dt;
    }

    forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.velocity.x = forward.x * newVForward + right.x * newVLateral;
    this.velocity.z = forward.z * newVForward + right.z * newVLateral;

    this.root.position.x += this.velocity.x * dt;
    this.root.position.z += this.velocity.z * dt;
    this.resolveHorizontalCollisions(colliders, 0.85);
    this.root.rotation.set(0, this.yaw, 0, 'YXZ');

    // Dynamic roll-lean into turns: leanAngle = -steer * speedFactor * 0.68
    // Note: steerIn = -input.moveX, so steer = input.moveX = -steerIn.
    // Turning left (moveX < 0, steerIn > 0) leans left (+Z roll in local -Z forward frame).
    const steerNormalized = -steerIn;
    const speedFactor = THREE.MathUtils.clamp(this.speedKmh / 95.0, 0, 1);
    const targetLean = -steerNormalized * speedFactor * 0.68;
    this.leanAngle = THREE.MathUtils.lerp(this.leanAngle, targetLean, 1 - Math.exp(-dt * 10.5));
    this.motoLeanGroup.rotation.z = this.leanAngle;

    // Wheelie impulse on boost!
    if (boost && throttleIn > 0.35 && grounded && vForward > 1.5) {
      this.wheelieVel += 3.6 * dt;
    }
    const targetWheelie = boost && throttleIn > 0.35 && vForward > 2.0 ? 0.44 : 0;
    this.wheelieVel += ((targetWheelie - this.wheelieAngle) * 28.0 - this.wheelieVel * 7.2) * dt;
    this.wheelieAngle = THREE.MathUtils.clamp(this.wheelieAngle + this.wheelieVel * dt, -0.05, 0.52);
    this.motoPitchGroup.rotation.x = this.wheelieAngle;

    this.wheelSpin -= (newVForward / 0.33) * dt;
    if (this.wheels[0]) {
      this.wheels[0].knuckle.rotation.y = this.steeringAngle * 0.85;
      this.wheels[0].spinner.rotation.x = this.wheelSpin;
    }
    if (this.wheels[1]) {
      this.wheels[1].spinner.rotation.x = this.wheelSpin;
    }

    if (this.brakeLightMat) {
      this.brakeLightMat.emissiveIntensity = brakeIn > 0.1 || handbrake ? 5.8 : 2.2;
    }

    const slipAngle = Math.atan2(vLateral, Math.max(1.5, Math.abs(vForward)));
    this.tireSlip = grounded ? Math.max(handbrake && absSpeed > 4 ? 0.8 : 0, Math.min(1, Math.abs(slipAngle) * 1.7)) : 0;
    this.extraMetric = this.wheelieAngle;

    if ((this.tireSlip > 0.3 || (boost && throttleIn > 0.7 && this.speedKmh < 45)) && grounded) {
      this.smokeTimer += dt * 22;
      if (this.smokeTimer >= 1) {
        this.smokeTimer = 0;
        const rx = this.root.position.x - forward.x * 0.68;
        const rz = this.root.position.z - forward.z * 0.68;
        smokePool.spawn(rx, this.root.position.y, rz, -this.velocity.x * 0.2, 0.5, -this.velocity.z * 0.2, 0.52);
      }
    }

    this.updateGearboxAndRpm(dt, newVForward, throttleIn);
  }

  private updateHelicopterPhysics(
    dt: number,
    input: InputState | null,
    getGroundHeight: (x: number, z: number) => number,
    colliders: ReadonlyArray<BuildingColliderAABB>
  ): void {
    const targetRotor = this.isOccupied ? 1.0 : 0.0;
    this.rotorRpm = THREE.MathUtils.lerp(this.rotorRpm, targetRotor, 1 - Math.exp(-dt * (this.isOccupied ? 2.4 : 0.9)));

    this.mainRotorAngle += this.rotorRpm * 34.0 * dt;
    if (this.mainRotorGroup) {
      this.mainRotorGroup.rotation.y = this.mainRotorAngle;
    }
    if (this.tailRotorGroup) {
      this.tailRotorGroup.rotation.x = this.mainRotorAngle * 1.8;
    }
    if (this.rotorBlurMesh) {
      const mat = this.rotorBlurMesh.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.clamp((this.rotorRpm - 0.35) * 0.42, 0, 0.28);
    }

    const groundY = this.sampleSupportHeight(
      this.root.position.x,
      this.root.position.z,
      this.root.position.y,
      getGroundHeight,
      colliders
    );

    let collective = 0;
    let cyclicPitchIn = 0;
    let cyclicRollIn = 0;
    let yawPedalIn = 0;

    if (input && this.isOccupied) {
      if (input.jump || input.throttle > 0.15) {
        collective = Math.max(input.jump ? 1 : 0, input.throttle);
      }
      if (input.crouch || input.brake > 0.15) {
        collective -= Math.max(input.crouch ? 1 : 0, input.brake);
      }
      if (input.sprint && collective >= 0) {
        collective = Math.max(collective, 0.65);
      }

      cyclicPitchIn = input.moveZ; // W (+1) pitches nose down to fly forward (-Z)
      yawPedalIn = -input.moveX; // A/D yaw pedals
      cyclicRollIn = input.rollAxis !== 0 ? input.rollAxis : input.moveX * 0.55;
    }

    if (this.isOccupied && this.rotorRpm > 0.35) {
      // Collective lift with intuitive auto-hover damping
      const targetVy = collective * 18.5;
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, targetVy, 1 - Math.exp(-dt * 3.4));

      // Yaw pedals
      this.yawRate = THREE.MathUtils.lerp(this.yawRate, yawPedalIn * 1.65, 1 - Math.exp(-dt * 5.5));
      this.yaw += this.yawRate * dt;

      // Cyclic pitch & roll tilt
      const desiredPitch = -cyclicPitchIn * 0.34;
      const desiredRoll = -cyclicRollIn * 0.36;
      this.heliPitch = THREE.MathUtils.lerp(this.heliPitch, desiredPitch, 1 - Math.exp(-dt * 4.8));
      this.heliRoll = THREE.MathUtils.lerp(this.heliRoll, desiredRoll, 1 - Math.exp(-dt * 4.8));

      const forward = TEMP_VEC_A.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = TEMP_VEC_B.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

      const thrustBoost = input?.sprint ? 1.45 : 1.0;
      const accelFwd = cyclicPitchIn * 26.0 * thrustBoost * this.rotorRpm;
      const accelRight = (input ? input.rollAxis : 0) * 18.0 * this.rotorRpm;

      this.velocity.x += (forward.x * accelFwd + right.x * accelRight) * dt;
      this.velocity.z += (forward.z * accelFwd + right.z * accelRight) * dt;
      this.velocity.x *= Math.exp(-dt * 0.65);
      this.velocity.z *= Math.exp(-dt * 0.65);
    } else {
      // Unoccupied or spooling down: settle onto skids
      this.velocity.y -= 15.0 * dt;
      this.velocity.x *= Math.exp(-dt * 2.5);
      this.velocity.z *= Math.exp(-dt * 2.5);
      this.heliPitch = THREE.MathUtils.lerp(this.heliPitch, 0, 1 - Math.exp(-dt * 5));
      this.heliRoll = THREE.MathUtils.lerp(this.heliRoll, 0, 1 - Math.exp(-dt * 5));
    }

    this.root.position.addScaledVector(this.velocity, dt);
    if (this.root.position.y <= groundY) {
      this.root.position.y = groundY;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.velocity.x *= Math.exp(-dt * 6.0);
      this.velocity.z *= Math.exp(-dt * 6.0);
      this.heliPitch *= Math.exp(-dt * 8.0);
      this.heliRoll *= Math.exp(-dt * 8.0);
    }
    this.root.position.y = Math.min(360, this.root.position.y);

    this.resolveHorizontalCollisions(colliders, 2.2);
    this.root.rotation.set(0, this.yaw, 0, 'YXZ');
    this.chassisGroup.rotation.set(this.heliPitch, 0, this.heliRoll, 'YXZ');

    this.speedKmh = this.velocity.length() * 3.6;
    this.rpm = Math.round(900 + this.rotorRpm * 5400 + Math.abs(collective) * 900);
    this.gear = this.root.position.y > groundY + 0.4 ? 'FLY' : 'IDL';
    this.tireSlip = 0;
    this.extraMetric = this.rotorRpm;
  }

  private updateGearboxAndRpm(dt: number, vForward: number, throttleIn: number): void {
    if (vForward < -0.65) {
      this.gear = 'R';
      const revRpm = 1100 + Math.min(1, Math.abs(vForward) / 15) * 5200;
      this.rpm = Math.round(THREE.MathUtils.lerp(this.rpm, revRpm, 1 - Math.exp(-dt * 12)));
      return;
    }

    if (Math.abs(vForward) < 0.5 && throttleIn < 0.05) {
      this.gear = 'N';
      this.currentGearIndex = 0;
      this.rpm = Math.round(THREE.MathUtils.lerp(this.rpm, 920, 1 - Math.exp(-dt * 8)));
      return;
    }

    const wheelRps = Math.abs(vForward) / (2 * Math.PI * 0.36);
    const ratio = GEAR_RATIOS[this.currentGearIndex];
    const computedRpm = THREE.MathUtils.clamp(950 + wheelRps * ratio * 155 + throttleIn * 750, 950, 8250);

    if (computedRpm > 7350 && this.currentGearIndex < GEAR_RATIOS.length - 1) {
      this.currentGearIndex++;
    } else if (computedRpm < 2850 && this.currentGearIndex > 0) {
      this.currentGearIndex--;
    }

    this.gear = String(this.currentGearIndex + 1);
    const finalRatio = GEAR_RATIOS[this.currentGearIndex];
    const targetRpm = THREE.MathUtils.clamp(950 + wheelRps * finalRatio * 155 + throttleIn * 650, 950, 8200);
    this.rpm = Math.round(THREE.MathUtils.lerp(this.rpm, targetRpm, 1 - Math.exp(-dt * 14)));
  }

  toNetPacket(): Omit<NetVehiclePacket, 'ownerId' | 'ts'> {
    TEMP_QUAT.copy(this.root.quaternion).multiply(this.chassisGroup.quaternion);
    return {
      vehicleId: this.id,
      kind: this.kind,
      x: this.root.position.x,
      y: this.root.position.y,
      z: this.root.position.z,
      vx: this.velocity.x,
      vy: this.velocity.y,
      vz: this.velocity.z,
      qx: TEMP_QUAT.x,
      qy: TEMP_QUAT.y,
      qz: TEMP_QUAT.z,
      qw: TEMP_QUAT.w,
      steering: this.steeringAngle,
      wheelSpin: this.wheelSpin,
      extra: this.extraMetric
    };
  }

  applyNetPacket(pkt: NetVehiclePacket, dt: number): void {
    TEMP_VEC_A.set(pkt.x, pkt.y, pkt.z);
    this.root.position.lerp(TEMP_VEC_A, 1 - Math.exp(-dt * 12));
    this.velocity.set(pkt.vx, pkt.vy, pkt.vz);
    TEMP_QUAT.set(pkt.qx, pkt.qy, pkt.qz, pkt.qw);
    this.root.quaternion.slerp(TEMP_QUAT, 1 - Math.exp(-dt * 12));
    this.steeringAngle = pkt.steering;
    this.wheelSpin = pkt.wheelSpin;
    this.extraMetric = pkt.extra;
  }

  dispose(): void {
    for (const geo of this.ownedGeometries) {
      geo.dispose();
    }
    for (const mat of this.ownedMaterials) {
      mat.dispose();
    }
    this.ownedGeometries.length = 0;
    this.ownedMaterials.length = 0;
  }
}
