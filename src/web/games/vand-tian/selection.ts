import { rankOf, type CardId } from '../../../games/vand-tian/cards';
import type { VTAction } from '../../../games/vand-tian/state';

/** Samma valör läggs till eller tas bort; annan valör ersätter markeringen. */
export function toggleSelect(selected: CardId[], card: CardId): CardId[] {
  if (selected.includes(card)) return selected.filter((c) => c !== card);
  if (selected.length > 0 && rankOf(selected[0]) !== rankOf(card)) return [card];
  return [...selected, card];
}

/** Vad händer om handkortet läggs på den uppvända högen i bytesfasen? */
export function swapIntent(handCard: CardId, pile: CardId[]): VTAction['type'] | null {
  if (pile.length === 0) return null;
  if (rankOf(pile[0]) === rankOf(handCard)) return 'stack';
  return 'swap';
}
