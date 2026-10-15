import type { VTPlayer, VTState } from './state';

/** Bygger ett läge för tester med rimliga standardvärden. */
export function testState(p: Partial<Omit<VTState, 'players'>> & { players: Partial<VTPlayer>[] }): VTState {
  const { players, ...rest } = p;
  return {
    phase: 'play',
    deck: [],
    pile: [],
    burnedCount: 0,
    current: 0,
    finishOrder: [],
    events: [],
    ...rest,
    players: players.map((pl, i) => ({
      id: `p${i}`,
      hand: [],
      faceUp: [[], [], []],
      faceDown: [null, null, null],
      ready: true,
      ...pl,
    })),
  };
}
