export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Suit = 'H' | 'D' | 'C' | 'S';
/** Rank followed by suit, e.g. "KH" or "10S". */
export type CardId = string;

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUITS: Suit[] = ['H', 'D', 'C', 'S'];

const VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};

export function rankOf(c: CardId): Rank {
  return c.slice(0, -1) as Rank;
}

export function suitOf(c: CardId): Suit {
  return c.slice(-1) as Suit;
}

export function value(r: Rank): number {
  return VALUES[r];
}

export function isSpecial(r: Rank): boolean {
  return r === '2' || r === '10';
}

export function makeDeck(): CardId[] {
  return SUITS.flatMap((s) => RANKS.map((r) => r + s));
}

/** Whether a card of rank `r` may be played on `pile` (last element = top). */
export function canPlayOn(r: Rank, pile: readonly CardId[]): boolean {
  if (isSpecial(r) || pile.length === 0) return true;
  const top = rankOf(pile[pile.length - 1]);
  if (top === '2') return true;
  return value(r) >= value(top);
}
