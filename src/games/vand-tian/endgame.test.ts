import { expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import { canPickUp } from './legal';
import { applyPlayAction, vtResult } from './play';
import type { VTAction, VTState } from './state';
import { testState } from './testing';

const rng = seededRng(1);
const other = { hand: ['3D', '4D', '5D'] };

function act(s: VTState, a: VTAction, who = s.players[s.current].id): VTState {
  const r = applyPlayAction(s, who, a, rng);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
const denied = (s: VTState, a: VTAction, who = 'p0') => applyPlayAction(s, who, a, rng).ok === false;

test('chansa lyckas', () => {
  const s = act(testState({ pile: ['9D'], deck: ['KS', '3H'], players: [{ hand: ['4C', '5C', '6C'] }, other] }), { type: 'chance' });
  expect(s.pile.at(-1)).toBe('KS');
  expect(s.events).toContainEqual({ type: 'chance', playerId: 'p0', card: 'KS', success: true });
  expect(s.players[0].hand).toHaveLength(3);
  expect(s.deck).toEqual(['3H']);
  expect(s.current).toBe(1);
});

test('chansa misslyckas', () => {
  const s = act(testState({ pile: ['9D', 'JD'], deck: ['4S'], players: [{ hand: ['4C', '5C', '6C'] }, other] }), { type: 'chance' });
  expect(s.players[0].hand).toHaveLength(6);
  expect(s.players[0].hand).toEqual(expect.arrayContaining(['9D', 'JD', '4S']));
  expect(s.pile).toEqual([]);
  expect(s.events).toContainEqual({ type: 'chance', playerId: 'p0', card: '4S', success: false });
  expect(s.current).toBe(1);
});

test('chansa med en 10:a vänder och spelaren lägger igen', () => {
  const s = act(testState({ pile: ['9D'], deck: ['10S', '3H'], players: [{ hand: ['4C', '5C', '6C'] }, other] }), { type: 'chance' });
  expect(s.pile).toEqual([]);
  expect(s.current).toBe(0);
});

test('chansa nekas när spelaren har ett giltigt kort', () => {
  expect(denied(testState({ pile: ['9D'], deck: ['KS'], players: [{ hand: ['4C', 'QC'] }, other] }), { type: 'chance' })).toBe(true);
});

test('chansa nekas när dragbunten är tom', () => {
  expect(denied(testState({ pile: ['9D'], deck: [], players: [{ hand: ['4C'] }, other] }), { type: 'chance' })).toBe(true);
});

test('ta upp är tillåtet när spelaren inte kan lägga, även om dragbunten har kort', () => {
  const s = act(testState({ pile: ['9D', 'JD'], deck: ['KS'], players: [{ hand: ['4C'] }, other] }), { type: 'pickUp' });
  expect(s.players[0].hand).toEqual(['4C', '9D', 'JD']);
  expect(s.pile).toEqual([]);
  expect(s.current).toBe(1);
  expect(s.events).toContainEqual({ type: 'pickUp', playerId: 'p0', count: 2 });
});

test('ta upp nekas när spelaren har ett giltigt kort', () => {
  expect(denied(testState({ pile: ['9D'], players: [{ hand: ['QC'] }, other] }), { type: 'pickUp' })).toBe(true);
});

test('playFaceUp lägger hela den staplade högen', () => {
  const s = act(testState({ pile: ['9D'], players: [{ faceUp: [[], ['KH', 'KD'], []], faceDown: ['3S', null, null] }, other] }), { type: 'playFaceUp', pileIndex: 1 });
  expect(s.pile).toEqual(['9D', 'KH', 'KD']);
  expect(s.players[0].faceUp[1]).toEqual([]);
  expect(s.current).toBe(1);
});

test('playFaceUp nekas när handen inte är tom', () => {
  expect(denied(testState({ players: [{ hand: ['4C'], faceUp: [['KH'], [], []] }, other] }), { type: 'playFaceUp', pileIndex: 0 })).toBe(true);
});

test('playFaceUp nekas när högen inte går att lägga', () => {
  expect(denied(testState({ pile: ['AS'], players: [{ faceUp: [['KH'], [], []] }, other] }), { type: 'playFaceUp', pileIndex: 0 })).toBe(true);
});

test('uppvända högar som inte går att lägga leder till ta upp', () => {
  const s0 = testState({ pile: ['AS', 'AD'], players: [{ faceUp: [['KH'], ['QH'], []] }, other] });
  expect(canPickUp(s0, 'p0')).toBe(true);
  const s = act(s0, { type: 'pickUp' });
  expect(s.players[0].hand).toEqual(['AS', 'AD']);
  expect(s.players[0].faceUp).toEqual([['KH'], ['QH'], []]);
});

test('playFaceDown lyckas', () => {
  const s = act(testState({ pile: ['9D'], players: [{ faceDown: ['KS', '3S', null] }, other] }), { type: 'playFaceDown', index: 0 });
  expect(s.pile.at(-1)).toBe('KS');
  expect(s.players[0].faceDown).toEqual([null, '3S', null]);
  expect(s.events).toContainEqual({ type: 'faceDown', playerId: 'p0', card: 'KS', success: true });
});

test('playFaceDown misslyckas', () => {
  const s = act(testState({ pile: ['9D', 'JD'], players: [{ faceDown: ['4S', '3S', null] }, other] }), { type: 'playFaceDown', index: 0 });
  expect([...s.players[0].hand].sort()).toEqual(['4S', '9D', 'JD']);
  expect(s.pile).toEqual([]);
  expect(s.events).toContainEqual({ type: 'faceDown', playerId: 'p0', card: '4S', success: false });
  expect(s.current).toBe(1);
});

test('playFaceDown nekas när det finns uppvända kort kvar', () => {
  expect(denied(testState({ players: [{ faceUp: [['KH'], [], []], faceDown: ['4S', null, null] }, other] }), { type: 'playFaceDown', index: 0 })).toBe(true);
});

test('playFaceDown nekas på en tom plats', () => {
  expect(denied(testState({ players: [{ faceDown: [null, '4S', null] }, other] }), { type: 'playFaceDown', index: 0 })).toBe(true);
  expect(denied(testState({ players: [{ faceDown: [null, '4S', null] }, other] }), { type: 'playFaceDown', index: 7 })).toBe(true);
});

test('sista kortet ger ut-placering och spelet fortsätter för de andra', () => {
  const s = act(testState({ pile: ['9D'], players: [{ hand: ['KS'] }, other, other] }), { type: 'play', cards: ['KS'] });
  expect(s.finishOrder).toEqual(['p0']);
  expect(s.phase).toBe('play');
  expect(s.events).toContainEqual({ type: 'out', playerId: 'p0', place: 1 });
  expect(s.current).toBe(1);
});

test('vänder högen med sista kortet och är ändå ute', () => {
  const s = act(testState({ pile: ['9D'], players: [{ hand: ['10H'] }, other, other] }), { type: 'play', cards: ['10H'] });
  expect(s.finishOrder).toEqual(['p0']);
  expect(s.current).toBe(1);
});

test('spelet slutar när alla utom en har gått ut', () => {
  const s = act(testState({ pile: ['9D'], current: 1, finishOrder: ['p0'], players: [{}, { hand: ['KS'] }, other] }), { type: 'play', cards: ['KS'] });
  expect(s.phase).toBe('finished');
  expect(vtResult(s)).toEqual({ placements: ['p0', 'p1', 'p2'], loserId: 'p2' });
});

test('vtResult är null medan spelet pågår', () => {
  expect(vtResult(testState({ players: [other, other] }))).toBeNull();
});

test("alla drag nekas i fasen 'finished'", () => {
  expect(denied(testState({ phase: 'finished', players: [{ hand: ['KS'] }, other] }), { type: 'play', cards: ['KS'] })).toBe(true);
});

test('drag från en spelare som är ute nekas', () => {
  const s = testState({ current: 0, finishOrder: ['p0'], players: [{}, other, other] });
  expect(applyPlayAction(s, 'p0', { type: 'pickUp' }, rng)).toEqual({ ok: false, error: 'Du är redan ute' });
});
