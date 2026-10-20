import { useState } from 'react';
import type { LudoEvent } from '../../../games/ludo/state';
import { START } from '../../../games/ludo/state';
import type { LudoView } from '../../../games/ludo/view';
import { RulesModal } from '../../components/RulesModal';
import type { TableProps } from '../registry';
import { ordinal } from '../vand-tian/Table';
import { CELL, COLORS, HOME, NEST_ORIGIN, SAFE_CELLS, SIZE, TRACK, arrowPoints, pieceCell, starPoints } from './board';
import { Rules } from './Rules';

const genitive = (name: string) => (/[sxz]$/i.test(name) ? name : `${name}s`);

export function Table({ room, send, isHost, onLeave }: TableProps) {
  const view = room.view as LudoView;
  const youId = room.youId;
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?';
  const myTurn = view.currentPlayerId === youId;
  const legal = new Set(view.legal);
  const [rules, setRules] = useState(false);

  const act = (action: { type: 'roll' } | { type: 'move'; pieceIndex: number }) => send({ type: 'action', action });

  // Alla pjäser med sin ruta. Flera pjäser på samma ruta förskjuts så att de syns.
  const raw = view.players.flatMap((p, color) => p.pieces.map((q, j) => {
    const [c, r] = pieceCell(color, q, j);
    return { color, j, c, r, clickable: p.id === youId && legal.has(j) };
  }));
  const seen = new Map<string, number>();
  const pieces = raw.map((p) => {
    const key = `${p.c},${p.r}`;
    const total = raw.filter((o) => o.c === p.c && o.r === p.r).length;
    const k = seen.get(key) ?? 0;
    seen.set(key, k + 1);
    const offsets = [[-9, -9], [9, -9], [-9, 9], [9, 9]];
    const [dx, dy] = total > 1 ? offsets[k % 4] : [0, 0];
    return { ...p, x: p.c * CELL + CELL / 2 + dx, y: p.r * CELL + CELL / 2 + dy };
  });

  const turnText = (() => {
    if (view.phase === 'finished') return 'Partiet är slut';
    if (myTurn && view.phase === 'roll') return 'Din tur – slå tärningen';
    if (myTurn && view.phase === 'move') return legal.size ? 'Välj en pjäs att flytta' : 'Inget drag – du passar';
    return `${genitive(nameOf(view.currentPlayerId ?? ''))} tur`;
  })();

  const lastEvents = view.events.map((e) => eventText(e, nameOf, youId)).join(' · ');

  return (
    <div className="table-page">
      <header className="topbar">
        <span className="code">{room.code}</span>
        <span className="title">Ludo</span>
        <button className="btn secondary small" onClick={() => setRules(true)}>Regler</button>
        <button className="btn danger small" onClick={onLeave}>Lämna</button>
      </header>

      <main className="ludo-wrap">
        <div className="ludo-players">
          {view.players.map((p, c) => {
            const home = p.pieces.filter((q) => q === 56).length;
            const isTurn = view.currentPlayerId === p.id;
            return (
              <div key={p.id} className={isTurn ? 'ludo-chip turn' : 'ludo-chip'} style={{ borderColor: COLORS[c] }}>
                <span className="ludo-dot" style={{ background: COLORS[c] }} />
                <span className="ludo-name">{nameOf(p.id)}{p.id === youId && ' (du)'}</span>
                <span className="muted">{home}/4 i mål</span>
                {p.place && <span className="badge gold place">{ordinal(p.place)}</span>}
              </div>
            );
          })}
        </div>

        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="ludo-board" role="img" aria-label="Ludobräde">
          <rect width={SIZE} height={SIZE} rx={14} fill="#ffffff" />
          {/* Boet: färgad kvadrat med vit ruta där pjäserna står */}
          {COLORS.map((col, c) => (
            <g key={`nest${c}`}>
              <rect x={NEST_ORIGIN[c][0] * CELL} y={NEST_ORIGIN[c][1] * CELL} width={6 * CELL} height={6 * CELL} fill={col} />
              <rect x={(NEST_ORIGIN[c][0] + 1) * CELL} y={(NEST_ORIGIN[c][1] + 1) * CELL} width={4 * CELL} height={4 * CELL} rx={8} fill="#ffffff" />
            </g>
          ))}
          {/* Banan */}
          {TRACK.map(([c, r], i) => (
            <rect
              key={`t${i}`}
              x={c * CELL + 1} y={r * CELL + 1} width={CELL - 2} height={CELL - 2}
              fill={START.includes(i) ? COLORS[START.indexOf(i)] : '#ffffff'}
              stroke="#333333" strokeWidth={1.5}
            />
          ))}
          {/* Startpilar: pekar in på banan från varje färgs startruta */}
          {START.map((s, c) => (
            <polygon
              key={`a${c}`}
              points={arrowPoints(TRACK[s], TRACK[(s + 1) % 52])}
              fill="#ffffff" stroke="#333333" strokeWidth={1.5} strokeLinejoin="round"
            />
          ))}
          {/* Trygga stjärnor */}
          {SAFE_CELLS.map((i) => {
            const [c, r] = TRACK[i];
            return (
              <polygon
                key={`s${i}`}
                points={starPoints(c * CELL + CELL / 2, r * CELL + CELL / 2, 15, 6)}
                fill="#ffffff" stroke="#333333" strokeWidth={1.5} strokeLinejoin="round"
              />
            );
          })}
          {/* Hemfälten */}
          {HOME.map((lane, c) => lane.map(([c2, r2], k) => (
            <rect key={`h${c}-${k}`} x={c2 * CELL + 1} y={r2 * CELL + 1} width={CELL - 2} height={CELL - 2} fill={COLORS[c]} stroke="#333333" strokeWidth={1.5} />
          )))}
          {/* Mittenrutan i fyra färgade trianglar */}
          <polygon points={`${6 * CELL},${6 * CELL} ${9 * CELL},${6 * CELL} ${7.5 * CELL},${7.5 * CELL}`} fill={COLORS[2]} stroke="#333333" strokeWidth={1.5} />
          <polygon points={`${9 * CELL},${6 * CELL} ${9 * CELL},${9 * CELL} ${7.5 * CELL},${7.5 * CELL}`} fill={COLORS[3]} stroke="#333333" strokeWidth={1.5} />
          <polygon points={`${9 * CELL},${9 * CELL} ${6 * CELL},${9 * CELL} ${7.5 * CELL},${7.5 * CELL}`} fill={COLORS[0]} stroke="#333333" strokeWidth={1.5} />
          <polygon points={`${6 * CELL},${9 * CELL} ${6 * CELL},${6 * CELL} ${7.5 * CELL},${7.5 * CELL}`} fill={COLORS[1]} stroke="#333333" strokeWidth={1.5} />
          {pieces.map((p) => (
            <circle
              key={`p${p.color}-${p.j}`}
              cx={p.x} cy={p.y} r={13}
              fill={COLORS[p.color]}
              stroke={p.clickable ? '#ffd54f' : '#263238'}
              strokeWidth={p.clickable ? 4 : 1.5}
              className={p.clickable ? 'ludo-piece clickable' : 'ludo-piece'}
              onClick={p.clickable ? () => act({ type: 'move', pieceIndex: p.j }) : undefined}
            />
          ))}
        </svg>

        <div className="ludo-controls">
          <div className={myTurn ? 'turn-line mine' : 'turn-line'}>{turnText}</div>
          <div className="ludo-dice" aria-label={view.dice ? `Tärningen visar ${view.dice}` : 'Ingen tärning'}>
            {view.dice ?? '–'}
          </div>
          {myTurn && view.phase === 'roll' && (
            <button className="btn" onClick={() => act({ type: 'roll' })}>Slå tärningen</button>
          )}
        </div>
        <div className="ludo-log muted" aria-live="polite">{lastEvents}</div>
      </main>

      {view.phase === 'finished' && room.result && (
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

      <RulesModal open={rules} onClose={() => setRules(false)}><Rules /></RulesModal>
    </div>
  );
}

function eventText(e: LudoEvent, nameOf: (id: string) => string, youId: string): string {
  const who = e.playerId === youId ? 'Du' : nameOf(e.playerId);
  switch (e.type) {
    case 'roll': return `${who} slog ${e.value}`;
    case 'knock': return e.victimId === youId ? `${who} knuffade ut dig` : `${who} knuffade ut ${nameOf(e.victimId)}`;
    case 'finish': return `${who} är i mål som ${ordinal(e.place)}!`;
  }
}
