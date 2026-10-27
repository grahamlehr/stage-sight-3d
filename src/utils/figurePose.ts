import * as THREE from 'three';

type Vec3 = readonly [number, number, number];

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Applies a rotation given in world space to a bone, whatever its own local axes are. */
function rotateBoneWorld(bone: THREE.Object3D, turn: THREE.Quaternion): void {
  const parentQuat = new THREE.Quaternion();
  if (bone.parent) {
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(parentQuat);
  }
  // world' = turn · parent · local, so local' = parent⁻¹ · turn · parent · local
  bone.quaternion.premultiply(parentQuat.clone().invert().multiply(turn).multiply(parentQuat));
  bone.updateMatrixWorld(true);
}

/**
 * Turns a bone by `angle` about an axis given in world space. Rigs exported
 * from FBX carry an armature rotation and a 100× scale, so a turn about the
 * bone's local X isn't a turn about world X.
 */
export function turnBoneWorld(bone: THREE.Object3D, axis: THREE.Vector3, angle: number): void {
  rotateBoneWorld(bone, new THREE.Quaternion().setFromAxisAngle(axis, angle));
}

const worldPosition = (object: THREE.Object3D) => {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new THREE.Vector3());
};

/** The direction from a bone to a world-space point, as a unit vector in the bone's own frame. */
function localAxis(bone: THREE.Object3D, worldTarget: THREE.Vector3): THREE.Vector3 {
  bone.updateWorldMatrix(true, false);
  return bone.worldToLocal(worldTarget.clone()).normalize();
}

/** Turns a bone so its local axis points along a world direction, by the smallest turn. */
function aimBone(bone: THREE.Object3D, axis: THREE.Vector3, worldDirection: THREE.Vector3): void {
  bone.updateWorldMatrix(true, false);
  const current = axis.clone().transformDirection(bone.matrixWorld);
  rotateBoneWorld(bone, new THREE.Quaternion().setFromUnitVectors(current, worldDirection));
}

/** Moves a bone to a world-space point without turning it. */
function moveBoneTo(bone: THREE.Object3D, worldPoint: THREE.Vector3): void {
  if (bone.parent) {
    bone.parent.updateWorldMatrix(true, false);
    bone.position.copy(bone.parent.worldToLocal(worldPoint.clone()));
  } else {
    bone.position.copy(worldPoint);
  }
  bone.updateMatrixWorld(true);
}

/**
 * A seated pose. Limbs are world directions for the figure's left side, with
 * the figure facing +Z and its left at +X; the right side mirrors them. Turns
 * are in radians.
 */
export interface SeatedPose {
  /** Hip to knee. */
  thigh: Vec3;
  /** Knee to foot, when no floor height is given. */
  shin: Vec3;
  /** Shoulder to elbow. */
  upperArm: Vec3;
  /** Elbow to wrist. */
  forearm: Vec3;
  /** Torso leans back from upright. */
  lean: number;
  /** Head turn towards the figure's left (+X). */
  headYaw: number;
  /** Head tips forward. */
  headPitch: number;
}

/** Sitting back in a lounge chair, knees a little apart, hands resting on the thighs. */
export const SEATED_POSE: SeatedPose = {
  thigh: [0.08, 0.06, 1],
  shin: [0.02, -1, 0.12],
  upperArm: [0.06, -1, 0.3],
  forearm: [-0.3, -0.3, 1],
  lean: 0.12,
  headYaw: 0,
  headPitch: 0.08,
};

/** The bones a seated pose moves, by the names the Quaternius rigs use. */
export const SEAT_BONE_NAMES = [
  'Abdomen',
  'Head',
  'UpperLeg.L',
  'UpperLeg.R',
  'LowerLeg.L',
  'LowerLeg.R',
  'Foot.L',
  'Foot.R',
  'UpperArm.L',
  'UpperArm.R',
  'LowerArm.L',
  'LowerArm.R',
  'Wrist.L',
  'Wrist.R',
] as const;

export type SeatBones = Record<(typeof SEAT_BONE_NAMES)[number], THREE.Object3D>;

/**
 * The shin direction that brings a foot from the knee down to `footY`,
 * angling forward (+Z) as far as the shin's length needs. `sideways` is the
 * share of the shin's length spent across the body. A foot that can't reach
 * hangs as low as it can.
 */
export function shinToward(knee: THREE.Vector3, footY: number, shinLength: number, sideways: number): THREE.Vector3 {
  const lateral = sideways * shinLength;
  const drop = Math.min(knee.y - footY, Math.sqrt(shinLength * shinLength - lateral * lateral));
  const forward = Math.sqrt(Math.max(0, shinLength * shinLength - drop * drop - lateral * lateral));
  return new THREE.Vector3(lateral, -drop, forward).normalize();
}

/**
 * Bends a standing figure into a seated pose. The feet are IK-style bones
 * outside the leg chain in these rigs, so they don't follow the shins: each is
 * moved to the end of its shin, keeping its rest distance from the knee.
 * With `footY`, each shin angles forward just enough to put its foot bone at
 * that height, so the feet rest on the floor whatever the seat height.
 */
export function applySeatedPose(bones: SeatBones, pose: SeatedPose, footY?: number): void {
  const sides = (['L', 'R'] as const).map((suffix) => {
    const side = suffix === 'L' ? 1 : -1;
    const toward = (v: Vec3) => new THREE.Vector3(v[0] * side, v[1], v[2]).normalize();
    const upperLeg = bones[`UpperLeg.${suffix}`];
    const lowerLeg = bones[`LowerLeg.${suffix}`];
    const foot = bones[`Foot.${suffix}`];
    const upperArm = bones[`UpperArm.${suffix}`];
    const lowerArm = bones[`LowerArm.${suffix}`];
    // Read every rest-pose axis before anything moves
    const knee = worldPosition(lowerLeg);
    const footAt = worldPosition(foot);
    return {
      toward,
      upperLeg,
      lowerLeg,
      foot,
      upperArm,
      lowerArm,
      thighAxis: localAxis(upperLeg, knee),
      shinAxis: localAxis(lowerLeg, footAt),
      shinLength: knee.distanceTo(footAt),
      upperArmAxis: localAxis(upperArm, worldPosition(lowerArm)),
      forearmAxis: localAxis(lowerArm, worldPosition(bones[`Wrist.${suffix}`])),
    };
  });

  turnBoneWorld(bones.Abdomen, X_AXIS, -pose.lean);
  for (const s of sides) {
    aimBone(s.upperLeg, s.thighAxis, s.toward(pose.thigh));
    const restShin = s.toward(pose.shin);
    const shin =
      footY === undefined
        ? restShin
        : shinToward(worldPosition(s.lowerLeg), footY, s.shinLength, restShin.x);
    aimBone(s.lowerLeg, s.shinAxis, shin);
    moveBoneTo(s.foot, worldPosition(s.lowerLeg).addScaledVector(shin, s.shinLength));
    aimBone(s.upperArm, s.upperArmAxis, s.toward(pose.upperArm));
    aimBone(s.lowerArm, s.forearmAxis, s.toward(pose.forearm));
  }
  turnBoneWorld(bones.Head, Y_AXIS, pose.headYaw);
  turnBoneWorld(bones.Head, X_AXIS, pose.headPitch);
}
