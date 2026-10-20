import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { autoTarget, findHint, type Hint } from '../../../games/solitaire/rules';
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

const sameSource = (a: Source, b: Source | undefined) => !!b && JSON.stringify(a) === JSON.stringify(b);

/** Vad ledtråden säger på svenska. */
function hintText(h: Hint | 'none'): string {
  if (h === 'none') return 'Inga självklara drag kvar. Prova att ångra eller starta om.';
  if (h.kind === 'draw') return 'Dra ett kort från talongen.';
  const from = h.from.kind === 'waste'
    ? 'från skräphögen'
    : h.from.kind === 'foundation'
      ? `från basrutan ${SUIT_SYMBOL[h.from.suit]}`
      : h.from.count > 1 ? `de ${h.from.count} korten i kolumn ${h.from.col + 1}` : `kortet i kolumn ${h.from.col + 1}`;
  const to = h.to.kind === 'foundation' ? `basrutan ${SUIT_SYMBOL[h.to.suit]}` : `kolumn ${h.to.col + 1}`;
  return `Flytta ${from} till ${to}.`;
}

/**
 * Spelbordet. Dra ett kort (eller en sekvens) dit du vill. Klickar du på ett kort flyttas det
 * automatiskt dit det går, och annars händer ingenting. Ledtråden visar ett drag som går.
 */
export function SolitaireBoard({ view, onAction }: Props) {
  const big = useMedia('(min-width: 1024px)');
  const [ghost, setGhost] = useState<Drag | null>(null);
  const [hint, setHint] = useState<Hint | 'none' | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const justDragged = useRef(false);

  const size: 'md' | 'lg' = big ? 'lg' : 'md';
  const cardW = big ? 100 : 44;
  const cardH = Math.round(cardW * 1.42);
  const downStep = Math.round(cardH * 0.12);
  const upStep = Math.round(cardH * 0.3);
  const done = view.phase === 'finished';

  // Bordet som reglerna ser det (de dolda korten behövs inte för att flytta).
  const boardNow = {
    tableau: view.tableau.map((c) => ({ down: [] as CardId[], up: c.up })),
    foundations: view.foundations,
    waste: view.wasteTop ? [view.wasteTop] : [],
  };

  // Ledtråden gäller bara för det läge den gavs i.
  useEffect(() => setHint(null), [view]);

  const giveHint = () => {
    const h = findHint(boardNow, view.stockCount, view.tableau.map((c) => c.down));
    setHint(h ?? 'none');
  };

  const shownHint = hint && hint !== 'none' ? hint : null;
  const hintFrom = shownHint?.kind === 'move' ? shownHint.from : undefined;
  const hintTo = shownHint?.kind === 'move' ? shownHint.to : undefined;

  /** Flyttar kortet(en) dit det går. Returnerar false om det inte går någonstans. */
  const autoMove = (from: Source): boolean => {
    const to = autoTarget(boardNow, from);
    if (!to) return false;
    onAction({ type: 'move', from, to });
    return true;
  };

  // Ett klick direkt efter ett drag ska inte också flytta något.
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

  const turnText = (() => {
    if (done) return view.won ? 'Du vann! Alla fyra basrutor är klara.' : 'Inga fler drag. Spelet är fast – starta om för att försöka igen.';
    return 'Dra ett kort dit du vill, eller klicka på det så flyttas det dit det går';
  })();

  return (
    <main className="sol-wrap">
      <div className="sol-top">
        <div className="sol-stock">
          {view.stockCount > 0 ? (
            <Card
              card="back"
              size={size}
              className={hint && hint !== 'none' && hint.kind === 'draw' ? 'hint' : ''}
              onClick={click(() => onAction({ type: 'draw' }))}
              title="Dra ett kort"
            />
          ) : view.wasteCount > 0 ? (
            <Card card="empty" size={size} onClick={click(() => onAction({ type: 'draw' }))} title="Lägg tillbaka skräphögen i talongen" />
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
                className={sameSource({ kind: 'waste' }, hintFrom) ? 'hint' : ''}
                onClick={click(() => autoMove({ kind: 'waste' }))}
              />
            </div>
          ) : (
            <Card card="empty" size={size} />
          )}
        </div>
        <div className="sol-spacer" />
        {SUITS.map((suit) => {
          const top: CardId | undefined = view.foundations[suit].at(-1);
          const isTarget = hintTo?.kind === 'foundation' && hintTo.suit === suit;
          return (
            <div key={suit} className={isTarget ? 'sol-found hint-target' : 'sol-found'} data-drop={`f${suit}`}>
              {top ? (
                <div onPointerDown={(e) => startDrag(e, { kind: 'foundation', suit }, [top])}>
                  <Card
                    card={top}
                    size={size}
                    className={sameSource({ kind: 'foundation', suit }, hintFrom) ? 'hint' : ''}
                    onClick={click(() => autoMove({ kind: 'foundation', suit }))}
                  />
                </div>
              ) : (
                <Card card="empty" size={size} title={`Basruta ${SUIT_SYMBOL[suit]}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="turn-line">{turnText}</div>

      <div className="sol-hint-row">
        <button className="btn secondary small" onClick={giveHint} disabled={done}>Ledtråd</button>
        {hint && <span className="sol-hint-text">{hintText(hint === 'none' ? 'none' : hint)}</span>}
      </div>

      <div className="sol-tableau">
        {view.tableau.map((col, ci) => {
          const height = cardH + col.down * downStep + Math.max(0, col.up.length - 1) * upStep;
          const isTarget = hintTo?.kind === 'tableau' && hintTo.col === ci;
          return (
            <div
              key={ci}
              className={isTarget ? 'sol-col hint-target' : 'sol-col'}
              data-drop={`t${ci}`}
              style={{ width: cardW, height: Math.max(height, cardH) }}
            >
              {col.down === 0 && col.up.length === 0 && <Card card="empty" size={size} />}
              {Array.from({ length: col.down }, (_, i) => (
                <div key={`d${i}`} className="sol-card" style={{ top: i * downStep }}>
                  <Card card="back" size={size} />
                </div>
              ))}
              {col.up.map((c: CardId, i: number) => {
                const count = col.up.length - i;
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
                      className={sameSource({ kind: 'tableau', col: ci, count }, hintFrom) ? 'hint' : ''}
                      onClick={click(() => autoMove({ kind: 'tableau', col: ci, count }))}
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
    </main>
  );
}
