import type { Vec3 } from './venueAlignment';

/** An axis-aligned box in world space, in metres. */
export interface PlanBounds {
  min: Vec3;
  max: Vec3;
}

const TWO_PI = Math.PI * 2;

/** Wraps a yaw into [0, 2π). */
export function normaliseYaw(yaw: number): number {
  const wrapped = ((yaw % TWO_PI) + TWO_PI) % TWO_PI;
  // Guard against -1e-17 style results rounding up to exactly 2π
  return wrapped >= TWO_PI ? 0 : wrapped;
}

/**
 * Horizontal look direction from one point to another, in radians. Yaw 0 looks
 * towards +Z and yaw π towards −Z, matching `Math.atan2(dx, dz)`.
 */
export function yawBetween(from: Vec3, to: Vec3): number {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

/**
 * The point a seated camera should `lookAt` for a given yaw. It lies along the
 * yaw horizontally, as far away as the screen is (at least 1m), at the screen
 * centre's height, so a view aimed at the screen looks exactly at its centre.
 */
export function seatedLookTarget(eye: Vec3, yaw: number, screenPosition: Vec3): Vec3 {
  const dx = screenPosition[0] - eye[0];
  const dz = screenPosition[2] - eye[2];
  const distance = Math.max(1, Math.hypot(dx, dz));
  return [eye[0] + Math.sin(yaw) * distance, screenPosition[1], eye[2] + Math.cos(yaw) * distance];
}

/** Height of the default section cut: 2.5m above the model's lowest point, never above its top. */
export function defaultCutHeight(bounds: PlanBounds): number {
  return Math.min(bounds.min[1] + 2.5, bounds.max[1]);
}

/**
 * Frames a venue for an orthographic camera looking straight down with
 * screen-up = −Z, so the screen wall sits at the top of the plan. `zoom` is in
 * pixels per metre, as three.js defines it when the frustum is the viewport
 * size. A side shorter than 1m is treated as 1m so a flat or empty model
 * can't produce an infinite zoom.
 */
export function planFrame(
  bounds: PlanBounds,
  viewportWidth: number,
  viewportHeight: number,
  margin = 0.9,
): { center: Vec3; zoom: number } {
  const sizeX = Math.max(1, bounds.max[0] - bounds.min[0]);
  const sizeZ = Math.max(1, bounds.max[2] - bounds.min[2]);
  const zoom = margin * Math.min(viewportWidth / sizeX, viewportHeight / sizeZ);
  return {
    center: [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2, (bounds.min[2] + bounds.max[2]) / 2],
    zoom,
  };
}

/**
 * The first raycast hit at or below the section cut. Raycasts ignore clipping
 * planes, so without this the ceiling would win. Hits are expected nearest
 * first, as three.js returns them.
 */
export function firstHitBelow<T extends { point: { y: number } }>(hits: T[], cutY: number): T | undefined {
  return hits.find((hit) => hit.point.y <= cutY);
}
