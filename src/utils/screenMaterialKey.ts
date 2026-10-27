import type * as THREE from 'three';

/**
 * React key for a screen's display material, so the material is rebuilt
 * whenever its texture switches between a still and live video.
 *
 * three.js decodes an sRGB video texture in the shader (DECODE_VIDEO_TEXTURE)
 * rather than on upload, and fixes that choice when it compiles the material's
 * program. Swapping `map` doesn't recompile, and R3F doesn't flag the material
 * for an update, so a material compiled for a still skipped the decode once a
 * screen share or capture replaced it: the feed was sRGB-encoded twice and came
 * out washed out and shifted towards blue. Going back, a still was decoded twice
 * and came out too dark.
 */
export function screenMaterialKey(texture: THREE.Texture | null): 'none' | 'video' | 'still' {
  if (!texture) return 'none';
  return (texture as THREE.VideoTexture).isVideoTexture ? 'video' : 'still';
}
