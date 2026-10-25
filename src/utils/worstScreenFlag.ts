import type { WorstScreenTelemetry } from '../store/useStageStore';

export type FlagLevel = 'go' | 'warn' | 'fail';

export interface WorstScreenFlag {
  /** For example "Worst: Left screen · Marginal" */
  text: string;
  level: FlagLevel;
}

const DH_LABEL: Record<WorstScreenTelemetry['dhStatus'], { label: string; severity: number }> = {
  detail: { label: 'Detail', severity: 0 },
  reading: { label: 'Reading', severity: 0 },
  marginal: { label: 'Marginal', severity: 1 },
  fail: { label: 'Too far', severity: 2 },
};

const ANGLE_LABEL: Record<WorstScreenTelemetry['angleStatus'], { label: string; severity: number }> = {
  optimal: { label: 'On-axis', severity: 0 },
  steep: { label: 'Steep', severity: 1 },
  extreme: { label: 'Extreme', severity: 2 },
};

/**
 * One short line for the screen that reads worst from the current seat.
 * Shows whichever of its D/H or angle bands is the worse (D/H on a tie).
 */
export function describeWorstScreen(worst: WorstScreenTelemetry | null | undefined): WorstScreenFlag | null {
  if (!worst) return null;
  const dh = DH_LABEL[worst.dhStatus];
  const angle = ANGLE_LABEL[worst.angleStatus];
  const pick = angle.severity > dh.severity ? angle : dh;
  const level: FlagLevel = pick.severity >= 2 ? 'fail' : pick.severity === 1 ? 'warn' : 'go';
  return { text: `Worst: ${worst.screenName} · ${pick.label}`, level };
}
