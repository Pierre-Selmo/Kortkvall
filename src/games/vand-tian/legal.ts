import { canPlayOn, rankOf } from './cards';
import type { VTPlayer, VTState } from './state';

/** Where the player plays from right now; null = the player is out. */
export type Source = 'hand' | 'faceUp' | 'faceDown' | null;

export function sourceOf(p: VTPlayer): Source {
  if (p.hand.length > 0) return 'hand';
  if (p.faceUp.some((pile) => pile.length > 0)) return 'faceUp';
  if (p.faceDown.some((c) => c !== null)) return 'faceDown';
  return null;
}

export function isOut(p: VTPlayer): boolean {
  return sourceOf(p) === null;
}

function isTurn(s: VTState, playerId: string): VTPlayer | null {
  if (s.phase !== 'play') return null;
  const p = s.players[s.current];
  return p && p.id === playerId ? p : null;
}

/** Whether the player has something legal to play from the current source. Face-down is blind, so always true. */
export function hasPlayable(s: VTState, playerId: string): boolean {
  const p = s.players.find((pl) => pl.id === playerId);
  if (!p) return false;
  switch (sourceOf(p)) {
    case 'hand':
      return p.hand.some((c) => canPlayOn(rankOf(c), s.pile));
    case 'faceUp':
      return p.faceUp.some((pile) => pile.length > 0 && canPlayOn(rankOf(pile[0]), s.pile));
    case 'faceDown':
      return true;
    default:
      return false;
  }
}

export function canChance(s: VTState, playerId: string): boolean {
  const p = isTurn(s, playerId);
  return !!p && sourceOf(p) === 'hand' && !hasPlayable(s, playerId) && s.deck.length > 0;
}

export function canPickUp(s: VTState, playerId: string): boolean {
  const p = isTurn(s, playerId);
  if (!p) return false;
  const src = sourceOf(p);
  return (src === 'hand' || src === 'faceUp') && !hasPlayable(s, playerId) && s.pile.length > 0;
}
