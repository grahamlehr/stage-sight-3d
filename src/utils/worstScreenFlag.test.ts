import { describe, expect, it } from 'vitest';
import { describeWorstScreen } from './worstScreenFlag';

const base = { screenId: 'a', screenName: 'Left screen' };

describe('describeWorstScreen', () => {
  it('returns null when nothing is worse', () => {
    expect(describeWorstScreen(null)).toBeNull();
    expect(describeWorstScreen(undefined)).toBeNull();
  });

  it('shows the D/H band when it is the worse one', () => {
    expect(describeWorstScreen({ ...base, dhStatus: 'marginal', angleStatus: 'optimal' })).toEqual({
      text: 'Worst: Left screen · Marginal',
      level: 'warn',
    });
  });

  it('shows the angle band when it is the worse one', () => {
    expect(describeWorstScreen({ ...base, dhStatus: 'reading', angleStatus: 'extreme' })).toEqual({
      text: 'Worst: Left screen · Extreme',
      level: 'fail',
    });
  });

  it('prefers D/H on a tie', () => {
    expect(describeWorstScreen({ ...base, dhStatus: 'marginal', angleStatus: 'steep' })?.text).toBe(
      'Worst: Left screen · Marginal',
    );
  });
});
