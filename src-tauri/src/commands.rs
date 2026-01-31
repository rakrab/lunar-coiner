use crate::save_file::{debug_search_paths, read_profile_data, scan_steam_profiles, write_coins, ProfileData, ProfileInfo};

#[tauri::command]
pub fn get_steam_profiles() -> Result<Vec<ProfileInfo>, String> {
    Ok(scan_steam_profiles())
}

#[tauri::command]
pub fn debug_paths() -> Vec<String> {
    debug_search_paths()
}

#[tauri::command]
pub fn load_profile(path: String) -> Result<ProfileData, String> {
    read_profile_data(&path)
}

#[tauri::command]
pub fn save_coins(path: String, coins: u32, total: u32) -> Result<(), String> {
    write_coins(&path, coins, total)
}
