import { beforeEach, describe, expect, it } from 'vitest';
import { useStageStore } from './useStageStore';
import { STAGE } from '../components/canvas/venue/roomLayout';

// Floor footprints (half-widths, meters) of the props in PresenterSilhouette,
// taken from their contact shadows, which are wider than the props themselves
const PRESENTER_HALF = { x: 0.42, z: 0.38 };
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
  const { screenPosition, presenterOffset, lecternOffset, panelOffset } = useStageStore.getState();
  const [sx, , sz] = screenPosition;
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
    const screenZ = useStageStore.getState().screenPosition[2];
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
