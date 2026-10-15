import React, { useMemo } from 'react';
import { useStageStore } from '../../store/useStageStore';
import * as THREE from 'three';

export const PresenterSilhouette: React.FC = () => {
  const showPresenter = useStageStore((s) => s.showPresenterSilhouette);
  const presenterOffset = useStageStore((s) => s.presenterOffset);
  const stageHeight = useStageStore((s) => s.stageHeight);
  const screenPosition = useStageStore((s) => s.screenPosition);

  // Presenter material - sleek semi-matte architectural silhouette with subtle rim light response
  const mannequinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.3,
        metalness: 0.2,
      }),
    []
  );

  const lecternMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.4,
        metalness: 0.6,
      }),
    []
  );

  const accentMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#06b6d4',
      }),
    []
  );

  if (!showPresenter) return null;

  // Calculate coordinates in stage space
  const [xOffset, zOffset] = presenterOffset;
  const posX = screenPosition[0] + xOffset;
  const posY = stageHeight; // Sits on stage floor
  const posZ = screenPosition[2] + zOffset; // In front of screen (+Z direction toward audience)

  return (
    <group position={[posX, posY, posZ]}>
      {/* ================= 1.8m Presenter Mannequin ================= */}
      <group position={[0, 0, 0]}>
        {/* Head: sphere at y = 1.70m, radius ~0.11m */}
        <mesh position={[0, 1.70, 0]} material={mannequinMaterial} castShadow>
          <sphereGeometry args={[0.11, 24, 24]} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 1.56, 0]} material={mannequinMaterial} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.08, 16]} />
        </mesh>

        {/* Torso / Shoulders: tapered chest */}
        <mesh position={[0, 1.25, 0]} material={mannequinMaterial} castShadow>
          <cylinderGeometry args={[0.20, 0.16, 0.55, 16]} />
        </mesh>

        {/* Left Arm */}
        <mesh position={[-0.26, 1.15, 0]} rotation={[0, 0, 0.1]} material={mannequinMaterial}>
          <cylinderGeometry args={[0.045, 0.04, 0.65, 12]} />
        </mesh>

        {/* Right Arm (resting near podium) */}
        <mesh position={[0.26, 1.15, 0.08]} rotation={[-0.3, 0, -0.1]} material={mannequinMaterial}>
          <cylinderGeometry args={[0.045, 0.04, 0.65, 12]} />
        </mesh>

        {/* Hips / Pelvis */}
        <mesh position={[0, 0.92, 0]} material={mannequinMaterial}>
          <cylinderGeometry args={[0.16, 0.17, 0.18, 16]} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.10, 0.45, 0]} material={mannequinMaterial} castShadow>
          <cylinderGeometry args={[0.065, 0.045, 0.90, 16]} />
        </mesh>
        <mesh position={[0.10, 0.45, 0]} material={mannequinMaterial} castShadow>
          <cylinderGeometry args={[0.065, 0.045, 0.90, 16]} />
        </mesh>

        {/* Feet / Shoes */}
        <mesh position={[-0.10, 0.03, 0.05]} material={mannequinMaterial}>
          <boxGeometry args={[0.09, 0.06, 0.22]} />
        </mesh>
        <mesh position={[0.10, 0.03, 0.05]} material={mannequinMaterial}>
          <boxGeometry args={[0.09, 0.06, 0.22]} />
        </mesh>

        {/* Subtle ground contact shadow ring */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, 0.35, 32]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* ================= 1.15m Lectern / Podium ================= */}
      <group position={[0.45, 0, 0.35]}>
        {/* Main podium pillar: 1.15m height, 0.55m width, 0.45m depth */}
        <mesh position={[0, 0.55, 0]} material={lecternMaterial} castShadow>
          <boxGeometry args={[0.55, 1.10, 0.40]} />
        </mesh>

        {/* Slanted reading top shelf */}
        <mesh position={[0, 1.13, 0.02]} rotation={[0.2, 0, 0]} material={lecternMaterial}>
          <boxGeometry args={[0.62, 0.04, 0.46]} />
        </mesh>

        {/* Accent LED glow strip on front edge of lectern */}
        <mesh position={[0, 0.55, 0.205]} material={accentMaterial}>
          <boxGeometry args={[0.50, 0.015, 0.01]} />
        </mesh>

        {/* Gooseneck microphone */}
        <mesh position={[-0.15, 1.25, -0.05]} rotation={[-0.2, 0, 0.2]} material={accentMaterial}>
          <cylinderGeometry args={[0.006, 0.006, 0.25, 8]} />
        </mesh>
      </group>
    </group>
  );
};
