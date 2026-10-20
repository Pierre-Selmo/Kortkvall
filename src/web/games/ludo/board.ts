import { START } from '../../../games/ludo/state';

// Brädets geometri på ett 15×15-rutnät. (kolumn, rad), med 0,0 uppe till vänster.

/** De 52 rutorna på den gemensamma banan, medurs. */
export const TRACK: [number, number][] = [
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
];

/** Hemfältet för varje färg (röd, grön, gul, blå): fem rutor från utkanten in mot mitten (progress 51–55). */
export const HOME: [number, number][][] = [
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],   // röd: undre armen
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],       // grön: vänstra armen
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],       // gul: övre armen
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],   // blå: högra armen
];

/** Övre vänstra hörnet för boet i varje färg (6×6 rutor). */
export const NEST_ORIGIN: [number, number][] = [[0, 9], [0, 0], [9, 0], [9, 9]];

/** Trygga stjärnrutor: tre före varje startruta. */
export const SAFE_CELLS: number[] = START.map((s) => (s + 49) % 52);

export const COLORS = ['#e53935', '#43a047', '#fdd835', '#1e88e5'];
/** Ljusa toner för boet. */
export const TINTS = ['#f8d7d5', '#d6eed5', '#fff3b8', '#d3e5f8'];
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
  if (progress <= 50) return TRACK[(START[color] + progress) % 52];
  if (progress <= 55) return HOME[color][progress - 51];
  return CENTER;
}

/** Punkterna för en femuddig stjärna (SVG polygon). */
export function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, k) => {
    const rad = k % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** En pil som pekar från en ruta mot nästa, för att markera startrutan. */
export function arrowPoints(from: [number, number], to: [number, number]): string {
  const cx = from[0] * CELL + CELL / 2;
  const cy = from[1] * CELL + CELL / 2;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const pts = [
    [cx + ux * 13, cy + uy * 13],
    [cx - ux * 7 + px * 9, cy - uy * 7 + py * 9],
    [cx - ux * 7 - px * 9, cy - uy * 7 - py * 9],
  ];
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}
