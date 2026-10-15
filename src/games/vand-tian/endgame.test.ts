import { describe, expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import { canPickUp } from './legal';
import { applyPlayAction, vtResult } from './play';
import { testState } from './testing';
import type { VTAction, VTState } from './state';

const rng = seededRng(1);
const act = (s: VTState, a: VTAction, who = 'p0') => applyPlayAction(s, who, a, rng);
function ok(r: ReturnType<typeof applyPlayAction>): VTState {
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
const other = { hand: ['3S', '3D', '3C'] };

describe('chansa', () => {
  test('lyckas', () => {
    const s = testState({ pile: ['9D'], deck: ['KS', '3H'], players: [{ hand: ['4C', '5C', '6C'] }, other] });
    const n = ok(act(s, { type: 'chance' }));
    expect(n.pile.at(-1)).toBe('KS');
    expect(n.events).toContainEqual({ type: 'chance', playerId: 'p0', card: 'KS', success: true });
    expect(n.players[0].hand).toEqual(['4C', '5C', '6C']);
    expect(n.deck).toEqual(['3H']);
    expect(n.current).toBe(1);
  });

  test('misslyckas: tar upp högen plus det dragna kortet', () => {
    const s = testState({ pile: ['9D', 'JD'], deck: ['4S'], players: [{ hand: ['4C', '5C', '6C'] }, other] });
    const n = ok(act(s, { type: 'chance' }));
    expect(n.players[0].hand).toHaveLength(6);
    expect(n.players[0].hand).toEqual(expect.arrayContaining(['9D', 'JD', '4S']));
    expect(n.pile).toEqual([]);
    expect(n.events).toContainEqual({ type: 'chance', playerId: 'p0', card: '4S', success: false });
    expect(n.events).toContainEqual({ type: 'pickUp', playerId: 'p0', count: 3 });
    expect(n.current).toBe(1);
  });

  test('med en 10:a vänder och spelaren lägger igen', () => {
    const s = testState({ pile: ['AS'], deck: ['10C'], players: [{ hand: ['4C', '5C', '6C'] }, other] });
    const n = ok(act(s, { type: 'chance' }));
    expect(n.pile).toEqual([]);
    expect(n.current).toBe(0);
  });

  test('nekas när spelaren har ett giltigt kort', () => {
    const s = testState({ pile: ['9D'], deck: ['KS'], players: [{ hand: ['4C', 'QC'] }, other] });
    expect(act(s, { type: 'chance' }).ok).toBe(false);
  });

  test('nekas när dragbunten är tom', () => {
    const s = testState({ pile: ['9D'], deck: [], players: [{ hand: ['4C'] }, other] });
    expect(act(s, { type: 'chance' }).ok).toBe(false);
  });
});

describe('ta upp', () => {
  test('tillåtet när spelaren inte kan lägga, även om dragbunten har kort', () => {
    const s = testState({ pile: ['9D', 'JD'], deck: ['KS'], players: [{ hand: ['4C'] }, other] });
    const n = ok(act(s, { type: 'pickUp' }));
    expect(n.players[0].hand).toEqual(['4C', '9D', 'JD']);
    expect(n.pile).toEqual([]);
    expect(n.deck).toEqual(['KS']);
    expect(n.current).toBe(1);
    expect(n.events).toContainEqual({ type: 'pickUp', playerId: 'p0', count: 2 });
  });

  test('nekas när spelaren har ett giltigt kort', () => {
    const s = testState({ pile: ['9D'], players: [{ hand: ['KC'] }, other] });
    expect(act(s, { type: 'pickUp' }).ok).toBe(false);
  });
});

describe('uppvända högar', () => {
  test('playFaceUp lägger hela den staplade högen', () => {
    const s = testState({ pile: ['9D'], players: [{ faceUp: [['4S'], ['KH', 'KD'], []] }, other] });
    const n = ok(act(s, { type: 'playFaceUp', pileIndex: 1 }));
    expect(n.pile).toEqual(['9D', 'KH', 'KD']);
    expect(n.players[0].faceUp[1]).toEqual([]);
    expect(n.current).toBe(1);
  });

  test('playFaceUp nekas när handen inte är tom', () => {
    const s = testState({ pile: ['9D'], players: [{ hand: ['4C'], faceUp: [['KH'], [], []] }, other] });
    expect(act(s, { type: 'playFaceUp', pileIndex: 0 }).ok).toBe(false);
  });

  test('playFaceUp nekas när högen inte går att lägga eller är tom', () => {
    const s = testState({ pile: ['9D'], players: [{ faceUp: [['4H'], [], ['KS']] }, other] });
    expect(act(s, { type: 'playFaceUp', pileIndex: 0 }).ok).toBe(false);
    expect(act(s, { type: 'playFaceUp', pileIndex: 1 }).ok).toBe(false);
  });

  test('uppvända högar som inte går att lägga leder till ta upp', () => {
    const s = testState({ pile: ['9D', 'QD'], players: [{ faceUp: [['4H'], ['5S'], []] }, other] });
    expect(canPickUp(s, 'p0')).toBe(true);
    const n = ok(act(s, { type: 'pickUp' }));
    expect(n.players[0].hand).toEqual(['9D', 'QD']);
    expect(n.players[0].faceUp).toEqual([['4H'], ['5S'], []]);
  });
});

describe('nedvända kort', () => {
  test('playFaceDown lyckas', () => {
    const s = testState({ pile: ['9D'], players: [{ faceDown: ['KS', '4D', null] }, other] });
    const n = ok(act(s, { type: 'playFaceDown', index: 0 }));
    expect(n.pile.at(-1)).toBe('KS');
    expect(n.players[0].faceDown).toEqual([null, '4D', null]);
    expect(n.events).toContainEqual({ type: 'faceDown', playerId: 'p0', card: 'KS', success: true });
  });

  test('playFaceDown misslyckas: tar upp högen plus kortet', () => {
    const s = testState({ pile: ['9D', 'JD'], players: [{ faceDown: ['4S', '5D', null] }, other] });
    const n = ok(act(s, { type: 'playFaceDown', index: 0 }));
    expect([...n.players[0].hand].sort()).toEqual(['4S', '9D', 'JD']);
    expect(n.pile).toEqual([]);
    expect(n.players[0].faceDown).toEqual([null, '5D', null]);
    expect(n.events).toContainEqual({ type: 'faceDown', playerId: 'p0', card: '4S', success: false });
    expect(n.current).toBe(1);
  });

  test('playFaceDown nekas när det finns uppvända kort kvar', () => {
    const s = testState({ pile: ['9D'], players: [{ faceUp: [['KH'], [], []], faceDown: ['4S', null, null] }, other] });
    expect(act(s, { type: 'playFaceDown', index: 0 }).ok).toBe(false);
  });

  test('playFaceDown nekas på en tom plats', () => {
    const s = testState({ pile: ['9D'], players: [{ faceDown: [null, '4S', null] }, other] });
    expect(act(s, { type: 'playFaceDown', index: 0 }).ok).toBe(false);
    expect(act(s, { type: 'playFaceDown', index: 7 }).ok).toBe(false);
  });
});

describe('gå ut och slut', () => {
  test('sista kortet ger ut-placering och spelet fortsätter för de andra', () => {
    const s = testState({ pile: ['9D'], players: [{ hand: ['KS'] }, other, other] });
    const n = ok(act(s, { type: 'play', cards: ['KS'] }));
    expect(n.finishOrder).toEqual(['p0']);
    expect(n.phase).toBe('play');
    expect(n.events).toContainEqual({ type: 'out', playerId: 'p0', place: 1 });
    expect(n.current).toBe(1);
    expect(vtResult(n)).toBeNull();
  });

  test('vänder högen med sista kortet och är ändå ute', () => {
    const s = testState({ pile: ['9D'], players: [{ hand: ['10H'] }, other, other] });
    const n = ok(act(s, { type: 'play', cards: ['10H'] }));
    expect(n.finishOrder).toEqual(['p0']);
    expect(n.current).toBe(1);
  });

  test('spelet slutar när alla utom en har gått ut', () => {
    const s = testState({
      pile: ['9D'],
      current: 1,
      finishOrder: ['p0'],
      players: [{}, { hand: ['KS'] }, { hand: ['4C'] }],
    });
    const n = ok(act(s, { type: 'play', cards: ['KS'] }, 'p1'));
    expect(n.phase).toBe('finished');
    expect(vtResult(n)).toEqual({ placements: ['p0', 'p1', 'p2'], loserId: 'p2' });
  });

  test("alla drag nekas i fasen 'finished'", () => {
    const s = testState({ phase: 'finished', pile: ['9D'], players: [{ hand: ['KS'] }, other] });
    expect(act(s, { type: 'play', cards: ['KS'] }).ok).toBe(false);
  });

  test('drag från en spelare som är ute nekas', () => {
    const s = testState({ pile: ['9D'], finishOrder: ['p0'], players: [{}, other, other] });
    expect(act(s, { type: 'pickUp' }).ok).toBe(false);
  });
});
