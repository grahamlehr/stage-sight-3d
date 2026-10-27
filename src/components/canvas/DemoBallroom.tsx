import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStageStore } from '../../store/useStageStore';
import { computeSeatingLayout, SeatPlacement } from '../../utils/seatingLayout';
import { shouldSitOnClick } from '../../utils/clickToSit';
import {
  CEILING_HEIGHT,
  computeRoomBounds,
  computeStairs,
  computeWalls,
  FRONT_ROW_Z,
  REAR_AISLE,
} from './venue/roomLayout';
import { createVenueTextures, disposeVenueTextures } from './venue/venueTextures';
import { RoomShell } from './venue/RoomShell';
import { StageDeck } from './venue/StageDeck';
import { ConferenceSeating } from './venue/ConferenceSeating';

/** Clearance kept between the stairs and the nearest chair. */
const STAIR_CLEARANCE = 0.5;

export const DemoBallroom: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const sceneRoot = useThree((s) => s.scene);
  const venueWidth = useStageStore((s) => s.venueWidth);
  const venueLength = useStageStore((s) => s.venueLength);
  const stageHeight = useStageStore((s) => s.stageHeight);
  const houseLightsIntensity = useStageStore((s) => s.houseLightsIntensity);
  const showCeilingFixtures = useStageStore((s) => s.showCeilingFixtures);
  const setSeatPosition = useStageStore((s) => s.setSeatPosition);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);

  const room = useMemo(() => computeRoomBounds(venueWidth, venueLength), [venueWidth, venueLength]);
  const stairs = useMemo(() => computeStairs(stageHeight), [stageHeight]);

  // Theatre-style conference seating, kept clear of the stage stairs
  const layout = useMemo(
    () =>
      computeSeatingLayout({
        roomMinX: room.minX,
        roomMaxX: room.maxX,
        frontRowZ: FRONT_ROW_Z,
        lastRowLimitZ: room.backZ - REAR_AISLE - 0.3,
        keepOut: stairs.map((f) => ({
          minX: f.x - f.width / 2 - STAIR_CLEARANCE,
          maxX: f.x + f.width / 2 + STAIR_CLEARANCE,
          minZ: -Infinity,
          maxZ: f.bottomZ + STAIR_CLEARANCE,
        })),
      }),
    [room, stairs],
  );
  const walls = useMemo(() => computeWalls(room, layout.crossAisleZ, layout.rowZ), [room, layout]);

  const textures = useMemo(() => createVenueTextures(), []);
  useEffect(() => () => disposeVenueTextures(textures), [textures]);

  // A procedural studio environment for reflections on chrome and steel only.
  // Without one, metallic materials render nearly black.
  const envTarget = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const scene = new RoomEnvironment();
    const target = pmrem.fromScene(scene, 0.04);
    scene.dispose();
    pmrem.dispose();
    return target;
  }, [gl]);
  useEffect(() => () => envTarget.dispose(), [envTarget]);

  // House lights run 0.1–2.2; normalize for the practical fixtures in the room
  const houseLevel = THREE.MathUtils.clamp(houseLightsIntensity / 1.8, 0, 1);

  const sitAt = (x: number, z: number) => {
    const clampedX = THREE.MathUtils.clamp(x, room.minX + 1, room.maxX - 1);
    const clampedZ = THREE.MathUtils.clamp(z, room.frontZ + 1, room.backZ - 1);
    setSeatPosition([clampedX, 0, clampedZ]);
    if (useStageStore.getState().navigationMode !== 'seated') {
      setNavigationMode('seated');
    }
  };

  // Click-to-sit. A click, not a press, because seated look-around drags start
  // with the same left press; and only when nothing (a screen, the stage) is in
  // front of the floor or chair.
  const wantsToSit = (e: ThreeEvent<MouseEvent>) =>
    (useStageStore.getState().navigationMode === 'seated' || e.shiftKey) && shouldSitOnClick(e, sceneRoot);

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (wantsToSit(e)) {
      e.stopPropagation();
      sitAt(e.point.x, e.point.z);
    }
  };

  // Clicking a chair sits in exactly that chair
  const handleSeatPick = (seat: SeatPlacement, e: ThreeEvent<MouseEvent>) => {
    if (wantsToSit(e)) {
      e.stopPropagation();
      sitAt(seat.x, seat.z);
    }
  };

  const trussLength = room.width - 2;

  return (
    <group>
      <RoomShell
        room={room}
        walls={walls}
        textures={textures}
        envMap={envTarget.texture}
        houseLevel={houseLevel}
        onFloorClick={handleFloorClick}
      />

      <StageDeck
        stageHeight={stageHeight}
        stairs={stairs}
        room={room}
        textures={textures}
        envMap={envTarget.texture}
      />

      <ConferenceSeating
        seats={layout.seats}
        textures={textures}
        envMap={envTarget.texture}
        onSeatPick={handleSeatPick}
      />

      {/* ================= Overhead Lighting Truss & Fixtures ================= */}
      {showCeilingFixtures && (
        <group position={[0, 8.5, 0]}>
          {[-8, 2, 11].map((trussZ, tIdx) => (
            <group key={tIdx} position={[0, 0, trussZ]}>
              {/* Main cross pipe */}
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.06, 0.06, trussLength, 12]} />
                <meshStandardMaterial color="#1f293d" roughness={0.5} metalness={0.7} envMap={envTarget.texture} envMapIntensity={0.4} />
              </mesh>
              {/* Secondary parallel pipe */}
              <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, trussLength, 12]} />
                <meshStandardMaterial color="#1f293d" roughness={0.5} metalness={0.7} envMap={envTarget.texture} envMapIntensity={0.4} />
              </mesh>

              {/* Rigging cables up to the ceiling */}
              {[-trussLength / 2 + 0.5, 0, trussLength / 2 - 0.5].map((cableX) => (
                <mesh key={cableX} position={[cableX, (CEILING_HEIGHT - 8.5) / 2, 0]}>
                  <cylinderGeometry args={[0.006, 0.006, CEILING_HEIGHT - 8.5, 4]} />
                  <meshStandardMaterial color="#8a9099" metalness={0.8} roughness={0.4} />
                </mesh>
              ))}

              {/* Downlight Can Fixtures spaced across truss */}
              {[-6, -3, 0, 3, 6].map((canX, cIdx) => (
                <group key={cIdx} position={[canX, -0.15, 0]}>
                  {/* Fixture Body */}
                  <mesh>
                    <cylinderGeometry args={[0.16, 0.22, 0.28, 16]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} envMap={envTarget.texture} envMapIntensity={0.4} />
                  </mesh>
                  {/* Glowing Lens Face */}
                  <mesh position={[0, -0.141, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.18, 16]} />
                    <meshBasicMaterial color="#f8fafc" />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
        </group>
      )}
    </group>
  );
};
