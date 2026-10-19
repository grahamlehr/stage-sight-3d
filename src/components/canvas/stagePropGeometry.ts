import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural geometry for the stage occlusion props: the standing presenter,
 * the lectern and the four-person seated panel.
 *
 * Every prop is assembled from three.js primitives and merged into one
 * geometry per material slot, with per-part colors baked in as vertex colors.
 * A whole person is three draw calls (cloth, skin, gloss), which keeps the
 * panel cheap enough for WebXR on a Meta Quest.
 *
 * Conventions: meters, Y up, each prop faces +Z (toward the audience), and the
 * origin is on the floor under the prop's center.
 */

export type Vec3 = readonly [number, number, number];
export type FigureSlot = 'cloth' | 'skin' | 'gloss';
export type ChairSlot = 'fabric' | 'metal';
export type LecternSlot = 'wood' | 'metal' | 'matte';
export type TableSlot = 'top' | 'metal' | 'glass';
export type SlotGeometries<S extends string> = Record<S, THREE.BufferGeometry>;

const FIGURE_SLOTS: readonly FigureSlot[] = ['cloth', 'skin', 'gloss'];
const CHAIR_SLOTS: readonly ChairSlot[] = ['fabric', 'metal'];
const LECTERN_SLOTS: readonly LecternSlot[] = ['wood', 'metal', 'matte'];
const TABLE_SLOTS: readonly TableSlot[] = ['top', 'metal', 'glass'];

// ================= Part accumulation =================

const vec = (p: Vec3 | THREE.Vector3) =>
  p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]);
const UP = new THREE.Vector3(0, 1, 0);

/** Reduces a primitive to an indexed position + normal geometry so all parts merge. */
const normalizeForMerge = (geometry: THREE.BufferGeometry): THREE.BufferGeometry => {
  geometry.deleteAttribute('uv');
  geometry.clearGroups();
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  if (geometry.index) return geometry;
  const indexed = mergeVertices(geometry);
  geometry.dispose();
  return indexed;
};

/**
 * Collects tinted parts per material slot and merges each slot into a single
 * geometry. `root` is applied after each part's own matrix, so a whole figure
 * can be scaled or offset without touching its parts.
 */
class PartSet<S extends string> {
  private readonly parts = new Map<S, THREE.BufferGeometry[]>();
  root = new THREE.Matrix4();

  constructor(private readonly slots: readonly S[]) {
    slots.forEach((slot) => this.parts.set(slot, []));
  }

  add(slot: S, source: THREE.BufferGeometry, color: THREE.ColorRepresentation, matrix?: THREE.Matrix4) {
    if (matrix) source.applyMatrix4(matrix);
    source.applyMatrix4(this.root);
    const geometry = normalizeForMerge(source);
    const tint = new THREE.Color(color);
    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) tint.toArray(colors, i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.get(slot)!.push(geometry);
  }

  build(): SlotGeometries<S> {
    const out = {} as SlotGeometries<S>;
    for (const slot of this.slots) {
      const list = this.parts.get(slot)!;
      if (list.length === 0) {
        out[slot] = new THREE.BufferGeometry();
        continue;
      }
      const merged = mergeGeometries(list, false);
      if (!merged) throw new Error(`stagePropGeometry: could not merge the "${slot}" parts`);
      list.forEach((g) => g.dispose());
      merged.computeBoundingSphere();
      out[slot] = merged;
    }
    return out;
  }
}

// ================= Primitive helpers =================

/** Ellipsoid with the given radii, optionally rotated about its center. */
const ellipsoid = (center: Vec3 | THREE.Vector3, radii: Vec3, widthSegments = 14, heightSegments = 10, rotation?: THREE.Euler) => {
  const g = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  const q = rotation ? new THREE.Quaternion().setFromEuler(rotation) : new THREE.Quaternion();
  g.applyMatrix4(new THREE.Matrix4().compose(vec(center), q, vec(radii)));
  return g;
};

/** Ellipsoid whose local x/y/z radii run along the given (orthonormal) axes. */
const orientedEllipsoid = (
  center: THREE.Vector3,
  axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
  radii: Vec3,
  widthSegments = 10,
  heightSegments = 8
) => {
  const g = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  g.scale(radii[0], radii[1], radii[2]);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(axes[0], axes[1], axes[2]).setPosition(center));
  return g;
};

/** Open tapered tube from a (radius ra) to b (radius rb). Pair with joint spheres. */
const segment = (a: Vec3 | THREE.Vector3, b: Vec3 | THREE.Vector3, ra: number, rb: number, radialSegments = 12) => {
  const start = vec(a);
  const end = vec(b);
  const axis = end.clone().sub(start);
  const length = axis.length();
  const g = new THREE.CylinderGeometry(rb, ra, length, radialSegments, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, axis.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
};

const sphere = (center: Vec3 | THREE.Vector3, radius: number, widthSegments = 12, heightSegments = 8) => {
  const g = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const c = vec(center);
  g.translate(c.x, c.y, c.z);
  return g;
};

/** Surface of revolution around Y from [radius, y] profile points (bottom to top). */
const lathe = (profile: ReadonlyArray<readonly [number, number]>, segments = 24, phiStart = 0, phiLength = Math.PI * 2) =>
  new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
    phiStart,
    phiLength
  );

const box = (size: Vec3, center: Vec3 | THREE.Vector3, rotation?: THREE.Euler) => {
  const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const q = rotation ? new THREE.Quaternion().setFromEuler(rotation) : new THREE.Quaternion();
  g.applyMatrix4(new THREE.Matrix4().compose(vec(center), q, new THREE.Vector3(1, 1, 1)));
  return g;
};

/**
 * Parametric grid surface. `fn(u, v)` maps [0,1]² to a point; wrapped
 * directions share their seam vertices so normals stay smooth across them.
 * Winding is counter-clockwise when u runs left-to-right and v runs upward.
 */
const surface = (
  uSegments: number,
  vSegments: number,
  fn: (u: number, v: number) => THREE.Vector3,
  wrapU = false,
  wrapV = false
) => {
  const uCount = wrapU ? uSegments : uSegments + 1;
  const vCount = wrapV ? vSegments : vSegments + 1;
  const positions = new Float32Array(uCount * vCount * 3);
  for (let j = 0; j < vCount; j++) {
    for (let i = 0; i < uCount; i++) {
      fn(i / uSegments, j / vSegments).toArray(positions, (j * uCount + i) * 3);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < vSegments; j++) {
    const j1 = (j + 1) % vCount;
    for (let i = 0; i < uSegments; i++) {
      const i1 = (i + 1) % uCount;
      const a = j * uCount + i;
      const b = j * uCount + i1;
      const c = j1 * uCount + i;
      const d = j1 * uCount + i1;
      index.push(a, b, d, a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
};

const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

/**
 * Smooth body profile through [y, ...values] keys. Returns a lookup by height
 * built from a Catmull-Rom curve through the keys, so silhouettes have no creases.
 */
const makeProfile = (keys: ReadonlyArray<readonly number[]>) => {
  const samples: number[][] = [];
  const n = keys.length;
  const key = (i: number) => keys[Math.min(n - 1, Math.max(0, i))];
  const steps = 12;
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      samples.push(keys[i].map((_, c) => catmullRom(key(i - 1)[c], key(i)[c], key(i + 1)[c], key(i + 2)[c], t)));
    }
  }
  samples.push([...keys[n - 1]]);
  for (let i = 1; i < samples.length; i++) samples[i][0] = Math.max(samples[i][0], samples[i - 1][0] + 1e-5);

  const yMin = samples[0][0];
  const yMax = samples[samples.length - 1][0];
  const at = (y: number): number[] => {
    if (y <= yMin) return samples[0].slice(1);
    if (y >= yMax) return samples[samples.length - 1].slice(1);
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid][0] <= y) lo = mid;
      else hi = mid;
    }
    const t = (y - samples[lo][0]) / (samples[hi][0] - samples[lo][0]);
    return samples[lo].slice(1).map((v, c) => Math.max(0, v + (samples[hi][c + 1] - v) * t));
  };
  return { at, yMin, yMax };
};

const shade = (color: THREE.ColorRepresentation, factor: number) => new THREE.Color(color).multiplyScalar(factor);

// ================= Human figure =================

/**
 * Torso cross-section by height above the hip joints: [y, half width, depth
 * ratio, forward shift]. Each slice is an ellipse whose depth is the half width
 * times the ratio, so the chest is round and the shoulders flatten toward the
 * neck. Tuned for a 1.8m adult in a tailored jacket.
 */
const TORSO = makeProfile([
  [-0.135, 0.0, 0.7, 0.0],
  [-0.128, 0.148, 0.7, -0.004],
  [-0.04, 0.166, 0.68, -0.008],
  [0.08, 0.154, 0.64, 0.0],
  [0.22, 0.168, 0.66, 0.008],
  [0.34, 0.184, 0.67, 0.012],
  [0.45, 0.198, 0.6, 0.006],
  [0.51, 0.2, 0.52, 0.0],
  [0.56, 0.17, 0.5, -0.004],
  [0.6, 0.11, 0.62, -0.008],
  [0.632, 0.066, 0.85, -0.008],
  [0.645, 0.0, 1.0, -0.008],
]);

const torsoPoint = (phi: number, y: number, inflate = 0) => {
  const [r, depth, shift] = TORSO.at(y);
  return new THREE.Vector3((r + inflate) * Math.sin(phi), y, (r * depth + inflate) * Math.cos(phi) + shift);
};

/**
 * A patch on the torso surface between two heights, `halfX(t)` wide and
 * centered at `centerX(t)`, where t runs 0→1 from y0 to y1.
 */
const torsoPatch = (y0: number, y1: number, halfX: (t: number) => number, inflate: number, centerX: (t: number) => number = () => 0) =>
  surface(8, 10, (u, v) => {
    const y = y0 + (y1 - y0) * v;
    const [r] = TORSO.at(y);
    const reach = r + inflate;
    const phiCenter = Math.asin(Math.max(-0.95, Math.min(0.95, centerX(v) / Math.max(reach, 1e-3))));
    const phiHalf = Math.asin(Math.min(0.95, halfX(v) / Math.max(reach, 1e-3)));
    return torsoPoint(phiCenter + (u * 2 - 1) * phiHalf, y, inflate);
  });

export type HairStyle = 'short' | 'long';

export interface FigureLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  suit: string;
  shirt: string;
  /** Tie color, or null for an open collar. */
  tie: string | null;
  shoes: string;
  /** Uniform scale; 1 is a 1.8m adult. */
  scale: number;
}

interface LimbPose {
  elbow: Vec3;
  wrist: Vec3;
  /** Direction the fingers point. */
  handDir: Vec3;
  /** Rough direction the palm faces; orthogonalized against handDir. */
  palm: Vec3;
}

interface LegPose {
  knee: Vec3;
  ankle: Vec3;
  /** Toe-out yaw and toe-down pitch, radians. */
  footYaw: number;
  footPitch: number;
}

export interface FigurePose {
  /** Midpoint between the hip joints, and the torso's origin. */
  pelvis: Vec3;
  /** Torso pitch in radians; positive leans back. */
  lean: number;
  headPitch: number;
  headYaw: number;
  /** [right (−X), left (+X)], as seen by the figure facing +Z. */
  arms: [LimbPose, LimbPose];
  legs: [LegPose, LegPose];
}

const SIDES = [-1, 1] as const;

/** Standing presenter, weight on the right leg, right hand open in a gesture. */
export const STANDING_POSE: FigurePose = {
  pelvis: [0, 0.92, 0],
  lean: 0,
  headPitch: 0.03,
  headYaw: -0.12,
  arms: [
    { elbow: [-0.235, 1.16, 0.0], wrist: [-0.31, 1.215, 0.255], handDir: [-0.25, 0.12, 1], palm: [-0.35, 1, 0.1] },
    { elbow: [0.215, 1.15, -0.035], wrist: [0.24, 0.885, 0.02], handDir: [0.04, -1, 0.12], palm: [-1, 0, 0.1] },
  ],
  legs: [
    { knee: [-0.1, 0.495, 0.0], ankle: [-0.11, 0.085, -0.015], footYaw: -0.14, footPitch: 0 },
    { knee: [0.105, 0.5, 0.035], ankle: [0.13, 0.085, 0.03], footYaw: 0.2, footPitch: 0 },
  ],
};

/** Seated upright against a tub-chair back, hands resting on the thighs. */
export const SEATED_OPEN_POSE: FigurePose = {
  pelvis: [0, 0.54, -0.12],
  lean: 0.12,
  headPitch: 0.16,
  headYaw: 0,
  arms: [
    { elbow: [-0.235, 0.76, -0.12], wrist: [-0.165, 0.64, 0.1], handDir: [0.1, -0.35, 1], palm: [0, -1, 0] },
    { elbow: [0.235, 0.76, -0.12], wrist: [0.165, 0.64, 0.1], handDir: [-0.1, -0.35, 1], palm: [0, -1, 0] },
  ],
  legs: [
    { knee: [-0.115, 0.5, 0.31], ankle: [-0.125, 0.085, 0.4], footYaw: -0.12, footPitch: 0 },
    { knee: [0.115, 0.5, 0.31], ankle: [0.125, 0.085, 0.4], footYaw: 0.12, footPitch: 0 },
  ],
};

/** Seated with the right leg crossed over the left, left forearm on the armrest. */
export const SEATED_CROSSED_POSE: FigurePose = {
  pelvis: [0, 0.54, -0.12],
  lean: 0.12,
  headPitch: 0.16,
  headYaw: 0,
  arms: [
    { elbow: [-0.21, 0.77, -0.08], wrist: [-0.07, 0.715, 0.15], handDir: [0.45, -0.25, 0.85], palm: [0, -1, 0] },
    { elbow: [0.33, 0.75, -0.12], wrist: [0.345, 0.69, 0.13], handDir: [0.02, -0.45, 1], palm: [0, -1, 0] },
  ],
  legs: [
    { knee: [0.03, 0.605, 0.3], ankle: [0.07, 0.24, 0.5], footYaw: -0.1, footPitch: 0.55 },
    { knee: [0.115, 0.5, 0.31], ankle: [0.13, 0.085, 0.38], footYaw: 0.1, footPitch: 0 },
  ],
};

const SHOULDER_LOCAL = 0.48;
const NECK_TOP_LOCAL = 0.7;

const addHead = (set: PartSet<FigureSlot>, look: FigureLook, head: THREE.Matrix4) => {
  const at = (g: THREE.BufferGeometry) => g.applyMatrix4(head);
  const brow = new THREE.Color(look.skin).lerp(new THREE.Color(look.hair), 0.6);
  const lips = shade(look.skin, 0.9).lerp(new THREE.Color('#9a4a48'), 0.12);

  set.add('skin', at(ellipsoid([0, 0.072, 0], [0.077, 0.1, 0.097], 18, 13)), look.skin); // cranium
  // Jaw and cheeks. Their normals point out from a point below the mouth, so
  // the lower face catches the overhead stage light like the rest of the face.
  // True normals face downward there and shade the jaw dark enough to read as
  // a beard, since the material has no subsurface or bounce light.
  const jaw = ellipsoid([0, 0.015, 0.028], [0.062, 0.058, 0.068], 14, 10);
  const jawPos = jaw.attributes.position;
  const jawNormal = jaw.attributes.normal;
  const fromCenter = new THREE.Vector3();
  for (let i = 0; i < jawPos.count; i++) {
    fromCenter.fromBufferAttribute(jawPos, i).sub(new THREE.Vector3(0, -0.06, -0.03)).normalize();
    jawNormal.setXYZ(i, fromCenter.x, fromCenter.y, fromCenter.z);
  }
  set.add('skin', at(jaw), look.skin);
  set.add('skin', at(ellipsoid([0, 0.055, 0.098], [0.013, 0.024, 0.019], 8, 6, new THREE.Euler(-0.25, 0, 0))), look.skin); // nose
  set.add('skin', at(ellipsoid([0, 0.019, 0.089], [0.019, 0.0045, 0.009], 8, 5)), lips);
  for (const s of SIDES) {
    set.add('skin', at(ellipsoid([s * 0.076, 0.062, -0.008], [0.011, 0.029, 0.018], 8, 6)), look.skin); // ears
    // Eyes and brows stay low-contrast so they don't merge into a dark band at a distance
    set.add('gloss', at(ellipsoid([s * 0.03, 0.074, 0.088], [0.007, 0.0045, 0.0035], 8, 5)), '#3d2c24'); // eyes
    set.add('skin', at(ellipsoid([s * 0.031, 0.091, 0.089], [0.016, 0.0028, 0.005], 6, 4, new THREE.Euler(0, 0, s * -0.12))), brow); // brows
  }

  // Hair cap: the top of a sphere, tilted back so the hairline clears the
  // forehead at the front and drops to the nape at the back.
  const long = look.hairStyle === 'long';
  const cap = new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.47);
  cap.rotateX(-0.57);
  cap.scale(long ? 0.085 : 0.083, long ? 0.106 : 0.104, long ? 0.105 : 0.103);
  cap.translate(0, 0.076, -0.004);
  set.add('skin', at(cap), look.hair);
  if (long) {
    set.add('skin', at(ellipsoid([0, -0.03, -0.058], [0.082, 0.12, 0.052], 14, 10)), look.hair);
    for (const s of SIDES) {
      set.add('skin', at(ellipsoid([s * 0.07, 0.0, -0.03], [0.02, 0.085, 0.045], 8, 6)), look.hair);
    }
  }
};

const addHand = (
  set: PartSet<FigureSlot>,
  look: FigureLook,
  side: -1 | 1,
  wrist: THREE.Vector3,
  pose: LimbPose
) => {
  const dir = vec(pose.handDir).normalize();
  const hint = vec(pose.palm);
  const normal = hint.sub(dir.clone().multiplyScalar(hint.dot(dir))).normalize();
  const across = new THREE.Vector3().crossVectors(dir, normal);
  const thumbSide = across.clone().multiplyScalar(-side);
  const along = (d: number, t = 0, n = 0) =>
    wrist.clone().addScaledVector(dir, d).addScaledVector(thumbSide, t).addScaledVector(normal, n);

  set.add('skin', sphere(wrist, 0.027, 8, 6), look.skin);
  set.add('skin', orientedEllipsoid(along(0.045), [across, dir, normal], [0.038, 0.05, 0.015], 10, 6), look.skin); // palm
  set.add('skin', orientedEllipsoid(along(0.115, 0, 0.004), [across, dir, normal], [0.033, 0.048, 0.0095], 10, 6), look.skin); // fingers
  const thumbBase = along(0.022, 0.03, 0.004);
  const thumbTip = along(0.085, 0.048, 0.012);
  set.add('skin', segment(thumbBase, thumbTip, 0.013, 0.01, 8), look.skin);
  set.add('skin', sphere(thumbTip, 0.01, 6, 4), look.skin);
};

/** Builds a dressed figure in the given pose: three merged geometries. */
export const buildFigure = (pose: FigurePose, look: FigureLook): SlotGeometries<FigureSlot> => {
  const set = new PartSet(FIGURE_SLOTS);
  set.root.makeScale(look.scale, look.scale, look.scale);

  const pelvis = vec(pose.pelvis);
  const torso = new THREE.Matrix4().makeTranslation(pelvis.x, pelvis.y, pelvis.z).multiply(new THREE.Matrix4().makeRotationX(-pose.lean));
  const toTorso = (g: THREE.BufferGeometry) => g.applyMatrix4(torso);
  const lapel = shade(look.suit, 0.82);

  // Jacket body, shirt front, lapels and tie
  // Rows bunch up toward the neck, where the profile turns fastest and the collar meets it
  const torsoY = (v: number) => TORSO.yMin + (TORSO.yMax - TORSO.yMin) * (1 - Math.pow(1 - v, 1.6));
  set.add('cloth', toTorso(surface(32, 36, (u, v) => torsoPoint(u * Math.PI * 2, torsoY(v)), true)), look.suit);
  // The open V of the jacket, by height: narrow at the button, full width at the collar
  const V_BOTTOM = 0.29;
  const V_TOP = 0.635;
  const vNeck = (y: number) => 0.012 + 0.058 * Math.min(1, ((y - V_BOTTOM) / (V_TOP - V_BOTTOM)) * 1.15);
  const along = (y0: number, y1: number, f: (y: number) => number) => (t: number) => f(y0 + (y1 - y0) * t);
  set.add('cloth', toTorso(torsoPatch(V_BOTTOM, V_TOP, along(V_BOTTOM, V_TOP, vNeck), 0.003)), look.shirt);
  for (const s of SIDES) {
    // Each lapel runs along one edge of the V, a little proud of the jacket
    const edge = along(V_BOTTOM, 0.56, (y) => s * (vNeck(y) + 0.012));
    set.add('cloth', toTorso(torsoPatch(V_BOTTOM, 0.56, () => 0.015, 0.006, edge)), lapel);
  }
  if (look.tie) {
    // The blade narrows toward the knot and tucks under the jacket where the V closes
    const tieHalf = along(0.295, 0.59, (y) => Math.min(0.022 - 0.01 * ((y - 0.295) / 0.295), vNeck(y) - 0.003));
    set.add('gloss', toTorso(torsoPatch(0.295, 0.59, tieHalf, 0.007)), look.tie);
    set.add('gloss', toTorso(ellipsoid(torsoPoint(0, 0.6, 0.008), [0.016, 0.019, 0.009], 8, 6)), look.tie);
    set.add('cloth', toTorso(segment([0, 0.6, -0.012], [0, 0.665, -0.008], 0.07, 0.064, 16)), look.shirt); // collar
  }
  set.add('gloss', toTorso(sphere(torsoPoint(0, 0.255, 0.004), 0.008, 6, 4)), shade(look.suit, 0.5)); // button

  // Neck and head
  set.add('skin', toTorso(segment([0, 0.57, -0.012], [0, NECK_TOP_LOCAL + 0.01, 0.004], 0.062, 0.056, 14)), look.skin);
  const head = torso
    .clone()
    .multiply(new THREE.Matrix4().makeTranslation(0, NECK_TOP_LOCAL, 0))
    .multiply(new THREE.Matrix4().makeRotationY(pose.headYaw))
    .multiply(new THREE.Matrix4().makeRotationX(pose.headPitch));
  addHead(set, look, head);

  // Arms: deltoid, sleeve, shirt cuff, hand
  SIDES.forEach((side, i) => {
    const arm = pose.arms[i];
    const shoulder = new THREE.Vector3(side * 0.18, SHOULDER_LOCAL, -0.01).applyMatrix4(torso);
    const elbow = vec(arm.elbow);
    const wrist = vec(arm.wrist);
    const forearm = wrist.clone().sub(elbow).normalize();
    const cuffStart = wrist.clone().addScaledVector(forearm, -0.03);
    const cuffEnd = wrist.clone().addScaledVector(forearm, -0.008);

    set.add('cloth', sphere(new THREE.Vector3(side * 0.182, SHOULDER_LOCAL, -0.006).applyMatrix4(torso), 0.058, 12, 8), look.suit);
    set.add('cloth', segment(shoulder, elbow, 0.054, 0.044, 12), look.suit);
    set.add('cloth', sphere(elbow, 0.044, 10, 6), look.suit);
    set.add('cloth', segment(elbow, cuffStart, 0.044, 0.039, 12), look.suit);
    set.add('cloth', segment(cuffStart, cuffEnd, 0.035, 0.034, 12), look.shirt);
    addHand(set, look, side, wrist, arm);
  });

  // Legs and shoes
  SIDES.forEach((side, i) => {
    const leg = pose.legs[i];
    const hip = new THREE.Vector3(side * 0.092, pelvis.y - 0.03, pelvis.z);
    const knee = vec(leg.knee);
    const ankle = vec(leg.ankle);
    const hem = ankle.clone().add(new THREE.Vector3(0, 0.01, 0));

    set.add('cloth', sphere(hip, 0.09, 12, 8), look.suit);
    set.add('cloth', segment(hip, knee, 0.09, 0.064, 14), look.suit);
    set.add('cloth', sphere(knee, 0.064, 10, 6), look.suit);
    set.add('cloth', segment(knee, hem, 0.06, 0.054, 14), look.suit);

    const foot = new THREE.Matrix4()
      .makeTranslation(ankle.x, ankle.y, ankle.z)
      .multiply(new THREE.Matrix4().makeRotationY(leg.footYaw))
      .multiply(new THREE.Matrix4().makeRotationX(leg.footPitch));
    set.add('gloss', ellipsoid([0, -0.05, 0.1], [0.047, 0.035, 0.095], 12, 7), look.shoes, foot); // vamp and toe
    set.add('gloss', ellipsoid([0, -0.035, -0.005], [0.045, 0.05, 0.08], 12, 7), look.shoes, foot); // heel and quarter
  });

  return set.build();
};

// ================= Tub chair =================

const CHAIR_OPENING = 0.36 * Math.PI; // half-angle of the open front
const RIM_RADIUS = 0.04;

/** Rim height: 0.80m at the back, falling to ~0.65m at the arm ends. */
const rimHeight = (phi: number) => {
  const back = (1 - Math.cos(phi)) / 2;
  return 0.64 + 0.16 * back * back;
};

/** Closed [r, y] cross-section of the chair shell wall at angle phi. */
const shellProfile = (phi: number): [number, number][] => {
  const top = rimHeight(phi) - RIM_RADIUS;
  const pts: [number, number][] = [
    [0.36, 0.385],
    [0.385, 0.55],
    [0.4, top],
  ];
  for (let k = 1; k < 8; k++) {
    const t = (k / 8) * Math.PI;
    pts.push([0.36 + RIM_RADIUS * Math.cos(t), top + RIM_RADIUS * Math.sin(t)]);
  }
  pts.push([0.32, top], [0.32, 0.47], [0.335, 0.39]);
  return pts;
};

const shellPoint = (phi: number, [r, y]: [number, number]) =>
  new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi));

/** Flat cap closing the shell wall at one arm end. */
const shellCap = (phi: number) => {
  const profile = shellProfile(phi);
  const tris = THREE.ShapeUtils.triangulateShape(profile.map(([r, y]) => new THREE.Vector2(r, y)), []);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(profile.flatMap((p) => shellPoint(phi, p).toArray())), 3));
  g.setIndex(tris.flat());
  g.computeVertexNormals();
  return g;
};

/** Upholstered swivel tub chair, open toward +Z. */
export const buildTubChair = (fabric = '#5d6068', cushion = '#6d7078'): SlotGeometries<ChairSlot> => {
  const set = new PartSet(CHAIR_SLOTS);
  const phiStart = CHAIR_OPENING;
  const phiLength = Math.PI * 2 - CHAIR_OPENING * 2;
  const loopLength = shellProfile(0).length;

  set.add(
    'fabric',
    surface(
      44,
      loopLength,
      (u, v) => {
        const phi = phiStart + u * phiLength;
        const profile = shellProfile(phi);
        return shellPoint(phi, profile[Math.round(v * loopLength) % loopLength]);
      },
      false,
      true
    ),
    fabric
  );
  set.add('fabric', shellCap(phiStart), fabric);
  set.add('fabric', shellCap(phiStart + phiLength), fabric);

  // Lower barrel, full round, under the seat
  set.add(
    'fabric',
    lathe([[0, 0.17], [0.31, 0.17], [0.34, 0.185], [0.356, 0.24], [0.362, 0.39], [0.33, 0.4], [0, 0.4]], 40),
    shade(fabric, 0.9)
  );
  // Loose seat cushion with a crowned top
  set.add(
    'fabric',
    lathe([[0, 0.39], [0.3, 0.39], [0.316, 0.405], [0.318, 0.44], [0.308, 0.463], [0.286, 0.473], [0.15, 0.478], [0, 0.48]], 40),
    cushion
  );
  // Chrome swivel plate and column
  set.add(
    'metal',
    lathe([[0, 0.0], [0.25, 0.0], [0.262, 0.006], [0.256, 0.016], [0.05, 0.024], [0.035, 0.034], [0.035, 0.15], [0.12, 0.162], [0.12, 0.172], [0, 0.172]], 36),
    '#d9dde3'
  );
  return set.build();
};

// ================= Side tables =================

/** Tulip side tables with a glass of water each, one per position. */
export const buildSideTables = (positions: readonly Vec3[]): SlotGeometries<TableSlot> => {
  const set = new PartSet(TABLE_SLOTS);
  for (const p of positions) {
    const at = new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]);
    set.add('metal', lathe([[0, 0], [0.17, 0], [0.18, 0.006], [0.165, 0.016], [0.04, 0.03], [0.02, 0.06], [0.018, 0.49], [0, 0.49]], 32), '#c9ccd1', at);
    set.add('top', lathe([[0, 0.488], [0.232, 0.488], [0.244, 0.496], [0.246, 0.508], [0.236, 0.52], [0, 0.52]], 40), '#d8d2c8', at);
    for (const [gx, gz] of [[-0.07, 0.05], [0.08, -0.04]] as const) {
      const glass = new THREE.Matrix4().makeTranslation(p[0] + gx, p[1] + 0.52, p[2] + gz);
      set.add('glass', lathe([[0, 0.0], [0.028, 0.0], [0.033, 0.095], [0.03, 0.095], [0.025, 0.006], [0, 0.006]], 20), '#e8f2f8', glass);
      set.add('glass', lathe([[0, 0.007], [0.0255, 0.007], [0.029, 0.065], [0, 0.065]], 20), '#9cc8e0', glass);
    }
  }
  return set.build();
};

// ================= Lectern =================

export const LECTERN_HEIGHT = 1.15;

/**
 * Walnut lectern facing the audience (+Z): solid sides and front, an open back
 * with a shelf, a reading desk sloping down toward the presenter, a gooseneck
 * microphone and a few sheets of notes.
 */
export const buildLectern = (): SlotGeometries<LecternSlot> => {
  const set = new PartSet(LECTERN_SLOTS);
  const walnut = '#6a4630';
  const walnutDark = '#4b3020';
  const front = 0.24;
  const back = -0.25;
  const backTop = 1.035;
  const plinth = 0.05;

  // Side panels: extruded side profiles with a small bevel
  const sideShape = new THREE.Shape();
  sideShape.moveTo(back, plinth);
  sideShape.lineTo(front, plinth);
  sideShape.lineTo(front, LECTERN_HEIGHT - 0.035);
  sideShape.lineTo(back, backTop - 0.035);
  sideShape.closePath();
  for (const s of SIDES) {
    const panel = new THREE.ExtrudeGeometry(sideShape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 });
    panel.rotateY(-Math.PI / 2); // shape x → world z, extrusion → −x
    panel.translate(s > 0 ? 0.305 : -0.275, 0, 0);
    set.add('wood', panel, walnut);
  }

  // Front fascia with an inlaid center field and a brushed-metal name plate
  set.add('wood', box([0.55, 1.06, 0.025], [0, plinth + 0.53, front - 0.0125]), walnut);
  set.add('wood', box([0.44, 0.62, 0.01], [0, 0.5, front + 0.002]), walnutDark); // inlaid center field
  set.add('metal', box([0.3, 0.085, 0.006], [0, 0.95, front + 0.003]), '#b9bec6');

  // Reading desk, sloped down toward the presenter, with a paper stop
  const slope = Math.atan2(LECTERN_HEIGHT - backTop, front - back);
  const deckDepth = Math.hypot(front - back, LECTERN_HEIGHT - backTop) + 0.03;
  const normal = new THREE.Vector3(0, Math.cos(slope), -Math.sin(slope));
  const deckTop = new THREE.Vector3(0, (LECTERN_HEIGHT + backTop) / 2, (front + back) / 2);
  const deckPoint = (x: number, z: number) =>
    new THREE.Vector3(x, backTop + ((z - back) / (front - back)) * (LECTERN_HEIGHT - backTop), z);
  const tilt = new THREE.Euler(-slope, 0, 0);
  set.add('wood', box([0.645, 0.03, deckDepth], deckTop.clone().addScaledVector(normal, -0.015), tilt), walnutDark);
  set.add('metal', box([0.6, 0.016, 0.012], deckPoint(0, back + 0.005).addScaledVector(normal, 0.008), tilt), '#2d3036');

  // Notes on the desk
  set.add('matte', box([0.21, 0.004, 0.297], deckPoint(0.06, -0.03).addScaledVector(normal, 0.002), new THREE.Euler(-slope, 0.05, 0)), '#f1efe9');

  // Open back: lower modesty panel and a shelf between the sides
  set.add('wood', box([0.55, 0.5, 0.02], [0, plinth + 0.25, back + 0.03]), walnutDark);
  set.add('wood', box([0.55, 0.022, 0.42], [0, 0.74, -0.01]), walnutDark);

  // Recessed black plinth
  set.add('metal', box([0.58, plinth, 0.46], [0, plinth / 2, -0.005]), '#1e2024');

  // Gooseneck microphone rising from the desk's front-left corner toward the presenter
  const micBase = new THREE.Vector3(-0.22, LECTERN_HEIGHT - 0.01, front - 0.05);
  const neck = new THREE.CatmullRomCurve3([
    micBase,
    micBase.clone().add(new THREE.Vector3(0, 0.12, -0.02)),
    micBase.clone().add(new THREE.Vector3(0.03, 0.24, -0.12)),
    micBase.clone().add(new THREE.Vector3(0.06, 0.27, -0.24)),
  ]);
  set.add('metal', lathe([[0, 0], [0.03, 0], [0.03, 0.012], [0.012, 0.03], [0, 0.03]], 16), '#2a2d33', new THREE.Matrix4().makeTranslation(micBase.x, micBase.y - 0.005, micBase.z));
  set.add('metal', new THREE.TubeGeometry(neck, 28, 0.0055, 8, false), '#3a3e45');
  const tip = neck.getPoint(1);
  const tipDir = neck.getTangent(1).normalize();
  set.add('metal', segment(tip, tip.clone().addScaledVector(tipDir, 0.06), 0.009, 0.011, 12), '#2a2d33');
  set.add('matte', sphere(tip.clone().addScaledVector(tipDir, 0.085), 0.02, 12, 10), '#16181c'); // foam windscreen

  return set.build();
};

// ================= Contact shadows =================

/**
 * Soft contact shadows as floor discs with a vertex-alpha falloff, so no
 * texture is needed. Each entry is [x, z, radiusX, radiusZ, opacity].
 */
export const buildContactShadows = (discs: ReadonlyArray<readonly [number, number, number, number, number]>) => {
  const rings = 8;
  const segments = 36;
  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const floor = Math.exp(-4);
  for (const [x, z, rx, rz, opacity] of discs) {
    const base = positions.length / 3;
    positions.push(x, 0.004, z);
    colors.push(0, 0, 0, opacity);
    for (let r = 1; r <= rings; r++) {
      const t = r / rings;
      const alpha = (opacity * (Math.exp(-4 * t * t) - floor)) / (1 - floor);
      for (let s = 0; s < segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        positions.push(x + Math.cos(a) * rx * t, 0.004, z + Math.sin(a) * rz * t);
        colors.push(0, 0, 0, Math.max(0, alpha));
      }
    }
    for (let s = 0; s < segments; s++) {
      const s1 = (s + 1) % segments;
      index.push(base, base + 1 + s1, base + 1 + s);
      for (let r = 1; r < rings; r++) {
        const a = base + 1 + (r - 1) * segments;
        const b = base + 1 + r * segments;
        index.push(a + s, a + s1, b + s1, a + s, b + s1, b + s);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
};

export const triangleCount = (geometry: THREE.BufferGeometry) =>
  (geometry.index ? geometry.index.count : geometry.attributes.position?.count ?? 0) / 3;

export const disposeAll = (geometries: Record<string, THREE.BufferGeometry>) => {
  Object.values(geometries).forEach((g) => g.dispose());
};
