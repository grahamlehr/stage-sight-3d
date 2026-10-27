import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SEATED_POSE, applySeatedPose, shinToward, turnBoneWorld, type SeatBones } from './figurePose';

/**
 * A minimal rig shaped like the Quaternius ones: an armature turned -90° about
 * X and scaled 100×, so bone-local axes don't line up with the world's, and
 * feet that hang off the armature rather than the shins.
 */
function buildRig() {
  const armature = new THREE.Group();
  armature.rotation.x = -Math.PI / 2;
  armature.scale.setScalar(100);
  const bone = (name: string, parent: THREE.Object3D, worldOffset: THREE.Vector3) => {
    const b = new THREE.Bone();
    b.name = name;
    parent.add(b);
    parent.updateWorldMatrix(true, false);
    // Place the bone by a world-space offset from its parent
    const world = parent.getWorldPosition(new THREE.Vector3()).add(worldOffset);
    b.position.copy(parent.worldToLocal(world));
    b.updateMatrixWorld(true);
    return b;
  };
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const hips = bone('Hips', armature, v(0, 0.95, 0));
  const abdomen = bone('Abdomen', hips, v(0, 0.1, 0));
  const head = bone('Head', abdomen, v(0, 0.6, 0));
  const bones: Partial<SeatBones> & Record<string, THREE.Bone> = { Abdomen: abdomen, Head: head };
  for (const [s, x] of [['L', 0.1], ['R', -0.1]] as const) {
    const upperLeg = bone(`UpperLeg.${s}`, hips, v(x, 0, 0));
    const lowerLeg = bone(`LowerLeg.${s}`, upperLeg, v(0, -0.45, 0.04));
    const foot = bone(`Foot.${s}`, armature, v(x, 0.03, 0));
    const upperArm = bone(`UpperArm.${s}`, abdomen, v(x * 2, 0.4, 0));
    const lowerArm = bone(`LowerArm.${s}`, upperArm, v(0, -0.3, 0));
    const wrist = bone(`Wrist.${s}`, lowerArm, v(0, -0.28, 0));
    Object.assign(bones, {
      [`UpperLeg.${s}`]: upperLeg,
      [`LowerLeg.${s}`]: lowerLeg,
      [`Foot.${s}`]: foot,
      [`UpperArm.${s}`]: upperArm,
      [`LowerArm.${s}`]: lowerArm,
      [`Wrist.${s}`]: wrist,
    });
  }
  armature.updateMatrixWorld(true);
  const at = (name: string) => armature.getObjectByName(name)!.getWorldPosition(new THREE.Vector3());
  return { bones: bones as SeatBones, at };
}

describe('turnBoneWorld', () => {
  it('turns about a world axis through an armature turned and scaled like an FBX export', () => {
    const { bones, at } = buildRig();
    // Swinging the thigh forward by a right angle points the knee down +Z
    turnBoneWorld(bones['UpperLeg.R'], new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const hip = at('UpperLeg.R');
    const knee = at('LowerLeg.R');
    // The rest thigh leans 0.04m forward, which now points 0.04m up
    expect(knee.z - hip.z).toBeCloseTo(0.45, 4);
    expect(knee.y - hip.y).toBeCloseTo(0.04, 4);
  });
});

describe('applySeatedPose', () => {
  it('sits the figure with thighs level, shins down and the feet moved under the knees', () => {
    const { bones, at } = buildRig();
    const restShin = at('LowerLeg.L').distanceTo(at('Foot.L'));
    applySeatedPose(bones, { ...SEATED_POSE, thigh: [0, 0, 1], shin: [0, -1, 0] });
    for (const s of ['L', 'R']) {
      const hip = at(`UpperLeg.${s}`);
      const knee = at(`LowerLeg.${s}`);
      const foot = at(`Foot.${s}`);
      expect(knee.z - hip.z).toBeCloseTo(hip.distanceTo(knee), 4);
      expect(knee.y).toBeCloseTo(hip.y, 4);
      // Regression: the feet hang off the armature, so they stayed on the floor behind the chair
      expect(foot.z).toBeCloseTo(knee.z, 4);
      expect(knee.y - foot.y).toBeCloseTo(restShin, 4);
    }
  });

  it('mirrors the pose for the right side', () => {
    const { bones, at } = buildRig();
    applySeatedPose(bones, SEATED_POSE);
    expect(at('LowerLeg.L').x).toBeCloseTo(-at('LowerLeg.R').x, 4);
    expect(at('Wrist.L').x).toBeCloseTo(-at('Wrist.R').x, 4);
    expect(at('LowerLeg.L').x).toBeGreaterThan(at('UpperLeg.L').x);
  });

  it('leans back, brings the hands forward onto the lap and keeps them in at the sides', () => {
    const { bones, at } = buildRig();
    applySeatedPose(bones, SEATED_POSE);
    expect(at('Head').z).toBeLessThan(at('Abdomen').z);
    for (const [s, side] of [['L', 1], ['R', -1]] as const) {
      const shoulder = at(`UpperArm.${s}`);
      const wrist = at(`Wrist.${s}`);
      expect(wrist.z).toBeGreaterThan(shoulder.z + 0.2);
      // Turned in: the hand ends nearer the middle than the shoulder
      expect(side * wrist.x).toBeLessThan(side * shoulder.x);
    }
  });
});

describe('shinToward', () => {
  it('angles the shin forward just enough to reach the floor', () => {
    const knee = new THREE.Vector3(0, 0.4, 0.5);
    const shin = shinToward(knee, 0, 0.5, 0);
    const foot = knee.clone().addScaledVector(shin, 0.5);
    expect(foot.y).toBeCloseTo(0, 6);
    expect(foot.z - knee.z).toBeCloseTo(0.3, 6);
  });

  it('hangs straight down when the shin is too short to reach', () => {
    const shin = shinToward(new THREE.Vector3(0, 0.8, 0), 0, 0.5, 0);
    expect(shin.toArray().map((v) => +v.toFixed(6))).toEqual([0, -1, 0]);
  });

  it('puts the posed feet at the given height', () => {
    const { bones, at } = buildRig();
    applySeatedPose(bones, SEATED_POSE, 0.6);
    expect(at('Foot.L').y).toBeCloseTo(0.6, 4);
    expect(at('Foot.R').y).toBeCloseTo(0.6, 4);
    expect(at('Foot.L').z).toBeGreaterThan(at('LowerLeg.L').z);
  });
});
