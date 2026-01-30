import { useState } from "react";
import { Card } from "./Card";
import { CoinDisplay } from "./CoinDisplay";

export function BlackjackTable({ game, onSaveCoins, onExit }) {
  const [betInput, setBetInput] = useState(1);

  const {
    playerHand,
    dealerHand,
    bet,
    gameState,
    result,
    coins,
    message,
    playerValue,
    dealerValue,
    startBetting,
    deal,
    hit,
    stand,
    doubleDown,
    canDoubleDown,
  } = game;

  function handleDeal(e) {
    e.preventDefault();
    const betAmount = parseInt(betInput, 10);
    deal(betAmount);
  }

  function handlePlayAgain() {
    onSaveCoins();
    startBetting();
  }

  function handleExit() {
    onSaveCoins();
    onExit();
  }

  // Show dealer's hidden card only after player's turn
  const showDealerCards = gameState === "dealer_turn" || gameState === "finished";

  return (
    <div className="blackjack-table">
      <div className="table-header">
        <CoinDisplay coins={coins} />
        <button className="exit-button" onClick={handleExit}>
          Exit
        </button>
      </div>

      <div className="dealer-area">
        <h3>
          Dealer {showDealerCards && dealerHand.length > 0 && `(${dealerValue})`}
        </h3>
        <div className="hand">
          {dealerHand.map((card, index) => (
            <Card
              key={index}
              card={card}
              hidden={index === 1 && !showDealerCards}
            />
          ))}
        </div>
      </div>

      <div className="message-area">
        {message && <p className={`message ${result}`}>{message}</p>}
      </div>

      <div className="player-area">
        <h3>Your Hand {playerHand.length > 0 && `(${playerValue})`}</h3>
        <div className="hand">
          {playerHand.map((card, index) => (
            <Card key={index} card={card} />
          ))}
        </div>
      </div>

      <div className="controls">
        {gameState === "idle" && (
          <button className="action-button primary" onClick={startBetting}>
            Start Game
          </button>
        )}

        {gameState === "betting" && (
          <form className="bet-form" onSubmit={handleDeal}>
            <label>
              Bet:
              <input
                type="number"
                min="1"
                max={coins}
                value={betInput}
                onChange={(e) => setBetInput(e.target.value)}
              />
            </label>
            <button type="submit" className="action-button primary" disabled={coins < 1}>
              Deal
            </button>
          </form>
        )}

        {gameState === "playing" && (
          <div className="action-buttons">
            <button className="action-button" onClick={hit}>
              Hit
            </button>
            <button className="action-button" onClick={stand}>
              Stand
            </button>
            <button
              className="action-button"
              onClick={doubleDown}
              disabled={!canDoubleDown}
            >
              Double Down
            </button>
          </div>
        )}

        {gameState === "finished" && (
          <div className="action-buttons">
            <button className="action-button primary" onClick={handlePlayAgain}>
              Play Again
            </button>
          </div>
        )}

        {bet > 0 && gameState !== "idle" && gameState !== "betting" && (
          <p className="current-bet">Current Bet: {bet}</p>
        )}
      </div>
    </div>
  );
}
