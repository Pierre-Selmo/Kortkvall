import type { Rng } from '../shared/rng';

export interface GameResult {
  /** Player ids, first out first; the loser last. */
  placements: string[];
  loserId: string;
}

export type ActionResult<S> = { ok: true; state: S } | { ok: false; error: string };

export interface GameDefinition<S, A, V> {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  setup(playerIds: string[], rng: Rng): S;
  applyAction(state: S, playerId: string, action: A, rng: Rng): ActionResult<S>;
  /** Only what this player is allowed to see. */
  viewFor(state: S, playerId: string): V;
  /** null while the game is running. */
  result(state: S): GameResult | null;
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}
