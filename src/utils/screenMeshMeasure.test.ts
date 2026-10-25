import { describe, expect, it } from 'vitest';
import { measureScreenMesh } from './screenMeshMeasure';
import { SCREEN_STANDOFF, type Vec3 } from './venueAlignment';

type Quad = [Vec3, Vec3, Vec3, Vec3];

/** Two triangles per quad; vertices go anticlockwise as seen from the side the normal points to. */
function tris(quads: Quad[]): Float32Array {
  const out: number[] = [];
  for (const [a, b, c, d] of quads) out.push(...a, ...b, ...c, ...a, ...c, ...d);
  return new Float32Array(out);
}

/** A flat panel centred at `c`, w by h, facing the direction at yaw (0 = +Z). */
function panel(c: Vec3, w: number, h: number, yaw: number, flip = false): Quad {
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const pt = (u: number, v: number): Vec3 => [c[0] + rx * u, c[1] + v, c[2] + rz * u];
  const q: Quad = [pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)];
  return flip ? [q[0], q[3], q[2], q[1]] : q;
}

describe('measureScreenMesh', () => {
  it('measures an axis-aligned panel facing +Z', () => {
    const m = measureScreenMesh(tris([panel([2, 3, -10], 12, 5, 0)]), [0, 1.6, 5]);
    expect(m.facing).toEqual([0, 0, 1]);
    expect(m.yaw).toBeCloseTo(0);
    expect(m.width).toBe(12);
    expect(m.height).toBe(5);
    expect(m.center[0]).toBeCloseTo(2);
    expect(m.center[1]).toBeCloseTo(3);
    expect(m.center[2]).toBeCloseTo(-10 + SCREEN_STANDOFF);
  });

  it('measures a panel turned 30 degrees', () => {
    const yaw = Math.PI / 6;
    const c: Vec3 = [-8, 3, -10];
    const m = measureScreenMesh(tris([panel(c, 6, 3, yaw)]), [0, 1.6, 5]);
    expect(m.yaw).toBeCloseTo(yaw);
    expect(m.facing[0]).toBeCloseTo(Math.sin(yaw));
    expect(m.facing[2]).toBeCloseTo(Math.cos(yaw));
    expect(m.width).toBe(6);
    expect(m.height).toBe(3);
    expect(m.center[0]).toBeCloseTo(c[0] + Math.sin(yaw) * SCREEN_STANDOFF);
    expect(m.center[2]).toBeCloseTo(c[2] + Math.cos(yaw) * SCREEN_STANDOFF);
  });

  it('sits on the front face of a thick box picked from the front', () => {
    // 10 x 4 x 2 box centred on the origin: front face at z = +1, back face at z = -1
    const [w, h, d] = [10, 4, 2];
    const x = w / 2, y = h / 2, z = d / 2;
    const quads: Quad[] = [
      [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], // front, +Z
      [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]], // back, -Z
      [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]], // right, +X
      [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], // left, -X
      [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]], // top
      [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], // bottom
    ];
    const m = measureScreenMesh(tris(quads), [0, 0, 20]);
    expect(m.facing).toEqual([0, 0, 1]);
    expect(m.yaw).toBeCloseTo(0);
    expect(m.width).toBe(10);
    expect(m.height).toBe(4);
    expect(m.center[2]).toBeCloseTo(1 + SCREEN_STANDOFF);
  });

  it('faces the viewer for a panel picked from behind', () => {
    // Normal points +Z but the viewer is at -Z
    const m = measureScreenMesh(tris([panel([0, 3, 0], 8, 4, 0)]), [0, 1.6, -15]);
    expect(m.facing[2]).toBeCloseTo(-1);
    expect(Math.abs(m.yaw)).toBeCloseTo(Math.PI);
    expect(m.center[2]).toBeCloseTo(-SCREEN_STANDOFF);
    expect(m.width).toBe(8);
  });

  it('raises tiny meshes to the 1 m minimum and rounds to 0.1 m', () => {
    const small = measureScreenMesh(tris([panel([0, 1, 0], 0.4, 0.3, 0)]), [0, 1, 5]);
    expect(small.width).toBe(1);
    expect(small.height).toBe(1);
    const odd = measureScreenMesh(tris([panel([0, 2, 0], 3.14, 2.06, 0)]), [0, 1, 5]);
    expect(odd.width).toBe(3.1);
    expect(odd.height).toBe(2.1);
  });
});
