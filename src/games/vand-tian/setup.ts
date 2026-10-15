import { shuffle, type Rng } from '../../shared/rng';
import { fail, type ActionResult } from '../types';
import { isSpecial, makeDeck, rankOf, suitOf, value, type CardId } from './cards';
import { refill, type VTAction, type VTPlayer, type VTState } from './state';

export function deal(playerIds: string[], rng: Rng): VTState {
  const deck = shuffle(makeDeck(), rng);
  const players: VTPlayer[] = playerIds.map((id) => {
    const faceDown = deck.splice(0, 3);
    const faceUp = deck.splice(0, 3).map((c) => [c]);
    const hand = deck.splice(0, 3);
    return { id, hand, faceUp, faceDown, ready: false };
  });
  return { phase: 'swap', players, deck, pile: [], burnedCount: 0, current: 0, finishOrder: [], events: [] };
}

function validPile(i: unknown): i is number {
  return Number.isInteger(i) && (i as number) >= 0 && (i as number) < 3;
}

export function applySwapAction(s: VTState, playerId: string, a: VTAction, rng: Rng): ActionResult<VTState> {
  if (s.phase !== 'swap') return fail('Bytesfasen är slut');
  const idx = s.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return fail('Du är inte med i spelet');
  if (s.players[idx].ready) return fail('Du har redan tryckt Klar');

  const n = structuredClone(s);
  n.events = [];
  const p = n.players[idx];

  switch (a.type) {
    case 'swap': {
      if (!validPile(a.pileIndex)) return fail('Ogiltig hög');
      const h = p.hand.indexOf(a.handCard);
      if (h < 0) return fail('Kortet finns inte på din hand');
      const pile = p.faceUp[a.pileIndex];
      if (pile.length !== 1) return fail('Du kan bara byta mot en hög med ett kort');
      [p.hand[h], pile[0]] = [pile[0], p.hand[h]];
      return { ok: true, state: n };
    }
    case 'stack': {
      if (!validPile(a.pileIndex)) return fail('Ogiltig hög');
      const h = p.hand.indexOf(a.handCard);
      if (h < 0) return fail('Kortet finns inte på din hand');
      const pile = p.faceUp[a.pileIndex];
      if (pile.length === 0 || rankOf(pile[0]) !== rankOf(a.handCard)) {
        return fail('Du kan bara stapla kort av samma valör');
      }
      p.hand.splice(h, 1);
      pile.push(a.handCard);
      return { ok: true, state: n };
    }
    case 'unstack': {
      if (!validPile(a.pileIndex)) return fail('Ogiltig hög');
      const pile = p.faceUp[a.pileIndex];
      if (pile.length < 2) return fail('Högen måste ha minst ett kort');
      p.hand.push(pile.pop()!);
      return { ok: true, state: n };
    }
    case 'ready': {
      refill(n, p);
      p.ready = true;
      if (n.players.every((pl) => pl.ready)) {
        n.phase = 'play';
        n.current = startingPlayer(n.players, rng);
      }
      return { ok: true, state: n };
    }
    default:
      return fail('Byt kort eller tryck Klar först');
  }
}

/** Rule 3: lowest normal card starts; ties → hearts, then most of that rank, then random. */
export function startingPlayer(players: VTPlayer[], rng: Rng): number {
  const normal = (p: VTPlayer): CardId[] => p.hand.filter((c) => !isSpecial(rankOf(c)));
  const lowest = (p: VTPlayer): number => Math.min(...normal(p).map((c) => value(rankOf(c))));

  let candidates = players.map((_, i) => i).filter((i) => normal(players[i]).length > 0);
  if (candidates.length === 0) candidates = players.map((_, i) => i);
  else {
    const min = Math.min(...candidates.map((i) => lowest(players[i])));
    candidates = candidates.filter((i) => lowest(players[i]) === min);
    const ofMin = (i: number) => normal(players[i]).filter((c) => value(rankOf(c)) === min);
    const hearts = candidates.filter((i) => ofMin(i).some((c) => suitOf(c) === 'H'));
    if (hearts.length > 0) candidates = hearts;
    else {
      const most = Math.max(...candidates.map((i) => ofMin(i).length));
      candidates = candidates.filter((i) => ofMin(i).length === most);
    }
  }
  return candidates.length === 1 ? candidates[0] : candidates[Math.floor(rng() * candidates.length)];
}
