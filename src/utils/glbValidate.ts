import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { inspectGlb } from './roomFile';

/**
 * True when the bytes parse as a glTF model. Runs a cheap structural check first,
 * then a real parse with GLTFLoader, and disposes everything the parse built so
 * the check leaves nothing behind on the GPU or in memory.
 */
export async function validateGlb(bytes: Uint8Array): Promise<boolean> {
  if (!inspectGlb(bytes)) return false;
  let scene: THREE.Object3D | null = null;
  try {
    const gltf = await new GLTFLoader().parseAsync(bytes.slice().buffer, '');
    scene = gltf.scene;
    return true;
  } catch {
    return false;
  } finally {
    if (scene) disposeObject(scene);
  }
}

function disposeTexture(texture: THREE.Texture) {
  const image = texture.image as { close?: () => void } | undefined;
  if (image && typeof image.close === 'function') image.close(); // ImageBitmap
  texture.dispose();
}

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if ((value as THREE.Texture | undefined)?.isTexture) disposeTexture(value as THREE.Texture);
  }
  material.dispose();
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((m) => m && disposeMaterial(m));
  });
}
