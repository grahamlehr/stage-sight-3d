import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pleatedPanel, tube } from './geometryHelpers';
import { RoomBounds, StairFlight, STAGE, CEILING_HEIGHT } from './roomLayout';
import { tiled, VenueTextures } from './venueTextures';
import { useDisposables } from './useDisposables';

interface StageDeckProps {
  stageHeight: number;
  stairs: StairFlight[];
  room: RoomBounds;
  textures: VenueTextures;
  envMap: THREE.Texture | null;
}

const SKIRT_COLOR = '#0e1015';
const DECK_CARPET = '#23262d';
const TAPE_COLOR = '#d9dde3';

/** Chrome handrails on both sides of a flight: a post at each end and a raked rail. */
const handrailGeometry = (flight: StairFlight) => {
  const run = (flight.risers - 1) * flight.treadDepth;
  const parts: THREE.BufferGeometry[] = [];
  [-1, 1].forEach((side) => {
    const x = flight.x + side * (flight.width / 2 - 0.04);
    const bottom = new THREE.Vector3(x, 0, flight.bottomZ - 0.12);
    const top = new THREE.Vector3(x, flight.riserHeight * (flight.risers - 1), flight.bottomZ - run + 0.1);
    const railRise = 0.9;
    const bottomRail = bottom.clone().setY(bottom.y + flight.riserHeight + railRise);
    const topRail = top.clone().setY(top.y + railRise);
    parts.push(
      tube(bottom, bottomRail, 0.022, 10),
      tube(top, topRail, 0.022, 10),
      tube(bottomRail, topRail, 0.02, 10),
      // Mid rail
      tube(
        bottomRail.clone().setY(bottomRail.y - 0.45),
        topRail.clone().setY(topRail.y - 0.45),
        0.014,
        8,
      ),
    );
  });
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
};

/**
 * The raised stage: a carpeted deck with pleated black skirting, white edge
 * tape, carpeted stairs with handrails at both front corners, and a full-width
 * black velour drape on the wall behind it.
 */
export const StageDeck: React.FC<StageDeckProps> = ({ stageHeight, stairs, room, textures, envMap }) => {
  const { width, depth, centerZ, frontZ } = STAGE;

  const geometries = useMemo(() => {
    const frontSkirt = pleatedPanel(width + 0.04, stageHeight, 0.16, 0.05);
    const sideSkirt = pleatedPanel(depth, stageHeight, 0.16, 0.05);
    const drapeHeight = CEILING_HEIGHT - 0.35;
    const drape = pleatedPanel(room.width - 0.1, drapeHeight, 0.32, 0.12);
    const rails = stairs.map(handrailGeometry);
    return { frontSkirt, sideSkirt, drape, drapeHeight, rails };
  }, [width, depth, stageHeight, room.width, stairs]);

  const maps = useMemo(
    () => ({
      deck: tiled(textures.grain, width / 0.6, depth / 0.6),
      skirt: tiled(textures.grain, width / 0.5, 2),
      drape: tiled(textures.grain, room.width / 0.8, 6),
      tread: tiled(textures.grain, 2, 1),
    }),
    [textures, width, depth, room.width],
  );

  useDisposables(
    useMemo(
      () => [
        geometries.frontSkirt,
        geometries.sideSkirt,
        geometries.drape,
        ...geometries.rails,
        ...Object.values(maps),
      ],
      [geometries, maps],
    ),
  );

  return (
    <group>
      {/* Deck structure */}
      <mesh position={[0, stageHeight / 2, centerZ]} castShadow receiveShadow>
        <boxGeometry args={[width, stageHeight, depth]} />
        <meshStandardMaterial color="#121418" roughness={0.8} />
      </mesh>

      {/* Stage carpet */}
      <mesh position={[0, stageHeight + 0.002, centerZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={DECK_CARPET} map={maps.deck} bumpMap={maps.deck} bumpScale={2} roughness={0.95} />
      </mesh>

      {/* White safety tape along the downstage edge */}
      <mesh position={[0, stageHeight + 0.004, frontZ - 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, 0.05]} />
        <meshStandardMaterial color={TAPE_COLOR} roughness={0.6} />
      </mesh>

      {/* Pleated skirting on the front and both ends */}
      <mesh geometry={geometries.frontSkirt} position={[0, stageHeight / 2, frontZ + 0.035]} receiveShadow>
        <meshStandardMaterial color={SKIRT_COLOR} map={maps.skirt} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={geometries.sideSkirt}
          position={[side * (width / 2 + 0.035), stageHeight / 2, centerZ]}
          rotation={[0, side * (Math.PI / 2), 0]}
          receiveShadow
        >
          <meshStandardMaterial color={SKIRT_COLOR} map={maps.skirt} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Stairs: one carpeted box per step, stacked from the floor */}
      {stairs.map((flight, fIdx) => (
        <group key={fIdx}>
          {Array.from({ length: flight.risers - 1 }, (_, i) => {
            const step = i + 1; // 1 = bottom step
            const top = step * flight.riserHeight;
            const nearZ = flight.bottomZ - (step - 1) * flight.treadDepth;
            return (
              <group key={step}>
                <mesh position={[flight.x, top / 2, nearZ - flight.treadDepth / 2]} castShadow receiveShadow>
                  <boxGeometry args={[flight.width, top, flight.treadDepth]} />
                  <meshStandardMaterial color={DECK_CARPET} map={maps.tread} bumpMap={maps.tread} bumpScale={2} roughness={0.95} />
                </mesh>
                {/* Nosing tape */}
                <mesh position={[flight.x, top + 0.002, nearZ - 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[flight.width, 0.04]} />
                  <meshStandardMaterial color={TAPE_COLOR} roughness={0.6} />
                </mesh>
              </group>
            );
          })}
          <mesh geometry={geometries.rails[fIdx]} castShadow>
            <meshStandardMaterial color="#d4d8de" metalness={0.95} roughness={0.2} envMap={envMap} envMapIntensity={1} />
          </mesh>
        </group>
      ))}

      {/* Upstage velour drape, wall to wall */}
      <mesh
        geometry={geometries.drape}
        position={[0, geometries.drapeHeight / 2, room.frontZ + 0.1]}
        receiveShadow
      >
        <meshStandardMaterial color="#0b0c10" map={maps.drape} bumpMap={maps.drape} bumpScale={1} roughness={1} />
      </mesh>
      {/* Drape track */}
      <mesh position={[0, geometries.drapeHeight + 0.05, room.frontZ + 0.1]}>
        <boxGeometry args={[room.width - 0.1, 0.1, 0.12]} />
        <meshStandardMaterial color="#14161b" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
};
