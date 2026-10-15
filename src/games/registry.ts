import type { GameDefinition } from './types';
import { vandTian } from './vand-tian';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const games: Record<string, GameDefinition<any, any, any>> = {
  [vandTian.id]: vandTian,
};
