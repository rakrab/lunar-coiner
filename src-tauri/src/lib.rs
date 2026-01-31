mod commands;
mod save_file;

use commands::{debug_paths, get_steam_profiles, load_profile, save_coins};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_steam_profiles,
            load_profile,
            save_coins,
            debug_paths
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
