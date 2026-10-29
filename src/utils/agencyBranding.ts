/**
 * Remembers the agency name and logo between visits, in this browser only.
 * Storage can be unavailable (private windows throw), so every access is guarded.
 */

const KEY = 'stagesight.agencyBranding';
/** A logo whose data URL is bigger than this isn't remembered. */
const MAX_LOGO_DATA_URL = 1.5 * 1024 * 1024;
const MAX_LOGO_EDGE = 800;

export interface AgencyBranding {
  agencyName: string;
  logoDataUrl: string | null;
}

export function loadAgencyBranding(): AgencyBranding {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { agencyName: '', logoDataUrl: null };
    const data = JSON.parse(raw) as Partial<AgencyBranding>;
    return {
      agencyName: typeof data.agencyName === 'string' ? data.agencyName : '',
      logoDataUrl: typeof data.logoDataUrl === 'string' && data.logoDataUrl.startsWith('data:image/') ? data.logoDataUrl : null,
    };
  } catch {
    return { agencyName: '', logoDataUrl: null };
  }
}

export function saveAgencyBranding(branding: AgencyBranding): void {
  const logoDataUrl = branding.logoDataUrl && branding.logoDataUrl.length <= MAX_LOGO_DATA_URL ? branding.logoDataUrl : null;
  try {
    localStorage.setItem(KEY, JSON.stringify({ agencyName: branding.agencyName, logoDataUrl }));
  } catch {
    // Storage full or blocked: the logo just isn't remembered
  }
}

/** Decodes a PNG data URL into bytes for embedding in the PDF. */
export function logoBytesFromDataUrl(dataUrl: string): { bytes: Uint8Array; type: 'png' | 'jpeg' } {
  const comma = dataUrl.indexOf(',');
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, type: /^data:image\/jpe?g/.test(dataUrl) ? 'jpeg' : 'png' };
}

/** Normalises any browser-decodable image to a PNG no more than 800 px on its longest edge. */
export async function logoFromFile(file: File): Promise<{ dataUrl: string; bytes: Uint8Array; type: 'png' }> {
  let source: ImageBitmap | HTMLImageElement;
  let width: number;
  let height: number;
  let objectUrl: string | null = null;
  let bitmap: ImageBitmap | null = null;
  try {
    try {
      bitmap = await createImageBitmap(file);
      source = bitmap;
      width = bitmap.width;
      height = bitmap.height;
    } catch {
      // SVG and some formats don't decode through createImageBitmap
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      await img.decode();
      source = img;
      width = img.naturalWidth || MAX_LOGO_EDGE;
      height = img.naturalHeight || MAX_LOGO_EDGE / 2;
    }
    const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("This browser couldn't prepare the logo.");
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      return { dataUrl, ...logoBytesFromDataUrl(dataUrl), type: 'png' };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } catch (err) {
    throw err instanceof Error && err.message.startsWith('This browser')
      ? err
      : new Error("That image couldn't be read. Try a PNG or JPEG.");
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
