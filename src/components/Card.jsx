const SUIT_SYMBOLS = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

const SUIT_COLORS = {
  hearts: "#e74c3c",
  diamonds: "#e74c3c",
  clubs: "#2c3e50",
  spades: "#2c3e50",
};

export function Card({ card, hidden = false }) {
  if (hidden) {
    return (
      <div className="card card-back">
        <div className="card-back-pattern"></div>
      </div>
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit];
  const color = SUIT_COLORS[card.suit];

  return (
    <div className="card" style={{ color }}>
      <div className="card-corner top-left">
        <span className="card-value">{card.value}</span>
        <span className="card-suit">{symbol}</span>
      </div>
      <div className="card-center">
        <span className="card-suit-large">{symbol}</span>
      </div>
      <div className="card-corner bottom-right">
        <span className="card-value">{card.value}</span>
        <span className="card-suit">{symbol}</span>
      </div>
    </div>
  );
}
