/** Pjäsens läge: NEST = i boet, 0–50 = på den gemensamma banan, 51–55 = i hemfältet, 56 = i mål. */
export const NEST = -1;
export const LAST_TRACK = 50;
export const GOAL = 56;
export const PIECES = 4;

/** Startrutan på den gemensamma banan för varje färg: röd, grön, gul, blå. */
export const START = [32, 45, 6, 19];

/** Trygga stjärnrutor (tre rutor före varje startruta). Där kan ingen knuffas ut. */
export const SAFE = START.map((s) => (s + 49) % 52);

export type LudoEvent =
  | { type: 'roll'; playerId: string; value: number }
  | { type: 'knock'; playerId: string; victimId: string }
  | { type: 'finish'; playerId: string; place: number };

export interface LudoPlayer {
  id: string;
  /** Färg = index i players: 0 röd, 1 grön, 2 gul, 3 blå. */
  pieces: number[];
}

export interface LudoState {
  phase: 'roll' | 'move' | 'finished';
  players: LudoPlayer[];
  current: number;
  dice: number | null;
  finishOrder: string[];
  events: LudoEvent[];
}

export type LudoAction = { type: 'roll' } | { type: 'move'; pieceIndex: number };
