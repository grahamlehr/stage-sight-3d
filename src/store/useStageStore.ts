import { create } from 'zustand';
import { hasDismissedGuide } from '../utils/firstRunGuide';
import { normaliseQuarterTurn, rotateAboutY } from '../utils/venueAlignment';
import { normaliseYaw } from '../utils/floorPlan';

export type VenueSource = 'default-ballroom' | 'custom-glb';
export type ScreenMode = 'procedural' | 'mesh-bind';
export type SourceType = 'test-pattern' | 'pdf' | 'hdmi-capture' | 'screen-share';
export type UvCropMode = 'auto-letterbox' | 'top-aligned' | 'fill-1-to-1' | 'manual';
export type NavigationMode = 'orbit' | 'seated';
export type FovMode = 'room-context' | 'eye-focus';

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
  screenMode: ScreenMode;
  isPickingMesh: boolean;
  boundMeshName: string | null;
  screenWidth: number;
  screenHeight: number;
  screenPosition: [number, number, number];
  screenRotation: [number, number, number];
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

  setScreenMode: (mode: ScreenMode) => void;
  setIsPickingMesh: (picking: boolean) => void;
  setBoundMeshName: (name: string | null) => void;
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
  screenMode: 'procedural',
  isPickingMesh: false,
  boundMeshName: null,
  screenWidth: 16.0,
  screenHeight: 4.5,
  screenPosition: [0, 3.4, -12],
  screenRotation: [0, 0, 0],
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
  setVenueSource: (venueSource) =>
    set(
      venueSource === 'default-ballroom'
        ? { venueSource, isFloorPlanOpen: false, seatYaw: null }
        : { venueSource }
    ),
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
          }
    );
  },
  setVenueYaw: (yaw) => {
    // Carry the seat round with the room so the viewer stays in the same chair
    // rather than being left wherever that world position now lands
    // and every placed view with it, keeping each one's position and heading
    // fixed relative to the room
    const { venueYaw, seatPosition, seatYaw, customSeatViews } = get();
    const next = normaliseQuarterTurn(yaw);
    const delta = next - venueYaw;
    set({
      venueYaw: next,
      seatPosition: rotateAboutY(seatPosition, delta),
      seatYaw: seatYaw === null ? null : normaliseYaw(seatYaw + delta),
      customSeatViews: customSeatViews.map((view) =>
        view ? { position: rotateAboutY(view.position, delta), yaw: normaliseYaw(view.yaw + delta) } : null
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

  setScreenMode: (screenMode) => set({ screenMode }),
  setIsPickingMesh: (isPickingMesh) => set({ isPickingMesh }),
  setBoundMeshName: (boundMeshName) => set({ boundMeshName }),
  setScreenDimensions: (screenWidth, screenHeight) => set({ screenWidth, screenHeight }),
  setScreenPreset: (presetId) => {
    const preset = ASPECT_RATIO_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      set({ screenWidth: preset.width, screenHeight: preset.height });
    }
  },
  setScreenPosition: (screenPosition) => set({ screenPosition }),
  setScreenRotation: (screenRotation) => set({ screenRotation }),
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
