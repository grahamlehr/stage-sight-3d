import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStageStore, selectPrimaryScreen } from '../../store/useStageStore';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  buildContactShadows,
  buildLectern,
  buildSideTables,
  buildTubChair,
  disposeAll,
  type Vec3,
} from './stagePropGeometry';
import {
  FIGURE_KINDS,
  FIGURE_MODELS,
  PANEL_KINDS,
  PRESENTER_PAIR,
  fitToHeight,
  type FigureKind,
} from '../../utils/presenterPair';
import { SEATED_POSE, SEAT_BONE_NAMES, applySeatedPose, type SeatBones } from '../../utils/figurePose';

// The lectern, chairs and tables come from stagePropGeometry.ts: each is merged
// into a geometry per material slot with vertex colors, so these components only
// place meshes. Geometry is built once per mount and disposed on unmount. The
// people are rigged models, posed below.

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

// ================= People: standing presenters and seated panel =================
// Low-poly rigged models by Quaternius (CC-BY 3.0), credited in README.md.
// Each file keeps one animation, whose first frame is the standing pose; the
// panel bends that pose into a seated one.
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

/**
 * Loads the man and the woman, and disposes them on unmount. Figures are
 * clones that share the loaded geometry and materials, so only these are disposed.
 */
const useFigureModels = (): Record<FigureKind, GLTF> | null => {
  const [models, setModels] = useState<Record<FigureKind, GLTF> | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    Promise.all(FIGURE_KINDS.map((kind) => loader.loadAsync(modelUrl(FIGURE_MODELS[kind].file))))
      .then((gltfs) => {
        if (cancelled) {
          gltfs.forEach((g) => disposeModel(g.scene));
          return;
        }
        setModels(Object.fromEntries(FIGURE_KINDS.map((kind, i) => [kind, gltfs[i]])) as Record<FigureKind, GLTF>);
      })
      .catch((err) => console.error('Failed to load the people models:', err));
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(
    () => () => {
      if (models) Object.values(models).forEach((g) => disposeModel(g.scene));
    },
    [models]
  );
  return models;
};

/** Brings skinned meshes' bone matrices and bounds up to date after their bones move. */
const refreshSkinning = (root: THREE.Object3D) => {
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.update();
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  });
};

/** A copy of the model in its standing pose, scaled to height with its feet on y = 0. */
const standingFigure = (gltf: GLTF, kind: FigureKind): THREE.Object3D => {
  const model = cloneSkinned(gltf.scene);
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
  refreshSkinning(model);
  const box = new THREE.Box3().setFromObject(model);
  const { scale, lift } = fitToHeight(box.min.y, box.max.y, FIGURE_MODELS[kind].height);
  model.scale.setScalar(scale);
  model.position.y = lift;
  refreshSkinning(model);
  return model;
};

/**
 * Where a seated figure's hip joints go in its chair, from the chair's origin
 * on the floor: over the back half of the 0.48m cushion, high enough for the
 * thighs to rest on it rather than sink in.
 */
const SEATED_HIP = { y: 0.56, z: -0.1 };

/** A copy of the model sitting in a chair at the origin, feet on the floor, facing +Z. */
const seatedFigure = (gltf: GLTF, kind: FigureKind, headYaw: number): THREE.Object3D => {
  const model = standingFigure(gltf, kind);
  // GLTFLoader strips characters such as '.' from node names
  const bone = (name: string) => {
    const found = model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
    if (!found) throw new Error(`Missing bone ${name}`);
    return found;
  };
  const bones = Object.fromEntries(SEAT_BONE_NAMES.map((name) => [name, bone(name)])) as SeatBones;
  const position = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

  // Standing, the feet are on y = 0. Seating doesn't move the hip joints, so
  // the drop that brings them to seat height is known now, and with it where
  // the floor will be: the feet are posed onto it.
  const hip = position(bones['UpperLeg.L']).add(position(bones['UpperLeg.R'])).multiplyScalar(0.5);
  const drop = hip.y - SEATED_HIP.y;
  applySeatedPose(bones, { ...SEATED_POSE, headYaw }, position(bones['Foot.L']).y + drop);

  model.position.x -= hip.x;
  model.position.y -= drop;
  model.position.z += SEATED_HIP.z - hip.z;
  refreshSkinning(model);
  return model;
};

// ================= Standing Presenters (1.8m and 1.68m) =================
const PresenterPair: React.FC<{ position: Vec3; materials: PropMaterials }> = ({ position, materials }) => {
  const models = useFigureModels();
  const figures = useMemo(
    () => models && PRESENTER_PAIR.map((f) => standingFigure(models[f.kind], f.kind)),
    [models]
  );
  const shadow = useMemo(
    () => buildContactShadows(PRESENTER_PAIR.map((f) => [f.x, 0.02, 0.36, 0.32, 0.45] as const)),
    []
  );
  useEffect(() => () => shadow.dispose(), [shadow]);

  return (
    <group position={position}>
      {figures?.map((figure, i) => (
        <group key={i} position={[PRESENTER_PAIR[i].x, 0, 0]} rotation={[0, PRESENTER_PAIR[i].yaw, 0]}>
          <primitive object={figure} />
        </group>
      ))}
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
  /** Head turn on top of the chair's, towards the figure's left (+X). */
  headYaw: number;
}

// Two men and two women, alternating (PANEL_KINDS)
const PANEL_SEATS: readonly PanelSeat[] = [
  { x: -2.6, yaw: 0.22, headYaw: 0.15 },
  { x: -0.9, yaw: 0.07, headYaw: 0.05 },
  { x: 0.9, yaw: -0.07, headYaw: -0.08 },
  { x: 2.6, yaw: -0.22, headYaw: -0.2 },
];

const TABLE_POSITIONS: readonly Vec3[] = [
  [-1.75, 0, 0.15],
  [1.75, 0, 0.15],
];

const FourPersonPanel: React.FC<{ position: Vec3; materials: PropMaterials }> = ({ position, materials }) => {
  const models = useFigureModels();
  const figures = useMemo(
    () => models && PANEL_SEATS.map((seat, i) => seatedFigure(models[PANEL_KINDS[i]], PANEL_KINDS[i], seat.headYaw)),
    [models]
  );
  const geometry = useMemo(
    () => ({
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
          {figures && <primitive object={figures[idx]} />}
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
