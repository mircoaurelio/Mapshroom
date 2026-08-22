use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Deserialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTextRequest {
  pub default_file_name: String,
  pub contents: String,
  pub filters: Option<Vec<FileFilter>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveBytesRequest {
  pub default_file_name: String,
  pub base64_contents: String,
  pub filters: Option<Vec<FileFilter>>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileFilter {
  pub name: String,
  pub extensions: Vec<String>,
}

fn write_selected_path(path: Option<tauri_plugin_dialog::FilePath>, bytes: &[u8]) -> Result<Option<String>, String> {
  let Some(file_path) = path else {
    return Ok(None);
  };
  let path = file_path
    .into_path()
    .map_err(|error| error.to_string())?;
  std::fs::write(&path, bytes).map_err(|error| error.to_string())?;
  Ok(Some(path.display().to_string()))
}

#[tauri::command]
pub async fn save_text_dialog(app: AppHandle, request: SaveTextRequest) -> Result<Option<String>, String> {
  let (sender, receiver) = std::sync::mpsc::channel();
  let mut dialog = app.dialog().file().set_file_name(&request.default_file_name);
  if let Some(filters) = request.filters {
    for filter in filters {
      let extensions: Vec<&str> = filter.extensions.iter().map(String::as_str).collect();
      dialog = dialog.add_filter(filter.name, &extensions);
    }
  }
  dialog.save_file(move |path| {
    let _ = sender.send(path);
  });
  let path = receiver.recv().map_err(|error| error.to_string())?;
  write_selected_path(path, request.contents.as_bytes())
}

#[tauri::command]
pub async fn save_bytes_dialog(app: AppHandle, request: SaveBytesRequest) -> Result<Option<String>, String> {
  let bytes = STANDARD
    .decode(request.base64_contents.as_bytes())
    .map_err(|error| error.to_string())?;
  let (sender, receiver) = std::sync::mpsc::channel();
  let mut dialog = app.dialog().file().set_file_name(&request.default_file_name);
  if let Some(filters) = request.filters {
    for filter in filters {
      let extensions: Vec<&str> = filter.extensions.iter().map(String::as_str).collect();
      dialog = dialog.add_filter(filter.name, &extensions);
    }
  }
  dialog.save_file(move |path| {
    let _ = sender.send(path);
  });
  let path = receiver.recv().map_err(|error| error.to_string())?;
  write_selected_path(path, &bytes)
}
