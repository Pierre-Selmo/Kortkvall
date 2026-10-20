import { useEffect, useState } from 'react';
import type { FishEvent } from '../../../games/finns-i-sjon/state';
import type { FishView, FishPublicPlayer } from '../../../games/finns-i-sjon/view';
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

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

export function Table({ room, send, isHost, onLeave }: TableProps) {
  const view = room.view as FishView;
  const youId = room.youId;
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?';
  const myTurn = view.currentPlayerId === youId;
  const me = view.players.find((p) => p.id === youId);
  const [selected, setSelected] = useState<Rank | null>(null);
  const [rules, setRules] = useState(false);
  const round = useMedia('(min-width: 1024px)');

  // Valet gäller bara under min tur, och bara om jag fortfarande har valören.
  const rank = myTurn && !view.awaiting && selected && view.askable.includes(selected) ? selected : null;
  const pickable = myTurn && view.awaiting;

  const ask = (targetId: string) => {
    if (!rank) return;
    send({ type: 'action', action: { type: 'ask', targetId, rank } });
    setSelected(null);
  };

  const pick = (index: number) => {
    if (!pickable) return;
    send({ type: 'action', action: { type: 'pick', index } });
  };

  // Motspelarna i ordning från mig, så som de sitter runt bordet.
  const myIndex = view.players.findIndex((p) => p.id === youId);
  const seated = [...view.players.slice(myIndex + 1), ...view.players.slice(0, myIndex)];
  const n = view.players.length;

  const turnText = (() => {
    if (view.phase === 'finished') return 'Partiet är slut';
    if (pickable) return 'Välj ett kort i sjön – det visas bara om det har samma valör som du frågade efter';
    if (view.awaiting) return `${nameOf(view.currentPlayerId ?? '')} väljer ett kort i sjön`;
    if (myTurn && rank) return `Klicka på en motspelare och fråga efter ${PLURAL[rank]}`;
    if (myTurn) return 'Din tur – välj en valör på dina kort';
    return `${nameOf(view.currentPlayerId ?? '')}s tur`;
  })();

  const pile = (
    <div className="fish-pile" aria-label={`Sjön, ${view.pileCount} kort`}>
      {view.pileCount === 0 && <Card card="empty" size="sm" />}
      {Array.from({ length: view.pileCount }, (_, i) => (
        <Card
          key={i}
          card="back"
          size="sm"
          onClick={pickable ? () => pick(i) : undefined}
          title={pickable ? 'Välj det här kortet' : undefined}
        />
      ))}
    </div>
  );

  const handRow = (
    <div className="fish-hand" aria-label="Din hand">
      {view.myHand.map((c) => {
        const r = rankOf(c);
        const clickable = myTurn && !view.awaiting && view.askable.includes(r);
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
  );

  const log = (
    <div className="ludo-log muted" aria-live="polite">
      {view.events.map((e) => eventText(e, nameOf, youId)).join(' · ')}
    </div>
  );

  const myBooks = (
    <div className="fish-books muted">
      Dina fyrtal: {me && me.books.length > 0 ? me.books.join(' ') : '–'}
    </div>
  );

  const seatProps = (p: FishPublicPlayer) => ({
    p,
    turn: view.currentPlayerId === p.id,
    canTarget: !!rank,
    onAsk: () => ask(p.id),
  });

  return (
    <div className="table-page">
      <header className="topbar">
        <span className="code">{room.code}</span>
        <span className="title">Finns i sjön</span>
        <button className="btn secondary small" onClick={() => setRules(true)}>Regler</button>
        <button className="btn danger small" onClick={onLeave}>Lämna</button>
      </header>

      {round ? (
        <section className="round-board">
          <div className="round-table">
            <div className="felt">
              {seated.map((p, k) => {
                const angle = ((90 + ((k + 1) * 360) / n) * Math.PI) / 180;
                return (
                  <FishSeat
                    key={p.id}
                    x={50 + 40 * Math.cos(angle)}
                    y={48 + 32 * Math.sin(angle)}
                    name={nameOf(p.id)}
                    {...seatProps(p)}
                  />
                );
              })}
              <div className="felt-center">
                {pile}
                <div className="stack-label">Sjön · {view.pileCount} kort</div>
              </div>
              <div className={myTurn ? 'my-seat turn' : 'my-seat'}>{myBooks}</div>
            </div>
          </div>
          <div className={myTurn ? 'turn-line mine' : 'turn-line'}>{turnText}</div>
          {handRow}
          {log}
        </section>
      ) : (
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
          <div className="stack-label">Sjön · {view.pileCount} kort</div>
          {pile}
          <div className={myTurn ? 'turn-line mine' : 'turn-line'}>{turnText}</div>
          {handRow}
          {myBooks}
          {log}
        </main>
      )}

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

function FishSeat({ p, name, turn, canTarget, onAsk, x, y }: {
  p: FishPublicPlayer; name: string; turn: boolean; canTarget: boolean; onAsk(): void; x: number; y: number;
}) {
  const cls = ['seat', turn && 'turn', canTarget && 'target'].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={canTarget ? onAsk : undefined}
      role={canTarget ? 'button' : undefined}
    >
      <div className="seat-head">
        <div className="seat-plate">
          <span className="seat-name">{name}</span>
          <span className="badge">{p.books.length} fyrtal</span>
        </div>
        <div className="seat-hand" title={`${p.handCount} kort på handen`}>
          {Array.from({ length: Math.min(p.handCount, 7) }, (_, i) => <Card key={i} card="back" size="sm" />)}
          <span className="seat-count">{p.handCount}</span>
        </div>
      </div>
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
        ? `${who(e.playerId)} valde ${cardLabel(e.shown)} och får fråga igen`
        : `${who(e.playerId)} valde ett kort i sjön`;
    case 'book':
      return `${who(e.playerId)} lade ut fyra ${PLURAL[e.rank]}`;
  }
}
