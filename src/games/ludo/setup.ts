import { NEST, PIECES, type LudoState } from './state';

export function setup(playerIds: string[]): LudoState {
  return {
    phase: 'roll',
    players: playerIds.map((id) => ({ id, pieces: Array<number>(PIECES).fill(NEST) })),
    current: 0,
    dice: null,
    finishOrder: [],
    events: [],
  };
}
