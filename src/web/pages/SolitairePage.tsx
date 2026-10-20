import { useEffect, useState } from 'react';
import { cryptoRng } from '../../shared/rng';
import { applySolitaireAction } from '../../games/solitaire/play';
import { setup } from '../../games/solitaire/setup';
import type { SolAction, SolState } from '../../games/solitaire/state';
import { viewFor } from '../../games/solitaire/view';
import { SolitaireBoard } from '../games/solitaire/Board';
import { Rules } from '../games/solitaire/Rules';
import { RulesModal } from '../components/RulesModal';
import { navigate } from '../nav';

const KEY = 'kortkvall:solitaire';
const PLAYER = 'me';
/** Hur många drag man kan ångra. */
const MAX_UNDO = 100;

interface Saved {
  state: SolState;
  history: SolState[];
}

function newGame(): Saved {
  return { state: setup([PLAYER], cryptoRng), history: [] };
}

/** Sparat spel i webbläsaren, om det finns och ser ut som ett Klondike-spel. Annars nytt. */
function loadGame(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved> & Partial<SolState>;
      const state = parsed.state ?? (parsed.tableau ? (parsed as SolState) : undefined);
      if (state && Array.isArray(state.tableau) && Array.isArray(state.stock)) {
        return { state, history: Array.isArray(parsed.history) ? parsed.history : [] };
      }
    }
  } catch {
    // ingen åtkomst till lagringen – börja med ett nytt spel
  }
  return newGame();
}

function saveGame(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // spelet fungerar även utan sparning
  }
}

export function SolitairePage() {
  const [saved, setSaved] = useState<Saved>(loadGame);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  const { state, history } = saved;

  useEffect(() => saveGame(saved), [saved]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const onAction = (a: SolAction) => {
    const r = applySolitaireAction(state, PLAYER, a, cryptoRng);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setSaved({
      state: r.state,
      history: [...history, state].slice(-MAX_UNDO),
    });
  };

  const undo = () => {
    if (history.length === 0) return;
    setError(null);
    setSaved({ state: history[history.length - 1], history: history.slice(0, -1) });
  };

  const reset = () => {
    if (state.phase === 'play' && !window.confirm('Vill du starta om spelet? Det här spelet försvinner.')) return;
    setSaved(newGame());
    setError(null);
  };

  return (
    <div className="table-page">
      <header className="topbar">
        <button className="btn secondary small" onClick={() => navigate('/')}>← Startsidan</button>
        <span className="title">Solitaire</span>
        <button className="btn secondary small" onClick={() => setRules(true)}>Regler</button>
        <button className="btn secondary small" onClick={undo} disabled={history.length === 0} title="Ta tillbaka det senaste draget">Ångra</button>
        <button className="btn small" onClick={reset}>Starta om</button>
      </header>

      <SolitaireBoard view={viewFor(state, PLAYER)} onAction={onAction} />

      {error && (
        <div className="toast-stack"><div className="toast error" role="alert">{error}</div></div>
      )}

      <RulesModal open={rules} onClose={() => setRules(false)}><Rules /></RulesModal>
    </div>
  );
}
