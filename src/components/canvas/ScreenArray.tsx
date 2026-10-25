import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { useStageStore, selectPrimaryScreen, type StageScreen } from '../../store/useStageStore';
import { generateTestPatternCanvas } from '../../utils/testPatternGenerator';
import { computeScreenRegions, splitCanvasSize, type UvRegion } from '../../utils/screenLayout';

const FULL_FRAME: UvRegion = { u0: 0, u1: 1, v0: 0, v1: 1 };

interface ScreenPanelProps {
  screen: StageScreen;
  region: UvRegion;
  texture: THREE.Texture | null;
  onGroup: (id: string, group: THREE.Group | null) => void;
}

/** One screen: bezel, display plane showing its slice of the shared texture, and underglow. */
const ScreenPanel: React.FC<ScreenPanelProps> = ({ screen, region, texture, onGroup }) => {
  const { id, width, height, position, rotation } = screen;
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const setGroup = useCallback((group: THREE.Group | null) => onGroup(id, group), [id, onGroup]);

  // Crop by rewriting the plane's UVs rather than the shared texture's repeat/offset,
  // so every panel can show a different part of the one texture. PlaneGeometry's
  // vertex order is top-left, top-right, bottom-left, bottom-right.
  useEffect(() => {
    const uv = geometryRef.current?.attributes.uv;
    if (!uv) return;
    uv.setXY(0, region.u0, region.v1);
    uv.setXY(1, region.u1, region.v1);
    uv.setXY(2, region.u0, region.v0);
    uv.setXY(3, region.u1, region.v0);
    uv.needsUpdate = true;
  }, [region, width, height]);

  return (
    <group ref={setGroup} position={position} rotation={rotation}>
      {/* LED Screen Frame Bezel / Backing */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[width + 0.16, height + 0.16, 0.1]} />
        <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* LED Screen Display Surface (Unlit Emissive Projection) */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry ref={geometryRef} args={[width, height]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
        ) : (
          <meshBasicMaterial color="#000000" />
        )}
      </mesh>

      {/* Subtle LED Screen Underglow / Stage Wash onto Stage Floor */}
      <pointLight position={[0, -height / 2 - 0.2, 0.4]} color="#38bdf8" intensity={0.6} distance={8} />
    </group>
  );
};

/**
 * Every screen in the venue. One texture and one hidden video element feed all
 * the panels; each panel crops its own slice through its plane's UVs.
 */
export const ScreenArray: React.FC = () => {
  const { gl } = useThree();
  // Held in state (via callback refs) rather than plain refs so the gizmo below
  // re-renders once the group exists — a ref read during render is not reactive.
  const [groups, setGroups] = useState<Record<string, THREE.Group>>({});
  const handleGroup = useCallback((id: string, group: THREE.Group | null) => {
    setGroups((prev) => {
      if (group === null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return prev[id] === group ? prev : { ...prev, [id]: group };
    });
  }, []);

  // Store state
  const screens = useStageStore((s) => s.screens);
  const splitOrder = useStageStore((s) => s.splitOrder);
  const selectedScreenId = useStageStore((s) => s.selectedScreenId);
  const showTransformGizmo = useStageStore((s) => s.showTransformGizmo);
  const setScreenPosition = useStageStore((s) => s.setScreenPosition);
  const setIsTransformDragging = useStageStore((s) => s.setIsTransformDragging);

  // The test pattern is drawn at the split group's combined size, or the primary screen's
  const primaryScreenId = useStageStore((s) => s.primaryScreenId);
  const primary = selectPrimaryScreen({ screens, primaryScreenId });
  const splitSize = splitCanvasSize(screens);
  const patternWidth = splitSize ? splitSize.width : primary.width;
  const patternHeight = splitSize ? splitSize.height : primary.height;

  // Hiding the gizmo mid-drag unmounts it before its mouseUp fires; clear the flag
  // so camera navigation isn't left switched off.
  useEffect(() => {
    if (!showTransformGizmo) setIsTransformDragging(false);
  }, [showTransformGizmo, setIsTransformDragging]);

  const sourceType = useStageStore((s) => s.sourceType);
  const slides = useStageStore((s) => s.slides);
  const currentSlideIndex = useStageStore((s) => s.currentSlideIndex);
  const activeVideoStream = useStageStore((s) => s.activeVideoStream);
  const uvCropMode = useStageStore((s) => s.uvCropMode);
  const manualUvRepeatY = useStageStore((s) => s.manualUvRepeatY);
  const manualUvOffsetY = useStageStore((s) => s.manualUvOffsetY);

  // Texture state
  const [activeTexture, setActiveTexture] = useState<THREE.Texture | null>(null);
  // Real size of the live video frame; null for stills, which are shown whole
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

  // 1. Texture Generation & Management with rigorous GPU VRAM disposal
  useEffect(() => {
    let newTexture: THREE.Texture | null = null;
    let videoEl: HTMLVideoElement | null = null;
    let onVideoMetadata: (() => void) | null = null;

    if ((sourceType === 'hdmi-capture' || sourceType === 'screen-share') && activeVideoStream) {
      // Create hidden video element
      videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      videoEl.srcObject = activeVideoStream;
      videoEl.play().catch((err) => console.warn('Video stream autoplay failed:', err));

      const vidTexture = new THREE.VideoTexture(videoEl);
      vidTexture.colorSpace = THREE.SRGBColorSpace;
      vidTexture.minFilter = THREE.LinearFilter;
      vidTexture.magFilter = THREE.LinearFilter;
      vidTexture.generateMipmaps = false;
      vidTexture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());

      // videoWidth/videoHeight are 0 until the metadata arrives, and 'resize' also
      // covers a screen share whose dimensions change mid-stream. Until then the
      // source is treated as a still (shown whole).
      const metadataTarget = videoEl;
      onVideoMetadata = () => {
        if (metadataTarget.videoWidth > 0 && metadataTarget.videoHeight > 0) {
          setFrameSize((prev) =>
            prev && prev.width === metadataTarget.videoWidth && prev.height === metadataTarget.videoHeight
              ? prev
              : { width: metadataTarget.videoWidth, height: metadataTarget.videoHeight },
          );
        }
      };
      videoEl.addEventListener('loadedmetadata', onVideoMetadata);
      videoEl.addEventListener('resize', onVideoMetadata);

      newTexture = vidTexture;
    } else if (sourceType === 'pdf' && slides.length > 0 && slides[currentSlideIndex]) {
      const slideCanvas = slides[currentSlideIndex];
      const canvasTex = new THREE.CanvasTexture(slideCanvas);
      canvasTex.colorSpace = THREE.SRGBColorSpace;
      canvasTex.minFilter = THREE.LinearFilter;
      canvasTex.magFilter = THREE.LinearFilter;
      canvasTex.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
      canvasTex.needsUpdate = true;
      newTexture = canvasTex;
    } else {
      // Default / fallback: built-in ultra-wide test pattern
      const patternCanvas = generateTestPatternCanvas(patternWidth, patternHeight);
      const canvasTex = new THREE.CanvasTexture(patternCanvas);
      canvasTex.colorSpace = THREE.SRGBColorSpace;
      canvasTex.minFilter = THREE.LinearFilter;
      canvasTex.magFilter = THREE.LinearFilter;
      canvasTex.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
      canvasTex.needsUpdate = true;
      newTexture = canvasTex;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- the texture owns GPU memory, so it is created and disposed with this effect's lifecycle rather than derived during render
    setActiveTexture((prevTexture) => {
      if (prevTexture) {
        prevTexture.dispose(); // Explicit VRAM leak prevention
      }
      return newTexture;
    });

    return () => {
      if (newTexture) {
        newTexture.dispose();
      }
      if (videoEl) {
        if (onVideoMetadata) {
          videoEl.removeEventListener('loadedmetadata', onVideoMetadata);
          videoEl.removeEventListener('resize', onVideoMetadata);
        }
        videoEl.pause();
        videoEl.srcObject = null;
        setFrameSize(null);
      }
    };
  }, [
    sourceType,
    slides,
    currentSlideIndex,
    activeVideoStream,
    patternWidth,
    patternHeight,
    gl,
  ]);

  // 2. Which part of the source each screen shows. Plain numbers, so derived
  // during render; the panels write them into their plane geometries.
  const isLive = (sourceType === 'hdmi-capture' || sourceType === 'screen-share') && activeVideoStream !== null;
  // Pixel size of a still (slide or test pattern canvas), so repeat screens can crop it to their shape
  const stillCanvas = !isLive && activeTexture instanceof THREE.CanvasTexture
    ? (activeTexture.image as HTMLCanvasElement)
    : null;
  const stillWidth = stillCanvas?.width ?? 0;
  const stillHeight = stillCanvas?.height ?? 0;
  const regions = useMemo(
    () =>
      computeScreenRegions({
        screens,
        splitOrder,
        frame: isLive ? frameSize : null,
        still: stillWidth > 0 && stillHeight > 0 ? { width: stillWidth, height: stillHeight } : null,
        cropMode: uvCropMode,
        manualRepeatY: manualUvRepeatY,
        manualOffsetY: manualUvOffsetY,
      }),
    [screens, splitOrder, isLive, frameSize, stillWidth, stillHeight, uvCropMode, manualUvRepeatY, manualUvOffsetY],
  );

  const selectedGroup = groups[selectedScreenId] ?? null;

  return (
    <>
      {screens.map((screen) => (
        <ScreenPanel
          key={screen.id}
          screen={screen}
          region={regions[screen.id] ?? FULL_FRAME}
          texture={activeTexture}
          onGroup={handleGroup}
        />
      ))}

      {/* TransformControls Gizmo. Attached to the selected screen's GROUP, not the
          inner display mesh: TransformControls writes parent-local coordinates, and
          the mesh's parent-local origin is [0,0,0] while the group carries the world
          position. Driving the mesh would write a local offset into the screen's
          position — which the rest of the app reads as world — collapsing it to the
          room origin on the first drag. Each group sits at the scene root, so its
          local transform IS world. */}
      {showTransformGizmo && selectedGroup && (
        <TransformControls
          key={selectedScreenId}
          object={selectedGroup}
          mode="translate"
          // Flag the drag so CameraController keeps the camera still. drei only
          // disables the default OrbitControls once, at drag start; this flag is
          // what stops CameraController re-enabling them (or re-aiming the seated
          // camera) as each move updates the screen position.
          onMouseDown={() => setIsTransformDragging(true)}
          onMouseUp={() => setIsTransformDragging(false)}
          onObjectChange={() => {
            // mode="translate" never alters rotation, so it is left alone. The
            // action targets the selected screen, which is the one being dragged.
            const { x, y, z } = selectedGroup.position;
            setScreenPosition([x, y, z]);
          }}
        />
      )}
    </>
  );
};
