use regex::Regex;
use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

#[derive(Debug, Serialize, Clone)]
pub struct ProfileInfo {
    pub path: String,
    pub name: String,
    pub steam_id: String,
    pub coins: u32,
    pub total_collected: u32,
}

#[derive(Debug, Serialize)]
pub struct ProfileData {
    pub name: String,
    pub coins: u32,
    pub total_collected: u32,
}

/// Get Steam installation path from Windows Registry
#[cfg(target_os = "windows")]
fn get_steam_path_from_registry() -> Option<PathBuf> {
    // Try HKEY_LOCAL_MACHINE first (32-bit view on 64-bit Windows)
    if let Ok(hklm) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey("SOFTWARE\\WOW6432Node\\Valve\\Steam")
    {
        if let Ok(path) = hklm.get_value::<String, _>("InstallPath") {
            let steam_path = PathBuf::from(path);
            if steam_path.exists() {
                return Some(steam_path);
            }
        }
    }

    // Try HKEY_LOCAL_MACHINE without WOW6432Node
    if let Ok(hklm) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey("SOFTWARE\\Valve\\Steam")
    {
        if let Ok(path) = hklm.get_value::<String, _>("InstallPath") {
            let steam_path = PathBuf::from(path);
            if steam_path.exists() {
                return Some(steam_path);
            }
        }
    }

    // Try HKEY_CURRENT_USER
    if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey("Software\\Valve\\Steam")
    {
        if let Ok(path) = hkcu.get_value::<String, _>("SteamPath") {
            // SteamPath uses forward slashes, normalize it
            let normalized = path.replace('/', "\\");
            let steam_path = PathBuf::from(normalized);
            if steam_path.exists() {
                return Some(steam_path);
            }
        }
    }

    None
}

/// Get the list of paths to search (for debugging)
pub fn debug_search_paths() -> Vec<String> {
    let mut paths = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // Registry path
        if let Some(steam_path) = get_steam_path_from_registry() {
            let userdata = steam_path.join("userdata");
            paths.push(format!(
                "[REGISTRY] {} (exists: {})",
                userdata.display(),
                userdata.exists()
            ));
        } else {
            paths.push("[REGISTRY] Not found".to_string());
        }

        // Common paths
        let common_paths = vec![
            PathBuf::from("C:\\Program Files (x86)\\Steam\\userdata"),
            PathBuf::from("C:\\Program Files\\Steam\\userdata"),
        ];

        for path in common_paths {
            paths.push(format!("[COMMON] {} (exists: {})", path.display(), path.exists()));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let linux_paths = vec![
                PathBuf::from(&home).join(".steam/steam/userdata"),
                PathBuf::from(&home).join(".local/share/Steam/userdata"),
            ];
            for path in linux_paths {
                paths.push(format!("[LINUX] {} (exists: {})", path.display(), path.exists()));
            }
        }
    }

    paths
}

/// Scan Windows Steam userdata paths for RoR2 profiles
pub fn scan_steam_profiles() -> Vec<ProfileInfo> {
    let mut profiles = Vec::new();
    let mut checked_paths: HashSet<PathBuf> = HashSet::new();

    #[cfg(target_os = "windows")]
    {
        let mut steam_userdata_paths: Vec<PathBuf> = Vec::new();

        // First priority: Get Steam path from Windows Registry
        if let Some(steam_path) = get_steam_path_from_registry() {
            steam_userdata_paths.push(steam_path.join("userdata"));
        }

        // Second priority: Common installation paths
        let common_paths = vec![
            PathBuf::from("C:\\Program Files (x86)\\Steam\\userdata"),
            PathBuf::from("C:\\Program Files\\Steam\\userdata"),
        ];
        steam_userdata_paths.extend(common_paths);

        // Third priority: Check common drive letters for Steam installations
        for drive in ['D', 'E', 'F', 'G'].iter() {
            let drive_paths = vec![
                PathBuf::from(format!("{}:\\Steam\\userdata", drive)),
                PathBuf::from(format!("{}:\\Games\\Steam\\userdata", drive)),
                PathBuf::from(format!("{}:\\SteamLibrary\\userdata", drive)),
                PathBuf::from(format!("{}:\\Program Files\\Steam\\userdata", drive)),
                PathBuf::from(format!("{}:\\Program Files (x86)\\Steam\\userdata", drive)),
            ];
            steam_userdata_paths.extend(drive_paths);
        }

        // Scan all paths, avoiding duplicates
        for steam_path in steam_userdata_paths {
            // Normalize path for comparison
            if let Ok(canonical) = steam_path.canonicalize() {
                if checked_paths.contains(&canonical) {
                    continue;
                }
                checked_paths.insert(canonical);
            } else if checked_paths.contains(&steam_path) {
                continue;
            } else {
                checked_paths.insert(steam_path.clone());
            }

            if steam_path.exists() {
                profiles.extend(scan_userdata_dir(&steam_path));
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Check common Steam paths on Linux
        if let Ok(home) = std::env::var("HOME") {
            let steam_paths = vec![
                PathBuf::from(&home).join(".steam/steam/userdata"),
                PathBuf::from(&home).join(".local/share/Steam/userdata"),
            ];

            for steam_path in steam_paths {
                if steam_path.exists() {
                    profiles.extend(scan_userdata_dir(&steam_path));
                }
            }
        }
    }

    profiles
}

fn scan_userdata_dir(userdata_path: &PathBuf) -> Vec<ProfileInfo> {
    let mut profiles = Vec::new();

    // RoR2 App ID is 632360
    const ROR2_APP_ID: &str = "632360";

    if let Ok(entries) = fs::read_dir(userdata_path) {
        for entry in entries.flatten() {
            let steam_id = entry.file_name().to_string_lossy().to_string();

            // Skip non-numeric directories (they aren't Steam IDs)
            if !steam_id.chars().all(|c| c.is_ascii_digit()) {
                continue;
            }

            let profiles_dir = entry
                .path()
                .join(ROR2_APP_ID)
                .join("remote")
                .join("UserProfiles");

            // Scan all XML files in the UserProfiles directory (skip .bak files)
            if profiles_dir.exists() {
                if let Ok(profile_entries) = fs::read_dir(&profiles_dir) {
                    for profile_entry in profile_entries.flatten() {
                        let file_name = profile_entry.file_name().to_string_lossy().to_string();
                        // Only process .xml files, not .xml.bak backup files
                        if file_name.ends_with(".xml") && !file_name.ends_with(".xml.bak") {
                            let save_path = profile_entry.path();
                            if let Ok(data) = read_profile_data(&save_path.to_string_lossy()) {
                                profiles.push(ProfileInfo {
                                    path: save_path.to_string_lossy().to_string(),
                                    name: data.name,
                                    steam_id: steam_id.clone(),
                                    coins: data.coins,
                                    total_collected: data.total_collected,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    profiles
}

/// Read coin data from a RoR2 profile XML file using regex (preserves file integrity)
pub fn read_profile_data(path: &str) -> Result<ProfileData, String> {
    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Extract profile name
    let name_re = Regex::new(r"<name>([^<]*)</name>").unwrap();
    let name = name_re
        .captures(&content)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    // Extract coins
    let coins_re = Regex::new(r"<coins>(\d+)</coins>").unwrap();
    let coins = coins_re
        .captures(&content)
        .and_then(|c| c.get(1))
        .and_then(|m| m.as_str().parse().ok())
        .unwrap_or(0);

    // Extract totalCollectedCoins
    let total_re = Regex::new(r"<totalCollectedCoins>(\d+)</totalCollectedCoins>").unwrap();
    let total_collected = total_re
        .captures(&content)
        .and_then(|c| c.get(1))
        .and_then(|m| m.as_str().parse().ok())
        .unwrap_or(0);

    Ok(ProfileData {
        name,
        coins,
        total_collected,
    })
}

/// Update coins in a RoR2 profile XML file using string replacement
/// This preserves the exact file structure, only modifying the coin values
pub fn write_coins(path: &str, new_coins: u32, new_total: u32) -> Result<(), String> {
    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Create backup file before modifying
    let backup_path = format!("{}.bak", path);
    fs::write(&backup_path, &content)
        .map_err(|e| format!("Failed to create backup file: {}", e))?;

    // Replace coins value using regex (only the number inside <coins></coins>)
    let coins_re = Regex::new(r"<coins>\d+</coins>").unwrap();
    let content = coins_re
        .replace(&content, format!("<coins>{}</coins>", new_coins))
        .to_string();

    // Replace totalCollectedCoins value
    let total_re = Regex::new(r"<totalCollectedCoins>\d+</totalCollectedCoins>").unwrap();
    let content = total_re
        .replace(&content, format!("<totalCollectedCoins>{}</totalCollectedCoins>", new_total))
        .to_string();

    fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}
