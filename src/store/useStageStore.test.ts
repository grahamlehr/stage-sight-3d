import { describe, expect, it } from 'vitest';
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
