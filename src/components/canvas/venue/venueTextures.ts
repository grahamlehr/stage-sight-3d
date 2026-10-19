import * as THREE from 'three';

/**
 * Procedural venue textures, painted onto canvases at startup so the app stays
 * a static bundle with no image assets to fetch. Every generator is seeded, so
 * the room looks the same on every load.
 *
 * Color maps are tagged sRGB. Grayscale maps (weave, grain) are meant to be
 * tinted by the material color and reused as bump maps.
 */

/** Small deterministic PRNG (mulberry32). */
const seededRandom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createCanvas = (width: number, height = width) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
};

/** Adds per-pixel grain of the given strength (0–255 scale). */
const addGrain = (ctx: CanvasRenderingContext2D, amount: number, rand: () => number) => {
  const { width, height } = ctx.canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
};

const toTexture = (canvas: HTMLCanvasElement, color: boolean) => {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  // The renderer clamps this to what the GPU supports. Carpet seen at a
  // grazing angle from a seat smears badly without it.
  tex.anisotropy = 16;
  return tex;
};

/** Returns a copy sharing the same image, tiled `x` by `y` times across a surface. */
export const tiled = (tex: THREE.Texture, x: number, y: number) => {
  const copy = tex.clone();
  copy.repeat.set(x, y);
  copy.needsUpdate = true;
  return copy;
};

/** One 1.2m tile of patterned hotel ballroom carpet: navy field, lattice and medallions. */
const paintCarpet = () => {
  const size = 1024;
  const { canvas, ctx } = createCanvas(size);
  const rand = seededRandom(11);

  ctx.fillStyle = '#1a2131';
  ctx.fillRect(0, 0, size, size);

  // Soft mottling so the field isn't flat
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? '40,52,78' : '14,18,28'},${0.08 + rand() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(rand() * size, rand() * size, 8 + rand() * 30, 6 + rand() * 20, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Diamond lattice
  ctx.strokeStyle = 'rgba(80,96,130,0.3)';
  ctx.lineWidth = 7;
  const half = size / 2;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(k * half, 0);
    ctx.lineTo(k * half + size, size);
    ctx.moveTo(k * half + size, 0);
    ctx.lineTo(k * half, size);
    ctx.stroke();
  }

  // Medallions where the lattice lines cross (center, edges and corners keep it tileable)
  const medallion = (cx: number, cy: number) => {
    ctx.fillStyle = '#212a3e';
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();
    // Quatrefoil petals
    ctx.fillStyle = '#28324a';
    for (let p = 0; p < 4; p++) {
      const a = (p * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52, 50, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(150,124,86,0.38)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,124,86,0.42)';
    ctx.fill();
    // Bronze accent dots on the diagonals
    for (let p = 0; p < 4; p++) {
      const a = Math.PI / 4 + (p * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  [
    [half, half],
    [0, 0], [size, 0], [0, size], [size, size],
  ].forEach(([x, y]) => medallion(x, y));

  // Small diamonds at the lattice midpoints
  ctx.fillStyle = 'rgba(150,124,86,0.3)';
  [[half, 0], [0, half], [size, half], [half, size]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x + 22, y);
    ctx.lineTo(x, y + 22);
    ctx.lineTo(x - 22, y);
    ctx.closePath();
    ctx.fill();
  });

  addGrain(ctx, 26, rand);
  return toTexture(canvas, true);
};

/** Fine, tileable pile/weave grain for bump maps and dark stage carpet. */
const paintGrain = () => {
  const size = 256;
  const { canvas, ctx } = createCanvas(size);
  const rand = seededRandom(23);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  addGrain(ctx, 120, rand);
  return toTexture(canvas, false);
};

/** Upholstery weave: a tight twill, grayscale so the material color tints it. */
const paintWeave = (seed: number) => {
  const size = 256;
  const { canvas, ctx } = createCanvas(size);
  const rand = seededRandom(seed);
  const cell = 4;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const twill = ((x / cell + y / cell) % 4) < 2;
      const v = (twill ? 232 : 196) + (rand() - 0.5) * 24;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  addGrain(ctx, 20, rand);
  return toTexture(canvas, false);
};

/**
 * Fabric-wrapped acoustic wall panel, one 1.2m module wide: weave plus a
 * recessed seam on its left edge.
 */
const paintWallPanel = () => {
  const width = 512;
  const height = 512;
  const { canvas, ctx } = createCanvas(width, height);
  const rand = seededRandom(37);
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const v = 214 + ((x + y) % 4 === 0 ? 10 : 0) + (rand() - 0.5) * 22;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  // Panel seam with a soft shadow either side
  const seam = ctx.createLinearGradient(0, 0, 18, 0);
  seam.addColorStop(0, 'rgba(0,0,0,0.55)');
  seam.addColorStop(0.3, 'rgba(0,0,0,0.25)');
  seam.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = seam;
  ctx.fillRect(0, 0, 18, height);
  const edge = ctx.createLinearGradient(width - 10, 0, width, 0);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = edge;
  ctx.fillRect(width - 10, 0, 10, height);
  return toTexture(canvas, false);
};

/** Long horizontal walnut grain. */
const paintWoodGrain = (ctx: CanvasRenderingContext2D, rand: () => number) => {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = '#5b3b26';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 140; i++) {
    const y0 = rand() * height;
    const amp = 2 + rand() * 6;
    const freq = 0.004 + rand() * 0.01;
    const phase = rand() * Math.PI * 2;
    const dark = rand() < 0.6;
    ctx.strokeStyle = dark
      ? `rgba(38,22,12,${0.15 + rand() * 0.35})`
      : `rgba(140,96,62,${0.1 + rand() * 0.25})`;
    ctx.lineWidth = 0.6 + rand() * 2.4;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1) * amp * 0.3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  addGrain(ctx, 14, rand);
};

/** Door leaf veneer: grain only. */
const paintWood = () => {
  const { canvas, ctx } = createCanvas(512);
  paintWoodGrain(ctx, seededRandom(51));
  return toTexture(canvas, true);
};

/** One 1.2m module of raised-panel walnut wainscot. */
const paintWainscot = () => {
  const width = 512;
  const height = 420;
  const { canvas, ctx } = createCanvas(width, height);
  paintWoodGrain(ctx, seededRandom(63));
  const inset = 46;
  // Recessed field: darker, with a bevel highlight top-left and shadow bottom-right
  ctx.fillStyle = 'rgba(20,10,4,0.18)';
  ctx.fillRect(inset, inset, width - inset * 2, height - inset * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255,214,170,0.16)';
  ctx.beginPath();
  ctx.moveTo(inset, height - inset);
  ctx.lineTo(inset, inset);
  ctx.lineTo(width - inset, inset);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.moveTo(width - inset, inset);
  ctx.lineTo(width - inset, height - inset);
  ctx.lineTo(inset, height - inset);
  ctx.stroke();
  // Joint between modules
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 3, height);
  return toTexture(canvas, true);
};

/** Two-by-two 0.6m acoustic ceiling tiles in a white T-bar grid. */
const paintCeilingTile = () => {
  const size = 512;
  const { canvas, ctx } = createCanvas(size);
  const rand = seededRandom(79);
  ctx.fillStyle = '#d3d5d8';
  ctx.fillRect(0, 0, size, size);
  // Fissured mineral-fibre speckle
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(90,94,100,${0.15 + rand() * 0.35})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 3, 1 + rand() * 1.5);
  }
  addGrain(ctx, 16, rand);
  const half = size / 2;
  [0, half].forEach((p) => {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(p + 5, 0, 3, size);
    ctx.fillRect(0, p + 5, size, 3);
    ctx.fillStyle = '#f4f5f6';
    ctx.fillRect(p, 0, 6, size);
    ctx.fillRect(0, p, size, 6);
  });
  return toTexture(canvas, true);
};

/** Illuminated exit sign face. */
const paintExitSign = () => {
  const { canvas, ctx } = createCanvas(256, 112);
  ctx.fillStyle = '#0d1410';
  ctx.fillRect(0, 0, 256, 112);
  ctx.fillStyle = '#4dff8a';
  ctx.font = 'bold 72px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', 128, 60);
  return toTexture(canvas, true);
};

/** Radial falloff used to fake the light wash a wall sconce throws on the wall. */
const paintGlow = () => {
  const size = 128;
  const { canvas, ctx } = createCanvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = toTexture(canvas, true);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

export interface VenueTextures {
  carpet: THREE.Texture;
  grain: THREE.Texture;
  upholstery: THREE.Texture;
  wallPanel: THREE.Texture;
  wood: THREE.Texture;
  wainscot: THREE.Texture;
  ceilingTile: THREE.Texture;
  exitSign: THREE.Texture;
  glow: THREE.Texture;
}

export const createVenueTextures = (): VenueTextures => ({
  carpet: paintCarpet(),
  grain: paintGrain(),
  upholstery: paintWeave(91),
  wallPanel: paintWallPanel(),
  wood: paintWood(),
  wainscot: paintWainscot(),
  ceilingTile: paintCeilingTile(),
  exitSign: paintExitSign(),
  glow: paintGlow(),
});

export const disposeVenueTextures = (textures: VenueTextures) => {
  Object.values(textures).forEach((tex) => tex.dispose());
};
