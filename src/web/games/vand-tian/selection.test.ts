import { expect, test } from 'vitest';
import { swapIntent, toggleSelect } from './selection';

test('toggleSelect lägger till samma valör', () => {
  expect(toggleSelect(['KS'], 'KD')).toEqual(['KS', 'KD']);
});
test('toggleSelect ersätter vid annan valör', () => {
  expect(toggleSelect(['KS', 'KD'], '4C')).toEqual(['4C']);
});
test('toggleSelect tar bort vid nytt klick', () => {
  expect(toggleSelect(['KS', 'KD'], 'KS')).toEqual(['KD']);
  expect(toggleSelect([], '10H')).toEqual(['10H']);
});

test('swapIntent', () => {
  expect(swapIntent('KD', ['KH'])).toBe('stack');
  expect(swapIntent('KD', ['KH', 'KS'])).toBe('stack');
  expect(swapIntent('4C', ['KH'])).toBe('swap');
  expect(swapIntent('4C', ['KH', 'KS'])).toBe('swap');
  expect(swapIntent('4C', [])).toBeNull();
});
