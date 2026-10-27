import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural geometry for the stage occlusion props: the lectern, and the
 * panel's tub chairs and side tables. The people are rigged models, posed in
 * PresenterSilhouette.
 *
 * Every prop is assembled from three.js primitives and merged into one
 * geometry per material slot, with per-part colors baked in as vertex colors,
 * which keeps the props cheap enough for WebXR on a Meta Quest.
 *
 * Conventions: meters, Y up, each prop faces +Z (toward the audience), and the
 * origin is on the floor under the prop's center.
 */

export type Vec3 = readonly [number, number, number];
export type ChairSlot = 'fabric' | 'metal';
export type LecternSlot = 'wood' | 'metal' | 'matte';
export type TableSlot = 'top' | 'metal' | 'glass';
export type SlotGeometries<S extends string> = Record<S, THREE.BufferGeometry>;

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
 * geometry. `root` is applied after each part's own matrix, so a whole prop
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

const shade = (color: THREE.ColorRepresentation, factor: number) => new THREE.Color(color).multiplyScalar(factor);

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

const SIDES = [-1, 1] as const;

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
