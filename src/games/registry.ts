import type { GameDefinition } from './types';
import { ludo } from './ludo';
import { vandTian } from './vand-tian';

export const games: Record<string, GameDefinition<any, any, any>> = {
  [vandTian.id]: vandTian,
  [ludo.id]: ludo,
};
