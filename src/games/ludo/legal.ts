import { GOAL, NEST } from './state';

/** Vilka pjäser kan flyttas med ett slag? En pjäs i boet kommer bara ut med en 6:a. */
export function legalPieces(pieces: readonly number[], dice: number): number[] {
  return pieces.flatMap((q, i) => ((q === NEST ? dice === 6 : q + dice <= GOAL) ? [i] : []));
}
