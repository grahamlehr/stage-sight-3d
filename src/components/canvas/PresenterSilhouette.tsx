import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStageStore } from '../../store/useStageStore';

// ================= Standing Presenter Component =================
interface PresenterMannequinProps {
  position: [number, number, number];
}

const PresenterMannequin: React.FC<PresenterMannequinProps> = ({ position }) => {
  // High-acuity PBR materials that respond dynamically to stage lighting and spotlights
  const suitMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5b6982', // Refined slate-gray suit jacket & trousers
        roughness: 0.45,
        metalness: 0.1,
      }),
    []
  );

  const shirtMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f8fafc', // Crisp white shirt collar & chest
        roughness: 0.35,
        metalness: 0.05,
      }),
    []
  );

  const skinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1', // Studio architectural clay tone
        roughness: 0.4,
        metalness: 0.05,
      }),
    []
  );

  const shoesMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.25,
        metalness: 0.3,
      }),
    []
  );

  return (
    <group position={position}>
      {/* Head: sphere at y = 1.70m, radius ~0.11m */}
      <mesh position={[0, 1.70, 0]} material={skinMaterial} castShadow receiveShadow>
        <sphereGeometry args={[0.11, 24, 24]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.56, 0]} material={skinMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.08, 16]} />
      </mesh>

      {/* White shirt collar V-insert */}
      <mesh position={[0, 1.46, 0.08]} rotation={[0.2, 0, 0]} material={shirtMaterial}>
        <boxGeometry args={[0.10, 0.12, 0.06]} />
      </mesh>

      {/* Torso / Shoulders: tailored suit jacket */}
      <mesh position={[0, 1.25, 0]} material={suitMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.21, 0.17, 0.55, 16]} />
      </mesh>

      {/* Left Arm (relaxed at side) */}
      <mesh position={[-0.27, 1.15, 0]} rotation={[0, 0, 0.08]} material={suitMaterial} castShadow>
        <cylinderGeometry args={[0.048, 0.042, 0.65, 14]} />
      </mesh>
      {/* Left Hand */}
      <mesh position={[-0.31, 0.78, 0]} material={skinMaterial} castShadow>
        <sphereGeometry args={[0.04, 12, 12]} />
      </mesh>

      {/* Right Arm (presenting gesture toward screen) */}
      <mesh position={[0.27, 1.18, 0.12]} rotation={[-0.35, 0.15, -0.25]} material={suitMaterial} castShadow>
        <cylinderGeometry args={[0.048, 0.042, 0.65, 14]} />
      </mesh>
      {/* Right Hand */}
      <mesh position={[0.38, 1.05, 0.32]} material={skinMaterial} castShadow>
        <sphereGeometry args={[0.04, 12, 12]} />
      </mesh>

      {/* Hips / Waist */}
      <mesh position={[0, 0.92, 0]} material={suitMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.18, 0.18, 16]} />
      </mesh>

      {/* Trousers Legs */}
      <mesh position={[-0.10, 0.45, 0]} material={suitMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.068, 0.048, 0.90, 16]} />
      </mesh>
      <mesh position={[0.10, 0.45, 0]} material={suitMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.068, 0.048, 0.90, 16]} />
      </mesh>

      {/* Formal Shoes */}
      <mesh position={[-0.10, 0.03, 0.05]} material={shoesMaterial} castShadow>
        <boxGeometry args={[0.095, 0.06, 0.23]} />
      </mesh>
      <mesh position={[0.10, 0.03, 0.05]} material={shoesMaterial} castShadow>
        <boxGeometry args={[0.095, 0.06, 0.23]} />
      </mesh>

      {/* Subtle floor contact shadow */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.40, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
    </group>
  );
};

// ================= Lectern / Podium Component =================
interface LecternProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

const LecternPodium: React.FC<LecternProps> = ({
  position,
  rotation = [0, Math.PI, 0],
}) => {
  // Brushed titanium & aluminum materials for high specular lighting response
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8', // Brushed aluminum body
        metalness: 0.5,
        roughness: 0.25,
      }),
    []
  );

  const accentWoodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#334155', // Charcoal acoustic fascia
        metalness: 0.15,
        roughness: 0.4,
      }),
    []
  );

  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        metalness: 0.9,
        roughness: 0.15,
      }),
    []
  );

  const ledAccentMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#06b6d4',
      }),
    []
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Heavy base plate */}
      <mesh position={[0, 0.02, 0]} material={bodyMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.65, 0.04, 0.50]} />
      </mesh>

      {/* Main podium column: 1.10m height, 0.52m width, 0.38m depth */}
      <mesh position={[0, 0.56, 0]} material={bodyMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.52, 1.08, 0.38]} />
      </mesh>

      {/* Front architectural contrast fascia panel */}
      <mesh position={[0, 0.56, 0.195]} material={accentWoodMaterial} castShadow>
        <boxGeometry args={[0.46, 0.98, 0.02]} />
      </mesh>

      {/* Glowing Cyan LED front accent stripe */}
      <mesh position={[0, 0.56, 0.21]} material={ledAccentMaterial}>
        <boxGeometry args={[0.42, 0.015, 0.01]} />
      </mesh>

      {/* Slanted reading deck top shelf: angled towards presenter */}
      <mesh position={[0, 1.13, 0.02]} rotation={[0.22, 0, 0]} material={accentWoodMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.035, 0.48]} />
      </mesh>

      {/* Top shelf metal lip */}
      <mesh position={[0, 1.10, 0.22]} rotation={[0.22, 0, 0]} material={bodyMaterial}>
        <boxGeometry args={[0.60, 0.025, 0.02]} />
      </mesh>

      {/* Gooseneck microphone */}
      <group position={[-0.18, 1.18, 0.02]}>
        <mesh position={[0, 0.10, -0.04]} rotation={[-0.3, 0, 0.15]} material={chromeMaterial}>
          <cylinderGeometry args={[0.006, 0.007, 0.28, 10]} />
        </mesh>
        {/* Mic capsule */}
        <mesh position={[0.04, 0.24, -0.10]} material={accentWoodMaterial}>
          <cylinderGeometry args={[0.012, 0.010, 0.04, 12]} />
        </mesh>
      </group>

      {/* Preview Tablet Screen on shelf */}
      <mesh position={[0.08, 1.14, 0.04]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[0.25, 0.008, 0.18]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.08, 1.145, 0.04]} rotation={[0.22, 0, 0]}>
        <planeGeometry args={[0.23, 0.16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Floor contact shadow */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.85, 0.70]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// ================= Modern Tub Chair & Seated Panelist =================
interface TubChairPanelistProps {
  position: [number, number, number];
  rotationY: number;
  suitColor: string;
}

const TubChairPanelist: React.FC<TubChairPanelistProps> = ({
  position,
  rotationY,
  suitColor,
}) => {
  // Tub chair upholstery fabric material - high quality diffuse & specular shading
  const chairFabricMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#475569', // Executive slate upholstery
        roughness: 0.45,
        metalness: 0.1,
        side: THREE.DoubleSide, // Ensure both inner and outer bucket surfaces are rendered and lit
      }),
    []
  );

  const cushionMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#64748b', // Lighter cushion tone
        roughness: 0.4,
        metalness: 0.08,
      }),
    []
  );

  const chromeBaseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        metalness: 0.85,
        roughness: 0.18,
      }),
    []
  );

  const panelistSuitMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: suitColor,
        roughness: 0.45,
        metalness: 0.1,
      }),
    [suitColor]
  );

  const skinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.4,
        metalness: 0.05,
      }),
    []
  );

  const shoesMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.25,
        metalness: 0.3,
      }),
    []
  );

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ================= 1. Modern Tub Chair (Facing Forward Toward Audience) ================= */}
      <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
        {/* 4-Star Chrome Swivel Base */}
        <mesh position={[0, 0.18, 0]} material={chromeBaseMaterial} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.32, 16]} />
        </mesh>
        {/* 4 star legs */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
          <mesh
            key={idx}
            position={[Math.sin(angle) * 0.18, 0.04, Math.cos(angle) * 0.18]}
            rotation={[0, angle, 0.15]}
            material={chromeBaseMaterial}
            castShadow
          >
            <boxGeometry args={[0.04, 0.025, 0.40]} />
          </mesh>
        ))}

        {/* Tub Chair Base Underside */}
        <mesh position={[0, 0.36, 0]} material={chairFabricMaterial} castShadow>
          <cylinderGeometry args={[0.38, 0.32, 0.08, 24]} />
        </mesh>

        {/* Thick Plush Seat Cushion at y = 0.44m */}
        <mesh position={[0, 0.44, 0.02]} material={cushionMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.10, 24]} />
        </mesh>

        {/* Curved Bucket Backrest & Wraparound Arms (Solid back at -Z, open front at +Z) */}
        <mesh position={[0, 0.64, 0.02]} material={chairFabricMaterial} castShadow receiveShadow>
          <cylinderGeometry
            args={[0.42, 0.40, 0.36, 24, 1, true, -Math.PI * 0.75, Math.PI * 1.5]}
          />
        </mesh>

        {/* Padded Top Rim of Tub Chair */}
        <mesh
          position={[0, 0.81, 0.02]}
          rotation={[-Math.PI / 2, 0, -Math.PI * 0.75]}
          material={chairFabricMaterial}
          castShadow
        >
          <torusGeometry args={[0.41, 0.035, 12, 24, Math.PI * 1.5]} />
        </mesh>
      </group>

      {/* ================= 2. Seated Panelist Figure ================= */}
      <group position={[0, 0.0, 0]}>
        {/* Seated Head (eye height ~1.22m) */}
        <mesh position={[0, 1.22, -0.05]} material={skinMaterial} castShadow receiveShadow>
          <sphereGeometry args={[0.105, 20, 20]} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 1.10, -0.04]} material={skinMaterial} castShadow>
          <cylinderGeometry args={[0.042, 0.046, 0.08, 14]} />
        </mesh>

        {/* Seated Torso (leaning slightly into backrest) */}
        <mesh position={[0, 0.82, -0.04]} rotation={[-0.10, 0, 0]} material={panelistSuitMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.19, 0.16, 0.48, 16]} />
        </mesh>

        {/* Arms resting naturally on Tub Chair armrests */}
        <mesh position={[-0.26, 0.74, 0.08]} rotation={[0.45, 0.1, -0.15]} material={panelistSuitMaterial} castShadow>
          <cylinderGeometry args={[0.045, 0.040, 0.44, 12]} />
        </mesh>
        <mesh position={[0.26, 0.74, 0.08]} rotation={[0.45, -0.1, 0.15]} material={panelistSuitMaterial} castShadow>
          <cylinderGeometry args={[0.045, 0.040, 0.44, 12]} />
        </mesh>

        {/* Hands resting on armrests */}
        <mesh position={[-0.30, 0.65, 0.22]} material={skinMaterial} castShadow>
          <sphereGeometry args={[0.038, 12, 12]} />
        </mesh>
        <mesh position={[0.30, 0.65, 0.22]} material={skinMaterial} castShadow>
          <sphereGeometry args={[0.038, 12, 12]} />
        </mesh>

        {/* Thighs (horizontal on chair seat cushion) */}
        <mesh position={[-0.10, 0.48, 0.18]} rotation={[Math.PI / 2, 0, 0]} material={panelistSuitMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.42, 14]} />
        </mesh>
        <mesh position={[0.10, 0.48, 0.18]} rotation={[Math.PI / 2, 0, 0]} material={panelistSuitMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.42, 14]} />
        </mesh>

        {/* Lower Legs (vertical down to stage deck) */}
        <mesh position={[-0.10, 0.24, 0.40]} material={panelistSuitMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.045, 0.42, 14]} />
        </mesh>
        <mesh position={[0.10, 0.24, 0.40]} material={panelistSuitMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.045, 0.42, 14]} />
        </mesh>

        {/* Shoes on Floor */}
        <mesh position={[-0.10, 0.03, 0.44]} material={shoesMaterial} castShadow>
          <boxGeometry args={[0.09, 0.06, 0.20]} />
        </mesh>
        <mesh position={[0.10, 0.03, 0.44]} material={shoesMaterial} castShadow>
          <boxGeometry args={[0.09, 0.06, 0.20]} />
        </mesh>
      </group>

      {/* Floor contact shadow */}
      <mesh position={[0, 0.005, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.50, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
    </group>
  );
};

// ================= Four Person Panel Stage Rig =================
interface FourPersonPanelProps {
  position: [number, number, number];
}

const FourPersonPanel: React.FC<FourPersonPanelProps> = ({ position }) => {
  // 4 Panelists with varied executive suit colors and curved stage arc yaw
  const panelConfig = [
    { x: -2.6, yaw: 0.22, color: '#475569' }, // Panelist 1 (Far Left, angled inward +12.6 deg)
    { x: -0.9, yaw: 0.07, color: '#52607a' }, // Panelist 2 (Mid Left, angled inward +4 deg)
    { x: 0.9, yaw: -0.07, color: '#3f4859' }, // Panelist 3 (Mid Right, angled inward -4 deg)
    { x: 2.6, yaw: -0.22, color: '#384252' }, // Panelist 4 (Far Right, angled inward -12.6 deg)
  ];

  const tableTopMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        metalness: 0.2,
        roughness: 0.2,
      }),
    []
  );

  const tableChromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        metalness: 0.9,
        roughness: 0.15,
      }),
    []
  );

  return (
    <group position={position}>
      {/* 4 Seated Tub Chair Panelists */}
      {panelConfig.map((p, idx) => (
        <TubChairPanelist
          key={idx}
          position={[p.x, 0, 0]}
          rotationY={p.yaw}
          suitColor={p.color}
        />
      ))}

      {/* 2 Low Side / Cocktail Tables between pairs */}
      {[-1.75, 1.75].map((tblX, idx) => (
        <group key={idx} position={[tblX, 0, 0.15]}>
          {/* Base */}
          <mesh position={[0, 0.015, 0]} material={tableChromeMaterial} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.02, 20]} />
          </mesh>
          {/* Stem */}
          <mesh position={[0, 0.22, 0]} material={tableChromeMaterial} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.42, 14]} />
          </mesh>
          {/* Dark Glass Top */}
          <mesh position={[0, 0.44, 0]} material={tableTopMaterial} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
          </mesh>
          {/* Water glass / tumbler */}
          <mesh position={[0.05, 0.49, 0.04]} castShadow>
            <cylinderGeometry args={[0.03, 0.025, 0.09, 14]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ================= Root Occlusion Stage Component =================
export const PresenterSilhouette: React.FC = () => {
  const showPresenter = useStageStore((s) => s.showPresenter);
  const presenterOffset = useStageStore((s) => s.presenterOffset);
  const showLectern = useStageStore((s) => s.showLectern);
  const lecternOffset = useStageStore((s) => s.lecternOffset);
  const showPanel = useStageStore((s) => s.showPanel);
  const panelOffset = useStageStore((s) => s.panelOffset);

  const stageHeight = useStageStore((s) => s.stageHeight);
  const screenPosition = useStageStore((s) => s.screenPosition);

  return (
    <>
      {/* 1. Standing Presenter (1.8m Mannequin) */}
      {showPresenter && (
        <PresenterMannequin
          position={[
            screenPosition[0] + presenterOffset[0],
            stageHeight,
            screenPosition[2] + presenterOffset[1],
          ]}
        />
      )}

      {/* 2. Podium / Lectern (1.15m height, 0.6m width) */}
      {showLectern && (
        <LecternPodium
          position={[
            screenPosition[0] + lecternOffset[0],
            stageHeight,
            screenPosition[2] + lecternOffset[1],
          ]}
        />
      )}

      {/* 3. Four-Person Seated Panel in Tub Chairs */}
      {showPanel && (
        <FourPersonPanel
          position={[
            screenPosition[0] + panelOffset[0],
            stageHeight,
            screenPosition[2] + panelOffset[1],
          ]}
        />
      )}
    </>
  );
};
