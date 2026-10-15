import type { Rng } from '../../shared/rng';
import { fail, type ActionResult } from '../types';
import { canPlayOn, rankOf } from './cards';
import { isOut, sourceOf } from './legal';
import { refill, type VTAction, type VTState } from './state';

function nextActive(s: VTState, from: number): number {
  for (let k = 1; k <= s.players.length; k++) {
    const i = (from + k) % s.players.length;
    if (!isOut(s.players[i])) return i;
  }
  return from;
}

function shouldBurn(pile: string[]): boolean {
  if (pile.length === 0) return false;
  if (rankOf(pile[pile.length - 1]) === '10') return true;
  if (pile.length < 4) return false;
  const top = pile.slice(-4).map(rankOf);
  return top.every((r) => r === top[0]);
}

/** Burns, refills, handles going out and advances the turn after cards were added to the pile. */
function afterPlay(s: VTState, idx: number): void {
  const p = s.players[idx];
  const burned = shouldBurn(s.pile);
  if (burned) {
    s.burnedCount += s.pile.length;
    s.pile = [];
    s.events.push({ type: 'burn', playerId: p.id });
  }
  refill(s, p);
  if (isOut(p)) {
    s.finishOrder.push(p.id);
    s.events.push({ type: 'out', playerId: p.id, place: s.finishOrder.length });
    const left = s.players.filter((pl) => !isOut(pl));
    if (left.length <= 1) {
      if (left.length === 1) s.finishOrder.push(left[0].id);
      s.phase = 'finished';
      return;
    }
    s.current = nextActive(s, idx);
  } else if (!burned) {
    s.current = nextActive(s, idx);
  }
}

function tooLow(s: VTState): string {
  return `Du måste lägga lika högt eller högre än ${rankOf(s.pile[s.pile.length - 1])}`;
}

export function applyPlayAction(s: VTState, playerId: string, a: VTAction, _rng: Rng): ActionResult<VTState> {
  if (s.phase === 'swap') return fail('Byt kort eller tryck Klar först');
  if (s.phase !== 'play') return fail('Spelet är slut');
  const idx = s.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return fail('Du är inte med i spelet');
  if (isOut(s.players[idx])) return fail('Du har redan gått ut');
  if (idx !== s.current) return fail('Det är inte din tur');

  const n = structuredClone(s);
  n.events = [];
  const p = n.players[idx];
  const src = sourceOf(p);

  switch (a.type) {
    case 'play': {
      if (src !== 'hand') return fail('Du har inga kort på handen');
      const cards = a.cards;
      if (cards.length === 0) return fail('Välj minst ett kort');
      if (new Set(cards).size !== cards.length) return fail('Ogiltigt drag');
      if (!cards.every((c) => p.hand.includes(c))) return fail('Kortet finns inte på din hand');
      const rank = rankOf(cards[0]);
      if (!cards.every((c) => rankOf(c) === rank)) return fail('Alla kort måste ha samma valör');
      if (!canPlayOn(rank, n.pile)) return fail(tooLow(n));
      p.hand = p.hand.filter((c) => !cards.includes(c));
      n.pile.push(...cards);
      afterPlay(n, idx);
      return { ok: true, state: n };
    }
    default:
      return fail('Ogiltigt drag');
  }
}
