import { expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import type { CardId, Suit } from '../vand-tian/cards';
import { applySolitaireAction } from './play';
import { setup } from './setup';
import type { SolAction, SolState } from './state';
import { solitaire } from './index';
import { viewFor } from './view';

const rng = seededRng(1);

const emptyColumns = (n: number) => Array.from({ length: n }, () => ({ down: [] as CardId[], up: [] as CardId[] }));

function st(over: Partial<SolState> = {}): SolState {
  const base: SolState = {
    phase: 'play',
    won: false,
    playerId: 'p0',
    stock: [],
    waste: [],
    foundations: { S: [], H: [], D: [], C: [] },
    tableau: emptyColumns(7),
  };
  return { ...base, ...over };
}

function act(s: SolState, a: SolAction): SolState {
  const r = applySolitaireAction(s, 'p0', a, rng);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function tryAct(s: SolState, a: SolAction) {
  return applySolitaireAction(s, 'p0', a, rng);
}

test('utdelningen ger 1–7 kort i kolumnerna med översta öppet, och 24 kort i talongen', () => {
  const s = setup(['p0'], seededRng(7));
  expect(s.tableau.map((c) => c.down.length)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(s.tableau.every((c) => c.up.length === 1)).toBe(true);
  expect(s.stock).toHaveLength(24);
  const all = [...s.stock, ...s.tableau.flatMap((c) => [...c.down, ...c.up])];
  expect(new Set(all).size).toBe(52);
});

test('dra tar översta kortet från talongen till skräphögen', () => {
  const s = act(st({ stock: ['5H', '9C'] }), { type: 'draw' });
  expect(s.waste).toEqual(['5H']);
  expect(s.stock).toEqual(['9C']);
});

test('när talongen är tom vänds skräphögen tillbaka i samma ordning', () => {
  const s = act(st({ waste: ['2H', '7S'] }), { type: 'draw' });
  expect(s.stock).toEqual(['2H', '7S']);
  expect(s.waste).toEqual([]);
  expect(act(s, { type: 'draw' }).waste).toEqual(['2H']);
});

test('röd på svart en valör högre går, samma färg går inte', () => {
  const s = st({ waste: ['6H'], tableau: [{ down: [], up: ['7S'] }, ...emptyColumns(6)] });
  expect(act(s, { type: 'move', from: { kind: 'waste' }, to: { kind: 'tableau', col: 0 } }).tableau[0].up).toEqual(['7S', '6H']);
  expect(tryAct({ ...s, waste: ['6S'] }, { type: 'move', from: { kind: 'waste' }, to: { kind: 'tableau', col: 0 } }).ok).toBe(false);
});

test('bara en kung får läggas i en tom kolumn', () => {
  const s = st({ waste: ['QH'], tableau: emptyColumns(7) });
  expect(tryAct(s, { type: 'move', from: { kind: 'waste' }, to: { kind: 'tableau', col: 2 } }).ok).toBe(false);
  const k = st({ waste: ['KC'], tableau: emptyColumns(7) });
  expect(act(k, { type: 'move', from: { kind: 'waste' }, to: { kind: 'tableau', col: 2 } }).tableau[2].up).toEqual(['KC']);
});

test('en sekvens flyttas som en enhet och det dolda kortet under vänds upp', () => {
  const s = st({ tableau: [
    { down: ['3D'], up: ['9H', '8S', '7D'] },
    { down: [], up: ['10C'] },
    ...emptyColumns(5),
  ] });
  const r = act(s, { type: 'move', from: { kind: 'tableau', col: 0, count: 3 }, to: { kind: 'tableau', col: 1 } });
  expect(r.tableau[1].up).toEqual(['10C', '9H', '8S', '7D']);
  expect(r.tableau[0].up).toEqual(['3D']);
});

test('en ogiltig sekvens nekas', () => {
  const s = st({ tableau: [{ down: [], up: ['9H', '9S'] }, ...emptyColumns(6)] });
  expect(tryAct(s, { type: 'move', from: { kind: 'tableau', col: 0, count: 2 }, to: { kind: 'tableau', col: 1 } }).ok).toBe(false);
});

test('ess startar en basruta och kort byggs uppåt i samma färg', () => {
  let s = st({ waste: ['AS'], stock: ['2S'] });
  s = act(s, { type: 'move', from: { kind: 'waste' }, to: { kind: 'foundation', suit: 'S' } });
  expect(s.foundations.S).toEqual(['AS']);
  s = act(s, { type: 'draw' });
  s = act(s, { type: 'move', from: { kind: 'waste' }, to: { kind: 'foundation', suit: 'S' } });
  expect(s.foundations.S).toEqual(['AS', '2S']);
  expect(tryAct(st({ waste: ['2H'] }), { type: 'move', from: { kind: 'waste' }, to: { kind: 'foundation', suit: 'S' } }).ok).toBe(false);
});

test('när det öppna kortet lyfts vänds det dolda kortet under upp', () => {
  const s = st({
    tableau: [{ down: ['KD'], up: ['4C'] }, ...emptyColumns(6)],
    foundations: { S: [], H: [], D: [], C: ['AC', '2C', '3C'] },
  });
  const r = act(s, { type: 'move', from: { kind: 'tableau', col: 0, count: 1 }, to: { kind: 'foundation', suit: 'C' } });
  expect(r.tableau[0].up).toEqual(['KD']);
  expect(r.tableau[0].down).toEqual([]);
});

test('alla 52 kort i basrutorna ger vinst', () => {
  const upTo = (suit: Suit, n: number): CardId[] =>
    ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].slice(0, n).map((r) => r + suit);
  const s = st({
    foundations: { S: upTo('S', 12), H: upTo('H', 13), D: upTo('D', 13), C: upTo('C', 13) },
    waste: ['KS'],
  });
  const r = act(s, { type: 'move', from: { kind: 'waste' }, to: { kind: 'foundation', suit: 'S' } });
  expect(r.phase).toBe('finished');
  expect(r.won).toBe(true);
});

test('blockerat läge: inga drag kvar och ingen talong kvar ger slut utan vinst', () => {
  const s = st({ tableau: [{ down: [], up: ['AS'] }, ...emptyColumns(6)] });
  const r = act(s, { type: 'move', from: { kind: 'tableau', col: 0, count: 1 }, to: { kind: 'foundation', suit: 'S' } });
  expect(r.phase).toBe('finished');
  expect(r.won).toBe(false);
});

test('bara spelaren själv kan spela, och inget går efter slut', () => {
  const s = st({ stock: ['2H'] });
  expect(applySolitaireAction(s, 'p1', { type: 'draw' }, rng).ok).toBe(false);
  expect(tryAct({ ...s, phase: 'finished' }, { type: 'draw' }).ok).toBe(false);
});

test('vyn visar talongens antal och bara det översta kortet i skräphögen', () => {
  const v = viewFor(st({ stock: ['2H', '3H'], waste: ['5S', '9D'] }), 'p0');
  expect(v.stockCount).toBe(2);
  expect(v.wasteTop).toBe('9D');
  expect(solitaire.applyAction(st({ stock: ['2H'] }), 'p0', { type: 'draw' }, rng).ok).toBe(true);
});

import { autoTarget } from './rules';

test('auto: ett svart ess går till basrutan, en svart 4 går på en röd 5', () => {
  const b = { tableau: [{ down: [], up: ['5H'] }, ...emptyColumns(6)], foundations: { S: [], H: [], D: [], C: [] }, waste: ['4S'] };
  expect(autoTarget(b, { kind: 'waste' })).toEqual({ kind: 'tableau', col: 0 });
  expect(autoTarget({ ...b, waste: ['AS'] }, { kind: 'waste' })).toEqual({ kind: 'foundation', suit: 'S' });
  expect(autoTarget({ ...b, waste: ['9S'] }, { kind: 'waste' })).toBeNull();
});

test('auto: en kung går inte till en tom kolumn från en annan kolumn', () => {
  const b = { tableau: [{ down: [], up: ['KS'] }, ...emptyColumns(6)], foundations: { S: [], H: [], D: [], C: [] }, waste: [] };
  expect(autoTarget(b, { kind: 'tableau', col: 0, count: 1 })).toBeNull();
});
