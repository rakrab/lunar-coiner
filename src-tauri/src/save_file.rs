use quick_xml::events::{BytesStart, BytesText, Event};
use quick_xml::{Reader, Writer};
use serde::Serialize;
use std::fs;
use std::io::Cursor;
use std::path::PathBuf;

#[derive(Debug, Serialize, Clone)]
pub struct ProfileInfo {
    pub path: String,
    pub steam_id: String,
    pub coins: u32,
    pub total_collected: u32,
}

#[derive(Debug, Serialize)]
pub struct ProfileData {
    pub coins: u32,
    pub total_collected: u32,
}

/// Scan Windows Steam userdata paths for RoR2 profiles
pub fn scan_steam_profiles() -> Vec<ProfileInfo> {
    let mut profiles = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // Common Steam installation paths on Windows
        let steam_paths = vec![
            PathBuf::from("C:\\Program Files (x86)\\Steam\\userdata"),
            PathBuf::from("C:\\Program Files\\Steam\\userdata"),
        ];

        // Also check for custom Steam install via registry or env
        if let Ok(home) = std::env::var("USERPROFILE") {
            let custom_path = PathBuf::from(home).join("Steam\\userdata");
            if custom_path.exists() {
                profiles.extend(scan_userdata_dir(&custom_path));
            }
        }

        for steam_path in steam_paths {
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
            let save_path = entry
                .path()
                .join(ROR2_APP_ID)
                .join("remote")
                .join("UserProfiles")
                .join("default.xml");

            if save_path.exists() {
                if let Ok(data) = read_profile_data(&save_path.to_string_lossy()) {
                    profiles.push(ProfileInfo {
                        path: save_path.to_string_lossy().to_string(),
                        steam_id,
                        coins: data.coins,
                        total_collected: data.total_collected,
                    });
                }
            }
        }
    }

    profiles
}

/// Read coin data from a RoR2 profile XML file
pub fn read_profile_data(path: &str) -> Result<ProfileData, String> {
    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;

    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);

    let mut coins: Option<u32> = None;
    let mut total_collected: Option<u32> = None;
    let mut current_element = String::new();

    loop {
        match reader.read_event() {
            Ok(Event::Start(e)) => {
                current_element = String::from_utf8_lossy(e.name().as_ref()).to_string();
            }
            Ok(Event::Text(e)) => {
                let text = e.unescape().unwrap_or_default().to_string();
                match current_element.as_str() {
                    "coins" => {
                        coins = text.parse().ok();
                    }
                    "totalCollectedCoins" => {
                        total_collected = text.parse().ok();
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parse error: {}", e)),
            _ => {}
        }
    }

    Ok(ProfileData {
        coins: coins.unwrap_or(0),
        total_collected: total_collected.unwrap_or(0),
    })
}

/// Update coins in a RoR2 profile XML file, preserving all other data
pub fn write_coins(path: &str, new_coins: u32, new_total: u32) -> Result<(), String> {
    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;

    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);

    let mut writer = Writer::new(Cursor::new(Vec::new()));
    let mut in_coins = false;
    let mut in_total_collected = false;

    loop {
        match reader.read_event() {
            Ok(Event::Start(e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if name == "coins" {
                    in_coins = true;
                } else if name == "totalCollectedCoins" {
                    in_total_collected = true;
                }
                writer
                    .write_event(Event::Start(BytesStart::new(&name)))
                    .map_err(|e| format!("Write error: {}", e))?;
            }
            Ok(Event::End(e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if name == "coins" {
                    in_coins = false;
                } else if name == "totalCollectedCoins" {
                    in_total_collected = false;
                }
                writer
                    .write_event(Event::End(e))
                    .map_err(|e| format!("Write error: {}", e))?;
            }
            Ok(Event::Text(e)) => {
                if in_coins {
                    writer
                        .write_event(Event::Text(BytesText::new(&new_coins.to_string())))
                        .map_err(|e| format!("Write error: {}", e))?;
                } else if in_total_collected {
                    writer
                        .write_event(Event::Text(BytesText::new(&new_total.to_string())))
                        .map_err(|e| format!("Write error: {}", e))?;
                } else {
                    writer
                        .write_event(Event::Text(e))
                        .map_err(|e| format!("Write error: {}", e))?;
                }
            }
            Ok(Event::Eof) => break,
            Ok(e) => {
                writer
                    .write_event(e)
                    .map_err(|e| format!("Write error: {}", e))?;
            }
            Err(e) => return Err(format!("XML parse error: {}", e)),
        }
    }

    let result = writer.into_inner().into_inner();
    let output =
        String::from_utf8(result).map_err(|e| format!("UTF-8 conversion error: {}", e))?;

    fs::write(path, output).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}
