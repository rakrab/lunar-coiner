import lunarCoinImg from "../assets/LunarCoinIcon.webp";

const SUIT_SYMBOLS = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

const SUIT_COLORS = {
  hearts: "#c41e3a",
  diamonds: "#c41e3a",
  clubs: "#1a1a1a",
  spades: "#1a1a1a",
};

// Not memoized - we need fresh instances for animations to trigger
export function Card({ card, hidden = false, animationState = "none", delay = 0 }) {
  const symbol = SUIT_SYMBOLS[card.suit];
  const color = SUIT_COLORS[card.suit];

  // animationState: "none" | "dealing" | "flipping"
  const cardClasses = [
    "card",
    animationState === "dealing" && "dealing",
    animationState === "flipping" && "flipping",
    hidden && "face-down",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cardClasses}
      style={{ "--deal-delay": `${delay}ms` }}
    >
      <div className="card-inner">
        <div className="card-front" style={{ color }}>
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
          <div className="card-shine" />
        </div>
        <div className="card-back">
          <div className="card-back-inner">
            <img src={lunarCoinImg} alt="" className="card-back-coin" />
            <div className="card-back-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}
