import { describe, expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import { applySwapAction, deal, startingPlayer } from './setup';
import type { VTState } from './state';
import { testState } from './testing';

const rng = seededRng(1);

function ok(r: ReturnType<typeof applySwapAction>): VTState {
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function swapState(hand: string[], pile0: string[], deck: string[] = []) {
  return testState({
    phase: 'swap',
    deck,
    players: [
      { hand, faceUp: [pile0, ['5S'], ['6S']], faceDown: ['7S', '8S', '9S'], ready: false },
      { hand: ['3D', '4D', '5D'], faceUp: [['6D'], ['7D'], ['8D']], faceDown: ['9D', 'JD', 'QD'], ready: false },
    ],
  });
}

describe('deal', () => {
  test('ger 3 nedvända, 3 uppvända högar med ett kort och 3 på handen', () => {
    const s = deal(['a', 'b', 'c', 'd'], seededRng(1));
    expect(s.deck).toHaveLength(16);
    expect(s.phase).toBe('swap');
    const all = [...s.deck];
    for (const p of s.players) {
      expect(p.ready).toBe(false);
      expect(p.hand).toHaveLength(3);
      expect(p.faceDown).toHaveLength(3);
      expect(p.faceUp.map((f) => f.length)).toEqual([1, 1, 1]);
      all.push(...p.hand, ...p.faceUp.flat(), ...(p.faceDown as string[]));
    }
    expect(all).toHaveLength(52);
    expect(new Set(all).size).toBe(52);
    expect(s.players.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('bytesfas', () => {
  test('swap byter handkort mot en hög med ett kort', () => {
    const s = ok(applySwapAction(swapState(['KH', '4C', '5C'], ['3C']), 'p0', { type: 'swap', handCard: 'KH', pileIndex: 0 }, rng));
    expect(s.players[0].hand).toEqual(['3C', '4C', '5C']);
    expect(s.players[0].faceUp[0]).toEqual(['KH']);
  });

  test('swap nekas på en staplad hög', () => {
    const r = applySwapAction(swapState(['AH', '4C'], ['KH', 'KD']), 'p0', { type: 'swap', handCard: 'AH', pileIndex: 0 }, rng);
    expect(r.ok).toBe(false);
  });

  test('swap nekas för kort som inte finns på handen', () => {
    const r = applySwapAction(swapState(['KH', '4C', '5C'], ['3C']), 'p0', { type: 'swap', handCard: 'AS', pileIndex: 0 }, rng);
    expect(r.ok).toBe(false);
  });

  test('stack lägger ett kort med samma valör på högen', () => {
    const s = ok(applySwapAction(swapState(['KD', '4C', '5C'], ['KH']), 'p0', { type: 'stack', handCard: 'KD', pileIndex: 0 }, rng));
    expect(s.players[0].faceUp[0]).toEqual(['KH', 'KD']);
    expect(s.players[0].hand).toEqual(['4C', '5C']);
  });

  test('stack drar direkt ett nytt kort så att handen har 3 igen', () => {
    const s = ok(applySwapAction(swapState(['KD', '4C', '5C'], ['KH'], ['9S', '3H']), 'p0', { type: 'stack', handCard: 'KD', pileIndex: 0 }, rng));
    expect(s.players[0].faceUp[0]).toEqual(['KH', 'KD']);
    expect(s.players[0].hand).toEqual(['4C', '5C', '9S']);
    expect(s.deck).toEqual(['3H']);
  });

  test('det dragna kortet kan också staplas', () => {
    let s = ok(applySwapAction(swapState(['KD', '4C', '5C'], ['KH'], ['KS']), 'p0', { type: 'stack', handCard: 'KD', pileIndex: 0 }, rng));
    s = ok(applySwapAction(s, 'p0', { type: 'stack', handCard: 'KS', pileIndex: 0 }, rng));
    expect(s.players[0].faceUp[0]).toEqual(['KH', 'KD', 'KS']);
    expect(s.players[0].hand).toEqual(['4C', '5C']);
  });

  test('stack nekas vid annan valör', () => {
    const r = applySwapAction(swapState(['QD', '4C', '5C'], ['KH']), 'p0', { type: 'stack', handCard: 'QD', pileIndex: 0 }, rng);
    expect(r.ok).toBe(false);
  });

  test('unstack lägger tillbaka det översta kortet på handen och nekas när högen bara har ett kort', () => {
    const s = ok(applySwapAction(swapState(['4C', '5C'], ['KH', 'KD']), 'p0', { type: 'unstack', pileIndex: 0 }, rng));
    expect(s.players[0].faceUp[0]).toEqual(['KH']);
    expect(s.players[0].hand).toEqual(['4C', '5C', 'KD']);
    expect(applySwapAction(s, 'p0', { type: 'unstack', pileIndex: 0 }, rng).ok).toBe(false);
  });

  test('ready fyller på handen till 3', () => {
    const s = ok(applySwapAction(swapState(['4C', '5C'], ['KH', 'KD'], ['2C', '3C']), 'p0', { type: 'ready' }, rng));
    expect(s.players[0].hand).toHaveLength(3);
    expect(s.deck).toEqual(['3C']);
    expect(s.players[0].ready).toBe(true);
  });

  test('ready när dragbunten bara har 1 kort', () => {
    const s = ok(applySwapAction(swapState(['4C'], ['KH', 'KD', 'KS'], ['2C']), 'p0', { type: 'ready' }, rng));
    expect(s.players[0].hand).toHaveLength(2);
    expect(s.deck).toEqual([]);
  });

  test('bytesdrag efter ready nekas', () => {
    const s = ok(applySwapAction(swapState(['KH', '4C', '5C'], ['3C']), 'p0', { type: 'ready' }, rng));
    const r = applySwapAction(s, 'p0', { type: 'swap', handCard: 'KH', pileIndex: 0 }, rng);
    expect(r).toEqual({ ok: false, error: 'Du har redan tryckt Klar' });
  });

  test('bytesdrag i spelfasen nekas', () => {
    const s = { ...swapState(['KH', '4C', '5C'], ['3C']), phase: 'play' as const };
    expect(applySwapAction(s, 'p0', { type: 'swap', handCard: 'KH', pileIndex: 0 }, rng).ok).toBe(false);
  });

  test('muterar inte indata', () => {
    const s = swapState(['KH', '4C', '5C'], ['3C']);
    const before = structuredClone(s);
    applySwapAction(s, 'p0', { type: 'swap', handCard: 'KH', pileIndex: 0 }, rng);
    expect(s).toEqual(before);
  });

  test("när alla är ready blir fasen 'play' och current = startingPlayer", () => {
    let s = ok(applySwapAction(swapState(['KH', '4C', '5C'], ['3C']), 'p0', { type: 'ready' }, rng));
    expect(s.phase).toBe('swap');
    s = ok(applySwapAction(s, 'p1', { type: 'ready' }, rng));
    expect(s.phase).toBe('play');
    expect(s.current).toBe(1); // p1 har 3D
  });
});

describe('startingPlayer', () => {
  const players = (...hands: string[][]) => testState({ players: hands.map((hand) => ({ hand })) }).players;

  test('lägsta normala kortet börjar', () => {
    expect(startingPlayer(players(['5S', 'KD', 'AH'], ['4C', 'QD', 'QS']), rng)).toBe(1);
  });
  test('2:or och 10:or räknas inte', () => {
    expect(startingPlayer(players(['2S', '10D', 'KH'], ['3C', 'AD', 'AS']), rng)).toBe(1);
  });
  test('hjärter avgör före antal', () => {
    expect(startingPlayer(players(['3H', 'KD', 'AH'], ['3S', '3C', 'AD']), rng)).toBe(0);
  });
  test('flest av valören om ingen har hjärter', () => {
    expect(startingPlayer(players(['3S', 'KD', 'AH'], ['3C', '3D', 'AD']), rng)).toBe(1);
  });
  test('slumpen vid fullständig lika', () => {
    const ps = players(['3S', 'KD', 'AH'], ['3C', 'QD', 'AD']);
    expect(startingPlayer(ps, () => 0)).toBe(0);
    expect(startingPlayer(ps, () => 0.99)).toBe(1);
  });
  test('bara specialkort på alla händer avgörs av slumpen bland alla', () => {
    const ps = players(['2S', '10D'], ['2C', '10H'], ['2D']);
    expect(startingPlayer(ps, () => 0)).toBe(0);
    expect(startingPlayer(ps, () => 0.5)).toBe(1);
    expect(startingPlayer(ps, () => 0.99)).toBe(2);
  });
});
