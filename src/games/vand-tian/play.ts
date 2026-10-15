import type { Rng } from '../../shared/rng';
import type { ActionResult, GameResult } from '../types';
import { canPlayOn, rankOf, type CardId, type Rank } from './cards';
import { canChance, canPickUp, isOut, sourceOf } from './legal';
import { refill } from './setup';
import type { VTAction, VTState } from './state';

const fail = (error: string) => ({ ok: false as const, error });

const RANK_NAMES: Partial<Record<Rank, string>> = { J: 'knekt', Q: 'dam', K: 'kung', A: 'ess' };

function tooLow(pile: CardId[]): string {
  const top = rankOf(pile[pile.length - 1]);
  return `Du måste lägga ${RANK_NAMES[top] ?? top} eller högre`;
}

function nextPlayer(s: VTState, from: number): number {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!isOut(s.players[i])) return i;
  }
  return from;
}

/** Efter att kort har lagts på högen: vändning, påfyllning, ute och nästa tur. Muterar. */
function afterPlay(s: VTState, playerIndex: number): void {
  const p = s.players[playerIndex];
  const top4 = s.pile.slice(-4).map(rankOf);
  const burned = rankOf(s.pile[s.pile.length - 1]) === '10'
    || (top4.length === 4 && top4.every((r) => r === top4[0]));
  // Efter en 2:a lägger samma spelare igen (och får då lägga vad som helst).
  const again = burned || rankOf(s.pile[s.pile.length - 1]) === '2';
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
      s.finishOrder.push(...left.map((pl) => pl.id));
      s.phase = 'finished';
      return;
    }
    s.current = nextPlayer(s, playerIndex);
  } else if (!again) {
    s.current = nextPlayer(s, playerIndex);
  }
}

/** Spelaren tar upp högen (plus eventuella extra kort) och turen går vidare. Muterar. */
function takePile(s: VTState, playerIndex: number, extra: CardId[]): void {
  s.players[playerIndex].hand.push(...s.pile, ...extra);
  s.pile = [];
  s.current = nextPlayer(s, playerIndex);
}

export function applyPlayAction(state: VTState, playerId: string, a: VTAction, _rng: Rng): ActionResult<VTState> {
  if (state.phase === 'finished') return fail('Spelet är slut');
  if (state.phase !== 'play') return fail('Ogiltigt drag');
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return fail('Okänd spelare');
  if (isOut(state.players[idx])) return fail('Du är redan ute');
  if (state.current !== idx) return fail('Det är inte din tur');

  const s = structuredClone(state);
  const p = s.players[idx];
  const src = sourceOf(p);
  s.events = [];

  switch (a.type) {
    case 'play': {
      if (src !== 'hand') return fail('Du har inga kort på handen');
      const cards = a.cards;
      if (cards.length === 0) return fail('Välj minst ett kort');
      if (new Set(cards).size !== cards.length) return fail('Ogiltigt drag');
      if (!cards.every((c) => p.hand.includes(c))) return fail('Du har inte det kortet');
      const rank = rankOf(cards[0]);
      if (!cards.every((c) => rankOf(c) === rank)) return fail('Alla kort måste ha samma valör');
      if (!canPlayOn(rank, s.pile)) return fail(tooLow(s.pile));
      p.hand = p.hand.filter((c) => !cards.includes(c));
      s.pile.push(...cards);
      afterPlay(s, idx);
      break;
    }
    case 'playFaceUp': {
      if (src !== 'faceUp') return fail(src === 'hand' ? 'Spela från handen först' : 'Ogiltigt drag');
      const pile = p.faceUp[a.pileIndex];
      if (!pile || pile.length === 0) return fail('Den högen är tom');
      if (!canPlayOn(rankOf(pile[0]), s.pile)) return fail(tooLow(s.pile));
      s.pile.push(...pile);
      p.faceUp[a.pileIndex] = [];
      afterPlay(s, idx);
      break;
    }
    case 'playFaceDown': {
      if (src !== 'faceDown') return fail('Spela dina uppvända kort först');
      const card = p.faceDown[a.index];
      if (card === undefined || card === null) return fail('Den platsen är tom');
      p.faceDown[a.index] = null;
      const success = canPlayOn(rankOf(card), s.pile);
      s.events.push({ type: 'faceDown', playerId, card, success });
      if (success) {
        s.pile.push(card);
        afterPlay(s, idx);
      } else {
        takePile(s, idx, [card]);
      }
      break;
    }
    case 'chance': {
      if (!canChance(state, playerId)) {
        return fail(state.deck.length === 0 ? 'Dragbunten är tom' : 'Du kan bara chansa när du inte kan lägga');
      }
      const card = s.deck.shift()!;
      const success = canPlayOn(rankOf(card), s.pile);
      s.events.push({ type: 'chance', playerId, card, success });
      if (success) {
        s.pile.push(card);
        afterPlay(s, idx);
      } else {
        takePile(s, idx, [card]);
      }
      break;
    }
    case 'pickUp': {
      if (!canPickUp(state, playerId)) {
        return fail(state.pile.length === 0 ? 'Högen är tom' : 'Du har ett kort som går att lägga');
      }
      s.events.push({ type: 'pickUp', playerId, count: s.pile.length });
      takePile(s, idx, []);
      break;
    }
    default:
      return fail('Ogiltigt drag');
  }
  return { ok: true, state: s };
}

export function vtResult(s: VTState): GameResult | null {
  if (s.phase !== 'finished') return null;
  return { placements: [...s.finishOrder], loserId: s.finishOrder[s.finishOrder.length - 1] };
}
