/** One of the two standing presenters: a model in `public/models/`, placed beside the other. */
export interface PairFigure {
  /** File name in `public/models/`. */
  file: string;
  /** Standing height the model is scaled to, in metres. */
  height: number;
  /** Offset along the stage from the pair's centre, in metres. */
  x: number;
  /** Turn about Y, in radians; positive turns towards stage left (+X). */
  yaw: number;
}

/**
 * A man and a woman standing side by side, each turned slightly in towards
 * the other. The presenter offset on the Screen tab places the pair's centre.
 */
export const PRESENTER_PAIR: readonly PairFigure[] = [
  { file: 'business-man.glb', height: 1.8, x: -0.36, yaw: 0.15 },
  { file: 'business-woman.glb', height: 1.68, x: 0.36, yaw: -0.15 },
];

/** Half the width of one standing figure, shoulders and hands included. */
export const PAIR_FIGURE_HALF_WIDTH = 0.3;

/** Half the pair's width across the stage, for keeping it clear of the other props. */
export function pairHalfWidth(pair: readonly PairFigure[] = PRESENTER_PAIR): number {
  return Math.max(...pair.map((f) => Math.abs(f.x))) + PAIR_FIGURE_HALF_WIDTH;
}

/**
 * Scale and lift that stand a model of the given vertical extent on y = 0 at
 * the target height. An empty or flat extent is left at its own size.
 */
export function fitToHeight(minY: number, maxY: number, targetHeight: number): { scale: number; lift: number } {
  const height = maxY - minY;
  const scale = height > 0 ? targetHeight / height : 1;
  return { scale, lift: -minY * scale };
}
