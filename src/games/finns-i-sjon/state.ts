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
  /** Sjön. Ordningen är okänd för spelarna. Den som väljer tar ett kort ur den. */
  pile: CardId[];
  current: number;
  /** Satt efter ett miss: den aktiva spelaren ska välja ett kort i sjön. */
  awaiting: { rank: Rank } | null;
  events: FishEvent[];
}

export type FishAction =
  | { type: 'ask'; targetId: string; rank: Rank }
  | { type: 'pick'; index: number };

export const BOOKS_TOTAL = 13;
