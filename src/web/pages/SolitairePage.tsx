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

function newGame(): SolState {
  return setup([PLAYER], cryptoRng);
}

/** Sparat spel i webbläsaren, om det finns och ser ut som ett Klondike-spel. Annars nytt. */
function loadGame(): SolState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as SolState;
      if (Array.isArray(s.tableau) && Array.isArray(s.stock)) return s;
    }
  } catch {
    // ingen åtkomst till lagringen – börja med ett nytt spel
  }
  return newGame();
}

function saveGame(s: SolState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // spelet fungerar även utan sparning
  }
}

export function SolitairePage() {
  const [state, setState] = useState<SolState>(loadGame);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState(false);

  useEffect(() => saveGame(state), [state]);

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
    setState(r.state);
  };

  const reset = () => {
    if (state.phase === 'play' && !window.confirm('Vill du starta om spelet? Det här spelet försvinner.')) return;
    setState(newGame());
    setError(null);
  };

  return (
    <div className="table-page">
      <header className="topbar">
        <button className="btn secondary small" onClick={() => navigate('/')}>← Startsidan</button>
        <span className="title">Solitaire</span>
        <button className="btn secondary small" onClick={() => setRules(true)}>Regler</button>
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
