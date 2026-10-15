import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStageStore } from '../../store/useStageStore';
import { ThreeEvent } from '@react-three/fiber';

export const DemoBallroom: React.FC = () => {
  const venueWidth = useStageStore((s) => s.venueWidth);
  const venueLength = useStageStore((s) => s.venueLength);
  const stageHeight = useStageStore((s) => s.stageHeight);
  const navigationMode = useStageStore((s) => s.navigationMode);
  const setSeatPosition = useStageStore((s) => s.setSeatPosition);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);

  // Instanced seating layout: generate transform matrices for chairs across 3 zones
  const { chairTransforms, chairCount } = useMemo(() => {
    const transforms: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    const zones = [
      // Front zone
      [-8.0, -6.8, -5.6],
      // Mid zone
      [0.0, 1.4, 2.8, 4.2],
      // Rear zone
      [10.0, 11.4, 12.8, 14.2],
    ];

    // Chair spacing: 0.7m seat width, center aisle 2.0m wide (from -1.0 to 1.0)
    const leftSeatCols = [-7.0, -6.3, -5.6, -4.9, -4.2, -3.5, -2.8, -2.1, -1.4];
    const rightSeatCols = [1.4, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6, 6.3, 7.0];
    const allCols = [...leftSeatCols, ...rightSeatCols];

    zones.forEach((rowZList) => {
      rowZList.forEach((z) => {
        allCols.forEach((x) => {
          dummy.position.set(x, 0, z);
          dummy.rotation.set(0, 0, 0); // Face stage (-Z)
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          transforms.push(dummy.matrix.clone());
        });
      });
    });

    return { chairTransforms: transforms, chairCount: transforms.length };
  }, []);

  // Construct combined chair geometry for high-performance single-call instanced rendering
  const chairGeometry = useMemo(() => {
    // Single chair model: seat base + backrest
    const seatGeo = new THREE.BoxGeometry(0.52, 0.08, 0.48);
    seatGeo.translate(0, 0.42, 0);

    const backGeo = new THREE.BoxGeometry(0.50, 0.48, 0.06);
    backGeo.translate(0, 0.70, 0.22);

    const legsGeo = new THREE.CylinderGeometry(0.018, 0.015, 0.40, 8);
    legsGeo.translate(0, 0.20, 0);

    // Merge into one compound geometry manually using BufferGeometryUtils or groups
    // Using BufferGeometry groups
    return { seatGeo, backGeo };
  }, []);

  // Floor click handler: click-to-sit
  const handleFloorClick = (e: ThreeEvent<PointerEvent>) => {
    if (navigationMode === 'seated' || e.shiftKey) {
      e.stopPropagation();
      const point = e.point;
      // Clamp to venue boundaries
      const clampedX = Math.max(-venueWidth / 2 + 1, Math.min(venueWidth / 2 - 1, point.x));
      const clampedZ = Math.max(-venueLength / 2 + 1, Math.min(venueLength / 2 - 1, point.z));
      setSeatPosition([clampedX, 0, clampedZ]);
      if (navigationMode !== 'seated') {
        setNavigationMode('seated');
      }
    }
  };

  // Stage dimensions: 18m wide, 5m deep, centered at z = -12.5m (front edge at z = -10m)
  const stageWidth = 18.0;
  const stageDepth = 5.0;
  const stageCenterZ = -12.5;

  return (
    <group>
      {/* ================= Venue Floor Plane ================= */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={handleFloorClick}
      >
        <planeGeometry args={[venueWidth, venueLength]} />
        <meshStandardMaterial
          color="#0c0f17"
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>

      {/* 1m Grid Helper on Floor */}
      <gridHelper
        args={[venueLength, venueLength, 0x06b6d4, 0x1e293b]}
        position={[0, 0.005, 0]}
      />

      {/* Center Aisle Runway Accent Lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.1, 0.01, 2]}>
        <planeGeometry args={[0.04, 26]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.1, 0.01, 2]}>
        <planeGeometry args={[0.04, 26]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
      </mesh>

      {/* ================= Raised Stage Deck ================= */}
      <group position={[0, stageHeight / 2, stageCenterZ]}>
        {/* Stage Deck Box */}
        <mesh receiveShadow castShadow>
          <boxGeometry args={[stageWidth, stageHeight, stageDepth]} />
          <meshStandardMaterial
            color="#131722"
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>

        {/* Stage Front Lip Accent Glow */}
        <mesh position={[0, stageHeight / 2 - 0.02, stageDepth / 2 + 0.01]}>
          <boxGeometry args={[stageWidth, 0.04, 0.02]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>

        {/* Stage Deck Top Surface Border Trim */}
        <mesh position={[0, stageHeight / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[stageWidth - 0.2, stageDepth - 0.2]} />
          <meshStandardMaterial
            color="#1a202c"
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* Stage Access Steps (Left and Right) */}
      {[-stageWidth / 2 - 0.6, stageWidth / 2 + 0.6].map((stepX, idx) => (
        <group key={idx} position={[stepX, 0, stageCenterZ + 1.0]}>
          <mesh position={[0, stageHeight * 0.33 / 2, 0]}>
            <boxGeometry args={[1.0, stageHeight * 0.33, 1.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, stageHeight * 0.66 / 2, -0.4]}>
            <boxGeometry args={[1.0, stageHeight * 0.66, 1.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}

      {/* ================= Instanced Seating Blocks ================= */}
      {/* Seat Cushions */}
      <instancedMesh
        args={[chairGeometry.seatGeo, undefined, chairCount]}
        receiveShadow
        castShadow
        onPointerDown={handleFloorClick}
        ref={(inst) => {
          if (inst) {
            chairTransforms.forEach((matrix, i) => inst.setMatrixAt(i, matrix));
            inst.instanceMatrix.needsUpdate = true;
          }
        }}
      >
        <meshStandardMaterial color="#1e2638" roughness={0.7} metalness={0.1} />
      </instancedMesh>

      {/* Seat Backrests */}
      <instancedMesh
        args={[chairGeometry.backGeo, undefined, chairCount]}
        receiveShadow
        castShadow
        onPointerDown={handleFloorClick}
        ref={(inst) => {
          if (inst) {
            chairTransforms.forEach((matrix, i) => inst.setMatrixAt(i, matrix));
            inst.instanceMatrix.needsUpdate = true;
          }
        }}
      >
        <meshStandardMaterial color="#2d3748" roughness={0.6} metalness={0.1} />
      </instancedMesh>

      {/* Zone Floor Label Indicators */}
      <group position={[0, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]}>
          <planeGeometry args={[1.8, 0.6]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.15} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]}>
          <planeGeometry args={[1.8, 0.6]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.15} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 12]}>
          <planeGeometry args={[1.8, 0.6]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.15} />
        </mesh>
      </group>
    </group>
  );
};
