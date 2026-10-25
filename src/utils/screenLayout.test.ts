import { describe, expect, it } from 'vitest';
import type { StageScreen } from '../store/useStageStore';
import { computeScreenRegions, orderSplitScreens, splitCanvasSize } from './screenLayout';

const screen = (id: string, over: Partial<StageScreen> = {}): StageScreen => ({
  id,
  name: id,
  width: 8,
  height: 4.5,
  position: [0, 3, -12],
  rotation: [0, 0, 0],
  role: 'split',
  boundMeshName: null,
  ...over,
});

const left = screen('left', { position: [-9, 3, -12] });
const centre = screen('centre', { position: [0, 3, -12] });
const right = screen('right', { position: [9, 3, -12] });

describe('orderSplitScreens', () => {
  it('orders by ascending X when automatic, and ignores repeat screens', () => {
    const repeat = screen('rep', { role: 'repeat', position: [-20, 3, -12] });
    const ids = orderSplitScreens([right, repeat, left, centre], null).map((s) => s.id);
    expect(ids).toEqual(['left', 'centre', 'right']);
  });

  it('puts an explicit order first', () => {
    const ids = orderSplitScreens([left, centre, right], ['right', 'left', 'centre']).map((s) => s.id);
    expect(ids).toEqual(['right', 'left', 'centre']);
  });

  it('drops stale ids and appends screens the order does not mention by X', () => {
    const ids = orderSplitScreens([left, centre, right], ['gone', 'right']).map((s) => s.id);
    expect(ids).toEqual(['right', 'left', 'centre']);
  });

  it('drops an explicit id whose screen is no longer a split', () => {
    const asRepeat = { ...centre, role: 'repeat' as const };
    const ids = orderSplitScreens([left, asRepeat, right], ['centre', 'right']).map((s) => s.id);
    expect(ids).toEqual(['right', 'left']);
  });
});

describe('splitCanvasSize', () => {
  it('adds the widths and takes the tallest height', () => {
    expect(splitCanvasSize([left, screen('b', { width: 4, height: 6 })])).toEqual({ width: 12, height: 6 });
  });

  it('is null with no split screens', () => {
    expect(splitCanvasSize([screen('r', { role: 'repeat' })])).toBeNull();
    expect(splitCanvasSize([])).toBeNull();
  });
});

describe('computeScreenRegions', () => {
  const base = { splitOrder: null, cropMode: 'auto-letterbox' as const };

  it('letterboxes a 32:9 video on a repeating 16:9 screen', () => {
    // Screen is narrower than the video, so the sides are cropped: pillarbox crop of U
    const r = computeScreenRegions({
      ...base,
      screens: [screen('a', { role: 'repeat', width: 8, height: 4.5 })],
      frame: { width: 3840, height: 1080 },
    }).a;
    expect(r.v0).toBeCloseTo(0);
    expect(r.v1).toBeCloseTo(1);
    expect(r.u1 - r.u0).toBeCloseTo(0.5);
    expect(r.u0).toBeCloseTo(0.25);
  });

  it('letterboxes top and bottom when the screen is wider than the video', () => {
    const r = computeScreenRegions({
      ...base,
      screens: [screen('a', { role: 'repeat', width: 16, height: 4.5 })],
      frame: { width: 1920, height: 1080 },
    }).a;
    expect(r.u0).toBe(0);
    expect(r.u1).toBe(1);
    expect(r.v1 - r.v0).toBeCloseTo((16 / 9) / (16 / 4.5));
    expect(r.v0).toBeCloseTo((1 - (r.v1 - r.v0)) / 2);
  });

  it('gives each repeat screen its own crop', () => {
    const regions = computeScreenRegions({
      ...base,
      screens: [
        screen('wide', { role: 'repeat', width: 16, height: 4.5 }),
        screen('std', { role: 'repeat', width: 16, height: 9 }),
      ],
      frame: { width: 1920, height: 1080 },
    });
    expect(regions.wide.v1 - regions.wide.v0).toBeLessThan(1);
    expect(regions.std).toEqual({ u0: 0, u1: 1, v0: 0, v1: 1 });
  });

  it('splits equal screens into exact thirds when the source matches the combined shape', () => {
    const regions = computeScreenRegions({
      ...base,
      screens: [left, centre, right],
      frame: { width: 5760, height: 1080 },
    });
    // Combined 24 x 4.5 = 16:3 = 5.33:1; source 5.33:1, so full frame, exact thirds
    expect(regions.left.u0).toBeCloseTo(0);
    expect(regions.left.u1).toBeCloseTo(1 / 3);
    expect(regions.centre.u0).toBeCloseTo(1 / 3);
    expect(regions.centre.u1).toBeCloseTo(2 / 3);
    expect(regions.right.u1).toBeCloseTo(1);
    expect(regions.centre.v0).toBeCloseTo(0);
    expect(regions.centre.v1).toBeCloseTo(1);
  });

  it('crops a 48:9 combined split from a 16:9 frame with a shared letterbox', () => {
    const wide = (id: string, x: number) => screen(id, { width: 16, height: 3, position: [x, 3, -12] });
    const regions = computeScreenRegions({
      ...base,
      screens: [wide('a', -20), wide('b', 0), wide('c', 20)],
      frame: { width: 1920, height: 1080 },
    });
    const vSpan = (16 / 9) / (48 / 3);
    for (const id of ['a', 'b', 'c']) {
      expect(regions[id].v1 - regions[id].v0).toBeCloseTo(vSpan);
      expect(regions[id].v0).toBeCloseTo((1 - vSpan) / 2);
    }
    expect(regions.a.u1).toBeCloseTo(regions.b.u0);
    expect(regions.b.u1).toBeCloseTo(regions.c.u0);
    expect(regions.a.u0).toBe(0);
    expect(regions.c.u1).toBeCloseTo(1);
  });

  it('slices unequal widths in proportion', () => {
    const regions = computeScreenRegions({
      ...base,
      screens: [
        screen('a', { width: 2, height: 1, position: [-5, 3, -12] }),
        screen('b', { width: 6, height: 1, position: [0, 3, -12] }),
        screen('c', { width: 4, height: 1, position: [5, 3, -12] }),
      ],
      frame: null,
    });
    expect(regions.a.u0).toBeCloseTo(0);
    expect(regions.a.u1).toBeCloseTo(2 / 12);
    expect(regions.b.u0).toBeCloseTo(2 / 12);
    expect(regions.b.u1).toBeCloseTo(8 / 12);
    expect(regions.c.u0).toBeCloseTo(8 / 12);
    expect(regions.c.u1).toBeCloseTo(1);
  });

  it('gives exact thirds of a still, with no letterbox', () => {
    const regions = computeScreenRegions({ ...base, screens: [left, centre, right], frame: null });
    expect(regions.left).toEqual({ u0: 0, u1: 1 / 3, v0: 0, v1: 1 });
    expect(regions.centre.u0).toBeCloseTo(1 / 3);
    expect(regions.centre.u1).toBeCloseTo(2 / 3);
    expect(regions.right.u1).toBeCloseTo(1);
    expect(regions.right.v1).toBe(1);
  });

  it('follows an explicit split order', () => {
    const regions = computeScreenRegions({
      screens: [left, centre, right],
      splitOrder: ['right', 'centre', 'left'],
      cropMode: 'auto-letterbox',
      frame: null,
    });
    expect(regions.right.u0).toBeCloseTo(0);
    expect(regions.left.u1).toBeCloseTo(1);
  });

  it('mixes repeat and split screens', () => {
    const rep = screen('rep', { role: 'repeat' });
    const regions = computeScreenRegions({ ...base, screens: [left, rep, right], frame: null });
    expect(regions.rep).toEqual({ u0: 0, u1: 1, v0: 0, v1: 1 });
    expect(regions.left.u1).toBeCloseTo(0.5);
    expect(regions.right.u0).toBeCloseTo(0.5);
  });
});
