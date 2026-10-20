import { legalPieces } from './legal';
import type { LudoEvent, LudoState } from './state';

export interface LudoPublicPlayer {
  id: string;
  pieces: number[];
  place: number | null;
}

export interface LudoView {
  phase: LudoState['phase'];
  players: LudoPublicPlayer[];
  currentPlayerId: string | null;
  dice: number | null;
  /** Pjäser jag kan flytta just nu (bara när det är min tur och jag har slagit). */
  legal: number[];
  events: LudoEvent[];
}

export function viewFor(s: LudoState, playerId: string): LudoView {
  const cur = s.players[s.current];
  const me = s.players.find((p) => p.id === playerId);
  const myMove = s.phase === 'move' && cur?.id === playerId && s.dice !== null && !!me;
  return {
    phase: s.phase,
    players: s.players.map((p) => {
      const i = s.finishOrder.indexOf(p.id);
      return { id: p.id, pieces: [...p.pieces], place: i < 0 ? null : i + 1 };
    }),
    currentPlayerId: s.phase === 'finished' ? null : cur.id,
    dice: s.dice,
    legal: myMove ? legalPieces(me.pieces, s.dice!) : [],
    events: structuredClone(s.events),
  };
}
