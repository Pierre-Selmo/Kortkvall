import type { CardId, Suit } from '../vand-tian/cards';
import type { SolState } from './state';

export interface SolColumnView {
  /** Antal dolda kort. */
  down: number;
  up: CardId[];
}

export interface SolView {
  phase: SolState['phase'];
  won: boolean;
  stockCount: number;
  wasteCount: number;
  wasteTop: CardId | null;
  foundations: Record<Suit, CardId[]>;
  tableau: SolColumnView[];
}

export function viewFor(s: SolState, _playerId: string): SolView {
  return {
    phase: s.phase,
    won: s.won,
    stockCount: s.stock.length,
    wasteCount: s.waste.length,
    wasteTop: s.waste.at(-1) ?? null,
    foundations: s.foundations,
    tableau: s.tableau.map((c) => ({ down: c.down.length, up: [...c.up] })),
  };
}
