import { expect, test } from 'vitest';
import { cryptoRng } from '../shared/rng';
import { CODE_ALPHABET, generateCode, normalizeCode } from './codes';

test('generateCode ger 4 tecken ur alfabetet', () => {
  expect(CODE_ALPHABET).not.toMatch(/[IO]/);
  for (let i = 0; i < 1000; i++) {
    const c = generateCode(cryptoRng);
    expect(c).toMatch(/^[A-Z]{4}$/);
    expect([...c].every((ch) => CODE_ALPHABET.includes(ch))).toBe(true);
  }
});

test('normalizeCode', () => {
  expect(normalizeCode(' kxqt ')).toBe('KXQT');
  expect(normalizeCode('KXQ')).toBeNull();
  expect(normalizeCode('KXQI')).toBeNull();
  expect(normalizeCode('KX1T')).toBeNull();
});
