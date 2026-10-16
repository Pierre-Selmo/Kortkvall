import type { CardId } from './cards';

export interface VTPlayer {
  id: string;
  hand: CardId[];
  /** Alltid 3 platser; [] = tom hög. */
  faceUp: CardId[][];
  /** Alltid 3 platser; null = spelad. */
  faceDown: (CardId | null)[];
  ready: boolean;
}

export type VTEvent =
  | { type: 'burn'; playerId: string }
  | { type: 'pickUp'; playerId: string; count: number }
  | { type: 'chance'; playerId: string; card: CardId; success: boolean }
  | { type: 'faceDown'; playerId: string; card: CardId; success: boolean }
  | { type: 'out'; playerId: string; place: number }
  | { type: 'gift'; playerId: string; targetId: string; card: CardId };

export interface VTState {
  phase: 'swap' | 'play' | 'finished';
  /** Turordning = ordningen spelarna gick med i. */
  players: VTPlayer[];
  /** Index 0 = översta kortet. */
  deck: CardId[];
  /** Sista elementet = översta kortet. */
  pile: CardId[];
  burnedCount: number;
  /** Index i players. */
  current: number;
  /** Id:n i den ordning spelarna gick ut. */
  finishOrder: string[];
  /** Händelser från det senaste draget (för UI). */
  events: VTEvent[];
}

export type VTAction =
  | { type: 'swap'; handCard: CardId; pileIndex: number }
  | { type: 'stack'; handCard: CardId; pileIndex: number }
  | { type: 'unstack'; pileIndex: number }
  /** Bytesfasen: lägg ett handkort på en annan spelares uppvända hög med samma valör. */
  | { type: 'stackOther'; handCard: CardId; targetId: string; pileIndex: number }
  | { type: 'ready' }
  | { type: 'play'; cards: CardId[] }
  | { type: 'playFaceUp'; pileIndex: number }
  | { type: 'playFaceDown'; index: number }
  | { type: 'chance' }
  | { type: 'pickUp' };
