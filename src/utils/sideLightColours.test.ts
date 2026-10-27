import { describe, expect, it } from 'vitest';
import { sideLightColours } from './sideLightColours';

describe('sideLightColours', () => {
  it('keeps the cool and warm kickers in the ballroom', () => {
    expect(sideLightColours('default-ballroom')).toEqual({ left: '#38bdf8', right: '#f59e0b' });
  });

  // Regression: plain white walls in an uploaded model came out blue on one
  // side and brown on the other
  it('uses white side lights in an uploaded venue', () => {
    expect(sideLightColours('custom-glb')).toEqual({ left: '#ffffff', right: '#ffffff' });
  });
});
