import lunarCoinImg from "../assets/LunarCoinIcon.webp";

export function LunarCoinIcon({ size = 24, className = "" }) {
  return (
    <img
      src={lunarCoinImg}
      alt="Lunar Coin"
      className={`lunar-coin-icon ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        verticalAlign: "middle",
      }}
    />
  );
}
