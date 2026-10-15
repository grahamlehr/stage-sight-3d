import { UvCropMode } from '../store/useStageStore';

export interface UvCropParams {
  cropMode: UvCropMode;
  captureWidth: number;
  captureHeight: number;
  screenWidth: number;
  screenHeight: number;
  manualRepeatY?: number;
  manualOffsetY?: number;
}

export interface UvCropResult {
  repeatX: number;
  repeatY: number;
  offsetX: number;
  offsetY: number;
  activeWidth: number;
  activeHeight: number;
}

export function computeUvCrop({
  cropMode,
  captureWidth,
  captureHeight,
  screenWidth,
  screenHeight,
  manualRepeatY = 1.0,
  manualOffsetY = 0.0,
}: UvCropParams): UvCropResult {
  const safeCapW = Math.max(1, captureWidth);
  const safeCapH = Math.max(1, captureHeight);
  const safeScrW = Math.max(0.1, screenWidth);
  const safeScrH = Math.max(0.1, screenHeight);

  const aCapture = safeCapW / safeCapH;
  const aScreen = safeScrW / safeScrH;

  let repeatX = 1.0;
  let repeatY = 1.0;
  let offsetX = 0.0;
  let offsetY = 0.0;

  switch (cropMode) {
    case 'auto-letterbox': {
      if (aScreen > aCapture) {
        // Ultra-wide screen: letterboxed top and bottom in 16:9 frame
        repeatY = aCapture / aScreen;
        offsetY = (1 - repeatY) / 2;
      } else {
        // Taller screen than capture: pillarboxed left and right
        repeatX = aScreen / aCapture;
        offsetX = (1 - repeatX) / 2;
      }
      break;
    }
    case 'top-aligned': {
      if (aScreen > aCapture) {
        repeatY = aCapture / aScreen;
        offsetY = 1 - repeatY;
      } else {
        repeatX = aScreen / aCapture;
        offsetX = 0;
      }
      break;
    }
    case 'fill-1-to-1': {
      repeatX = 1.0;
      repeatY = 1.0;
      offsetX = 0.0;
      offsetY = 0.0;
      break;
    }
    case 'manual': {
      repeatX = 1.0;
      repeatY = Math.max(0.05, Math.min(1.0, manualRepeatY));
      offsetX = 0.0;
      offsetY = Math.max(0.0, Math.min(1.0 - repeatY, manualOffsetY));
      break;
    }
  }

  const activeWidth = Math.round(safeCapW * repeatX);
  const activeHeight = Math.round(safeCapH * repeatY);

  return {
    repeatX,
    repeatY,
    offsetX,
    offsetY,
    activeWidth,
    activeHeight,
  };
}
