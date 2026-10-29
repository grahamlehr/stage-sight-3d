import type { StageScreen, StoryboardFrame, StoryboardSet } from '../store/useStageStore';
import { computeDiscasTelemetry } from './discasMath';

/**
 * Pure helpers for the storyboard PDF. Nothing here imports pdf-lib, so it
 * stays out of the main bundle; the export itself lives in
 * `storyboardPdfExport.ts` and loads pdf-lib on demand.
 */

/** Each frame fills a slot this size, in points (16:9, like the 2400 x 1350 frames). */
export const SLOT_WIDTH = 960;
export const SLOT_HEIGHT = 540;

const WIN_ANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/**
 * Reduces text to what the standard Helvetica fonts can encode (WinAnsi).
 * Anything else is left out rather than printed as '?', which reads as broken
 * on a client document; the tray says so.
 */
export function toWinAnsi(text: string): string {
  let out = '';
  for (const ch of text.replace(/[\r\n\t]+/g, ' ')) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRAS.has(ch)) out += ch;
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

export interface PageSlot {
  setLabel: string;
  frame: StoryboardFrame;
}

export interface StoryboardPage {
  shotId: string;
  shotName: string;
  slots: PageSlot[];
}

/**
 * One page per shot, in order of first appearance (set order, then frame
 * order). Each page holds that shot's frame from every set that has it, in set
 * order. One-off "this view" frames (`custom-` ids) each get their own page.
 */
export function storyboardPages(sets: readonly StoryboardSet[]): StoryboardPage[] {
  const pages: StoryboardPage[] = [];
  const byShot = new Map<string, StoryboardPage>();
  for (const set of sets) {
    for (const frame of set.frames) {
      const slot = { setLabel: set.label, frame };
      const id = frame.shot.id;
      if (id.startsWith('custom-')) {
        pages.push({ shotId: id, shotName: frame.shot.name, slots: [slot] });
        continue;
      }
      let page = byShot.get(id);
      if (!page) {
        page = { shotId: id, shotName: frame.shot.name, slots: [] };
        byShot.set(id, page);
        pages.push(page);
      }
      page.slots.push(slot);
    }
  }
  return pages;
}

export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Page size and slot rectangles in PDF coordinates (origin bottom-left); the first slot is at the top. */
export function pageSize(slotCount: number): { width: number; height: number; slots: SlotRect[] } {
  const count = Math.max(1, Math.floor(slotCount));
  const height = SLOT_HEIGHT * count;
  const slots = Array.from({ length: count }, (_, i) => ({
    x: 0,
    y: height - SLOT_HEIGHT * (i + 1),
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
  }));
  return { width: SLOT_WIDTH, height, slots };
}

/** e.g. "29 October 2026". Accepts a Date or a yyyy-mm-dd string (read as a local date). */
export function formatCoverDate(date: Date | string): string {
  let d: Date;
  if (typeof date === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(date);
  } else {
    d = date;
  }
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface AppendixRow {
  shot: string;
  distance: number;
  dhRatio: number;
  offAxis: number;
}

/** Technical figures for each distinct shot (first frame of it), measured to the primary screen. */
export function appendixRows(
  frames: readonly Pick<StoryboardFrame, 'shot'>[],
  primaryScreen: Pick<StageScreen, 'position' | 'rotation' | 'height'>,
): AppendixRow[] {
  const seen = new Set<string>();
  const rows: AppendixRow[] = [];
  for (const { shot } of frames) {
    if (seen.has(shot.id)) continue;
    seen.add(shot.id);
    const t = computeDiscasTelemetry({
      cameraPos: shot.eye,
      screenPos: primaryScreen.position,
      screenRotation: primaryScreen.rotation,
      screenHeight: primaryScreen.height,
    });
    rows.push({ shot: shot.name, distance: t.viewingDistance, dhRatio: t.dhRatio, offAxis: t.offAxisAngle });
  }
  return rows;
}
