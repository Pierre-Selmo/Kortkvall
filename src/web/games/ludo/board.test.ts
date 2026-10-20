import { expect, test } from 'vitest';
import { HOME, TRACK, pieceCell } from './board';

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

test('pjäser i boet, på banan och i mål får rätt position', () => {
  expect(pieceCell(0, 0, 0)).toEqual(TRACK[0]);
  expect(pieceCell(1, 0, 0)).toEqual(TRACK[13]);
  expect(pieceCell(0, 51, 0)).toEqual(HOME[0][0]);
  expect(pieceCell(0, 56, 0)).toEqual([7, 7]);
});
