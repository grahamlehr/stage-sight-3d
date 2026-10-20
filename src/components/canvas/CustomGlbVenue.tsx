import React, { Component, ReactNode, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeEvent } from '@react-three/fiber';
import { useStageStore } from '../../store/useStageStore';
import { alignScreenMesh, deckProbeOrigin } from '../../utils/venueAlignment';

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
  const setScreenDimensions = useStageStore((s) => s.setScreenDimensions);
  const setScreenPosition = useStageStore((s) => s.setScreenPosition);
  const setBoundMeshName = useStageStore((s) => s.setBoundMeshName);
  const setIsPickingMesh = useStageStore((s) => s.setIsPickingMesh);
  const setVenueSource = useStageStore((s) => s.setVenueSource);
  const setCustomGlbUrl = useStageStore((s) => s.setCustomGlbUrl);
  const navigationMode = useStageStore((s) => s.navigationMode);
  const setSeatPosition = useStageStore((s) => s.setSeatPosition);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);
  const venueYaw = useStageStore((s) => s.venueYaw);
  const setVenueYaw = useStageStore((s) => s.setVenueYaw);
  const setCustomDeckHeight = useStageStore((s) => s.setCustomDeckHeight);

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

  const handleMeshClick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;

    if (isPickingMesh && mesh.geometry) {
      // Mesh Click-to-Bind mode. Measure in WORLD space: a geometry-local box
      // ignores the mesh's and its ancestors' scale, so a centimetre-authored GLB
      // imported at 0.01 root scale would report an 800m-wide screen.
      const bbox = new THREE.Box3().setFromObject(mesh);
      if (!bbox.isEmpty()) {
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        // The preview screen only faces +Z, so turn the venue until the picked
        // wall does too, then bind to where the wall lands after the turn.
        // The wall's front is the side the user clicked it from.
        const aligned = alignScreenMesh(center.toArray(), size.toArray(), e.ray.origin.toArray());

        // Stand the occlusion props on the stage: the first surface straight
        // down from just in front of the wall. A turn about Y doesn't change
        // heights, so probing before the turn is applied is fine.
        if (scene) {
          const origin = new THREE.Vector3(...deckProbeOrigin(center.toArray(), aligned));
          const hit = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0)).intersectObject(scene, true)[0];
          setCustomDeckHeight(hit ? Math.round(hit.point.y * 100) / 100 : 0);
        }

        setVenueYaw(venueYaw + aligned.yawDelta);
        setScreenDimensions(aligned.width, aligned.height);
        setScreenPosition(aligned.center);
        setBoundMeshName(mesh.name || `Mesh_${mesh.id}`);
        setIsPickingMesh(false);
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
    <group rotation={[0, venueYaw, 0]}>
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
