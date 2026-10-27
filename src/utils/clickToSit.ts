import * as THREE from 'three';

/**
 * Pointer travel, in CSS pixels, beyond which a press counts as a drag rather
 * than a click. Seated look-around starts with the same left press as
 * click-to-sit, so a drag must never move the seat.
 */
export const SIT_CLICK_MAX_TRAVEL_PX = 4;

/** Distance slack, in metres, when matching a hit against the nearest one. */
const HIT_TOLERANCE = 1e-3;

/** Whether a press that moved `travelPx` before release is a click, not a drag. */
export function isSitClick(travelPx: number): boolean {
  return travelPx <= SIT_CLICK_MAX_TRAVEL_PX;
}

/** A mesh the user can actually see: it and every ancestor visible, with a visible material. */
function isVisibleSurface(object: THREE.Object3D): boolean {
  if (!(object as THREE.Mesh).isMesh) return false;
  for (let o: THREE.Object3D | null = object; o; o = o.parent) {
    if (!o.visible) return false;
  }
  const material = (object as THREE.Mesh).material;
  const materials = Array.isArray(material) ? material : [material];
  return materials.some((m) => m.visible);
}

/**
 * Whether the surface hit at `hitDistance` is the nearest visible thing along
 * the ray. R3F hands a click to every object under the pointer that has a
 * handler, and screens and the stage have none, so a click on a screen also
 * reaches the floor behind it.
 */
export function isNearestVisibleHit(hitDistance: number, hits: THREE.Intersection[]): boolean {
  const nearest = hits.find((h) => isVisibleSurface(h.object));
  return !nearest || nearest.distance >= hitDistance - HIT_TOLERANCE;
}

/**
 * Whether a click on a floor or chair should sit there: a click rather than a
 * look-around drag, and the floor or chair is the first thing the ray meets.
 * `root` is the scene to test against.
 */
export function shouldSitOnClick(
  click: { delta: number; distance: number; ray: THREE.Ray },
  root: THREE.Object3D,
): boolean {
  if (!isSitClick(click.delta)) return false;
  const raycaster = new THREE.Raycaster();
  raycaster.ray.copy(click.ray);
  return isNearestVisibleHit(click.distance, raycaster.intersectObject(root, true));
}
