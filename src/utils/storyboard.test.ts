import { describe, expect, it } from 'vitest';
import {
  aimAt,
  captureWarnings,
  directionFromYawPitch,
  fovModeForFov,
  storyboardShots,
  viewPitchTowardsScreen,
  yawPitchFromDirection,
} from './storyboard';
import { seatedLookTarget } from './floorPlan';
import { SEAT_PRESETS, createDefaultScreen } from '../store/useStageStore';
import type { ExtraShot, CustomSeatView } from '../store/useStageStore';

describe('aimAt and directions', () => {
  it('uses yaw 0 for +Z and positive pitch for up', () => {
    expect(aimAt([0, 1, 0], [0, 1, 5])).toEqual({ yaw: 0, pitch: 0 });
    const up = aimAt([0, 0, 0], [0, 3, 3]);
    expect(up.pitch).toBeCloseTo(Math.PI / 4);
    expect(aimAt([0, 0, 0], [4, 0, 0]).yaw).toBeCloseTo(Math.PI / 2);
  });

  it('round-trips yaw and pitch through a direction', () => {
    for (const [yaw, pitch] of [[0.3, 0.2], [-2.5, -0.6], [3, 0.9]] as const) {
      const dir = directionFromYawPitch(yaw, pitch);
      expect(Math.hypot(...dir)).toBeCloseTo(1);
      const back = yawPitchFromDirection(dir);
      expect(back.yaw).toBeCloseTo(yaw);
      expect(back.pitch).toBeCloseTo(pitch);
    }
  });
});

describe('fovModeForFov', () => {
  it('maps 25 to eye-focus and 50 to room-context', () => {
    expect(fovModeForFov(25)).toBe('eye-focus');
    expect(fovModeForFov(37.5)).toBe('eye-focus');
    expect(fovModeForFov(37.6)).toBe('room-context');
    expect(fovModeForFov(50)).toBe('room-context');
  });
});

describe('viewPitchTowardsScreen', () => {
  it('matches the point seatedLookTarget makes the camera look at', () => {
    const screen: [number, number, number] = [3, 3.4, -12];
    for (const eye of [[0, 1.2, 2], [-4, 1.3, -11.5], [3, 1.2, -12.2]] as [number, number, number][]) {
      const yaw = aimAt(eye, screen).yaw;
      const target = seatedLookTarget(eye, yaw, screen);
      const expected = aimAt(eye, target);
      expect(viewPitchTowardsScreen(eye, screen)).toBeCloseTo(expected.pitch);
    }
  });

  it('uses a 1 m floor on the horizontal distance when almost under the screen', () => {
    expect(viewPitchTowardsScreen([0, 1, 0], [0, 2, 0.1])).toBeCloseTo(Math.atan2(1, 1));
  });
});

describe('storyboardShots', () => {
  const screens = [createDefaultScreen()];
  const base = { screens, primaryScreenId: 'main', storyboardExtraShots: [] as ExtraShot[] };
  const view = (x: number, name = ''): CustomSeatView => ({ position: [x, 0.1, 5], yaw: 3, pitch: -0.1, fov: 25, name });

  it('gives the four ballroom seats aimed at the primary screen', () => {
    const shots = storyboardShots(
      { ...base, venueSource: 'default-ballroom', customSeatViews: [null, null, null, null] },
      SEAT_PRESETS,
    );
    expect(shots.map((s) => s.id)).toEqual(SEAT_PRESETS.map((p) => `seat-${p.id}`));
    expect(shots[0].name).toBe(SEAT_PRESETS[0].name);
    expect(shots[0].eye).toEqual([0, 1.2, -8]);
    expect(shots[0].fov).toBe(50);
    const dir = directionFromYawPitch(shots[2].yaw, shots[2].pitch);
    const toScreen = [0 - 0, 3.4 - 1.2, -12 - 2];
    const len = Math.hypot(...toScreen);
    expect(dir[1]).toBeCloseTo(toScreen[1] / len);
    expect(dir[2]).toBeCloseTo(toScreen[2] / len);
  });

  it('gives placed custom views in slot order, then this venue\'s extra shots', () => {
    const extras: ExtraShot[] = [
      { id: 'a', name: 'Doors', venue: 'custom-glb', eye: [1, 1.6, 20], yaw: 3.1, pitch: 0, fov: 60 },
      { id: 'b', name: 'Ballroom only', venue: 'default-ballroom', eye: [0, 1.6, 0], yaw: 0, pitch: 0, fov: 50 },
    ];
    const shots = storyboardShots(
      { ...base, venueSource: 'custom-glb', customSeatViews: [null, view(2, 'Back'), view(4), null], storyboardExtraShots: extras },
      SEAT_PRESETS,
    );
    expect(shots.map((s) => [s.id, s.name])).toEqual([
      ['view-1', 'Back'],
      ['view-2', 'View 3'],
      ['extra-a', 'Doors'],
    ]);
    expect(shots[0].eye).toEqual([2, 1.3, 5]);
    expect(shots[0]).toMatchObject({ yaw: 3, pitch: -0.1, fov: 25 });
  });
});

describe('captureWarnings', () => {
  const stream = (...states: string[]) => ({ getVideoTracks: () => states.map((readyState) => ({ readyState })) });
  const w = (over: Partial<Parameters<typeof captureWarnings>[0]>) =>
    captureWarnings({ sourceType: 'pdf', slides: [{}], activeVideoStream: null, showPresenter: true, ...over });

  it('warns for the test pattern, an empty deck and missing or ended streams', () => {
    expect(w({ sourceType: 'test-pattern' }).noSource).toBeTruthy();
    expect(w({ slides: [] }).noSource).toBeTruthy();
    expect(w({ sourceType: 'screen-share' }).noSource).toBeTruthy();
    expect(w({ sourceType: 'hdmi-capture', activeVideoStream: stream('ended', 'ended') }).noSource).toBeTruthy();
  });

  it('is quiet for real content', () => {
    expect(w({}).noSource).toBeNull();
    expect(w({ sourceType: 'screen-share', activeVideoStream: stream('live') }).noSource).toBeNull();
    expect(w({ sourceType: 'screen-share', activeVideoStream: stream('ended', 'live') }).noSource).toBeNull();
  });

  it('flags the presenter being off', () => {
    expect(w({ showPresenter: false }).presenterOff).toBe(true);
    expect(w({}).presenterOff).toBe(false);
  });
});
