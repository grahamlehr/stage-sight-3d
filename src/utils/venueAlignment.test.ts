import { describe, expect, it } from 'vitest';
import {
  DECK_PROBE_DISTANCE,
  SCREEN_STANDOFF,
  alignScreenMesh,
  deckProbeOrigin,
  normaliseQuarterTurn,
  rotateAboutY,
} from './venueAlignment';

const Q = Math.PI / 2;

describe('normaliseQuarterTurn', () => {
  it.each([
    [0, 0],
    [Q, Q],
    [-Q, 3 * Q],
    [4 * Q, 0],
    [Q + 0.1, Q],
    [-Math.PI, Math.PI],
  ])('snaps %f to %f', (input, expected) => {
    expect(normaliseQuarterTurn(input)).toBeCloseTo(expected);
  });
});

describe('rotateAboutY', () => {
  it('matches three.js rotation.y: +X turns to -Z after a quarter turn', () => {
    const [x, y, z] = rotateAboutY([1, 2, 0], Q);
    expect(x).toBeCloseTo(0);
    expect(y).toBe(2);
    expect(z).toBeCloseTo(-1);
  });

  it('turns +X to +Z after three quarter turns', () => {
    const [x, , z] = rotateAboutY([1, 0, 0], -Q);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
  });
});

describe('alignScreenMesh', () => {
  it('leaves a wall that already faces +Z alone', () => {
    // 16m wide wall at z = -12, viewed from in front
    const a = alignScreenMesh([0, 3.4, -12], [16, 4.5, 0.2], [0, 4, 0]);
    expect(a.yawDelta).toBe(0);
    expect(a.center[0]).toBe(0);
    expect(a.center[1]).toBe(3.4);
    // Front face of the 0.2m-deep wall, plus the standoff
    expect(a.center[2]).toBeCloseTo(-12 + 0.1 + SCREEN_STANDOFF);
    expect(a.width).toBe(16);
    expect(a.height).toBe(4.5);
  });

  it('turns a wall facing +X so it faces +Z', () => {
    // Regression: a venue authored with the screen on the -X wall facing +X
    // left the +Z preview screen side-on to it, with no way to fix it.
    const a = alignScreenMesh([-10, 4, 1], [0.3, 4, 11], [5, 4, 0]);
    expect(a.yawDelta).toBeCloseTo(3 * Q);
    expect(a.width).toBe(11);
    expect(a.height).toBe(4);
    // The wall ends up behind the audience's origin, still at its height
    const [x, y, z] = a.center;
    expect(x).toBeCloseTo(-1);
    expect(y).toBe(4);
    expect(z).toBeCloseTo(-10 + 0.15 + SCREEN_STANDOFF);
  });

  it('turns a wall facing -X so it faces +Z', () => {
    const a = alignScreenMesh([10, 4, 0], [0.3, 4, 11], [-5, 4, 0]);
    expect(a.yawDelta).toBeCloseTo(Q);
    expect(a.width).toBe(11);
    expect(a.center[2]).toBeCloseTo(-10 + 0.15 + SCREEN_STANDOFF);
  });

  it('turns a wall facing -Z right round', () => {
    const a = alignScreenMesh([0, 4, 12], [16, 4, 0.2], [0, 4, 0]);
    expect(a.yawDelta).toBeCloseTo(Math.PI);
    expect(a.width).toBe(16);
    expect(a.center[2]).toBeCloseTo(-12 + 0.1 + SCREEN_STANDOFF);
  });

  it('puts the viewer in front of the turned wall', () => {
    const viewPoint: [number, number, number] = [5, 1.2, 0];
    const a = alignScreenMesh([-10, 4, 1], [0.3, 4, 11], viewPoint);
    const viewerAfter = rotateAboutY(viewPoint, a.yawDelta);
    expect(viewerAfter[2]).toBeGreaterThan(a.center[2]);
  });

  it('faces the viewer, not the far side of the model', () => {
    // Regression from a real venue: the LED wall at x = 5.13 faces -X towards
    // the chairs, but backstage space to x = 20 puts the model's bounding-box
    // centre behind the wall. Facing the viewer turns it the right way.
    const a = alignScreenMesh([5.13, 2.8, -14.31], [0, 4, 11], [-1, 1.2, -14]);
    expect(a.yawDelta).toBeCloseTo(Q);
    expect(a.width).toBe(11);
    expect(a.height).toBe(4);
    const [x, y, z] = a.center;
    expect(x).toBeCloseTo(-14.31);
    expect(y).toBe(2.8);
    expect(z).toBeCloseTo(-5.13 + SCREEN_STANDOFF);
    // A chair from the middle of the audience ends up in front of the screen
    expect(rotateAboutY([-1.15, 0, -14.37], a.yawDelta)[2]).toBeGreaterThan(z);
  });

  it('keeps the 1m minimum and 0.1m rounding', () => {
    const a = alignScreenMesh([0, 1, -5], [0.44, 0.2, 0.05], [0, 1, 0]);
    expect(a.width).toBe(1);
    expect(a.height).toBe(1);
  });
});

describe('deckProbeOrigin', () => {
  it('starts in front of a +Z wall at its centre height', () => {
    const center: [number, number, number] = [0, 3.4, -12];
    const a = alignScreenMesh(center, [16, 4.5, 0.2], [0, 1.2, 0]);
    const [x, y, z] = deckProbeOrigin(center, a);
    expect(x).toBe(0);
    expect(y).toBe(3.4);
    expect(z).toBeCloseTo(-12 + 0.1 + DECK_PROBE_DISTANCE);
  });

  it('starts on the audience side of a wall facing -X', () => {
    // The real Paris venue: LED wall at x = 5.13 facing the chairs at -X, with
    // a 0.3m deck running from x = 3 to x = 5 in front of it. The probe has to
    // land over that deck, not behind the wall.
    const center: [number, number, number] = [5.13, 2.8, -14.31];
    const a = alignScreenMesh(center, [0, 4, 11], [-1, 1.2, -14]);
    const [x, y, z] = deckProbeOrigin(center, a);
    expect(x).toBeCloseTo(5.13 - DECK_PROBE_DISTANCE);
    expect(x).toBeGreaterThan(3);
    expect(x).toBeLessThan(5);
    expect(y).toBe(2.8);
    expect(z).toBe(-14.31);
  });
});
