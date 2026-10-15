import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { useStageStore } from '../../store/useStageStore';
import { generateTestPatternCanvas } from '../../utils/testPatternGenerator';
import { computeUvCrop } from '../../utils/uvCropMath';

function generateSafeAreaOverlayCanvas(aspect: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const W = 2048;
  const H = Math.round(W / Math.max(0.2, aspect));
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, W, H);

  // 5% Action Safe border (Cyan)
  const safe5X = W * 0.05;
  const safe5Y = H * 0.05;
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 4;
  ctx.strokeRect(safe5X, safe5Y, W - safe5X * 2, H - safe5Y * 2);

  // Label for 5%
  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('5% ACTION SAFE', safe5X + 12, safe5Y + 28);

  // 10% Title Safe border (Amber dashed)
  const safe10X = W * 0.10;
  const safe10Y = H * 0.10;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([16, 12]);
  ctx.strokeRect(safe10X, safe10Y, W - safe10X * 2, H - safe10Y * 2);
  ctx.setLineDash([]);

  // Label for 10%
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('10% TITLE SAFE', safe10X + 12, safe10Y + 28);

  // 16:9 Center Cut Pillar Lines
  const standard16_9Aspect = 16 / 9;
  if (aspect > standard16_9Aspect) {
    const centerCutWidth = H * standard16_9Aspect;
    const centerCutLeft = (W - centerCutWidth) / 2;
    const centerCutRight = (W + centerCutWidth) / 2;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(centerCutLeft, 0);
    ctx.lineTo(centerCutLeft, H);
    ctx.moveTo(centerCutRight, 0);
    ctx.lineTo(centerCutRight, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('16:9 CENTER-CUT', centerCutLeft + 12, H - 24);
    ctx.fillText('16:9 CENTER-CUT', centerCutRight - 180, H - 24);
  }

  // Center crosshair
  const cx = W / 2;
  const cy = H / 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 40, cy);
  ctx.lineTo(cx + 40, cy);
  ctx.moveTo(cx, cy - 40);
  ctx.lineTo(cx, cy + 40);
  ctx.stroke();

  return canvas;
}

export const ScreenSurface: React.FC = () => {
  const { gl } = useThree();
  const screenMeshRef = useRef<THREE.Mesh>(null);

  // Store state
  const screenWidth = useStageStore((s) => s.screenWidth);
  const screenHeight = useStageStore((s) => s.screenHeight);
  const screenPosition = useStageStore((s) => s.screenPosition);
  const screenRotation = useStageStore((s) => s.screenRotation);
  const showTransformGizmo = useStageStore((s) => s.showTransformGizmo);
  const setScreenPosition = useStageStore((s) => s.setScreenPosition);
  const setScreenRotation = useStageStore((s) => s.setScreenRotation);

  const sourceType = useStageStore((s) => s.sourceType);
  const slides = useStageStore((s) => s.slides);
  const currentSlideIndex = useStageStore((s) => s.currentSlideIndex);
  const activeVideoStream = useStageStore((s) => s.activeVideoStream);
  const uvCropMode = useStageStore((s) => s.uvCropMode);
  const manualUvRepeatY = useStageStore((s) => s.manualUvRepeatY);
  const manualUvOffsetY = useStageStore((s) => s.manualUvOffsetY);
  const showSafeGuides = useStageStore((s) => s.showSafeGuides);

  // Texture state
  const [activeTexture, setActiveTexture] = useState<THREE.Texture | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // 1. Texture Generation & Management with rigorous GPU VRAM disposal
  useEffect(() => {
    let newTexture: THREE.Texture | null = null;
    let videoEl: HTMLVideoElement | null = null;

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

      // Apply initial UV crop
      const videoWidth = videoEl.videoWidth || 1920;
      const videoHeight = videoEl.videoHeight || 1080;
      const crop = computeUvCrop({
        cropMode: uvCropMode,
        captureWidth: videoWidth,
        captureHeight: videoHeight,
        screenWidth,
        screenHeight,
        manualRepeatY: manualUvRepeatY,
        manualOffsetY: manualUvOffsetY,
      });

      vidTexture.repeat.set(crop.repeatX, crop.repeatY);
      vidTexture.offset.set(crop.offsetX, crop.offsetY);
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
        videoEl.pause();
        videoEl.srcObject = null;
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
      const vid = videoElementRef.current;
      const vidW = vid.videoWidth || 1920;
      const vidH = vid.videoHeight || 1080;
      const crop = computeUvCrop({
        cropMode: uvCropMode,
        captureWidth: vidW,
        captureHeight: vidH,
        screenWidth,
        screenHeight,
        manualRepeatY: manualUvRepeatY,
        manualOffsetY: manualUvOffsetY,
      });

      activeTexture.repeat.set(crop.repeatX, crop.repeatY);
      activeTexture.offset.set(crop.offsetX, crop.offsetY);
      activeTexture.needsUpdate = true;
    }
  }, [
    activeTexture,
    uvCropMode,
    manualUvRepeatY,
    manualUvOffsetY,
    screenWidth,
    screenHeight,
  ]);

  // 3. Safe-Area Overlay Texture
  const safeAreaTexture = useMemo(() => {
    const aspect = screenWidth / Math.max(0.1, screenHeight);
    const canvas = generateSafeAreaOverlayCanvas(aspect);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [screenWidth, screenHeight]);

  useEffect(() => {
    return () => {
      safeAreaTexture.dispose();
    };
  }, [safeAreaTexture]);

  return (
    <>
      <group position={screenPosition} rotation={screenRotation}>
        {/* LED Screen Frame Bezel / Backing */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[screenWidth + 0.16, screenHeight + 0.16, 0.10]} />
          <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.8} />
        </mesh>

        {/* LED Screen Display Surface (Unlit Emissive Projection) */}
        <mesh ref={screenMeshRef} position={[0, 0, 0]}>
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

        {/* Toggleable Safe-Area Overlay Plane (offset z = +0.01m to prevent Z-fighting) */}
        {showSafeGuides && (
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[screenWidth, screenHeight]} />
            <meshBasicMaterial
              map={safeAreaTexture}
              transparent={true}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Subtle LED Screen Underglow / Stage Wash onto Stage Floor */}
        <pointLight
          position={[0, -screenHeight / 2 - 0.2, 0.4]}
          color="#38bdf8"
          intensity={0.6}
          distance={8}
        />
      </group>

      {/* TransformControls Gizmo */}
      {showTransformGizmo && screenMeshRef.current && (
        <TransformControls
          object={screenMeshRef.current}
          mode="translate"
          onObjectChange={() => {
            if (screenMeshRef.current) {
              const pos = screenMeshRef.current.position;
              const rot = screenMeshRef.current.rotation;
              setScreenPosition([pos.x, pos.y, pos.z]);
              setScreenRotation([rot.x, rot.y, rot.z]);
            }
          }}
        />
      )}
    </>
  );
};
