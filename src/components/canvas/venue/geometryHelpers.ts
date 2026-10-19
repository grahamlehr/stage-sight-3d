import * as THREE from 'three';

/** An open-ended tube (cylinder) running from a to b. */
export const tube = (a: THREE.Vector3, b: THREE.Vector3, radius: number, radialSegments = 6) => {
  const dir = new THREE.Vector3().subVectors(b, a);
  const geo = new THREE.CylinderGeometry(radius, radius, dir.length(), radialSegments, 1, true);
  geo.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  geo.translate(mid.x, mid.y, mid.z);
  return geo;
};

/**
 * A curtain-like plane facing +Z with vertical sine pleats, for stage skirting
 * and drape. Centered on the origin, `width` along X and `height` along Y.
 */
export const pleatedPanel = (width: number, height: number, pleatWidth: number, pleatDepth: number) => {
  const segmentsPerPleat = 8;
  const segments = Math.max(1, Math.round((width / pleatWidth) * segmentsPerPleat));
  const geo = new THREE.PlaneGeometry(width, height, segments, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, (pleatDepth / 2) * Math.sin(((x + width / 2) / pleatWidth) * Math.PI * 2));
  }
  geo.computeVertexNormals();
  return geo;
};
