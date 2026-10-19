import { create } from 'zustand';
import { hasDismissedGuide } from '../utils/firstRunGuide';

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
  setVenueSource: (venueSource) => set({ venueSource }),
  setCustomGlbUrl: (customGlbUrl) => {
    // Single choke point for the uploaded venue blob: release the URL we are
    // replacing, otherwise every upload pins its whole file (often 10s–100s of
    // MB) in memory for the lifetime of the page.
    const previous = get().customGlbUrl;
    if (previous && previous !== customGlbUrl && previous.startsWith('blob:')) {
      URL.revokeObjectURL(previous);
    }
    set({ customGlbUrl });
  },
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
  setSeatPosition: (seatPosition) => set({ seatPosition }),
  setFovMode: (fovMode) => set({ fovMode }),
  applySeatPreset: (presetId) => {
    const preset = SEAT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      set({
        seatPosition: preset.position,
        navigationMode: 'seated',
      });
    }
  },
  cycleSeatPreset: (direction = 1) => {
    const currentPos = get().seatPosition;
    const currentIdx = SEAT_PRESETS.findIndex(
      (p) =>
        Math.abs(p.position[0] - currentPos[0]) < 0.25 &&
        Math.abs(p.position[2] - currentPos[2]) < 0.25
    );
    const nextIdx =
      currentIdx === -1
        ? 0
        : (currentIdx + direction + SEAT_PRESETS.length) % SEAT_PRESETS.length;
    set({
      seatPosition: SEAT_PRESETS[nextIdx].position,
      navigationMode: 'seated',
    });
  },

  setIsVrSupported: (isVrSupported) => set({ isVrSupported }),
  setIsVrPresenting: (isVrPresenting) => set({ isVrPresenting }),
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
