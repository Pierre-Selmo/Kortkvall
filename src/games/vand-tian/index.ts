import type { GameDefinition } from '../types';
import { isCardId } from './cards';
import { applyPlayAction, vtResult } from './play';
import { applySwapAction, deal } from './setup';
import type { VTAction, VTState } from './state';
import { viewFor, type VTView } from './view';

const isIndex = (x: unknown) => Number.isInteger(x);

/** Kontrollerar formen på ett drag som kommer från klienten. */
export function isVTAction(a: unknown): a is VTAction {
  if (typeof a !== 'object' || a === null) return false;
  const o = a as Record<string, unknown>;
  switch (o.type) {
    case 'swap':
    case 'stack':
      return isCardId(o.handCard) && isIndex(o.pileIndex);
    case 'unstack':
    case 'playFaceUp':
      return isIndex(o.pileIndex);
    case 'playFaceDown':
      return isIndex(o.index);
    case 'play':
      return Array.isArray(o.cards) && o.cards.length <= 52 && o.cards.every(isCardId);
    case 'ready':
    case 'chance':
    case 'pickUp':
      return true;
    default:
      return false;
  }
}

export const vandTian: GameDefinition<VTState, VTAction, VTView> = {
  id: 'vand-tian',
  name: 'Vänd tian',
  minPlayers: 2,
  maxPlayers: 5,
  setup: deal,
  applyAction(state, playerId, action, rng) {
    if (!isVTAction(action)) return { ok: false, error: 'Ogiltigt drag' };
    return state.phase === 'swap'
      ? applySwapAction(state, playerId, action, rng)
      : applyPlayAction(state, playerId, action, rng);
  },
  viewFor,
  result: vtResult,
};

export type { VTAction, VTState, VTView };
