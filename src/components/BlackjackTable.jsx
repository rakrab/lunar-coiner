import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "./Card";
import { CoinDisplay } from "./CoinDisplay";
import { LunarParticles } from "./LunarParticles";
import { LunarCoinIcon } from "./LunarCoinIcon";
import { FlyingCoins } from "./FlyingCoins";

const CARD_ANIM_DURATION = 600;
const CARD_STAGGER_DELAY = 450;
const POST_CARD_DELAY = 300;
const FLIP_DURATION = 800;

export function BlackjackTable({ game, onSaveCoins, onSwitchProfile }) {
  const [betInput, setBetInput] = useState(1);
  const [showMessage, setShowMessage] = useState(false);
  const [tableState, setTableState] = useState("");
  const [flyingCoinsActive, setFlyingCoinsActive] = useState(false);
  const [flyingCoinsStart, setFlyingCoinsStart] = useState(null);
  const [flyingCoinsCount, setFlyingCoinsCount] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [dangerIntensity, setDangerIntensity] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'bust', 'dealer_turn', 'blackjack'
  const [dealerDrawing, setDealerDrawing] = useState(false);

  const [animatedPlayerCount, setAnimatedPlayerCount] = useState(0);
  const [animatedDealerCount, setAnimatedDealerCount] = useState(0);

  const prevPlayerCountRef = useRef(0);
  const prevDealerCountRef = useRef(0);
  const prevGameStateRef = useRef(game.gameState);
  const messageAreaRef = useRef(null);
  const isInitialDeal = useRef(false);
  const dealerDrawTimerRef = useRef(null);

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
    pendingOutcome,
    startBetting,
    deal,
    hit,
    stand,
    doubleDown,
    canDoubleDown,
    finishBlackjack,
    finishBust,
    startDealerTurn,
    dealerDrawOne,
    finishRound,
  } = game;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dealerDrawTimerRef.current) {
        clearTimeout(dealerDrawTimerRef.current);
      }
    };
  }, []);

  // Detect new cards and set dealing state
  useEffect(() => {
    const playerDelta = playerHand.length - prevPlayerCountRef.current;
    const dealerDelta = dealerHand.length - prevDealerCountRef.current;

    if (playerDelta > 0 || dealerDelta > 0) {
      isInitialDeal.current = playerDelta >= 2 || dealerDelta >= 2;
      setIsDealing(true);
    }

    prevPlayerCountRef.current = playerHand.length;
    prevDealerCountRef.current = dealerHand.length;
  }, [playerHand.length, dealerHand.length]);

  // Mark player cards as animated
  useEffect(() => {
    if (playerHand.length > animatedPlayerCount) {
      const newCardCount = playerHand.length;
      const isInitial = newCardCount >= 2 && animatedPlayerCount === 0;
      const lastCardDelay = isInitial
        ? (newCardCount - 1) * CARD_STAGGER_DELAY * 2 + CARD_ANIM_DURATION
        : CARD_ANIM_DURATION;

      const timer = setTimeout(() => {
        setAnimatedPlayerCount(newCardCount);
      }, lastCardDelay);
      return () => clearTimeout(timer);
    }
  }, [playerHand.length, animatedPlayerCount]);

  // Mark dealer cards as animated
  useEffect(() => {
    if (dealerHand.length > animatedDealerCount) {
      const newCardCount = dealerHand.length;
      const isInitial = newCardCount >= 2 && animatedDealerCount === 0;
      const lastCardDelay = isInitial
        ? (newCardCount - 1) * CARD_STAGGER_DELAY * 2 + CARD_STAGGER_DELAY + CARD_ANIM_DURATION
        : CARD_ANIM_DURATION;

      const timer = setTimeout(() => {
        setAnimatedDealerCount(newCardCount);
      }, lastCardDelay);
      return () => clearTimeout(timer);
    }
  }, [dealerHand.length, animatedDealerCount]);

  // Check if all cards are done animating
  useEffect(() => {
    const allPlayerDone = animatedPlayerCount >= playerHand.length;
    const allDealerDone = animatedDealerCount >= dealerHand.length;

    if (allPlayerDone && allDealerDone && isDealing) {
      const timer = setTimeout(() => {
        setIsDealing(false);
      }, POST_CARD_DELAY);
      return () => clearTimeout(timer);
    }
  }, [animatedPlayerCount, animatedDealerCount, playerHand.length, dealerHand.length, isDealing]);

  // Check for blackjack after initial deal animation completes
  useEffect(() => {
    if (!isDealing && pendingOutcome && gameState === "playing" && !pendingAction) {
      const timer = setTimeout(() => {
        setPendingAction('blackjack');
      }, POST_CARD_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isDealing, pendingOutcome, gameState, pendingAction]);

  // Process pending actions after dealing completes
  useEffect(() => {
    if (!isDealing && pendingAction) {
      const timer = setTimeout(() => {
        if (pendingAction === 'bust') {
          finishBust();
          setTableState("bust");
          setTimeout(() => setTableState(""), 500);
        } else if (pendingAction === 'dealer_turn') {
          startDealerTurn();
        } else if (pendingAction === 'blackjack') {
          finishBlackjack();
        }
        setPendingAction(null);
      }, POST_CARD_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isDealing, pendingAction, finishBust, startDealerTurn, finishBlackjack]);

  // Handle dealer turn - flip card first, then draw one by one
  useEffect(() => {
    if (gameState === "dealer_turn" && prevGameStateRef.current !== "dealer_turn") {
      // First: flip the hidden card
      setIsFlipping(true);

      const flipTimer = setTimeout(() => {
        setIsFlipping(false);
        // Start the dealer drawing process
        setDealerDrawing(true);
      }, FLIP_DURATION + POST_CARD_DELAY);

      prevGameStateRef.current = gameState;
      return () => clearTimeout(flipTimer);
    }
    prevGameStateRef.current = gameState;
  }, [gameState]);

  // Dealer drawing loop - triggered when dealerDrawing becomes true or after a card is dealt
  useEffect(() => {
    if (!dealerDrawing || gameState !== "dealer_turn") return;

    // Wait for any current dealing animation to complete
    if (isDealing) return;

    dealerDrawTimerRef.current = setTimeout(() => {
      const { drew, needsMore } = dealerDrawOne();

      if (!drew) {
        // Dealer doesn't need to draw, finish the round
        setDealerDrawing(false);
        setTimeout(() => {
          finishRound();
        }, POST_CARD_DELAY);
      } else if (!needsMore) {
        // Drew a card but done now, wait for animation then finish
        setDealerDrawing(false);
        // The isDealing effect will handle the animation timing
      }
      // If needsMore is true, this effect will re-run after isDealing becomes false
    }, POST_CARD_DELAY);

    return () => {
      if (dealerDrawTimerRef.current) {
        clearTimeout(dealerDrawTimerRef.current);
      }
    };
  }, [dealerDrawing, isDealing, gameState, dealerDrawOne, finishRound]);

  // Finish round after dealer's last card is dealt
  useEffect(() => {
    if (!dealerDrawing && !isDealing && gameState === "dealer_turn" && !isFlipping) {
      // Check if we've drawn at least one card and are done
      const timer = setTimeout(() => {
        finishRound();
      }, POST_CARD_DELAY);
      return () => clearTimeout(timer);
    }
  }, [dealerDrawing, isDealing, gameState, isFlipping, finishRound]);

  // Show result message when game finishes
  useEffect(() => {
    if (gameState === "finished" && !showMessage) {
      const checkAndShow = () => {
        if (!isDealing && !isFlipping) {
          setTimeout(() => {
            setShowMessage(true);

            if ((result === "blackjack" || result === "win") && messageAreaRef.current) {
              const rect = messageAreaRef.current.getBoundingClientRect();
              setFlyingCoinsStart({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              });
              setFlyingCoinsCount(result === "blackjack" ? 15 : 10);
              setTimeout(() => setFlyingCoinsActive(true), 400);
            }
          }, 300);
        } else {
          setTimeout(checkAndShow, 100);
        }
      };
      setTimeout(checkAndShow, POST_CARD_DELAY);
    }
  }, [gameState, showMessage, isDealing, isFlipping, result]);

  // Reset for new round
  useEffect(() => {
    if (gameState === "betting") {
      setShowMessage(false);
      setFlyingCoinsActive(false);
      setTableState("");
      setAnimatedPlayerCount(0);
      setAnimatedDealerCount(0);
      setIsDealing(false);
      setPendingAction(null);
      setDealerDrawing(false);
      prevPlayerCountRef.current = 0;
      prevDealerCountRef.current = 0;
      isInitialDeal.current = false;
    }

    if (gameState === "idle") {
      setShowMessage(false);
      setFlyingCoinsActive(false);
      setAnimatedPlayerCount(0);
      setAnimatedDealerCount(0);
      setIsDealing(false);
      setPendingAction(null);
      setDealerDrawing(false);
      prevPlayerCountRef.current = 0;
      prevDealerCountRef.current = 0;
    }
  }, [gameState]);

  // Danger state for high hands
  useEffect(() => {
    if (gameState === "playing" && playerValue >= 17 && playerValue <= 20 && !pendingOutcome) {
      const intensity = (playerValue - 16) / 4;
      setDangerIntensity(intensity);
      setTableState("danger");
    } else if (tableState === "danger") {
      setDangerIntensity(0);
      setTableState("");
    }
  }, [playerValue, gameState, tableState, pendingOutcome]);

  const handleDeal = useCallback((e) => {
    e.preventDefault();
    const betAmount = parseInt(betInput, 10);
    if (betAmount > 0 && betAmount <= coins) {
      setShowMessage(false);
      deal(betAmount);
    }
  }, [betInput, coins, deal]);

  const handleHit = useCallback(() => {
    const handValue = hit();
    if (handValue !== null) {
      if (handValue > 21) {
        setPendingAction('bust');
      } else if (handValue === 21) {
        setPendingAction('dealer_turn');
      }
    }
  }, [hit]);

  const handleDoubleDown = useCallback(() => {
    setTableState("lunar-pact");
    setTimeout(() => setTableState((s) => (s === "lunar-pact" ? "" : s)), 500);

    const handValue = doubleDown();
    if (handValue !== null) {
      if (handValue > 21) {
        setPendingAction('bust');
      } else {
        setPendingAction('dealer_turn');
      }
    }
  }, [doubleDown]);

  const handleStand = useCallback(() => {
    stand();
  }, [stand]);

  const handlePlayAgain = useCallback(() => {
    onSaveCoins();
    startBetting();
  }, [onSaveCoins, startBetting]);

  const handleSwitchProfile = useCallback(() => {
    onSaveCoins();
    onSwitchProfile();
  }, [onSaveCoins, onSwitchProfile]);

  const getDealDelay = useCallback((owner, index, isNewCard) => {
    if (!isNewCard) return 0;

    if (isInitialDeal.current) {
      const baseDelay = CARD_STAGGER_DELAY;
      if (owner === "dealer") {
        return index * baseDelay * 2 + baseDelay;
      }
      return index * baseDelay * 2;
    } else {
      return 0;
    }
  }, []);

  const showDealerCards = gameState === "dealer_turn" || gameState === "finished";
  const isDanger = tableState === "danger";
  const particleIntensity = isDanger || result === "blackjack" ? "intense" : "normal";

  // Only show cards when we're in an active game state
  const inGame = gameState === "playing" || gameState === "dealer_turn" || gameState === "finished";
  const hasPlayerCards = inGame && playerHand.length > 0;
  const hasDealerCards = inGame && dealerHand.length > 0;

  const showActionButtons = gameState === "playing" && !isDealing && !pendingAction && !pendingOutcome;
  const showPlayAgainButton = gameState === "finished" && !isDealing && showMessage;

  return (
    <div className={`blackjack-table ${tableState}`}>
      <div
        className="danger-overlay"
        style={{ opacity: dangerIntensity }}
      />
      <LunarParticles intensity={particleIntensity} danger={isDanger} />

      <FlyingCoins
        active={flyingCoinsActive}
        count={flyingCoinsCount}
        startPosition={flyingCoinsStart}
        onComplete={() => setFlyingCoinsActive(false)}
      />

      <div className="table-content">
        <header className="table-header">
          <CoinDisplay coins={coins} />
          <button className="switch-profile-button" onClick={handleSwitchProfile}>
            <LunarCoinIcon size={22} />
            <span>Switch Profile</span>
          </button>
        </header>

        <section className="dealer-area">
          {hasDealerCards && (
            <h3 className="area-label">
              Dealer
              {showDealerCards && (
                <span className="hand-value-display">({dealerValue})</span>
              )}
            </h3>
          )}
          <div className="hand">
            {hasDealerCards && dealerHand.map((card, index) => {
              const isHiddenCard = index === 1 && !showDealerCards;
              const isNewCard = index >= animatedDealerCount;
              const animState = isFlipping && index === 1 ? "flipping" : (isNewCard ? "dealing" : "none");
              return (
                <Card
                  key={`dealer-${index}-${card.suit}-${card.value}`}
                  card={card}
                  hidden={isHiddenCard}
                  animationState={animState}
                  delay={getDealDelay("dealer", index, isNewCard)}
                />
              );
            })}
          </div>
        </section>

        <section className="message-area" ref={messageAreaRef}>
          {message && (
            <div className={`message ${result || ""} ${showMessage ? "visible" : ""}`}>
              <span className="message-text">{message}</span>
              {(result === "win" || result === "blackjack") && (
                <div className="message-glow" />
              )}
            </div>
          )}
        </section>

        <section className="player-area">
          {hasPlayerCards && (
            <h3 className="area-label">
              Your Hand
              <span className={`hand-value-display ${playerValue === 21 ? "perfect" : playerValue > 21 ? "bust" : ""}`}>
                ({playerValue})
              </span>
            </h3>
          )}
          <div className="hand">
            {hasPlayerCards && playerHand.map((card, index) => {
              const isNewCard = index >= animatedPlayerCount;
              return (
                <Card
                  key={`player-${index}-${card.suit}-${card.value}`}
                  card={card}
                  animationState={isNewCard ? "dealing" : "none"}
                  delay={getDealDelay("player", index, isNewCard)}
                />
              );
            })}
          </div>
        </section>

        <footer className="controls">
          {gameState === "idle" && (
            <button className="action-button primary glow" onClick={startBetting}>
              Enter the Bazaar
            </button>
          )}

          {gameState === "betting" && (
            <form className="bet-form" onSubmit={handleDeal}>
              <div className="bet-input-group">
                <label className="bet-label">
                  <LunarCoinIcon size={24} />
                  <span>Wager</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={coins}
                  value={betInput}
                  onChange={(e) => setBetInput(e.target.value)}
                  className="bet-input"
                />
              </div>
              <button type="submit" className="action-button primary glow" disabled={coins < 1}>
                Deal
              </button>
            </form>
          )}

          {gameState === "playing" && (
            <div
              className="action-buttons"
              style={{
                visibility: showActionButtons ? 'visible' : 'hidden',
                opacity: showActionButtons ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
            >
              <button className="action-button" onClick={handleHit} disabled={!showActionButtons}>
                Hit
              </button>
              <button className="action-button" onClick={handleStand} disabled={!showActionButtons}>
                Stand
              </button>
              <button
                className="action-button lunar"
                onClick={handleDoubleDown}
                disabled={!canDoubleDown || !showActionButtons}
              >
                Double Down
              </button>
            </div>
          )}

          {gameState === "finished" && (
            <button
              className="action-button primary glow"
              onClick={handlePlayAgain}
              style={{
                visibility: showPlayAgainButton ? 'visible' : 'hidden',
                opacity: showPlayAgainButton ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
              disabled={!showPlayAgainButton}
            >
              Play Again
            </button>
          )}

          {bet > 0 && gameState !== "idle" && gameState !== "betting" && (
            <div className="current-bet">
              <LunarCoinIcon size={22} />
              <span>{bet}</span>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
