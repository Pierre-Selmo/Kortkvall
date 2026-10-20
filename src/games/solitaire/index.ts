import type { GameDefinition } from '../types';
import { applySolitaireAction, solitaireResult } from './play';
import { setup } from './setup';
import type { SolAction, SolState } from './state';
import { viewFor, type SolView } from './view';

const SUIT_KEYS = ['S', 'H', 'D', 'C'];

/** Kontrollerar formen på ett drag som kommer från klienten. */
export function isSolAction(a: unknown): a is SolAction {
  if (typeof a !== 'object' || a === null) return false;
  const o = a as Record<string, unknown>;
  if (o.type === 'draw') return true;
  if (o.type !== 'move' || typeof o.from !== 'object' || o.from === null || typeof o.to !== 'object' || o.to === null) return false;
  const f = o.from as Record<string, unknown>;
  const t = o.to as Record<string, unknown>;
  const okFrom = (f.kind === 'waste')
    || (f.kind === 'tableau' && Number.isInteger(f.col) && Number.isInteger(f.count))
    || (f.kind === 'foundation' && SUIT_KEYS.includes(f.suit as string));
  const okTo = (t.kind === 'tableau' && Number.isInteger(t.col))
    || (t.kind === 'foundation' && SUIT_KEYS.includes(t.suit as string));
  return okFrom && okTo;
}

export const solitaire: GameDefinition<SolState, SolAction, SolView> = {
  id: 'solitaire',
  name: 'Solitaire',
  minPlayers: 1,
  maxPlayers: 1,
  setup,
  applyAction(state, playerId, action, rng) {
    if (!isSolAction(action)) return { ok: false, error: 'Ogiltigt drag' };
    return applySolitaireAction(state, playerId, action, rng);
  },
  viewFor,
  result: solitaireResult,
};

