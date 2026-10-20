import { expect, test } from 'vitest';
import { seededRng, type Rng } from '../../shared/rng';
import { legalPieces } from './legal';
import { applyLudoAction, ludoResult, trackIndex } from './play';
import { setup } from './setup';
import { NEST, SAFE, type LudoAction, type LudoState } from './state';
import { ludo } from './index';
import { viewFor } from './view';

const N = NEST;
const six: Rng = () => 0.99; // ger 6
const one: Rng = () => 0;    // ger 1
const two: Rng = () => 0.2;  // ger 2
const rng = seededRng(1);

function st(pieces: number[][], over: Partial<LudoState> = {}): LudoState {
  return {
    phase: 'roll',
    players: pieces.map((p, i) => ({ id: 'p' + i, pieces: [...p] })),
    current: 0,
    dice: null,
    finishOrder: [],
    events: [],
    ...over,
  };
}

function apply(s: LudoState, id: string, a: LudoAction, r: Rng = rng) {
  return applyLudoAction(s, id, a, r);
}

function ok(r: ReturnType<typeof apply>): LudoState {
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

test('bara en 6:a tar ut en pjäs ur boet', () => {
  expect(legalPieces([N, N, N, N], 5)).toEqual([]);
  expect(legalPieces([N, N, N, N], 6)).toEqual([0, 1, 2, 3]);
});

test('en pjäs måste landa exakt i mål', () => {
  expect(legalPieces([54], 2)).toEqual([0]);
  expect(legalPieces([54], 3)).toEqual([]);
  expect(legalPieces([55], 2)).toEqual([]);
});

test('slå en 6:a: pjäsen kommer ut och man slår igen', () => {
  let s = ok(apply(st([[N, N, N, N], [N, N, N, N]]), 'p0', { type: 'roll' }, six));
  expect(s.dice).toBe(6);
  expect(s.phase).toBe('move');
  s = ok(apply(s, 'p0', { type: 'move', pieceIndex: 0 }));
  expect(s.players[0].pieces).toEqual([0, N, N, N]);
  expect(s.phase).toBe('roll');
  expect(s.current).toBe(0);
});

test('slag utan giltigt drag passar turen', () => {
  const s = ok(apply(st([[N, N, N, N], [N, N, N, N]]), 'p0', { type: 'roll' }, one));
  expect(s.current).toBe(1);
  expect(s.phase).toBe('roll');
  expect(s.dice).toBeNull();
});

test('man kan inte flytta utan att ha slagit', () => {
  const r = apply(st([[0, N, N, N], [N, N, N, N]]), 'p0', { type: 'move', pieceIndex: 0 });
  expect(r.ok).toBe(false);
});

test('fel tur nekas', () => {
  const r = apply(st([[N, N, N, N], [N, N, N, N]]), 'p1', { type: 'roll' }, six);
  expect(r).toEqual({ ok: false, error: 'Det är inte din tur' });
});

test('pjäsen kan inte gå förbi målet', () => {
  const s = st([[54, N, N, N], [N, N, N, N]], { phase: 'move', dice: 3 });
  expect(apply(s, 'p0', { type: 'move', pieceIndex: 0 }).ok).toBe(false);
});

test('exakt slag i mål', () => {
  let s = ok(apply(st([[54, N, N, N], [N, N, N, N]]), 'p0', { type: 'roll' }, two));
  s = ok(apply(s, 'p0', { type: 'move', pieceIndex: 0 }));
  expect(s.players[0].pieces[0]).toBe(56);
  expect(s.current).toBe(1);
});

test('att landa på en motståndare knuffar ut den', () => {
  // p0:s pjäs på progress 4 landar på ruta 5. p1:s pjäs på progress 44 står på ruta (13+44) % 52 = 5.
  expect(trackIndex(0, 5)).toBe(trackIndex(1, 44));
  const s = ok(apply(st([[4, N, N, N], [44, N, N, N]], { phase: 'move', dice: 1 }), 'p0', { type: 'move', pieceIndex: 0 }));
  expect(s.players[1].pieces[0]).toBe(NEST);
  expect(s.events).toContainEqual({ type: 'knock', playerId: 'p0', victimId: 'p1' });
});

test('ingen knuff i målzonen eller på egen pjäs', () => {
  const home = st([[4, N, N, N], [51, N, N, N]], { phase: 'move', dice: 1 });
  expect(ok(apply(home, 'p0', { type: 'move', pieceIndex: 0 })).players[1].pieces[0]).toBe(51);
  const own = st([[4, 44, N, N], [N, N, N, N]], { phase: 'move', dice: 1 });
  expect(ok(apply(own, 'p0', { type: 'move', pieceIndex: 0 })).players[0].pieces[1]).toBe(44);
});

test('sista pjäsen i mål ger placering och spelet fortsätter för de andra', () => {
  const s = ok(apply(st([[56, 56, 56, 53], [N, N, N, N], [N, N, N, N]], { phase: 'move', dice: 3 }), 'p0', { type: 'move', pieceIndex: 3 }));
  expect(s.finishOrder).toEqual(['p0']);
  expect(s.phase).toBe('roll');
  expect(s.events).toContainEqual({ type: 'finish', playerId: 'p0', place: 1 });
  expect(s.current).toBe(1);
});

test('spelet slutar när en spelare är kvar och ger placeringar', () => {
  const s = ok(apply(st([[56, 56, 56, 53], [N, N, N, N]], { phase: 'move', dice: 3 }), 'p0', { type: 'move', pieceIndex: 3 }));
  expect(s.phase).toBe('finished');
  expect(ludoResult(s)).toEqual({ placements: ['p0', 'p1'], loserId: 'p1' });
  expect(ludoResult(st([[N, N, N, N], [N, N, N, N]]))).toBeNull();
});

test('viewFor visar lagliga pjäser bara för spelaren vars tur det är', () => {
  const s = st([[0, N, N, N], [N, N, N, N]], { phase: 'move', dice: 4 });
  expect(viewFor(s, 'p0').legal).toEqual([0]);
  expect(viewFor(s, 'p1').legal).toEqual([]);
});

test('ludo.applyAction avvisar skräpindata', () => {
  const s = setup(['a', 'b']);
  for (const junk of [null, 'roll', { type: 'move' }, { type: 'move', pieceIndex: 9 }, { type: 'fly' }]) {
    expect(ludo.applyAction(s, 'a', junk as unknown as LudoAction, rng).ok).toBe(false);
  }
});

function playRandomGame(n: number, seed: number): LudoState {
  const r = seededRng(seed);
  let s = setup(Array.from({ length: n }, (_, i) => 'p' + i));
  for (let moves = 0; moves < 20000 && s.phase !== 'finished'; moves++) {
    const id = s.players[s.current].id;
    const a: LudoAction = s.phase === 'roll'
      ? { type: 'roll' }
      : { type: 'move', pieceIndex: legalPieces(s.players[s.current].pieces, s.dice!)[Math.floor(r() * 4) % legalPieces(s.players[s.current].pieces, s.dice!).length] };
    s = ok(apply(s, id, a, r));
  }
  return s;
}

test.each([2, 3, 4].flatMap((n) => [1, 2, 3, 4, 5, 6].map((seed) => [n, seed])))(
  'ett helt slumpat parti med %i spelare (seed %i) tar slut',
  (n, seed) => {
    const s = playRandomGame(n, seed);
    expect(s.phase).toBe('finished');
    expect(new Set(s.finishOrder).size).toBe(n);
  },
);

test('en pjäs på en trygg stjärnruta kan inte knuffas ut', () => {
  // Trygg ruta 42 = fem före grönas startruta 47. Röd (progress 7) landar på 42 där grön står (progress 47).
  expect(SAFE).toContain(42);
  expect(trackIndex(1, 47)).toBe(42);
  const s = ok(apply(st([[7, N, N, N], [47, N, N, N]], { phase: 'move', dice: 1 }), 'p0', { type: 'move', pieceIndex: 0 }));
  expect(trackIndex(0, 8)).toBe(42);
  expect(s.players[1].pieces[0]).toBe(47);
});
