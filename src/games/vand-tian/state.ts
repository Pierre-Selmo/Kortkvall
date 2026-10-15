import type { CardId } from './cards';

export interface VTPlayer {
  id: string;
  hand: CardId[];
  /** Always 3 slots; [] = empty pile. */
  faceUp: CardId[][];
  /** Always 3 slots; null = played. */
  faceDown: (CardId | null)[];
  ready: boolean;
}

export type VTEvent =
  | { type: 'burn'; playerId: string }
  | { type: 'pickUp'; playerId: string; count: number }
  | { type: 'chance'; playerId: string; card: CardId; success: boolean }
  | { type: 'faceDown'; playerId: string; card: CardId; success: boolean }
  | { type: 'out'; playerId: string; place: number };

export interface VTState {
  phase: 'swap' | 'play' | 'finished';
  /** Turn order = join order. */
  players: VTPlayer[];
  /** Index 0 = top card. */
  deck: CardId[];
  /** Last element = top card. */
  pile: CardId[];
  burnedCount: number;
  /** Index into players. */
  current: number;
  /** Ids in the order players went out. */
  finishOrder: string[];
  /** Events from the most recent action (for the UI). */
  events: VTEvent[];
}

export type VTAction =
  | { type: 'swap'; handCard: CardId; pileIndex: number }
  | { type: 'stack'; handCard: CardId; pileIndex: number }
  | { type: 'unstack'; pileIndex: number }
  | { type: 'ready' }
  | { type: 'play'; cards: CardId[] }
  | { type: 'playFaceUp'; pileIndex: number }
  | { type: 'playFaceDown'; index: number }
  | { type: 'chance' }
  | { type: 'pickUp' };

/** Moves up to `3 - hand.length` cards from the top of the deck to the hand. */
export function refill(s: VTState, p: VTPlayer): void {
  while (p.hand.length < 3 && s.deck.length > 0) p.hand.push(s.deck.shift()!);
}
