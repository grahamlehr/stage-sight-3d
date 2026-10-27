import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SIT_CLICK_MAX_TRAVEL_PX, isSitClick, shouldSitOnClick } from './clickToSit';

/** Floor at y = 0 and an 8m × 4.5m screen standing on it at z = -12. */
function buildRoom() {
  const scene = new THREE.Scene();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial());
  floor.rotation.x = -Math.PI / 2;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.5), new THREE.MeshBasicMaterial());
  screen.position.set(0, 2.25, -12);
  scene.add(floor, screen);
  scene.updateMatrixWorld(true);
  return { scene, floor, screen };
}

/** Where a ray from the eye meets the floor, as R3F reports it to the floor's handler. */
function floorClick(scene: THREE.Scene, floor: THREE.Mesh, origin: THREE.Vector3, target: THREE.Vector3, delta = 0) {
  const ray = new THREE.Ray(origin, target.clone().sub(origin).normalize());
  const hit = new THREE.Raycaster(ray.origin, ray.direction).intersectObject(floor)[0];
  expect(hit).toBeDefined();
  return shouldSitOnClick({ delta, distance: hit.distance, ray }, scene);
}

describe('isSitClick', () => {
  it('accepts a press that barely moved', () => {
    expect(isSitClick(0)).toBe(true);
    expect(isSitClick(SIT_CLICK_MAX_TRAVEL_PX)).toBe(true);
  });

  it('rejects a look-around drag', () => {
    expect(isSitClick(SIT_CLICK_MAX_TRAVEL_PX + 1)).toBe(false);
    expect(isSitClick(120)).toBe(false);
  });
});

describe('shouldSitOnClick', () => {
  const eye = new THREE.Vector3(0, 1.2, 2);

  it('sits on a click on open floor', () => {
    const { scene, floor } = buildRoom();
    expect(floorClick(scene, floor, eye, new THREE.Vector3(3, 0, 6))).toBe(true);
  });

  // Regression: a press on the screen to start looking around reached the floor
  // behind it and moved the seat to the front of the stage
  it('ignores the floor behind a screen', () => {
    const { scene, floor } = buildRoom();
    // The floor 2m behind the screen: the ray to it passes through the screen
    const target = new THREE.Vector3(0, 0, -14);
    expect(floorClick(scene, floor, eye, target)).toBe(false);
  });

  it('ignores a drag even on open floor', () => {
    const { scene, floor } = buildRoom();
    expect(floorClick(scene, floor, eye, new THREE.Vector3(3, 0, 6), 30)).toBe(false);
  });

  it('sees through hidden meshes', () => {
    const { scene, floor, screen } = buildRoom();
    screen.visible = false;
    const target = new THREE.Vector3(0, 0, -14);
    expect(floorClick(scene, floor, eye, target)).toBe(true);
  });
});
