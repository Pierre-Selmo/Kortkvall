import { canPlayOn, rankOf } from './cards';
import type { VTPlayer, VTState } from './state';

/** Var spelaren spelar från just nu. null = spelaren är ute. */
export type Source = 'hand' | 'faceUp' | 'faceDown' | null;

export function sourceOf(p: VTPlayer): Source {
  if (p.hand.length > 0) return 'hand';
  if (p.faceUp.some((f) => f.length > 0)) return 'faceUp';
  if (p.faceDown.some((c) => c !== null)) return 'faceDown';
  return null;
}

export function isOut(p: VTPlayer): boolean {
  return sourceOf(p) === null;
}

function player(s: VTState, playerId: string): VTPlayer | undefined {
  return s.players.find((p) => p.id === playerId);
}

function isTurn(s: VTState, playerId: string): boolean {
  return s.phase === 'play' && s.players[s.current]?.id === playerId;
}

/** Har spelaren något giltigt att lägga från sin nuvarande källa? Nedvända kort räknas alltid (blint). */
export function hasPlayable(s: VTState, playerId: string): boolean {
  const p = player(s, playerId);
  if (!p) return false;
  switch (sourceOf(p)) {
    case 'hand':
      return p.hand.some((c) => canPlayOn(rankOf(c), s.pile));
    case 'faceUp':
      return p.faceUp.some((f) => f.length > 0 && canPlayOn(rankOf(f[0]), s.pile));
    case 'faceDown':
      return true;
    default:
      return false;
  }
}

export function canChance(s: VTState, playerId: string): boolean {
  const p = player(s, playerId);
  return !!p && isTurn(s, playerId) && sourceOf(p) === 'hand' && !hasPlayable(s, playerId) && s.deck.length > 0;
}

export function canPickUp(s: VTState, playerId: string): boolean {
  const p = player(s, playerId);
  if (!p || !isTurn(s, playerId)) return false;
  const src = sourceOf(p);
  return (src === 'hand' || src === 'faceUp') && !hasPlayable(s, playerId) && s.pile.length > 0;
}
