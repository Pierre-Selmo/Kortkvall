import type { Rng } from '../shared/rng';

/** placements: först ut först, förloraren sist. */
export interface GameResult {
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
  /** Bara det spelaren får se. */
  viewFor(state: S, playerId: string): V;
  /** null medan spelet pågår. */
  result(state: S): GameResult | null;
}
