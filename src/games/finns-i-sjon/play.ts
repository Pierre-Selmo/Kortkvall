import type { Rng } from '../../shared/rng';
import type { ActionResult, GameResult } from '../types';
import { rankOf, type CardId, type Rank } from '../vand-tian/cards';
import { isOver, layBooks, nextWithCards, refillEmpty } from './rules';
import type { FishAction, FishState } from './state';

const fail = (error: string) => ({ ok: false as const, error });

/** Byter tur till någon med kort, om spelaren inte har något kvar själv. Muterar. */
function passIfEmpty(s: FishState, idx: number): void {
  if (s.players[idx].hand.length === 0) {
    const next = nextWithCards(s, idx);
    if (next >= 0) s.current = next;
  }
}

/** Det valda kortet (eller ingenting, om sjön är tom) går till handen. Muterar. */
function finishDraw(s: FishState, idx: number, card: CardId | null, rank: Rank): void {
  const p = s.players[idx];
  if (card) p.hand.push(card);
  const matched = card !== null && rankOf(card) === rank;
  s.events.push({ type: 'fish', playerId: p.id, shown: matched ? card : null });
  layBooks(s, p);
  refillEmpty(s);
  if (!matched) {
    const next = nextWithCards(s, idx);
    if (next >= 0) s.current = next;
  }
  passIfEmpty(s, idx);
}

export function applyFishAction(state: FishState, playerId: string, a: FishAction, _rng: Rng): ActionResult<FishState> {
  if (state.phase === 'finished') return fail('Spelet är slut');
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return fail('Okänd spelare');
  if (idx !== state.current) return fail('Det är inte din tur');

  const s = structuredClone(state);
  s.events = [];

  if (s.awaiting) {
    // Efter ett miss väljer spelaren själv ett kort i sjön.
    if (a.type !== 'pick') return fail('Välj ett kort i sjön först');
    if (!Number.isInteger(a.index) || a.index < 0 || a.index >= s.pile.length) return fail('Det kortet finns inte i sjön');
    const [card] = s.pile.splice(a.index, 1);
    const rank = s.awaiting.rank;
    s.awaiting = null;
    finishDraw(s, idx, card, rank);
  } else {
    if (a.type !== 'ask') return fail('Ogiltigt drag');
    const t = s.players.findIndex((p) => p.id === a.targetId);
    if (t < 0 || t === idx) return fail('Välj en motspelare');
    const p = s.players[idx];
    const target = s.players[t];
    if (!p.hand.some((c) => rankOf(c) === a.rank)) return fail('Du måste ha minst ett kort av valören du frågar efter');

    const given = target.hand.filter((c) => rankOf(c) === a.rank);
    if (given.length > 0) {
      // Träff: kortena byter ägare och turen fortsätter.
      target.hand = target.hand.filter((c) => rankOf(c) !== a.rank);
      p.hand.push(...given);
      s.events.push({ type: 'ask', playerId, targetId: target.id, rank: a.rank, hits: given.length });
      layBooks(s, p);
      refillEmpty(s);
      passIfEmpty(s, idx);
    } else {
      // Miss: "Finns i sjön!". Sjön är tom: inget mer. Annars väljer spelaren ett kort.
      s.events.push({ type: 'ask', playerId, targetId: target.id, rank: a.rank, hits: 0 });
      if (s.pile.length === 0) finishDraw(s, idx, null, a.rank);
      else s.awaiting = { rank: a.rank };
    }
  }

  if (isOver(s)) s.phase = 'finished';
  return { ok: true, state: s };
}

/** Placeringen: flest fyrtal först. Förloraren är den med minst. */
export function fishResult(s: FishState): GameResult | null {
  if (s.phase !== 'finished') return null;
  const order = [...s.players].sort((a, b) => b.books.length - a.books.length).map((p) => p.id);
  return { placements: order, loserId: order[order.length - 1] };
}
