import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Source, SolAction, Target } from '../../../games/solitaire/state';
import type { SolView } from '../../../games/solitaire/view';
import type { CardId, Suit } from '../../../games/vand-tian/cards';
import { Card } from '../../components/Card';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const DRAG_START_PX = 6;

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

interface Drag {
  from: Source;
  cards: CardId[];
  x0: number;
  y0: number;
  x: number;
  y: number;
  started: boolean;
}

interface Props {
  view: SolView;
  onAction(a: SolAction): void;
}

/**
 * Spelbordet. Dra ett kort (eller en sekvens) dit du vill, eller klicka på ett kort och sedan på målet.
 * Dra med musen eller fingret. Ett kort som bara trycks på väljs.
 */
export function SolitaireBoard({ view, onAction }: Props) {
  const big = useMedia('(min-width: 1024px)');
  const [sel, setSel] = useState<Source | null>(null);
  const [ghost, setGhost] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const justDragged = useRef(false);

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

  // Ett klick direkt efter ett drag ska inte också välja eller flytta något.
  const click = (fn: () => void) => () => {
    if (!justDragged.current) fn();
  };

  // Lyssnar på musen/fingret medan ett kort dras.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      d.x = e.clientX;
      d.y = e.clientY;
      if (!d.started && Math.hypot(d.x - d.x0, d.y - d.y0) > DRAG_START_PX) d.started = true;
      if (d.started) setGhost({ ...d });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setGhost(null);
      if (!d || !d.started) return;
      justDragged.current = true;
      setTimeout(() => {
        justDragged.current = false;
      }, 300);
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]') as HTMLElement | null;
      const key = el?.dataset.drop;
      if (!key) return;
      const to: Target = key[0] === 't'
        ? { kind: 'tableau', col: Number(key.slice(1)) }
        : { kind: 'foundation', suit: key.slice(1) as Suit };
      onAction({ type: 'move', from: d.from, to });
      setSel(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [onAction]);

  const startDrag = (e: ReactPointerEvent, from: Source, cards: CardId[]) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = { from, cards, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, started: false };
  };

  const isSel = (s: Source) => JSON.stringify(sel) === JSON.stringify(s);

  const turnText = (() => {
    if (done) return view.won ? 'Du vann! Alla fyra basrutor är klara.' : 'Inga fler drag. Spelet är fast – starta om för att försöka igen.';
    if (sel) return 'Klicka nu på var kortet ska ligga – en kolumn eller en basruta';
    return 'Dra ett kort dit du vill, eller klicka på det och sedan på målet';
  })();

  return (
    <main className="sol-wrap">
      <div className="sol-top">
        <div className="sol-stock">
          {view.stockCount > 0 ? (
            <Card card="back" size={size} onClick={click(() => act({ type: 'draw' }))} title="Dra ett kort" />
          ) : view.wasteCount > 0 ? (
            <Card card="empty" size={size} onClick={click(() => act({ type: 'draw' }))} title="Lägg tillbaka skräphögen i talongen" />
          ) : (
            <Card card="empty" size={size} />
          )}
        </div>
        <div className="sol-waste">
          {view.wasteTop ? (
            <div onPointerDown={(e) => startDrag(e, { kind: 'waste' }, [view.wasteTop!])}>
              <Card
                card={view.wasteTop}
                size={size}
                selected={sel?.kind === 'waste'}
                onClick={click(() => (sel?.kind === 'waste' ? setSel(null) : setSel({ kind: 'waste' })))}
              />
            </div>
          ) : (
            <Card card="empty" size={size} />
          )}
        </div>
        <div className="sol-spacer" />
        {SUITS.map((suit) => {
          const top: CardId | undefined = view.foundations[suit].at(-1);
          return (
            <div key={suit} className="sol-found" data-drop={`f${suit}`} onClick={click(() => sel && moveTo({ kind: 'foundation', suit }))}>
              {top ? (
                <div onPointerDown={(e) => startDrag(e, { kind: 'foundation', suit }, [top])}>
                  <Card
                    card={top}
                    size={size}
                    selected={sel?.kind === 'foundation' && sel.suit === suit}
                    onClick={click(() => (sel ? moveTo({ kind: 'foundation', suit }) : setSel({ kind: 'foundation', suit })))}
                  />
                </div>
              ) : (
                <Card card="empty" size={size} title={`Basruta ${SUIT_SYMBOL[suit]}`} />
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
              data-drop={`t${ci}`}
              style={{ width: cardW, height: Math.max(height, cardH) }}
              onClick={click(() => sel && moveTo({ kind: 'tableau', col: ci }))}
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
                  <div
                    key={c}
                    className="sol-card"
                    style={{ top: col.down * downStep + i * upStep }}
                    onPointerDown={(e) => startDrag(e, { kind: 'tableau', col: ci, count }, col.up.slice(i))}
                  >
                    <Card
                      card={c}
                      size={size}
                      selected={isTop}
                      className={inSel ? 'in-sel' : ''}
                      onClick={click(() => {
                        if (sel) return moveTo({ kind: 'tableau', col: ci });
                        setSel({ kind: 'tableau', col: ci, count });
                      })}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {ghost?.started && (
        <div className="sol-ghost" style={{ left: ghost.x - 20, top: ghost.y - 20 }} aria-hidden>
          {ghost.cards.map((c, i) => (
            <div key={c} className="sol-ghost-card" style={{ top: i * upStep }}>
              <Card card={c} size={size} />
            </div>
          ))}
        </div>
      )}
      {isSel({ kind: 'waste' }) && <div className="muted">Skräphögen är vald</div>}
    </main>
  );
}
