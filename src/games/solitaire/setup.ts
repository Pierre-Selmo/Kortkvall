import { makeDeck } from '../vand-tian/cards';
import { shuffle, type Rng } from '../../shared/rng';
import type { SolState } from './state';

/** Vanlig Klondike-utdelning: kolumn 1–7 med 1–7 kort, översta kortet öppet. */
export function setup(playerIds: string[], rng: Rng): SolState {
  const deck = shuffle(makeDeck(), rng);
  const tableau = Array.from({ length: 7 }, (_, i) => ({
    down: deck.splice(0, i),
    up: deck.splice(0, 1),
  }));
  return {
    phase: 'play',
    won: false,
    playerId: playerIds[0],
    stock: deck,
    waste: [],
    foundations: { S: [], H: [], D: [], C: [] },
    tableau,
  };
}

