export function CoinDisplay({ coins }) {
  return (
    <div className="coin-display">
      <span className="coin-icon">&#9790;</span>
      <span className="coin-amount">{coins}</span>
    </div>
  );
}
