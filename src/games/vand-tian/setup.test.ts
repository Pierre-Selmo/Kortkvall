import { describe, expect, test } from 'vitest';
import { seededRng } from '../../shared/rng';
import { applySwapAction, deal, startingPlayer } from './setup';
import { testState } from './testing';
import type { VTPlayer, VTState } from './state';

const rng = seededRng(1);
const swapState = (players: Partial<VTPlayer>[], deck: string[] = []): VTState =>
  testState({ phase: 'swap', deck, players: players.map((p) => ({ ready: false, ...p })) });

function ok(r: ReturnType<typeof applySwapAction>): VTState {
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

describe('deal', () => {
  test('ger 3 nedvända, 3 uppvända högar med ett kort och 3 på handen', () => {
    const s = deal(['a', 'b', 'c', 'd'], seededRng(1));
    expect(s.phase).toBe('swap');
    expect(s.deck).toHaveLength(16);
    const all = [...s.deck];
    for (const p of s.players) {
      expect(p.hand).toHaveLength(3);
      expect(p.faceUp.map((x) => x.length)).toEqual([1, 1, 1]);
      expect(p.faceDown.filter(Boolean)).toHaveLength(3);
      expect(p.ready).toBe(false);
      all.push(...p.hand, ...p.faceUp.flat(), ...(p.faceDown as string[]));
    }
    expect(new Set(all).size).toBe(52);
    expect(s.players.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('bytesfas', () => {
  test('swap byter handkort mot en hög med ett kort', () => {
    const s = swapState([{ hand: ['KH', '4C', '5C'], faceUp: [['3C'], ['6D'], ['7D']] }, {}]);
    const n = ok(applySwapAction(s, 'p0', { type: 'swap', handCard: 'KH', pileIndex: 0 }, rng));
    expect(n.players[0].hand).toContain('3C');
    expect(n.players[0].hand).not.toContain('KH');
    expect(n.players[0].faceUp[0]).toEqual(['KH']);
  });

  test('swap muterar inte indata', () => {
    const s = swapState([{ hand: ['KH', '4C', '5C'], faceUp: [['3C'], ['6D'], ['7D']] }, {}]);
    const before = structuredClone(s);
    applySwapAction(s, 'p0', { type: 'swap', handCard: 'KH', pileIndex: 0 }, rng);
    expect(s).toEqual(before);
  });

  test('swap nekas på en staplad hög', () => {
    const s = swapState([{ hand: ['QH'], faceUp: [['KH', 'KD'], ['6D'], ['7D']] }, {}]);
    expect(applySwapAction(s, 'p0', { type: 'swap', handCard: 'QH', pileIndex: 0 }, rng).ok).toBe(false);
  });

  test('swap nekas med kort som inte finns på handen', () => {
    const s = swapState([{ hand: ['QH'], faceUp: [['3C'], ['6D'], ['7D']] }, {}]);
    expect(applySwapAction(s, 'p0', { type: 'swap', handCard: 'AS', pileIndex: 0 }, rng).ok).toBe(false);
    expect(applySwapAction(s, 'p0', { type: 'swap', handCard: 'QH', pileIndex: 5 }, rng).ok).toBe(false);
  });

  test('stack lägger ett kort med samma valör på högen', () => {
    const s = swapState([{ hand: ['KD', '4C', '5C'], faceUp: [['KH'], ['6D'], ['7D']] }, {}]);
    const n = ok(applySwapAction(s, 'p0', { type: 'stack', handCard: 'KD', pileIndex: 0 }, rng));
    expect(n.players[0].faceUp[0]).toEqual(['KH', 'KD']);
    expect(n.players[0].hand).toEqual(['4C', '5C']);
  });

  test('stack nekas vid annan valör', () => {
    const s = swapState([{ hand: ['QD'], faceUp: [['KH'], ['6D'], ['7D']] }, {}]);
    expect(applySwapAction(s, 'p0', { type: 'stack', handCard: 'QD', pileIndex: 0 }, rng).ok).toBe(false);
  });

  test('unstack lägger tillbaka det översta kortet på handen', () => {
    const s = swapState([{ hand: ['4C'], faceUp: [['KH', 'KD'], ['6D'], ['7D']] }, {}]);
    const n = ok(applySwapAction(s, 'p0', { type: 'unstack', pileIndex: 0 }, rng));
    expect(n.players[0].faceUp[0]).toEqual(['KH']);
    expect(n.players[0].hand).toEqual(['4C', 'KD']);
  });

  test('unstack nekas när högen bara har ett kort', () => {
    const s = swapState([{ hand: ['4C'], faceUp: [['KH'], ['6D'], ['7D']] }, {}]);
    expect(applySwapAction(s, 'p0', { type: 'unstack', pileIndex: 0 }, rng).ok).toBe(false);
  });

  test('ready fyller på handen till 3', () => {
    const s = swapState([{ hand: ['4C', '5C'] }, {}], ['9S', '8S']);
    const n = ok(applySwapAction(s, 'p0', { type: 'ready' }, rng));
    expect(n.players[0].hand).toEqual(['4C', '5C', '9S']);
    expect(n.deck).toEqual(['8S']);
    expect(n.players[0].ready).toBe(true);
  });

  test('ready när dragbunten bara har 1 kort', () => {
    const s = swapState([{ hand: ['4C'] }, {}], ['9S']);
    const n = ok(applySwapAction(s, 'p0', { type: 'ready' }, rng));
    expect(n.players[0].hand).toEqual(['4C', '9S']);
    expect(n.deck).toEqual([]);
  });

  test('bytesdrag efter ready nekas', () => {
    const s = swapState([{ hand: ['KD'], faceUp: [['KH'], ['6D'], ['7D']], ready: true }, {}]);
    expect(applySwapAction(s, 'p0', { type: 'stack', handCard: 'KD', pileIndex: 0 }, rng).ok).toBe(false);
    expect(applySwapAction(s, 'p0', { type: 'ready' }, rng).ok).toBe(false);
  });

  test('bytesdrag i spelfasen nekas', () => {
    const s = testState({ phase: 'play', players: [{ hand: ['KD'], faceUp: [['KH'], ['6D'], ['7D']] }, {}] });
    expect(applySwapAction(s, 'p0', { type: 'stack', handCard: 'KD', pileIndex: 0 }, rng).ok).toBe(false);
  });

  test('okänd spelare nekas', () => {
    const s = swapState([{ hand: ['4C'] }, {}]);
    expect(applySwapAction(s, 'zz', { type: 'ready' }, rng).ok).toBe(false);
  });

  test("när alla är ready blir fasen 'play' och current = startingPlayer", () => {
    const s = swapState([{ hand: ['5S', 'KD', 'AH'] }, { hand: ['4C', 'QD', 'QS'] }]);
    const a = ok(applySwapAction(s, 'p0', { type: 'ready' }, rng));
    expect(a.phase).toBe('swap');
    const b = ok(applySwapAction(a, 'p1', { type: 'ready' }, rng));
    expect(b.phase).toBe('play');
    expect(b.current).toBe(1);
  });
});

describe('startingPlayer', () => {
  const players = (...hands: string[][]) =>
    testState({ players: hands.map((hand) => ({ hand })) }).players;

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
    const ps = players(['2S', '10D'], ['2C'], ['10H']);
    expect(startingPlayer(ps, () => 0)).toBe(0);
    expect(startingPlayer(ps, () => 0.99)).toBe(2);
  });
  test('en spelare med bara specialkort kan inte vinna mot ett normalt kort', () => {
    expect(startingPlayer(players(['2S', '10D'], ['AC']), () => 0)).toBe(1);
  });
});
