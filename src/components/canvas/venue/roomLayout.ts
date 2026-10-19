/**
 * Fixed dimensions and derived layout for the procedural ballroom. Units are
 * meters; the stage is centered on x = 0 against the front wall and the
 * audience faces -Z.
 */

export const STAGE = {
  width: 18,
  depth: 5,
  centerZ: -12.5,
  /** Downstage edge, facing the audience. */
  frontZ: -10,
  /** Upstage edge, against the front wall in the default room. */
  backZ: -15,
} as const;

export const CEILING_HEIGHT = 9.5;
/** Matches the front-row seat presets, 4m from the default screen. */
export const FRONT_ROW_Z = -8;
/** Clear walkway between the last row and the rear wall. */
export const REAR_AISLE = 1.6;
export const DOOR_WIDTH = 1.8;
export const DOOR_HEIGHT = 2.4;

export interface RoomBounds {
  minX: number;
  maxX: number;
  frontZ: number;
  backZ: number;
  width: number;
  length: number;
  centerZ: number;
}

/**
 * The room is centered on the origin at the requested size, but never narrower
 * than the stage or shallow enough to cut through it.
 */
export const computeRoomBounds = (venueWidth: number, venueLength: number): RoomBounds => {
  const halfW = Math.max(venueWidth / 2, STAGE.width / 2 + 0.6);
  const frontZ = Math.min(-venueLength / 2, STAGE.backZ);
  const backZ = Math.max(venueLength / 2, FRONT_ROW_Z + 4);
  return {
    minX: -halfW,
    maxX: halfW,
    frontZ,
    backZ,
    width: halfW * 2,
    length: backZ - frontZ,
    centerZ: (frontZ + backZ) / 2,
  };
};

export interface StairFlight {
  x: number;
  width: number;
  risers: number;
  riserHeight: number;
  treadDepth: number;
  /** z of the bottom step's front edge, nearest the audience. */
  bottomZ: number;
}

/** Two flights at the stage's front corners, climbing toward the stage. */
export const computeStairs = (stageHeight: number): StairFlight[] => {
  const risers = Math.max(2, Math.ceil(stageHeight / 0.2));
  const treadDepth = 0.28;
  const width = 1.2;
  const bottomZ = STAGE.frontZ + (risers - 1) * treadDepth;
  return [-1, 1].map((side) => ({
    x: side * (STAGE.width / 2 - 1.1),
    width,
    risers,
    riserHeight: stageHeight / risers,
    treadDepth,
    bottomZ,
  }));
};

export type WallSide = 'front' | 'back' | 'left' | 'right';

export interface WallSpec {
  side: WallSide;
  position: [number, number, number];
  /** Turns local +Z (the wall's inward face) toward the room. */
  rotationY: number;
  length: number;
  /** Door centers along the wall, in the wall's local X. */
  doors: number[];
  /** Pilaster centers along the wall, in the wall's local X. */
  pilasters: number[];
}

/** Keeps candidates inside the wall ends and at least `gap` apart. */
const spaced = (candidates: number[], min: number, max: number, gap: number) => {
  const kept: number[] = [];
  candidates
    .filter((c) => c >= min && c <= max)
    .sort((a, b) => a - b)
    .forEach((c) => {
      if (kept.every((k) => Math.abs(k - c) >= gap)) kept.push(c);
    });
  return kept;
};

/** Evenly spaced pilasters at roughly `spacing`, skipping any that would land on a door. */
const pilastersAlong = (length: number, doors: number[], spacing = 6) => {
  const bays = Math.max(1, Math.round(length / spacing));
  const step = length / bays;
  const out: number[] = [];
  for (let i = 1; i < bays; i++) {
    const x = -length / 2 + i * step;
    if (doors.every((d) => Math.abs(d - x) > DOOR_WIDTH / 2 + 0.6)) out.push(x);
  }
  return out;
};

/**
 * Four walls with doors placed where a venue would put them: side exits beside
 * the stage and at each cross aisle, and main entrances on the rear wall lined
 * up with the center and side aisles.
 */
export const computeWalls = (room: RoomBounds, crossAisleZ: number[], rowZ: number[]): WallSpec[] => {
  const margin = DOOR_WIDTH / 2 + 0.4;
  const sideDoorZ = spaced(
    [
      (STAGE.frontZ + FRONT_ROW_Z) / 2,
      ...crossAisleZ,
      ...(crossAisleZ.length === 0 && rowZ.length > 6 ? [rowZ[Math.floor(rowZ.length / 2)]] : []),
    ],
    room.frontZ + margin,
    room.backZ - margin,
    DOOR_WIDTH + 0.8,
  );
  const halfW = room.width / 2;
  const rearDoorX = spaced(
    [0, ...(halfW >= 7 ? [-(halfW - 2.4), halfW - 2.4] : [])],
    room.minX + margin,
    room.maxX - margin,
    DOOR_WIDTH + 0.8,
  );

  const leftDoors = sideDoorZ.map((z) => -(z - room.centerZ));
  const rightDoors = sideDoorZ.map((z) => z - room.centerZ);
  const backDoors = rearDoorX.map((x) => -x);

  return [
    {
      side: 'front',
      position: [0, 0, room.frontZ],
      rotationY: 0,
      length: room.width,
      doors: [],
      pilasters: [],
    },
    {
      side: 'back',
      position: [0, 0, room.backZ],
      rotationY: Math.PI,
      length: room.width,
      doors: backDoors,
      pilasters: pilastersAlong(room.width, backDoors),
    },
    {
      side: 'left',
      position: [room.minX, 0, room.centerZ],
      rotationY: Math.PI / 2,
      length: room.length,
      doors: leftDoors,
      pilasters: pilastersAlong(room.length, leftDoors),
    },
    {
      side: 'right',
      position: [room.maxX, 0, room.centerZ],
      rotationY: -Math.PI / 2,
      length: room.length,
      doors: rightDoors,
      pilasters: pilastersAlong(room.length, rightDoors),
    },
  ];
};
