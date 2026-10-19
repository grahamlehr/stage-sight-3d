import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { useStageStore } from '../../store/useStageStore';
import { generateTestPatternCanvas } from '../../utils/testPatternGenerator';
import { computeUvCrop } from '../../utils/uvCropMath';

/**
 * Applies the current crop settings to a live capture texture using the video's
 * real dimensions. Reads the store directly so it stays correct when called from
 * an event listener outside React's render cycle.
 */
const applyVideoCrop = (texture: THREE.Texture, videoEl: HTMLVideoElement) => {
  const st = useStageStore.getState();
  const crop = computeUvCrop({
    cropMode: st.uvCropMode,
    captureWidth: videoEl.videoWidth || 1920,
    captureHeight: videoEl.videoHeight || 1080,
    screenWidth: st.screenWidth,
    screenHeight: st.screenHeight,
    manualRepeatY: st.manualUvRepeatY,
    manualOffsetY: st.manualUvOffsetY,
  });

  texture.repeat.set(crop.repeatX, crop.repeatY);
  texture.offset.set(crop.offsetX, crop.offsetY);
  texture.needsUpdate = true;
};

export const ScreenSurface: React.FC = () => {
  const { gl } = useThree();
  const screenGroupRef = useRef<THREE.Group>(null);

  // Store state
  const screenWidth = useStageStore((s) => s.screenWidth);
  const screenHeight = useStageStore((s) => s.screenHeight);
  const screenPosition = useStageStore((s) => s.screenPosition);
  const screenRotation = useStageStore((s) => s.screenRotation);
  const showTransformGizmo = useStageStore((s) => s.showTransformGizmo);
  const setScreenPosition = useStageStore((s) => s.setScreenPosition);

  const sourceType = useStageStore((s) => s.sourceType);
  const slides = useStageStore((s) => s.slides);
  const currentSlideIndex = useStageStore((s) => s.currentSlideIndex);
  const activeVideoStream = useStageStore((s) => s.activeVideoStream);
  const uvCropMode = useStageStore((s) => s.uvCropMode);
  const manualUvRepeatY = useStageStore((s) => s.manualUvRepeatY);
  const manualUvOffsetY = useStageStore((s) => s.manualUvOffsetY);

  // Texture state
  const [activeTexture, setActiveTexture] = useState<THREE.Texture | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

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
      videoElementRef.current = videoEl;

      const vidTexture = new THREE.VideoTexture(videoEl);
      vidTexture.colorSpace = THREE.SRGBColorSpace;
      vidTexture.minFilter = THREE.LinearFilter;
      vidTexture.magFilter = THREE.LinearFilter;
      vidTexture.generateMipmaps = false;
      vidTexture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());

      // Provisional crop from the 1920x1080 fallback: videoWidth/videoHeight are
      // still 0 this early, so recompute once the real dimensions arrive. Without
      // this a non-16:9 source (ultra-wide capture card, 32:9 screen share) stays
      // cropped for the wrong aspect until the user nudges a crop setting.
      applyVideoCrop(vidTexture, videoEl);

      const metadataTarget = videoEl;
      onVideoMetadata = () => applyVideoCrop(vidTexture, metadataTarget);
      // 'resize' also covers a screen share whose dimensions change mid-stream
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
      const patternCanvas = generateTestPatternCanvas(screenWidth, screenHeight);
      const canvasTex = new THREE.CanvasTexture(patternCanvas);
      canvasTex.colorSpace = THREE.SRGBColorSpace;
      canvasTex.minFilter = THREE.LinearFilter;
      canvasTex.magFilter = THREE.LinearFilter;
      canvasTex.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
      canvasTex.needsUpdate = true;
      newTexture = canvasTex;
    }

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
        if (videoElementRef.current === videoEl) {
          videoElementRef.current = null;
        }
      }
    };
  }, [
    sourceType,
    slides,
    currentSlideIndex,
    activeVideoStream,
    screenWidth,
    screenHeight,
    gl,
  ]);

  // 2. Reactive UV Cropping update for Video Texture
  useEffect(() => {
    if (activeTexture instanceof THREE.VideoTexture && videoElementRef.current) {
      applyVideoCrop(activeTexture, videoElementRef.current);
    }
  }, [
    activeTexture,
    uvCropMode,
    manualUvRepeatY,
    manualUvOffsetY,
    screenWidth,
    screenHeight,
  ]);

  return (
    <>
      <group ref={screenGroupRef} position={screenPosition} rotation={screenRotation}>
        {/* LED Screen Frame Bezel / Backing */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[screenWidth + 0.16, screenHeight + 0.16, 0.10]} />
          <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.8} />
        </mesh>

        {/* LED Screen Display Surface (Unlit Emissive Projection) */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[screenWidth, screenHeight]} />
          {activeTexture ? (
            <meshBasicMaterial
              map={activeTexture}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          ) : (
            <meshBasicMaterial color="#000000" />
          )}
        </mesh>

        {/* Subtle LED Screen Underglow / Stage Wash onto Stage Floor */}
        <pointLight
          position={[0, -screenHeight / 2 - 0.2, 0.4]}
          color="#38bdf8"
          intensity={0.6}
          distance={8}
        />
      </group>

      {/* TransformControls Gizmo. Attached to the screen GROUP, not the inner
          display mesh: TransformControls writes parent-local coordinates, and the
          mesh's parent-local origin is [0,0,0] while the group carries the world
          position. Driving the mesh therefore wrote a local offset into
          screenPosition — which the rest of the app reads as world — collapsing the
          screen to the room origin on the first drag and leaving the bezel behind.
          The group sits at the scene root, so its local transform IS world. */}
      {showTransformGizmo && screenGroupRef.current && (
        <TransformControls
          object={screenGroupRef.current}
          mode="translate"
          onObjectChange={() => {
            const group = screenGroupRef.current;
            if (group) {
              // mode="translate" never alters rotation, so screenRotation is left alone
              setScreenPosition([group.position.x, group.position.y, group.position.z]);
            }
          }}
        />
      )}
    </>
  );
};
