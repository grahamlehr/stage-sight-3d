import { SCREEN_STANDOFF, type Vec3 } from './venueAlignment';

export interface ScreenMeshMeasurement {
  /** Where to put the preview screen: the mesh's front face plus the standoff. */
  center: Vec3;
  /** Width in metres along the mesh's face, rounded to 0.1m, minimum 1m. */
  width: number;
  /** Height in metres, rounded to 0.1m, minimum 1m. */
  height: number;
  /** Rotation about Y that turns a +Z-facing plane to face the audience side. */
  yaw: number;
  /** Horizontal unit vector the mesh faces, towards the view point. */
  facing: Vec3;
}

const toTenth = (v: number) => Math.max(1, Math.round(v * 10) / 10);

/**
 * Works out where a flat preview screen should go to cover a picked mesh, at
 * whatever angle the mesh is turned.
 *
 * Takes the mesh's triangles in world space (x, y, z for each of three
 * vertices). Each triangle's normal is flipped to point towards `viewPoint`
 * before the area-weighted average, so a thick box (whose front and back faces
 * would otherwise cancel) and a single-sided panel picked from behind both
 * work. Only the horizontal part of the average counts: the preview screen
 * only turns about Y.
 */
export function measureScreenMesh(worldTriangles: Float32Array, viewPoint: Vec3): ScreenMeshMeasurement {
  const t = worldTriangles;
  const triangleCount = Math.floor(t.length / 9);

  let nx = 0;
  let nz = 0;
  for (let i = 0; i < triangleCount; i++) {
    const o = i * 9;
    const e1x = t[o + 3] - t[o];
    const e1y = t[o + 4] - t[o + 1];
    const e1z = t[o + 5] - t[o + 2];
    const e2x = t[o + 6] - t[o];
    const e2y = t[o + 7] - t[o + 1];
    const e2z = t[o + 8] - t[o + 2];
    // Cross product length is twice the triangle's area, which weights the sum
    let tx = e1y * e2z - e1z * e2y;
    const ty = e1z * e2x - e1x * e2z;
    let tz = e1x * e2y - e1y * e2x;
    const cx = (t[o] + t[o + 3] + t[o + 6]) / 3;
    const cy = (t[o + 1] + t[o + 4] + t[o + 7]) / 3;
    const cz = (t[o + 2] + t[o + 5] + t[o + 8]) / 3;
    const towards = tx * (viewPoint[0] - cx) + ty * (viewPoint[1] - cy) + tz * (viewPoint[2] - cz);
    if (towards < 0) {
      tx = -tx;
      tz = -tz;
    }
    nx += tx;
    nz += tz;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 2 < t.length; i += 3) {
    minX = Math.min(minX, t[i]); maxX = Math.max(maxX, t[i]);
    minY = Math.min(minY, t[i + 1]); maxY = Math.max(maxY, t[i + 1]);
    minZ = Math.min(minZ, t[i + 2]); maxZ = Math.max(maxZ, t[i + 2]);
  }
  if (!Number.isFinite(minX)) {
    return { center: [0, 0, 0], width: 1, height: 1, yaw: 0, facing: [0, 0, 1] };
  }

  let len = Math.hypot(nx, nz);
  if (len < 1e-9) {
    // A flat floor or ceiling has no horizontal facing: look towards the viewer instead
    nx = viewPoint[0] - (minX + maxX) / 2;
    nz = viewPoint[2] - (minZ + maxZ) / 2;
    len = Math.hypot(nx, nz);
  }
  const fx = len < 1e-9 ? 0 : nx / len;
  const fz = len < 1e-9 ? 1 : nz / len;

  // right = up × facing, so a +Z-facing screen has right = +X
  const rx = fz;
  const rz = -fx;
  let minR = Infinity, maxR = -Infinity, maxD = -Infinity;
  for (let i = 0; i + 2 < t.length; i += 3) {
    const r = t[i] * rx + t[i + 2] * rz;
    const d = t[i] * fx + t[i + 2] * fz;
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    maxD = Math.max(maxD, d);
  }

  // Sit on the front face (not the middle of a thick mesh), pushed out by the standoff
  const midR = (minR + maxR) / 2;
  const depth = maxD + SCREEN_STANDOFF;
  const clean = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);
  return {
    center: [
      clean(rx * midR + fx * depth),
      (minY + maxY) / 2,
      clean(rz * midR + fz * depth),
    ],
    width: toTenth(maxR - minR),
    height: toTenth(maxY - minY),
    yaw: Math.atan2(fx, fz),
    facing: [fx, 0, fz],
  };
}
