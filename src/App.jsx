import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ProfileSelect } from "./components/ProfileSelect";
import { BlackjackTable } from "./components/BlackjackTable";
import { ScreenTransition } from "./components/ScreenTransition";
import { useBlackjack } from "./hooks/useBlackjack";
import "./App.css";

function App() {
  const [profile, setProfile] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(null);
  const game = useBlackjack(0);

  useEffect(() => {
    if (profile) {
      game.updateCoins(profile.coins);
    }
  }, [profile]);

  async function handleSaveCoins() {
    if (!profile) return;

    try {
      const coinDifference = game.coins - profile.coins;
      const newTotal = profile.totalCollected + Math.max(0, coinDifference);

      await invoke("save_coins", {
        path: profile.path,
        coins: game.coins,
        total: newTotal,
      });

      setProfile((prev) => ({
        ...prev,
        coins: game.coins,
        totalCollected: newTotal,
      }));
    } catch (err) {
      console.error("Failed to save coins:", err);
    }
  }

  function handleProfileSelect(selectedProfile) {
    setPendingProfile(selectedProfile);
    setTransitioning(true);
  }

  function handleTransitionMidpoint() {
    if (pendingProfile) {
      setProfile(pendingProfile);
      setShowTable(true);
      setPendingProfile(null);
    } else {
      setProfile(null);
      setShowTable(false);
    }
  }

  function handleTransitionComplete() {
    setTransitioning(false);
  }

  async function handleSwitchProfile() {
    await handleSaveCoins();
    game.reset();
    setPendingProfile(null);
    setTransitioning(true);
  }

  return (
    <div className="app-container">
      <ScreenTransition
        active={transitioning}
        onMidpoint={handleTransitionMidpoint}
        onComplete={handleTransitionComplete}
      />

      {!showTable ? (
        <ProfileSelect onProfileSelect={handleProfileSelect} />
      ) : (
        <BlackjackTable
          game={game}
          onSaveCoins={handleSaveCoins}
          onSwitchProfile={handleSwitchProfile}
        />
      )}
    </div>
  );
}

export default App;
