import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ProfileSelect } from "./components/ProfileSelect";
import { BlackjackTable } from "./components/BlackjackTable";
import { useBlackjack } from "./hooks/useBlackjack";
import "./App.css";

function App() {
  const [profile, setProfile] = useState(null);
  const game = useBlackjack(0);

  useEffect(() => {
    if (profile) {
      game.updateCoins(profile.coins);
    }
  }, [profile]);

  async function handleSaveCoins() {
    if (!profile) return;

    try {
      // Calculate new total: old total + any coins won (difference from starting amount)
      const coinDifference = game.coins - profile.coins;
      const newTotal = profile.totalCollected + Math.max(0, coinDifference);

      await invoke("save_coins", {
        path: profile.path,
        coins: game.coins,
        total: newTotal,
      });

      // Update profile state with new coin values
      setProfile((prev) => ({
        ...prev,
        coins: game.coins,
        totalCollected: newTotal,
      }));
    } catch (err) {
      console.error("Failed to save coins:", err);
    }
  }

  function handleExit() {
    game.reset();
    setProfile(null);
  }

  if (!profile) {
    return <ProfileSelect onProfileSelect={setProfile} />;
  }

  return (
    <BlackjackTable game={game} onSaveCoins={handleSaveCoins} onExit={handleExit} />
  );
}

export default App;
