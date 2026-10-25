import { create } from 'zustand';
import { hasDismissedGuide } from '../utils/firstRunGuide';
import { normaliseQuarterTurn, rotateAboutY } from '../utils/venueAlignment';
import { normaliseYaw } from '../utils/floorPlan';
import { orderSplitScreens } from '../utils/screenLayout';

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
}

/** A camera view placed by hand on a custom venue's floor plan. World coordinates, metres. */
export interface CustomSeatView {
  position: [number, number, number]; // y is the floor height that was clicked
  yaw: number;
}

export const CUSTOM_VIEW_COUNT = 4;

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
    name: `View ${i + 1}`,
    description: view ? 'Placed on the floor plan' : 'Not placed yet',
    position: view ? view.position : [0, 0, 0],
    yaw: view ? view.yaw : undefined,
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
  fovMode: FovMode;

  // WebXR / Meta Quest VR State
  isVrSupported: boolean;
  isVrPresenting: boolean;
  vrHudVisible: boolean;
  vrRecenterCount: number;
  toggleVrSession: (() => Promise<void>) | null;

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
  setFloorPlanCutHeight: (height: number | null) => void;
  setSeatView: (position: [number, number, number], yaw: number | null) => void;
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

  setShowPresenterSilhouette: (show: boolean) => void;
  setPresenterOffset: (offset: [number, number]) => void;
  setShowPresenter: (show: boolean) => void;
  setShowLectern: (show: boolean) => void;
  setLecternOffset: (offset: [number, number]) => void;
  setShowPanel: (show: boolean) => void;
  setPanelOffset: (offset: [number, number]) => void;

  setTelemetry: (telemetry: DiscasTelemetry) => void;
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
  fovMode: 'room-context',

  // WebXR / Meta Quest VR Defaults
  isVrSupported: false,
  isVrPresenting: false,
  vrHudVisible: true,
  vrRecenterCount: 0,
  toggleVrSession: null,

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

  // UI State
  activeSidebarTab: 'source',
  isSidebarOpen: true,
  // First-run tour: open until the user dismisses it with "Don't show again"
  isGuideOpen: !hasDismissedGuide(),

  // Actions
  setVenueSource: (venueSource) => {
    if (venueSource === 'default-ballroom') {
      set({ venueSource, isFloorPlanOpen: false, seatYaw: null });
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
    const { venueYaw, seatPosition, seatYaw, customSeatViews, screens } = get();
    const next = normaliseQuarterTurn(yaw);
    const delta = next - venueYaw;
    set({
      venueYaw: next,
      seatPosition: rotateAboutY(seatPosition, delta),
      seatYaw: seatYaw === null ? null : normaliseYaw(seatYaw + delta),
      customSeatViews: customSeatViews.map((view) =>
        view ? { position: rotateAboutY(view.position, delta), yaw: normaliseYaw(view.yaw + delta) } : null
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
        i === slot ? (view ? { position: [...view.position], yaw: view.yaw } : null) : existing
      ),
    })),
  setCustomVenueBounds: (customVenueBounds) => set({ customVenueBounds }),
  setIsFloorPlanOpen: (isFloorPlanOpen) => set({ isFloorPlanOpen }),
  setFloorPlanSlot: (slot) => set({ floorPlanSlot: Math.max(0, Math.min(CUSTOM_VIEW_COUNT - 1, Math.round(slot))) }),
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
  setSeatPosition: (seatPosition) => set({ seatPosition, seatYaw: null }),
  setSeatView: (seatPosition, seatYaw) => set({ seatPosition, seatYaw }),
  setFovMode: (fovMode) => set({ fovMode }),
  applySeatPreset: (presetId) => {
    const preset = getActiveSeatPresets(get()).find((p) => p.id === presetId);
    if (preset && preset.placed) {
      set({
        seatPosition: preset.position,
        seatYaw: preset.yaw ?? null,
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

  setShowPresenterSilhouette: (showPresenterSilhouette) => set({ showPresenterSilhouette, showPresenter: showPresenterSilhouette }),
  setPresenterOffset: (presenterOffset) => set({ presenterOffset }),
  setShowPresenter: (showPresenter) => set({ showPresenter }),
  setShowLectern: (showLectern) => set({ showLectern }),
  setLecternOffset: (lecternOffset) => set({ lecternOffset }),
  setShowPanel: (showPanel) => set({ showPanel }),
  setPanelOffset: (panelOffset) => set({ panelOffset }),

  setTelemetry: (telemetry) => set({ telemetry }),
  setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setIsGuideOpen: (isGuideOpen) => set({ isGuideOpen }),
}));
