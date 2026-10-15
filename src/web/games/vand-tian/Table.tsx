import { useEffect, useMemo, useRef, useState } from 'react';
import { rankOf, value, type CardId, type Rank } from '../../../games/vand-tian/cards';
import type { VTAction, VTEvent } from '../../../games/vand-tian/state';
import type { VTPublicPlayer, VTView } from '../../../games/vand-tian/view';
import type { RoomSnapshot } from '../../../shared/protocol';
import { Card, cardLabel } from '../../components/Card';
import { RulesModal } from '../../components/RulesModal';
import { roomUrl } from '../../nav';
import type { TableProps } from '../registry';
import { Rules } from './Rules';
import { swapIntent, toggleSelect } from './selection';

const RANK_WORD: Partial<Record<Rank, string>> = { J: 'knekt', Q: 'dam', K: 'kung', A: 'ess' };
const rankWord = (r: Rank) => RANK_WORD[r] ?? r;
export const ordinal = (n: number) => `${n}:${n === 1 || n === 2 ? 'a' : 'e'}`;
const genitive = (name: string) => (/[sxz]$/i.test(name) ? name : `${name}s`);

function sortHand(hand: CardId[]): CardId[] {
  return [...hand].sort((a, b) => value(rankOf(a)) - value(rankOf(b)) || a.localeCompare(b));
}

interface Toast { id: number; text: string }

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

/** En bordshög: nedvänt kort med uppvända kort ovanpå. */
function Slot({ faceDown, faceUp, size, onDown, onUp }: {
  faceDown: boolean; faceUp: CardId[]; size: 'md' | 'lg'; onDown?: () => void; onUp?: () => void;
}) {
  return (
    <div className={`slot ${size}`}>
      {faceDown && <Card card="back" size={size} className="down" onClick={onDown} title="Nedvänt kort" />}
      {!faceDown && faceUp.length === 0 && <Card card="empty" size={size} className="down" />}
      {faceUp.map((c) => <Card key={c} card={c} size={size} className="up" onClick={onUp} />)}
      {faceUp.length > 1 && <span className="count">{faceUp.length}</span>}
    </div>
  );
}

function eventText(e: VTEvent, nameOf: (id: string) => string, youId: string): string {
  const you = e.playerId === youId;
  const who = you ? 'Du' : nameOf(e.playerId);
  switch (e.type) {
    case 'burn': return 'Vänd!';
    case 'pickUp': return `${who} tog upp högen (${e.count} kort)`;
    case 'chance': return `${who} chansade: ${cardLabel(e.card)} – ${e.success ? 'lyckades!' : 'tog upp högen'}`;
    case 'faceDown': return `${who} vände ${cardLabel(e.card)} – ${e.success ? 'gick att lägga!' : 'tog upp högen'}`;
    case 'out': return you ? `Du gick ut som ${ordinal(e.place)}!` : `${who} gick ut som ${ordinal(e.place)}`;
  }
}

export function Table({ room, send, isHost, onLeave }: TableProps) {
  const view = room.view as VTView;
  const youId = room.youId;
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?';
  const me = view.players.find((p) => p.id === youId)!;
  const myTurn = view.currentPlayerId === youId;
  const swapPhase = view.phase === 'swap';

  const [selected, setSelected] = useState<CardId[]>([]);
  const [rules, setRules] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [burning, setBurning] = useState(false);
  const round = useMedia('(min-width: 1024px)');
  const toastId = useRef(0);
  const lastSig = useRef<string | null>(null);

  const hand = useMemo(() => sortHand(view.myHand), [view.myHand]);

  // Släpp markeringar som inte längre finns på handen.
  useEffect(() => {
    setSelected((sel) => sel.filter((c) => view.myHand.includes(c)));
  }, [view.myHand]);

  // Visa händelser från det senaste draget som toasts.
  useEffect(() => {
    const sig = JSON.stringify([view.events, view.pileCount, view.deckCount, view.burnedCount, view.currentPlayerId, view.players.map((p) => p.handCount)]);
    const first = lastSig.current === null;
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    if (first || view.events.length === 0) return;
    const add = view.events.map((e) => ({ id: ++toastId.current, text: eventText(e, nameOf, youId) }));
    setToasts((t) => [...t, ...add].slice(-4));
    const ids = add.map((a) => a.id);
    setTimeout(() => setToasts((t) => t.filter((x) => !ids.includes(x.id))), 3200);
    if (view.events.some((e) => e.type === 'burn')) {
      setBurning(true);
      setTimeout(() => setBurning(false), 900);
    }
  }, [view]);

  const act = (action: VTAction) => send({ type: 'action', action });

  function onHandCard(card: CardId) {
    if (swapPhase) {
      if (me.ready) return;
      setSelected((sel) => (sel[0] === card ? [] : [card]));
    } else if (myTurn && view.mySource === 'hand') {
      setSelected((sel) => toggleSelect(sel, card));
    }
  }

  function onMyPile(i: number) {
    const pile = me.faceUp[i];
    if (swapPhase) {
      if (me.ready) return;
      const card = selected[0];
      if (card) {
        const intent = swapIntent(card, pile);
        if (intent === 'swap' || intent === 'stack') act({ type: intent, handCard: card, pileIndex: i });
        else if (pile.length > 1) act({ type: 'unstack', pileIndex: i });
        setSelected([]);
      } else if (pile.length > 1) {
        act({ type: 'unstack', pileIndex: i });
      }
      return;
    }
    if (myTurn && view.mySource === 'faceUp' && pile.length > 0) act({ type: 'playFaceUp', pileIndex: i });
  }

  function onFaceDown(i: number) {
    if (myTurn && view.mySource === 'faceDown' && me.faceDown[i]) act({ type: 'playFaceDown', index: i });
  }

  function playSelected() {
    act({ type: 'play', cards: selected });
    setSelected([]);
  }

  const turnText = (() => {
    if (room.phase === 'finished') return 'Partiet är slut';
    if (swapPhase) return me.ready ? 'Väntar på de andra…' : 'Byt kort – tryck Klar när du är nöjd';
    if (me.place) return `Du gick ut som ${ordinal(me.place)}! Du kan titta på tills partiet är slut.`;
    if (!myTurn) return `${genitive(nameOf(view.currentPlayerId!))} tur`;
    if (view.canChance || view.canPickUp) {
      return view.canChance ? 'Du kan inte lägga – chansa eller ta upp högen' : 'Du kan inte lägga – ta upp högen';
    }
    if (view.mySource === 'faceUp') return 'Din tur – lägg en av dina uppvända högar';
    if (view.mySource === 'faceDown') return 'Din tur – vänd ett av dina nedvända kort';
    const top = view.pileTop.at(-1);
    if (!top || rankOf(top) === '2') return 'Din tur – lägg valfritt kort';
    return `Din tur – lägg ${rankWord(rankOf(top))} eller högre`;
  })();

  const opponents = view.players.filter((p) => p.id !== youId);
  const pileClickable = (i: number) => (swapPhase && !me.ready && (selected.length > 0 || me.faceUp[i].length > 1))
    || (myTurn && view.mySource === 'faceUp' && me.faceUp[i].length > 0);

  async function copyLink() {
    setMenu(false);
    try {
      await navigator.clipboard.writeText(roomUrl(room.code));
    } catch {
      // urklipp nekades
    }
  }

  const center = (
    <div className="center">
      <div>
        <div className="pile" style={{ minWidth: 80 }}>
          {view.deckCount > 0 ? <Card card="back" size="lg" /> : <Card card="empty" size="lg" />}
        </div>
        <div className="stack-label">Dragbunten · {view.deckCount}</div>
      </div>
      <div>
        <div className={burning ? 'pile burn' : 'pile'} aria-live="polite">
          {view.pileTop.length === 0 && <Card card="empty" size="lg" />}
          {view.pileTop.map((c, i) => (
            <Card
              key={c}
              card={c}
              size="lg"
              className={i < view.pileTop.length - 1 ? 'dim' : ''}
              style={{ transform: `translateX(${(i - (view.pileTop.length - 1) / 2) * 18}px)` }}
            />
          ))}
        </div>
        <div className="stack-label">Högen · {view.pileCount}{view.burnedCount > 0 && ` · vända ${view.burnedCount}`}</div>
      </div>
    </div>
  );

  const turnLine = (
    <div className={myTurn || (swapPhase && !me.ready) ? 'turn-line mine' : 'turn-line'}>{turnText}</div>
  );

  const myPiles = (
    <div className="my-piles" aria-label="Dina bordshögar">
      {[0, 1, 2].map((i) => (
        <Slot
          key={i}
          size="lg"
          faceDown={me.faceDown[i]}
          faceUp={me.faceUp[i]}
          onDown={myTurn && view.mySource === 'faceDown' ? () => onFaceDown(i) : undefined}
          onUp={pileClickable(i) ? () => onMyPile(i) : undefined}
        />
      ))}
    </div>
  );

  const handRow = (
    <div className="hand" aria-label="Din hand">
      {hand.map((c) => (
        <Card
          key={c}
          card={c}
          size="lg"
          selected={selected.includes(c)}
          onClick={(swapPhase && !me.ready) || (myTurn && view.mySource === 'hand') ? () => onHandCard(c) : undefined}
        />
      ))}
    </div>
  );

  const actions = (
    <div className="actions">
      {swapPhase && !me.ready && <button className="btn" onClick={() => { setSelected([]); act({ type: 'ready' }); }}>Klar</button>}
      {!swapPhase && myTurn && selected.length > 0 && (
        <button className="btn" onClick={playSelected}>Lägg {selected.length}</button>
      )}
      {!swapPhase && view.canChance && <button className="btn secondary" onClick={() => act({ type: 'chance' })}>Chansa</button>}
      {!swapPhase && view.canPickUp && <button className="btn secondary" onClick={() => act({ type: 'pickUp' })}>Ta upp högen</button>}
    </div>
  );

  const listLayout = (
    <div className="table-grid">
      <aside className="opponents" aria-label="Motståndare">
        {opponents.map((p) => (
          <Opponent key={p.id} p={p} room={room} turn={view.currentPlayerId === p.id} swap={swapPhase} />
        ))}
      </aside>
      <section className="board">
        {center}
        {turnLine}
        {myPiles}
        {handRow}
        {actions}
      </section>
    </div>
  );

  // Runt bordet: jag sitter längst ner, de andra i turordning medurs (till vänster om mig först).
  const myIndex = view.players.findIndex((p) => p.id === youId);
  const seated = [...view.players.slice(myIndex + 1), ...view.players.slice(0, myIndex)];
  const roundLayout = (
    <section className="round-board">
      <div className="round-table">
        <div className="felt">
          {seated.map((p, k) => {
            const angle = ((90 + ((k + 1) * 360) / view.players.length) * Math.PI) / 180;
            return (
              <Seat
                key={p.id}
                p={p}
                room={room}
                turn={view.currentPlayerId === p.id}
                swap={swapPhase}
                x={50 + 40 * Math.cos(angle)}
                y={48 + 32 * Math.sin(angle)}
              />
            );
          })}
          <div className="felt-center">{center}</div>
          <div className={myTurn ? 'my-seat turn' : 'my-seat'}>{myPiles}</div>
        </div>
      </div>
      {turnLine}
      {handRow}
      {actions}
    </section>
  );

  return (
    <div className={round ? 'table-page round' : 'table-page'}>
      <header className="topbar">
        <span className="code">{room.code}</span>
        <span className="title">Vänd tian</span>
        <button className="btn secondary small" onClick={() => setRules(true)}>Regler</button>
        <div className="menu">
          <button className="btn secondary small" aria-label="Meny" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>⋯</button>
          {menu && (
            <div className="menu-list" role="menu">
              <button role="menuitem" onClick={copyLink}>Kopiera länk</button>
              <button role="menuitem" onClick={() => { setMenu(false); onLeave(); }}>Lämna</button>
            </div>
          )}
        </div>
      </header>

      {round ? roundLayout : listLayout}

      {room.phase === 'finished' && room.result && (
        <div className="modal-backdrop">
          <div className="modal result" role="dialog" aria-label="Resultat">
            <h2>{room.result.loserId === youId ? 'Du förlorade!' : 'Partiet är slut'}</h2>
            <ol>
              {room.result.placements.map((id, i) => (
                <li key={id} className={id === room.result!.loserId ? 'loser' : undefined}>
                  <span>{id === room.result!.loserId ? 'Förlorare' : ordinal(i + 1)}</span>
                  <span>{nameOf(id)}{id === youId && ' (du)'}</span>
                </li>
              ))}
            </ol>
            {isHost
              ? <button className="btn" onClick={() => send({ type: 'playAgain' })}>Spela igen</button>
              : <p style={{ color: '#555' }}>Väntar på att värden startar igen…</p>}
            <button className="btn secondary" style={{ color: 'var(--felt-dark)', borderColor: 'var(--felt-dark)' }} onClick={onLeave}>Till startsidan</button>
          </div>
        </div>
      )}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>

      <RulesModal open={rules} onClose={() => setRules(false)}><Rules /></RulesModal>
    </div>
  );
}

function Opponent({ p, room, turn, swap }: { p: VTPublicPlayer; room: RoomSnapshot; turn: boolean; swap: boolean }) {
  const info = room.players.find((x) => x.id === p.id);
  const cls = ['opponent', turn && 'turn', info && !info.connected && 'off'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="name">
        <span>{info?.name ?? '?'}</span>
        {statusBadge(p, room, swap)}
      </div>
      <div className="meta">{p.handCount} kort på handen</div>
      <div className="mini-piles">
        {[0, 1, 2].map((i) => {
          const up = p.faceUp[i];
          if (up.length) return <span key={i} style={{ position: 'relative' }}><Card card={up[up.length - 1]} size="sm" />{up.length > 1 && <span className="badge gold" style={{ position: 'absolute', top: -6, right: -10, fontSize: 10, padding: '0 4px' }}>{up.length}</span>}</span>;
          if (p.faceDown[i]) return <Card key={i} card="back" size="sm" />;
          return <Card key={i} card="empty" size="sm" />;
        })}
      </div>
    </div>
  );
}

function statusBadge(p: VTPublicPlayer, room: RoomSnapshot, swap: boolean) {
  const info = room.players.find((x) => x.id === p.id);
  if (room.result?.loserId === p.id) return <span className="badge place">förlorade</span>;
  if (p.place) return <span className="badge gold place">{ordinal(p.place)}</span>;
  if (info && !info.connected) return <span className="badge">frånkopplad</span>;
  if (swap && p.ready) return <span className="badge">klar</span>;
  return null;
}

/** En motståndare som sitter vid bordet: namnskylt, korten på handen och bordshögarna mot mitten. */
function Seat({ p, room, turn, swap, x, y }: {
  p: VTPublicPlayer; room: RoomSnapshot; turn: boolean; swap: boolean; x: number; y: number;
}) {
  const info = room.players.find((q) => q.id === p.id);
  const cls = ['seat', turn && 'turn', info && !info.connected && 'off', p.place && 'out'].filter(Boolean).join(' ');
  const shown = Math.min(p.handCount, 7);
  return (
    <div className={cls} style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="seat-head">
        <div className="seat-plate">
          <span className="seat-name">{info?.name ?? '?'}</span>
          {statusBadge(p, room, swap)}
        </div>
        <div className="seat-hand" title={`${p.handCount} kort på handen`}>
          {Array.from({ length: shown }, (_, i) => <Card key={i} card="back" size="sm" />)}
          <span className="seat-count">{p.handCount}</span>
        </div>
      </div>
      <div className="seat-piles">
        {[0, 1, 2].map((i) => <Slot key={i} size="md" faceDown={p.faceDown[i]} faceUp={p.faceUp[i]} />)}
      </div>
    </div>
  );
}
