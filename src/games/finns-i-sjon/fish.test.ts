import { expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import type { CardId, Rank } from '../vand-tian/cards';
import { applyFishAction } from './play';
import { setup } from './setup';
import type { FishAction, FishState } from './state';
import { finnsISjon } from './index';
import { fishResult } from './play';
import { viewFor } from './view';

const rng = seededRng(1);
const top: Rng = () => 0.99; // ger inget särskilt; används bara för att skicka in en rng

type Rng = () => number;

function st(hands: CardId[][], pile: CardId[] = [], over: Partial<FishState> = {}): FishState {
  return {
    phase: 'play',
    players: hands.map((hand, i) => ({ id: 'p' + i, hand: [...hand], books: [] })),
    pile: [...pile],
    current: 0,
    events: [],
    ...over,
  };
}

function ask(s: FishState, id: string, targetId: string, rank: Rank) {
  return applyFishAction(s, id, { type: 'ask', targetId, rank } as FishAction, rng);
}

function ok(r: ReturnType<typeof ask>): FishState {
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

test('två spelare får 7 kort, fler får 5, och resten blir sjön', () => {
  const two = setup(['a', 'b'], seededRng(3));
  expect(two.players.map((p) => p.hand.length + p.books.length * 4)).toEqual([7, 7]);
  const five = setup(['a', 'b', 'c', 'd', 'e'], seededRng(3));
  expect(five.players.every((p) => p.hand.length === 5)).toBe(true);
  expect(five.pile.length + five.players.reduce((n, p) => n + p.hand.length + p.books.length * 4, 0)).toBe(52);
});

test('träff: motspelarens kort av valören byter ägare och turen stannar', () => {
  const s = ok(ask(st([['KH', '4C'], ['KS', 'KD', '9H']], ['2D']), 'p0', 'p1', 'K'));
  expect(s.players[0].hand).toEqual(expect.arrayContaining(['KH', '4C', 'KS', 'KD']));
  expect(s.players[1].hand).toEqual(['9H']);
  expect(s.current).toBe(0);
  expect(s.events).toContainEqual({ type: 'ask', playerId: 'p0', targetId: 'p1', rank: 'K', hits: 2 });
});

test('miss med annan valör: kortet dras och turen går vidare', () => {
  const s = ok(ask(st([['KH', '4C'], ['9H']], ['2D', '5S']), 'p0', 'p1', 'K'));
  expect(s.players[0].hand).toContain('2D');
  expect(s.pile).toEqual(['5S']);
  expect(s.current).toBe(1);
  expect(s.events).toContainEqual({ type: 'fish', playerId: 'p0', shown: null });
});

test('miss med samma valör som frågan: kortet visas och turen stannar', () => {
  const s = ok(ask(st([['KH', '4C'], ['9H']], ['KC', '5S']), 'p0', 'p1', 'K'));
  expect(s.players[0].hand).toContain('KC');
  expect(s.current).toBe(0);
  expect(s.events).toContainEqual({ type: 'fish', playerId: 'p0', shown: 'KC' });
});

test('att fråga utan egen valör nekas', () => {
  const r = ask(st([['KH'], ['9H']], ['2D']), 'p0', 'p1', '9');
  expect(r.ok).toBe(false);
});

test('fel tur, fråga sig själv och okänd motspelare nekas', () => {
  const s = st([['KH'], ['9H']], ['2D']);
  expect(ask(s, 'p1', 'p0', '9').ok).toBe(false);
  expect(ask(s, 'p0', 'p0', 'K').ok).toBe(false);
  expect(ask(s, 'p0', 'x', 'K').ok).toBe(false);
});

test('fyrtal läggs ut direkt och ger en poäng', () => {
  const s = ok(ask(st([['7H', '7D', '7C', '3S'], ['7S', '2H']], ['2D']), 'p0', 'p1', '7'));
  expect(s.players[0].books).toEqual(['7']);
  expect(s.players[0].hand).toEqual(['3S']);
  expect(s.events).toContainEqual({ type: 'book', playerId: 'p0', rank: '7' });
});

test('en spelare med tom hand drar ett kort från sjön direkt', () => {
  const s = ok(ask(st([['KH', '4C'], ['KS']], ['2D', '8C']), 'p0', 'p1', 'K'));
  expect(s.players[1].hand).toEqual(['2D']);
  expect(s.pile).toEqual(['8C']);
});

test('spelet tar slut när alla 13 fyrtal är lagda, och placeringen följer fyrtalen', () => {
  const s = st([['2H'], ['5H']], [], { players: [
    { id: 'p0', hand: ['2H'], books: ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'] as Rank[] },
    { id: 'p1', hand: ['5H'], books: [] },
  ] });
  const r = applyFishAction({ ...s, players: [{ id: 'p0', hand: ['2H'], books: [] }, { id: 'p1', hand: ['2C', '2D', '2S'], books: [] }] }, 'p0', { type: 'ask', targetId: 'p1', rank: '2' }, rng);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.state.phase).toBe('finished');
});

test('placeringen sorteras efter antal fyrtal, förloraren har minst', () => {
  const s = st([[], [], []], [], { phase: 'finished', players: [
    { id: 'a', hand: [], books: ['A'] as Rank[] },
    { id: 'b', hand: [], books: ['K', 'Q'] as Rank[] },
    { id: 'c', hand: [], books: [] },
  ] });
  expect(fishResult(s)).toEqual({ placements: ['b', 'a', 'c'], loserId: 'c' });
});

test('vyn visar bara mina kort och vilka valörer jag kan fråga efter', () => {
  const s = st([['KH', '4C', 'KD'], ['9H', '2S']], ['2D']);
  const v = viewFor(s, 'p0');
  expect(v.myHand).toEqual(['KH', '4C', 'KD']);
  expect(v.askable).toEqual(['K', '4']); // min tur: valörer jag har
  expect(viewFor(s, 'p1').askable).toEqual([]);
  expect(viewFor(s, 'p1').myHand).toEqual(['9H', '2S']);
  expect(viewFor(s, 'p0').players[1].handCount).toBe(2);
  expect(finnsISjon.applyAction(s, 'p0', { type: 'ask', targetId: 'p1', rank: 'K' } as never, top).ok).toBe(true);
});

test.each([2, 3, 4, 5].flatMap((n) => [1, 2, 3, 4, 5].map((seed) => [n, seed])))(
  'ett slumpat parti med %i spelare (seed %i) tar slut',
  (n, seed) => {
    const r = seededRng(seed);
    let s = setup(Array.from({ length: n }, (_, i) => 'p' + i), r);
    for (let moves = 0; moves < 5000 && s.phase !== 'finished'; moves++) {
      const me = s.players[s.current];
      const ranks = [...new Set(me.hand.map((c) => c.slice(0, -1) as Rank))];
      const rank = ranks[Math.floor(r() * ranks.length)];
      const others = s.players.filter((p) => p.id !== me.id);
      const target = others[Math.floor(r() * others.length)];
      const res = applyFishAction(s, me.id, { type: 'ask', targetId: target.id, rank }, r);
      if (!res.ok) throw new Error(res.error);
      s = res.state;
    }
    expect(s.phase).toBe('finished');
    const total = s.players.reduce((k, p) => k + p.books.length, 0);
    expect(total).toBe(13);
  },
);
