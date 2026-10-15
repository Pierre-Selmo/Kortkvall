import type { CardId } from './cards';
import { canChance, canPickUp, sourceOf, type Source } from './legal';
import type { VTEvent, VTState } from './state';

export interface VTPublicPlayer {
  id: string;
  handCount: number;
  faceUp: CardId[][];
  /** true = a card is still there. */
  faceDown: boolean[];
  ready: boolean;
  place: number | null;
}

export interface VTView {
  phase: VTState['phase'];
  /** Everyone in turn order, including me. */
  players: VTPublicPlayer[];
  myHand: CardId[];
  /** At most the top 4; last = top. */
  pileTop: CardId[];
  pileCount: number;
  deckCount: number;
  burnedCount: number;
  /** null during the swap phase and when the game is over. */
  currentPlayerId: string | null;
  mySource: Source;
  canChance: boolean;
  canPickUp: boolean;
  events: VTEvent[];
}

export function viewFor(s: VTState, playerId: string): VTView {
  const me = s.players.find((p) => p.id === playerId);
  return {
    phase: s.phase,
    players: s.players.map((p) => {
      const place = s.finishOrder.indexOf(p.id);
      return {
        id: p.id,
        handCount: p.hand.length,
        faceUp: p.faceUp.map((pile) => [...pile]),
        faceDown: p.faceDown.map((c) => c !== null),
        ready: p.ready,
        place: place >= 0 ? place + 1 : null,
      };
    }),
    myHand: me ? [...me.hand] : [],
    pileTop: s.pile.slice(-4),
    pileCount: s.pile.length,
    deckCount: s.deck.length,
    burnedCount: s.burnedCount,
    currentPlayerId: s.phase === 'play' ? s.players[s.current].id : null,
    mySource: me ? sourceOf(me) : null,
    canChance: canChance(s, playerId),
    canPickUp: canPickUp(s, playerId),
    events: s.events,
  };
}
