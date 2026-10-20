// Brädets geometri på ett 15×15-rutnät. (kolumn, rad), med 0,0 uppe till vänster.

/** De 52 rutorna på den gemensamma banan, medurs. Ruta 0, 13, 26 och 39 är startrutor. */
export const TRACK: [number, number][] = [
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
];

/** Hemfältet för varje färg: fem rutor från utkanten in mot mitten (progress 51–55). */
export const HOME: [number, number][][] = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],     // röd: vänstra armen
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],     // grön: övre armen
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // gul: högra armen
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // blå: undre armen
];

/** Övre vänstra hörnet för boet i varje färg (6×6 rutor). */
export const NEST_ORIGIN: [number, number][] = [[0, 9], [0, 0], [9, 0], [9, 9]];

export const COLORS = ['#d32f2f', '#2e7d32', '#f9a825', '#1565c0'];
export const COLOR_NAMES = ['röd', 'grön', 'gul', 'blå'];

export const CELL = 40;
export const SIZE = 15 * CELL;

/** Mittenrutan där pjäser i mål står. */
export const CENTER: [number, number] = [7, 7];

/** Mittkoordinaten för en pjäs. nestSlot är pjässlot 0–3 i boet. */
export function pieceCell(color: number, progress: number, nestSlot: number): [number, number] {
  if (progress === -1) {
    const [c0, r0] = NEST_ORIGIN[color];
    return [c0 + 1.5 + (nestSlot % 2) * 2, r0 + 1.5 + Math.floor(nestSlot / 2) * 2];
  }
  if (progress <= 50) return TRACK[(color * 13 + progress) % 52];
  if (progress <= 55) return HOME[color][progress - 51];
  return CENTER;
}
