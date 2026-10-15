import { useState, type FormEvent } from 'react';
import { normalizeCode } from '../../worker/codes';
import { createRoom, load, NAME_KEY, store } from '../api';
import { RulesModal } from '../components/RulesModal';
import { comingSoon, webGames, type WebGame } from '../games/registry';
import { navigate } from '../nav';
import { SITE_NAME } from '../site';

export function StartPage() {
  const [rulesFor, setRulesFor] = useState<WebGame | null>(null);
  const [creating, setCreating] = useState<WebGame | null>(null);
  const [name, setName] = useState(() => load(NAME_KEY) ?? '');
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!creating || !name.trim()) return;
    setBusy(true);
    setCreateError(null);
    try {
      const roomCode = await createRoom(creating.id);
      store(NAME_KEY, name.trim());
      navigate(`/r/${roomCode}`);
    } catch (err) {
      setCreateError((err as Error).message);
      setBusy(false);
    }
  }

  function onJoin(e: FormEvent) {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!c) return setCodeError('Ogiltig kod');
    navigate(`/r/${c}`);
  }

  return (
    <main className="page">
      <header className="hero">
        <h1 className="site-title">{SITE_NAME}</h1>
        <p>Spela kort med vänner – var och en på sin egen skärm.</p>
      </header>

      <section className="games" aria-label="Spel">
        {webGames.map((g) => (
          <article key={g.id} className="game-tile">
            <div className="icon" aria-hidden>{g.icon}</div>
            <h2>{g.name}</h2>
            <div className="muted">{g.players}</div>
            {creating?.id === g.id ? (
              <form className="row" onSubmit={onCreate}>
                <input
                  className="input"
                  autoFocus
                  placeholder="Ditt namn"
                  maxLength={16}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ flex: 1 }}
                  aria-label="Ditt namn"
                />
                <button className="btn" disabled={busy || !name.trim()}>{busy ? 'Skapar…' : 'Skapa rum'}</button>
                {createError && <div className="error-text">{createError}</div>}
              </form>
            ) : (
              <div className="row">
                <button className="btn" onClick={() => setCreating(g)}>Spela</button>
                <button className="btn secondary small" onClick={() => setRulesFor(g)}>Regler</button>
              </div>
            )}
          </article>
        ))}
        {comingSoon.map((g) => (
          <article key={g.name} className="game-tile soon" aria-disabled>
            <div className="icon" aria-hidden>{g.icon}</div>
            <h2>{g.name}</h2>
            <div><span className="badge">Kommer snart</span></div>
          </article>
        ))}
      </section>

      <form className="join-box panel" onSubmit={onJoin}>
        <label htmlFor="code" style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>Har du en kod?</label>
        <div className="row" style={{ justifyContent: 'center' }}>
          <input
            id="code"
            className="input code"
            placeholder="KXQT"
            maxLength={4}
            value={code}
            onChange={(e) => { setCode(e.target.value); setCodeError(null); }}
            autoComplete="off"
          />
          <button className="btn">Gå med</button>
        </div>
        {codeError && <div className="error-text">{codeError}</div>}
      </form>

      <RulesModal open={!!rulesFor} onClose={() => setRulesFor(null)}>
        {rulesFor && <rulesFor.Rules />}
      </RulesModal>
    </main>
  );
}
