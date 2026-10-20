import type { GameDefinition } from '../types';
import { applyLudoAction, ludoResult } from './play';
import { setup } from './setup';
import { PIECES, type LudoAction, type LudoState } from './state';
import { viewFor, type LudoView } from './view';

/** Kontrollerar formen på ett drag som kommer från klienten. */
export function isLudoAction(a: unknown): a is LudoAction {
  if (typeof a !== 'object' || a === null) return false;
  const o = a as Record<string, unknown>;
  if (o.type === 'roll') return true;
  return o.type === 'move' && Number.isInteger(o.pieceIndex)
    && (o.pieceIndex as number) >= 0 && (o.pieceIndex as number) < PIECES;
}

export const ludo: GameDefinition<LudoState, LudoAction, LudoView> = {
  id: 'ludo',
  name: 'Ludo',
  minPlayers: 2,
  maxPlayers: 4,
  setup: (playerIds) => setup(playerIds),
  applyAction(state, playerId, action, rng) {
    if (!isLudoAction(action)) return { ok: false, error: 'Ogiltigt drag' };
    return applyLudoAction(state, playerId, action, rng);
  },
  viewFor,
  result: ludoResult,
};
