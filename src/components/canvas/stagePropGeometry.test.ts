import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  LECTERN_HEIGHT,
  buildContactShadows,
  buildLectern,
  buildSideTables,
  buildTubChair,
  triangleCount,
  type SlotGeometries,
} from './stagePropGeometry';

const boundsOf = (slots: SlotGeometries<string>) => {
  const box = new THREE.Box3();
  Object.values(slots).forEach((g) => {
    g.computeBoundingBox();
    if (g.boundingBox && !g.boundingBox.isEmpty()) box.union(g.boundingBox);
  });
  return box;
};

const totalTriangles = (slots: SlotGeometries<string>) =>
  Object.values(slots).reduce((sum, g) => sum + triangleCount(g), 0);

const expectWellFormed = (slots: SlotGeometries<string>) => {
  Object.values(slots).forEach((g) => {
    expect(g.index).not.toBeNull();
    expect(g.attributes.normal).toBeDefined();
    expect(g.attributes.color.count).toBe(g.attributes.position.count);
    expect(Array.from(g.attributes.position.array as Float32Array).every(Number.isFinite)).toBe(true);
    expect(Array.from(g.attributes.normal.array as Float32Array).every(Number.isFinite)).toBe(true);
  });
};

describe('furniture', () => {
  it('builds a tub chair with a 0.47m seat inside a 0.82m footprint', () => {
    const chair = buildTubChair();
    expectWellFormed(chair);
    const bounds = boundsOf(chair);
    expect(bounds.max.y).toBeCloseTo(0.8, 2);
    expect(bounds.max.x - bounds.min.x).toBeLessThan(0.82);
    expect(totalTriangles(chair)).toBeLessThan(5000);
  });

  it('builds a 1.15m lectern with a 0.62m by 0.5m body', () => {
    const lectern = buildLectern();
    expectWellFormed(lectern);
    const wood = lectern.wood;
    wood.computeBoundingBox();
    const body = wood.boundingBox!;
    expect(body.max.y).toBeGreaterThan(LECTERN_HEIGHT - 0.005);
    expect(body.max.y).toBeLessThan(LECTERN_HEIGHT + 0.02);
    expect(body.max.x - body.min.x).toBeCloseTo(0.62, 1);
    expect(body.max.z - body.min.z).toBeLessThan(0.56);
    // Front panel faces the audience: the front is the tall edge
    expect(body.max.z).toBeGreaterThan(0.2);
    expect(totalTriangles(lectern)).toBeLessThan(4000);
  });

  it('places one side table per position', () => {
    const tables = buildSideTables([
      [-1, 0, 0],
      [1, 0, 0],
    ]);
    expectWellFormed(tables);
    const bounds = boundsOf(tables);
    expect(bounds.min.x).toBeLessThan(-1.2);
    expect(bounds.max.x).toBeGreaterThan(1.2);
  });

  it('fades contact shadows to transparent at the rim', () => {
    const shadow = buildContactShadows([[0, 0, 0.5, 0.5, 0.4]]);
    const alpha = shadow.attributes.color;
    expect(alpha.itemSize).toBe(4);
    expect(alpha.getW(0)).toBeCloseTo(0.4, 5);
    expect(alpha.getW(alpha.count - 1)).toBeCloseTo(0, 5);
  });
});

describe('four-person panel cost', () => {
  // The panelists are the Quaternius people models, about 6,600 triangles each
  const PERSON_TRIANGLES = 6700;

  it('stays within a Quest-friendly triangle budget', () => {
    const chairs = totalTriangles(buildTubChair()) * 4;
    const tables = totalTriangles(buildSideTables([[-1.75, 0, 0.15], [1.75, 0, 0.15]]));
    expect(PERSON_TRIANGLES * 4 + chairs + tables).toBeLessThan(60000);
  });
});
