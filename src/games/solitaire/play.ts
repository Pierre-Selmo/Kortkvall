import type { Rng } from '../../shared/rng';
import type { ActionResult, GameResult } from '../types';
import type { CardId } from '../vand-tian/cards';
import { canPlace, hasMove, peek } from './rules';
import type { SolAction, SolState, Source, Target } from './state';

const fail = (error: string) => ({ ok: false as const, error });

/** Tar bort korten från källan. Vänder ett dolt kort som blir översta öppna. Muterar. */
function take(s: SolState, from: Source): void {
  if (from.kind === 'waste') {
    s.waste.pop();
  } else if (from.kind === 'foundation') {
    s.foundations[from.suit].pop();
  } else {
    const col = s.tableau[from.col];
    col.up.splice(col.up.length - from.count, from.count);
    if (col.up.length === 0 && col.down.length > 0) col.up.push(col.down.pop()!);
  }
}

function place(s: SolState, cards: CardId[], to: Target): void {
  if (to.kind === 'tableau') s.tableau[to.col].up.push(...cards);
  else s.foundations[to.suit].push(...cards);
}

export function applySolitaireAction(state: SolState, playerId: string, a: SolAction, _rng: Rng): ActionResult<SolState> {
  if (state.phase === 'finished') return fail('Spelet är slut');
  if (playerId !== state.playerId) return fail('Det här är inte ditt spel');

  const s = structuredClone(state);

  if (a.type === 'draw') {
    if (s.stock.length > 0) {
      s.waste.push(s.stock.shift()!);
    } else if (s.waste.length > 0) {
      // Talongen tar tillbaka skräphögen i samma ordning, med baksidan upp.
      s.stock = [...s.waste];
      s.waste = [];
    } else {
      return fail('Det finns inga kort kvar att dra');
    }
  } else {
    if (a.type !== 'move') return fail('Ogiltigt drag');
    const cards = peek(s, a.from);
    if (!cards) return fail('Det går inte att ta de korten');
    if (a.to.kind === 'tableau' && a.from.kind === 'tableau' && a.from.col === a.to.col) return fail('Korten ligger redan där');
    if (!canPlace(s, cards, a.to)) return fail('Det kortet får inte läggas där');
    take(s, a.from);
    place(s, cards, a.to);
  }

  const won = s.foundations.S.length + s.foundations.H.length + s.foundations.D.length + s.foundations.C.length === 52;
  if (won) {
    s.phase = 'finished';
    s.won = true;
  } else if (s.stock.length === 0 && s.waste.length === 0 && !hasMove(s)) {
    // Blockerat läge: inga drag kvar.
    s.phase = 'finished';
    s.won = false;
  }
  return { ok: true, state: s };
}

export function solitaireResult(s: SolState): GameResult | null {
  if (s.phase !== 'finished') return null;
  return { placements: [s.playerId], loserId: s.playerId };
}
