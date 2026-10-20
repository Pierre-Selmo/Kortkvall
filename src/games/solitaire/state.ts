import type { CardId, Suit } from '../vand-tian/cards';

export interface Column {
  /** Dolda kort, översta sist. */
  down: CardId[];
  /** Öppna kort, översta sist. */
  up: CardId[];
}

/** Varifrån ett eller flera kort tas. */
export type Source =
  | { kind: 'waste' }
  | { kind: 'tableau'; col: number; count: number }
  | { kind: 'foundation'; suit: Suit };

/** Vart korten läggs. */
export type Target = { kind: 'tableau'; col: number } | { kind: 'foundation'; suit: Suit };

export type SolAction = { type: 'draw' } | { type: 'move'; from: Source; to: Target };

export interface SolState {
  phase: 'play' | 'finished';
  /** Sant när alla fyra basrutor är klara. Falskt vid blockerat läge. */
  won: boolean;
  playerId: string;
  /** Talongen. Index 0 är översta kortet. */
  stock: CardId[];
  /** Skräphögen. Sista kortet är det översta öppna. */
  waste: CardId[];
  foundations: Record<Suit, CardId[]>;
  tableau: Column[];
}
