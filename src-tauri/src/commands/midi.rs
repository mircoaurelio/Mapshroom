use midir::{MidiInput, MidiInputConnection};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MidiDeviceInfo {
  pub id: String,
  pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MidiMessageEvent {
  pub device_id: String,
  pub device_name: String,
  pub bytes: Vec<u8>,
  pub timestamp_ms: f64,
}

pub struct MidiState {
  pub connection: Mutex<Option<MidiInputConnection<()>>>,
}

impl Default for MidiState {
  fn default() -> Self {
    Self {
      connection: Mutex::new(None),
    }
  }
}

#[tauri::command]
pub fn list_midi_inputs() -> Result<Vec<MidiDeviceInfo>, String> {
  let midi_in = MidiInput::new("Mapshroom MIDI").map_err(|error| error.to_string())?;
  let ports = midi_in.ports();
  let mut devices = Vec::new();
  for (index, port) in ports.iter().enumerate() {
    let name = midi_in
      .port_name(port)
      .unwrap_or_else(|_| format!("MIDI Input {index}"));
    if name.contains("MIDIIN2") {
      continue;
    }
    devices.push(MidiDeviceInfo {
      id: format!("midi:{index}"),
      name,
    });
  }
  Ok(devices)
}

#[tauri::command]
pub fn start_midi_listen(
  app: AppHandle,
  state: State<'_, MidiState>,
  device_id: Option<String>,
) -> Result<MidiDeviceInfo, String> {
  stop_midi_listen(state.clone())?;

  let midi_in = MidiInput::new("Mapshroom MIDI").map_err(|error| error.to_string())?;
  let ports = midi_in.ports();
  if ports.is_empty() {
    return Err("No MIDI input devices were found.".to_string());
  }

  let selected_index = device_id
    .as_deref()
    .and_then(|value| value.strip_prefix("midi:"))
    .and_then(|value| value.parse::<usize>().ok())
    .unwrap_or(0)
    .min(ports.len() - 1);

  let port = ports
    .get(selected_index)
    .ok_or_else(|| "Requested MIDI device was not found.".to_string())?;
  let name = midi_in
    .port_name(port)
    .unwrap_or_else(|_| format!("MIDI Input {selected_index}"));
  let device = MidiDeviceInfo {
    id: format!("midi:{selected_index}"),
    name: name.clone(),
  };

  let device_id_for_events = device.id.clone();
  let device_name_for_events = device.name.clone();
  let connection = midi_in
    .connect(
      port,
      "mapshroom-midi-input",
      move |_stamp, message, _| {
        let event = MidiMessageEvent {
          device_id: device_id_for_events.clone(),
          device_name: device_name_for_events.clone(),
          bytes: message.to_vec(),
          timestamp_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_secs_f64() * 1000.0)
            .unwrap_or(0.0),
        };
        let _ = app.emit("midi://message", event);
      },
      (),
    )
    .map_err(|error| error.to_string())?;

  *state.connection.lock() = Some(connection);
  Ok(device)
}

#[tauri::command]
pub fn stop_midi_listen(state: State<'_, MidiState>) -> Result<(), String> {
  *state.connection.lock() = None;
  Ok(())
}
