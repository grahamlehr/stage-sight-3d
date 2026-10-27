/** The two people models in `public/models/`, used standing and seated. */
export type FigureKind = 'man' | 'woman';

export interface FigureModel {
  /** File name in `public/models/`. */
  file: string;
  /** Standing height the model is scaled to, in metres. */
  height: number;
}

export const FIGURE_MODELS: Readonly<Record<FigureKind, FigureModel>> = {
  man: { file: 'business-man.glb', height: 1.8 },
  woman: { file: 'business-woman.glb', height: 1.68 },
};

/** Load order of the models; components index loaded models by this. */
export const FIGURE_KINDS: readonly FigureKind[] = ['man', 'woman'];

/** One of the two standing presenters, placed beside the other. */
export interface PairFigure {
  kind: FigureKind;
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
  { kind: 'man', x: -0.36, yaw: 0.15 },
  { kind: 'woman', x: 0.36, yaw: -0.15 },
];

/** Who sits in each of the panel's four chairs, left to right as the audience sees them. */
export const PANEL_KINDS: readonly FigureKind[] = ['man', 'woman', 'man', 'woman'];

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
