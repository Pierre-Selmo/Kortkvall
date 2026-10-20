import { makeDeck } from '../vand-tian/cards';
import { shuffle, type Rng } from '../../shared/rng';
import type { FishState } from './state';
import { layBooks, refillEmpty } from './rules';

export function setup(playerIds: string[], rng: Rng): FishState {
  const deck = shuffle(makeDeck(), rng);
  const per = playerIds.length === 2 ? 7 : 5;
  const s: FishState = {
    phase: 'play',
    players: playerIds.map((id) => ({ id, hand: deck.splice(0, per), books: [] })),
    pile: deck,
    current: 0,
    events: [],
  };
  for (const p of s.players) layBooks(s, p);
  refillEmpty(s);
  return s;
}
