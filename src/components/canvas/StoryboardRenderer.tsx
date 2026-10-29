import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useStageStore } from '../../store/useStageStore';
import { directionFromYawPitch, STORYBOARD_FRAME, type CameraShot } from '../../utils/storyboard';

const JPEG_QUALITY = 0.85;
/**
 * Frames are rendered at this multiple of the output size and scaled down, which
 * antialiases them. MSAA isn't an option: three.js doesn't resolve a multisampled
 * target flagged as an XR target (below), so it reads back black.
 */
const SUPERSAMPLE = 2;

type ScratchCanvas = OffscreenCanvas | HTMLCanvasElement;

function scratchCanvas(width: number, height: number): ScratchCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function releaseCanvas(canvas: ScratchCanvas) {
  canvas.width = 0;
  canvas.height = 0;
}

function encodeJpeg(canvas: ScratchCanvas): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The storyboard frame couldn't be encoded."))),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );
}

/** Marks every video texture on the scene's materials so the latest frame is uploaded on the next render. */
function refreshVideoTextures(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(m)) {
        if (value && (value as THREE.VideoTexture).isVideoTexture) (value as THREE.VideoTexture).needsUpdate = true;
      }
    }
  });
}

/**
 * Turns bottom-up GL pixels at the supersampled size into a JPEG at the output
 * size, via two scratch canvases that are released straight after.
 */
async function pixelsToJpeg(pixels: Uint8Array, width: number, height: number): Promise<Blob> {
  const fullWidth = width * SUPERSAMPLE;
  const fullHeight = height * SUPERSAMPLE;
  const flipped = new Uint8ClampedArray(pixels.length);
  const rowBytes = fullWidth * 4;
  for (let y = 0; y < fullHeight; y++) {
    flipped.set(pixels.subarray((fullHeight - 1 - y) * rowBytes, (fullHeight - y) * rowBytes), y * rowBytes);
  }

  const full = scratchCanvas(fullWidth, fullHeight);
  const out = scratchCanvas(width, height);
  try {
    const fullCtx = full.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    const outCtx = out.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!fullCtx || !outCtx) throw new Error("The storyboard frame couldn't be drawn.");
    fullCtx.putImageData(new ImageData(flipped, fullWidth, fullHeight), 0, 0);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(full, 0, 0, width, height);
    return await encodeJpeg(out);
  } finally {
    releaseCanvas(full);
    releaseCanvas(out);
  }
}

/**
 * Renders storyboard shots off-screen at a fixed size, so frames never depend
 * on the window size or on `preserveDrawingBuffer`, and the visible canvas and
 * live camera are left alone. Registers itself in the store while mounted.
 */
export const StoryboardRenderer: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const render = async (shots: CameraShot[]): Promise<Blob[]> => {
      if (gl.xr.isPresenting) throw new Error('Leave VR before capturing a storyboard.');
      const { width, height } = STORYBOARD_FRAME;

      const target = new THREE.WebGLRenderTarget(width * SUPERSAMPLE, height * SUPERSAMPLE, {
        colorSpace: THREE.SRGBColorSpace,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
      });
      // three.js applies the renderer's tone mapping and output colour space (and honours each
      // material's `toneMapped`, which the screens rely on) only when rendering to the canvas or
      // to an XR render target. Flagging this target as one makes off-screen frames look exactly
      // like the live view, using the same shader programs. It's a three.js internal flag
      // (WebGLRenderer.js, WebGLPrograms.js, WebGLTextures.js): re-check it on three upgrades.
      (target as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
      // The shader now writes sRGB-encoded values itself, so store them as plain RGBA8.
      // Left to three, an sRGB texture gets SRGB8_ALPHA8 storage and the GPU encodes a
      // second time, which washes the frame out (measured: 54/255 brighter than the live
      // canvas on average; 0.5/255 with RGBA8).
      target.texture.internalFormat = 'RGBA8';

      const previousTarget = gl.getRenderTarget();
      const previousClipping = gl.clippingPlanes;
      const blobs: Blob[] = [];
      try {
        // The floor plan's section cut would slice the room in every frame
        gl.clippingPlanes = [];
        for (const shot of shots) {
          const camera = new THREE.PerspectiveCamera(shot.fov, width / height, 0.1, 200);
          camera.position.set(...shot.eye);
          const [dx, dy, dz] = directionFromYawPitch(shot.yaw, shot.pitch);
          camera.lookAt(shot.eye[0] + dx, shot.eye[1] + dy, shot.eye[2] + dz);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld();

          refreshVideoTextures(scene);
          gl.setRenderTarget(target);
          gl.clear();
          gl.render(scene, camera);

          const pixels = new Uint8Array(width * SUPERSAMPLE * height * SUPERSAMPLE * 4);
          gl.readRenderTargetPixels(target, 0, 0, width * SUPERSAMPLE, height * SUPERSAMPLE, pixels);
          blobs.push(await pixelsToJpeg(pixels, width, height));

          // Let the UI paint progress between shots
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        return blobs;
      } finally {
        target.dispose();
        gl.setRenderTarget(previousTarget);
        gl.clippingPlanes = previousClipping;
      }
    };

    useStageStore.getState().setRenderStoryboardShots(render);
    return () => useStageStore.getState().setRenderStoryboardShots(null);
  }, [gl, scene]);

  return null;
};
