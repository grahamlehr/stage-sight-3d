import { describe, expect, it } from 'vitest';
import { computeSeatingLayout, SEATING_SPEC, SeatingLayoutParams } from './seatingLayout';

// The default 20m x 30m ballroom: walls at x = ±10, rear wall at z = 15
const DEFAULT_ROOM: SeatingLayoutParams = {
  roomMinX: -10,
  roomMaxX: 10,
  frontRowZ: -8,
  lastRowLimitZ: 13.2,
};

const rowsOf = (seats: { x: number; z: number }[]) => {
  const rows = new Map<number, number[]>();
  seats.forEach(({ x, z }) => rows.set(z, [...(rows.get(z) ?? []), x]));
  return [...rows.values()].map((xs) => xs.sort((a, b) => a - b));
};

describe('computeSeatingLayout', () => {
  it('seats the default room in two sections of 28-seat rows', () => {
    const layout = computeSeatingLayout(DEFAULT_ROOM);
    expect(layout.rowZ).toHaveLength(22);
    expect(layout.crossAisleZ).toHaveLength(1);
    expect(layout.seats).toHaveLength(22 * 28);
  });

  it('starts at the front row and stays inside the rear limit', () => {
    const { rowZ } = computeSeatingLayout(DEFAULT_ROOM);
    expect(rowZ[0]).toBe(-8);
    expect(rowZ[rowZ.length - 1]).toBeLessThanOrEqual(DEFAULT_ROOM.lastRowLimitZ);
  });

  it('keeps the center aisle clear on the stage centerline', () => {
    const { seats } = computeSeatingLayout(DEFAULT_ROOM);
    const clear = SEATING_SPEC.centerAisle / 2 + SEATING_SPEC.seatPitch / 2 - 1e-9;
    seats.forEach(({ x }) => expect(Math.abs(x)).toBeGreaterThanOrEqual(clear));
  });

  it('is symmetric about the center aisle', () => {
    const { seats } = computeSeatingLayout(DEFAULT_ROOM);
    const firstRow = rowsOf(seats)[0];
    firstRow.forEach((x, i) => expect(x).toBeCloseTo(-firstRow[firstRow.length - 1 - i]));
  });

  it('leaves a side aisle against each wall', () => {
    const { seats } = computeSeatingLayout(DEFAULT_ROOM);
    const halfW = SEATING_SPEC.chairWidth / 2;
    seats.forEach(({ x }) => {
      expect(x - halfW).toBeGreaterThan(DEFAULT_ROOM.roomMinX + SEATING_SPEC.sideAisle);
      expect(x + halfW).toBeLessThan(DEFAULT_ROOM.roomMaxX - SEATING_SPEC.sideAisle);
    });
  });

  it('splits wide rooms into blocks of at most 14 seats', () => {
    const { seats } = computeSeatingLayout({ ...DEFAULT_ROOM, roomMinX: -22.5, roomMaxX: 22.5 });
    const row = rowsOf(seats)[0];
    let run = 1;
    let longest = 1;
    for (let i = 1; i < row.length; i++) {
      run = row[i] - row[i - 1] < SEATING_SPEC.seatPitch + 0.01 ? run + 1 : 1;
      longest = Math.max(longest, run);
    }
    expect(row.length).toBeGreaterThan(2 * SEATING_SPEC.maxSeatsPerBlockRow);
    expect(longest).toBeLessThanOrEqual(SEATING_SPEC.maxSeatsPerBlockRow);
  });

  it('adds a cross aisle wider than a normal row gap between sections', () => {
    const { rowZ, crossAisleZ } = computeSeatingLayout(DEFAULT_ROOM);
    const behind = rowZ.findIndex((z) => z > crossAisleZ[0]);
    expect(rowZ[behind] - rowZ[behind - 1]).toBeCloseTo(
      SEATING_SPEC.rowPitch + SEATING_SPEC.crossAisle,
    );
  });

  it('removes chairs that would sit on a keep-out area', () => {
    const stairs = { minX: 7.2, maxX: 8.4, minZ: -10, maxZ: -7 };
    const { seats } = computeSeatingLayout({ ...DEFAULT_ROOM, keepOut: [stairs] });
    expect(seats.length).toBeLessThan(22 * 28);
    seats.forEach(({ x, z }) => {
      const inside = x > stairs.minX - 0.23 && x < stairs.maxX + 0.23 && z < stairs.maxZ + 0.28;
      expect(inside).toBe(false);
    });
  });

  it('returns no seats when the room has no depth for a row', () => {
    const layout = computeSeatingLayout({ ...DEFAULT_ROOM, lastRowLimitZ: -9 });
    expect(layout.seats).toEqual([]);
    expect(layout.rowZ).toEqual([]);
  });
});
