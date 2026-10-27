import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveSeatPresets, SEAT_PRESETS, selectPrimaryScreen, selectSelectedScreen, useStageStore } from './useStageStore';
import { STAGE } from '../components/canvas/venue/roomLayout';
import { pairHalfWidth } from '../utils/presenterPair';

// Floor footprints (half-widths, meters) of the props in PresenterSilhouette,
// taken from their contact shadows, which are wider than the props themselves
// The presenters are two people side by side, so their footprint is the pair's
const PRESENTER_HALF = { x: pairHalfWidth(), z: 0.38 };
const LECTERN_HALF = { x: 0.5, z: 0.42 };
const PANEL_SEAT_XS = [-2.6, -0.9, 0.9, 2.6];
const PANEL_SEAT_RADIUS = 0.5;
/** The panelists' feet reach this far in front of the chair centers. */
const PANEL_FRONT_REACH = 0.6;
/** Clearance kept between any prop and the deck's front edge. */
const FRONT_EDGE_MARGIN = 0.35;

interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const around = (x: number, z: number, halfX: number, halfZ: number, frontZ = halfZ): Footprint => ({
  minX: x - halfX,
  maxX: x + halfX,
  minZ: z - halfZ,
  maxZ: z + frontZ,
});

const overlaps = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

const defaultFootprints = () => {
  const state = useStageStore.getState();
  const { presenterOffset, lecternOffset, panelOffset } = state;
  const [sx, , sz] = selectPrimaryScreen(state).position;
  const presenter = around(sx + presenterOffset[0], sz + presenterOffset[1], PRESENTER_HALF.x, PRESENTER_HALF.z);
  const lectern = around(sx + lecternOffset[0], sz + lecternOffset[1], LECTERN_HALF.x, LECTERN_HALF.z);
  const seats = PANEL_SEAT_XS.map((x) =>
    around(sx + panelOffset[0] + x, sz + panelOffset[1], PANEL_SEAT_RADIUS, PANEL_SEAT_RADIUS, PANEL_FRONT_REACH)
  );
  return { presenter, lectern, seats };
};

describe('default occlusion prop offsets', () => {
  it('keep the presenter and lectern clear of the panel chairs', () => {
    const { presenter, lectern, seats } = defaultFootprints();
    seats.forEach((seat) => {
      expect(overlaps(presenter, seat)).toBe(false);
      expect(overlaps(lectern, seat)).toBe(false);
    });
    expect(overlaps(presenter, lectern)).toBe(false);
  });

  it('keep every prop on the default stage deck, back from its front edge', () => {
    const { presenter, lectern, seats } = defaultFootprints();
    const screenZ = selectPrimaryScreen(useStageStore.getState()).position[2];
    [presenter, lectern, ...seats].forEach((prop) => {
      expect(prop.minX).toBeGreaterThan(-STAGE.width / 2);
      expect(prop.maxX).toBeLessThan(STAGE.width / 2);
      // In front of the screen, so they can block it, but not at the lip
      expect(prop.minZ).toBeGreaterThan(screenZ);
      expect(prop.maxZ).toBeLessThanOrEqual(STAGE.frontZ - FRONT_EDGE_MARGIN);
    });
  });
});

const Q = Math.PI / 2;
const initial = useStageStore.getState();

describe('venue rotation', () => {
  beforeEach(() => {
    useStageStore.setState(initial, true);
  });

  it('snaps the venue yaw to a quarter turn', () => {
    useStageStore.getState().setVenueYaw(Q + 0.2);
    expect(useStageStore.getState().venueYaw).toBeCloseTo(Q);
  });

  it('carries the seat round with the venue', () => {
    // Regression: auto-aligning a venue left the seat at its old world
    // position, which ended up beside the screen at 129° off-axis
    useStageStore.setState({ seatPosition: [-3, 0, -14.3] });
    useStageStore.getState().setVenueYaw(Q);
    const [x, y, z] = useStageStore.getState().seatPosition;
    expect(x).toBeCloseTo(-14.3);
    expect(y).toBe(0);
    expect(z).toBeCloseTo(3);
  });

  it('turns the seat by the change in yaw, not the absolute yaw', () => {
    useStageStore.setState({ venueYaw: Q, seatPosition: [1, 0, 0] });
    useStageStore.getState().setVenueYaw(Q);
    expect(useStageStore.getState().seatPosition).toEqual([1, 0, 0]);
  });

  it('resets the yaw when a different model is loaded', () => {
    useStageStore.setState({ customGlbUrl: '/a.glb', venueYaw: Q });
    useStageStore.getState().setCustomGlbUrl('/b.glb');
    expect(useStageStore.getState().venueYaw).toBe(0);
  });
});

describe('custom venue deck height', () => {
  beforeEach(() => {
    useStageStore.setState(initial, true);
  });

  it('never goes below the floor', () => {
    useStageStore.getState().setCustomDeckHeight(-0.5);
    expect(useStageStore.getState().customDeckHeight).toBe(0);
  });

  it('resets when a different model is loaded', () => {
    // Regression: the props stood on the ballroom's 1m deck in every custom
    // venue, floating 0.7m above a real venue's 0.3m stage
    useStageStore.setState({ customGlbUrl: '/a.glb', customDeckHeight: 0.3 });
    useStageStore.getState().setCustomGlbUrl('/b.glb');
    expect(useStageStore.getState().customDeckHeight).toBe(0);
  });
});

describe('custom camera views', () => {
  beforeEach(() => {
    useStageStore.setState(initial, true);
  });

  const useCustomVenue = () => useStageStore.setState({ venueSource: 'custom-glb', customGlbUrl: '/a.glb' });

  it('start unplaced and reset when a different model is loaded', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(1, { position: [1, 0.3, 4], yaw: 0.5 });
    useStageStore.setState({ seatYaw: 1, isFloorPlanOpen: true });
    useStageStore.getState().setCustomGlbUrl('/b.glb');
    const state = useStageStore.getState();
    expect(state.customSeatViews).toEqual([null, null, null, null]);
    expect(state.seatYaw).toBeNull();
    expect(state.isFloorPlanOpen).toBe(false);
  });

  it('survive reloading the same URL', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 4], yaw: 0.5 });
    useStageStore.getState().setCustomGlbUrl('/a.glb');
    expect(useStageStore.getState().customSeatViews[0]).not.toBeNull();
  });

  it('turn with the venue, along with their headings and the seat heading', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(0, { position: [-3, 0.4, -14.3], yaw: 0 });
    useStageStore.setState({ seatYaw: Math.PI });
    useStageStore.getState().setVenueYaw(Q);
    const state = useStageStore.getState();
    const view = state.customSeatViews[0]!;
    expect(view.position[0]).toBeCloseTo(-14.3);
    expect(view.position[1]).toBe(0.4);
    expect(view.position[2]).toBeCloseTo(3);
    expect(view.yaw).toBeCloseTo(Q);
    expect(state.seatYaw).toBeCloseTo(Math.PI + Q);
    expect(state.customSeatViews[1]).toBeNull();
  });

  it('wraps a turned yaw into [0, 2π)', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(0, { position: [0, 0, 0], yaw: 1.5 * Math.PI });
    useStageStore.getState().setVenueYaw(Math.PI);
    expect(useStageStore.getState().customSeatViews[0]!.yaw).toBeCloseTo(0.5 * Math.PI);
  });

  it('are applied by the custom venue presets, position, heading and all', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(2, { position: [5, 1.2, -2], yaw: 2 });
    useStageStore.getState().applySeatPreset('custom-view-3');
    const state = useStageStore.getState();
    expect(state.seatPosition).toEqual([5, 1.2, -2]);
    expect(state.seatYaw).toBe(2);
    expect(state.navigationMode).toBe('seated');
  });

  it('are ignored while unplaced', () => {
    useCustomVenue();
    useStageStore.getState().applySeatPreset('custom-view-1');
    // The ballroom ids don't apply to a custom venue either
    useStageStore.getState().applySeatPreset('front-center');
    const state = useStageStore.getState();
    expect(state.seatPosition).toEqual(initial.seatPosition);
    expect(state.navigationMode).toBe('orbit');
  });

  it('are skipped when cycling, and cycling does nothing with none placed', () => {
    useCustomVenue();
    useStageStore.getState().cycleSeatPreset(1);
    expect(useStageStore.getState().navigationMode).toBe('orbit');

    useStageStore.getState().setCustomSeatView(1, { position: [1, 0, 1], yaw: 0 });
    useStageStore.getState().setCustomSeatView(3, { position: [9, 0, 9], yaw: 1 });
    useStageStore.getState().cycleSeatPreset(1);
    expect(useStageStore.getState().seatPosition).toEqual([1, 0, 1]);
    useStageStore.getState().cycleSeatPreset(1);
    expect(useStageStore.getState().seatPosition).toEqual([9, 0, 9]);
    expect(useStageStore.getState().seatYaw).toBe(1);
    useStageStore.getState().cycleSeatPreset(1);
    expect(useStageStore.getState().seatPosition).toEqual([1, 0, 1]);
  });

  it('lets click-to-sit go back to looking at the screen', () => {
    useStageStore.setState({ seatYaw: 2 });
    useStageStore.getState().setSeatPosition([1, 0, 1]);
    expect(useStageStore.getState().seatYaw).toBeNull();
  });

  it('are listed as unplaced presets, while the ballroom keeps its own', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 1], yaw: 0 });
    const custom = getActiveSeatPresets(useStageStore.getState());
    expect(custom.map((p) => p.placed)).toEqual([true, false, false, false]);
    expect(custom[1].description).toBe('Not placed yet');

    useStageStore.setState({ venueSource: 'default-ballroom' });
    const ballroom = getActiveSeatPresets(useStageStore.getState());
    expect(ballroom.map((p) => p.id)).toEqual(SEAT_PRESETS.map((p) => p.id));
    expect(ballroom.every((p) => p.placed)).toBe(true);
  });

  it('open on the Venue tab at the first unplaced view, from the seat presets menu', () => {
    useCustomVenue();
    useStageStore.setState({
      customVenueBounds: { min: [-10, 0, -10], max: [10, 6, 10] },
      isSidebarOpen: false,
      activeSidebarTab: 'source',
      floorPlanSlot: 3,
    });
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 4], yaw: 0 });
    useStageStore.getState().openFloorPlanToPlaceViews();
    const state = useStageStore.getState();
    expect(state.isSidebarOpen).toBe(true);
    expect(state.activeSidebarTab).toBe('venue');
    expect(state.isFloorPlanOpen).toBe(true);
    expect(state.floorPlanSlot).toBe(1);
  });

  it('wait for the model to load before opening the floor plan', () => {
    useCustomVenue();
    useStageStore.getState().openFloorPlanToPlaceViews();
    expect(useStageStore.getState().activeSidebarTab).toBe('venue');
    expect(useStageStore.getState().isFloorPlanOpen).toBe(false);
  });

  it('close the floor plan on switching to the ballroom or entering VR', () => {
    useCustomVenue();
    useStageStore.setState({ isFloorPlanOpen: true });
    useStageStore.getState().setVenueSource('default-ballroom');
    expect(useStageStore.getState().isFloorPlanOpen).toBe(false);

    useStageStore.setState({ isFloorPlanOpen: true });
    useStageStore.getState().setIsVrPresenting(true);
    expect(useStageStore.getState().isFloorPlanOpen).toBe(false);
  });
});

describe('screens', () => {
  const store = () => useStageStore.getState();
  beforeEach(() => {
    useStageStore.setState(initial, true);
  });

  it('start as one default 32:9 screen that is primary and selected', () => {
    expect(store().screens).toHaveLength(1);
    const screen = selectPrimaryScreen(store());
    expect(screen).toMatchObject({ width: 16, height: 4.5, position: [0, 3.4, -12], role: 'split', boundMeshName: null });
    expect(selectSelectedScreen(store())).toBe(screen);
    expect(store().splitOrder).toBeNull();
    expect(store().demoSideScreens).toBe(false);
  });

  it('add screens with unique ids, repeat role and a numbered name', () => {
    const a = store().addScreen();
    const b = store().addScreen();
    const c = store().addScreen({ id: a, name: 'Clash' });
    expect(new Set([a, b, c, 'main']).size).toBe(4);
    expect(store().screens.find((s) => s.id === a)).toMatchObject({ name: 'Screen 2', role: 'repeat' });
    expect(store().screens.find((s) => s.id === c)?.name).toBe('Clash');
  });

  it('keep ids unique after a removal frees a number', () => {
    const a = store().addScreen();
    store().addScreen();
    store().removeScreen(a);
    const c = store().addScreen();
    expect(new Set(store().screens.map((s) => s.id)).size).toBe(store().screens.length);
    expect(store().screens.some((s) => s.id === c)).toBe(true);
  });

  it('refuse to remove the last screen', () => {
    store().removeScreen('main');
    expect(store().screens).toHaveLength(1);
  });

  it('move primary and selected on when their screen is removed', () => {
    const a = store().addScreen();
    store().setPrimaryScreen(a);
    store().setSelectedScreen(a);
    store().removeScreen(a);
    expect(store().primaryScreenId).toBe('main');
    expect(store().selectedScreenId).toBe('main');
  });

  it('ignore unknown ids when choosing primary or selected', () => {
    store().setPrimaryScreen('nope');
    store().setSelectedScreen('nope');
    expect(store().primaryScreenId).toBe('main');
    expect(store().selectedScreenId).toBe('main');
  });

  it('edit only the selected screen with the size, preset, position and rotation setters', () => {
    const a = store().addScreen();
    store().setSelectedScreen(a);
    store().setScreenDimensions(5, 3);
    store().setScreenPreset('16-9');
    store().setScreenPosition([1, 2, 3]);
    store().setScreenRotation([0, 0.5, 0]);
    expect(store().screens.find((s) => s.id === a)).toMatchObject({
      width: 8,
      height: 4.5,
      position: [1, 2, 3],
      rotation: [0, 0.5, 0],
    });
    expect(selectPrimaryScreen(store())).toMatchObject({ width: 16, position: [0, 3.4, -12] });
  });

  it('set roles one at a time and all at once', () => {
    const a = store().addScreen();
    store().setScreenRole(a, 'split');
    expect(store().screens.find((s) => s.id === a)?.role).toBe('split');
    store().setAllScreenRoles('repeat');
    expect(store().screens.every((s) => s.role === 'repeat')).toBe(true);
  });

  it('materialise the auto split order on the first move, then swap', () => {
    const left = store().addScreen({ id: 'l', role: 'split', position: [-10, 3, -12] });
    const right = store().addScreen({ id: 'r', role: 'split', position: [10, 3, -12] });
    // Auto order is by X: l, main, r
    store().moveScreenInSplit(right, -1);
    expect(store().splitOrder).toEqual([left, 'r', 'main']);
    store().moveScreenInSplit(left, -1); // already first
    expect(store().splitOrder).toEqual([left, 'r', 'main']);
    store().resetSplitOrder();
    expect(store().splitOrder).toBeNull();
  });

  it('drop a removed screen from the split order', () => {
    store().addScreen({ id: 'l', role: 'split', position: [-10, 3, -12] });
    store().moveScreenInSplit('l', 1);
    store().removeScreen('l');
    expect(store().splitOrder).toEqual(['main']);
  });
});

describe('demo side screens', () => {
  const store = () => useStageStore.getState();
  beforeEach(() => {
    useStageStore.setState(initial, true);
  });

  it('add an angled repeat pair, turned in towards the audience, once only', () => {
    store().setDemoSideScreens(true);
    store().setDemoSideScreens(true);
    expect(store().screens).toHaveLength(3);
    const left = store().screens.find((s) => s.id === 'demo-left')!;
    const right = store().screens.find((s) => s.id === 'demo-right')!;
    expect(left).toMatchObject({ width: 3.2, height: 1.8, position: [-8.6, 3.4, -10.5], role: 'repeat' });
    expect(right.position).toEqual([8.6, 3.4, -10.5]);
    expect(left.rotation[1]).toBeCloseTo(0.45);
    expect(right.rotation[1]).toBeCloseTo(-0.45);
    expect(store().demoSideScreens).toBe(true);
  });

  it('go away when switched off, and re-point primary and selected', () => {
    store().setDemoSideScreens(true);
    store().setPrimaryScreen('demo-left');
    store().setSelectedScreen('demo-right');
    store().setDemoSideScreens(false);
    expect(store().screens.map((s) => s.id)).toEqual(['main']);
    expect(store().primaryScreenId).toBe('main');
    expect(store().selectedScreenId).toBe('main');
    expect(store().demoSideScreens).toBe(false);
  });

  it('are removed on switching to a custom venue', () => {
    store().setDemoSideScreens(true);
    store().setVenueSource('custom-glb');
    expect(store().screens.map((s) => s.id)).toEqual(['main']);
    expect(store().demoSideScreens).toBe(false);
  });
});

describe('screens and the custom venue', () => {
  const store = () => useStageStore.getState();
  beforeEach(() => {
    useStageStore.setState(initial, true);
  });

  it('turn mesh-bound screens with the venue and leave free ones alone', () => {
    const bound = store().addScreen({
      id: 'wall',
      position: [-3, 3, -14.3],
      rotation: [0, 0.2, 0],
      boundMeshName: 'Screen_Mesh',
    });
    store().setVenueYaw(Q);
    const turned = store().screens.find((s) => s.id === bound)!;
    expect(turned.position[0]).toBeCloseTo(-14.3);
    expect(turned.position[1]).toBe(3);
    expect(turned.position[2]).toBeCloseTo(3);
    expect(turned.rotation[1]).toBeCloseTo(0.2 + Q);
    expect(selectPrimaryScreen(store())).toMatchObject({ position: [0, 3.4, -12], rotation: [0, 0, 0] });
  });

  it('wrap a turned screen rotation into [0, 2π)', () => {
    store().addScreen({ id: 'wall', boundMeshName: 'm', rotation: [0, 1.9 * Math.PI, 0] });
    store().setVenueYaw(Math.PI);
    const y = store().screens.find((s) => s.id === 'wall')!.rotation[1];
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(2 * Math.PI);
    expect(y).toBeCloseTo(0.9 * Math.PI);
  });

  it('go back to the single default screen when a different model is loaded', () => {
    useStageStore.setState({ customGlbUrl: '/a.glb' });
    const id = store().addScreen({ boundMeshName: 'm' });
    store().setPrimaryScreen(id);
    store().setSelectedScreen(id);
    store().setCustomGlbUrl('/b.glb');
    expect(store().screens).toHaveLength(1);
    expect(store().screens[0].id).toBe('main');
    expect(store().primaryScreenId).toBe('main');
    expect(store().selectedScreenId).toBe('main');
    expect(store().splitOrder).toBeNull();
  });

  it('keep the screens when the same URL is set again', () => {
    useStageStore.setState({ customGlbUrl: '/a.glb' });
    store().addScreen();
    store().setCustomGlbUrl('/a.glb');
    expect(store().screens).toHaveLength(2);
  });
});
