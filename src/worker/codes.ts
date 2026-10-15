// Får inte ha några worker-beroenden: klienten importerar den här filen.
import type { Rng } from '../shared/rng';

/** A–Z utom I och O, som lätt förväxlas. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 4;

export function generateCode(rng: Rng): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return code;
}

/** Trimmar och gör versaler. null om koden är ogiltig. */
export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}
