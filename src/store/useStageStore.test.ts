import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveSeatPresets, SEAT_PRESETS, selectPrimaryScreen, selectSelectedScreen, useStageStore } from './useStageStore';
import { STAGE } from '../components/canvas/venue/roomLayout';
import { pairHalfWidth } from '../utils/presenterPair';
import { hasUnsavedRoomChanges } from './useStageStore';
import { packRoomFile, roomFromState, roomKey } from '../utils/roomFile';
import { zipSync, strToU8 } from 'fflate';
import { discardParsedVenue, parseGlb, stashParsedVenue } from '../utils/glbValidate';
import { downloadBlob } from '../utils/download';

vi.mock('../utils/glbValidate', () => ({
  parseGlb: vi.fn(async () => ({ isGroup: true })),
  stashParsedVenue: vi.fn(),
  discardParsedVenue: vi.fn(),
}));
vi.mock('../utils/download', () => ({ downloadBlob: vi.fn() }));

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
    useStageStore.getState().setCustomSeatView(1, { position: [1, 0.3, 4], yaw: 0.5, pitch: 0, fov: 50, name: '' });
    useStageStore.setState({ seatYaw: 1, isFloorPlanOpen: true });
    useStageStore.getState().setCustomGlbUrl('/b.glb');
    const state = useStageStore.getState();
    expect(state.customSeatViews).toEqual([null, null, null, null]);
    expect(state.seatYaw).toBeNull();
    expect(state.isFloorPlanOpen).toBe(false);
  });

  it('survive reloading the same URL', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 4], yaw: 0.5, pitch: 0, fov: 50, name: '' });
    useStageStore.getState().setCustomGlbUrl('/a.glb');
    expect(useStageStore.getState().customSeatViews[0]).not.toBeNull();
  });

  it('turn with the venue, along with their headings and the seat heading', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(0, { position: [-3, 0.4, -14.3], yaw: 0, pitch: 0, fov: 50, name: '' });
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
    useStageStore.getState().setCustomSeatView(0, { position: [0, 0, 0], yaw: 1.5 * Math.PI, pitch: 0, fov: 50, name: '' });
    useStageStore.getState().setVenueYaw(Math.PI);
    expect(useStageStore.getState().customSeatViews[0]!.yaw).toBeCloseTo(0.5 * Math.PI);
  });

  it('are applied by the custom venue presets, position, heading and all', () => {
    useCustomVenue();
    useStageStore.getState().setCustomSeatView(2, { position: [5, 1.2, -2], yaw: 2, pitch: 0, fov: 50, name: '' });
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

    useStageStore.getState().setCustomSeatView(1, { position: [1, 0, 1], yaw: 0, pitch: 0, fov: 50, name: '' });
    useStageStore.getState().setCustomSeatView(3, { position: [9, 0, 9], yaw: 1, pitch: 0, fov: 50, name: '' });
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
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 1], yaw: 0, pitch: 0, fov: 50, name: '' });
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
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 4], yaw: 0, pitch: 0, fov: 50, name: '' });
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


describe('room file load and save', () => {
  const asFile = (bytes: Uint8Array) => new Blob([bytes as BlobPart]);
  const GLB = new Uint8Array([1, 2, 3, 4, 5]);

  /** A saved custom room: a bound screen plus a free one, quarter-turned venue, two views. */
  const customRoomBytes = () => {
    const state = {
      ...useStageStore.getState(),
      venueSource: 'custom-glb' as const,
      venueYaw: Q,
      customDeckHeight: 0.6,
      customGlbUrl: null,
      screens: [
        { id: 'a', name: 'Wall', width: 8, height: 4.5, position: [1.25, 3, -9] as [number, number, number], rotation: [0, Q, 0] as [number, number, number], role: 'split' as const, boundMeshName: 'LED' },
        { id: 'b', name: 'Free', width: 3, height: 2, position: [4, 2, -3] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], role: 'repeat' as const, boundMeshName: null },
      ],
      primaryScreenId: 'a',
      splitOrder: ['b', 'a'],
      customSeatViews: [{ position: [1, 0, 5] as [number, number, number], yaw: 1.5, pitch: 0, fov: 50, name: '' }, null, null, { position: [-2, 0, 9] as [number, number, number], yaw: 0, pitch: 0, fov: 50, name: '' }],
      roomName: 'Hilton',
      roomNotes: 'Level 2',
    };
    return packRoomFile(roomFromState(state, { savedAt: 'x' }), GLB);
  };

  const snapshot = () => {
    const s = useStageStore.getState();
    return {
      screens: s.screens,
      customSeatViews: s.customSeatViews,
      venueSource: s.venueSource,
      customGlbUrl: s.customGlbUrl,
      venueYaw: s.venueYaw,
      key: roomKey(s),
    };
  };

  beforeEach(() => {
    useStageStore.setState(initial, true);
    vi.mocked(parseGlb).mockResolvedValue({ isGroup: true } as never);
    vi.mocked(parseGlb).mockClear();
    vi.mocked(stashParsedVenue).mockClear();
    vi.mocked(discardParsedVenue).mockClear();
    vi.mocked(downloadBlob).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('a fresh session has no unsaved changes', () => {
    expect(hasUnsavedRoomChanges(useStageStore.getState())).toBe(false);
  });

  it('leaves the room untouched for garbage, a newer file, or a failing GLB', async () => {
    const url = URL.createObjectURL(new Blob(['x']));
    useStageStore.setState({ customGlbUrl: url, venueYaw: Q, venueSource: 'custom-glb' });
    const before = snapshot();
    let changes = 0;
    const unsubscribe = useStageStore.subscribe(() => changes++);
    const revoke = vi.spyOn(URL, 'revokeObjectURL');

    const garbage = await useStageStore.getState().loadRoom(asFile(new Uint8Array([9, 9, 9, 9, 9, 9])));
    expect(garbage.ok).toBe(false);

    const newerRoom = { ...roomFromState(useStageStore.getState(), { savedAt: 'x' }), formatVersion: 3 };
    const newer = await useStageStore.getState().loadRoom(asFile(zipSync({ 'room.json': strToU8(JSON.stringify(newerRoom)) })));
    expect(newer).toMatchObject({ ok: false, message: expect.stringContaining('newer version') });

    vi.mocked(parseGlb).mockResolvedValue(null);
    const badGlb = await useStageStore.getState().loadRoom(asFile(customRoomBytes()));
    expect(badGlb).toMatchObject({ ok: false, message: expect.stringContaining("couldn't be read") });

    expect(snapshot()).toEqual(before);
    unsubscribe();
    expect(changes).toBe(0);
    expect(revoke).not.toHaveBeenCalled();
    URL.revokeObjectURL(url);
  });

  it('fails cleanly when a custom room has no model inside', async () => {
    const room = roomFromState({ ...useStageStore.getState(), venueSource: 'custom-glb' }, { savedAt: 'x' });
    const before = snapshot();
    const result = await useStageStore.getState().loadRoom(asFile(packRoomFile(room, null)));
    expect(result).toMatchObject({ ok: false, message: 'This room file is missing its venue model.' });
    expect(snapshot()).toEqual(before);
  });

  it('loads a custom room: swaps the blob URL, keeps positions, no double rotation, not dirty', async () => {
    const oldUrl = URL.createObjectURL(new Blob(['x']));
    useStageStore.setState({ customGlbUrl: oldUrl });
    const revoke = vi.spyOn(URL, 'revokeObjectURL');

    const result = await useStageStore.getState().loadRoom(asFile(customRoomBytes()));
    expect(result).toEqual({ ok: true, name: 'Hilton', notes: 'Level 2' });

    const s = useStageStore.getState();
    expect(revoke).toHaveBeenCalledWith(oldUrl);
    // The old URL's unshown model is freed; the new one is handed over already parsed
    expect(discardParsedVenue).toHaveBeenCalledWith(oldUrl);
    expect(parseGlb).toHaveBeenCalledTimes(1);
    expect(stashParsedVenue).toHaveBeenCalledWith(s.customGlbUrl, { isGroup: true });
    expect(s.customGlbUrl).toMatch(/^blob:/);
    expect(s.customGlbUrl).not.toBe(oldUrl);
    expect(s.venueSource).toBe('custom-glb');
    expect(s.venueYaw).toBe(Q);
    expect(s.screens.find((x) => x.id === 'a')?.position).toEqual([1.25, 3, -9]);
    expect(s.screens.find((x) => x.id === 'a')?.rotation).toEqual([0, Q, 0]);
    expect(s.customSeatViews[0]).toEqual({ position: [1, 0, 5], yaw: 1.5, pitch: 0, fov: 50, name: '' });
    expect(s.customSeatViews[3]).toEqual({ position: [-2, 0, 9], yaw: 0, pitch: 0, fov: 50, name: '' });
    expect(s.splitOrder).toEqual(['b', 'a']);
    expect(s.primaryScreenId).toBe('a');
    expect(s.selectedScreenId).toBe('a');
    expect(s.roomName).toBe('Hilton');
    expect(hasUnsavedRoomChanges(s)).toBe(false);
    URL.revokeObjectURL(s.customGlbUrl!);
  });

  it('loads a demo ballroom room and clears the uploaded model', async () => {
    const oldUrl = URL.createObjectURL(new Blob(['x']));
    useStageStore.setState({ customGlbUrl: oldUrl, venueSource: 'custom-glb' });
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const room = roomFromState({ ...initial, stageHeight: 1.7, roomName: 'Demo', roomNotes: '' }, { savedAt: 'x' });

    const result = await useStageStore.getState().loadRoom(asFile(packRoomFile(room, null)));
    expect(result.ok).toBe(true);
    const s = useStageStore.getState();
    expect(s.customGlbUrl).toBeNull();
    expect(revoke).toHaveBeenCalledWith(oldUrl);
    expect(s.venueSource).toBe('default-ballroom');
    expect(s.stageHeight).toBe(1.7);
    expect(parseGlb).not.toHaveBeenCalled();
    expect(hasUnsavedRoomChanges(s)).toBe(false);
  });

  it('edits make the room dirty and saving clears it', async () => {
    useStageStore.getState().setStageHeight(2);
    expect(hasUnsavedRoomChanges(useStageStore.getState())).toBe(true);
    useStageStore.getState().setRoomName('Ballroom A');

    const result = await useStageStore.getState().saveRoom();
    expect(result).toEqual({ ok: true });
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadBlob).mock.calls[0][1]).toBe('Ballroom A.stagesight');
    expect(hasUnsavedRoomChanges(useStageStore.getState())).toBe(false);
  });

  it('saves a custom room with its model, and refuses when no model is loaded', async () => {
    useStageStore.setState({ venueSource: 'custom-glb', customGlbUrl: null });
    expect(await useStageStore.getState().saveRoom()).toEqual({
      ok: false,
      message: 'Load a venue model before saving the room.',
    });
    expect(downloadBlob).not.toHaveBeenCalled();

    vi.stubGlobal('fetch', vi.fn(async () => new Response(GLB)));
    useStageStore.setState({ customGlbUrl: 'blob:http://localhost/fake' });
    expect(await useStageStore.getState().saveRoom()).toEqual({ ok: true });
    const blob = vi.mocked(downloadBlob).mock.calls[0][0];
    const { unzipSync } = await import('fflate');
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(entries).sort()).toEqual(['room.json', 'venue.glb']);
    expect(Array.from(entries['venue.glb'])).toEqual(Array.from(GLB));
  });
});

describe('camera views', () => {
  beforeEach(() => {
    useStageStore.setState(initial, true);
  });

  it('applying a custom view sets the pitch and the field of view mode', () => {
    useStageStore.setState({ venueSource: 'custom-glb' });
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 4], yaw: 0.5, pitch: -0.2, fov: 25, name: 'Back' });
    useStageStore.getState().applySeatPreset('custom-view-1');
    const s = useStageStore.getState();
    expect([s.seatYaw, s.seatPitch, s.fovMode]).toEqual([0.5, -0.2, 'eye-focus']);
    s.setSeatPosition([0, 0, 0]);
    expect(useStageStore.getState().seatPitch).toBeNull();
  });

  it('names a view and falls back to View N', () => {
    useStageStore.setState({ venueSource: 'custom-glb' });
    useStageStore.getState().setCustomSeatView(1, { position: [1, 0, 4], yaw: 0, pitch: 0, fov: 50, name: '' });
    expect(getActiveSeatPresets(useStageStore.getState())[1].name).toBe('View 2');
    useStageStore.getState().renameCustomSeatView(1, 'Balcony');
    expect(getActiveSeatPresets(useStageStore.getState())[1].name).toBe('Balcony');
  });

  it('updates a view from the live camera, keeping its name', () => {
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 4], yaw: 0, pitch: 0, fov: 50, name: 'Keep' });
    useStageStore.getState().updateCustomSeatViewFromCamera(0);
    expect(useStageStore.getState().customSeatViews[0]!.yaw).toBe(0);
    useStageStore.setState({ getLiveCameraPose: () => ({ eye: [2, 1.7, 3], yaw: 1, pitch: 0.1, fov: 25 }) });
    useStageStore.getState().updateCustomSeatViewFromCamera(0);
    const view = useStageStore.getState().customSeatViews[0]!;
    expect(view.position[0]).toBe(2);
    expect(view.position[1]).toBeCloseTo(0.5);
    expect(view).toMatchObject({ position: [2, expect.any(Number), 3], yaw: 1, pitch: 0.1, fov: 25, name: 'Keep' });
  });

  it('turning the venue carries a view with its pitch, fov and name', () => {
    useStageStore.getState().setCustomSeatView(0, { position: [1, 0, 4], yaw: 0, pitch: -0.3, fov: 25, name: 'N' });
    useStageStore.getState().setVenueYaw(Math.PI / 2);
    expect(useStageStore.getState().customSeatViews[0]).toMatchObject({ pitch: -0.3, fov: 25, name: 'N' });
  });
});

describe('extra shots', () => {
  const pose = { eye: [1, 1.7, 2] as [number, number, number], yaw: 0.5, pitch: 0, fov: 50 };
  beforeEach(() => {
    useStageStore.setState({ ...initial, getLiveCameraPose: () => pose }, true);
  });

  it('adds from the camera, at most four per venue', () => {
    const { addExtraShotFromCamera } = useStageStore.getState();
    for (let i = 0; i < 4; i++) expect(addExtraShotFromCamera(`Shot ${i}`)).toBeTruthy();
    expect(addExtraShotFromCamera('Fifth')).toBeNull();
    expect(useStageStore.getState().storyboardExtraShots).toHaveLength(4);
    // The other venue has its own allowance
    useStageStore.setState({ venueSource: 'custom-glb' });
    expect(useStageStore.getState().addExtraShotFromCamera('Custom')).toBeTruthy();
  });

  it('returns null without a live camera, and renames and removes', () => {
    useStageStore.setState({ getLiveCameraPose: null });
    expect(useStageStore.getState().addExtraShotFromCamera('x')).toBeNull();
    useStageStore.setState({ getLiveCameraPose: () => pose });
    const id = useStageStore.getState().addExtraShotFromCamera('x')!;
    useStageStore.getState().renameExtraShot(id, 'Doors');
    expect(useStageStore.getState().storyboardExtraShots[0].name).toBe('Doors');
    useStageStore.getState().removeExtraShot(id);
    expect(useStageStore.getState().storyboardExtraShots).toEqual([]);
  });

  it('a new custom model drops the custom-venue shots; turning the venue rotates them', () => {
    useStageStore.setState({ venueSource: 'custom-glb' });
    useStageStore.getState().addExtraShotFromCamera('Custom');
    useStageStore.setState({ venueSource: 'default-ballroom' });
    useStageStore.getState().addExtraShotFromCamera('Ballroom');
    useStageStore.getState().setVenueYaw(Math.PI / 2);
    const [custom, ballroom] = useStageStore.getState().storyboardExtraShots;
    expect(custom.yaw).toBeCloseTo(0.5 + Math.PI / 2);
    expect(ballroom.yaw).toBe(0.5);
    useStageStore.getState().setCustomGlbUrl('blob:new-model');
    expect(useStageStore.getState().storyboardExtraShots.map((e) => e.name)).toEqual(['Ballroom']);
  });
});

describe('storyboard frames', () => {
  const makeBlob = (n: number) => new Blob([String(n)], { type: 'image/jpeg' });
  let counter = 0;
  let created: string[];
  let revoke: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    counter = 0;
    created = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      const url = `blob:frame-${++counter}`;
      created.push(url);
      return url;
    });
    revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    useStageStore.setState(
      {
        ...initial,
        renderStoryboardShots: vi.fn(async (shots: unknown[]) => shots.map((_, i) => makeBlob(i))),
        getLiveCameraPose: () => ({ eye: [0, 1.5, 0], yaw: 0, pitch: 0, fov: 50 }),
      },
      true,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('captures one frame per shot in order and clears overlays', async () => {
    useStageStore.setState({ showTransformGizmo: true, isPickingMesh: true });
    const result = await useStageStore.getState().captureStoryboardSet('Your draft');
    expect(result.ok).toBe(true);
    const s = useStageStore.getState();
    expect(s.isCapturing).toBe(false);
    expect(s.showTransformGizmo).toBe(false);
    expect(s.isPickingMesh).toBe(false);
    expect(s.storyboardSets).toHaveLength(1);
    expect(s.storyboardSets[0].label).toBe('Your draft');
    expect(s.storyboardSets[0].frames.map((f) => f.shot.id)).toEqual(SEAT_PRESETS.map((p) => `seat-${p.id}`));
    expect(s.storyboardSets[0].frames.map((f) => f.url)).toEqual(created);
  });

  it('fails cleanly with no shots or no renderer', async () => {
    useStageStore.setState({ venueSource: 'custom-glb' });
    expect(await useStageStore.getState().captureStoryboardSet('x')).toEqual({
      ok: false,
      message: 'Place at least one camera view first.',
    });
    useStageStore.setState({ venueSource: 'default-ballroom', renderStoryboardShots: null });
    expect((await useStageStore.getState().captureStoryboardSet('x')).ok).toBe(false);
    expect(useStageStore.getState().storyboardSets).toEqual([]);
    expect(useStageStore.getState().isCapturing).toBe(false);
  });

  it('reports a render failure and still clears isCapturing', async () => {
    useStageStore.setState({ renderStoryboardShots: async () => { throw new Error('Leave VR before capturing a storyboard.'); } });
    expect(await useStageStore.getState().captureStoryboardSet('x')).toEqual({
      ok: false,
      message: 'Leave VR before capturing a storyboard.',
    });
    expect(useStageStore.getState().isCapturing).toBe(false);
  });

  it('retake replaces the blob and URL and revokes the old URL', async () => {
    await useStageStore.getState().captureStoryboardSet('A');
    const set = useStageStore.getState().storyboardSets[0];
    const old = set.frames[1];
    await useStageStore.getState().retakeStoryboardFrame(set.id, old.id);
    const frame = useStageStore.getState().storyboardSets[0].frames[1];
    expect(frame.id).toBe(old.id);
    expect(frame.url).not.toBe(old.url);
    expect(revoke).toHaveBeenCalledWith(old.url);
    expect(useStageStore.getState().storyboardSets[0].frames).toHaveLength(4);
  });

  it('deleting a frame revokes it and drops a set left empty', async () => {
    await useStageStore.getState().captureStoryboardSet('A');
    const set = useStageStore.getState().storyboardSets[0];
    useStageStore.getState().deleteStoryboardFrame(set.id, set.frames[0].id);
    expect(revoke).toHaveBeenCalledWith(set.frames[0].url);
    expect(useStageStore.getState().storyboardSets[0].frames).toHaveLength(3);
    for (const f of useStageStore.getState().storyboardSets[0].frames) {
      useStageStore.getState().deleteStoryboardFrame(set.id, f.id);
    }
    expect(useStageStore.getState().storyboardSets).toEqual([]);
  });

  it('deleting a set revokes all its URLs, and renaming works', async () => {
    await useStageStore.getState().captureStoryboardSet('A');
    await useStageStore.getState().captureStoryboardSet('B');
    const [a, b] = useStageStore.getState().storyboardSets;
    useStageStore.getState().renameStoryboardSet(b.id, 'Our concept');
    expect(useStageStore.getState().storyboardSets[1].label).toBe('Our concept');
    useStageStore.getState().deleteStoryboardSet(a.id);
    for (const f of a.frames) expect(revoke).toHaveBeenCalledWith(f.url);
    expect(useStageStore.getState().storyboardSets.map((x) => x.id)).toEqual([b.id]);
  });

  it('closing the tray clears and revokes everything', async () => {
    useStageStore.getState().setIsStoryboardOpen(true);
    await useStageStore.getState().captureStoryboardSet('A');
    await useStageStore.getState().captureStoryboardSet('B');
    useStageStore.getState().setIsStoryboardOpen(false);
    expect(useStageStore.getState().storyboardSets).toEqual([]);
    expect(useStageStore.getState().isStoryboardOpen).toBe(false);
    expect(revoke).toHaveBeenCalledTimes(8);
    for (const url of created) expect(revoke).toHaveBeenCalledWith(url);
  });

  it('captures the current view into the last set, or a new one', async () => {
    const first = await useStageStore.getState().captureCurrentViewFrame(null);
    expect(first.ok).toBe(true);
    expect(useStageStore.getState().storyboardSets[0].label).toBe('Set 1');
    expect(useStageStore.getState().storyboardSets[0].frames[0].shot.name).toBe('Custom view 1');
    await useStageStore.getState().captureStoryboardSet('Draft');
    const [one, draft] = useStageStore.getState().storyboardSets;
    await useStageStore.getState().captureCurrentViewFrame(one.id);
    expect(useStageStore.getState().storyboardSets[0].frames.map((f) => f.shot.name)).toEqual(['Custom view 1', 'Custom view 2']);
    await useStageStore.getState().captureCurrentViewFrame(null);
    expect(useStageStore.getState().storyboardSets[1].frames).toHaveLength(draft.frames.length + 1);
  });

  it('drops a capture that finishes after the tray was closed', async () => {
    useStageStore.getState().setIsStoryboardOpen(true);
    let finish: (blobs: Blob[]) => void = () => {};
    useStageStore.setState({ renderStoryboardShots: () => new Promise<Blob[]>((resolve) => (finish = resolve)) });
    const capture = useStageStore.getState().captureStoryboardSet('A');
    await new Promise((resolve) => setTimeout(resolve, 200));
    useStageStore.getState().setIsStoryboardOpen(false);
    finish(SEAT_PRESETS.map((_, i) => makeBlob(i)));
    const result = await capture;
    expect(result.ok).toBe(false);
    expect(useStageStore.getState().storyboardSets).toEqual([]);
    expect(created).toEqual([]);
    expect(useStageStore.getState().isCapturing).toBe(false);
  });

  it('drops a current-view capture whose set was deleted while rendering', async () => {
    await useStageStore.getState().captureStoryboardSet('A');
    const [set] = useStageStore.getState().storyboardSets;
    const urlsBefore = created.length;
    let finish: (blobs: Blob[]) => void = () => {};
    useStageStore.setState({ renderStoryboardShots: () => new Promise<Blob[]>((resolve) => (finish = resolve)) });
    const capture = useStageStore.getState().captureCurrentViewFrame(set.id);
    await new Promise((resolve) => setTimeout(resolve, 200));
    useStageStore.getState().deleteStoryboardSet(set.id);
    finish([makeBlob(9)]);
    expect(await capture).toEqual({ ok: false, message: 'That set is no longer there.' });
    // No URL was made for the dropped frame, so none can leak
    expect(created).toHaveLength(urlsBefore);
    expect(useStageStore.getState().storyboardSets).toEqual([]);
  });
});
