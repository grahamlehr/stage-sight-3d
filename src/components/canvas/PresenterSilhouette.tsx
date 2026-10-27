import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStageStore, selectPrimaryScreen } from '../../store/useStageStore';
import {
  SEATED_CROSSED_POSE,
  SEATED_OPEN_POSE,
  buildContactShadows,
  buildFigure,
  buildLectern,
  buildSideTables,
  buildTubChair,
  disposeAll,
  type FigureLook,
  type FigurePose,
  type SlotGeometries,
  type FigureSlot,
  type Vec3,
} from './stagePropGeometry';
import { PRESENTER_PAIR, fitToHeight, type PairFigure } from '../../utils/presenterPair';

// The props' geometry lives in stagePropGeometry.ts: each one is merged into a
// geometry per material slot with vertex colors, so these components only
// place meshes. Geometry is built once per mount and disposed on unmount.

// ================= Shared Materials =================
const createPropMaterials = () => {
  const standard = (params: THREE.MeshStandardMaterialParameters) =>
    new THREE.MeshStandardMaterial({ vertexColors: true, ...params });
  return {
    cloth: standard({ roughness: 0.82, metalness: 0 }), // wool suiting
    skin: standard({ roughness: 0.55, metalness: 0 }), // skin and hair
    gloss: standard({ roughness: 0.3, metalness: 0.05 }), // leather shoes, silk ties, eyes
    upholstery: standard({ roughness: 0.92, metalness: 0, side: THREE.DoubleSide }),
    chrome: standard({ roughness: 0.25, metalness: 0.65 }),
    wood: standard({ roughness: 0.48, metalness: 0 }), // satin-lacquered walnut
    darkMetal: standard({ roughness: 0.38, metalness: 0.55 }),
    matte: standard({ roughness: 0.9, metalness: 0 }),
    stone: standard({ roughness: 0.28, metalness: 0 }),
    glass: standard({ roughness: 0.05, metalness: 0, transparent: true, opacity: 0.38, depthWrite: false }),
    shadow: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
  };
};
type PropMaterials = ReturnType<typeof createPropMaterials>;

const FigureMeshes: React.FC<{ geometry: SlotGeometries<FigureSlot>; materials: PropMaterials }> = ({
  geometry,
  materials,
}) => (
  <>
    <mesh geometry={geometry.cloth} material={materials.cloth} castShadow receiveShadow />
    {/* Skin skips shadow receiving: the overhead key light otherwise darkens every jaw into a beard */}
    <mesh geometry={geometry.skin} material={materials.skin} castShadow />
    <mesh geometry={geometry.gloss} material={materials.gloss} castShadow />
  </>
);

// ================= Standing Presenters (1.8m and 1.68m) =================
// Low-poly rigged models by Quaternius (CC-BY 3.0), credited in README.md.
// Each file keeps one animation, and its first frame is the standing pose.
const POSE_CLIP = 'CharacterArmature|Idle_Neutral';

const modelUrl = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;

/** Disposes the geometry and materials a loaded model owns. */
const disposeModel = (root: THREE.Object3D) =>
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
  });

/** Holds the model in its standing pose, scaled to height with its feet on y = 0. */
const poseFigure = (gltf: GLTF, figure: PairFigure): THREE.Group => {
  const model = gltf.scene;
  const clip = THREE.AnimationClip.findByName(gltf.animations, POSE_CLIP);
  if (clip) {
    // Apply the first frame once; the mixer is dropped, so the pose stays put
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(clip).play();
    mixer.update(0);
  }
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) child.castShadow = true;
  });
  model.updateMatrixWorld(true);
  // Skinned meshes measure their posed vertices, not the bind pose
  const box = new THREE.Box3().setFromObject(model);
  const { scale, lift } = fitToHeight(box.min.y, box.max.y, figure.height);
  model.scale.setScalar(scale);
  model.position.y = lift;

  const placed = new THREE.Group();
  placed.position.x = figure.x;
  placed.rotation.y = figure.yaw;
  placed.add(model);
  return placed;
};

const PresenterPair: React.FC<{ position: Vec3; materials: PropMaterials }> = ({ position, materials }) => {
  const [figures, setFigures] = useState<THREE.Group[] | null>(null);
  const shadow = useMemo(
    () => buildContactShadows(PRESENTER_PAIR.map((f) => [f.x, 0.02, 0.36, 0.32, 0.45] as const)),
    []
  );
  useEffect(() => () => shadow.dispose(), [shadow]);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    Promise.all(PRESENTER_PAIR.map((f) => loader.loadAsync(modelUrl(f.file))))
      .then((gltfs) => {
        if (cancelled) {
          gltfs.forEach((g) => disposeModel(g.scene));
          return;
        }
        setFigures(gltfs.map((g, i) => poseFigure(g, PRESENTER_PAIR[i])));
      })
      .catch((err) => console.error('Failed to load the presenter models:', err));
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => () => figures?.forEach(disposeModel), [figures]);

  return (
    <group position={position}>
      {figures?.map((figure, i) => <primitive key={i} object={figure} />)}
      <mesh geometry={shadow} material={materials.shadow} />
    </group>
  );
};

// ================= Lectern (1.15m, front panel toward the audience) =================
const LecternPodium: React.FC<{ position: Vec3; materials: PropMaterials }> = ({ position, materials }) => {
  const geometry = useMemo(
    () => ({
      lectern: buildLectern(),
      shadow: buildContactShadows([[0, -0.005, 0.5, 0.42, 0.5]]),
    }),
    []
  );
  useEffect(
    () => () => {
      disposeAll(geometry.lectern);
      geometry.shadow.dispose();
    },
    [geometry]
  );

  return (
    <group position={position}>
      <mesh geometry={geometry.lectern.wood} material={materials.wood} castShadow receiveShadow />
      <mesh geometry={geometry.lectern.metal} material={materials.darkMetal} castShadow receiveShadow />
      <mesh geometry={geometry.lectern.matte} material={materials.matte} castShadow />
      <mesh geometry={geometry.shadow} material={materials.shadow} />
    </group>
  );
};

// ================= Four-Person Panel in Tub Chairs =================
interface PanelSeat {
  x: number;
  /** Chair yaw, angled in toward center stage. */
  yaw: number;
  pose: FigurePose;
  look: FigureLook;
}

const PANEL_SEATS: readonly PanelSeat[] = [
  {
    x: -2.6,
    yaw: 0.22,
    pose: { ...SEATED_OPEN_POSE, headYaw: 0.22 },
    look: { skin: '#b57a5a', hair: '#2a211c', hairStyle: 'short', suit: '#3a3f48', shirt: '#eef1f5', tie: '#2f4f7a', shoes: '#1d1814', scale: 0.98 },
  },
  {
    x: -0.9,
    yaw: 0.07,
    pose: { ...SEATED_CROSSED_POSE, headYaw: 0.1 },
    look: { skin: '#8a5a3c', hair: '#17110e', hairStyle: 'long', suit: '#2e3b57', shirt: '#ece6dc', tie: null, shoes: '#1a1412', scale: 0.93 },
  },
  {
    x: 0.9,
    yaw: -0.07,
    pose: { ...SEATED_OPEN_POSE, headYaw: -0.12 },
    look: { skin: '#e0b096', hair: '#8f8b86', hairStyle: 'short', suit: '#5a606b', shirt: '#f4f6f8', tie: '#6b2430', shoes: '#2b1f17', scale: 0.97 },
  },
  {
    x: 2.6,
    yaw: -0.22,
    pose: { ...SEATED_CROSSED_POSE, headYaw: -0.25 },
    look: { skin: '#c9967a', hair: '#5a3422', hairStyle: 'long', suit: '#4a2c35', shirt: '#f1ede7', tie: null, shoes: '#18120f', scale: 0.92 },
  },
];

const TABLE_POSITIONS: readonly Vec3[] = [
  [-1.75, 0, 0.15],
  [1.75, 0, 0.15],
];

const FourPersonPanel: React.FC<{ position: Vec3; materials: PropMaterials }> = ({ position, materials }) => {
  const geometry = useMemo(
    () => ({
      figures: PANEL_SEATS.map((seat) => buildFigure(seat.pose, seat.look)),
      // One chair geometry, drawn at each seat
      chair: buildTubChair(),
      tables: buildSideTables(TABLE_POSITIONS),
      shadow: buildContactShadows([
        ...PANEL_SEATS.map((seat) => [seat.x, 0.04, 0.5, 0.5, 0.42] as const),
        ...TABLE_POSITIONS.map((p) => [p[0], p[2], 0.28, 0.28, 0.3] as const),
      ]),
    }),
    []
  );
  useEffect(
    () => () => {
      geometry.figures.forEach(disposeAll);
      disposeAll(geometry.chair);
      disposeAll(geometry.tables);
      geometry.shadow.dispose();
    },
    [geometry]
  );

  return (
    <group position={position}>
      {PANEL_SEATS.map((seat, idx) => (
        <group key={idx} position={[seat.x, 0, 0]} rotation={[0, seat.yaw, 0]}>
          <mesh geometry={geometry.chair.fabric} material={materials.upholstery} castShadow receiveShadow />
          <mesh geometry={geometry.chair.metal} material={materials.chrome} castShadow />
          <FigureMeshes geometry={geometry.figures[idx]} materials={materials} />
        </group>
      ))}

      <mesh geometry={geometry.tables.top} material={materials.stone} castShadow receiveShadow />
      <mesh geometry={geometry.tables.metal} material={materials.chrome} castShadow />
      <mesh geometry={geometry.tables.glass} material={materials.glass} />
      <mesh geometry={geometry.shadow} material={materials.shadow} />
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

  // Props stand on the demo ballroom's deck, or on the deck found in a custom venue
  const deckHeight = useStageStore((s) =>
    s.venueSource === 'custom-glb' ? s.customDeckHeight : s.stageHeight
  );
  const screenPosition = useStageStore((s) => selectPrimaryScreen(s).position);

  // Shared by all three props, so toggling one doesn't recompile shaders
  const materials = useMemo(() => createPropMaterials(), []);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  return (
    <>
      {/* 1. Two Standing Presenters (1.8m and 1.68m) */}
      {showPresenter && (
        <PresenterPair
          materials={materials}
          position={[
            screenPosition[0] + presenterOffset[0],
            deckHeight,
            screenPosition[2] + presenterOffset[1],
          ]}
        />
      )}

      {/* 2. Podium / Lectern (1.15m height, 0.62m width) */}
      {showLectern && (
        <LecternPodium
          materials={materials}
          position={[
            screenPosition[0] + lecternOffset[0],
            deckHeight,
            screenPosition[2] + lecternOffset[1],
          ]}
        />
      )}

      {/* 3. Four-Person Seated Panel in Tub Chairs */}
      {showPanel && (
        <FourPersonPanel
          materials={materials}
          position={[
            screenPosition[0] + panelOffset[0],
            deckHeight,
            screenPosition[2] + panelOffset[1],
          ]}
        />
      )}
    </>
  );
};
