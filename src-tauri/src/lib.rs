mod commands;

use commands::{
  audio::{self, AudioState},
  credentials, fs_bridge, http_bridge, midi::{self, MidiState}, window_bridge,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .manage(AudioState::default())
    .manage(MidiState::default())
    .invoke_handler(tauri::generate_handler![
      window_bridge::list_monitors,
      window_bridge::open_output_window,
      window_bridge::focus_output_window,
      window_bridge::place_output_on_monitor,
      window_bridge::close_output_window,
      audio::list_audio_devices,
      audio::start_audio_capture,
      audio::stop_audio_capture,
      audio::get_audio_frame,
      midi::list_midi_inputs,
      midi::start_midi_listen,
      midi::stop_midi_listen,
      credentials::credential_status,
      credentials::save_credential,
      credentials::delete_credential,
      http_bridge::proxy_http_request,
      fs_bridge::save_bytes_dialog,
      fs_bridge::save_text_dialog,
    ])
    .setup(|_app| Ok(()))
    .run(tauri::generate_context!())
    .expect("error while running Mapshroom");
}
