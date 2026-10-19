import React, { Component, ReactNode, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeEvent } from '@react-three/fiber';
import { useStageStore } from '../../store/useStageStore';

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

        // Extracted physical dimensions
        const computedWidth = Math.max(1, Math.round(Math.max(size.x, size.z) * 10) / 10);
        const computedHeight = Math.max(1, Math.round(size.y * 10) / 10);

        setScreenDimensions(computedWidth, computedHeight);
        setScreenPosition([center.x, center.y, center.z]);
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
    <primitive
      object={scene}
      onPointerDown={handleMeshClick}
    />
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
