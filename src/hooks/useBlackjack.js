import { useState, useCallback } from "react";

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

  // Convert aces from 11 to 1 as needed to avoid busting
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
  const [gameState, setGameState] = useState("idle"); // idle, betting, playing, dealer_turn, finished
  const [result, setResult] = useState(null); // win, lose, push, blackjack
  const [coins, setCoins] = useState(initialCoins);
  const [message, setMessage] = useState("");

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

      setDeck(newDeck);
      setPlayerHand(playerCards);
      setDealerHand(dealerCards);
      setBet(betAmount);
      setCoins((prev) => prev - betAmount);
      setMessage("");

      // Check for player blackjack
      if (isBlackjack(playerCards)) {
        if (isBlackjack(dealerCards)) {
          // Both have blackjack - push
          setResult("push");
          setCoins((prev) => prev + betAmount);
          setMessage("Both have Blackjack! Push.");
          setGameState("finished");
        } else {
          // Player blackjack wins 3:2
          const winnings = betAmount + Math.floor(betAmount * 1.5);
          setResult("blackjack");
          setCoins((prev) => prev + winnings);
          setMessage(`Blackjack! You win ${winnings} coins!`);
          setGameState("finished");
        }
      } else if (isBlackjack(dealerCards)) {
        // Dealer blackjack
        setResult("lose");
        setMessage("Dealer has Blackjack! You lose.");
        setGameState("finished");
      } else {
        setGameState("playing");
      }
    },
    [coins]
  );

  const hit = useCallback(() => {
    if (gameState !== "playing") return;

    const newDeck = [...deck];
    const newCard = newDeck.pop();
    const newHand = [...playerHand, newCard];

    setDeck(newDeck);
    setPlayerHand(newHand);

    const handValue = calculateHandValue(newHand);
    if (handValue > 21) {
      setResult("lose");
      setMessage("Bust! You lose.");
      setGameState("finished");
    } else if (handValue === 21) {
      // Auto-stand on 21
      dealerTurn(newDeck, dealerHand, newHand);
    }
  }, [gameState, deck, playerHand, dealerHand]);

  const dealerTurn = useCallback(
    (currentDeck, currentDealerHand, currentPlayerHand) => {
      setGameState("dealer_turn");
      let newDeck = [...currentDeck];
      let newDealerHand = [...currentDealerHand];

      // Dealer hits until 17 or higher
      while (calculateHandValue(newDealerHand) < 17) {
        newDealerHand.push(newDeck.pop());
      }

      setDeck(newDeck);
      setDealerHand(newDealerHand);

      const playerValue = calculateHandValue(currentPlayerHand);
      const dealerValue = calculateHandValue(newDealerHand);

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
    },
    [bet]
  );

  const stand = useCallback(() => {
    if (gameState !== "playing") return;
    dealerTurn(deck, dealerHand, playerHand);
  }, [gameState, deck, dealerHand, playerHand, dealerTurn]);

  const doubleDown = useCallback(() => {
    if (gameState !== "playing") return;
    if (playerHand.length !== 2) return;
    if (bet > coins) {
      setMessage("Not enough coins to double down");
      return;
    }

    // Double the bet
    const additionalBet = bet;
    setCoins((prev) => prev - additionalBet);
    setBet((prev) => prev * 2);

    // Take exactly one more card
    const newDeck = [...deck];
    const newCard = newDeck.pop();
    const newHand = [...playerHand, newCard];

    setDeck(newDeck);
    setPlayerHand(newHand);

    const handValue = calculateHandValue(newHand);
    if (handValue > 21) {
      setResult("lose");
      setMessage("Bust! You lose.");
      setGameState("finished");
    } else {
      // Automatically stand after double down
      dealerTurn(newDeck, dealerHand, newHand);
    }
  }, [gameState, playerHand, bet, coins, deck, dealerHand, dealerTurn]);

  const reset = useCallback(() => {
    setDeck([]);
    setPlayerHand([]);
    setDealerHand([]);
    setBet(0);
    setGameState("idle");
    setResult(null);
    setMessage("");
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

    // Actions
    updateCoins,
    startBetting,
    deal,
    hit,
    stand,
    doubleDown,
    reset,

    // Helpers
    canDoubleDown: gameState === "playing" && playerHand.length === 2 && bet <= coins,
  };
}
