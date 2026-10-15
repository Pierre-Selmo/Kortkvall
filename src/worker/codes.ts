import type { Rng } from '../shared/rng';

// No I or O: they are easily confused with 1 and 0.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateCode(rng: Rng): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return code;
}

/** Trims and upper-cases; null if it is not a valid room code. */
export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (code.length !== 4) return null;
  return [...code].every((ch) => CODE_ALPHABET.includes(ch)) ? code : null;
}
