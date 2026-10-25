import type { StageScreen, UvCropMode } from '../store/useStageStore';
import { computeUvCrop } from './uvCropMath';

/** A rectangle of the source frame, in 0..1 texture coordinates (V runs bottom to top). */
export interface UvRegion {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

const FULL_FRAME: UvRegion = { u0: 0, u1: 1, v0: 0, v1: 1 };

/**
 * The split-role screens in left-to-right order, as the audience sees them.
 * Ids in `splitOrder` come first (ids that are gone, or no longer split, are
 * dropped); split screens it doesn't mention follow, by ascending X.
 * With a null `splitOrder` that is simply every split screen by ascending X.
 */
export function orderSplitScreens(
  screens: StageScreen[],
  splitOrder: string[] | null,
): StageScreen[] {
  const splits = screens.filter((s) => s.role === 'split');
  const byId = new Map(splits.map((s) => [s.id, s]));

  const ordered: StageScreen[] = [];
  const seen = new Set<string>();
  for (const id of splitOrder ?? []) {
    const screen = byId.get(id);
    if (screen && !seen.has(id)) {
      ordered.push(screen);
      seen.add(id);
    }
  }

  // Array.prototype.sort is stable, so equal X keeps list order
  const rest = splits.filter((s) => !seen.has(s.id)).sort((a, b) => a.position[0] - b.position[0]);
  return [...ordered, ...rest];
}

/**
 * Combined size in metres of the split group: widths added up, tallest height.
 * Null when no screen splits. The test pattern is drawn at this size.
 */
export function splitCanvasSize(screens: StageScreen[]): { width: number; height: number } | null {
  const splits = screens.filter((s) => s.role === 'split');
  if (splits.length === 0) return null;
  return {
    width: splits.reduce((sum, s) => sum + s.width, 0),
    height: Math.max(...splits.map((s) => s.height)),
  };
}

export interface ScreenRegionParams {
  screens: StageScreen[];
  splitOrder: string[] | null;
  /** Source frame in pixels, or null for a still (PDF, image, test pattern), which is shown whole. */
  frame: { width: number; height: number } | null;
  cropMode: UvCropMode;
  manualRepeatY?: number;
  manualOffsetY?: number;
}

/**
 * Which part of the source each screen shows.
 *
 * Repeat screens each show the whole source, cropped to their own shape.
 * Split screens share one crop worked out for the group's combined size, then
 * take contiguous slices of it in left-to-right order, each as wide as the
 * screen is (gaps between screens are ignored).
 */
export function computeScreenRegions({
  screens,
  splitOrder,
  frame,
  cropMode,
  manualRepeatY,
  manualOffsetY,
}: ScreenRegionParams): Record<string, UvRegion> {
  const baseFor = (width: number, height: number): UvRegion => {
    if (!frame) return FULL_FRAME;
    const crop = computeUvCrop({
      cropMode,
      captureWidth: frame.width,
      captureHeight: frame.height,
      screenWidth: width,
      screenHeight: height,
      manualRepeatY,
      manualOffsetY,
    });
    return {
      u0: crop.offsetX,
      u1: crop.offsetX + crop.repeatX,
      v0: crop.offsetY,
      v1: crop.offsetY + crop.repeatY,
    };
  };

  const regions: Record<string, UvRegion> = {};

  for (const screen of screens) {
    if (screen.role === 'repeat') regions[screen.id] = baseFor(screen.width, screen.height);
  }

  const group = orderSplitScreens(screens, splitOrder);
  const canvas = splitCanvasSize(group);
  if (canvas) {
    const base = baseFor(canvas.width, canvas.height);
    const baseWidth = base.u1 - base.u0;
    let before = 0;
    for (const screen of group) {
      regions[screen.id] = {
        u0: base.u0 + baseWidth * (before / canvas.width),
        u1: base.u0 + baseWidth * ((before + screen.width) / canvas.width),
        v0: base.v0,
        v1: base.v1,
      };
      before += screen.width;
    }
  }

  return regions;
}
