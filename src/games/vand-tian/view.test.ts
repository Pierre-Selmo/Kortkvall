import { expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import { canPlayOn, rankOf } from './cards';
import { vandTian } from './index';
import { testState } from './testing';
import { viewFor } from './view';
import type { VTAction, VTState } from './state';

const rng = seededRng(1);

test('viewFor läcker inte andras hand, nedvända kort eller dragbunten', () => {
  const s = testState({
    pile: ['9D'],
    deck: ['2C', '3C'],
    players: [
      { hand: ['KS', '4C'], faceUp: [['5H'], [], []], faceDown: ['6H', null, null] },
      { hand: ['AS', 'QD'], faceUp: [['7S'], [], []], faceDown: ['8S', 'JC', null] },
    ],
  });
  const json = JSON.stringify(viewFor(s, 'p0'));
  for (const hidden of ['AS', 'QD', '8S', 'JC', '6H', '2C', '3C']) expect(json).not.toContain(`"${hidden}"`);
  expect(json).toContain('"7S"');
});

test('viewFor visar mina kort och motståndarnas antal', () => {
  const s = testState({ pile: ['9D'], deck: ['2C'], players: [{ hand: ['KS', '4C'] }, { hand: ['AS', 'QD', 'JD'], faceDown: ['8S', null, '3D'] }] });
  const v = viewFor(s, 'p0');
  expect(v.myHand).toEqual(['KS', '4C']);
  expect(v.players[1].handCount).toBe(3);
  expect(v.players[1].faceDown).toEqual([true, false, true]);
  expect(v.deckCount).toBe(1);
  expect(v.pileCount).toBe(1);
  expect(v.currentPlayerId).toBe('p0');
});

test('pileTop visar högst de 4 översta korten', () => {
  const s = testState({ pile: ['3C', '4C', '5C', '6C', '7C', '8C'], players: [{ hand: ['KS'] }, {}] });
  expect(viewFor(s, 'p0').pileTop).toEqual(['5C', '6C', '7C', '8C']);
});

test('canChance och canPickUp syns bara för spelaren vars tur det är', () => {
  const s = testState({ pile: ['AD'], deck: ['5S'], players: [{ hand: ['4C'] }, { hand: ['3C'] }] });
  expect(viewFor(s, 'p0').canChance).toBe(true);
  expect(viewFor(s, 'p0').canPickUp).toBe(true);
  expect(viewFor(s, 'p1').canChance).toBe(false);
  expect(viewFor(s, 'p1').canPickUp).toBe(false);
});

test('place sätts för spelare som har gått ut', () => {
  const s = testState({ finishOrder: ['p1'], current: 0, pile: ['9D'], players: [{ hand: ['KS'] }, {}, { hand: ['3C'] }] });
  expect(viewFor(s, 'p0').players.map((p) => p.place)).toEqual([null, 1, null]);
});

test('currentPlayerId är null i bytesfasen', () => {
  const s = testState({ phase: 'swap', players: [{ hand: ['KS'] }, {}] });
  expect(viewFor(s, 'p0').currentPlayerId).toBeNull();
});

test('vandTian.applyAction med skräpindata kastar inte', () => {
  const s = vandTian.setup(['a', 'b'], rng);
  for (const junk of [null, 42, 'play', {}, { type: 'fly' }, { type: 'play', cards: 'KS' }, { type: 'play', cards: [1] }, { type: 'swap', handCard: 'KS' }, { type: 'playFaceDown', index: '0' }]) {
    const r = vandTian.applyAction(s, 'a', junk as unknown as VTAction, rng);
    expect(r.ok).toBe(false);
  }
});

test('vandTian har rätt metadata', () => {
  expect(vandTian.id).toBe('vand-tian');
  expect(vandTian.name).toBe('Vänd tian');
  expect([vandTian.minPlayers, vandTian.maxPlayers]).toEqual([2, 5]);
});

/** Picks a random legal move (a fixed strategy can cycle forever between two players; random play terminates). */
function randomLegal(s: VTState, r: () => number): { pid: string; a: VTAction } {
  const p = s.players[s.current];
  const v = viewFor(s, p.id);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(r() * xs.length)];
  if (v.mySource === 'hand') {
    const ranks = [...new Set(p.hand.filter((c) => canPlayOn(rankOf(c), s.pile)).map(rankOf))];
    if (ranks.length) {
      const rank = pick(ranks);
      const same = p.hand.filter((c) => rankOf(c) === rank);
      return { pid: p.id, a: { type: 'play', cards: same.slice(0, 1 + Math.floor(r() * same.length)) } };
    }
    return { pid: p.id, a: v.canChance && r() < 0.5 ? { type: 'chance' } : { type: 'pickUp' } };
  }
  if (v.mySource === 'faceUp') {
    const ok = [0, 1, 2].filter((i) => p.faceUp[i].length && canPlayOn(rankOf(p.faceUp[i][0]), s.pile));
    return { pid: p.id, a: ok.length ? { type: 'playFaceUp', pileIndex: pick(ok) } : { type: 'pickUp' } };
  }
  return { pid: p.id, a: { type: 'playFaceDown', index: pick([0, 1, 2].filter((i) => p.faceDown[i] !== null)) } };
}

test('slumpade partier med 2–5 spelare tar slut', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const r = seededRng(seed);
    const ids = ['a', 'b', 'c', 'd', 'e'].slice(0, 2 + (seed % 4));
    let s = vandTian.setup(ids, r);
    for (const id of ids) {
      const res = vandTian.applyAction(s, id, { type: 'ready' }, r);
      if (!res.ok) throw new Error(res.error);
      s = res.state;
    }
    let moves = 0;
    while (!vandTian.result(s) && moves < 20000) {
      const { pid, a } = randomLegal(s, r);
      const res = vandTian.applyAction(s, pid, a, r);
      if (!res.ok) throw new Error(`${res.error} (${JSON.stringify(a)})`);
      s = res.state;
      moves++;
    }
    const result = vandTian.result(s);
    expect(result, `seed ${seed}`).not.toBeNull();
    expect(result!.placements).toHaveLength(ids.length);
    expect(new Set(result!.placements).size).toBe(ids.length);
  }
});
