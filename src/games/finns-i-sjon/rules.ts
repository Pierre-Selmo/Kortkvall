import { rankOf, type Rank } from '../vand-tian/cards';
import { BOOKS_TOTAL, type FishPlayer, type FishState } from './state';

/** Lägger ut alla fyrtal på spelarens hand. Muterar. */
export function layBooks(s: FishState, p: FishPlayer): void {
  const counts = new Map<Rank, number>();
  for (const c of p.hand) counts.set(rankOf(c), (counts.get(rankOf(c)) ?? 0) + 1);
  for (const [rank, n] of counts) {
    if (n < 4) continue;
    p.hand = p.hand.filter((c) => rankOf(c) !== rank);
    p.books.push(rank);
    s.events.push({ type: 'book', playerId: p.id, rank });
  }
}

/** Den som har tom hand drar ett kort från sjön, om den har kort kvar. Muterar. */
export function refillEmpty(s: FishState): void {
  for (const p of s.players) {
    if (p.hand.length === 0 && s.pile.length > 0) {
      p.hand.push(s.pile.shift()!);
      layBooks(s, p);
    }
  }
}

export function isOver(s: FishState): boolean {
  const books = s.players.reduce((n, p) => n + p.books.length, 0);
  return books === BOOKS_TOTAL || (s.pile.length === 0 && s.players.every((p) => p.hand.length === 0));
}

/** Nästa spelare med kort på handen, medurs från `from`. -1 om ingen har något. */
export function nextWithCards(s: FishState, from: number): number {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (s.players[i].hand.length > 0) return i;
  }
  return -1;
}
