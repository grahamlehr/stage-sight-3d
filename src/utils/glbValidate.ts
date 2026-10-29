import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { inspectGlb } from './roomFile';

/**
 * Parses the bytes as a glTF model, or returns null when they aren't one. Runs a
 * cheap structural check first, then a real parse with GLTFLoader. The caller owns
 * the returned scene: hand it to the venue with `stashParsedVenue`, or dispose it.
 */
export async function parseGlb(bytes: Uint8Array): Promise<THREE.Group | null> {
  if (!inspectGlb(bytes)) return null;
  try {
    const gltf = await new GLTFLoader().parseAsync(bytes.slice().buffer, '');
    return gltf.scene;
  } catch {
    return null;
  }
}

/**
 * Scenes already parsed for a venue blob URL, so opening a room parses its model
 * once rather than once to check it and again to show it. Keyed by blob URL.
 */
const parsedVenues = new Map<string, THREE.Group>();

export function stashParsedVenue(url: string, scene: THREE.Group): void {
  discardParsedVenue(url);
  parsedVenues.set(url, scene);
}

/** The stashed scene for this URL, left in place (safe to call during render). */
export function peekParsedVenue(url: string): THREE.Group | null {
  return parsedVenues.get(url) ?? null;
}

/** Removes and returns the stashed scene; the caller now owns it. */
export function takeParsedVenue(url: string): THREE.Group | null {
  const scene = parsedVenues.get(url) ?? null;
  parsedVenues.delete(url);
  return scene;
}

/** Disposes a stashed scene nobody took, for a URL that is being revoked. */
export function discardParsedVenue(url: string): void {
  const scene = parsedVenues.get(url);
  if (!scene) return;
  parsedVenues.delete(url);
  disposeObject(scene);
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

/** Frees every geometry, material and texture under the root. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((m) => m && disposeMaterial(m));
  });
}
