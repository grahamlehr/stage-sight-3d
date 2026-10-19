import { describe, expect, it } from 'vitest';
import { computeUvCrop, UvCropParams } from './uvCropMath';

// 16:9 capture on a 32:9 screen: the screen is twice as wide as the source
const WIDE_SCREEN = {
  captureWidth: 1920,
  captureHeight: 1080,
  screenWidth: 16,
  screenHeight: 4.5,
};

// 32:9 capture on a 16:9 screen: the source is twice as wide as the screen
const WIDE_CAPTURE = {
  captureWidth: 3840,
  captureHeight: 1080,
  screenWidth: 8,
  screenHeight: 4.5,
};

const crop = (params: UvCropParams) => computeUvCrop(params);

describe('computeUvCrop', () => {
  describe('auto-letterbox', () => {
    it('crops a wide screen vertically, centered', () => {
      const r = crop({ cropMode: 'auto-letterbox', ...WIDE_SCREEN });
      expect(r.repeatX).toBe(1);
      expect(r.offsetX).toBe(0);
      expect(r.repeatY).toBeCloseTo(0.5);
      expect(r.offsetY).toBeCloseTo(0.25);
      expect(r.activeWidth).toBe(1920);
      expect(r.activeHeight).toBe(540);
    });

    it('crops a wide capture horizontally, centered', () => {
      const r = crop({ cropMode: 'auto-letterbox', ...WIDE_CAPTURE });
      expect(r.repeatX).toBeCloseTo(0.5);
      expect(r.offsetX).toBeCloseTo(0.25);
      expect(r.repeatY).toBe(1);
      expect(r.offsetY).toBe(0);
      expect(r.activeWidth).toBe(1920);
      expect(r.activeHeight).toBe(1080);
    });

    it('leaves the frame untouched when the aspects match', () => {
      const r = crop({
        cropMode: 'auto-letterbox',
        captureWidth: 1920,
        captureHeight: 1080,
        screenWidth: 16,
        screenHeight: 9,
      });
      expect(r.repeatX).toBeCloseTo(1);
      expect(r.repeatY).toBe(1);
      expect(r.offsetX).toBeCloseTo(0);
      expect(r.offsetY).toBe(0);
    });
  });

  describe('top-aligned', () => {
    it('keeps the top of the capture on a wide screen', () => {
      // Texture V runs bottom-to-top, so "top" means the window ends at V = 1
      const r = crop({ cropMode: 'top-aligned', ...WIDE_SCREEN });
      expect(r.repeatY).toBeCloseTo(0.5);
      expect(r.offsetY).toBeCloseTo(0.5);
      expect(r.offsetY + r.repeatY).toBeCloseTo(1);
    });

    it('still centers a horizontal crop, since it only anchors vertically', () => {
      // Regression: this branch used offsetX = 0, cutting the right edge only
      const r = crop({ cropMode: 'top-aligned', ...WIDE_CAPTURE });
      expect(r.repeatX).toBeCloseTo(0.5);
      expect(r.offsetX).toBeCloseTo(0.25);
      expect(r.repeatY).toBe(1);
      expect(r.offsetY).toBe(0);
    });
  });

  it('fill-1-to-1 always shows the full frame', () => {
    const r = crop({ cropMode: 'fill-1-to-1', ...WIDE_SCREEN });
    expect(r).toMatchObject({ repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0 });
  });

  describe('manual', () => {
    it('defaults to the full frame when no manual values are given', () => {
      const r = crop({ cropMode: 'manual', ...WIDE_SCREEN });
      expect(r).toMatchObject({ repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0 });
    });

    it.each([
      [2, 1],
      [0, 0.05],
      [0.4, 0.4],
    ])('clamps repeatY %s → %s', (input, expected) => {
      const r = crop({ cropMode: 'manual', ...WIDE_SCREEN, manualRepeatY: input });
      expect(r.repeatY).toBe(expected);
    });

    it('keeps the offset inside the remaining window', () => {
      const r = crop({
        cropMode: 'manual',
        ...WIDE_SCREEN,
        manualRepeatY: 0.5,
        manualOffsetY: 0.9,
      });
      expect(r.offsetY).toBe(0.5); // capped at 1 - repeatY
    });

    it('forces the offset to 0 when the window is the full frame', () => {
      const r = crop({
        cropMode: 'manual',
        ...WIDE_SCREEN,
        manualRepeatY: 1,
        manualOffsetY: 0.5,
      });
      expect(r.offsetY).toBe(0);
    });

    it('never goes below a zero offset', () => {
      const r = crop({
        cropMode: 'manual',
        ...WIDE_SCREEN,
        manualRepeatY: 0.5,
        manualOffsetY: -1,
      });
      expect(r.offsetY).toBe(0);
    });
  });

  it('survives zero-sized inputs without producing NaN', () => {
    const r = crop({
      cropMode: 'auto-letterbox',
      captureWidth: 0,
      captureHeight: 0,
      screenWidth: 0,
      screenHeight: 0,
    });
    for (const value of Object.values(r)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
