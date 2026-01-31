import { useState, useCallback, useRef } from "react";

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCardValue(card) {
  if (card.value === "A") return 11;
  if (["K", "Q", "J"].includes(card.value)) return 10;
  return parseInt(card.value, 10);
}

function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    value += getCardValue(card);
    if (card.value === "A") aces++;
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

function isBlackjack(hand) {
  return hand.length === 2 && calculateHandValue(hand) === 21;
}

// Game states: idle, betting, playing, dealer_turn, finished
export function useBlackjack(initialCoins = 0) {
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [bet, setBet] = useState(0);
  const [gameState, setGameState] = useState("idle");
  const [result, setResult] = useState(null);
  const [coins, setCoins] = useState(initialCoins);
  const [message, setMessage] = useState("");

  // Track pending outcomes that UI will trigger after animations
  const [pendingOutcome, setPendingOutcome] = useState(null); // 'player_blackjack', 'dealer_blackjack', 'push_blackjack'

  // Use refs for dealer drawing to avoid stale closures
  const deckRef = useRef([]);
  const dealerHandRef = useRef([]);

  const updateCoins = useCallback((newCoins) => {
    setCoins(newCoins);
  }, []);

  const startBetting = useCallback(() => {
    setGameState("betting");
    setBet(0);
    setPlayerHand([]);
    setDealerHand([]);
    setResult(null);
    setMessage("");
    setPendingOutcome(null);
    deckRef.current = [];
    dealerHandRef.current = [];
  }, []);

  const deal = useCallback(
    (betAmount) => {
      if (betAmount <= 0 || betAmount > coins) {
        setMessage("Invalid bet amount");
        return;
      }

      const newDeck = shuffle(createDeck());
      const playerCards = [newDeck.pop(), newDeck.pop()];
      const dealerCards = [newDeck.pop(), newDeck.pop()];

      deckRef.current = newDeck;
      dealerHandRef.current = dealerCards;

      setDeck(newDeck);
      setPlayerHand(playerCards);
      setDealerHand(dealerCards);
      setBet(betAmount);
      setCoins((prev) => prev - betAmount);
      setMessage("");

      // Check for blackjacks - but don't finish yet, let UI handle after animation
      if (isBlackjack(playerCards)) {
        if (isBlackjack(dealerCards)) {
          setPendingOutcome('push_blackjack');
        } else {
          setPendingOutcome('player_blackjack');
        }
      } else if (isBlackjack(dealerCards)) {
        setPendingOutcome('dealer_blackjack');
      }

      // Always go to playing first - UI will check pendingOutcome after deal animation
      setGameState("playing");
    },
    [coins]
  );

  // Called by UI after animation when there's a blackjack
  const finishBlackjack = useCallback(() => {
    if (pendingOutcome === 'push_blackjack') {
      setResult("push");
      setCoins((prev) => prev + bet);
      setMessage("Both have Blackjack! Push.");
    } else if (pendingOutcome === 'player_blackjack') {
      const winnings = bet + Math.floor(bet * 1.5);
      setResult("blackjack");
      setCoins((prev) => prev + winnings);
      setMessage(`Blackjack! You win ${winnings} coins!`);
    } else if (pendingOutcome === 'dealer_blackjack') {
      setResult("lose");
      setMessage("Dealer has Blackjack! You lose.");
    }
    setPendingOutcome(null);
    setGameState("finished");
  }, [pendingOutcome, bet]);

  // Just add one card - returns hand value for UI to check
  const hit = useCallback(() => {
    if (gameState !== "playing" || pendingOutcome) return null;

    const newDeck = [...deckRef.current];
    const newCard = newDeck.pop();
    const newHand = [...playerHand, newCard];

    deckRef.current = newDeck;
    setDeck(newDeck);
    setPlayerHand(newHand);

    return calculateHandValue(newHand);
  }, [gameState, playerHand, pendingOutcome]);

  // Called by UI after animation delay when player busts
  const finishBust = useCallback(() => {
    setResult("lose");
    setMessage("Bust! You lose.");
    setGameState("finished");
  }, []);

  // Called by UI to start dealer turn
  const startDealerTurn = useCallback(() => {
    setGameState("dealer_turn");
  }, []);

  // Draw one dealer card using refs to avoid stale closure
  // Returns: { drew: boolean, needsMore: boolean }
  const dealerDrawOne = useCallback(() => {
    const currentHand = dealerHandRef.current;
    const currentDeck = deckRef.current;
    const dealerValue = calculateHandValue(currentHand);

    if (dealerValue >= 17) {
      return { drew: false, needsMore: false };
    }

    const newCard = currentDeck.pop();
    const newHand = [...currentHand, newCard];

    dealerHandRef.current = newHand;
    deckRef.current = currentDeck;

    setDeck([...currentDeck]);
    setDealerHand(newHand);

    const newValue = calculateHandValue(newHand);
    return { drew: true, needsMore: newValue < 17 };
  }, []);

  // Finish the round after dealer is done drawing
  const finishRound = useCallback(() => {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHandRef.current);

    if (dealerValue > 21) {
      const winnings = bet * 2;
      setResult("win");
      setCoins((prev) => prev + winnings);
      setMessage(`Dealer busts! You win ${winnings} coins!`);
    } else if (playerValue > dealerValue) {
      const winnings = bet * 2;
      setResult("win");
      setCoins((prev) => prev + winnings);
      setMessage(`You win ${winnings} coins!`);
    } else if (playerValue < dealerValue) {
      setResult("lose");
      setMessage("Dealer wins. You lose.");
    } else {
      setResult("push");
      setCoins((prev) => prev + bet);
      setMessage("Push! Bet returned.");
    }

    setGameState("finished");
  }, [bet, playerHand]);

  const stand = useCallback(() => {
    if (gameState !== "playing" || pendingOutcome) return;
    setGameState("dealer_turn");
  }, [gameState, pendingOutcome]);

  const doubleDown = useCallback(() => {
    if (gameState !== "playing" || pendingOutcome) return null;
    if (playerHand.length !== 2) return null;
    if (bet > coins) {
      setMessage("Not enough coins to double down");
      return null;
    }

    const additionalBet = bet;
    setCoins((prev) => prev - additionalBet);
    setBet((prev) => prev * 2);

    const newDeck = [...deckRef.current];
    const newCard = newDeck.pop();
    const newHand = [...playerHand, newCard];

    deckRef.current = newDeck;
    setDeck(newDeck);
    setPlayerHand(newHand);

    return calculateHandValue(newHand);
  }, [gameState, playerHand, bet, coins, pendingOutcome]);

  const reset = useCallback(() => {
    setDeck([]);
    setPlayerHand([]);
    setDealerHand([]);
    setBet(0);
    setGameState("idle");
    setResult(null);
    setMessage("");
    setPendingOutcome(null);
    deckRef.current = [];
    dealerHandRef.current = [];
  }, []);

  return {
    // State
    playerHand,
    dealerHand,
    bet,
    gameState,
    result,
    coins,
    message,
    playerValue: calculateHandValue(playerHand),
    dealerValue: calculateHandValue(dealerHand),
    pendingOutcome,

    // Actions
    updateCoins,
    startBetting,
    deal,
    hit,
    stand,
    doubleDown,
    reset,

    // Animation-aware actions (called by UI after delays)
    finishBlackjack,
    finishBust,
    startDealerTurn,
    dealerDrawOne,
    finishRound,

    // Helpers
    canDoubleDown: gameState === "playing" && playerHand.length === 2 && bet <= coins && !pendingOutcome,
  };
}
