import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { LunarParticles } from "./LunarParticles";
import { LunarCoinIcon } from "./LunarCoinIcon";

export function ProfileSelect({ onProfileSelect }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadProfiles();
    // Delay mount animation slightly
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  async function loadProfiles() {
    try {
      setLoading(true);
      try {
        const debugPaths = await invoke("debug_paths");
        console.log("Save file search paths:", debugPaths);
      } catch (e) {
        console.log("Debug paths not available:", e);
      }
      const steamProfiles = await invoke("get_steam_profiles");
      console.log("Found profiles:", steamProfiles);
      setProfiles(steamProfiles);
      setError(null);
    } catch (err) {
      setError("Failed to scan for profiles: " + err);
    } finally {
      setLoading(false);
    }
  }

  const handleImportCustom = useCallback(async () => {
    try {
      const selected = await open({
        title: "Select RoR2 Save File",
        filters: [{ name: "XML Files", extensions: ["xml"] }],
      });
      if (selected) {
        const profileData = await invoke("load_profile", { path: selected });
        onProfileSelect({
          path: selected,
          name: profileData.name,
          coins: profileData.coins,
          totalCollected: profileData.total_collected,
        });
      }
    } catch (err) {
      setError("Failed to load profile: " + err);
    }
  }, [onProfileSelect]);

  const handleSelectProfile = useCallback((profile) => {
    onProfileSelect({
      path: profile.path,
      name: profile.name,
      coins: profile.coins,
      totalCollected: profile.total_collected,
    });
  }, [onProfileSelect]);

  return (
    <div className={`profile-select ${mounted ? "mounted" : ""}`}>
      <LunarParticles intensity="subtle" />

      <div className="profile-content">
        <header className="profile-header">
          <h1 className="title">
            <LunarCoinIcon size={48} className="title-icon" />
            <span>Lunar Coiner</span>
          </h1>
          <p className="subtitle">
            {loading ? "Searching the void..." : "Select Your Profile"}
          </p>
        </header>

        {error && <p className="error-message">{error}</p>}

        {!loading && (
          <>
            {profiles.length > 0 ? (
              <div className="profile-list">
                {profiles.map((profile, index) => (
                  <button
                    key={profile.path}
                    className="profile-item"
                    onClick={() => handleSelectProfile(profile)}
                    style={{ "--index": index }}
                  >
                    <div className="profile-info">
                      <span className="profile-name">{profile.name}</span>
                      <span className="profile-coins">
                        <LunarCoinIcon size={22} />
                        <span>{profile.coins} Lunar Coins</span>
                      </span>
                    </div>
                    <div className="profile-arrow">→</div>
                    <div className="profile-hover-glow" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="no-profiles">
                No profiles found in the void.
              </p>
            )}

            <button className="import-button" onClick={handleImportCustom}>
              <span className="import-icon">+</span>
              Import Save File
            </button>
          </>
        )}

        {loading && (
          <div className="loading-indicator">
            <div className="loading-ring" />
            <div className="loading-ring delay" />
          </div>
        )}
      </div>

      <div className="void-gradient" />
    </div>
  );
}
