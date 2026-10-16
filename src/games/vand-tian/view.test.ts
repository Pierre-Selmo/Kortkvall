import { expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import { canPlayOn, isSpecial, rankOf, value, type CardId } from './cards';
import { vandTian } from './index';
import type { VTAction, VTState } from './state';
import { testState } from './testing';
import { canPlayCount } from './legal';
import { viewFor } from './view';

const rng = seededRng(1);

test('viewFor läcker inte andras hand, nedvända kort eller dragbunten', () => {
  const s = vandTian.setup(['p0', 'p1', 'p2'], seededRng(5));
  const json = JSON.stringify(viewFor(s, 'p0'));
  const visible = new Set<CardId>(s.players.flatMap((p) => p.faceUp.flat()));
  const secret = [
    ...s.players.slice(1).flatMap((p) => p.hand),
    ...s.players.flatMap((p) => p.faceDown as CardId[]),
    ...s.deck,
  ].filter((c) => !visible.has(c));
  for (const c of secret) expect(json).not.toMatch(new RegExp(`"${c}"`));
});

test('viewFor visar mina kort och motståndarnas antal', () => {
  const s = testState({ players: [{ hand: ['KS', '4C'] }, { hand: ['3D', '4D', '5D', '6D'] }] });
  const v = viewFor(s, 'p0');
  expect(v.myHand).toEqual(['KS', '4C']);
  expect(v.players[1].handCount).toBe(4);
  expect(v.currentPlayerId).toBe('p0');
  expect(v.mySource).toBe('hand');
});

test('canChance och canPickUp syns bara för spelaren vars tur det är', () => {
  const s = testState({ pile: ['AS'], deck: ['4H'], players: [{ hand: ['4C'] }, { hand: ['3D'] }] });
  expect(viewFor(s, 'p0')).toMatchObject({ canChance: true, canPickUp: true });
  expect(viewFor(s, 'p1')).toMatchObject({ canChance: false, canPickUp: false });
});

test('placering syns för den som har gått ut', () => {
  const s = testState({ finishOrder: ['p1'], players: [{ hand: ['4C'] }, {}, { hand: ['3D'] }] });
  expect(viewFor(s, 'p0').players.map((p) => p.place)).toEqual([null, 1, null]);
});

test('vandTian.applyAction med skräpindata', () => {
  const s = testState({ players: [{ hand: ['KS'] }, { hand: ['3D'] }] });
  for (const junk of [null, 'play', 7, { type: 'fly' }, { type: 'play', cards: 'KS' }, { type: 'play', cards: [1] }, { type: 'playFaceUp', pileIndex: '0' }]) {
    expect(() => vandTian.applyAction(s, 'p0', junk as unknown as VTAction, rng)).not.toThrow();
    expect(vandTian.applyAction(s, 'p0', junk as unknown as VTAction, rng).ok).toBe(false);
  }
});

function firstLegal(s: VTState, pick: () => number = () => 0.99): { who: string; a: VTAction } {
  const v = viewFor(s, s.players[s.current].id);
  const who = v.currentPlayerId!;
  if (v.mySource === 'hand') {
    // Spara 2:or och 10:or till sist.
    const cost = (c: CardId) => (isSpecial(rankOf(c)) ? 100 + value(rankOf(c)) : value(rankOf(c)));
    const playable = v.myHand.filter((c) => canPlayOn(rankOf(c), s.pile)).sort((a, b) => cost(a) - cost(b));
    if (playable.length) {
      const r = rankOf(playable[0]);
      const same = v.myHand.filter((c) => rankOf(c) === r);
      // Variera antalet lite, annars kan robotarna gå i cirkel för evigt.
      return { who, a: { type: 'play', cards: same.slice(0, 1 + Math.floor(pick() * same.length)) } };
    }
    const four = v.myHand.find((c) => v.myHand.filter((d) => rankOf(d) === rankOf(c)).length >= 4);
    if (four) return { who, a: { type: 'play', cards: v.myHand.filter((c) => rankOf(c) === rankOf(four)) } };
    return { who, a: { type: 'pickUp' } };
  }
  const me = v.players.find((p) => p.id === who)!;
  if (v.mySource === 'faceUp') {
    const i = me.faceUp.findIndex((f) => f.length > 0 && canPlayCount(rankOf(f[0]), f.length, s.pile));
    return { who, a: i >= 0 ? { type: 'playFaceUp', pileIndex: i } : { type: 'pickUp' } };
  }
  return { who, a: { type: 'playFaceDown', index: me.faceDown.indexOf(true) } };
}


test.each([2, 3, 4, 5].flatMap((n) => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => [n, seed])))(
  'ett helt slumpat parti med %i spelare (seed %i) tar slut',
  (n, seed) => {
    const r = seededRng(seed);
    const ids = ['a', 'b', 'c', 'd', 'e'].slice(0, n);
    let s = vandTian.setup(ids, r);
    for (const id of ids) {
      const res = vandTian.applyAction(s, id, { type: 'ready' }, r);
      if (!res.ok) throw new Error(res.error);
      s = res.state;
    }
    let moves = 0;
    while (!vandTian.result(s) && moves < 5000) {
      const { who, a } = firstLegal(s, r);
      const res = vandTian.applyAction(s, who, a, r);
      if (!res.ok) throw new Error(`${res.error} (${JSON.stringify(a)})`);
      s = res.state;
      moves++;
    }
    const result = vandTian.result(s);
    expect(result).not.toBeNull();
    expect(result!.placements).toHaveLength(n);
    expect(new Set(result!.placements).size).toBe(n);
  },
);
