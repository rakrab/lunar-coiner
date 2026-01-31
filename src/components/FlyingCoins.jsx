import { useEffect, useState, useRef, memo } from "react";
import lunarCoinImg from "../assets/LunarCoinIcon.webp";

export const FlyingCoins = memo(function FlyingCoins({ active, count = 10, startPosition, onComplete }) {
  const [coins, setCoins] = useState([]);
  const mountedRef = useRef(true);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (active && startPosition && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;

      const target = document.getElementById("coin-display-target");
      if (!target) return;

      const targetRect = target.getBoundingClientRect();
      const targetX = targetRect.left + targetRect.width / 2;
      const targetY = targetRect.top + targetRect.height / 2;

      const newCoins = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        startX: startPosition.x + (Math.random() - 0.5) * 120,
        startY: startPosition.y + (Math.random() - 0.5) * 80,
        targetX,
        targetY,
        delay: i * 50,
        duration: 600 + Math.random() * 200,
        rotation: Math.random() * 540 - 270,
      }));

      setCoins(newCoins);

      // Auto-complete after all animations finish
      const maxDuration = count * 50 + 800;
      setTimeout(() => {
        if (mountedRef.current) {
          setCoins([]);
          onComplete?.();
        }
      }, maxDuration);
    }

    if (!active) {
      hasTriggeredRef.current = false;
    }
  }, [active, startPosition, count, onComplete]);

  if (coins.length === 0) return null;

  return (
    <div className="flying-coins-container">
      {coins.map((coin) => (
        <img
          key={coin.id}
          src={lunarCoinImg}
          alt=""
          className="flying-coin"
          style={{
            left: coin.startX,
            top: coin.startY,
            "--target-x": `${coin.targetX - coin.startX}px`,
            "--target-y": `${coin.targetY - coin.startY}px`,
            "--delay": `${coin.delay}ms`,
            "--duration": `${coin.duration}ms`,
            "--rotation": `${coin.rotation}deg`,
          }}
        />
      ))}
    </div>
  );
});
