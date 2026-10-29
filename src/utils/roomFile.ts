import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { CustomSeatView, ExtraShot, ScreenRole, StageScreen, StageState, VenueSource } from '../store/useStageStore';
import { DEFAULT_VIEW_FOV, MAX_EXTRA_SHOTS, SEATED_EYE_HEIGHT, viewPitchTowardsScreen } from './storyboard';

/**
 * The `.stagesight` room file: a zip holding `room.json` (the room) and, for a
 * custom venue, `venue.glb`. It describes the room only, never content: no
 * slides, streams, device ids or crop settings. Everything here is pure (no DOM,
 * no three.js) so it can be tested in Node.
 *
 * This module imports only types from the store, so the store can import it
 * without a runtime cycle.
 */

export const ROOM_FORMAT_VERSION = 2;

/** Number of hand-placed camera views a custom venue holds (the store re-exports this). */
export const ROOM_VIEW_COUNT = 4;

type LightingPreset = StageState['lightingPreset'];

const VENUE_SOURCES: readonly VenueSource[] = ['default-ballroom', 'custom-glb'];
const LIGHTING_PRESETS: readonly LightingPreset[] = ['conference-bright', 'ballroom-standard', 'keynote-dark'];
const SCREEN_ROLES: readonly ScreenRole[] = ['split', 'repeat'];

type Vec3 = [number, number, number];
type Vec2 = [number, number];

export interface RoomDocument {
  formatVersion: 2;
  app: 'StageSight 3D';
  savedAt: string;
  name: string;
  notes: string;
  venue: {
    source: VenueSource;
    venueYaw: number;
    customDeckHeight: number;
    hasGlb: boolean;
    stageHeight: number;
    venueLength: number;
    venueWidth: number;
  };
  screens: {
    screens: StageScreen[];
    primaryScreenId: string;
    splitOrder: string[] | null;
    demoSideScreens: boolean;
  };
  views: { customSeatViews: (CustomSeatView | null)[] };
  storyboard: { extraShots: ExtraShot[] };
  dressing: {
    lightingPreset: LightingPreset;
    houseLightsIntensity: number;
    stageLightsIntensity: number;
    showCeilingFixtures: boolean;
    showPresenter: boolean;
    presenterOffset: Vec2;
    showLectern: boolean;
    lecternOffset: Vec2;
    showPanel: boolean;
    panelOffset: Vec2;
  };
}

/** The slice of store state a room is made from. Anything else is deliberately unreachable. */
export type RoomSourceState = Pick<
  StageState,
  | 'venueSource'
  | 'venueYaw'
  | 'customDeckHeight'
  | 'customGlbUrl'
  | 'stageHeight'
  | 'venueLength'
  | 'venueWidth'
  | 'screens'
  | 'primaryScreenId'
  | 'splitOrder'
  | 'demoSideScreens'
  | 'customSeatViews'
  | 'storyboardExtraShots'
  | 'lightingPreset'
  | 'houseLightsIntensity'
  | 'stageLightsIntensity'
  | 'showCeilingFixtures'
  | 'showPresenter'
  | 'presenterOffset'
  | 'showLectern'
  | 'lecternOffset'
  | 'showPanel'
  | 'panelOffset'
> & { roomName: string; roomNotes: string };

/** Explicit whitelist copy of the room parts of the store. Arrays are deep-copied. */
export function roomFromState(state: RoomSourceState, opts: { savedAt: string }): RoomDocument {
  return {
    formatVersion: 2,
    app: 'StageSight 3D',
    savedAt: opts.savedAt,
    name: state.roomName,
    notes: state.roomNotes,
    venue: {
      source: state.venueSource,
      venueYaw: state.venueYaw,
      customDeckHeight: state.customDeckHeight,
      hasGlb: state.venueSource === 'custom-glb',
      stageHeight: state.stageHeight,
      venueLength: state.venueLength,
      venueWidth: state.venueWidth,
    },
    screens: {
      screens: state.screens.map((s) => ({
        id: s.id,
        name: s.name,
        width: s.width,
        height: s.height,
        position: [s.position[0], s.position[1], s.position[2]],
        rotation: [s.rotation[0], s.rotation[1], s.rotation[2]],
        role: s.role,
        boundMeshName: s.boundMeshName,
      })),
      primaryScreenId: state.primaryScreenId,
      splitOrder: state.splitOrder ? [...state.splitOrder] : null,
      demoSideScreens: state.demoSideScreens,
    },
    views: {
      customSeatViews: state.customSeatViews.map((v) =>
        v
          ? { position: [v.position[0], v.position[1], v.position[2]], yaw: v.yaw, pitch: v.pitch, fov: v.fov, name: v.name }
          : null
      ),
    },
    storyboard: {
      extraShots: state.storyboardExtraShots.map((e) => ({
        id: e.id,
        name: e.name,
        venue: e.venue,
        eye: [e.eye[0], e.eye[1], e.eye[2]],
        yaw: e.yaw,
        pitch: e.pitch,
        fov: e.fov,
      })),
    },
    dressing: {
      lightingPreset: state.lightingPreset,
      houseLightsIntensity: state.houseLightsIntensity,
      stageLightsIntensity: state.stageLightsIntensity,
      showCeilingFixtures: state.showCeilingFixtures,
      showPresenter: state.showPresenter,
      presenterOffset: [state.presenterOffset[0], state.presenterOffset[1]],
      showLectern: state.showLectern,
      lecternOffset: [state.lecternOffset[0], state.lecternOffset[1]],
      showPanel: state.showPanel,
      panelOffset: [state.panelOffset[0], state.panelOffset[1]],
    },
  };
}

// ---------------------------------------------------------------------------
// Parsing, migration and validation

export type ParseResult =
  | { ok: true; room: RoomDocument }
  | { ok: false; reason: 'newer' | 'invalid'; message: string; detail?: string };

export type RoomMigrations = Record<number, (doc: Record<string, unknown>) => unknown>;

/**
 * `ROOM_MIGRATIONS[n]` turns a version-n document into version n + 1.
 * Each bump of ROOM_FORMAT_VERSION must add exactly one step here and a test.
 */
export const ROOM_MIGRATIONS: RoomMigrations = {
  // v1 -> v2: views gain pitch, field of view and a name; the storyboard block appears.
  // A v1 view only stored a heading, and the app aimed it at the primary screen's height,
  // so the pitch it actually showed is kept rather than levelling it (the user's framing
  // doesn't change on opening an old room).
  1: (doc) => {
    const screensBlock = isRecord(doc.screens) ? doc.screens : {};
    const rawScreens = Array.isArray(screensBlock.screens) ? (screensBlock.screens as unknown[]) : [];
    const primary = rawScreens.find((s) => isRecord(s) && s.id === screensBlock.primaryScreenId);
    const screenPos =
      isRecord(primary) && Array.isArray(primary.position) && primary.position.length === 3 && primary.position.every((n) => typeof n === 'number' && Number.isFinite(n))
        ? (primary.position as Vec3)
        : null;
    const viewsBlock = isRecord(doc.views) ? doc.views : {};
    const rawViews = Array.isArray(viewsBlock.customSeatViews) ? (viewsBlock.customSeatViews as unknown[]) : viewsBlock.customSeatViews;
    const customSeatViews = Array.isArray(rawViews)
      ? rawViews.map((raw) => {
          if (!isRecord(raw)) return raw;
          const p = raw.position;
          const valid = Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === 'number' && Number.isFinite(n));
          const pitch =
            valid && screenPos
              ? viewPitchTowardsScreen([p[0], p[1] + SEATED_EYE_HEIGHT, p[2]] as Vec3, screenPos)
              : 0;
          return { ...raw, pitch, fov: DEFAULT_VIEW_FOV, name: '' };
        })
      : rawViews;
    return {
      ...doc,
      formatVersion: 2,
      views: { ...viewsBlock, customSeatViews },
      storyboard: { extraShots: [] },
    };
  },
};

const MSG_NEWER = 'This room was saved by a newer version of StageSight. Update the app to open it.';
const MSG_INVALID = "This room file is damaged or isn't a StageSight room.";

class InvalidRoom extends Error {}

const fail = (detail: string): never => {
  throw new InvalidRoom(detail);
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function rec(v: unknown, path: string): Record<string, unknown> {
  return isRecord(v) ? v : fail(`${path} must be an object`);
}
function num(v: unknown, path: string): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fail(`${path} must be a finite number`);
}
function posNum(v: unknown, path: string): number {
  const n = num(v, path);
  return n > 0 ? n : fail(`${path} must be greater than zero`);
}
function nonNegNum(v: unknown, path: string): number {
  const n = num(v, path);
  return n >= 0 ? n : fail(`${path} must not be negative`);
}
/** A camera field of view in degrees: wider than nothing, narrower than a half-turn. */
function fovNum(v: unknown, path: string): number {
  const n = num(v, path);
  return n > 0 && n < 180 ? n : fail(`${path} must be between 0 and 180 degrees`);
}
function bool(v: unknown, path: string): boolean {
  return typeof v === 'boolean' ? v : fail(`${path} must be true or false`);
}
function str(v: unknown, path: string): string {
  return typeof v === 'string' ? v : fail(`${path} must be text`);
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], path: string): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fail(`${path} is not a known value`);
}
function vec3(v: unknown, path: string): Vec3 {
  if (!Array.isArray(v) || v.length !== 3) return fail(`${path} must have 3 numbers`);
  return [num(v[0], path), num(v[1], path), num(v[2], path)];
}
function vec2(v: unknown, path: string): Vec2 {
  if (!Array.isArray(v) || v.length !== 2) return fail(`${path} must have 2 numbers`);
  return [num(v[0], path), num(v[1], path)];
}

function validateRoom(doc: Record<string, unknown>): RoomDocument {
  const venue = rec(doc.venue, 'venue');
  const screensBlock = rec(doc.screens, 'screens');
  const views = rec(doc.views, 'views');
  const dressing = rec(doc.dressing, 'dressing');

  const rawScreens = screensBlock.screens;
  if (!Array.isArray(rawScreens) || rawScreens.length === 0) fail('screens must not be empty');
  const screens: StageScreen[] = (rawScreens as unknown[]).map((raw, i) => {
    const s = rec(raw, `screens[${i}]`);
    const bound = s.boundMeshName;
    return {
      id: str(s.id, `screens[${i}].id`),
      name: str(s.name, `screens[${i}].name`),
      width: posNum(s.width, `screens[${i}].width`),
      height: posNum(s.height, `screens[${i}].height`),
      position: vec3(s.position, `screens[${i}].position`),
      rotation: vec3(s.rotation, `screens[${i}].rotation`),
      role: oneOf(s.role, SCREEN_ROLES, `screens[${i}].role`),
      boundMeshName: bound === null || bound === undefined ? null : str(bound, `screens[${i}].boundMeshName`),
    };
  });
  const ids = new Set(screens.map((s) => s.id));
  if (ids.size !== screens.length) fail('screen ids must be unique');

  const primaryScreenId = str(screensBlock.primaryScreenId, 'primaryScreenId');
  if (!ids.has(primaryScreenId)) fail('primaryScreenId is not one of the screens');

  let splitOrder: string[] | null = null;
  if (screensBlock.splitOrder !== null && screensBlock.splitOrder !== undefined) {
    if (!Array.isArray(screensBlock.splitOrder)) fail('splitOrder must be a list');
    splitOrder = (screensBlock.splitOrder as unknown[]).map((id, i) => {
      const s = str(id, `splitOrder[${i}]`);
      return ids.has(s) ? s : fail('splitOrder names an unknown screen');
    });
  }

  const rawViews = views.customSeatViews;
  if (!Array.isArray(rawViews) || rawViews.length !== ROOM_VIEW_COUNT) {
    fail(`customSeatViews must have exactly ${ROOM_VIEW_COUNT} entries`);
  }
  const customSeatViews = (rawViews as unknown[]).map((raw, i): CustomSeatView | null => {
    if (raw === null) return null;
    const v = rec(raw, `customSeatViews[${i}]`);
    const path = `customSeatViews[${i}]`;
    return {
      position: vec3(v.position, `${path}.position`),
      yaw: num(v.yaw, `${path}.yaw`),
      pitch: num(v.pitch, `${path}.pitch`),
      fov: fovNum(v.fov, `${path}.fov`),
      name: str(v.name, `${path}.name`),
    };
  });

  const storyboard = rec(doc.storyboard, 'storyboard');
  if (!Array.isArray(storyboard.extraShots)) fail('storyboard.extraShots must be a list');
  const extraShots = (storyboard.extraShots as unknown[]).map((raw, i): ExtraShot => {
    const e = rec(raw, `extraShots[${i}]`);
    return {
      id: str(e.id, `extraShots[${i}].id`),
      name: str(e.name, `extraShots[${i}].name`),
      venue: oneOf(e.venue, VENUE_SOURCES, `extraShots[${i}].venue`),
      eye: vec3(e.eye, `extraShots[${i}].eye`),
      yaw: num(e.yaw, `extraShots[${i}].yaw`),
      pitch: num(e.pitch, `extraShots[${i}].pitch`),
      fov: fovNum(e.fov, `extraShots[${i}].fov`),
    };
  });
  for (const venue of VENUE_SOURCES) {
    if (extraShots.filter((e) => e.venue === venue).length > MAX_EXTRA_SHOTS) {
      fail(`a venue can have at most ${MAX_EXTRA_SHOTS} extra shots`);
    }
  }
  if (new Set(extraShots.map((e) => e.id)).size !== extraShots.length) fail('extra shot ids must be unique');

  return {
    formatVersion: 2,
    app: 'StageSight 3D',
    savedAt: typeof doc.savedAt === 'string' ? doc.savedAt : '',
    name: doc.name === undefined ? '' : str(doc.name, 'name'),
    notes: doc.notes === undefined ? '' : str(doc.notes, 'notes'),
    venue: {
      source: oneOf(venue.source, VENUE_SOURCES, 'venue.source'),
      venueYaw: num(venue.venueYaw, 'venue.venueYaw'),
      customDeckHeight: nonNegNum(venue.customDeckHeight, 'venue.customDeckHeight'),
      hasGlb: bool(venue.hasGlb, 'venue.hasGlb'),
      stageHeight: nonNegNum(venue.stageHeight, 'venue.stageHeight'),
      venueLength: posNum(venue.venueLength, 'venue.venueLength'),
      venueWidth: posNum(venue.venueWidth, 'venue.venueWidth'),
    },
    screens: {
      screens,
      primaryScreenId,
      splitOrder,
      demoSideScreens: bool(screensBlock.demoSideScreens, 'demoSideScreens'),
    },
    views: { customSeatViews },
    storyboard: { extraShots },
    dressing: {
      lightingPreset: oneOf(dressing.lightingPreset, LIGHTING_PRESETS, 'dressing.lightingPreset'),
      houseLightsIntensity: num(dressing.houseLightsIntensity, 'dressing.houseLightsIntensity'),
      stageLightsIntensity: num(dressing.stageLightsIntensity, 'dressing.stageLightsIntensity'),
      showCeilingFixtures: bool(dressing.showCeilingFixtures, 'dressing.showCeilingFixtures'),
      showPresenter: bool(dressing.showPresenter, 'dressing.showPresenter'),
      presenterOffset: vec2(dressing.presenterOffset, 'dressing.presenterOffset'),
      showLectern: bool(dressing.showLectern, 'dressing.showLectern'),
      lecternOffset: vec2(dressing.lecternOffset, 'dressing.lecternOffset'),
      showPanel: bool(dressing.showPanel, 'dressing.showPanel'),
      panelOffset: vec2(dressing.panelOffset, 'dressing.panelOffset'),
    },
  };
}

/** Migrates an older room to the current format, then validates it and rebuilds a clean copy. */
export function parseRoomDocument(json: unknown, migrations: RoomMigrations = ROOM_MIGRATIONS): ParseResult {
  const invalid = (detail: string): ParseResult => ({ ok: false, reason: 'invalid', message: MSG_INVALID, detail });
  if (!isRecord(json)) return invalid('room.json is not an object');
  const version = json.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    // Version 0 is allowed through so a migration table can upgrade it; the real table has no such step
    return invalid('formatVersion must be a whole number');
  }
  if (version > ROOM_FORMAT_VERSION) return { ok: false, reason: 'newer', message: MSG_NEWER };

  try {
    let doc: unknown = json;
    for (let v = version; v < ROOM_FORMAT_VERSION; v++) {
      const step = migrations[v];
      if (!step) return invalid(`no migration from version ${v}`);
      doc = step(doc as Record<string, unknown>);
      if (!isRecord(doc)) return invalid(`migration from version ${v} did not return an object`);
    }
    return { ok: true, room: validateRoom(doc as Record<string, unknown>) };
  } catch (err) {
    return invalid(err instanceof Error ? err.message : String(err));
  }
}

/** The store patch that applies a room. `venueYaw` is set directly: the saved screens and views already include it. */
export function roomToState(room: RoomDocument): Partial<StageState> {
  const screens = room.screens.screens.map((s) => ({
    ...s,
    position: [...s.position] as Vec3,
    rotation: [...s.rotation] as Vec3,
  }));
  return {
    venueSource: room.venue.source,
    venueYaw: room.venue.venueYaw,
    customDeckHeight: room.venue.customDeckHeight,
    stageHeight: room.venue.stageHeight,
    venueLength: room.venue.venueLength,
    venueWidth: room.venue.venueWidth,
    screens,
    primaryScreenId: room.screens.primaryScreenId,
    selectedScreenId: room.screens.primaryScreenId,
    splitOrder: room.screens.splitOrder ? [...room.screens.splitOrder] : null,
    demoSideScreens: room.screens.demoSideScreens,
    customSeatViews: room.views.customSeatViews.map((v) =>
      v ? { position: [...v.position] as Vec3, yaw: v.yaw, pitch: v.pitch, fov: v.fov, name: v.name } : null
    ),
    storyboardExtraShots: room.storyboard.extraShots.map((e) => ({ ...e, eye: [...e.eye] as Vec3 })),
    lightingPreset: room.dressing.lightingPreset,
    houseLightsIntensity: room.dressing.houseLightsIntensity,
    stageLightsIntensity: room.dressing.stageLightsIntensity,
    showCeilingFixtures: room.dressing.showCeilingFixtures,
    showPresenter: room.dressing.showPresenter,
    showPresenterSilhouette: room.dressing.showPresenter,
    presenterOffset: [...room.dressing.presenterOffset] as Vec2,
    showLectern: room.dressing.showLectern,
    lecternOffset: [...room.dressing.lecternOffset] as Vec2,
    showPanel: room.dressing.showPanel,
    panelOffset: [...room.dressing.panelOffset] as Vec2,
    roomName: room.name,
    roomNotes: room.notes,
    isFloorPlanOpen: false,
    floorPlanSlot: 0,
    floorPlanCutHeight: null,
    seatYaw: null,
    seatPitch: null,
  };
}

/** Changes whenever the saved room would differ; used to detect unsaved edits. */
export function roomKey(state: RoomSourceState): string {
  return JSON.stringify({ room: roomFromState(state, { savedAt: '' }), glb: state.customGlbUrl });
}

// ---------------------------------------------------------------------------
// Container

const ROOM_ENTRY = 'room.json';
const GLB_ENTRY = 'venue.glb';

/** Zips the room JSON and, for a custom venue, the GLB. The GLB is stored, not deflated, so saving never stalls the main thread. */
export function packRoomFile(room: RoomDocument, glb: Uint8Array | null): Uint8Array {
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {
    [ROOM_ENTRY]: [strToU8(JSON.stringify(room, null, 2)), { level: 6 }],
  };
  if (glb) files[GLB_ENTRY] = [glb, { level: 0 }];
  return zipSync(files);
}

export function unpackRoomFile(bytes: Uint8Array): { json: unknown; glb: Uint8Array | null } {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, { filter: (file) => file.name === ROOM_ENTRY || file.name === GLB_ENTRY });
  } catch {
    throw new Error("This file isn't a StageSight room.");
  }
  const roomBytes = entries[ROOM_ENTRY];
  if (!roomBytes) throw new Error("This file doesn't contain a StageSight room.");
  let json: unknown;
  try {
    json = JSON.parse(strFromU8(roomBytes));
  } catch {
    throw new Error('This room file is damaged: its room details could not be read.');
  }
  return { json, glb: entries[GLB_ENTRY] ?? null };
}

/** A safe download name for a room: illegal characters removed, whitespace collapsed, `.stagesight` appended. */
export function roomFileName(name: string): string {
  const cleaned = Array.from(name)
    .filter((ch) => ch.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim()
    .replace(/[. ]+$/, '');
  return `${cleaned || 'room'}.stagesight`;
}

// ---------------------------------------------------------------------------
// GLB sanity check

const GLB_MAGIC = 0x46546c67; // 'glTF' little-endian
const GLB_JSON_CHUNK = 0x4e4f534a; // 'JSON'

/** Cheap structural check: a binary glTF 2.0 with a JSON first chunk, or a self-contained .gltf JSON. */
export function inspectGlb(bytes: Uint8Array): boolean {
  if (bytes.byteLength >= 4) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0, true) === GLB_MAGIC) {
      if (bytes.byteLength < 20) return false;
      if (view.getUint32(4, true) !== 2) return false;
      if (view.getUint32(8, true) !== bytes.byteLength) return false;
      const chunkLength = view.getUint32(12, true);
      if (view.getUint32(16, true) !== GLB_JSON_CHUNK) return false;
      if (20 + chunkLength > bytes.byteLength) return false;
      return hasAssetVersion(bytes.subarray(20, 20 + chunkLength));
    }
  }
  return hasAssetVersion(bytes);
}

function hasAssetVersion(text: Uint8Array): boolean {
  try {
    const json: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(text));
    if (!isRecord(json) || !isRecord(json.asset)) return false;
    return typeof json.asset.version === 'string';
  } catch {
    return false;
  }
}
