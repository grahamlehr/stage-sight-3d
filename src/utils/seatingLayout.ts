/**
 * Theatre-style conference seating, laid out the way a hotel or convention
 * venue would set a ballroom: straight rows of banquet chairs facing the stage,
 * a wide center aisle on the stage centerline, side aisles along the walls, and
 * cross aisles that break deep rooms into sections. Blocks are capped at a
 * fire-code-style maximum seats per row between aisles.
 *
 * Units are meters. The stage is centered on x = 0 and the audience faces -Z.
 */

export interface FloorRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SeatingLayoutParams {
  /** Inner face of the left wall. */
  roomMinX: number;
  /** Inner face of the right wall. */
  roomMaxX: number;
  /** Center of the first row. */
  frontRowZ: number;
  /** The last row's center may not pass this z. */
  lastRowLimitZ: number;
  /** Floor areas chairs must stay out of, such as stage stairs. */
  keepOut?: FloorRect[];
}

export interface SeatPlacement {
  x: number;
  z: number;
}

export interface SeatingLayout {
  seats: SeatPlacement[];
  /** Center z of each row, front to back. */
  rowZ: number[];
  /** Center z of each cross aisle between seating sections. */
  crossAisleZ: number[];
}

export const SEATING_SPEC = {
  /** Banquet chair width and depth, used for footprint checks. */
  chairWidth: 0.46,
  chairDepth: 0.55,
  /** Center-to-center chair spacing along a row (chairs ganged with a small gap). */
  seatPitch: 0.52,
  /** Back-to-back row spacing. */
  rowPitch: 0.92,
  centerAisle: 1.8,
  /** Clear width between the wall and the outermost chair. */
  sideAisle: 1.5,
  /** Aisle between seating blocks when a side is too wide for one block. */
  blockAisle: 1.2,
  /** Extra clear width a cross aisle adds on top of the normal row spacing. */
  crossAisle: 1.8,
  maxSeatsPerBlockRow: 14,
  maxRowsPerSection: 14,
} as const;

/** Splits `total` into `parts` near-equal counts, larger ones first. */
const distribute = (total: number, parts: number): number[] => {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
};

/** Seat x offsets from the center aisle edge, outward, for one side of the room. */
const sideSeatOffsets = (span: number): number[] => {
  const { seatPitch, blockAisle, maxSeatsPerBlockRow } = SEATING_SPEC;
  if (span < seatPitch) return [];

  let blocks = 1;
  let total = Math.floor(span / seatPitch);
  while (total > blocks * maxSeatsPerBlockRow) {
    blocks += 1;
    total = Math.floor((span - (blocks - 1) * blockAisle) / seatPitch);
  }

  const offsets: number[] = [];
  let cursor = 0;
  for (const count of distribute(total, blocks)) {
    for (let k = 0; k < count; k++) {
      offsets.push(cursor + seatPitch / 2 + k * seatPitch);
    }
    cursor += count * seatPitch + blockAisle;
  }
  return offsets;
};

/** Row centers, front to back, plus the cross aisles between sections. */
const rowPositions = (frontRowZ: number, lastRowLimitZ: number) => {
  const { rowPitch, crossAisle, maxRowsPerSection } = SEATING_SPEC;
  const depth = lastRowLimitZ - frontRowZ;
  if (depth < 0) return { rowZ: [], crossAisleZ: [] };

  let sections = 1;
  let total = Math.floor(depth / rowPitch) + 1;
  while (total > sections * maxRowsPerSection) {
    sections += 1;
    total = Math.max(0, Math.floor((depth - (sections - 1) * crossAisle) / rowPitch) + 1);
  }

  const rowZ: number[] = [];
  const crossAisleZ: number[] = [];
  let z = frontRowZ;
  distribute(total, sections).forEach((count, sectionIdx) => {
    if (sectionIdx > 0) {
      const lastZ = rowZ[rowZ.length - 1];
      z = lastZ + rowPitch + crossAisle;
      crossAisleZ.push((lastZ + z) / 2);
    }
    for (let r = 0; r < count; r++) {
      rowZ.push(z);
      z += rowPitch;
    }
  });
  return { rowZ, crossAisleZ };
};

const overlaps = (seat: SeatPlacement, rect: FloorRect): boolean => {
  const halfW = SEATING_SPEC.chairWidth / 2;
  const halfD = SEATING_SPEC.chairDepth / 2;
  return (
    seat.x + halfW > rect.minX &&
    seat.x - halfW < rect.maxX &&
    seat.z + halfD > rect.minZ &&
    seat.z - halfD < rect.maxZ
  );
};

export const computeSeatingLayout = ({
  roomMinX,
  roomMaxX,
  frontRowZ,
  lastRowLimitZ,
  keepOut = [],
}: SeatingLayoutParams): SeatingLayout => {
  const { centerAisle, sideAisle } = SEATING_SPEC;
  const halfAisle = centerAisle / 2;

  const leftOffsets = sideSeatOffsets(-halfAisle - (roomMinX + sideAisle));
  const rightOffsets = sideSeatOffsets(roomMaxX - sideAisle - halfAisle);
  const columnX = [
    ...leftOffsets.map((o) => -halfAisle - o).reverse(),
    ...rightOffsets.map((o) => halfAisle + o),
  ];

  const { rowZ, crossAisleZ } = rowPositions(frontRowZ, lastRowLimitZ);

  const seats: SeatPlacement[] = [];
  for (const z of rowZ) {
    for (const x of columnX) {
      const seat = { x, z };
      if (!keepOut.some((rect) => overlaps(seat, rect))) seats.push(seat);
    }
  }

  return { seats, rowZ, crossAisleZ };
};
