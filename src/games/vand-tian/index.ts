import { fail, type GameDefinition } from '../types';
import { applyPlayAction, vtResult } from './play';
import { applySwapAction, deal } from './setup';
import type { VTAction, VTState } from './state';
import { viewFor, type VTView } from './view';

const isStr = (x: unknown): x is string => typeof x === 'string';
const isInt = (x: unknown): x is number => Number.isInteger(x);

/** Checks the shape of an untrusted action from the network. */
export function isVTAction(a: unknown): a is VTAction {
  if (typeof a !== 'object' || a === null) return false;
  const x = a as Record<string, unknown>;
  switch (x.type) {
    case 'swap':
    case 'stack':
      return isStr(x.handCard) && isInt(x.pileIndex);
    case 'unstack':
    case 'playFaceUp':
      return isInt(x.pileIndex);
    case 'playFaceDown':
      return isInt(x.index);
    case 'play':
      return Array.isArray(x.cards) && x.cards.every(isStr);
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
    if (!isVTAction(action)) return fail('Ogiltigt drag');
    return state.phase === 'swap'
      ? applySwapAction(state, playerId, action, rng)
      : applyPlayAction(state, playerId, action, rng);
  },
  viewFor,
  result: vtResult,
};

export type { VTAction, VTState, VTView };
