import { describe, expect, it } from 'vitest';
import type { StoryboardFrame, StoryboardSet } from '../store/useStageStore';
import { appendixRows, formatCoverDate, pageSize, storyboardPages, toWinAnsi } from './storyboardPdf';

const frame = (shotId: string, name = shotId, eye: [number, number, number] = [0, 1.2, 10]): StoryboardFrame => ({
  id: `f-${shotId}-${Math.random()}`,
  shot: { id: shotId, name, eye, yaw: 0, pitch: 0, fov: 50 },
  blob: new Blob(),
  url: 'blob:x',
});
const set = (label: string, ...shotIds: string[]): StoryboardSet => ({
  id: label,
  label,
  frames: shotIds.map((s) => frame(s)),
});

describe('toWinAnsi', () => {
  it('keeps ASCII, Latin-1 and WinAnsi extras', () => {
    expect(toWinAnsi('Café – “Zoë” €5 …')).toBe('Café – “Zoë” €5 …');
  });
  it('turns whitespace controls into spaces and leaves out what it can’t encode', () => {
    expect(toWinAnsi('a\nb\tc')).toBe('a b c');
    expect(toWinAnsi('Example Agency 東京')).toBe('Example Agency');
    expect(toWinAnsi('日本 ☃ Ltd')).toBe('Ltd');
  });
});

describe('storyboardPages', () => {
  it('makes one page per shot for one set', () => {
    const pages = storyboardPages([set('A', 's1', 's2')]);
    expect(pages.map((p) => p.shotId)).toEqual(['s1', 's2']);
    expect(pages[0].slots.map((s) => s.setLabel)).toEqual(['A']);
  });
  it('groups two sets by shot in set order', () => {
    const pages = storyboardPages([set('A', 's1', 's2'), set('B', 's1', 's2')]);
    expect(pages).toHaveLength(2);
    expect(pages[0].slots.map((s) => s.setLabel)).toEqual(['A', 'B']);
  });
  it('copes with a set missing a shot and orders by first appearance', () => {
    const pages = storyboardPages([set('A', 's1'), set('B', 's2', 's1')]);
    expect(pages.map((p) => p.shotId)).toEqual(['s1', 's2']);
    expect(pages[0].slots).toHaveLength(2);
    expect(pages[1].slots.map((s) => s.setLabel)).toEqual(['B']);
  });
  it('skips deleted frames and empty sets', () => {
    const pages = storyboardPages([{ id: 'x', label: 'X', frames: [] }, set('B', 's3')]);
    expect(pages.map((p) => p.shotId)).toEqual(['s3']);
  });
  it('gives custom frames a page each', () => {
    const pages = storyboardPages([set('A', 's1', 'custom-1', 'custom-2'), set('B', 's1')]);
    expect(pages.map((p) => p.shotId)).toEqual(['s1', 'custom-1', 'custom-2']);
    expect(pages[0].slots).toHaveLength(2);
    expect(pages[1].slots).toHaveLength(1);
  });
});

describe('pageSize', () => {
  it('stacks 16:9 slots, first at the top', () => {
    const p = pageSize(2);
    expect(p).toMatchObject({ width: 960, height: 1080 });
    expect(p.slots[0]).toEqual({ x: 0, y: 540, width: 960, height: 540 });
    expect(p.slots[1]).toEqual({ x: 0, y: 0, width: 960, height: 540 });
  });
  it('always has at least one slot', () => {
    expect(pageSize(0).slots).toHaveLength(1);
  });
});

describe('formatCoverDate', () => {
  it('formats en-GB', () => {
    expect(formatCoverDate(new Date(2026, 9, 29))).toBe('29 October 2026');
    expect(formatCoverDate('2026-10-29')).toBe('29 October 2026');
    expect(formatCoverDate('nonsense')).toBe('');
  });
});

describe('appendixRows', () => {
  it('measures each distinct shot to the primary screen', () => {
    const screen = { position: [0, 3, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], height: 4 };
    const rows = appendixRows([frame('a', 'Front', [0, 3, 8]), frame('a', 'Front', [0, 3, 8]), frame('b', 'Side', [8, 3, 0])], screen);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ shot: 'Front', distance: 8, dhRatio: 2, offAxis: 0 });
    expect(rows[1].offAxis).toBe(90);
  });
});
