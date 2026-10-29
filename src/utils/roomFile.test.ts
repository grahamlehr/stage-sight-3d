import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import {
  inspectGlb,
  packRoomFile,
  parseRoomDocument,
  ROOM_FORMAT_VERSION,
  ROOM_MIGRATIONS,
  roomFileName,
  roomFromState,
  roomKey,
  roomToState,
  unpackRoomFile,
  type RoomSourceState,
} from './roomFile';

const baseState = (over: Partial<RoomSourceState> = {}): RoomSourceState => ({
  venueSource: 'default-ballroom',
  venueYaw: 0,
  customDeckHeight: 0,
  customGlbUrl: null,
  stageHeight: 1,
  venueLength: 30,
  venueWidth: 20,
  screens: [
    {
      id: 'main',
      name: 'Main screen',
      width: 16,
      height: 4.5,
      position: [0, 3.4, -12],
      rotation: [0, 0, 0],
      role: 'split',
      boundMeshName: null,
    },
  ],
  primaryScreenId: 'main',
  splitOrder: null,
  demoSideScreens: false,
  customSeatViews: [null, null, null, null],
  storyboardExtraShots: [],
  lightingPreset: 'ballroom-standard',
  houseLightsIntensity: 1.1,
  stageLightsIntensity: 1.3,
  showCeilingFixtures: true,
  showPresenter: true,
  presenterOffset: [-4, 1.2],
  showLectern: true,
  lecternOffset: [4, 1.2],
  showPanel: false,
  panelOffset: [0, 1],
  roomName: 'Test room',
  roomNotes: 'Some notes',
  ...over,
});

const customState = (): RoomSourceState =>
  baseState({
    venueSource: 'custom-glb',
    venueYaw: Math.PI / 2,
    customDeckHeight: 0.85,
    customGlbUrl: 'blob:http://localhost/abc',
    screens: [
      { id: 'a', name: 'Left', width: 6, height: 3.2, position: [-5.5, 2.75, -9.125], rotation: [0, 0.3, 0], role: 'split', boundMeshName: null },
      { id: 'b', name: 'Centre', width: 8, height: 4.5, position: [0.123456789, 3.1, -10], rotation: [0, 1.5707963267948966, 0], role: 'split', boundMeshName: 'LED_Wall_01' },
      { id: 'c', name: 'Right', width: 3, height: 1.7, position: [6, 2, -9], rotation: [0, -0.3, 0], role: 'repeat', boundMeshName: null },
    ],
    primaryScreenId: 'b',
    splitOrder: ['c', 'a', 'b'],
    customSeatViews: [
      { position: [1.5, 0.1, 4.25], yaw: 3.0, pitch: -0.12, fov: 50, name: 'Back of room' },
      { position: [-2, 0.1, 8], yaw: -1.2, pitch: 0.05, fov: 25, name: '' },
      null,
      { position: [0, 0.1, 12.5], yaw: 0.5, pitch: 0, fov: 50, name: 'Doors' },
    ],
    storyboardExtraShots: [
      { id: 'shot-1', name: 'Walk-in', venue: 'custom-glb', eye: [0.5, 1.6, 20], yaw: 3.14, pitch: -0.02, fov: 60 },
      { id: 'shot-2', name: 'Ballroom stage', venue: 'default-ballroom', eye: [0, 1.7, -9], yaw: 0, pitch: 0, fov: 50 },
    ],
  });

const SAVED = { savedAt: '2026-10-29T12:00:00.000Z' };

const minimalGlb = (json: object = { asset: { version: '2.0' } }): Uint8Array => {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const padded = new Uint8Array(Math.ceil(text.length / 4) * 4).fill(0x20);
  padded.set(text);
  const out = new Uint8Array(20 + padded.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, out.length, true);
  view.setUint32(12, padded.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(padded, 20);
  return out;
};

describe('room file contains no content', () => {
  it('never serialises slides, streams, device ids or crop settings', () => {
    const state = {
      ...baseState(),
      slides: [{ fake: 'canvas' }, { fake: 'canvas' }],
      sourceType: 'screen-share',
      activeVideoStream: { id: 'stream-1', active: true },
      selectedVideoDeviceId: 'device-secret-123',
      uvCropMode: 'manual',
      manualUvRepeatY: 0.42,
      manualUvOffsetY: 0.1,
      currentSlideIndex: 3,
      telemetry: { viewingDistance: 9 },
    };
    const room = roomFromState(state, SAVED);
    for (const glb of [null, minimalGlb()]) {
      const entries = unzipSync(packRoomFile(room, glb));
      expect(Object.keys(entries).sort()).toEqual(glb ? ['room.json', 'venue.glb'] : ['room.json']);
      const text = strFromU8(entries['room.json']);
      for (const banned of [
        'device-secret-123', 'slides', 'activeVideoStream', 'selectedVideoDeviceId', 'sourceType',
        'uvCrop', 'manualUv', 'currentSlideIndex', 'telemetry',
      ]) {
        expect(text).not.toContain(banned);
      }
    }
  });

  it('drops injected fields when parsing', () => {
    const json = JSON.parse(JSON.stringify(roomFromState(baseState(), SAVED)));
    json.slides = ['data:image/png;base64,AAAA'];
    json.venue.sourceType = 'screen-share';
    json.screens.screens[0].secret = 'x';
    const parsed = parseRoomDocument(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const text = JSON.stringify(parsed.room);
      expect(text).not.toContain('slides');
      expect(text).not.toContain('sourceType');
      expect(text).not.toContain('secret');
    }
  });
});

describe('round trip', () => {
  it('restores a custom venue exactly, with the GLB byte-identical', () => {
    const state = customState();
    const glb = minimalGlb({ asset: { version: '2.0' }, extras: { n: 'x'.repeat(500) } });
    const bytes = packRoomFile(roomFromState(state, SAVED), glb);
    const { json, glb: glbBack } = unpackRoomFile(bytes);
    expect(glbBack).toEqual(glb);
    const parsed = parseRoomDocument(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const patch = roomToState(parsed.room);
    expect(patch.screens).toEqual(state.screens);
    expect(patch.primaryScreenId).toBe('b');
    expect(patch.selectedScreenId).toBe('b');
    expect(patch.splitOrder).toEqual(['c', 'a', 'b']);
    expect(patch.customSeatViews).toEqual(state.customSeatViews);
    expect(patch.storyboardExtraShots).toEqual(state.storyboardExtraShots);
    expect(patch.seatPitch).toBeNull();
    expect(patch.venueYaw).toBe(state.venueYaw);
    expect(patch.customDeckHeight).toBe(0.85);
    expect(patch.venueSource).toBe('custom-glb');
    expect(patch.roomName).toBe('Test room');
    expect(patch.roomNotes).toBe('Some notes');
    expect(patch.showPresenterSilhouette).toBe(true);
    // The patch is a copy, not an alias of the document
    expect(patch.screens![0]).not.toBe(parsed.room.screens.screens[0]);
  });

  it('packs the demo ballroom with no GLB', () => {
    const room = roomFromState(baseState(), SAVED);
    expect(room.venue.hasGlb).toBe(false);
    expect(Object.keys(unzipSync(packRoomFile(room, null)))).toEqual(['room.json']);
  });

  it('roomKey ignores savedAt but tracks edits and the model URL', () => {
    const a = roomKey(baseState());
    expect(roomKey(baseState())).toBe(a);
    expect(roomKey(baseState({ stageHeight: 1.5 }))).not.toBe(a);
    expect(roomKey(baseState({ customGlbUrl: 'blob:x' }))).not.toBe(a);
    const shot = { id: 's', name: 'x', venue: 'default-ballroom' as const, eye: [0, 1, 0] as [number, number, number], yaw: 0, pitch: 0, fov: 50 };
    expect(roomKey(baseState({ storyboardExtraShots: [shot] }))).not.toBe(a);
  });
});

describe('migrations', () => {
  const v1 = () => JSON.parse(JSON.stringify(roomFromState(baseState(), SAVED)));

  it('upgrades an older document step by step', () => {
    const old = v1();
    delete old.name;
    old.formatVersion = 0;
    old.title = 'Old title';
    const parsed = parseRoomDocument(old, {
      0: (d) => ({ ...d, formatVersion: 1, name: d.title }),
      1: (d) => ({ ...d, formatVersion: 2 }),
    });
    expect(parsed.ok && parsed.room.name).toBe('Old title');
    expect(parsed.ok && parsed.room.formatVersion).toBe(ROOM_FORMAT_VERSION);
  });

  it('rejects an older document with no migration step', () => {
    const parsed = parseRoomDocument({ ...v1(), formatVersion: 0 }, {});
    expect(parsed).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('refuses a newer document', () => {
    const parsed = parseRoomDocument({ ...v1(), formatVersion: 3 });
    expect(parsed).toMatchObject({
      ok: false,
      reason: 'newer',
      message: 'This room was saved by a newer version of StageSight. Update the app to open it.',
    });
  });
});

describe('version 1 rooms', () => {
  // A room exactly as phase 1 saved it: views hold only a floor point and a heading
  const V1_ROOM = `{
    "formatVersion": 1,
    "app": "StageSight 3D",
    "savedAt": "2026-10-29T12:00:00.000Z",
    "name": "Hilton",
    "notes": "",
    "venue": { "source": "custom-glb", "venueYaw": 0, "customDeckHeight": 0.5, "hasGlb": true, "stageHeight": 1, "venueLength": 30, "venueWidth": 20 },
    "screens": {
      "screens": [
        { "id": "a", "name": "Side", "width": 4, "height": 2, "position": [8, 2, -5], "rotation": [0, 0, 0], "role": "repeat", "boundMeshName": null },
        { "id": "b", "name": "Wall", "width": 8, "height": 4.5, "position": [0, 3.4, -12], "rotation": [0, 0, 0], "role": "split", "boundMeshName": "LED" }
      ],
      "primaryScreenId": "b",
      "splitOrder": null,
      "demoSideScreens": false
    },
    "views": { "customSeatViews": [ { "position": [0, 0.1, 2], "yaw": 3.14159 }, null, { "position": [1, 0, -11.5], "yaw": 0.5 }, null ] },
    "dressing": {
      "lightingPreset": "ballroom-standard", "houseLightsIntensity": 1.1, "stageLightsIntensity": 1.3, "showCeilingFixtures": true,
      "showPresenter": true, "presenterOffset": [-4, 1.2], "showLectern": true, "lecternOffset": [4, 1.2], "showPanel": false, "panelOffset": [0, 1]
    }
  }`;

  it('loads as version 2, keeping the pitch the old app showed', () => {
    const parsed = parseRoomDocument(JSON.parse(V1_ROOM));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.room.formatVersion).toBe(2);
    expect(parsed.room.storyboard).toEqual({ extraShots: [] });
    const [first, second, third, fourth] = parsed.room.views.customSeatViews;
    expect(second).toBeNull();
    expect(fourth).toBeNull();
    // eye (0, 1.3, 2) looking at the primary screen's centre (0, 3.4, -12): 14 m away
    expect(first).toMatchObject({ position: [0, 0.1, 2], yaw: 3.14159, fov: 50, name: '' });
    expect(first!.pitch).toBeCloseTo(Math.atan2(3.4 - 1.3, 14));
    // eye (1, 1.2, -11.5) is about 1.1 m from the screen horizontally
    expect(third!.pitch).toBeCloseTo(Math.atan2(3.4 - 1.2, Math.hypot(1, 0.5)));
    expect(third).toMatchObject({ fov: 50, name: '' });
  });

  it('falls back to level pitch when the primary screen is missing from the document', () => {
    const doc = JSON.parse(V1_ROOM);
    const migrated = ROOM_MIGRATIONS[1]({ ...doc, screens: { ...doc.screens, primaryScreenId: 'zzz' } }) as {
      views: { customSeatViews: Array<{ pitch: number } | null> };
    };
    expect(migrated.views.customSeatViews[0]!.pitch).toBe(0);
  });
});

describe('validation', () => {
  const good = () => JSON.parse(JSON.stringify(roomFromState(customState(), SAVED)));
  const reason = (doc: unknown) => {
    const r = parseRoomDocument(doc);
    return r.ok ? 'ok' : r.reason;
  };

  it('accepts a good document', () => {
    expect(reason(good())).toBe('ok');
  });

  it('throws from unpack for garbage, a zip without room.json, and bad JSON', () => {
    expect(() => unpackRoomFile(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(/isn't a StageSight room/);
    expect(() => unpackRoomFile(zipSync({ 'other.txt': strToU8('hi') }))).toThrow(/doesn't contain/);
    expect(() => unpackRoomFile(zipSync({ 'room.json': strToU8('{not json') }))).toThrow(/damaged/);
  });

  it('rejects malformed documents', () => {
    const cases: Array<(d: any) => void> = [ // eslint-disable-line @typescript-eslint/no-explicit-any
      (d) => { d.screens.screens = []; },
      (d) => { d.screens.screens[0].position[1] = null; },
      (d) => { d.screens.screens[0].position = [1, 2]; },
      (d) => { d.screens.screens[0].width = 0; },
      (d) => { d.screens.screens[1].id = d.screens.screens[0].id; },
      (d) => { d.screens.primaryScreenId = 'nope'; },
      (d) => { d.screens.splitOrder = ['nope']; },
      (d) => { d.views.customSeatViews = d.views.customSeatViews.slice(0, 3); },
      (d) => { d.views.customSeatViews[0] = { position: [0, 0, 0], yaw: 'x', pitch: 0, fov: 50, name: '' }; },
      (d) => { delete d.views.customSeatViews[0].pitch; },
      (d) => { d.views.customSeatViews[0].fov = 0; },
      (d) => { d.views.customSeatViews[0].name = 5; },
      (d) => { delete d.storyboard; },
      (d) => { d.storyboard.extraShots[0].venue = 'moon'; },
      (d) => { d.storyboard.extraShots[0].yaw = NaN; },
      (d) => { d.storyboard.extraShots[0].eye = [1, 2]; },
      (d) => {
        d.storyboard.extraShots = Array.from({ length: 5 }, (_, i) => ({ ...d.storyboard.extraShots[0], id: `x${i}` }));
      },
      (d) => { d.venue.source = 'moon'; },
      (d) => { d.dressing.lightingPreset = 'disco'; },
      (d) => { d.dressing.showLectern = 'yes'; },
      (d) => { d.venue.venueYaw = Infinity; },
      (d) => { d.formatVersion = 1.5; },
      (d) => { d.formatVersion = 0; },
      (d) => { d.formatVersion = -1; },
    ];
    for (const mutate of cases) {
      const doc = good();
      mutate(doc);
      expect(reason(doc)).toBe('invalid');
    }
    expect(reason('text')).toBe('invalid');
    expect(reason(null)).toBe('invalid');
  });

  it('rejects impossible room sizes and fields of view', () => {
    const cases: Array<(d: any) => void> = [ // eslint-disable-line @typescript-eslint/no-explicit-any
      (d) => { d.venue.venueWidth = -20; },
      (d) => { d.venue.venueLength = 0; },
      (d) => { d.venue.stageHeight = -1; },
      (d) => { d.venue.customDeckHeight = -3; },
      (d) => { d.views.customSeatViews[0].fov = 400; },
      (d) => { d.storyboard.extraShots[0].fov = 180; },
    ];
    for (const mutate of cases) {
      const doc = good();
      mutate(doc);
      expect(reason(doc)).toBe('invalid');
    }
    // Flat stages and decks are real
    const flat = good();
    flat.venue.stageHeight = 0;
    flat.venue.customDeckHeight = 0;
    expect(reason(flat)).toBe('ok');
  });

  it('defaults a missing name and notes to empty text', () => {
    const doc = good();
    delete doc.name;
    delete doc.notes;
    const r = parseRoomDocument(doc);
    expect(r.ok && [r.room.name, r.room.notes]).toEqual(['', '']);
  });
});

describe('inspectGlb', () => {
  it('accepts a minimal GLB and a self-contained glTF', () => {
    expect(inspectGlb(minimalGlb())).toBe(true);
    expect(inspectGlb(strToU8(JSON.stringify({ asset: { version: '2.0' } })))).toBe(true);
  });

  it('rejects truncated, mislabelled and random bytes', () => {
    const glb = minimalGlb();
    expect(inspectGlb(glb.slice(0, glb.length - 4))).toBe(false);
    expect(inspectGlb(glb.slice(0, 10))).toBe(false);
    expect(inspectGlb(minimalGlb({ nothing: true }))).toBe(false);
    expect(inspectGlb(new Uint8Array([0xde, 0xad, 0xbe, 0xef, 1, 2, 3, 4, 5, 6, 7, 8]))).toBe(false);
    expect(inspectGlb(new Uint8Array(0))).toBe(false);
    expect(inspectGlb(strToU8('{"asset":{}}'))).toBe(false);
  });
});

describe('roomFileName', () => {
  it('sanitises and appends the extension', () => {
    expect(roomFileName('Hilton Park Lane, Ballroom A')).toBe('Hilton Park Lane, Ballroom A.stagesight');
    expect(roomFileName('  a/b\\c:d*e?  f  ')).toBe('abcde f.stagesight');
    expect(roomFileName('')).toBe('room.stagesight');
    expect(roomFileName('///')).toBe('room.stagesight');
    expect(roomFileName('x'.repeat(200))).toBe(`${'x'.repeat(80)}.stagesight`);
  });
});
