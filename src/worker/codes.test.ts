import { expect, test } from 'vitest';
import { seededRng } from '../shared/rng';
import { CODE_ALPHABET, generateCode, normalizeCode } from './codes';

test('generateCode ger 4 tecken ur alfabetet', () => {
  const r = seededRng(5);
  for (let i = 0; i < 1000; i++) {
    const c = generateCode(r);
    expect(c).toMatch(/^[A-Z]{4}$/);
    expect(c).not.toMatch(/[IO]/);
    for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
  }
});

test('normalizeCode trimmar och gör versaler', () => {
  expect(normalizeCode(' kxqt ')).toBe('KXQT');
});

test('normalizeCode avvisar ogiltiga koder', () => {
  expect(normalizeCode('KXQ')).toBeNull();
  expect(normalizeCode('KXQI')).toBeNull();
  expect(normalizeCode('KX1T')).toBeNull();
  expect(normalizeCode('KXQTT')).toBeNull();
});
