import { describe, expect, it } from 'vitest';
import {
  defaultCutHeight,
  firstHitBelow,
  normaliseYaw,
  planFrame,
  seatedLookTarget,
  yawBetween,
} from './floorPlan';

describe('yawBetween', () => {
  it('is 0 towards +Z and π towards −Z', () => {
    expect(yawBetween([0, 0, 0], [0, 5, 3])).toBeCloseTo(0);
    expect(Math.abs(yawBetween([0, 0, 0], [0, 0, -3]))).toBeCloseTo(Math.PI);
  });

  it('is π/2 towards +X and −π/2 towards −X, ignoring height', () => {
    expect(yawBetween([1, 0, 1], [4, 9, 1])).toBeCloseTo(Math.PI / 2);
    expect(yawBetween([1, 0, 1], [-2, 0, 1])).toBeCloseTo(-Math.PI / 2);
  });
});

describe('normaliseYaw', () => {
  it('wraps into [0, 2π)', () => {
    expect(normaliseYaw(-Math.PI / 2)).toBeCloseTo(1.5 * Math.PI);
    expect(normaliseYaw(2 * Math.PI)).toBeCloseTo(0);
    expect(normaliseYaw(5 * Math.PI)).toBeCloseTo(Math.PI);
  });
});

describe('seatedLookTarget', () => {
  it('looks exactly at the screen centre when aimed at the screen', () => {
    const eye: [number, number, number] = [3, 1.2, 10];
    const screen: [number, number, number] = [-1, 3.4, -12];
    const target = seatedLookTarget(eye, yawBetween(eye, screen), screen);
    expect(target[0]).toBeCloseTo(screen[0]);
    expect(target[1]).toBeCloseTo(screen[1]);
    expect(target[2]).toBeCloseTo(screen[2]);
  });

  it('turns the target with the yaw at the screen height', () => {
    const target = seatedLookTarget([0, 1.2, 0], Math.PI / 2, [0, 3, -10]);
    expect(target[0]).toBeCloseTo(10);
    expect(target[1]).toBe(3);
    expect(target[2]).toBeCloseTo(0);
  });

  it('keeps at least 1m of reach when standing at the screen', () => {
    const target = seatedLookTarget([0, 1.2, -12], 0, [0, 3.4, -12]);
    expect(target[2]).toBeCloseTo(-11);
  });
});

describe('defaultCutHeight', () => {
  it('is 2.5m above the lowest point', () => {
    expect(defaultCutHeight({ min: [0, 1, 0], max: [1, 10, 1] })).toBe(3.5);
  });

  it('is clamped to the top of a low model', () => {
    expect(defaultCutHeight({ min: [0, 0, 0], max: [1, 1.8, 1] })).toBe(1.8);
  });
});

describe('planFrame', () => {
  it('centres on the bounds in X and Z and fits the tighter axis', () => {
    const { center, zoom } = planFrame({ min: [-10, 0, -20], max: [10, 8, 20] }, 1000, 800);
    expect(center).toEqual([0, 4, 0]);
    // 20m wide into 1000px = 50 px/m; 40m deep into 800px = 20 px/m; 0.9 margin
    expect(zoom).toBeCloseTo(0.9 * 20);
  });

  it('uses the width when the venue is wider than the viewport allows', () => {
    const { zoom } = planFrame({ min: [0, 0, 0], max: [100, 5, 10] }, 1000, 800, 1);
    expect(zoom).toBeCloseTo(10);
  });

  it('stays finite for zero-size bounds', () => {
    const { center, zoom } = planFrame({ min: [2, 0, 3], max: [2, 0, 3] }, 1000, 800);
    expect(center).toEqual([2, 0, 3]);
    expect(Number.isFinite(zoom)).toBe(true);
    expect(zoom).toBeGreaterThan(0);
  });
});

describe('firstHitBelow', () => {
  const hits = [{ point: { y: 6 } }, { point: { y: 3 } }, { point: { y: 0.2 } }];

  it('skips hits above the cut, such as a ceiling', () => {
    expect(firstHitBelow(hits, 2.5)).toBe(hits[2]);
    expect(firstHitBelow(hits, 3)).toBe(hits[1]);
  });

  it('returns undefined when everything is above the cut', () => {
    expect(firstHitBelow(hits, 0)).toBeUndefined();
    expect(firstHitBelow([], 5)).toBeUndefined();
  });
});
