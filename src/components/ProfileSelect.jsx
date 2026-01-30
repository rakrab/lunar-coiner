import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export function ProfileSelect({ onProfileSelect }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      setLoading(true);
      const steamProfiles = await invoke("get_steam_profiles");
      setProfiles(steamProfiles);
      setError(null);
    } catch (err) {
      setError("Failed to scan for profiles: " + err);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportCustom() {
    try {
      const selected = await open({
        title: "Select RoR2 Save File",
        filters: [{ name: "XML Files", extensions: ["xml"] }],
      });

      if (selected) {
        const profileData = await invoke("load_profile", { path: selected });
        onProfileSelect({
          path: selected,
          coins: profileData.coins,
          totalCollected: profileData.total_collected,
        });
      }
    } catch (err) {
      setError("Failed to load profile: " + err);
    }
  }

  function handleSelectProfile(profile) {
    onProfileSelect({
      path: profile.path,
      coins: profile.coins,
      totalCollected: profile.total_collected,
    });
  }

  if (loading) {
    return (
      <div className="profile-select">
        <h2>Loading profiles...</h2>
      </div>
    );
  }

  return (
    <div className="profile-select">
      <h1>Lunar Coiner</h1>
      <h2>Select Your Profile</h2>

      {error && <p className="error">{error}</p>}

      {profiles.length > 0 ? (
        <div className="profile-list">
          {profiles.map((profile, index) => (
            <button
              key={index}
              className="profile-item"
              onClick={() => handleSelectProfile(profile)}
            >
              <span className="steam-id">Steam ID: {profile.steam_id}</span>
              <span className="coin-count">{profile.coins} Lunar Coins</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="no-profiles">No RoR2 profiles found automatically.</p>
      )}

      <button className="import-button" onClick={handleImportCustom}>
        Import Custom Save File
      </button>
    </div>
  );
}
