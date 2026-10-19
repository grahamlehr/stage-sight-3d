import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tube } from './geometryHelpers';

/**
 * A stacking banquet chair, the standard hire chair in hotel ballrooms and
 * conference centers: an upholstered seat and slightly reclined back on a
 * tubular steel frame. Built as two merged geometries (upholstery and frame) so
 * a whole room of chairs renders in a handful of instanced draw calls.
 *
 * Local space: the chair faces -Z (toward the stage), its seat centered on the
 * origin, standing on y = 0. Seat height 0.46m, overall height 0.92m.
 */

const SEAT_TOP = 0.46;
const SEAT_THICKNESS = 0.07;
const FRAME_Y = SEAT_TOP - SEAT_THICKNESS; // seat rails sit under the cushion
const TUBE_RADIUS = 0.011;
const BACK_TILT = 0.14; // ~8° recline
const LEG_X = 0.205;

const frameTube = (a: THREE.Vector3, b: THREE.Vector3, radius = TUBE_RADIUS) => tube(a, b, radius);

/** Point on the reclined back uprights, `rise` meters up them from the seat rails. */
const backPoint = (x: number, rise: number) =>
  new THREE.Vector3(x, FRAME_Y + rise * Math.cos(BACK_TILT), 0.2 + rise * Math.sin(BACK_TILT));

export const createBanquetChairGeometry = () => {
  // ---- Upholstery: seat cushion with a little crown, and a padded back ----
  const seat = new RoundedBoxGeometry(0.46, SEAT_THICKNESS, 0.44, 2, 0.028);
  seat.translate(0, SEAT_TOP - SEAT_THICKNESS / 2, -0.01);

  const backHeight = 0.4;
  const back = new RoundedBoxGeometry(0.44, backHeight, 0.055, 2, 0.022);
  back.translate(0, backHeight / 2, 0);
  back.rotateX(BACK_TILT);
  // Pad starts a little above the seat so the gap reads like a real chair, and
  // sits just in front of the uprights so the frame shows from behind
  const backBase = backPoint(0, 0.11);
  back.translate(0, backBase.y, backBase.z - 0.04);

  const upholstery = mergeGeometries([seat, back]);
  seat.dispose();
  back.dispose();

  // ---- Frame: tubular steel legs, seat rails and back uprights ----
  const parts: THREE.BufferGeometry[] = [];
  [-LEG_X, LEG_X].forEach((x) => {
    const frontFoot = new THREE.Vector3(x, 0, -0.215);
    const frontTop = new THREE.Vector3(x, FRAME_Y, -0.2);
    const rearFoot = new THREE.Vector3(x, 0, 0.26);
    const rearSeat = new THREE.Vector3(x, FRAME_Y, 0.2);
    const backTop = backPoint(x, 0.53);
    parts.push(
      frameTube(frontFoot, frontTop),
      frameTube(rearFoot, rearSeat),
      frameTube(rearSeat, backTop),
      frameTube(frontTop, rearSeat), // side seat rail
    );
    // Nylon floor glides
    [frontFoot, rearFoot].forEach((foot) => {
      const glide = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 8);
      glide.translate(foot.x, 0.006, foot.z);
      parts.push(glide);
    });
  });
  // Front and rear seat rails, and the stretcher between the back legs
  parts.push(
    frameTube(new THREE.Vector3(-LEG_X, FRAME_Y, -0.2), new THREE.Vector3(LEG_X, FRAME_Y, -0.2)),
    frameTube(new THREE.Vector3(-LEG_X, FRAME_Y, 0.2), new THREE.Vector3(LEG_X, FRAME_Y, 0.2)),
    frameTube(new THREE.Vector3(-LEG_X, 0.12, 0.245), new THREE.Vector3(LEG_X, 0.12, 0.245), 0.008),
    frameTube(backPoint(-LEG_X, 0.53), backPoint(LEG_X, 0.53)), // top of the back frame
  );

  const frame = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());

  upholstery.computeBoundingSphere();
  frame.computeBoundingSphere();
  return { upholstery, frame };
};
