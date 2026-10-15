import { expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import { applyPlayAction } from './play';
import { testState } from './testing';
import type { VTAction, VTState } from './state';

const rng = seededRng(1);
const act = (s: VTState, a: VTAction, who = 'p0') => applyPlayAction(s, who, a, rng);
function ok(r: ReturnType<typeof applyPlayAction>): VTState {
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
// A filler player so the game does not end when someone goes out.
const other = { hand: ['3S', '3D', '3C'] };

test('lägger ett kort som är högre och går vidare till nästa spelare', () => {
  const s = testState({ pile: ['9D'], deck: ['6H'], players: [{ hand: ['KS', '4C', '5C'] }, other] });
  const n = ok(act(s, { type: 'play', cards: ['KS'] }));
  expect(n.pile.at(-1)).toBe('KS');
  expect(n.players[0].hand).toEqual(['4C', '5C', '6H']);
  expect(n.deck).toEqual([]);
  expect(n.current).toBe(1);
});

test('nekas vid lägre kort och läget är oförändrat', () => {
  const s = testState({ pile: ['9D'], players: [{ hand: ['KS', '4C', '5C'] }, other] });
  const before = structuredClone(s);
  const r = act(s, { type: 'play', cards: ['4C'] });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toContain('9');
  expect(s).toEqual(before);
});

test('flera av samma valör, frivilligt antal', () => {
  const s = testState({ pile: ['9D'], players: [{ hand: ['KS', 'KD', 'KH'] }, other] });
  const one = ok(act(s, { type: 'play', cards: ['KS'] }));
  expect(one.players[0].hand).toEqual(['KD', 'KH']);
  const two = ok(act(s, { type: 'play', cards: ['KS', 'KD'] }));
  expect(two.pile).toEqual(['9D', 'KS', 'KD']);
  expect(two.players[0].hand).toEqual(['KH']);
});

test('nekas: blandade valörer, kort som inte finns, samma kort två gånger, tom lista', () => {
  const s = testState({ pile: ['9D'], players: [{ hand: ['KS', 'QD', 'KH'] }, other] });
  expect(act(s, { type: 'play', cards: ['KS', 'QD'] }).ok).toBe(false);
  expect(act(s, { type: 'play', cards: ['AS'] }).ok).toBe(false);
  expect(act(s, { type: 'play', cards: ['KS', 'KS'] }).ok).toBe(false);
  expect(act(s, { type: 'play', cards: [] }).ok).toBe(false);
});

test('nekas när det inte är spelarens tur', () => {
  const s = testState({ pile: ['9D'], players: [{ hand: ['KS'] }, { hand: ['AS'] }] });
  expect(act(s, { type: 'play', cards: ['AS'] }, 'p1').ok).toBe(false);
});

test('nekas när källan inte är handen', () => {
  const s = testState({ pile: ['9D'], players: [{ hand: [], faceUp: [['KS'], [], []] }, other] });
  expect(act(s, { type: 'play', cards: ['KS'] }).ok).toBe(false);
});

test('nekas i bytesfasen', () => {
  const s = testState({ phase: 'swap', players: [{ hand: ['KS'] }, other] });
  expect(act(s, { type: 'play', cards: ['KS'] }).ok).toBe(false);
});

test('2:an går på ess, och nästa spelare får lägga 3', () => {
  const s = testState({ pile: ['AS'], players: [{ hand: ['2H', '4C'] }, { hand: ['3C', '5D'] }] });
  const a = ok(act(s, { type: 'play', cards: ['2H'] }));
  expect(a.current).toBe(1);
  const b = ok(act(a, { type: 'play', cards: ['3C'] }, 'p1'));
  expect(b.pile.at(-1)).toBe('3C');
});

test('10:an vänder högen och samma spelare lägger igen', () => {
  const s = testState({ pile: ['AS', 'KD'], players: [{ hand: ['10H', '4C'] }, other] });
  const n = ok(act(s, { type: 'play', cards: ['10H'] }));
  expect(n.pile).toEqual([]);
  expect(n.burnedCount).toBe(3);
  expect(n.current).toBe(0);
  expect(n.events).toContainEqual({ type: 'burn', playerId: 'p0' });
});

test('fyra lika över flera drag vänder högen', () => {
  const s = testState({ pile: ['7S', '7D', '7H'], players: [{ hand: ['7C', '4C'] }, other] });
  const n = ok(act(s, { type: 'play', cards: ['7C'] }));
  expect(n.pile).toEqual([]);
  expect(n.current).toBe(0);
});

test('fyra lika i ett drag', () => {
  const s = testState({ pile: ['5S'], players: [{ hand: ['8S', '8D', '8H', '8C', '4C'] }, other] });
  const n = ok(act(s, { type: 'play', cards: ['8S', '8D', '8H', '8C'] }));
  expect(n.pile).toEqual([]);
  expect(n.burnedCount).toBe(5);
});

test('fyra lika med 2:or vänder', () => {
  const s = testState({ pile: ['2S', '2D', '2H'], players: [{ hand: ['2C', '4C'] }, other] });
  expect(ok(act(s, { type: 'play', cards: ['2C'] })).pile).toEqual([]);
});

test('tre lika vänder inte', () => {
  const s = testState({ pile: ['7S', '7D'], players: [{ hand: ['7C', '4C'] }, other] });
  const n = ok(act(s, { type: 'play', cards: ['7C'] }));
  expect(n.pile).toHaveLength(3);
  expect(n.current).toBe(1);
});

test('påfyllning när dragbunten tar slut', () => {
  const s = testState({ pile: ['9D'], deck: [], players: [{ hand: ['KS', '4C', '5C'] }, other] });
  expect(ok(act(s, { type: 'play', cards: ['KS'] })).players[0].hand).toHaveLength(2);
});

test('påfyllning sker före omspel efter vändning', () => {
  const s = testState({ pile: ['9D'], deck: ['6H', '7H'], players: [{ hand: ['10H', '4C', '5C'] }, other] });
  const n = ok(act(s, { type: 'play', cards: ['10H'] }));
  expect(n.players[0].hand).toEqual(['4C', '5C', '6H']);
  expect(n.current).toBe(0);
});

test('turordningen hoppar över spelare som är ute', () => {
  const s = testState({
    pile: ['9D'],
    finishOrder: ['p1'],
    players: [{ hand: ['KS', '4C'] }, {}, { hand: ['AS'] }],
  });
  expect(ok(act(s, { type: 'play', cards: ['KS'] })).current).toBe(2);
});

test('turordningen går runt till början', () => {
  const s = testState({ pile: ['9D'], current: 1, players: [{ hand: ['AS'] }, { hand: ['KS', '4C'] }] });
  expect(ok(act(s, { type: 'play', cards: ['KS'] }, 'p1')).current).toBe(0);
});
