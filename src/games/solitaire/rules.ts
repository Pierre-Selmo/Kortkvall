import { rankOf, suitOf, value, type CardId, type Rank } from '../vand-tian/cards';
import type { Source, SolState, Target } from './state';

/** Ess är lägst (1), kung högst (13). */
export function low(r: Rank): number {
  return r === 'A' ? 1 : value(r);
}

const isRed = (c: CardId) => suitOf(c) === 'H' || suitOf(c) === 'D';

/** Passar kortet på ett öppet tableau-kort (en valör lägre, motsatt färg)? Tom kolumn tar bara kung. */
export function fitsTableau(card: CardId, top: CardId | undefined): boolean {
  if (!top) return rankOf(card) === 'K';
  return low(rankOf(card)) + 1 === low(rankOf(top)) && isRed(card) !== isRed(top);
}

/** Passar kortet på basrutan? Den ska vara nästa valör i samma färg. */
export function fitsFoundation(card: CardId, pile: readonly CardId[]): boolean {
  return low(rankOf(card)) === pile.length + 1;
}

/** Är en sekvens (underst först) alternerande färg med fallande valör? */
export function isSequence(cards: readonly CardId[]): boolean {
  for (let i = 0; i + 1 < cards.length; i++) {
    const a = cards[i];
    const b = cards[i + 1];
    if (low(rankOf(b)) + 1 !== low(rankOf(a)) || isRed(a) === isRed(b)) return false;
  }
  return true;
}

/** Den del av bordet som reglerna behöver. */
export type BoardView = Pick<SolState, 'tableau' | 'foundations' | 'waste'>;

/** Korten som tas från källan, utan att något ändras. null om källan inte går att använda. */
export function peek(s: BoardView, from: Source): CardId[] | null {
  switch (from.kind) {
    case 'waste': {
      const top = s.waste.at(-1);
      return top ? [top] : null;
    }
    case 'tableau': {
      const col = s.tableau[from.col];
      if (!col || from.count < 1 || from.count > col.up.length) return null;
      const cards = col.up.slice(col.up.length - from.count);
      return isSequence(cards) ? cards : null;
    }
    case 'foundation': {
      const top = s.foundations[from.suit].at(-1);
      return top ? [top] : null;
    }
  }
}

/** Kontrollerar att korten får läggas på målet. Muterar inget. */
export function canPlace(s: BoardView, cards: readonly CardId[], to: Target): boolean {
  if (to.kind === 'tableau') {
    const col = s.tableau[to.col];
    if (!col) return false;
    return fitsTableau(cards[0], col.up.at(-1));
  }
  // Basrutor tar ett kort i taget, i rätt färg.
  return cards.length === 1 && suitOf(cards[0]) === to.suit && fitsFoundation(cards[0], s.foundations[to.suit]);
}

/** Finns det något legalt drag från tableau, waste eller basrutor? */
export function hasMove(s: SolState): boolean {
  const sources: Source[] = [{ kind: 'waste' }];
  s.tableau.forEach((col, i) => {
    for (let k = 1; k <= col.up.length; k++) sources.push({ kind: 'tableau', col: i, count: k });
  });
  for (const suit of ['S', 'H', 'D', 'C'] as const) sources.push({ kind: 'foundation', suit });
  const targets: Target[] = [
    ...s.tableau.map((_, i) => ({ kind: 'tableau' as const, col: i })),
    ...(['S', 'H', 'D', 'C'] as const).map((suit) => ({ kind: 'foundation' as const, suit })),
  ];
  for (const from of sources) {
    const cards = peek(s, from);
    if (!cards) continue;
    for (const to of targets) {
      if (from.kind === 'tableau' && to.kind === 'tableau' && from.col === to.col) continue;
      if (canPlace(s, cards, to)) return true;
    }
  }
  return false;
}

/**
 * Var ska kortet(en) från källan automatiskt gå? Först basrutan, annars första passande kolumn.
 * En kung går inte till en tom kolumn när den redan ligger i en kolumn.
 */
export function autoTarget(s: BoardView, from: Source): Target | null {
  const cards = peek(s, from);
  if (!cards) return null;
  if (cards.length === 1 && from.kind !== 'foundation') {
    const f: Target = { kind: 'foundation', suit: suitOf(cards[0]) };
    if (canPlace(s, cards, f)) return f;
  }
  for (let i = 0; i < s.tableau.length; i++) {
    if (from.kind === 'tableau' && from.col === i) continue;
    const top = s.tableau[i].up.at(-1);
    if (!top && from.kind === 'tableau' && rankOf(cards[0]) === 'K') continue;
    const t: Target = { kind: 'tableau', col: i };
    if (canPlace(s, cards, t)) return t;
  }
  return null;
}

export type Hint = { kind: 'move'; from: Source; to: Target } | { kind: 'draw' };

/** Ett drag att föreslå: först ett flyttbart kort, annars att dra från talongen. null om inget finns kvar. */
export function findHint(s: BoardView, stockCount: number, wasteCount: number): Hint | null {
  const sources: Source[] = [];
  if (s.waste.length > 0) sources.push({ kind: 'waste' });
  s.tableau.forEach((col, i) => {
    for (let k = 1; k <= col.up.length; k++) sources.push({ kind: 'tableau', col: i, count: k });
  });
  for (const suit of ['S', 'H', 'D', 'C'] as const) {
    if (s.foundations[suit].length > 0) sources.push({ kind: 'foundation', suit });
  }
  for (const from of sources) {
    const to = autoTarget(s, from);
    if (to) return { kind: 'move', from, to };
  }
  if (stockCount > 0 || wasteCount > 0) return { kind: 'draw' };
  return null;
}
