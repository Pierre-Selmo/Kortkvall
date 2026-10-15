import { rankOf, suitOf, type CardId } from '../../games/vand-tian/cards';

const SUIT_SYMBOL = { H: '♥', D: '♦', C: '♣', S: '♠' } as const;
const SUIT_NAME = { H: 'hjärter', D: 'ruter', C: 'klöver', S: 'spader' } as const;

export function cardLabel(card: CardId): string {
  return `${rankOf(card)}${SUIT_SYMBOL[suitOf(card)]}`;
}

interface Props {
  card: CardId | 'back' | 'empty';
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  dim?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

export function Card({ card, size = 'md', selected, dim, onClick, className = '', title, style }: Props) {
  const cls = ['card', size, selected && 'selected', dim && 'dim', onClick && 'clickable', className];
  const common = {
    onClick,
    style,
    role: onClick ? 'button' : undefined,
    tabIndex: onClick ? 0 : undefined,
    onKeyDown: onClick ? (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined,
  };
  if (card === 'back' || card === 'empty') {
    return <div className={[...cls, card].filter(Boolean).join(' ')} title={title ?? (card === 'back' ? 'Nedvänt kort' : undefined)} aria-label={title} {...common} />;
  }
  const suit = suitOf(card);
  const rank = rankOf(card);
  const red = suit === 'H' || suit === 'D';
  return (
    <div
      className={[...cls, red && 'red'].filter(Boolean).join(' ')}
      aria-label={`${SUIT_NAME[suit]} ${rank}`}
      title={title}
      {...common}
    >
      <div className="corner">{rank}<span>{SUIT_SYMBOL[suit]}</span></div>
      <div className="pip">{SUIT_SYMBOL[suit]}</div>
    </div>
  );
}
