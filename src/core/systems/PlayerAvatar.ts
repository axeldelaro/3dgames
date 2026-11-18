import * as THREE from 'three';
import type { AvatarAnimState, EquippedToolType, IPlayerAvatar } from '../types';

export class PlayerAvatar implements IPlayerAvatar {
  public readonly root = new THREE.Group();

  private readonly bodyPivot = new THREE.Group();
  private readonly pelvisGroup = new THREE.Group();
  private readonly spineGroup = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly backpackGroup = new THREE.Group();
  private readonly capeRoot = new THREE.Group();
  private readonly capeSegments: THREE.Group[] = [];
  private readonly paragliderGroup = new THREE.Group();

  private readonly leftShoulder = new THREE.Group();
  private readonly leftElbow = new THREE.Group();
  private readonly leftHand = new THREE.Group();

  private readonly rightShoulder = new THREE.Group();
  private readonly rightElbow = new THREE.Group();
  private readonly rightHand = new THREE.Group();
  private readonly rightToolMount = new THREE.Group();
  private readonly leftToolMount = new THREE.Group();

  private readonly leftHip = new THREE.Group();
  private readonly leftKnee = new THREE.Group();
  private readonly leftAnkle = new THREE.Group();

  private readonly rightHip = new THREE.Group();
  private readonly rightKnee = new THREE.Group();
  private readonly rightAnkle = new THREE.Group();

  private readonly thrusterConeL: THREE.Mesh;
  private readonly thrusterConeR: THREE.Mesh;
  private readonly thrusterInnerL: THREE.Mesh;
  private readonly thrusterInnerR: THREE.Mesh;

  private readonly armorPrimaryMat: THREE.MeshPhysicalMaterial;
  private readonly armorDarkMat: THREE.MeshStandardMaterial;
  private readonly jointMetalMat: THREE.MeshStandardMaterial;
  private readonly accentEmissiveMat: THREE.MeshPhysicalMaterial;
  private readonly capeClothMat: THREE.MeshStandardMaterial;
  private readonly flameOuterMat: THREE.MeshStandardMaterial;
  private readonly flameCoreMat: THREE.MeshStandardMaterial;

  private readonly toolMeshes = new Map<EquippedToolType, THREE.Group>();
  private equippedTool: EquippedToolType = 'none';
  private paragliderExplicitVisible = false;
  private paragliderScale = 0;
  private jetpackIntensity = 0;

  private gaitPhase = 0;
  private idleTime = 0;
  private rollAngle = 0;
  private attackPhase = 0;

  private nameplateSprite: THREE.Sprite | null = null;
  private nameplateTexture: THREE.CanvasTexture | null = null;
  private lastNameplateKey = '';

  constructor(accentHex = '#28e0ff') {
    this.root.name = 'PlayerAvatar';

    const accentColor = new THREE.Color(accentHex);

    this.armorPrimaryMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbe4f0,
      roughness: 0.28,
      metalness: 0.45,
      clearcoat: 0.75,
      clearcoatRoughness: 0.2
    });

    this.armorDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e2636,
      roughness: 0.46,
      metalness: 0.62
    });

    this.jointMetalMat = new THREE.MeshStandardMaterial({
      color: 0x394559,
      roughness: 0.35,
      metalness: 0.82
    });

    this.accentEmissiveMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 1.85,
      roughness: 0.14,
      metalness: 0.25,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    this.capeClothMat = new THREE.MeshStandardMaterial({
      color: 0x162033,
      roughness: 0.78,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    this.flameOuterMat = new THREE.MeshStandardMaterial({
      color: 0xff7b29,
      emissive: 0xff5500,
      emissiveIntensity: 3.2,
      roughness: 0.2,
      metalness: 0.0,
      transparent: true,
      opacity: 0.86,
      depthWrite: false
    });

    this.flameCoreMat = new THREE.MeshStandardMaterial({
      color: 0xe6ffff,
      emissive: 0x6cf0ff,
      emissiveIntensity: 4.5,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    // Center of mass pivot at y = 0.90m (boots touch y = 0.00m)
    this.bodyPivot.position.set(0, 0.9, 0);
    this.root.add(this.bodyPivot);

    this.buildTorsoAndHead();
    const { coneL, coneR, innerL, innerR } = this.buildBackpackAndCape();
    this.thrusterConeL = coneL;
    this.thrusterConeR = coneR;
    this.thrusterInnerL = innerL;
    this.thrusterInnerR = innerR;

    this.buildArms();
    this.buildLegs();
    this.buildParaglider();
    this.buildAttachableTools();

    this.enableShadowsRecursive(this.bodyPivot);
    this.thrusterConeL.castShadow = false;
    this.thrusterConeR.castShadow = false;
    this.thrusterInnerL.castShadow = false;
    this.thrusterInnerR.castShadow = false;

    this.setJetpackFlame(0);
    this.setEquippedTool('none');
  }

  private buildTorsoAndHead(): void {
    // Pelvis & utility belt
    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.135, 0.14, 12),
      this.armorDarkMat
    );
    pelvisMesh.scale.set(1.12, 1, 0.82);
    this.pelvisGroup.add(pelvisMesh);

    const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.04), this.accentEmissiveMat);
    beltBuckle.position.set(0, 0.02, 0.13);
    this.pelvisGroup.add(beltBuckle);
    this.bodyPivot.add(this.pelvisGroup);

    // Articulated spine + chestplate
    this.spineGroup.position.set(0, 0.07, 0);
    this.bodyPivot.add(this.spineGroup);

    const abdomen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.135, 0.18, 12),
      this.armorDarkMat
    );
    abdomen.position.set(0, 0.09, 0);
    abdomen.scale.set(1.06, 1, 0.78);
    this.spineGroup.add(abdomen);

    const chestArmor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.16, 0.3, 12),
      this.armorPrimaryMat
    );
    chestArmor.position.set(0, 0.29, 0.01);
    chestArmor.scale.set(1.16, 1, 0.78);
    this.spineGroup.add(chestArmor);

    // Sculpted sternum plate & luminescent V-core reactor
    const sternumPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.22, 0.08),
      this.armorPrimaryMat
    );
    sternumPlate.position.set(0, 0.3, 0.125);
    this.spineGroup.add(sternumPlate);

    const chestReactor = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.048, 1),
      this.accentEmissiveMat
    );
    chestReactor.position.set(0, 0.31, 0.168);
    chestReactor.scale.set(1.1, 1.3, 0.45);
    this.spineGroup.add(chestReactor);

    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.024, 10, 20),
      this.jointMetalMat
    );
    collarRing.rotation.x = Math.PI * 0.5;
    collarRing.position.set(0, 0.45, 0.01);
    this.spineGroup.add(collarRing);

    // Helmet & head assembly
    this.headGroup.position.set(0, 0.48, 0.01);
    this.spineGroup.add(this.headGroup);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.078, 0.09, 10),
      this.armorDarkMat
    );
    neck.position.set(0, 0.04, 0);
    this.headGroup.add(neck);

    const helmetDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 20, 16),
      this.armorPrimaryMat
    );
    helmetDome.position.set(0, 0.165, 0);
    helmetDome.scale.set(0.95, 1.06, 1.08);
    this.headGroup.add(helmetDome);

    const chinGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.085, 0.16),
      this.armorDarkMat
    );
    chinGuard.position.set(0, 0.1, 0.045);
    this.headGroup.add(chinGuard);

    // Panoramic curved glowing exo-visor (+Z facing)
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 18, 12, -Math.PI * 0.34, Math.PI * 0.68, Math.PI * 0.3, Math.PI * 0.34),
      this.accentEmissiveMat
    );
    visor.rotation.y = Math.PI * 0.5;
    // Rotate sphere patch to face +Z
    const visorHolder = new THREE.Group();
    visorHolder.position.set(0, 0.17, 0.022);
    visor.rotation.set(0, 0, 0);
    // Standard sphere phi=0 starts at +X, so rotate -PI/2 around Y so center of patch points +Z
    visor.rotation.y = -Math.PI * 0.5;
    visorHolder.add(visor);
    this.headGroup.add(visorHolder);

    const crestFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.065, 0.21),
      this.accentEmissiveMat
    );
    crestFin.position.set(0, 0.295, -0.02);
    crestFin.rotation.x = -0.18;
    this.headGroup.add(crestFin);

    for (const side of [-1, 1]) {
      const earPod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 0.035, 12),
        this.jointMetalMat
      );
      earPod.rotation.z = Math.PI * 0.5;
      earPod.position.set(side * 0.142, 0.165, -0.005);
      this.headGroup.add(earPod);
    }
  }

  private buildBackpackAndCape(): {
    coneL: THREE.Mesh;
    coneR: THREE.Mesh;
    innerL: THREE.Mesh;
    innerR: THREE.Mesh;
  } {
    this.backpackGroup.position.set(0, 0.28, -0.155);
    this.spineGroup.add(this.backpackGroup);

    const packCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.3, 0.11),
      this.armorDarkMat
    );
    this.backpackGroup.add(packCore);

    const packSpine = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.24, 0.03),
      this.accentEmissiveMat
    );
    packSpine.position.set(0, 0.01, -0.062);
    this.backpackGroup.add(packSpine);

    const makeThruster = (side: number): { outer: THREE.Mesh; inner: THREE.Mesh } => {
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.064, 0.22, 12),
        this.armorPrimaryMat
      );
      pod.position.set(side * 0.11, -0.02, -0.03);
      pod.rotation.z = side * -0.12;
      this.backpackGroup.add(pod);

      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.056, 0.06, 12),
        this.jointMetalMat
      );
      nozzle.position.set(side * 0.122, -0.145, -0.035);
      this.backpackGroup.add(nozzle);

      const cleanOuterGeom = new THREE.ConeGeometry(0.048, 0.36, 12);
      cleanOuterGeom.rotateX(Math.PI);
      cleanOuterGeom.translate(0, -0.18, 0);

      const outer = new THREE.Mesh(cleanOuterGeom, this.flameOuterMat);
      outer.position.set(side * 0.122, -0.17, -0.035);
      this.backpackGroup.add(outer);

      const cleanInnerGeom = new THREE.ConeGeometry(0.026, 0.22, 10);
      cleanInnerGeom.rotateX(Math.PI);
      cleanInnerGeom.translate(0, -0.11, 0);

      const inner = new THREE.Mesh(cleanInnerGeom, this.flameCoreMat);
      inner.position.set(side * 0.122, -0.17, -0.035);
      this.backpackGroup.add(inner);

      return { outer, inner };
    };

    const leftT = makeThruster(1);
    const rightT = makeThruster(-1);

    // Flowing 4-segment articulated cape mounted below shoulders behind jetpack
    this.capeRoot.position.set(0, 0.41, -0.165);
    this.spineGroup.add(this.capeRoot);

    let parentSeg = this.capeRoot;
    const segCount = 4;
    const segLen = 0.2;
    for (let i = 0; i < segCount; i++) {
      const segPivot = new THREE.Group();
      segPivot.position.set(0, i === 0 ? 0 : -segLen, 0);
      const widthTop = 0.3 + i * 0.035;
      const capePlane = new THREE.Mesh(
        new THREE.BoxGeometry(widthTop, segLen + 0.015, 0.012),
        this.capeClothMat
      );
      capePlane.position.set(0, -segLen * 0.5, -0.008);
      segPivot.add(capePlane);

      if (i === segCount - 1) {
        const hemTrim = new THREE.Mesh(
          new THREE.BoxGeometry(widthTop, 0.022, 0.016),
          this.accentEmissiveMat
        );
        hemTrim.position.set(0, -segLen + 0.01, -0.008);
        segPivot.add(hemTrim);
      }

      parentSeg.add(segPivot);
      this.capeSegments.push(segPivot);
      parentSeg = segPivot;
    }

    return {
      coneL: leftT.outer,
      coneR: rightT.outer,
      innerL: leftT.inner,
      innerR: rightT.inner
    };
  }

  private buildArms(): void {
    // Facing +Z: +X is Anatomical Left, -X is Anatomical Right
    const setupArm = (
      sideSign: number,
      shoulder: THREE.Group,
      elbow: THREE.Group,
      hand: THREE.Group,
      toolMount: THREE.Group
    ): void => {
      shoulder.position.set(sideSign * 0.265, 0.39, 0);
      this.spineGroup.add(shoulder);

      // Sculpted shoulder pauldron
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
        this.armorPrimaryMat
      );
      pauldron.position.set(sideSign * 0.02, 0.03, 0);
      pauldron.rotation.z = sideSign * -0.35;
      shoulder.add(pauldron);

      const pauldronRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.078, 0.011, 8, 16),
        this.accentEmissiveMat
      );
      pauldronRim.rotation.x = Math.PI * 0.5;
      pauldronRim.rotation.y = sideSign * 0.35;
      pauldronRim.position.set(sideSign * 0.02, 0.005, 0);
      shoulder.add(pauldronRim);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.048, 0.27, 10),
        this.armorDarkMat
      );
      upperArm.position.set(0, -0.145, 0);
      shoulder.add(upperArm);

      elbow.position.set(0, -0.28, 0);
      shoulder.add(elbow);

      const elbowJoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 10),
        this.jointMetalMat
      );
      elbow.add(elbowJoint);

      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.042, 0.25, 10),
        this.armorPrimaryMat
      );
      forearm.position.set(0, -0.13, 0);
      elbow.add(forearm);

      const gauntletCuff = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.12, 0.075),
        this.armorDarkMat
      );
      gauntletCuff.position.set(0, -0.16, 0.008);
      elbow.add(gauntletCuff);

      hand.position.set(0, -0.265, 0);
      elbow.add(hand);

      const glove = new THREE.Mesh(
        new THREE.BoxGeometry(0.062, 0.075, 0.075),
        this.jointMetalMat
      );
      glove.position.set(0, -0.025, 0.01);
      hand.add(glove);

      toolMount.position.set(0, -0.035, 0.035);
      hand.add(toolMount);
    };

    setupArm(1, this.leftShoulder, this.leftElbow, this.leftHand, this.leftToolMount);
    setupArm(-1, this.rightShoulder, this.rightElbow, this.rightHand, this.rightToolMount);
  }

  private buildLegs(): void {
    const setupLeg = (
      sideSign: number,
      hip: THREE.Group,
      knee: THREE.Group,
      ankle: THREE.Group
    ): void => {
      hip.position.set(sideSign * 0.13, 0, 0);
      this.bodyPivot.add(hip);

      const hipBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 10, 10),
        this.jointMetalMat
      );
      hip.add(hipBall);

      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.084, 0.066, 0.4, 12),
        this.armorPrimaryMat
      );
      thigh.position.set(0, -0.21, 0);
      hip.add(thigh);

      const thighPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.24, 0.045),
        this.armorDarkMat
      );
      thighPlate.position.set(sideSign * 0.03, -0.19, 0.055);
      hip.add(thighPlate);

      knee.position.set(0, -0.42, 0);
      hip.add(knee);

      const kneeCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.095, 0.095, 0.095),
        this.jointMetalMat
      );
      kneeCap.position.set(0, 0, 0.028);
      knee.add(kneeCap);

      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.054, 0.38, 12),
        this.armorPrimaryMat
      );
      shin.position.set(0, -0.2, 0);
      knee.add(shin);

      const shinAccent = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.22, 0.025),
        this.accentEmissiveMat
      );
      shinAccent.position.set(0, -0.19, 0.062);
      knee.add(shinAccent);

      ankle.position.set(0, -0.4, 0);
      knee.add(ankle);

      // Boot sole bottom sits cleanly at ankle y = -0.08 -> root y = 0.00
      const bootBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.115, 0.09, 0.22),
        this.armorDarkMat
      );
      bootBody.position.set(0, -0.035, 0.045);
      ankle.add(bootBody);

      const bootToe = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.055, 0.08),
        this.armorPrimaryMat
      );
      bootToe.position.set(0, -0.052, 0.135);
      ankle.add(bootToe);
    };

    setupLeg(1, this.leftHip, this.leftKnee, this.leftAnkle);
    setupLeg(-1, this.rightHip, this.rightKnee, this.rightAnkle);
  }

  private buildParaglider(): void {
    this.paragliderGroup.position.set(0, 1.12, 0.05);
    this.paragliderGroup.visible = false;
    this.spineGroup.add(this.paragliderGroup);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x1a2740,
      roughness: 0.42,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    // Swept aerodynamic V-wing canopy
    for (const side of [-1, 1]) {
      const wingHalf = new THREE.Group();
      wingHalf.rotation.z = side * -0.12;
      wingHalf.rotation.y = side * -0.18;

      const wingPanel = new THREE.Mesh(
        new THREE.BoxGeometry(1.38, 0.032, 0.66),
        canopyMat
      );
      wingPanel.position.set(side * 0.68, 0.36, -0.08);
      wingHalf.add(wingPanel);

      const leadingEdge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.018, 1.4, 10),
        this.armorPrimaryMat
      );
      leadingEdge.rotation.z = Math.PI * 0.5;
      leadingEdge.position.set(side * 0.68, 0.37, 0.25);
      wingHalf.add(leadingEdge);

      const wingTipGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.042, 0.56),
        this.accentEmissiveMat
      );
      wingTipGlow.position.set(side * 1.35, 0.365, -0.08);
      wingHalf.add(wingTipGlow);

      this.paragliderGroup.add(wingHalf);
    }

    // Control trapeze bar & suspension struts
    const controlBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.64, 10),
      this.jointMetalMat
    );
    controlBar.rotation.z = Math.PI * 0.5;
    controlBar.position.set(0, -0.1, 0.14);
    this.paragliderGroup.add(controlBar);

    for (const side of [-1, 1]) {
      const riser = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.52, 8),
        this.jointMetalMat
      );
      riser.position.set(side * 0.28, 0.14, 0.06);
      riser.rotation.z = side * -0.16;
      riser.rotation.x = 0.28;
      this.paragliderGroup.add(riser);
    }
  }

  private buildAttachableTools(): void {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6e4726,
      roughness: 0.78,
      metalness: 0.06
    });
    const forgedSteelMat = new THREE.MeshStandardMaterial({
      color: 0xc2ccd8,
      roughness: 0.26,
      metalness: 0.88
    });
    const fireEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xff6a1a,
      emissive: 0xff4500,
      emissiveIntensity: 3.4,
      roughness: 0.2,
      metalness: 0.1
    });
    const iceCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x9beeff,
      emissive: 0x2cd4ff,
      emissiveIntensity: 2.2,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0
    });

    // 1. Sword (right hand extending forward +Z)
    const sword = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.18, 10), this.armorDarkMat);
    grip.rotation.x = Math.PI * 0.5;
    sword.add(grip);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.045), this.jointMetalMat);
    guard.position.set(0, 0, 0.095);
    sword.add(guard);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.016, 0.86), forgedSteelMat);
    blade.position.set(0, 0, 0.53);
    sword.add(blade);

    const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.008, 0.84), this.accentEmissiveMat);
    bladeEdge.position.set(0, 0, 0.53);
    sword.add(bladeEdge);
    this.rightToolMount.add(sword);
    this.toolMeshes.set('sword', sword);

    // 2. Bow (mounted on left hand)
    const bow = new THREE.Group();
    const bowArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.018, 8, 24, Math.PI * 0.86),
      woodMat
    );
    bowArc.rotation.y = Math.PI * 0.5;
    bowArc.rotation.z = -Math.PI * 0.43;
    bowArc.position.set(0, 0, -0.06);
    bow.add(bowArc);

    const bowString = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.8, 6),
      this.accentEmissiveMat
    );
    bowString.position.set(0, 0, -0.05);
    bow.add(bowString);
    this.leftToolMount.add(bow);
    this.toolMeshes.set('bow', bow);

    // 3. Sci-Fi Laser Rifle / Mining Blaster
    const laser = new THREE.Group();
    const rifleBody = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.46), this.armorDarkMat);
    rifleBody.position.set(0, 0.02, 0.16);
    laser.add(rifleBody);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.34, 12), this.jointMetalMat);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.045, 0.46);
    laser.add(barrel);

    const plasmaCoil = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.036, 0.24), this.accentEmissiveMat);
    plasmaCoil.position.set(0, 0.05, 0.24);
    laser.add(plasmaCoil);
    this.rightToolMount.add(laser);
    this.toolMeshes.set('laser', laser);

    // 4. Nordic Axe
    const axe = new THREE.Group();
    const axeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.68, 10), woodMat);
    axeShaft.rotation.x = Math.PI * 0.5;
    axeShaft.position.set(0, 0, 0.26);
    axe.add(axeShaft);

    const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.16), forgedSteelMat);
    axeHead.position.set(0, -0.04, 0.52);
    axe.add(axeHead);
    this.rightToolMount.add(axe);
    this.toolMeshes.set('axe', axe);

    // 5. Artisan / War Hammer
    const hammer = new THREE.Group();
    const hammerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.62, 10), woodMat);
    hammerShaft.rotation.x = Math.PI * 0.5;
    hammerShaft.position.set(0, 0, 0.24);
    hammer.add(hammerShaft);

    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.15), forgedSteelMat);
    hammerHead.position.set(0, 0, 0.5);
    hammer.add(hammerHead);
    this.rightToolMount.add(hammer);
    this.toolMeshes.set('hammer', hammer);

    // 6. Fire Magic Catalyst Staff
    const fireStaff = new THREE.Group();
    const fireRod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.92, 10), this.armorDarkMat);
    fireRod.rotation.x = Math.PI * 0.5;
    fireRod.position.set(0, 0, 0.34);
    fireStaff.add(fireRod);

    const fireOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 1), fireEmissiveMat);
    fireOrb.position.set(0, 0, 0.86);
    fireStaff.add(fireOrb);
    this.rightToolMount.add(fireStaff);
    this.toolMeshes.set('magic_fire', fireStaff);

    // 7. Ice Magic Crystal Scepter
    const iceStaff = new THREE.Group();
    const iceRod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.92, 10), this.armorPrimaryMat);
    iceRod.rotation.x = Math.PI * 0.5;
    iceRod.position.set(0, 0, 0.34);
    iceStaff.add(iceRod);

    const iceShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), iceCrystalMat);
    iceShard.scale.set(0.75, 0.75, 1.5);
    iceShard.position.set(0, 0, 0.88);
    iceStaff.add(iceShard);
    this.rightToolMount.add(iceStaff);
    this.toolMeshes.set('magic_ice', iceStaff);
  }

  private enableShadowsRecursive(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  public setAccentColor(hex: string): void {
    const color = new THREE.Color(hex);
    this.accentEmissiveMat.color.copy(color);
    this.accentEmissiveMat.emissive.copy(color);
  }

  public setEquippedTool(tool: EquippedToolType): void {
    this.equippedTool = tool;
    for (const [key, group] of this.toolMeshes.entries()) {
      group.visible = key === tool;
    }
  }

  public getEquippedTool(): EquippedToolType {
    return this.equippedTool;
  }

  public setParagliderVisible(visible: boolean): void {
    this.paragliderExplicitVisible = visible;
    if (visible) {
      this.paragliderGroup.visible = true;
    }
  }

  public setJetpackFlame(intensity: number): void {
    this.jetpackIntensity = Math.max(0, Math.min(2, intensity));
    const active = this.jetpackIntensity > 0.02;
    this.thrusterConeL.visible = active;
    this.thrusterConeR.visible = active;
    this.thrusterInnerL.visible = active;
    this.thrusterInnerR.visible = active;

    if (active) {
      const flicker = 0.88 + Math.sin(performance.now() * 0.055) * 0.14;
      const scaleY = Math.max(0.15, this.jetpackIntensity * flicker);
      const scaleXZ = 0.75 + this.jetpackIntensity * 0.35;
      this.thrusterConeL.scale.set(scaleXZ, scaleY, scaleXZ);
      this.thrusterConeR.scale.set(scaleXZ, scaleY, scaleXZ);
      this.thrusterInnerL.scale.set(scaleXZ * 0.85, scaleY * 0.8, scaleXZ * 0.85);
      this.thrusterInnerR.scale.set(scaleXZ * 0.85, scaleY * 0.8, scaleXZ * 0.85);
    }
  }

  public setNameplate(name: string, color = '#28e0ff'): void {
    const cleanName = name.trim().slice(0, 22);
    if (!cleanName) {
      if (this.nameplateSprite) {
        this.nameplateSprite.visible = false;
      }
      return;
    }

    const key = `${cleanName}|${color}`;
    if (key === this.lastNameplateKey && this.nameplateSprite) {
      this.nameplateSprite.visible = true;
      return;
    }
    this.lastNameplateKey = key;

    if (typeof document === 'undefined') {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) {
      return;
    }

    ctx2d.clearRect(0, 0, canvas.width, canvas.height);

    // Rounded glassmorphic nameplate pill
    const padX = 28;
    const padY = 24;
    const pillW = canvas.width - padX * 2;
    const pillH = canvas.height - padY * 2;
    const radius = 38;

    ctx2d.beginPath();
    ctx2d.roundRect(padX, padY, pillW, pillH, radius);
    ctx2d.fillStyle = 'rgba(7, 12, 24, 0.82)';
    ctx2d.fill();
    ctx2d.lineWidth = 4;
    ctx2d.strokeStyle = color;
    ctx2d.stroke();

    // Player status dot
    ctx2d.beginPath();
    ctx2d.arc(padX + 40, canvas.height * 0.5, 11, 0, Math.PI * 2);
    ctx2d.fillStyle = color;
    ctx2d.fill();

    ctx2d.font = '700 38px "Rajdhani", "Inter", sans-serif';
    ctx2d.fillStyle = '#f4f8ff';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText(cleanName, canvas.width * 0.5 + 14, canvas.height * 0.5 + 2);

    if (this.nameplateTexture) {
      this.nameplateTexture.dispose();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.nameplateTexture = texture;

    if (!this.nameplateSprite) {
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      });
      this.nameplateSprite = new THREE.Sprite(spriteMat);
      this.nameplateSprite.position.set(0, 2.12, 0);
      this.nameplateSprite.scale.set(1.45, 0.36, 1);
      this.root.add(this.nameplateSprite);
    } else {
      this.nameplateSprite.material.map = texture;
      this.nameplateSprite.material.needsUpdate = true;
      this.nameplateSprite.visible = true;
    }
  }

  public updateAnimation(
    dt: number,
    state: AvatarAnimState,
    speed: number,
    turnRate = 0,
    groundSlope = 0
  ): void {
    const safeDt = Math.max(0.0001, Math.min(0.1, dt));
    const blend = 1 - Math.exp(-safeDt * 14);
    this.idleTime += safeDt;

    // Update paraglider deploy / stow scale smoothly
    const showGlider = this.paragliderExplicitVisible || state === 'glide';
    const targetGliderScale = showGlider ? 1 : 0;
    this.paragliderScale += (targetGliderScale - this.paragliderScale) * (1 - Math.exp(-safeDt * 12));
    if (this.paragliderScale > 0.01) {
      this.paragliderGroup.visible = true;
      this.paragliderGroup.scale.setScalar(this.paragliderScale);
    } else {
      this.paragliderGroup.visible = false;
    }

    // Refresh jetpack flame flicker when active
    if (this.jetpackIntensity > 0.02) {
      this.setJetpackFlame(this.jetpackIntensity);
    }

    // Target joint angles (facing +Z: negative X rotation swings limbs forward +Z; knees bend +X; elbows bend -X)
    let pivotPosY = 0.9;
    let pivotRotX = 0;
    let pivotRotZ = Math.max(-0.38, Math.min(0.38, -turnRate * 0.25));

    let spineRotX = 0;
    let spineRotY = 0;
    let spineRotZ = 0;
    let headRotX = 0;
    let headRotY = Math.max(-0.4, Math.min(0.4, turnRate * 0.16));

    let lHipX = 0;
    let rHipX = 0;
    let lHipZ = 0.03;
    let rHipZ = -0.03;
    let lKneeX = 0.05;
    let rKneeX = 0.05;
    let lAnkleX = 0;
    let rAnkleX = 0;

    let lShoulderX = 0;
    let rShoulderX = 0;
    let lShoulderZ = 0.1;
    let rShoulderZ = -0.1;
    let lElbowX = -0.18;
    let rElbowX = -0.18;

    const clampedSlope = Math.max(-0.7, Math.min(0.7, groundSlope));

    switch (state) {
      case 'idle': {
        const breath = Math.sin(this.idleTime * 2.1);
        pivotPosY = 0.9 + breath * 0.008;
        spineRotX = breath * 0.02;
        lShoulderZ = 0.11 + breath * 0.015;
        rShoulderZ = -0.11 - breath * 0.015;
        if (this.equippedTool !== 'none') {
          rShoulderX = -0.35;
          rElbowX = -0.55;
        }
        this.rollAngle = 0;
        this.attackPhase = 0;
        break;
      }

      case 'walk':
      case 'run': {
        const normSpeed = Math.max(0.25, Math.min(1.6, speed / (state === 'run' ? 8.5 : 4.2)));
        const freq = (state === 'run' ? 10.5 : 6.8) * (0.75 + normSpeed * 0.35);
        this.gaitPhase += safeDt * freq;

        const strideAmp = (state === 'run' ? 0.82 : 0.48) * Math.min(1.25, normSpeed);
        const sL = Math.sin(this.gaitPhase);
        const sR = Math.sin(this.gaitPhase + Math.PI);

        // Double-frequency hip vertical bounce + slope crouch compensation
        const bounceAmp = state === 'run' ? 0.048 : 0.024;
        const slopeSink = Math.abs(clampedSlope) * 0.08;
        pivotPosY = 0.9 + Math.abs(Math.cos(this.gaitPhase)) * bounceAmp - slopeSink;

        // Forward athletic lean + slope compensation
        spineRotX = (state === 'run' ? 0.18 : 0.07) + clampedSlope * 0.25;
        spineRotY = -sL * 0.09;
        headRotX = -spineRotX * 0.55;

        // Adaptive slope foot height via extra swing knee flexion on uphill strides
        const uphillExtraLift = Math.max(0, clampedSlope) * 0.45;
        lHipX = -sL * strideAmp - (sL > 0 ? uphillExtraLift * 0.5 : 0);
        rHipX = -sR * strideAmp - (sR > 0 ? uphillExtraLift * 0.5 : 0);

        const swingL = Math.max(0, Math.cos(this.gaitPhase - 0.35));
        const swingR = Math.max(0, Math.cos(this.gaitPhase + Math.PI - 0.35));
        lKneeX = 0.08 + swingL * (state === 'run' ? 1.18 : 0.68) + (sL > 0 ? uphillExtraLift : 0);
        rKneeX = 0.08 + swingR * (state === 'run' ? 1.18 : 0.68) + (sR > 0 ? uphillExtraLift : 0);

        lAnkleX = -(lHipX + lKneeX) * 0.35 - clampedSlope * 0.4;
        rAnkleX = -(rHipX + rKneeX) * 0.35 - clampedSlope * 0.4;

        // Counter-swinging arms
        const armAmp = state === 'run' ? 0.76 : 0.42;
        lShoulderX = sL * armAmp;
        rShoulderX = sR * armAmp;
        lElbowX = state === 'run' ? -0.82 - Math.max(0, -sL) * 0.3 : -0.32;
        rElbowX = state === 'run' ? -0.82 - Math.max(0, -sR) * 0.3 : -0.32;

        if (this.equippedTool === 'laser') {
          rShoulderX = -0.65;
          rElbowX = -0.65;
        }
        this.rollAngle = 0;
        this.attackPhase = 0;
        break;
      }

      case 'jump': {
        pivotPosY = 0.94;
        spineRotX = 0.12;
        lHipX = -0.52;
        rHipX = -0.28;
        lKneeX = 0.88;
        rKneeX = 0.55;
        lShoulderX = 0.35;
        rShoulderX = 0.35;
        lShoulderZ = 0.38;
        rShoulderZ = -0.38;
        lElbowX = -0.45;
        rElbowX = -0.45;
        this.rollAngle = 0;
        break;
      }

      case 'roll': {
        // Full 360-degree forward combat tuck
        this.rollAngle = (this.rollAngle + safeDt * Math.PI * 3.4) % (Math.PI * 2);
        pivotPosY = 0.56;
        pivotRotX = this.rollAngle;
        spineRotX = 0.55;
        headRotX = 0.42;
        lHipX = -1.45;
        rHipX = -1.45;
        lKneeX = 1.95;
        rKneeX = 1.95;
        lShoulderX = -1.1;
        rShoulderX = -1.1;
        lElbowX = -1.6;
        rElbowX = -1.6;
        break;
      }

      case 'swim': {
        this.gaitPhase += safeDt * 4.8;
        const stroke = Math.sin(this.gaitPhase);
        const kick = Math.sin(this.gaitPhase * 2.0);
        pivotPosY = 0.65 + Math.sin(this.idleTime * 2.4) * 0.04;
        pivotRotX = Math.PI * 0.43; // Horizontal streamlined posture
        headRotX = -0.58; // Look forward above water

        // Breaststroke / freestyle reach sweep
        lShoulderX = -1.35 + stroke * 0.85;
        rShoulderX = -1.35 - stroke * 0.85;
        lShoulderZ = 0.45 + Math.max(0, stroke) * 0.45;
        rShoulderZ = -0.45 - Math.max(0, -stroke) * 0.45;
        lElbowX = -0.45 - Math.max(0, -stroke) * 0.5;
        rElbowX = -0.45 - Math.max(0, stroke) * 0.5;

        // Flutter kick
        lHipX = kick * 0.34;
        rHipX = -kick * 0.34;
        lKneeX = 0.22 + Math.max(0, -kick) * 0.32;
        rKneeX = 0.22 + Math.max(0, kick) * 0.32;
        lAnkleX = 0.5;
        rAnkleX = 0.5;
        this.rollAngle = 0;
        break;
      }

      case 'climb': {
        const climbSpeed = Math.max(0.2, speed);
        this.gaitPhase += safeDt * (3.2 + climbSpeed * 1.4);
        const reach = Math.sin(this.gaitPhase);
        pivotPosY = 0.9;
        spineRotX = -0.08;
        headRotX = -0.42; // Look up cliff face

        // Alternating overhead handholds
        lShoulderX = -2.35 - reach * 0.48;
        rShoulderX = -2.35 + reach * 0.48;
        lShoulderZ = 0.22;
        rShoulderZ = -0.22;
        lElbowX = -0.55 + reach * 0.25;
        rElbowX = -0.55 - reach * 0.25;

        // Alternating high knee footholds
        lHipX = -0.82 + reach * 0.55;
        rHipX = -0.82 - reach * 0.55;
        lHipZ = 0.16;
        rHipZ = -0.16;
        lKneeX = 1.15 - reach * 0.55;
        rKneeX = 1.15 + reach * 0.55;
        this.rollAngle = 0;
        break;
      }

      case 'drive': {
        pivotPosY = 0.52;
        pivotRotZ = Math.max(-0.22, Math.min(0.22, -turnRate * 0.15));
        spineRotX = -0.08;
        lHipX = -1.38;
        rHipX = -1.38;
        lHipZ = 0.12;
        rHipZ = -0.12;
        lKneeX = 1.42;
        rKneeX = 1.42;

        // Hands extended forward to steering wheel / helm with steering twist
        const steerTwist = Math.max(-0.5, Math.min(0.5, turnRate * 0.35));
        lShoulderX = -1.08 + steerTwist * 0.28;
        rShoulderX = -1.08 - steerTwist * 0.28;
        lShoulderZ = 0.04;
        rShoulderZ = -0.04;
        lElbowX = -0.42;
        rElbowX = -0.42;
        this.rollAngle = 0;
        break;
      }

      case 'glide': {
        const sway = Math.sin(this.idleTime * 2.8);
        pivotPosY = 0.88;
        pivotRotX = 0.16;
        // Arms raised overhead gripping paraglider trapeze bar
        lShoulderX = -2.68;
        rShoulderX = -2.68;
        lShoulderZ = 0.24;
        rShoulderZ = -0.24;
        lElbowX = -0.28;
        rElbowX = -0.28;

        // Trailing relaxed legs in slipstream
        lHipX = 0.22 + sway * 0.06;
        rHipX = 0.14 - sway * 0.06;
        lKneeX = 0.48;
        rKneeX = 0.62;
        this.rollAngle = 0;
        break;
      }

      case 'attack': {
        this.attackPhase = (this.attackPhase + safeDt * 7.5) % (Math.PI * 2);
        const swing = Math.sin(this.attackPhase);
        pivotPosY = 0.87;
        spineRotX = 0.16;
        spineRotY = swing * 0.48;

        if (this.equippedTool === 'bow') {
          // Left arm aims bow forward, right hand draws bowstring
          lShoulderX = -1.48;
          lElbowX = -0.08;
          rShoulderX = -1.42;
          rElbowX = -1.35 - Math.max(0, swing) * 0.35;
        } else if (this.equippedTool === 'laser') {
          rShoulderX = -1.42 + Math.max(0, swing) * 0.12;
          rElbowX = -0.25;
          lShoulderX = -1.25;
          lShoulderZ = -0.28;
          lElbowX = -0.65;
        } else {
          // Dynamic melee / magic cast slash arc
          rShoulderX = -1.85 + swing * 1.45;
          rShoulderZ = -0.32 + swing * 0.25;
          rElbowX = -0.48;
          lShoulderX = 0.35;
          lShoulderZ = 0.32;
          lElbowX = -0.55;
        }

        lHipX = -0.25;
        rHipX = 0.22;
        lKneeX = 0.38;
        rKneeX = 0.28;
        this.rollAngle = 0;
        break;
      }
    }

    // Apply smooth damped joint rotations
    this.bodyPivot.position.y += (pivotPosY - this.bodyPivot.position.y) * blend;
    if (state === 'roll') {
      this.bodyPivot.rotation.x = pivotRotX;
    } else {
      this.bodyPivot.rotation.x += (pivotRotX - this.bodyPivot.rotation.x) * blend;
    }
    this.bodyPivot.rotation.z += (pivotRotZ - this.bodyPivot.rotation.z) * blend;

    this.spineGroup.rotation.x += (spineRotX - this.spineGroup.rotation.x) * blend;
    this.spineGroup.rotation.y += (spineRotY - this.spineGroup.rotation.y) * blend;
    this.spineGroup.rotation.z += (spineRotZ - this.spineGroup.rotation.z) * blend;

    this.headGroup.rotation.x += (headRotX - this.headGroup.rotation.x) * blend;
    this.headGroup.rotation.y += (headRotY - this.headGroup.rotation.y) * blend;

    this.leftHip.rotation.x += (lHipX - this.leftHip.rotation.x) * blend;
    this.rightHip.rotation.x += (rHipX - this.rightHip.rotation.x) * blend;
    this.leftHip.rotation.z += (lHipZ - this.leftHip.rotation.z) * blend;
    this.rightHip.rotation.z += (rHipZ - this.rightHip.rotation.z) * blend;

    this.leftKnee.rotation.x += (lKneeX - this.leftKnee.rotation.x) * blend;
    this.rightKnee.rotation.x += (rKneeX - this.rightKnee.rotation.x) * blend;

    this.leftAnkle.rotation.x += (lAnkleX - this.leftAnkle.rotation.x) * blend;
    this.rightAnkle.rotation.x += (rAnkleX - this.rightAnkle.rotation.x) * blend;

    this.leftShoulder.rotation.x += (lShoulderX - this.leftShoulder.rotation.x) * blend;
    this.rightShoulder.rotation.x += (rShoulderX - this.rightShoulder.rotation.x) * blend;
    this.leftShoulder.rotation.z += (lShoulderZ - this.leftShoulder.rotation.z) * blend;
    this.rightShoulder.rotation.z += (rShoulderZ - this.rightShoulder.rotation.z) * blend;

    this.leftElbow.rotation.x += (lElbowX - this.leftElbow.rotation.x) * blend;
    this.rightElbow.rotation.x += (rElbowX - this.rightElbow.rotation.x) * blend;

    // Flowing multi-segment cape cloth wave simulation
    const speedFactor = Math.min(1.2, speed / 10);
    const baseBillow =
      state === 'glide'
        ? 0.92
        : state === 'jump'
          ? 0.65
          : 0.08 + speedFactor * 0.68;

    for (let i = 0; i < this.capeSegments.length; i++) {
      const seg = this.capeSegments[i];
      const wave = Math.sin(this.idleTime * (4.2 + speedFactor * 5.0) - i * 0.85) * (0.04 + speedFactor * 0.09);
      const targetSegX = (i === 0 ? baseBillow : 0.08) + wave;
      const targetSegZ = Math.max(-0.25, Math.min(0.25, turnRate * 0.08 * (i + 1)));
      seg.rotation.x += (targetSegX - seg.rotation.x) * blend;
      seg.rotation.z += (targetSegZ - seg.rotation.z) * blend;
    }
  }

  public dispose(): void {
    if (this.nameplateTexture) {
      this.nameplateTexture.dispose();
      this.nameplateTexture = null;
    }
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    this.armorPrimaryMat.dispose();
    this.armorDarkMat.dispose();
    this.jointMetalMat.dispose();
    this.accentEmissiveMat.dispose();
    this.capeClothMat.dispose();
    this.flameOuterMat.dispose();
    this.flameCoreMat.dispose();
  }
}
