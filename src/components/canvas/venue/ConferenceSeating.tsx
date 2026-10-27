import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { SeatPlacement } from '../../../utils/seatingLayout';
import { createBanquetChairGeometry } from './banquetChair';
import { tiled, VenueTextures } from './venueTextures';
import { useDisposables } from './useDisposables';

interface ConferenceSeatingProps {
  seats: SeatPlacement[];
  textures: VenueTextures;
  envMap: THREE.Texture | null;
  onSeatPick: (seat: SeatPlacement, e: ThreeEvent<MouseEvent>) => void;
}

/** Deterministic per-chair jitter, so a set room looks hand-placed rather than stamped. */
const jitter = (i: number, salt: number) => {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

/**
 * Every chair in the room as two instanced meshes: upholstery and steel frame.
 * The chairs double as the seated-height occlusion layer in front of each seat,
 * and picking one sits the viewer in it.
 */
export const ConferenceSeating: React.FC<ConferenceSeatingProps> = ({
  seats,
  textures,
  envMap,
  onSeatPick,
}) => {
  const upholsteryRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => createBanquetChairGeometry(), []);
  const fabric = useMemo(() => tiled(textures.upholstery, 3, 3), [textures]);
  useDisposables(useMemo(() => [geometry.upholstery, geometry.frame, fabric], [geometry, fabric]));

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const meshes = [upholsteryRef.current, frameRef.current];
    seats.forEach((seat, i) => {
      dummy.position.set(seat.x + jitter(i, 1) * 0.012, 0, seat.z + jitter(i, 2) * 0.015);
      dummy.rotation.set(0, jitter(i, 3) * 0.025, 0);
      dummy.updateMatrix();
      meshes.forEach((mesh) => mesh?.setMatrixAt(i, dummy.matrix));
    });
    meshes.forEach((mesh) => {
      if (!mesh) return;
      mesh.instanceMatrix.needsUpdate = true;
      // Raycasting culls against this, so it must cover the new instances
      mesh.computeBoundingSphere();
    });
  }, [seats]);

  const handlePick = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId === undefined) return;
    const seat = seats[e.instanceId];
    if (seat) onSeatPick(seat, e);
  };

  if (seats.length === 0) return null;

  return (
    <group>
      <instancedMesh
        key={`upholstery-${seats.length}`}
        ref={upholsteryRef}
        args={[geometry.upholstery, undefined, seats.length]}
        castShadow
        receiveShadow
        onClick={handlePick}
      >
        <meshStandardMaterial
          color="#2a3550"
          map={fabric}
          bumpMap={fabric}
          bumpScale={1.5}
          roughness={0.92}
          metalness={0}
        />
      </instancedMesh>
      <instancedMesh
        key={`frame-${seats.length}`}
        ref={frameRef}
        args={[geometry.frame, undefined, seats.length]}
        castShadow
        receiveShadow
        onClick={handlePick}
      >
        <meshStandardMaterial
          color="#8d939c"
          roughness={0.38}
          metalness={0.85}
          envMap={envMap}
          envMapIntensity={0.45}
        />
      </instancedMesh>
    </group>
  );
};
