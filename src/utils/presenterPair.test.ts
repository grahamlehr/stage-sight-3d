import { describe, expect, it } from 'vitest';
import { PAIR_FIGURE_HALF_WIDTH, PRESENTER_PAIR, fitToHeight, pairHalfWidth } from './presenterPair';

describe('fitToHeight', () => {
  it('scales a model to the target height and stands it on the floor', () => {
    // A 1.856m model whose feet are 0.07m below its origin
    const { scale, lift } = fitToHeight(-0.07, 1.786, 1.8);
    expect(1.856 * scale).toBeCloseTo(1.8, 6);
    expect(-0.07 * scale + lift).toBeCloseTo(0, 6);
    expect(1.786 * scale + lift).toBeCloseTo(1.8, 6);
  });

  it('leaves a flat or empty model at its own size', () => {
    expect(fitToHeight(0.2, 0.2, 1.8).scale).toBe(1);
    expect(fitToHeight(Infinity, -Infinity, 1.8).scale).toBe(1);
  });
});

describe('PRESENTER_PAIR', () => {
  it('is a 1.8m man and a 1.68m woman', () => {
    expect(PRESENTER_PAIR.map((f) => f.height)).toEqual([1.8, 1.68]);
  });

  it('stands the two figures apart without overlapping', () => {
    const [left, right] = PRESENTER_PAIR;
    expect(right.x - left.x).toBeGreaterThanOrEqual(2 * PAIR_FIGURE_HALF_WIDTH);
  });

  it('is centred on the presenter offset', () => {
    expect(PRESENTER_PAIR.reduce((sum, f) => sum + f.x, 0)).toBeCloseTo(0, 6);
    expect(pairHalfWidth()).toBeCloseTo(0.66, 6);
  });
});
