import { useEffect, useState } from 'react';
import type { CardId, Suit } from '../../../games/vand-tian/cards';
import type { Source, Target } from '../../../games/solitaire/state';
import type { SolView } from '../../../games/solitaire/view';
import { Card } from '../../components/Card';
import { RulesModal } from '../../components/RulesModal';
import type { TableProps } from '../registry';
import { Rules } from './Rules';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

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

export function Table({ room, send, isHost }: TableProps) {
  const view = room.view as SolView;
  const big = useMedia('(min-width: 1024px)');
  const [sel, setSel] = useState<Source | null>(null);
  const [rules, setRules] = useState(false);

  const size: 'md' | 'lg' = big ? 'lg' : 'md';
  const cardW = big ? 100 : 44;
  const cardH = Math.round(cardW * 1.42);
  const downStep = Math.round(cardH * 0.12);
  const upStep = Math.round(cardH * 0.3);
  const done = view.phase === 'finished';

  const act = (a: { type: 'draw' } | { type: 'move'; from: Source; to: Target }) => {
    send({ type: 'action', action: a });
    setSel(null);
  };

  const moveTo = (to: Target) => {
    if (!sel) return;
    act({ type: 'move', from: sel, to });
  };

  const sameSel = (s: Source) => JSON.stringify(sel) === JSON.stringify(s);

  const turnText = (() => {
    if (done) return view.won ? 'Du vann! Alla fyra basrutor är klara.' : 'Inga fler drag. Spelet är fast.';
    if (sel) return 'Klicka nu på var kortet ska ligga – en kolumn eller en basruta';
    return 'Dra från talongen, eller flytta ett kort genom att klicka på det först';
  })();

  const topFoundation = (suit: Suit) => view.foundations[suit].at(-1);

  return (
    <div className="table-page">
      <header className="topbar">
        <span className="code">{room.code}</span>
        <span className="title">Solitaire</span>
        <button className="btn secondary small" onClick={() => setRules(true)}>Regler</button>
      </header>

      <main className="sol-wrap">
        <div className="sol-top">
          <div className="sol-stock">
            {view.stockCount > 0 ? (
              <Card card="back" size={size} onClick={() => act({ type: 'draw' })} title="Dra ett kort" />
            ) : view.wasteCount > 0 ? (
              <Card card="empty" size={size} onClick={() => act({ type: 'draw' })} title="Lägg tillbaka skräphögen i talongen" />
            ) : (
              <Card card="empty" size={size} />
            )}
          </div>
          <div className="sol-waste">
            {view.wasteTop ? (
              <Card
                card={view.wasteTop}
                size={size}
                selected={!!sel && sel.kind === 'waste'}
                onClick={() => (sel && sel.kind === 'waste' ? setSel(null) : setSel({ kind: 'waste' }))}
              />
            ) : (
              <Card card="empty" size={size} />
            )}
          </div>
          <div className="sol-spacer" />
          {SUITS.map((suit) => {
            const top = topFoundation(suit);
            return (
              <div key={suit} className="sol-found" onClick={sel ? () => moveTo({ kind: 'foundation', suit }) : undefined}>
                {top ? (
                  <Card
                    card={top}
                    size={size}
                    selected={sel?.kind === 'foundation' && sel.suit === suit}
                    onClick={() => (sel ? moveTo({ kind: 'foundation', suit }) : setSel({ kind: 'foundation', suit }))}
                  />
                ) : (
                  <Card card="empty" size={size} title={`Basruta ${SUIT_SYMBOL[suit]}`} onClick={sel ? () => moveTo({ kind: 'foundation', suit }) : undefined} />
                )}
              </div>
            );
          })}
        </div>

        <div className={sel ? 'turn-line mine' : 'turn-line'}>{turnText}</div>

        <div className="sol-tableau">
          {view.tableau.map((col, ci) => {
            const height = cardH + col.down * downStep + Math.max(0, col.up.length - 1) * upStep;
            return (
              <div
                key={ci}
                className="sol-col"
                style={{ width: cardW, height: Math.max(height, cardH) }}
                onClick={sel ? () => moveTo({ kind: 'tableau', col: ci }) : undefined}
              >
                {col.down === 0 && col.up.length === 0 && (
                  <Card card="empty" size={size} />
                )}
                {Array.from({ length: col.down }, (_, i) => (
                  <div key={`d${i}`} className="sol-card" style={{ top: i * downStep }}>
                    <Card card="back" size={size} />
                  </div>
                ))}
                {col.up.map((c: CardId, i: number) => {
                  const count = col.up.length - i;
                  const isSel = sel?.kind === 'tableau' && sel.col === ci && count <= sel.count;
                  return (
                    <div key={c} className="sol-card" style={{ top: col.down * downStep + i * upStep }}>
                      <Card
                        card={c}
                        size={size}
                        selected={isSel && sel?.kind === 'tableau' && sel.count === count}
                        className={isSel ? 'in-sel' : ''}
                        onClick={() => {
                          if (sel) return moveTo({ kind: 'tableau', col: ci });
                          setSel(sameSel({ kind: 'tableau', col: ci, count }) ? null : { kind: 'tableau', col: ci, count });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {done && isHost && (
          <button className="btn" onClick={() => send({ type: 'playAgain' })}>Spela igen</button>
        )}
      </main>

      <RulesModal open={rules} onClose={() => setRules(false)}><Rules /></RulesModal>
    </div>
  );
}
