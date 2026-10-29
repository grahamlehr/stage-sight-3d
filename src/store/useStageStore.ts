import { create } from 'zustand';
import { hasDismissedGuide } from '../utils/firstRunGuide';
import { normaliseQuarterTurn, rotateAboutY } from '../utils/venueAlignment';
import { normaliseYaw } from '../utils/floorPlan';
import { orderSplitScreens } from '../utils/screenLayout';
import {
  packRoomFile,
  parseRoomDocument,
  ROOM_VIEW_COUNT,
  roomFileName,
  roomFromState,
  roomKey,
  roomToState,
  unpackRoomFile,
} from '../utils/roomFile';
import { validateGlb } from '../utils/glbValidate';
import { downloadBlob } from '../utils/download';
import {
  fovModeForFov,
  MAX_EXTRA_SHOTS,
  SEATED_EYE_HEIGHT,
  storyboardShots,
  type CameraShot,
} from '../utils/storyboard';

export type VenueSource = 'default-ballroom' | 'custom-glb';
export type SourceType = 'test-pattern' | 'pdf' | 'hdmi-capture' | 'screen-share';
export type UvCropMode = 'auto-letterbox' | 'top-aligned' | 'fill-1-to-1' | 'manual';
export type NavigationMode = 'orbit' | 'seated';
export type FovMode = 'room-context' | 'eye-focus';

/** How a screen uses the video source: a slice of a split, or the whole source repeated. */
export type ScreenRole = 'split' | 'repeat';

export interface StageScreen {
  id: string;
  name: string;
  width: number; // metres
  height: number; // metres
  position: [number, number, number];
  rotation: [number, number, number]; // only Y is used
  role: ScreenRole;
  /** Name of the custom-venue mesh this screen was picked from, or null for a free screen. */
  boundMeshName: string | null;
}

export const DEFAULT_SCREEN_ID = 'main';
export const DEMO_LEFT_SCREEN_ID = 'demo-left';
export const DEMO_RIGHT_SCREEN_ID = 'demo-right';

/** The single 32:9 screen on the ballroom stage that every session starts with. */
export const createDefaultScreen = (): StageScreen => ({
  id: DEFAULT_SCREEN_ID,
  name: 'Main screen',
  width: 16.0,
  height: 4.5,
  position: [0, 3.4, -12],
  rotation: [0, 0, 0],
  role: 'split',
  boundMeshName: null,
});

/** Splayed side screens for the demo ballroom, turned in towards the audience. */
const createDemoSideScreens = (): StageScreen[] => [
  {
    id: DEMO_LEFT_SCREEN_ID,
    name: 'Left side screen',
    width: 3.2,
    height: 1.8,
    position: [-8.6, 3.4, -10.5],
    rotation: [0, 0.45, 0], // at -X, +Y turn points the normal to +X/+Z
    role: 'repeat',
    boundMeshName: null,
  },
  {
    id: DEMO_RIGHT_SCREEN_ID,
    name: 'Right side screen',
    width: 3.2,
    height: 1.8,
    position: [8.6, 3.4, -10.5],
    rotation: [0, -0.45, 0],
    role: 'repeat',
    boundMeshName: null,
  },
];

const isDemoScreen = (id: string) => id === DEMO_LEFT_SCREEN_ID || id === DEMO_RIGHT_SCREEN_ID;

type ScreenPatch = Partial<Omit<StageScreen, 'id'>>;

/** The screen that drives telemetry, the camera target, stage props and VR. */
export const selectPrimaryScreen = (state: Pick<StageState, 'screens' | 'primaryScreenId'>): StageScreen =>
  state.screens.find((s) => s.id === state.primaryScreenId) ?? state.screens[0];

/** The screen the size inputs, presets and gizmo edit. */
export const selectSelectedScreen = (state: Pick<StageState, 'screens' | 'selectedScreenId'>): StageScreen =>
  state.screens.find((s) => s.id === state.selectedScreenId) ?? state.screens[0];

export interface AspectRatioPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  ratioStr: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: '16-9', label: '16:9 Standard', width: 8.0, height: 4.5, ratioStr: '16:9' },
  { id: '21-9', label: '21:9 Ultra-Wide', width: 10.5, height: 4.5, ratioStr: '21:9' },
  { id: '32-9', label: '32:9 Super-Wide', width: 16.0, height: 4.5, ratioStr: '32:9' },
  { id: '3-1', label: '3:1 Banner', width: 13.5, height: 4.5, ratioStr: '3:1' },
  { id: '4-1', label: '4:1 Ribbon', width: 18.0, height: 4.5, ratioStr: '4:1' },
];

export interface SeatPreset {
  id: string;
  name: string;
  description: string;
  position: [number, number, number]; // [x, y, z] floor position (eye height +1.2 will be added by camera)
  /** Look direction in radians, as `Math.atan2(dx, dz)`. Omitted means face the screen. */
  yaw?: number;
  /** Look pitch in radians (custom views only). Omitted means face the screen. */
  pitch?: number;
  /** Vertical field of view in degrees (custom views only). */
  fov?: number;
}

/** A camera view placed by hand on a custom venue's floor plan. World coordinates, metres. */
export interface CustomSeatView {
  position: [number, number, number]; // floor point that was clicked; the eye is 1.2m above
  yaw: number;
  /** Radians, positive looks up. */
  pitch: number;
  /** Vertical field of view in degrees. */
  fov: number;
  /** Shown in the views list and the storyboard; '' means "View N". */
  name: string;
}

/** A named storyboard camera that isn't one of the seat views. Eye is a world position (not a floor point). */
export interface ExtraShot {
  id: string;
  name: string;
  venue: VenueSource;
  eye: [number, number, number];
  yaw: number;
  pitch: number;
  fov: number;
}

/** The camera as it is right now, read from the perspective camera. */
export interface LiveCameraPose {
  eye: [number, number, number];
  yaw: number;
  pitch: number;
  fov: number;
}

export interface StoryboardFrame {
  id: string;
  shot: CameraShot;
  blob: Blob;
  /** Object URL for thumbnails; revoked whenever the frame goes. */
  url: string;
}

export interface StoryboardSet {
  id: string;
  label: string;
  frames: StoryboardFrame[];
}

export type StoryboardCaptureResult = { ok: true; setId: string } | { ok: false; message: string };

export const CUSTOM_VIEW_COUNT = ROOM_VIEW_COUNT;

export interface VenueBounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** A seat preset as offered to the user; unplaced custom views can't be applied. */
export interface ActiveSeatPreset extends SeatPreset {
  placed: boolean;
}

/**
 * The four seat presets for the current venue: the fixed ballroom set, or the
 * views placed on a custom venue's floor plan (unplaced slots are flagged).
 */
export function getActiveSeatPresets(
  state: Pick<StageState, 'venueSource' | 'customSeatViews'>,
): ActiveSeatPreset[] {
  if (state.venueSource !== 'custom-glb') {
    return SEAT_PRESETS.map((p) => ({ ...p, placed: true }));
  }
  return state.customSeatViews.map((view, i) => ({
    id: `custom-view-${i + 1}`,
    name: view?.name || `View ${i + 1}`,
    description: view ? 'Placed on the floor plan' : 'Not placed yet',
    position: view ? view.position : [0, 0, 0],
    yaw: view ? view.yaw : undefined,
    pitch: view ? view.pitch : undefined,
    fov: view ? view.fov : undefined,
    placed: view !== null,
  }));
}

export const SEAT_PRESETS: SeatPreset[] = [
  {
    id: 'front-center',
    name: 'Front Row Center (4m)',
    description: '4m from screen at stage centerline',
    position: [0, 0, -8],
  },
  {
    id: 'front-left',
    name: 'Front Row Far Left (4m, ~48° Off-Axis)',
    description: 'Extreme horizontal angle test',
    position: [-6.5, 0, -8],
  },
  {
    id: 'mid-center',
    name: 'Mid House Center (14m)',
    description: 'Ideal sweet-spot audience view',
    position: [0, 0, 2],
  },
  {
    id: 'rear-center',
    name: 'Back of Room (25m)',
    description: 'Worst-case legibility threshold',
    position: [0, 0, 13],
  },
];

export interface DiscasTelemetry {
  viewingDistance: number;
  dhRatio: number;
  offAxisAngle: number;
  dhStatus: 'detail' | 'reading' | 'marginal' | 'fail';
  dhLabel: string;
  angleStatus: 'optimal' | 'steep' | 'extreme';
  angleLabel: string;
  /** Another screen in a strictly worse band than the primary from this seat, if any. */
  worst?: WorstScreenTelemetry | null;
}

export interface WorstScreenTelemetry {
  screenId: string;
  screenName: string;
  dhStatus: DiscasTelemetry['dhStatus'];
  angleStatus: DiscasTelemetry['angleStatus'];
}

export interface StageState {
  // Venue State
  venueSource: VenueSource;
  customGlbUrl: string | null;
  /** Custom venue turn about Y in radians, a multiple of π/2, so its screen wall faces +Z. */
  venueYaw: number;
  /** Height of a custom venue's stage deck in metres; the occlusion props stand on it. */
  customDeckHeight: number;
  /** Four hand-placed camera views for a custom venue; null where not placed yet. */
  customSeatViews: (CustomSeatView | null)[];
  /** World-space bounds of the loaded custom venue, or null when none is loaded. */
  customVenueBounds: VenueBounds | null;
  /** True while the top-down floor plan is showing instead of the 3D view. */
  isFloorPlanOpen: boolean;
  /** Which custom view (0–3) a floor plan click places. */
  floorPlanSlot: number;
  /** World Y of the floor plan's section cut, or null for the default. */
  floorPlanCutHeight: number | null;
  stageHeight: number;
  venueLength: number;
  venueWidth: number;
  houseLightsIntensity: number;
  stageLightsIntensity: number;
  lightingPreset: 'conference-bright' | 'ballroom-standard' | 'keynote-dark';
  showCeilingFixtures: boolean;

  // Screen Mapping State
  /** Every screen in the venue; never empty. */
  screens: StageScreen[];
  /** Telemetry, the camera look target, stage props and VR use this screen. */
  primaryScreenId: string;
  /** The screen the size inputs, presets and gizmo edit. */
  selectedScreenId: string;
  /** Left-to-right order of split screens; null means auto (ascending X). */
  splitOrder: string[] | null;
  /** True while the demo ballroom's two angled side screens are present. */
  demoSideScreens: boolean;
  isPickingMesh: boolean;
  showTransformGizmo: boolean;
  /** True while a gizmo handle is held, so camera navigation stands down. */
  isTransformDragging: boolean;

  // Content Source & UV Crop State
  sourceType: SourceType;
  slides: HTMLCanvasElement[];
  currentSlideIndex: number;
  activeVideoStream: MediaStream | null;
  selectedVideoDeviceId: string;
  uvCropMode: UvCropMode;
  manualUvRepeatY: number;
  manualUvOffsetY: number;

  // Camera & Seating State
  navigationMode: NavigationMode;
  seatPosition: [number, number, number];
  /** Yaw the seated camera faces, or null to look at the screen centre. */
  seatYaw: number | null;
  /** Pitch the seated camera faces (radians, + up); only used together with seatYaw. */
  seatPitch: number | null;
  fovMode: FovMode;

  // WebXR / Meta Quest VR State
  isVrSupported: boolean;
  isVrPresenting: boolean;
  vrHudVisible: boolean;
  vrRecenterCount: number;
  toggleVrSession: (() => Promise<void>) | null;

  // Storyboard
  /** Reads the live perspective camera; registered by CameraController. */
  getLiveCameraPose: (() => LiveCameraPose) | null;
  /** Renders shots off-screen to JPEG blobs; registered by StoryboardRenderer. */
  renderStoryboardShots: ((shots: CameraShot[]) => Promise<Blob[]>) | null;
  storyboardExtraShots: ExtraShot[];
  storyboardSets: StoryboardSet[];
  isStoryboardOpen: boolean;
  isCapturing: boolean;

  // Stage Occlusion Overlays
  showPresenterSilhouette: boolean; // legacy alias
  showPresenter: boolean;
  presenterOffset: [number, number]; // [xOffsetAlongStage, zDistanceInFrontOfScreen]
  showLectern: boolean;
  lecternOffset: [number, number];
  showPanel: boolean;
  panelOffset: [number, number];

  // Telemetry HUD
  telemetry: DiscasTelemetry;

  // Room file
  roomName: string;
  roomNotes: string;
  /** roomKey() at the last save or open; a different key now means unsaved changes. */
  roomBaseline: string;

  // UI State
  activeSidebarTab: 'source' | 'screen' | 'venue';
  isSidebarOpen: boolean;
  isGuideOpen: boolean;

  // Actions
  setVenueSource: (source: VenueSource) => void;
  setCustomGlbUrl: (url: string | null) => void;
  setVenueYaw: (yaw: number) => void;
  setCustomSeatView: (slot: number, view: CustomSeatView | null) => void;
  setCustomVenueBounds: (bounds: VenueBounds | null) => void;
  setIsFloorPlanOpen: (open: boolean) => void;
  setFloorPlanSlot: (slot: number) => void;
  /** Shows the Venue tab with the floor plan open on the first unplaced view, ready to place one. */
  openFloorPlanToPlaceViews: () => void;
  setFloorPlanCutHeight: (height: number | null) => void;
  setSeatView: (position: [number, number, number], yaw: number | null, pitch?: number | null) => void;
  renameCustomSeatView: (slot: number, name: string) => void;
  /** Points a placed view at wherever the live camera is now. */
  updateCustomSeatViewFromCamera: (slot: number) => void;
  setCustomDeckHeight: (height: number) => void;
  setStageHeight: (height: number) => void;
  setVenueDimensions: (width: number, length: number) => void;
  setHouseLightsIntensity: (intensity: number) => void;
  setStageLightsIntensity: (intensity: number) => void;
  setLightingPreset: (preset: 'conference-bright' | 'ballroom-standard' | 'keynote-dark') => void;
  cycleLightingPreset: () => void;
  setShowCeilingFixtures: (show: boolean) => void;

  addScreen: (screen?: ScreenPatch & { id?: string }) => string;
  updateScreen: (id: string, patch: ScreenPatch) => void;
  removeScreen: (id: string) => void;
  setPrimaryScreen: (id: string) => void;
  setSelectedScreen: (id: string) => void;
  setScreenRole: (id: string, role: ScreenRole) => void;
  setAllScreenRoles: (role: ScreenRole) => void;
  moveScreenInSplit: (id: string, direction: -1 | 1) => void;
  resetSplitOrder: () => void;
  setDemoSideScreens: (on: boolean) => void;
  setIsPickingMesh: (picking: boolean) => void;
  setScreenDimensions: (width: number, height: number) => void;
  setScreenPreset: (presetId: string) => void;
  setScreenPosition: (pos: [number, number, number]) => void;
  setScreenRotation: (rot: [number, number, number]) => void;
  setShowTransformGizmo: (show: boolean) => void;
  setIsTransformDragging: (dragging: boolean) => void;

  setSourceType: (type: SourceType) => void;
  setSlides: (slides: HTMLCanvasElement[]) => void;
  setCurrentSlideIndex: (index: number) => void;
  setActiveVideoStream: (stream: MediaStream | null) => void;
  setSelectedVideoDeviceId: (id: string) => void;
  setUvCropMode: (mode: UvCropMode) => void;
  setManualUvRepeatY: (repeatY: number) => void;
  setManualUvOffsetY: (offsetY: number) => void;

  setNavigationMode: (mode: NavigationMode) => void;
  setSeatPosition: (pos: [number, number, number]) => void;
  setFovMode: (mode: FovMode) => void;
  applySeatPreset: (presetId: string) => void;
  cycleSeatPreset: (direction?: 1 | -1) => void;

  setIsVrSupported: (supported: boolean) => void;
  setIsVrPresenting: (presenting: boolean) => void;
  setVrHudVisible: (visible: boolean) => void;
  triggerVrRecenter: () => void;
  setToggleVrSession: (fn: (() => Promise<void>) | null) => void;

  setGetLiveCameraPose: (fn: (() => LiveCameraPose) | null) => void;
  setRenderStoryboardShots: (fn: ((shots: CameraShot[]) => Promise<Blob[]>) | null) => void;
  addExtraShotFromCamera: (name: string) => string | null;
  renameExtraShot: (id: string, name: string) => void;
  removeExtraShot: (id: string) => void;
  captureStoryboardSet: (label: string) => Promise<StoryboardCaptureResult>;
  retakeStoryboardFrame: (setId: string, frameId: string) => Promise<StoryboardCaptureResult>;
  /** Adds the live camera as a one-off frame to the given set, the last set, or a new one. */
  captureCurrentViewFrame: (setId: string | null) => Promise<StoryboardCaptureResult>;
  renameStoryboardSet: (setId: string, label: string) => void;
  deleteStoryboardFrame: (setId: string, frameId: string) => void;
  deleteStoryboardSet: (setId: string) => void;
  /** Drops every frame and revokes its URL. */
  clearStoryboard: () => void;
  /** Closing the tray clears the frames: they live only while it is open. */
  setIsStoryboardOpen: (open: boolean) => void;

  setShowPresenterSilhouette: (show: boolean) => void;
  setPresenterOffset: (offset: [number, number]) => void;
  setShowPresenter: (show: boolean) => void;
  setShowLectern: (show: boolean) => void;
  setLecternOffset: (offset: [number, number]) => void;
  setShowPanel: (show: boolean) => void;
  setPanelOffset: (offset: [number, number]) => void;

  setTelemetry: (telemetry: DiscasTelemetry) => void;
  setRoomName: (name: string) => void;
  setRoomNotes: (notes: string) => void;
  /** Downloads the room as a `.stagesight` file. Nothing leaves the device. */
  saveRoom: () => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Replaces the room from a `.stagesight` file; on any failure the current room is left untouched. */
  loadRoom: (
    file: Blob
  ) => Promise<{ ok: true; name: string; notes: string } | { ok: false; message: string }>;
  setActiveSidebarTab: (tab: 'source' | 'screen' | 'venue') => void;
  setIsSidebarOpen: (open: boolean) => void;
  setIsGuideOpen: (open: boolean) => void;
}

/** State that puts the screens back to the single default one. */
const screenReset = (): Pick<
  StageState,
  'screens' | 'primaryScreenId' | 'selectedScreenId' | 'splitOrder' | 'demoSideScreens'
> => ({
  screens: [createDefaultScreen()],
  primaryScreenId: DEFAULT_SCREEN_ID,
  selectedScreenId: DEFAULT_SCREEN_ID,
  splitOrder: null,
  demoSideScreens: false,
});

/** Drops the demo side screens, keeping primary, selected and the split order valid. */
function withoutDemoScreens(state: StageState): Partial<StageState> {
  const screens = state.screens.filter((s) => !isDemoScreen(s.id));
  if (screens.length === 0) return { demoSideScreens: false };
  const next: Partial<StageState> = { demoSideScreens: false, screens };
  const has = (id: string) => screens.some((s) => s.id === id);
  if (!has(state.primaryScreenId)) next.primaryScreenId = screens[0].id;
  if (!has(state.selectedScreenId)) next.selectedScreenId = screens[0].id;
  if (state.splitOrder) next.splitOrder = state.splitOrder.filter(has);
  return next;
}

let storyboardIdCounter = 0;
const nextStoryboardId = (prefix: string) => `${prefix}-${++storyboardIdCounter}`;

const makeFrame = (shot: CameraShot, blob: Blob): StoryboardFrame => ({
  id: nextStoryboardId('frame'),
  shot,
  blob,
  url: URL.createObjectURL(blob),
});

const captureMessage = (err: unknown): string =>
  err instanceof Error && err.message ? err.message : "The storyboard couldn't be captured. Please try again.";

/**
 * Waits for the scene to commit after the capture clears overlays (gizmo, mesh
 * picker, floor plan). A hidden tab pauses requestAnimationFrame, so the wait
 * is raced against a short timer.
 */
async function settleScene(): Promise<void> {
  useStageStore.setState({ showTransformGizmo: false, isPickingMesh: false, isFloorPlanOpen: false });
  const frames = new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'function') return resolve();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await Promise.race([frames, new Promise<void>((resolve) => setTimeout(resolve, 150))]);
}

export const useStageStore = create<StageState>((set, get) => ({
  // Venue Defaults
  venueSource: 'default-ballroom',
  customGlbUrl: null,
  venueYaw: 0,
  customDeckHeight: 0,
  customSeatViews: [null, null, null, null],
  customVenueBounds: null,
  isFloorPlanOpen: false,
  floorPlanSlot: 0,
  floorPlanCutHeight: null,
  stageHeight: 1.0,
  venueLength: 30,
  venueWidth: 20,
  houseLightsIntensity: 1.1,
  stageLightsIntensity: 1.3,
  lightingPreset: 'ballroom-standard',
  showCeilingFixtures: true,

  // Screen Defaults (32:9 Super-Wide, 16m x 4.5m on stage deck)
  screens: [createDefaultScreen()],
  primaryScreenId: DEFAULT_SCREEN_ID,
  selectedScreenId: DEFAULT_SCREEN_ID,
  splitOrder: null,
  demoSideScreens: false,
  isPickingMesh: false,
  showTransformGizmo: false,
  isTransformDragging: false,

  // Content Source Defaults
  sourceType: 'test-pattern',
  slides: [],
  currentSlideIndex: 0,
  activeVideoStream: null,
  selectedVideoDeviceId: '',
  uvCropMode: 'auto-letterbox',
  manualUvRepeatY: 1.0,
  manualUvOffsetY: 0.0,

  // Camera & Seating Defaults
  navigationMode: 'orbit',
  seatPosition: [0, 0, 2], // Mid-House Center
  seatYaw: null,
  seatPitch: null,
  fovMode: 'room-context',

  // WebXR / Meta Quest VR Defaults
  isVrSupported: false,
  isVrPresenting: false,
  vrHudVisible: true,
  vrRecenterCount: 0,
  toggleVrSession: null,

  // Storyboard Defaults
  getLiveCameraPose: null,
  renderStoryboardShots: null,
  storyboardExtraShots: [],
  storyboardSets: [],
  isStoryboardOpen: false,
  isCapturing: false,

  // Stage Occlusion Defaults. The screen sits 2m behind the deck's front edge,
  // so z offsets stay at or under 1.2m to keep the props off the lip. The
  // presenter and lectern stand at x = ±4, clear of the panel's outer chairs
  // (x = ±2.6, about 0.5m radius), so all three can be shown together.
  showPresenterSilhouette: true,
  showPresenter: true,
  presenterOffset: [-4.0, 1.2],
  showLectern: true,
  lecternOffset: [4.0, 1.2],
  showPanel: false,
  panelOffset: [0.0, 1.0],

  // Live Telemetry Defaults
  telemetry: {
    viewingDistance: 14.0,
    dhRatio: 3.11,
    offAxisAngle: 0,
    dhStatus: 'detail',
    dhLabel: 'High Acuity / Analytical Detail',
    angleStatus: 'optimal',
    angleLabel: 'On-Axis',
  },

  // Room file
  roomName: '',
  roomNotes: '',
  roomBaseline: '',

  // UI State
  activeSidebarTab: 'source',
  isSidebarOpen: true,
  // First-run tour: open until the user dismisses it with "Don't show again"
  isGuideOpen: !hasDismissedGuide(),

  // Actions
  setVenueSource: (venueSource) => {
    if (venueSource === 'default-ballroom') {
      set({ venueSource, isFloorPlanOpen: false, seatYaw: null, seatPitch: null });
    } else {
      // The side screens are placed for the ballroom, so they make no sense in a custom room
      set((state) => ({ venueSource, ...withoutDemoScreens(state) }));
    }
  },
  setCustomGlbUrl: (customGlbUrl) => {
    // Single choke point for the uploaded venue blob: release the URL we are
    // replacing, otherwise every upload pins its whole file (often 10s–100s of
    // MB) in memory for the lifetime of the page.
    const previous = get().customGlbUrl;
    if (previous && previous !== customGlbUrl && previous.startsWith('blob:')) {
      URL.revokeObjectURL(previous);
    }
    // A new model starts unturned; its orientation has nothing to do with the last one's
    // and neither do the camera views placed on its floor plan
    set(
      previous === customGlbUrl
        ? { customGlbUrl }
        : {
            customGlbUrl,
            venueYaw: 0,
            customDeckHeight: 0,
            customSeatViews: [null, null, null, null],
            customVenueBounds: null,
            isFloorPlanOpen: false,
            floorPlanSlot: 0,
            floorPlanCutHeight: null,
            seatYaw: null,
            seatPitch: null,
            // Extra shots in the last model's coordinates mean nothing in this one
            storyboardExtraShots: get().storyboardExtraShots.filter((e) => e.venue !== 'custom-glb'),
            // Screens bound to the last model's meshes mean nothing in this one
            ...screenReset(),
          }
    );
  },
  setVenueYaw: (yaw) => {
    // Carry the seat round with the room so the viewer stays in the same chair
    // rather than being left wherever that world position now lands
    // and every placed view with it, keeping each one's position and heading
    // fixed relative to the room
    const { venueYaw, seatPosition, seatYaw, customSeatViews, screens, storyboardExtraShots } = get();
    const next = normaliseQuarterTurn(yaw);
    const delta = next - venueYaw;
    set({
      venueYaw: next,
      seatPosition: rotateAboutY(seatPosition, delta),
      seatYaw: seatYaw === null ? null : normaliseYaw(seatYaw + delta),
      customSeatViews: customSeatViews.map((view) =>
        view ? { ...view, position: rotateAboutY(view.position, delta), yaw: normaliseYaw(view.yaw + delta) } : null
      ),
      storyboardExtraShots: storyboardExtraShots.map((e) =>
        e.venue === 'custom-glb' ? { ...e, eye: rotateAboutY(e.eye, delta), yaw: normaliseYaw(e.yaw + delta) } : e
      ),
      // Screens picked from the room's meshes turn with it; free screens stay put
      screens: screens.map((screen) =>
        screen.boundMeshName === null
          ? screen
          : {
              ...screen,
              position: rotateAboutY(screen.position, delta),
              rotation: [screen.rotation[0], normaliseYaw(screen.rotation[1] + delta), screen.rotation[2]],
            }
      ),
    });
  },
  setCustomSeatView: (slot, view) =>
    set((state) => ({
      customSeatViews: state.customSeatViews.map((existing, i) =>
        i === slot
          ? view
            ? { position: [...view.position], yaw: view.yaw, pitch: view.pitch, fov: view.fov, name: view.name }
            : null
          : existing
      ),
    })),
  renameCustomSeatView: (slot, name) =>
    set((state) => ({
      customSeatViews: state.customSeatViews.map((view, i) => (i === slot && view ? { ...view, name } : view)),
    })),
  updateCustomSeatViewFromCamera: (slot) => {
    const { getLiveCameraPose, customSeatViews } = get();
    const view = customSeatViews[slot];
    const pose = getLiveCameraPose?.();
    if (!view || !pose) return;
    get().setCustomSeatView(slot, {
      position: [pose.eye[0], pose.eye[1] - SEATED_EYE_HEIGHT, pose.eye[2]],
      yaw: pose.yaw,
      pitch: pose.pitch,
      fov: pose.fov,
      name: view.name,
    });
  },
  setCustomVenueBounds: (customVenueBounds) => set({ customVenueBounds }),
  setIsFloorPlanOpen: (isFloorPlanOpen) => set({ isFloorPlanOpen }),
  setFloorPlanSlot: (slot) => set({ floorPlanSlot: Math.max(0, Math.min(CUSTOM_VIEW_COUNT - 1, Math.round(slot))) }),
  openFloorPlanToPlaceViews: () =>
    set((state) => {
      const firstUnplaced = state.customSeatViews.findIndex((view) => view === null);
      return {
        isSidebarOpen: true,
        activeSidebarTab: 'venue',
        // The floor plan needs the model's bounds, so it waits for the model to load
        isFloorPlanOpen: state.venueSource === 'custom-glb' && state.customVenueBounds !== null,
        floorPlanSlot: firstUnplaced === -1 ? state.floorPlanSlot : firstUnplaced,
      };
    }),
  setFloorPlanCutHeight: (floorPlanCutHeight) => set({ floorPlanCutHeight }),
  setCustomDeckHeight: (customDeckHeight) => set({ customDeckHeight: Math.max(0, customDeckHeight) }),
  setStageHeight: (stageHeight) => set({ stageHeight }),
  setVenueDimensions: (venueWidth, venueLength) => set({ venueWidth, venueLength }),
  setHouseLightsIntensity: (houseLightsIntensity) => set({ houseLightsIntensity }),
  setStageLightsIntensity: (stageLightsIntensity) => set({ stageLightsIntensity }),
  setLightingPreset: (lightingPreset) => {
    switch (lightingPreset) {
      case 'conference-bright':
        set({
          lightingPreset,
          houseLightsIntensity: 1.8,
          stageLightsIntensity: 1.6,
        });
        break;
      case 'ballroom-standard':
        set({
          lightingPreset,
          houseLightsIntensity: 1.1,
          stageLightsIntensity: 1.3,
        });
        break;
      case 'keynote-dark':
        set({
          lightingPreset,
          houseLightsIntensity: 0.35,
          stageLightsIntensity: 1.5,
        });
        break;
    }
  },
  cycleLightingPreset: () => {
    const order: Array<'conference-bright' | 'ballroom-standard' | 'keynote-dark'> = [
      'conference-bright',
      'ballroom-standard',
      'keynote-dark',
    ];
    const current = get().lightingPreset;
    const next = order[(order.indexOf(current) + 1) % order.length];
    get().setLightingPreset(next);
  },
  setShowCeilingFixtures: (showCeilingFixtures) => set({ showCeilingFixtures }),

  addScreen: (partial = {}) => {
    const { id: wanted, ...patch } = partial;
    const { screens } = get();
    const taken = new Set(screens.map((s) => s.id));
    let n = screens.length + 1;
    let id = wanted && !taken.has(wanted) ? wanted : `screen-${n}`;
    while (taken.has(id)) id = `screen-${++n}`;
    const screen: StageScreen = {
      name: `Screen ${screens.length + 1}`,
      width: 8.0,
      height: 4.5,
      position: [0, 3.4, -12],
      rotation: [0, 0, 0],
      role: 'repeat',
      boundMeshName: null,
      ...patch,
      id,
    };
    set({ screens: [...screens, screen] });
    return id;
  },
  updateScreen: (id, patch) =>
    set((state) => ({
      screens: state.screens.map((s) => (s.id === id ? { ...s, ...patch, id } : s)),
    })),
  removeScreen: (id) =>
    set((state) => {
      // There is always at least one screen to look at
      if (state.screens.length <= 1 || !state.screens.some((s) => s.id === id)) return {};
      const screens = state.screens.filter((s) => s.id !== id);
      const next = { screens } as Partial<StageState>;
      if (state.primaryScreenId === id) next.primaryScreenId = screens[0].id;
      if (state.selectedScreenId === id) next.selectedScreenId = screens[0].id;
      if (state.splitOrder) next.splitOrder = state.splitOrder.filter((sid) => sid !== id);
      if (isDemoScreen(id) && !screens.some((s) => isDemoScreen(s.id))) next.demoSideScreens = false;
      return next;
    }),
  setPrimaryScreen: (id) =>
    set((state) => (state.screens.some((s) => s.id === id) ? { primaryScreenId: id } : {})),
  setSelectedScreen: (id) =>
    set((state) => (state.screens.some((s) => s.id === id) ? { selectedScreenId: id } : {})),
  setScreenRole: (id, role) => get().updateScreen(id, { role }),
  setAllScreenRoles: (role) =>
    set((state) => ({ screens: state.screens.map((s) => ({ ...s, role })) })),
  moveScreenInSplit: (id, direction) => {
    const { screens, splitOrder } = get();
    // Start from what the user sees now, so the first move pins the auto order
    const order = orderSplitScreens(screens, splitOrder).map((s) => s.id);
    const from = order.indexOf(id);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    set({ splitOrder: order });
  },
  resetSplitOrder: () => set({ splitOrder: null }),
  setDemoSideScreens: (on) =>
    set((state) => {
      if (!on) return withoutDemoScreens(state);
      const missing = createDemoSideScreens().filter((d) => !state.screens.some((s) => s.id === d.id));
      return { demoSideScreens: true, screens: [...state.screens, ...missing] };
    }),
  setIsPickingMesh: (isPickingMesh) => set({ isPickingMesh }),
  setScreenDimensions: (width, height) => get().updateScreen(get().selectedScreenId, { width, height }),
  setScreenPreset: (presetId) => {
    const preset = ASPECT_RATIO_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      get().updateScreen(get().selectedScreenId, { width: preset.width, height: preset.height });
    }
  },
  setScreenPosition: (position) => get().updateScreen(get().selectedScreenId, { position }),
  setScreenRotation: (rotation) => get().updateScreen(get().selectedScreenId, { rotation }),
  setShowTransformGizmo: (showTransformGizmo) => set({ showTransformGizmo }),
  setIsTransformDragging: (isTransformDragging) => set({ isTransformDragging }),

  setSourceType: (sourceType) => set({ sourceType }),
  setSlides: (slides) => set({ slides, currentSlideIndex: 0 }),
  setCurrentSlideIndex: (currentSlideIndex) => set({ currentSlideIndex }),
  setActiveVideoStream: (activeVideoStream) => set({ activeVideoStream }),
  setSelectedVideoDeviceId: (selectedVideoDeviceId) => set({ selectedVideoDeviceId }),
  setUvCropMode: (uvCropMode) => set({ uvCropMode }),
  setManualUvRepeatY: (manualUvRepeatY) => set({ manualUvRepeatY }),
  setManualUvOffsetY: (manualUvOffsetY) => set({ manualUvOffsetY }),

  setNavigationMode: (navigationMode) => set({ navigationMode }),
  // Click-to-sit and VR teleports go back to looking at the screen
  setSeatPosition: (seatPosition) => set({ seatPosition, seatYaw: null, seatPitch: null }),
  setSeatView: (seatPosition, seatYaw, seatPitch = null) => set({ seatPosition, seatYaw, seatPitch }),
  setFovMode: (fovMode) => set({ fovMode }),
  applySeatPreset: (presetId) => {
    const preset = getActiveSeatPresets(get()).find((p) => p.id === presetId);
    if (preset && preset.placed) {
      set({
        seatPosition: preset.position,
        seatYaw: preset.yaw ?? null,
        seatPitch: preset.pitch ?? null,
        ...(preset.fov === undefined ? {} : { fovMode: fovModeForFov(preset.fov) }),
        navigationMode: 'seated',
      });
    }
  },
  cycleSeatPreset: (direction = 1) => {
    // Unplaced custom views can't be sat in, so cycling skips them
    const presets = getActiveSeatPresets(get()).filter((p) => p.placed);
    if (presets.length === 0) return;
    const currentPos = get().seatPosition;
    const currentIdx = presets.findIndex(
      (p) =>
        Math.abs(p.position[0] - currentPos[0]) < 0.25 &&
        Math.abs(p.position[2] - currentPos[2]) < 0.25
    );
    const nextIdx =
      currentIdx === -1
        ? 0
        : (currentIdx + direction + presets.length) % presets.length;
    set({
      seatPosition: presets[nextIdx].position,
      seatYaw: presets[nextIdx].yaw ?? null,
      seatPitch: presets[nextIdx].pitch ?? null,
      ...(presets[nextIdx].fov === undefined ? {} : { fovMode: fovModeForFov(presets[nextIdx].fov as number) }),
      navigationMode: 'seated',
    });
  },

  setIsVrSupported: (isVrSupported) => set({ isVrSupported }),
  // The floor plan replaces the 3D view, which a headset can't show
  setIsVrPresenting: (isVrPresenting) =>
    set(isVrPresenting ? { isVrPresenting, isFloorPlanOpen: false } : { isVrPresenting }),
  setVrHudVisible: (vrHudVisible) => set({ vrHudVisible }),
  triggerVrRecenter: () => set((state) => ({ vrRecenterCount: state.vrRecenterCount + 1 })),
  setToggleVrSession: (toggleVrSession) => set({ toggleVrSession }),

  setGetLiveCameraPose: (getLiveCameraPose) => set({ getLiveCameraPose }),
  setRenderStoryboardShots: (renderStoryboardShots) => set({ renderStoryboardShots }),
  addExtraShotFromCamera: (name) => {
    const { getLiveCameraPose, storyboardExtraShots, venueSource } = get();
    const pose = getLiveCameraPose?.();
    if (!pose) return null;
    if (storyboardExtraShots.filter((e) => e.venue === venueSource).length >= MAX_EXTRA_SHOTS) return null;
    const taken = new Set(storyboardExtraShots.map((e) => e.id));
    let n = storyboardExtraShots.length + 1;
    while (taken.has(`shot-${n}`)) n++;
    const id = `shot-${n}`;
    set({
      storyboardExtraShots: [
        ...storyboardExtraShots,
        { id, name, venue: venueSource, eye: [...pose.eye], yaw: pose.yaw, pitch: pose.pitch, fov: pose.fov },
      ],
    });
    return id;
  },
  renameExtraShot: (id, name) =>
    set((state) => ({ storyboardExtraShots: state.storyboardExtraShots.map((e) => (e.id === id ? { ...e, name } : e)) })),
  removeExtraShot: (id) =>
    set((state) => ({ storyboardExtraShots: state.storyboardExtraShots.filter((e) => e.id !== id) })),

  captureStoryboardSet: async (label) => {
    const state = get();
    if (state.isCapturing) return { ok: false, message: 'A capture is already running.' };
    if (!state.renderStoryboardShots) return { ok: false, message: 'The 3D view is not ready to capture yet.' };
    const shots = storyboardShots(state, SEAT_PRESETS);
    if (shots.length === 0) return { ok: false, message: 'Place at least one camera view first.' };
    set({ isCapturing: true });
    try {
      await settleScene();
      const render = get().renderStoryboardShots;
      if (!render) return { ok: false, message: 'The 3D view is not ready to capture yet.' };
      const blobs = await render(shots);
      const setId = nextStoryboardId('set');
      const frames = blobs.map((blob, i) => makeFrame(shots[i], blob));
      set((s) => ({ storyboardSets: [...s.storyboardSets, { id: setId, label, frames }] }));
      return { ok: true, setId };
    } catch (err) {
      return { ok: false, message: captureMessage(err) };
    } finally {
      set({ isCapturing: false });
    }
  },
  retakeStoryboardFrame: async (setId, frameId) => {
    const state = get();
    const frame = state.storyboardSets.find((x) => x.id === setId)?.frames.find((f) => f.id === frameId);
    if (!frame) return { ok: false, message: 'That frame is no longer there.' };
    if (state.isCapturing) return { ok: false, message: 'A capture is already running.' };
    if (!state.renderStoryboardShots) return { ok: false, message: 'The 3D view is not ready to capture yet.' };
    set({ isCapturing: true });
    try {
      await settleScene();
      const render = get().renderStoryboardShots;
      if (!render) return { ok: false, message: 'The 3D view is not ready to capture yet.' };
      const [blob] = await render([frame.shot]);
      const url = URL.createObjectURL(blob);
      // The frame may have been deleted while rendering; then there's nothing to replace
      const stillThere = get()
        .storyboardSets.find((x) => x.id === setId)
        ?.frames.some((f) => f.id === frameId);
      if (!stillThere) {
        URL.revokeObjectURL(url);
        return { ok: true, setId };
      }
      set((s) => ({
        storyboardSets: s.storyboardSets.map((x) =>
          x.id === setId ? { ...x, frames: x.frames.map((f) => (f.id === frameId ? { ...f, blob, url } : f)) } : x
        ),
      }));
      URL.revokeObjectURL(frame.url);
      return { ok: true, setId };
    } catch (err) {
      return { ok: false, message: captureMessage(err) };
    } finally {
      set({ isCapturing: false });
    }
  },
  captureCurrentViewFrame: async (setId) => {
    const state = get();
    const pose = state.getLiveCameraPose?.();
    if (!pose) return { ok: false, message: 'The 3D view is not ready to capture yet.' };
    if (state.isCapturing) return { ok: false, message: 'A capture is already running.' };
    if (!state.renderStoryboardShots) return { ok: false, message: 'The 3D view is not ready to capture yet.' };
    set({ isCapturing: true });
    try {
      const existing = get().storyboardSets;
      const target =
        (setId && existing.find((x) => x.id === setId)) || (setId ? undefined : existing[existing.length - 1]);
      if (setId && !target) return { ok: false, message: 'That set is no longer there.' };
      const customCount = existing.reduce((n, x) => n + x.frames.filter((f) => f.shot.id.startsWith('custom-')).length, 0);
      const shot: CameraShot = {
        id: nextStoryboardId('custom'),
        name: `Custom view ${customCount + 1}`,
        eye: [...pose.eye],
        yaw: pose.yaw,
        pitch: pose.pitch,
        fov: pose.fov,
      };
      // The pose is already taken; this only clears the gizmo and picker out of the frame
      await settleScene();
      const [blob] = await get().renderStoryboardShots!([shot]);
      const frame = makeFrame(shot, blob);
      if (target) {
        set((s) => ({
          storyboardSets: s.storyboardSets.map((x) => (x.id === target.id ? { ...x, frames: [...x.frames, frame] } : x)),
        }));
        return { ok: true, setId: target.id };
      }
      const newId = nextStoryboardId('set');
      set((s) => ({
        storyboardSets: [...s.storyboardSets, { id: newId, label: `Set ${s.storyboardSets.length + 1}`, frames: [frame] }],
      }));
      return { ok: true, setId: newId };
    } catch (err) {
      return { ok: false, message: captureMessage(err) };
    } finally {
      set({ isCapturing: false });
    }
  },
  renameStoryboardSet: (setId, label) =>
    set((state) => ({ storyboardSets: state.storyboardSets.map((x) => (x.id === setId ? { ...x, label } : x)) })),
  deleteStoryboardFrame: (setId, frameId) => {
    const target = get().storyboardSets.find((x) => x.id === setId)?.frames.find((f) => f.id === frameId);
    if (!target) return;
    URL.revokeObjectURL(target.url);
    set((state) => ({
      storyboardSets: state.storyboardSets
        .map((x) => (x.id === setId ? { ...x, frames: x.frames.filter((f) => f.id !== frameId) } : x))
        // A set with nothing in it has nothing to show or export
        .filter((x) => x.frames.length > 0),
    }));
  },
  deleteStoryboardSet: (setId) => {
    const target = get().storyboardSets.find((x) => x.id === setId);
    if (!target) return;
    target.frames.forEach((f) => URL.revokeObjectURL(f.url));
    set((state) => ({ storyboardSets: state.storyboardSets.filter((x) => x.id !== setId) }));
  },
  clearStoryboard: () => {
    get().storyboardSets.forEach((x) => x.frames.forEach((f) => URL.revokeObjectURL(f.url)));
    set({ storyboardSets: [] });
  },
  setIsStoryboardOpen: (isStoryboardOpen) => {
    if (!isStoryboardOpen) get().clearStoryboard();
    set({ isStoryboardOpen });
  },

  setShowPresenterSilhouette: (showPresenterSilhouette) => set({ showPresenterSilhouette, showPresenter: showPresenterSilhouette }),
  setPresenterOffset: (presenterOffset) => set({ presenterOffset }),
  setShowPresenter: (showPresenter) => set({ showPresenter }),
  setShowLectern: (showLectern) => set({ showLectern }),
  setLecternOffset: (lecternOffset) => set({ lecternOffset }),
  setShowPanel: (showPanel) => set({ showPanel }),
  setPanelOffset: (panelOffset) => set({ panelOffset }),

  setTelemetry: (telemetry) => set({ telemetry }),
  setRoomName: (roomName) => set({ roomName }),
  setRoomNotes: (roomNotes) => set({ roomNotes }),
  saveRoom: async () => {
    try {
      const state = get();
      let glb: Uint8Array | null = null;
      if (state.venueSource === 'custom-glb') {
        if (!state.customGlbUrl) return { ok: false, message: 'Load a venue model before saving the room.' };
        // A local blob: URL, so this read never touches the network
        glb = new Uint8Array(await (await fetch(state.customGlbUrl)).arrayBuffer());
      }
      const room = roomFromState(get(), { savedAt: new Date().toISOString() });
      const bytes = packRoomFile(room, glb);
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/zip' }), roomFileName(get().roomName));
      set({ roomBaseline: roomKey(get()) });
      return { ok: true };
    } catch (err) {
      console.error('Saving the room failed:', err);
      return { ok: false, message: "The room couldn't be saved. Please try again." };
    }
  },
  loadRoom: async (file) => {
    // Nothing below calls set() until the whole file has been read and checked,
    // so any failure leaves the current room exactly as it was.
    let parsed;
    let glb: Uint8Array | null;
    try {
      const unpacked = unpackRoomFile(new Uint8Array(await file.arrayBuffer()));
      glb = unpacked.glb;
      parsed = parseRoomDocument(unpacked.json);
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "This file isn't a StageSight room." };
    }
    if (!parsed.ok) {
      if (parsed.detail) console.warn('Room file rejected:', parsed.detail);
      return { ok: false, message: parsed.message };
    }
    const room = parsed.room;

    if (room.venue.source === 'custom-glb') {
      if (!glb) return { ok: false, message: 'This room file is missing its venue model.' };
      if (!(await validateGlb(glb))) {
        return {
          ok: false,
          message: "The venue model in this room file couldn't be read. Your current room hasn't changed.",
        };
      }
      const url = URL.createObjectURL(new Blob([glb as BlobPart], { type: 'model/gltf-binary' }));
      // Revokes the previous blob URL and resets per-model state
      get().setCustomGlbUrl(url);
      // venueYaw goes in directly: setVenueYaw would turn the saved screens and views a second time
      set(roomToState(room));
    } else {
      get().setCustomGlbUrl(null);
      set(roomToState(room));
    }
    set({ roomBaseline: roomKey(get()) });
    return { ok: true, name: room.name, notes: room.notes };
  },
  setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setIsGuideOpen: (isGuideOpen) => set({ isGuideOpen }),
}));

// A fresh session has nothing unsaved
useStageStore.setState({ roomBaseline: roomKey(useStageStore.getState()) });

/** True when the room differs from how it was last saved or opened. */
export const hasUnsavedRoomChanges = (state: StageState): boolean => roomKey(state) !== state.roomBaseline;
