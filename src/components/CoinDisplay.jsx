import { useState, useEffect, useRef, memo } from "react";
import { LunarCoinIcon } from "./LunarCoinIcon";

export const CoinDisplay = memo(function CoinDisplay({ coins }) {
  const [displayCoins, setDisplayCoins] = useState(coins);
  const [animClass, setAnimClass] = useState("");
  const prevCoinsRef = useRef(coins);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const prevCoins = prevCoinsRef.current;

    if (prevCoins !== coins) {
      const isGain = coins > prevCoins;
      const diff = Math.abs(coins - prevCoins);

      setAnimClass(isGain ? "gain" : "loss");

      // Cancel any ongoing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Animate number counting
      const duration = Math.min(600, Math.max(200, diff * 30));
      const startTime = performance.now();
      const startValue = prevCoins;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (coins - startValue) * eased);

        setDisplayCoins(currentValue);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      // Clear animation class after it completes
      const timer = setTimeout(() => setAnimClass(""), 500);

      prevCoinsRef.current = coins;

      return () => {
        clearTimeout(timer);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [coins]);

  return (
    <div className={`coin-display ${animClass}`} id="coin-display-target">
      <LunarCoinIcon size={32} className="coin-display-icon" />
      <span className="coin-amount">{displayCoins}</span>
      <div className="coin-glow" />
    </div>
  );
});
