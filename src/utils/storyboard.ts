import type { ExtraShot, FovMode, SeatPreset, SourceType, StageState } from '../store/useStageStore';
import type { Vec3 } from './venueAlignment';

/**
 * Pure helpers for camera views and the storyboard: aiming maths, the shot list
 * and capture warnings. Imports only types from the store, so the store can
 * import this module without a runtime cycle.
 */

/** Seated eye height above the clicked floor point, in metres. */
export const SEATED_EYE_HEIGHT = 1.2;
/** Vertical field of view of the "room context" camera, in degrees. */
export const DEFAULT_VIEW_FOV = 50;
/** Storyboard frames are rendered off-screen at this fixed size, whatever the window. */
export const STORYBOARD_FRAME = { width: 2400, height: 1350 } as const;

/** Most extra (non-seat) shots a venue can hold. */
export const MAX_EXTRA_SHOTS = 4;

/** Yaw 0 looks towards +Z, positive pitch looks up. */
export function aimAt(eye: Vec3, target: Vec3): { yaw: number; pitch: number } {
  const dx = target[0] - eye[0];
  const dy = target[1] - eye[1];
  const dz = target[2] - eye[2];
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/** Unit look direction for a yaw and pitch. */
export function directionFromYawPitch(yaw: number, pitch: number): Vec3 {
  const c = Math.cos(pitch);
  return [Math.sin(yaw) * c, Math.sin(pitch), Math.cos(yaw) * c];
}

export function yawPitchFromDirection(dir: Vec3): { yaw: number; pitch: number } {
  return { yaw: Math.atan2(dir[0], dir[2]), pitch: Math.atan2(dir[1], Math.hypot(dir[0], dir[2])) };
}

/** The two field-of-view modes are 50 and 25 degrees; anything in between snaps to the nearer. */
export function fovModeForFov(fov: number): FovMode {
  return fov <= 37.5 ? 'eye-focus' : 'room-context';
}

/**
 * The pitch the app used to show for a view that stored only a heading: the
 * camera looked at a point horizontally `max(1, distance to the screen)` away,
 * at the screen centre's height (see `seatedLookTarget`).
 */
export function viewPitchTowardsScreen(eye: Vec3, screenCentre: Vec3): number {
  const distance = Math.max(1, Math.hypot(screenCentre[0] - eye[0], screenCentre[2] - eye[2]));
  return Math.atan2(screenCentre[1] - eye[1], distance);
}

/** One storyboard frame's camera. */
export interface CameraShot {
  id: string;
  name: string;
  eye: Vec3;
  yaw: number;
  pitch: number;
  fov: number;
}

type ShotState = Pick<
  StageState,
  'venueSource' | 'customSeatViews' | 'screens' | 'primaryScreenId' | 'storyboardExtraShots'
>;

const withEyeHeight = (floor: Vec3): Vec3 => [floor[0], floor[1] + SEATED_EYE_HEIGHT, floor[2]];

/**
 * The shots a storyboard captures, in order: the four seat views (aimed at the
 * primary screen in the demo ballroom, as placed in a custom venue), then the
 * extra shots saved for the current venue. `presets` is the ballroom's fixed
 * seat list, passed in because this module can't import the store at runtime.
 */
export function storyboardShots(state: ShotState, presets: readonly Pick<SeatPreset, 'id' | 'name' | 'position'>[]): CameraShot[] {
  const shots: CameraShot[] = [];
  if (state.venueSource === 'custom-glb') {
    state.customSeatViews.forEach((view, i) => {
      if (!view) return;
      shots.push({
        id: `view-${i}`,
        name: view.name || `View ${i + 1}`,
        eye: withEyeHeight(view.position),
        yaw: view.yaw,
        pitch: view.pitch,
        fov: view.fov,
      });
    });
  } else {
    const screen = state.screens.find((s) => s.id === state.primaryScreenId) ?? state.screens[0];
    for (const preset of presets) {
      const eye = withEyeHeight(preset.position);
      const { yaw, pitch } = aimAt(eye, screen.position);
      shots.push({ id: `seat-${preset.id}`, name: preset.name, eye, yaw, pitch, fov: DEFAULT_VIEW_FOV });
    }
  }
  for (const extra of state.storyboardExtraShots) {
    if (extra.venue !== state.venueSource) continue;
    shots.push(extraToShot(extra));
  }
  return shots;
}

export const extraToShot = (extra: ExtraShot): CameraShot => ({
  id: `extra-${extra.id}`,
  name: extra.name,
  eye: [...extra.eye],
  yaw: extra.yaw,
  pitch: extra.pitch,
  fov: extra.fov,
});

interface TrackLike {
  readyState: string;
}
interface StreamLike {
  getVideoTracks(): TrackLike[];
}
export interface CaptureWarningState {
  sourceType: SourceType;
  slides: readonly unknown[];
  activeVideoStream: StreamLike | null;
  showPresenter: boolean;
}

/** Things worth telling the user before a capture. `noSource` is the message, or null when the screen has real content. */
export function captureWarnings(state: CaptureWarningState): { noSource: string | null; presenterOff: boolean } {
  let noSource: string | null = null;
  if (state.sourceType === 'test-pattern') {
    noSource = 'The screen is showing the test pattern, not your content.';
  } else if (state.sourceType === 'pdf') {
    if (state.slides.length === 0) noSource = 'No slides are loaded, so the screen is empty.';
  } else {
    const tracks = state.activeVideoStream ? state.activeVideoStream.getVideoTracks() : [];
    if (!state.activeVideoStream) {
      noSource = 'No video source is connected, so the screen is empty.';
    } else if (tracks.length === 0 || tracks.every((t) => t.readyState === 'ended')) {
      noSource = 'The video source has ended, so the screen is showing its last frame or nothing.';
    }
  }
  return { noSource, presenterOff: !state.showPresenter };
}
