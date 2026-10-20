import { useState } from 'react';
import type { FishEvent } from '../../../games/finns-i-sjon/state';
import type { FishView } from '../../../games/finns-i-sjon/view';
import { rankOf, type Rank } from '../../../games/vand-tian/cards';
import { Card, cardLabel } from '../../components/Card';
import { RulesModal } from '../../components/RulesModal';
import type { TableProps } from '../registry';
import { ordinal } from '../vand-tian/Table';
import { Rules } from './Rules';

/** Valörer i pluralis, så att frågan blir "Har du några åttor?" */
const PLURAL: Record<Rank, string> = {
  '2': 'tvåor', '3': 'treor', '4': 'fyror', '5': 'femmor', '6': 'sexor', '7': 'sjuor', '8': 'åttor',
  '9': 'nior', '10': 'tior', J: 'knektar', Q: 'damer', K: 'kungar', A: 'ess',
};

export function Table({ room, send, isHost, onLeave }: TableProps) {
  const view = room.view as FishView;
  const youId = room.youId;
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?';
  const myTurn = view.currentPlayerId === youId;
  const me = view.players.find((p) => p.id === youId);
  const [selected, setSelected] = useState<Rank | null>(null);
  const [rules, setRules] = useState(false);

  // Valet gäller bara under min tur och bara om jag fortfarande har valören.
  const rank = myTurn && selected && view.askable.includes(selected) ? selected : null;

  const ask = (targetId: string) => {
    if (!rank) return;
    send({ type: 'action', action: { type: 'ask', targetId, rank } });
    setSelected(null);
  };

  const turnText = (() => {
    if (view.phase === 'finished') return 'Partiet är slut';
    if (myTurn && rank) return `Klicka på en motspelare och fråga efter ${PLURAL[rank]}`;
    if (myTurn) return 'Din tur – välj en valör på dina kort';
    return `${nameOf(view.currentPlayerId ?? '')}s tur`;
  })();

  return (
    <div className="table-page">
      <header className="topbar">
        <span className="code">{room.code}</span>
        <span className="title">Finns i sjön</span>
        <button className="btn secondary small" onClick={() => setRules(true)}>Regler</button>
        <button className="btn danger small" onClick={onLeave}>Lämna</button>
      </header>

      <main className="ludo-wrap">
        <div className="ludo-players">
          {view.players.filter((p) => p.id !== youId).map((p) => (
            <button
              key={p.id}
              className={`ludo-chip${view.currentPlayerId === p.id ? ' turn' : ''}${rank ? ' target' : ''}`}
              onClick={rank ? () => ask(p.id) : undefined}
              disabled={!rank}
              type="button"
            >
              <span className="ludo-name">{nameOf(p.id)}</span>
              <span className="muted">{p.handCount} kort</span>
              <span className="muted">{p.books.length} fyrtal</span>
            </button>
          ))}
        </div>

        <div className="fish-center">
          <div className="pile">
            {view.pileCount > 0 ? <Card card="back" size="lg" /> : <Card card="empty" size="lg" />}
          </div>
          <div className="stack-label">Sjön · {view.pileCount} kort</div>
        </div>

        <div className={myTurn ? 'turn-line mine' : 'turn-line'}>{turnText}</div>

        <div className="fish-hand" aria-label="Din hand">
          {view.myHand.map((c) => {
            const r = rankOf(c);
            const clickable = myTurn && view.askable.includes(r);
            return (
              <Card
                key={c}
                card={c}
                size="lg"
                selected={rank !== null && r === rank}
                onClick={clickable ? () => setSelected(selected === r ? null : r) : undefined}
              />
            );
          })}
        </div>

        <div className="fish-books muted">
          Dina fyrtal: {me && me.books.length > 0 ? me.books.join(' ') : '–'}
        </div>

        <div className="ludo-log muted" aria-live="polite">
          {view.events.map((e) => eventText(e, nameOf, youId)).join(' · ')}
        </div>
      </main>

      {view.phase === 'finished' && room.result && (
        <div className="modal-backdrop">
          <div className="modal result" role="dialog" aria-label="Resultat">
            <h2>{room.result.loserId === youId ? 'Du förlorade!' : 'Partiet är slut'}</h2>
            <ol>
              {room.result.placements.map((id, i) => {
                const p = view.players.find((x) => x.id === id);
                return (
                  <li key={id} className={id === room.result!.loserId ? 'loser' : undefined}>
                    <span>{ordinal(i + 1)}</span>
                    <span>{nameOf(id)}{id === youId && ' (du)'} · {p?.books.length ?? 0} fyrtal</span>
                  </li>
                );
              })}
            </ol>
            {isHost
              ? <button className="btn" onClick={() => send({ type: 'playAgain' })}>Spela igen</button>
              : <p style={{ color: '#555' }}>Väntar på att värden startar igen…</p>}
            <button className="btn secondary" style={{ color: 'var(--felt-dark)', borderColor: 'var(--felt-dark)' }} onClick={onLeave}>Till startsidan</button>
          </div>
        </div>
      )}

      <RulesModal open={rules} onClose={() => setRules(false)}><Rules /></RulesModal>
    </div>
  );
}

function eventText(e: FishEvent, nameOf: (id: string) => string, youId: string): string {
  const who = (id: string) => (id === youId ? 'Du' : nameOf(id));
  const whom = (id: string) => (id === youId ? 'dig' : nameOf(id));
  switch (e.type) {
    case 'ask':
      return e.hits > 0
        ? `${who(e.playerId)} fick ${e.hits} ${PLURAL[e.rank]} av ${whom(e.targetId)}`
        : `${who(e.playerId)} frågade ${whom(e.targetId)} efter ${PLURAL[e.rank]}: Finns i sjön!`;
    case 'fish':
      return e.shown
        ? `${who(e.playerId)} drog ${cardLabel(e.shown)} och får fråga igen`
        : `${who(e.playerId)} drog ett kort från sjön`;
    case 'book':
      return `${who(e.playerId)} lade ut fyra ${PLURAL[e.rank]}`;
  }
}
