import type { CardId, Rank } from '../vand-tian/cards';
import type { FishEvent, FishState } from './state';

export interface FishPublicPlayer {
  id: string;
  handCount: number;
  books: Rank[];
}

export interface FishView {
  phase: FishState['phase'];
  players: FishPublicPlayer[];
  myHand: CardId[];
  pileCount: number;
  currentPlayerId: string | null;
  /** Valörer jag kan fråga efter just nu. Tomt om det inte är min tur. */
  askable: Rank[];
  events: FishEvent[];
}

export function viewFor(s: FishState, playerId: string): FishView {
  const cur = s.players[s.current];
  const me = s.players.find((p) => p.id === playerId);
  const myTurn = s.phase === 'play' && cur?.id === playerId;
  const askable = myTurn && me
    ? [...new Set(me.hand.map((c) => c.slice(0, -1) as Rank))]
    : [];
  return {
    phase: s.phase,
    players: s.players.map((p) => ({ id: p.id, handCount: p.hand.length, books: [...p.books] })),
    myHand: me ? [...me.hand] : [],
    pileCount: s.pile.length,
    currentPlayerId: s.phase === 'finished' ? null : cur.id,
    askable,
    events: structuredClone(s.events),
  };
}
