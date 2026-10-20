import type { Rng } from '../../shared/rng';
import type { ActionResult, GameResult } from '../types';
import { legalPieces } from './legal';
import { GOAL, LAST_TRACK, NEST, SAFE, START, type LudoAction, type LudoState } from './state';

const fail = (error: string) => ({ ok: false as const, error });

/** Gemensam bana: färgen startar på sin startruta och går 51 rutor medurs. */
export function trackIndex(color: number, progress: number): number {
  return (START[color] + progress) % 52;
}

function nextActive(s: LudoState, from: number): number {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!s.finishOrder.includes(s.players[i].id)) return i;
  }
  return from;
}

export function applyLudoAction(state: LudoState, playerId: string, a: LudoAction, rng: Rng): ActionResult<LudoState> {
  if (state.phase === 'finished') return fail('Spelet är slut');
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return fail('Okänd spelare');
  if (idx !== state.current) return fail('Det är inte din tur');

  const s = structuredClone(state);
  const p = s.players[idx];
  s.events = [];

  switch (a.type) {
    case 'roll': {
      if (s.phase !== 'roll') return fail('Du har redan slagit');
      const value = Math.floor(rng() * 6) + 1;
      s.events.push({ type: 'roll', playerId, value });
      if (legalPieces(p.pieces, value).length === 0) {
        // Inget drag: turen går vidare.
        s.dice = null;
        s.current = nextActive(s, idx);
      } else {
        s.dice = value;
        s.phase = 'move';
      }
      return { ok: true, state: s };
    }
    case 'move': {
      if (s.phase !== 'move' || s.dice === null) return fail('Slå tärningen först');
      const dice = s.dice;
      if (!legalPieces(p.pieces, dice).includes(a.pieceIndex)) return fail('Den pjäsen kan inte flyttas');

      const q = p.pieces[a.pieceIndex];
      const next = q === NEST ? 0 : q + dice;
      p.pieces[a.pieceIndex] = next;

      // Landar man på en motståndares pjäs på banan skickas den tillbaka till boet.
      const square = next <= LAST_TRACK ? trackIndex(idx, next) : -1;
      if (square >= 0 && !SAFE.includes(square)) {
        s.players.forEach((o, oi) => {
          if (oi === idx) return;
          o.pieces.forEach((oq, j) => {
            if (oq >= 0 && oq <= LAST_TRACK && trackIndex(oi, oq) === square) {
              o.pieces[j] = NEST;
              s.events.push({ type: 'knock', playerId, victimId: o.id });
            }
          });
        });
      }

      s.dice = null;
      s.phase = 'roll';

      if (p.pieces.every((x) => x === GOAL)) {
        s.finishOrder.push(p.id);
        s.events.push({ type: 'finish', playerId, place: s.finishOrder.length });
        const left = s.players.filter((pl) => !s.finishOrder.includes(pl.id));
        if (left.length <= 1) {
          s.finishOrder.push(...left.map((pl) => pl.id));
          s.phase = 'finished';
          return { ok: true, state: s };
        }
        s.current = nextActive(s, idx);
        return { ok: true, state: s };
      }

      // En 6:a ger ett extra slag.
      if (dice !== 6) s.current = nextActive(s, idx);
      return { ok: true, state: s };
    }
    default:
      return fail('Ogiltigt drag');
  }
}

export function ludoResult(s: LudoState): GameResult | null {
  if (s.phase !== 'finished') return null;
  return { placements: [...s.finishOrder], loserId: s.finishOrder[s.finishOrder.length - 1] };
}
