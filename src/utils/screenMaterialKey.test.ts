import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { screenMaterialKey } from './screenMaterialKey';

const still = () => new THREE.CanvasTexture({ width: 16, height: 9 } as HTMLCanvasElement);
const video = () => new THREE.VideoTexture({} as HTMLVideoElement);

describe('screenMaterialKey', () => {
  // Regression: a screen share replaced the test pattern on the same material,
  // which kept a program without the video sRGB decode, so the feed came out
  // washed out and shifted towards blue
  it('changes when a still is replaced by live video, and back', () => {
    expect(screenMaterialKey(video())).not.toBe(screenMaterialKey(still()));
  });

  it('stays the same between stills, so changing slide reuses the material', () => {
    expect(screenMaterialKey(still())).toBe(screenMaterialKey(still()));
  });

  it('stays the same between video feeds', () => {
    expect(screenMaterialKey(video())).toBe(screenMaterialKey(video()));
  });

  it('has its own key for no texture', () => {
    expect(screenMaterialKey(null)).toBe('none');
  });
});
