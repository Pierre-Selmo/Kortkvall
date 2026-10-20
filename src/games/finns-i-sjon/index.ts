import type { GameDefinition } from '../types';
import { RANKS } from '../vand-tian/cards';
import { applyFishAction, fishResult } from './play';
import { setup } from './setup';
import type { FishAction, FishState } from './state';
import { viewFor, type FishView } from './view';

/** Kontrollerar formen på ett drag som kommer från klienten. */
export function isFishAction(a: unknown): a is FishAction {
  if (typeof a !== 'object' || a === null) return false;
  const o = a as Record<string, unknown>;
  return o.type === 'ask' && typeof o.targetId === 'string' && (RANKS as readonly unknown[]).includes(o.rank);
}

export const finnsISjon: GameDefinition<FishState, FishAction, FishView> = {
  id: 'finns-i-sjon',
  name: 'Finns i sjön',
  minPlayers: 2,
  maxPlayers: 5,
  setup,
  applyAction(state, playerId, action, rng) {
    if (!isFishAction(action)) return { ok: false, error: 'Ogiltigt drag' };
    return applyFishAction(state, playerId, action, rng);
  },
  viewFor,
  result: fishResult,
};
