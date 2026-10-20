import { useEffect, useState } from 'react';
import type { Source, SolAction, Target } from '../../../games/solitaire/state';
import type { SolView } from '../../../games/solitaire/view';
import type { CardId, Suit } from '../../../games/vand-tian/cards';
import { Card } from '../../components/Card';

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

interface Props {
  view: SolView;
  onAction(a: SolAction): void;
}

/** Själva spelbordet. Klicka på ett kort och sedan på målet för att flytta. */
export function SolitaireBoard({ view, onAction }: Props) {
  const big = useMedia('(min-width: 1024px)');
  const [sel, setSel] = useState<Source | null>(null);

  const size: 'md' | 'lg' = big ? 'lg' : 'md';
  const cardW = big ? 100 : 44;
  const cardH = Math.round(cardW * 1.42);
  const downStep = Math.round(cardH * 0.12);
  const upStep = Math.round(cardH * 0.3);
  const done = view.phase === 'finished';

  const act = (a: SolAction) => {
    onAction(a);
    setSel(null);
  };

  const moveTo = (to: Target) => {
    if (sel) act({ type: 'move', from: sel, to });
  };

  const isSel = (s: Source) => JSON.stringify(sel) === JSON.stringify(s);

  const turnText = (() => {
    if (done) return view.won ? 'Du vann! Alla fyra basrutor är klara.' : 'Inga fler drag. Spelet är fast – starta om för att försöka igen.';
    if (sel) return 'Klicka nu på var kortet ska ligga – en kolumn eller en basruta';
    return 'Dra från talongen, eller flytta ett kort genom att klicka på det först';
  })();

  return (
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
              selected={sel?.kind === 'waste'}
              onClick={() => (sel?.kind === 'waste' ? setSel(null) : setSel({ kind: 'waste' }))}
            />
          ) : (
            <Card card="empty" size={size} />
          )}
        </div>
        <div className="sol-spacer" />
        {SUITS.map((suit) => {
          const top: CardId | undefined = view.foundations[suit].at(-1);
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
                <Card
                  card="empty"
                  size={size}
                  title={`Basruta ${SUIT_SYMBOL[suit]}`}
                  onClick={sel ? () => moveTo({ kind: 'foundation', suit }) : undefined}
                />
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
              {col.down === 0 && col.up.length === 0 && <Card card="empty" size={size} />}
              {Array.from({ length: col.down }, (_, i) => (
                <div key={`d${i}`} className="sol-card" style={{ top: i * downStep }}>
                  <Card card="back" size={size} />
                </div>
              ))}
              {col.up.map((c: CardId, i: number) => {
                const count = col.up.length - i;
                const inSel = sel?.kind === 'tableau' && sel.col === ci && count <= sel.count;
                const isTop = sel?.kind === 'tableau' && sel.col === ci && sel.count === count;
                return (
                  <div key={c} className="sol-card" style={{ top: col.down * downStep + i * upStep }}>
                    <Card
                      card={c}
                      size={size}
                      selected={isTop}
                      className={inSel ? 'in-sel' : ''}
                      onClick={() => {
                        if (sel) return moveTo({ kind: 'tableau', col: ci });
                        setSel({ kind: 'tableau', col: ci, count });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {isSel({ kind: 'waste' }) && <div className="muted">Skräphögen är vald</div>}
    </main>
  );
}
