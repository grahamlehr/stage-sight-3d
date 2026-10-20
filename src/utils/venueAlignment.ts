export type Vec3 = [number, number, number];

const QUARTER = Math.PI / 2;

/** Snaps an angle to the nearest quarter turn and wraps it into [0, 2π). */
export function normaliseQuarterTurn(yaw: number): number {
  const quarters = ((Math.round(yaw / QUARTER) % 4) + 4) % 4;
  return quarters * QUARTER;
}

/**
 * Rotates a world point about the Y axis through the origin, matching
 * three.js's Object3D rotation.y (counter-clockwise looking down from +Y).
 */
export function rotateAboutY([x, y, z]: Vec3, yaw: number): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const round = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);
  return [round(x * c + z * s), y, round(-x * s + z * c)];
}

export interface ScreenMeshAlignment {
  /** Quarter-turn yaw to add to the venue so the wall faces +Z. */
  yawDelta: number;
  /** Where to put the preview screen: the wall's front face after the turn, plus the standoff. */
  center: Vec3;
  /** Preview screen width in metres, rounded to 0.1m, minimum 1m. */
  width: number;
  /** Preview screen height in metres, rounded to 0.1m, minimum 1m. */
  height: number;
  /** Unit vector the wall faces in before the turn, snapped to the X or Z axis. */
  facing: Vec3;
  /** How far the wall's front face sits in front of its centre, in metres. */
  halfDepth: number;
}

/** Gap between the wall's front face and the preview screen, so they don't z-fight. */
export const SCREEN_STANDOFF = 0.02;

const toTenth = (v: number) => Math.max(1, Math.round(v * 10) / 10);

/**
 * Works out how to turn a custom venue so a picked screen mesh faces the
 * audience at +Z, which is the only direction the preview screen and the
 * off-axis telemetry support.
 *
 * The wall's facing axis is its thinner horizontal extent (a wall facing ±X is
 * thin in X). The facing sign points from the wall towards the viewpoint the
 * mesh was picked from: people click the side they can see, which is the
 * audience side. The venue's bounding-box centre is no use here, because
 * backstage areas behind the wall can pull it the wrong way.
 *
 * All inputs are world-space with the venue's current rotation already
 * applied; the venue turns about the world origin.
 */
export function alignScreenMesh(
  meshCenter: Vec3,
  meshSize: Vec3,
  viewPoint: Vec3,
): ScreenMeshAlignment {
  const [sx, sy, sz] = meshSize;
  const facesX = sx < sz;

  // Unit vector the wall faces in, snapped to an axis
  const toViewer = facesX ? viewPoint[0] - meshCenter[0] : viewPoint[2] - meshCenter[2];
  const sign = toViewer < 0 ? -1 : 1;
  const dx = facesX ? sign : 0;
  const dz = facesX ? 0 : sign;

  // rotateAboutY maps (dx, dz) to (0, 1) when yaw = -atan2(dx, dz)
  const yawDelta = normaliseQuarterTurn(-Math.atan2(dx, dz));
  const oddQuarter = Math.round(yawDelta / QUARTER) % 2 === 1;

  const [cx, cy, cz] = rotateAboutY(meshCenter, yawDelta);
  const depth = facesX ? sx : sz;

  return {
    yawDelta,
    center: [cx, cy, cz + depth / 2 + SCREEN_STANDOFF],
    width: toTenth(oddQuarter ? sz : sx),
    height: toTenth(sy),
    facing: [dx, 0, dz],
    halfDepth: depth / 2,
  };
}

/** How far in front of the wall to look for the stage deck. */
export const DECK_PROBE_DISTANCE = 1.0;

/**
 * Where to start a straight-down ray that finds the stage deck in front of a
 * picked screen wall: DECK_PROBE_DISTANCE in front of its front face, at the
 * wall's centre height so the ray starts above the deck but below the rig.
 * Uses the pre-turn world coordinates the alignment was computed from.
 */
export function deckProbeOrigin(meshCenter: Vec3, alignment: ScreenMeshAlignment): Vec3 {
  const reach = alignment.halfDepth + DECK_PROBE_DISTANCE;
  const [fx, , fz] = alignment.facing;
  return [meshCenter[0] + fx * reach, meshCenter[1], meshCenter[2] + fz * reach];
}
