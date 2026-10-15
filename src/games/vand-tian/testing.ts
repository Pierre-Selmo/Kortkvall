import type { VTPlayer, VTState } from './state';

/** Builds a state for tests, filling in defaults. */
export function testState(p: Partial<Omit<VTState, 'players'>> & { players: Partial<VTPlayer>[] }): VTState {
  return {
    phase: 'play',
    deck: [],
    pile: [],
    burnedCount: 0,
    current: 0,
    finishOrder: [],
    events: [],
    ...p,
    players: p.players.map((pl, i) => ({
      id: `p${i}`,
      hand: [],
      faceUp: [[], [], []],
      faceDown: [null, null, null],
      ready: true,
      ...pl,
    })),
  };
}
