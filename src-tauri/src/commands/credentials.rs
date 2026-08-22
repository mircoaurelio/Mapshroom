use keyring::Entry;
use serde::Serialize;

const SERVICE: &str = "dev.mapshroom.app";

fn entry_for(provider: &str) -> Result<Entry, String> {
  let key = match provider {
    "openai" | "anthropic" | "google" => provider,
    _ => return Err(format!("Unsupported credential provider: {provider}")),
  };
  Entry::new(SERVICE, key).map_err(|error| error.to_string())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialStatus {
  pub provider: String,
  pub present: bool,
}

#[tauri::command]
pub fn credential_status(provider: String) -> Result<CredentialStatus, String> {
  let entry = entry_for(&provider)?;
  let present = matches!(entry.get_password(), Ok(value) if !value.trim().is_empty());
  Ok(CredentialStatus { provider, present })
}

#[tauri::command]
pub fn save_credential(provider: String, secret: String) -> Result<(), String> {
  let trimmed = secret.trim();
  if trimmed.is_empty() {
    return Err("Credential value cannot be empty.".to_string());
  }
  let entry = entry_for(&provider)?;
  entry
    .set_password(trimmed)
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_credential(provider: String) -> Result<(), String> {
  let entry = entry_for(&provider)?;
  match entry.delete_credential() {
    Ok(()) => Ok(()),
    Err(keyring::Error::NoEntry) => Ok(()),
    Err(error) => Err(error.to_string()),
  }
}

pub fn read_credential(provider: &str) -> Result<Option<String>, String> {
  let entry = entry_for(provider)?;
  match entry.get_password() {
    Ok(value) if !value.trim().is_empty() => Ok(Some(value)),
    Ok(_) | Err(keyring::Error::NoEntry) => Ok(None),
    Err(error) => Err(error.to_string()),
  }
}
