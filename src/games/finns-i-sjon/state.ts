import type { CardId, Rank } from '../vand-tian/cards';

export interface FishPlayer {
  id: string;
  hand: CardId[];
  /** Lagda fyrtal, en valör per fyrtal. */
  books: Rank[];
}

export type FishEvent =
  | { type: 'ask'; playerId: string; targetId: string; rank: Rank; hits: number }
  | { type: 'fish'; playerId: string; shown: CardId | null }
  | { type: 'book'; playerId: string; rank: Rank };

export interface FishState {
  phase: 'play' | 'finished';
  players: FishPlayer[];
  /** Sjön. Index 0 = översta kortet. */
  pile: CardId[];
  current: number;
  events: FishEvent[];
}

export type FishAction = { type: 'ask'; targetId: string; rank: Rank };

export const BOOKS_TOTAL = 13;
