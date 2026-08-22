use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::credentials::read_credential;

const SECRET_HEADER_NAMES: &[&str] = &[
  "authorization",
  "x-api-key",
  "x-goog-api-key",
  "api-key",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyHttpRequest {
  pub url: String,
  pub method: Option<String>,
  pub headers: Option<HashMap<String, String>>,
  pub body: Option<String>,
  pub provider: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyHttpResponse {
  pub status: u16,
  pub body: String,
  pub headers: HashMap<String, String>,
}

fn is_allowed_url(url: &str) -> bool {
  let allowed_prefixes = [
    "https://api.openai.com/",
    "https://api.anthropic.com/",
    "https://generativelanguage.googleapis.com/",
  ];
  allowed_prefixes.iter().any(|prefix| url.starts_with(prefix))
}

fn strip_secret_headers(headers: &mut HashMap<String, String>) {
  headers.retain(|key, _| {
    !SECRET_HEADER_NAMES
      .iter()
      .any(|forbidden| key.eq_ignore_ascii_case(forbidden))
  });
}

fn sanitize_url(url: &str) -> Result<String, String> {
  // Drop any client-supplied API key query parameter before the request leaves the app.
  let Some((base, query)) = url.split_once('?') else {
    return Ok(url.to_string());
  };
  let filtered: Vec<&str> = query
    .split('&')
    .filter(|pair| {
      let key = pair.split('=').next().unwrap_or("");
      !key.eq_ignore_ascii_case("key") && !key.eq_ignore_ascii_case("api_key")
    })
    .collect();
  if filtered.is_empty() {
    Ok(base.to_string())
  } else {
    Ok(format!("{base}?{}", filtered.join("&")))
  }
}

fn append_query_param(url: &str, key: &str, value: &str) -> String {
  let encoded_value: String = value
    .bytes()
    .map(|byte| match byte {
      b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
        (byte as char).to_string()
      }
      _ => format!("%{byte:02X}"),
    })
    .collect();
  if url.contains('?') {
    format!("{url}&{key}={encoded_value}")
  } else {
    format!("{url}?{key}={encoded_value}")
  }
}

#[tauri::command]
pub async fn proxy_http_request(request: ProxyHttpRequest) -> Result<ProxyHttpResponse, String> {
  let provider = request
    .provider
    .as_deref()
    .ok_or_else(|| "Desktop proxy requests must declare a credential provider.".to_string())?;

  if !matches!(provider, "openai" | "anthropic" | "google") {
    return Err(format!("Unsupported credential provider: {provider}"));
  }

  let secret = read_credential(provider)?
    .ok_or_else(|| {
      format!("No {provider} API key is stored in Windows Credential Manager. Add it in Settings.")
    })?;

  let mut url = sanitize_url(&request.url)?;
  if !is_allowed_url(&url) {
    return Err("Requested URL is not allowed by the desktop proxy.".to_string());
  }

  if provider == "google" {
    url = append_query_param(&url, "key", &secret);
  }

  let client = reqwest::Client::new();
  let method = request
    .method
    .unwrap_or_else(|| "POST".to_string())
    .to_uppercase();
  let mut builder = match method.as_str() {
    "GET" => client.get(&url),
    "POST" => client.post(&url),
    "PUT" => client.put(&url),
    "PATCH" => client.patch(&url),
    "DELETE" => client.delete(&url),
    other => return Err(format!("Unsupported HTTP method: {other}")),
  };

  let mut headers = request.headers.unwrap_or_default();
  strip_secret_headers(&mut headers);

  match provider {
    "openai" => {
      headers.insert("Authorization".to_string(), format!("Bearer {secret}"));
    }
    "anthropic" => {
      headers.insert("x-api-key".to_string(), secret.clone());
      headers
        .entry("anthropic-version".to_string())
        .or_insert_with(|| "2023-06-01".to_string());
    }
    "google" => {
      // Google auth is attached as a sanitized query param above.
    }
    _ => {}
  }

  for (key, value) in &headers {
    builder = builder.header(key, value);
  }

  if let Some(body) = request.body {
    builder = builder.body(body);
  }

  let response = builder.send().await.map_err(|error| error.to_string())?;
  let status = response.status().as_u16();
  let response_headers = response
    .headers()
    .iter()
    .map(|(key, value)| {
      (
        key.to_string(),
        value.to_str().unwrap_or_default().to_string(),
      )
    })
    .collect();
  let body = response.text().await.map_err(|error| error.to_string())?;

  Ok(ProxyHttpResponse {
    status,
    body,
    headers: response_headers,
  })
}
