import { describe, expect, it } from 'vitest';
import { computeDiscasTelemetry } from './discasMath';

const deg = (d: number) => (d * Math.PI) / 180;

describe('computeDiscasTelemetry', () => {
  it('reports distance, D/H and zero off-axis for a centered seat', () => {
    const t = computeDiscasTelemetry({
      cameraPos: [0, 3.4, 2],
      screenPos: [0, 3.4, -12],
      screenRotation: [0, 0, 0],
      screenHeight: 4.5,
    });

    expect(t.viewingDistance).toBe(14);
    expect(t.dhRatio).toBe(3.11); // 14 / 4.5, rounded to 2dp
    expect(t.dhStatus).toBe('detail');
    expect(t.offAxisAngle).toBe(0);
    expect(t.angleStatus).toBe('optimal');
  });

  it('uses full 3D distance, including the height difference', () => {
    const t = computeDiscasTelemetry({
      cameraPos: [0, 0, 4],
      screenPos: [0, 3, 0],
      screenRotation: [0, 0, 0],
      screenHeight: 1,
    });

    expect(t.viewingDistance).toBe(5); // 3-4-5 triangle
  });

  describe('D/H status bands', () => {
    // Screen height 1 so D/H equals the on-axis distance exactly
    it.each([
      [3.99, 'detail'],
      [4.0, 'reading'],
      [6.0, 'reading'],
      [6.01, 'marginal'],
      [8.0, 'marginal'],
      [8.01, 'fail'],
    ] as const)('D/H %s → %s', (distance, status) => {
      const t = computeDiscasTelemetry({
        cameraPos: [0, 0, distance],
        screenPos: [0, 0, 0],
        screenRotation: [0, 0, 0],
        screenHeight: 1,
      });
      expect(t.dhStatus).toBe(status);
    });
  });

  describe('horizontal off-axis angle', () => {
    const angleFor = (cameraPos: [number, number, number], ry = 0) =>
      computeDiscasTelemetry({
        cameraPos,
        screenPos: [0, 0, 0],
        screenRotation: [0, ry, 0],
        screenHeight: 1,
      });

    it('is optimal under 30°', () => {
      const t = angleFor([1, 0, 10]); // atan(0.1) ≈ 5.7°
      expect(t.offAxisAngle).toBe(5.7);
      expect(t.angleStatus).toBe('optimal');
    });

    it('is steep between 30° and 45°', () => {
      const t = angleFor([10 * Math.sin(deg(40)), 0, 10 * Math.cos(deg(40))]);
      expect(t.offAxisAngle).toBe(40);
      expect(t.angleStatus).toBe('steep');
    });

    it('is extreme beyond 45°', () => {
      const t = angleFor([10, 0, 1]); // atan(10) ≈ 84.3°
      expect(t.offAxisAngle).toBe(84.3);
      expect(t.angleStatus).toBe('extreme');
    });

    it('ignores the vertical component', () => {
      // Same horizontal direction as the optimal case, but far above the screen
      expect(angleFor([1, 50, 10]).offAxisAngle).toBe(5.7);
    });

    it('measures relative to the rotated screen normal', () => {
      // Screen turned 90° to face +X: a seat on +X is on-axis, one on +Z is 90° off
      expect(angleFor([10, 0, 0], Math.PI / 2).offAxisAngle).toBe(0);
      expect(angleFor([0, 0, 10], Math.PI / 2).offAxisAngle).toBe(90);
    });

    it('reports 180° for a seat directly behind the screen', () => {
      const t = angleFor([0, 0, -10]);
      expect(t.offAxisAngle).toBe(180);
      expect(t.angleStatus).toBe('extreme');
    });

    it('treats a seat directly above the screen center as on-axis', () => {
      expect(angleFor([0, 10, 0]).offAxisAngle).toBe(0);
    });
  });

  it('clamps degenerate inputs instead of producing NaN or Infinity', () => {
    const t = computeDiscasTelemetry({
      cameraPos: [0, 0, 0],
      screenPos: [0, 0, 0],
      screenRotation: [0, 0, 0],
      screenHeight: 0,
    });

    expect(t.viewingDistance).toBe(0.1);
    expect(t.dhRatio).toBe(1); // 0.1 / 0.1
    expect(Number.isFinite(t.offAxisAngle)).toBe(true);
  });
});
