import React, { Component, ReactNode, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeEvent } from '@react-three/fiber';
import { useStageStore } from '../../store/useStageStore';
import { alignScreenMesh, deckProbeOrigin, rotateAboutY } from '../../utils/venueAlignment';
import { measureScreenMesh } from '../../utils/screenMeshMeasure';
import { normaliseYaw } from '../../utils/floorPlan';

/** The mesh's triangles as world-space xyz triples, for indexed and non-indexed geometry. */
function worldTriangles(mesh: THREE.Mesh): Float32Array {
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute('position');
  if (!position) return new Float32Array(0);
  const index = mesh.geometry.getIndex();
  const count = index ? index.count : position.count;
  const triangleVertices = count - (count % 3);
  const out = new Float32Array(triangleVertices * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < triangleVertices; i++) {
    v.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  return out;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class GlbErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  // Side effects belong here, in the commit phase. Running them from render()
  // dispatches a store update mid-render, which React warns about and which can
  // re-enter indefinitely because hasError stays true.
  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface LoadedGlbProps {
  url: string;
}

const LoadedGlbModel: React.FC<LoadedGlbProps> = ({ url }) => {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const isPickingMesh = useStageStore((s) => s.isPickingMesh);
  const addScreen = useStageStore((s) => s.addScreen);
  const updateScreen = useStageStore((s) => s.updateScreen);
  const setSelectedScreen = useStageStore((s) => s.setSelectedScreen);
  const setIsPickingMesh = useStageStore((s) => s.setIsPickingMesh);
  const setVenueSource = useStageStore((s) => s.setVenueSource);
  const setCustomGlbUrl = useStageStore((s) => s.setCustomGlbUrl);
  const navigationMode = useStageStore((s) => s.navigationMode);
  const setSeatPosition = useStageStore((s) => s.setSeatPosition);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);
  const venueYaw = useStageStore((s) => s.venueYaw);
  const setVenueYaw = useStageStore((s) => s.setVenueYaw);
  const setCustomDeckHeight = useStageStore((s) => s.setCustomDeckHeight);
  const setCustomVenueBounds = useStageStore((s) => s.setCustomVenueBounds);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        // Traverse and ensure shadows and materials
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        setScene(gltf.scene);
      },
      undefined,
      (err) => {
        console.error('Failed to parse custom GLB:', err);
        alert('Failed to load custom GLB file. Reverting to Default Ballroom.');
        setVenueSource('default-ballroom');
        // Also releases the uploaded blob URL rather than leaking the whole file
        setCustomGlbUrl(null);
      }
    );
  }, [url, setVenueSource, setCustomGlbUrl]);

  // Publish the venue's world-space bounds for the floor plan, and refresh them
  // when the venue turns (a turn about the origin moves the box)
  useEffect(() => {
    const group = groupRef.current;
    if (!scene || !group) return;
    group.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(group);
    if (!box.isEmpty()) {
      setCustomVenueBounds({ min: box.min.toArray(), max: box.max.toArray() });
    }
  }, [scene, venueYaw, setCustomVenueBounds]);

  useEffect(() => () => setCustomVenueBounds(null), [setCustomVenueBounds]);

  const handleMeshClick = (e: ThreeEvent<PointerEvent>) => {
    // The floor plan places views itself; a click on the model must not also bind or sit
    if (useStageStore.getState().isFloorPlanOpen) return;
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;

    if (isPickingMesh && mesh.geometry) {
      // Mesh Click-to-Bind mode. Measure in WORLD space: a geometry-local box
      // ignores the mesh's and its ancestors' scale, so a centimetre-authored GLB
      // imported at 0.01 root scale would report an 800m-wide screen.
      const tris = worldTriangles(mesh);
      const bbox = new THREE.Box3().setFromObject(mesh);
      if (tris.length >= 9 && !bbox.isEmpty()) {
        const measured = measureScreenMesh(tris, e.ray.origin.toArray());
        const boundMeshName = mesh.name || `Mesh_${mesh.id}`;
        const { screens } = useStageStore.getState();
        const isFirstPick = screens.length === 1 && screens[0].boundMeshName === null;
        // The preview plane doesn't catch clicks, so a bound mesh can be picked
        // again through it: select its screen rather than adding a duplicate
        const alreadyBound = screens.find((s) => s.boundMeshName === boundMeshName);

        if (alreadyBound) {
          setSelectedScreen(alreadyBound.id);
        } else if (isFirstPick) {
          // The first pick turns the venue so the wall faces +Z, and stands the
          // occlusion props on the stage in front of it. The wall's front is the
          // side the user clicked it from.
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());
          const aligned = alignScreenMesh(center.toArray(), size.toArray(), e.ray.origin.toArray());

          // A turn about Y doesn't change heights, so probing before the turn is fine
          if (scene) {
            const origin = new THREE.Vector3(...deckProbeOrigin(center.toArray(), aligned));
            const hit = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0)).intersectObject(scene, true)[0];
            setCustomDeckHeight(hit ? Math.round(hit.point.y * 100) / 100 : 0);
          }

          // Turn the venue first: setVenueYaw also turns screens already bound to
          // the room, and this one isn't bound until the update below.
          setVenueYaw(venueYaw + aligned.yawDelta);
          // The measurement is in pre-turn world coordinates, so carry it round
          // with the room. Any angle beyond the quarter turn stays as the screen's own yaw.
          updateScreen(screens[0].id, {
            width: measured.width,
            height: measured.height,
            position: rotateAboutY(measured.center, aligned.yawDelta),
            rotation: [0, normaliseYaw(measured.yaw + aligned.yawDelta), 0],
            boundMeshName,
          });
        } else {
          // Further picks add a screen where the mesh already is: no venue turn
          addScreen({
            name: `Screen ${screens.length + 1}`,
            role: 'repeat',
            width: measured.width,
            height: measured.height,
            position: measured.center,
            rotation: [0, measured.yaw, 0],
            boundMeshName,
          });
        }

        // Shift-click keeps picking so several meshes can be added in a row
        if (!e.shiftKey) setIsPickingMesh(false);
      }
      return;
    }

    // Otherwise, check for seated raycast
    if (navigationMode === 'seated' || e.shiftKey) {
      const pt = e.point;
      setSeatPosition([pt.x, 0, pt.z]);
      if (navigationMode !== 'seated') {
        setNavigationMode('seated');
      }
    }
  };

  if (!scene) return null;

  return (
    // Turn about the world origin: alignScreenMesh assumes that pivot
    <group ref={groupRef} name="custom-venue" rotation={[0, venueYaw, 0]}>
      <primitive
        object={scene}
        onPointerDown={handleMeshClick}
      />
    </group>
  );
};

export const CustomGlbVenue: React.FC = () => {
  const customGlbUrl = useStageStore((s) => s.customGlbUrl);
  const setVenueSource = useStageStore((s) => s.setVenueSource);
  const setCustomGlbUrl = useStageStore((s) => s.setCustomGlbUrl);

  if (!customGlbUrl) return null;

  return (
    <GlbErrorBoundary
      fallback={null}
      onError={(err) => {
        console.error('GLB Error caught:', err);
        setVenueSource('default-ballroom');
        // Also releases the uploaded blob URL
        setCustomGlbUrl(null);
      }}
    >
      <LoadedGlbModel url={customGlbUrl} />
    </GlbErrorBoundary>
  );
};
