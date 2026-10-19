import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { CEILING_HEIGHT, DOOR_HEIGHT, DOOR_WIDTH, RoomBounds, WallSpec } from './roomLayout';
import { tiled, VenueTextures } from './venueTextures';
import { useDisposables } from './useDisposables';

interface RoomShellProps {
  room: RoomBounds;
  walls: WallSpec[];
  textures: VenueTextures;
  envMap: THREE.Texture | null;
  /** 0–1 house light level; drives sconces, downlights and the bounce fill. */
  houseLevel: number;
  onFloorPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}

const WAINSCOT_TOP = 1.1;
const WALL_FABRIC = '#7d828c';
const PLASTER = '#c9ccd1';
const PILASTER_DEPTH = 0.14;
const SCONCE_HEIGHT = 3.4;

/** Brushed stainless door hardware. */
const Hardware: React.FC<{ envMap: THREE.Texture | null }> = ({ envMap }) => (
  <meshStandardMaterial color="#c3c8cf" metalness={0.9} roughness={0.32} envMap={envMap} envMapIntensity={0.9} />
);

/** Illuminated exit sign on a short housing. */
const ExitSign: React.FC<{ y: number; textures: VenueTextures }> = ({ y, textures }) => (
  <group position={[0, y, 0.05]}>
    <mesh>
      <boxGeometry args={[0.38, 0.18, 0.06]} />
      <meshStandardMaterial color="#e8eaed" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0, 0.031]}>
      <planeGeometry args={[0.34, 0.15]} />
      <meshBasicMaterial map={textures.exitSign} toneMapped={false} />
    </mesh>
  </group>
);

/** A pair of solid-core veneered doors in a steel frame, with push bars and vision panels. */
const DoubleDoor: React.FC<{ x: number; textures: VenueTextures; doorMap: THREE.Texture; envMap: THREE.Texture | null }> = ({
  x,
  textures,
  doorMap,
  envMap,
}) => {
  const leafW = DOOR_WIDTH / 2 - 0.01;
  const frame = 0.08;
  return (
    <group position={[x, 0, 0]}>
      {/* Frame: two jambs and a head */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR_WIDTH / 2 + frame / 2), DOOR_HEIGHT / 2 + frame / 2, 0.03]}>
          <boxGeometry args={[frame, DOOR_HEIGHT + frame, 0.06]} />
          <meshStandardMaterial color="#2a2d33" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, DOOR_HEIGHT + frame / 2, 0.03]}>
        <boxGeometry args={[DOOR_WIDTH + frame * 2, frame, 0.06]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.5} metalness={0.4} />
      </mesh>

      {[-1, 1].map((s) => {
        const cx = (s * DOOR_WIDTH) / 4;
        return (
          <group key={s} position={[cx, 0, 0.022]}>
            {/* Leaf */}
            <mesh position={[0, DOOR_HEIGHT / 2, 0]} receiveShadow>
              <boxGeometry args={[leafW, DOOR_HEIGHT - 0.01, 0.044]} />
              <meshStandardMaterial color="#f2dcc2" map={doorMap} roughness={0.5} />
            </mesh>
            {/* Vision panel toward the meeting stiles */}
            <mesh position={[-s * 0.2, 1.62, 0.024]}>
              <planeGeometry args={[0.14, 0.62]} />
              <meshStandardMaterial color="#0c1118" roughness={0.08} metalness={0.6} envMap={envMap} envMapIntensity={0.6} />
            </mesh>
            {/* Panic push bar */}
            <mesh position={[0, 1.0, 0.06]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.022, 0.022, leafW - 0.16, 12]} />
              <Hardware envMap={envMap} />
            </mesh>
            {[-1, 1].map((e) => (
              <mesh key={e} position={[e * (leafW / 2 - 0.08), 1.0, 0.04]}>
                <boxGeometry args={[0.05, 0.08, 0.05]} />
                <Hardware envMap={envMap} />
              </mesh>
            ))}
            {/* Kick plate */}
            <mesh position={[0, 0.14, 0.023]}>
              <planeGeometry args={[leafW - 0.04, 0.25]} />
              <Hardware envMap={envMap} />
            </mesh>
          </group>
        );
      })}
      <ExitSign y={DOOR_HEIGHT + 0.32} textures={textures} />
    </group>
  );
};

/** Pilaster with a wall sconce and the soft wash it throws up the wall. */
const Pilaster: React.FC<{ x: number; height: number; houseLevel: number; textures: VenueTextures }> = ({
  x,
  height,
  houseLevel,
  textures,
}) => (
  <group position={[x, 0, 0]}>
    <mesh position={[0, height / 2, PILASTER_DEPTH / 2]} receiveShadow>
      <boxGeometry args={[0.55, height, PILASTER_DEPTH]} />
      <meshStandardMaterial color={PLASTER} roughness={0.85} />
    </mesh>
    {/* Plinth */}
    <mesh position={[0, 0.2, PILASTER_DEPTH / 2 + 0.01]}>
      <boxGeometry args={[0.6, 0.4, PILASTER_DEPTH + 0.02]} />
      <meshStandardMaterial color="#3a2a1e" roughness={0.6} />
    </mesh>
    {/* Sconce: bronze backplate and a frosted shade */}
    <mesh position={[0, SCONCE_HEIGHT - 0.05, PILASTER_DEPTH + 0.015]}>
      <boxGeometry args={[0.12, 0.42, 0.03]} />
      <meshStandardMaterial color="#4a3a28" metalness={0.6} roughness={0.4} />
    </mesh>
    <mesh position={[0, SCONCE_HEIGHT, PILASTER_DEPTH + 0.09]}>
      <cylinderGeometry args={[0.13, 0.09, 0.24, 20, 1, true]} />
      <meshBasicMaterial
        color={new THREE.Color('#2a2420').lerp(new THREE.Color('#ffe2b8'), houseLevel)}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
    <mesh position={[0, SCONCE_HEIGHT + 0.45, PILASTER_DEPTH + 0.004]}>
      <planeGeometry args={[1.3, 2.0]} />
      <meshBasicMaterial
        map={textures.glow}
        color="#ffd9a8"
        transparent
        opacity={0.32 * houseLevel}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  </group>
);

/** One wall, built in its own frame: local X runs along the wall, local +Z faces into the room. */
const Wall: React.FC<{
  spec: WallSpec;
  textures: VenueTextures;
  envMap: THREE.Texture | null;
  houseLevel: number;
}> = ({ spec, textures, envMap, houseLevel }) => {
  const upperH = CEILING_HEIGHT - WAINSCOT_TOP;
  const maps = useMemo(() => {
    const door = tiled(textures.wood, 1, 1);
    door.center.set(0.5, 0.5);
    door.rotation = Math.PI / 2; // grain runs vertically on a door leaf
    return {
      panel: tiled(textures.wallPanel, spec.length / 1.2, upperH / 1.2),
      wainscot: tiled(textures.wainscot, spec.length / 1.2, 1),
      door,
    };
  }, [textures, spec.length, upperH]);
  useDisposables(useMemo(() => Object.values(maps), [maps]));

  return (
    <group position={spec.position} rotation={[0, spec.rotationY, 0]}>
      {/* Fabric-wrapped acoustic panels above the wainscot */}
      <mesh position={[0, WAINSCOT_TOP + upperH / 2, 0]} receiveShadow>
        <planeGeometry args={[spec.length, upperH]} />
        <meshStandardMaterial
          color={WALL_FABRIC}
          map={maps.panel}
          bumpMap={maps.panel}
          bumpScale={2}
          roughness={0.95}
          emissive={WALL_FABRIC}
          emissiveMap={maps.panel}
          emissiveIntensity={0.05 + 0.1 * houseLevel}
        />
      </mesh>

      {/* Walnut wainscot, chair rail and skirting */}
      <mesh position={[0, WAINSCOT_TOP / 2, 0.012]} receiveShadow>
        <planeGeometry args={[spec.length, WAINSCOT_TOP]} />
        <meshStandardMaterial color="#ffffff" map={maps.wainscot} roughness={0.5} />
      </mesh>
      <mesh position={[0, WAINSCOT_TOP, 0.025]}>
        <boxGeometry args={[spec.length, 0.07, 0.05]} />
        <meshStandardMaterial color="#3b2717" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.07, 0.025]}>
        <boxGeometry args={[spec.length, 0.14, 0.03]} />
        <meshStandardMaterial color="#1f1712" roughness={0.6} />
      </mesh>

      {/* Crown cove where the wall meets the ceiling */}
      <mesh position={[0, CEILING_HEIGHT - 0.15, 0.08]}>
        <boxGeometry args={[spec.length, 0.3, 0.16]} />
        <meshStandardMaterial color={PLASTER} roughness={0.85} emissive={PLASTER} emissiveIntensity={0.05 + 0.08 * houseLevel} />
      </mesh>

      {spec.pilasters.map((x) => (
        <Pilaster key={x} x={x} height={CEILING_HEIGHT - 0.3} houseLevel={houseLevel} textures={textures} />
      ))}
      {spec.doors.map((x) => (
        <DoubleDoor key={x} x={x} textures={textures} doorMap={maps.door} envMap={envMap} />
      ))}
    </group>
  );
};

/** Recessed can downlights on a regular grid, aligned to the 0.6m ceiling tiles. */
const Downlights: React.FC<{ room: RoomBounds; houseLevel: number }> = ({ room, houseLevel }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    const spacing = 3.6;
    const out: [number, number][] = [];
    const nx = Math.floor((room.width - 2) / spacing);
    const nz = Math.floor((room.length - 2) / spacing);
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        out.push([-(nx * spacing) / 2 + i * spacing, room.centerZ - (nz * spacing) / 2 + j * spacing]);
      }
    }
    return out;
  }, [room.width, room.length, room.centerZ]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    positions.forEach(([x, z], i) => {
      dummy.position.set(x, CEILING_HEIGHT - 0.005, z);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [positions]);

  return (
    <instancedMesh key={positions.length} ref={ref} args={[undefined, undefined, positions.length]}>
      <ringGeometry args={[0, 0.11, 24]} />
      <meshBasicMaterial
        color={new THREE.Color('#3a3d42').lerp(new THREE.Color('#fff3df'), houseLevel)}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

/**
 * Floor, walls, doors and ceiling. Walls and ceiling face inward only, so the
 * orbit camera sees straight into the room when it swings outside them.
 */
export const RoomShell: React.FC<RoomShellProps> = ({
  room,
  walls,
  textures,
  envMap,
  houseLevel,
  onFloorPointerDown,
}) => {
  const maps = useMemo(
    () => ({
      carpet: tiled(textures.carpet, room.width / 1.2, room.length / 1.2),
      pile: tiled(textures.grain, room.width / 0.25, room.length / 0.25),
      ceiling: tiled(textures.ceilingTile, room.width / 1.2, room.length / 1.2),
    }),
    [textures, room.width, room.length],
  );
  useDisposables(useMemo(() => Object.values(maps), [maps]));

  return (
    <group>
      {/* Patterned carpet */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, room.centerZ]}
        receiveShadow
        onPointerDown={onFloorPointerDown}
      >
        <planeGeometry args={[room.width, room.length]} />
        <meshStandardMaterial
          color="#ffffff"
          map={maps.carpet}
          bumpMap={maps.pile}
          bumpScale={1.2}
          roughness={0.96}
          metalness={0}
        />
      </mesh>

      {walls.map((spec) => (
        <Wall key={spec.side} spec={spec} textures={textures} envMap={envMap} houseLevel={houseLevel} />
      ))}

      {/* Acoustic tile ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CEILING_HEIGHT, room.centerZ]}>
        <planeGeometry args={[room.width, room.length]} />
        <meshStandardMaterial
          color="#ffffff"
          map={maps.ceiling}
          roughness={0.95}
          emissive="#ffffff"
          emissiveMap={maps.ceiling}
          emissiveIntensity={0.04 + 0.16 * houseLevel}
        />
      </mesh>
      <Downlights room={room} houseLevel={houseLevel} />
    </group>
  );
};
