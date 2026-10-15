import type { Rng } from '../../shared/rng';
import { shuffle } from '../../shared/rng';
import type { ActionResult } from '../types';
import { isSpecial, makeDeck, rankOf, suitOf, value } from './cards';
import type { VTAction, VTPlayer, VTState } from './state';

export const HAND_SIZE = 3;

export function deal(playerIds: string[], rng: Rng): VTState {
  const deck = shuffle(makeDeck(), rng);
  const players: VTPlayer[] = playerIds.map((id) => ({
    id,
    faceDown: deck.splice(0, 3),
    faceUp: deck.splice(0, 3).map((c) => [c]),
    hand: deck.splice(0, HAND_SIZE),
    ready: false,
  }));
  return { phase: 'swap', players, deck, pile: [], burnedCount: 0, current: 0, finishOrder: [], events: [] };
}

/** Fyller på handen till 3 kort från dragbunten, så länge den räcker. Muterar. */
export function refill(s: VTState, p: VTPlayer): void {
  while (p.hand.length < HAND_SIZE && s.deck.length > 0) p.hand.push(s.deck.shift()!);
}

const fail = (error: string) => ({ ok: false as const, error });

export function applySwapAction(state: VTState, playerId: string, a: VTAction, rng: Rng): ActionResult<VTState> {
  if (state.phase !== 'swap') return fail('Bytesfasen är slut');
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return fail('Okänd spelare');
  if (state.players[idx].ready) return fail('Du har redan tryckt Klar');

  const s = structuredClone(state);
  const p = s.players[idx];
  s.events = [];

  switch (a.type) {
    case 'swap':
    case 'stack': {
      const pile = p.faceUp[a.pileIndex];
      const h = p.hand.indexOf(a.handCard);
      if (!pile || h < 0) return fail('Ogiltigt drag');
      if (a.type === 'swap') {
        // Byter man mot en staplad hög tar man upp alla kort i högen.
        if (pile.length === 0) return fail('Den högen är tom');
        p.hand.splice(h, 1, ...pile);
        p.faceUp[a.pileIndex] = [a.handCard];
      } else {
        if (pile.length === 0 || rankOf(pile[0]) !== rankOf(a.handCard)) {
          return fail('Du kan bara stapla kort av samma valör');
        }
        p.hand.splice(h, 1);
        pile.push(a.handCard);
        // Dra direkt så att handen har 3 kort igen och det nya kortet också kan bytas.
        refill(s, p);
      }
      break;
    }
    case 'unstack': {
      const pile = p.faceUp[a.pileIndex];
      if (!pile || pile.length < 2) return fail('Varje hög måste ha minst ett kort');
      p.hand.push(pile.pop()!);
      break;
    }
    case 'ready': {
      refill(s, p);
      p.ready = true;
      if (s.players.every((pl) => pl.ready)) {
        s.phase = 'play';
        s.current = startingPlayer(s.players, rng);
      }
      break;
    }
    default:
      return fail('Bytesfasen pågår – tryck Klar först');
  }
  return { ok: true, state: s };
}

/**
 * Lägsta normala kortet (2:or och 10:or räknas inte) börjar. Vid lika:
 * hjärter av valören, sedan flest av valören, sedan slumpen.
 */
export function startingPlayer(players: VTPlayer[], rng: Rng): number {
  const lowest = players.map((p) => {
    const vals = p.hand.map(rankOf).filter((r) => !isSpecial(r)).map(value);
    return vals.length ? Math.min(...vals) : Infinity;
  });
  const min = Math.min(...lowest);
  const pick = (cands: number[]) => (cands.length === 1 ? cands[0] : cands[Math.floor(rng() * cands.length)]);

  if (min === Infinity) return pick(players.map((_, i) => i));

  let cands = players.map((_, i) => i).filter((i) => lowest[i] === min);
  if (cands.length === 1) return cands[0];

  const ofMin = (i: number) => players[i].hand.filter((c) => !isSpecial(rankOf(c)) && value(rankOf(c)) === min);
  const withHeart = cands.filter((i) => ofMin(i).some((c) => suitOf(c) === 'H'));
  if (withHeart.length === 1) return withHeart[0];

  const max = Math.max(...cands.map((i) => ofMin(i).length));
  cands = cands.filter((i) => ofMin(i).length === max);
  return pick(cands);
}
