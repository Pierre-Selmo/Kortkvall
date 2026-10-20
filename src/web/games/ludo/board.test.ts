import { expect, test } from 'vitest';
import { START } from '../../../games/ludo/state';
import { HOME, SAFE_CELLS, TRACK, pieceCell } from './board';

test('banan har 52 unika rutor som hänger ihop i en slinga', () => {
  expect(TRACK).toHaveLength(52);
  expect(new Set(TRACK.map(([c, r]) => `${c},${r}`)).size).toBe(52);
  TRACK.forEach(([c, r], i) => {
    const [nc, nr] = TRACK[(i + 1) % 52];
    expect(Math.max(Math.abs(c - nc), Math.abs(r - nr))).toBe(1);
  });
});

test('hemfälten ligger utanför banan', () => {
  const track = new Set(TRACK.map(([c, r]) => `${c},${r}`));
  for (const lane of HOME) for (const [c, r] of lane) expect(track.has(`${c},${r}`)).toBe(false);
});

test('startrutorna ligger på armarnas ytterkant, som i bilden', () => {
  // röd nedåt, grön vänster, gul upp, blå höger
  expect(TRACK[START[0]]).toEqual([7, 14]);
  expect(TRACK[START[1]]).toEqual([0, 7]);
  expect(TRACK[START[2]]).toEqual([7, 0]);
  expect(TRACK[START[3]]).toEqual([14, 7]);
});

test('de trygga stjärnrutorna ligger tre före varje startruta', () => {
  expect(SAFE_CELLS.map((i) => TRACK[i])).toEqual([[8, 12], [2, 8], [6, 2], [12, 6]]);
});

test('pjäser i boet, på banan och i mål får rätt position', () => {
  expect(pieceCell(0, 0, 0)).toEqual(TRACK[START[0]]);
  expect(pieceCell(1, 0, 0)).toEqual(TRACK[START[1]]);
  expect(pieceCell(0, 51, 0)).toEqual(HOME[0][0]);
  expect(pieceCell(0, 56, 0)).toEqual([7, 7]);
});
