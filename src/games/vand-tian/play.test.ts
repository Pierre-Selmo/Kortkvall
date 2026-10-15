import { expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import { applyPlayAction } from './play';
import type { VTAction, VTState } from './state';
import { testState } from './testing';

const rng = seededRng(1);
const other = { hand: ['3D', '4D', '5D'] };

function act(s: VTState, a: VTAction, who = s.players[s.current].id): VTState {
  const r = applyPlayAction(s, who, a, rng);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
const play = (...cards: string[]): VTAction => ({ type: 'play', cards });

test('lägger ett kort som är högre och går vidare till nästa spelare', () => {
  const s = act(testState({ pile: ['9D'], deck: ['6H'], players: [{ hand: ['KS', '4C', '5C'] }, other] }), play('KS'));
  expect(s.pile.at(-1)).toBe('KS');
  expect(s.players[0].hand).toEqual(['4C', '5C', '6H']);
  expect(s.current).toBe(1);
});

test('nekas vid lägre kort och läget är oförändrat', () => {
  const s = testState({ pile: ['9D'], players: [{ hand: ['KS', '4C', '5C'] }, other] });
  const before = structuredClone(s);
  const r = applyPlayAction(s, 'p0', play('4C'), rng);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toContain('9');
  expect(s).toEqual(before);
});

test('flera av samma valör, frivilligt antal', () => {
  const s = testState({ pile: ['9D'], players: [{ hand: ['KS', 'KD', 'KH'] }, other] });
  expect(act(s, play('KS')).players[0].hand).toEqual(['KD', 'KH']);
  const two = act(s, play('KS', 'KD'));
  expect(two.pile).toEqual(['9D', 'KS', 'KD']);
  expect(two.players[0].hand).toEqual(['KH']);
});

test('nekas: blandade valörer, kort som inte finns på handen, samma kort två gånger, tom lista', () => {
  const s = testState({ pile: ['3D'], players: [{ hand: ['KS', 'KD', 'QH'] }, other] });
  for (const a of [play('KS', 'QH'), play('AS'), play('KS', 'KS'), play()]) {
    expect(applyPlayAction(s, 'p0', a, rng).ok).toBe(false);
  }
});

test('nekas när det inte är spelarens tur', () => {
  const s = testState({ players: [{ hand: ['KS'] }, other] });
  expect(applyPlayAction(s, 'p1', play('3D'), rng)).toEqual({ ok: false, error: 'Det är inte din tur' });
});

test('nekas när källan inte är handen', () => {
  const s = testState({ players: [{ hand: [], faceUp: [['KS'], [], []] }, other] });
  expect(applyPlayAction(s, 'p0', play('KS'), rng).ok).toBe(false);
});

test('2:an går på ess, och samma spelare lägger igen och får lägga 3', () => {
  let s = testState({ pile: ['AS'], deck: ['9H'], players: [{ hand: ['2H', '3C', '4C'] }, other] });
  s = act(s, play('2H'));
  expect(s.current).toBe(0);
  expect(s.players[0].hand).toHaveLength(3); // påfyllning före omspel
  expect(s.pile).toEqual(['AS', '2H']);
  s = act(s, play('3C'));
  expect(s.pile.at(-1)).toBe('3C');
  expect(s.current).toBe(1);
});

test('2:an som chansas fram ger också en tur till', () => {
  const s = act(testState({ pile: ['AS'], deck: ['2D', '5H'], players: [{ hand: ['4C', '5C', '6C'] }, other] }), { type: 'chance' });
  expect(s.pile.at(-1)).toBe('2D');
  expect(s.current).toBe(0);
});

test('går ut med en 2:a och turen går vidare', () => {
  const s = act(testState({ pile: ['AS'], players: [{ hand: ['2H'] }, other, other] }), play('2H'));
  expect(s.finishOrder).toEqual(['p0']);
  expect(s.current).toBe(1);
});

test('10:an vänder högen och samma spelare lägger igen', () => {
  const s = act(testState({ pile: ['AS', 'KD'], players: [{ hand: ['10H', '4C'] }, other] }), play('10H'));
  expect(s.pile).toEqual([]);
  expect(s.burnedCount).toBe(3);
  expect(s.current).toBe(0);
  expect(s.events).toContainEqual({ type: 'burn', playerId: 'p0' });
});

test('fyra lika över flera drag vänder högen', () => {
  const s = act(testState({ pile: ['7S', '7D', '7H'], players: [{ hand: ['7C', '4C'] }, other] }), play('7C'));
  expect(s.pile).toEqual([]);
  expect(s.current).toBe(0);
});

test('fyra lika i ett drag', () => {
  const s = act(testState({ pile: ['5S'], players: [{ hand: ['8S', '8D', '8H', '8C', '4C'] }, other] }), play('8S', '8D', '8H', '8C'));
  expect(s.pile).toEqual([]);
  expect(s.burnedCount).toBe(5);
});

test('fyra lika med 2:or vänder', () => {
  const s = act(testState({ pile: ['2S', '2D', '2H'], players: [{ hand: ['2C', '4C'] }, other] }), play('2C'));
  expect(s.pile).toEqual([]);
  expect(s.current).toBe(0);
});

test('tre lika vänder inte', () => {
  const s = act(testState({ pile: ['4S', '7D', '7H'], players: [{ hand: ['7C', '4C'] }, other] }), play('7C'));
  expect(s.pile).toHaveLength(4);
  expect(s.current).toBe(1);
});

test('påfyllning när dragbunten tar slut', () => {
  const s = act(testState({ deck: [], players: [{ hand: ['KS', '4C', '5C'] }, other] }), play('KS'));
  expect(s.players[0].hand).toHaveLength(2);
});

test('påfyllning sker före omspel efter vändning', () => {
  const s = act(testState({ deck: ['6H', '7H'], players: [{ hand: ['10H', '4C', '5C'] }, other] }), play('10H'));
  expect(s.players[0].hand).toHaveLength(3);
  expect(s.deck).toEqual(['7H']);
});

test('turordningen hoppar över spelare som är ute', () => {
  const s = act(testState({ finishOrder: ['p1'], players: [{ hand: ['KS', '4C'] }, {}, other] }), play('KS'));
  expect(s.current).toBe(2);
});
