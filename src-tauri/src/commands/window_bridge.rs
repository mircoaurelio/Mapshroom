use serde::Serialize;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

const OUTPUT_LABEL: &str = "output";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
  pub id: String,
  pub name: String,
  pub x: i32,
  pub y: i32,
  pub width: u32,
  pub height: u32,
  pub scale_factor: f64,
  pub is_primary: bool,
}

#[tauri::command]
pub fn list_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
  let window = app
    .get_webview_window("main")
    .ok_or_else(|| "Main window is unavailable.".to_string())?;
  let primary_name = window
    .primary_monitor()
    .map_err(|error| error.to_string())?
    .and_then(|monitor| monitor.name().map(|value| value.to_string()));

  let monitors = window
    .available_monitors()
    .map_err(|error| error.to_string())?
    .into_iter()
    .enumerate()
    .map(|(index, monitor)| {
      let position = monitor.position();
      let size = monitor.size();
      let name = monitor
        .name()
        .map(|value| value.to_string())
        .unwrap_or_else(|| format!("Display {}", index + 1));
      let is_primary = primary_name
        .as_ref()
        .map(|value| value == &name)
        .unwrap_or(index == 0);
      MonitorInfo {
        id: format!("{}:{}:{}x{}", position.x, position.y, size.width, size.height),
        name,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        scale_factor: monitor.scale_factor(),
        is_primary,
      }
    })
    .collect();

  Ok(monitors)
}

#[tauri::command]
pub async fn open_output_window(app: AppHandle, session_id: String) -> Result<(), String> {
  let url = format!("index.html#/output/{session_id}?chooseScreen=1");

  if let Some(existing) = app.get_webview_window(OUTPUT_LABEL) {
    let script = format!(
      "window.location.hash = {};",
      serde_json::to_string(&format!("/output/{session_id}?chooseScreen=1"))
        .map_err(|error| error.to_string())?
    );
    existing.eval(&script).map_err(|error| error.to_string())?;
    let _ = existing.set_focus();
    return Ok(());
  }

  WebviewWindowBuilder::new(&app, OUTPUT_LABEL, WebviewUrl::App(url.into()))
    .title("Mapshroom Output")
    .inner_size(1280.0, 720.0)
    .resizable(true)
    .decorations(true)
    .fullscreen(false)
    .build()
    .map_err(|error| error.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn focus_output_window(app: AppHandle) -> Result<bool, String> {
  if let Some(window) = app.get_webview_window(OUTPUT_LABEL) {
    window.set_focus().map_err(|error| error.to_string())?;
    return Ok(true);
  }
  Ok(false)
}

#[tauri::command]
pub fn place_output_on_monitor(
  app: AppHandle,
  monitor_id: Option<String>,
  fullscreen: bool,
) -> Result<(), String> {
  let window = app
    .get_webview_window(OUTPUT_LABEL)
    .ok_or_else(|| "Output window is not open.".to_string())?;

  let monitors = window
    .available_monitors()
    .map_err(|error| error.to_string())?;

  let selected = if let Some(target_id) = monitor_id.as_deref() {
    monitors.into_iter().find(|monitor| {
      let position = monitor.position();
      let size = monitor.size();
      let id = format!("{}:{}:{}x{}", position.x, position.y, size.width, size.height);
      id == target_id
    })
  } else {
    window.current_monitor().map_err(|error| error.to_string())?
  };

  let Some(monitor) = selected else {
    return Err("Selected monitor was not found.".to_string());
  };

  let position = monitor.position();
  let size = monitor.size();
  window
    .set_fullscreen(false)
    .map_err(|error| error.to_string())?;
  window
    .set_decorations(false)
    .map_err(|error| error.to_string())?;
  window
    .set_position(PhysicalPosition::new(position.x, position.y))
    .map_err(|error| error.to_string())?;
  window
    .set_size(PhysicalSize::new(size.width, size.height))
    .map_err(|error| error.to_string())?;
  if fullscreen {
    window
      .set_fullscreen(true)
      .map_err(|error| error.to_string())?;
  }
  window.set_focus().map_err(|error| error.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn close_output_window(app: AppHandle) -> Result<(), String> {
  if let Some(window) = app.get_webview_window(OUTPUT_LABEL) {
    window.close().map_err(|error| error.to_string())?;
  }
  Ok(())
}
