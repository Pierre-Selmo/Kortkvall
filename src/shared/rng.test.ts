import { expect, test } from 'vitest';
import { seededRng, shuffle } from './rng';

test('seededRng är deterministisk', () => {
  const a = seededRng(42), b = seededRng(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});

test('seededRng ger värden i [0, 1)', () => {
  const r = seededRng(3);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
});

test('shuffle behåller elementen och muterar inte', () => {
  const xs = [1, 2, 3, 4, 5];
  const out = shuffle(xs, seededRng(1));
  expect([...out].sort()).toEqual(xs);
  expect(xs).toEqual([1, 2, 3, 4, 5]);
});
