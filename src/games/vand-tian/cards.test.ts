import { expect, test } from 'vitest';
import { canPlayOn, isSpecial, makeDeck, rankOf, suitOf, value } from './cards';

test('makeDeck ger 52 unika kort', () => {
  const d = makeDeck();
  expect(d).toHaveLength(52);
  expect(new Set(d).size).toBe(52);
  expect(d).toContain('10S');
  expect(d).toContain('AH');
});

test('rankOf/suitOf hanterar 10', () => {
  expect(rankOf('10S')).toBe('10');
  expect(suitOf('10S')).toBe('S');
  expect(rankOf('KH')).toBe('K');
});

test('ess är högst', () => {
  expect(value('A')).toBeGreaterThan(value('K'));
  expect(value('J')).toBeGreaterThan(value('9'));
});

test('2 och 10 är specialkort', () => {
  expect(isSpecial('2')).toBe(true);
  expect(isSpecial('10')).toBe(true);
  expect(isSpecial('3')).toBe(false);
});

test('canPlayOn: tom hög tar allt', () => {
  expect(canPlayOn('3', [])).toBe(true);
});

test('canPlayOn: lika eller högre', () => {
  expect(canPlayOn('9', ['9D'])).toBe(true);
  expect(canPlayOn('K', ['9D'])).toBe(true);
  expect(canPlayOn('8', ['9D'])).toBe(false);
});

test('canPlayOn: 2 och 10 går på allt', () => {
  expect(canPlayOn('2', ['AS'])).toBe(true);
  expect(canPlayOn('10', ['AS'])).toBe(true);
});

test('canPlayOn: efter en 2:a går allt', () => {
  expect(canPlayOn('3', ['KS', '2H'])).toBe(true);
});
