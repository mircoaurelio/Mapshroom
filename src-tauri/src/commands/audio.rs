use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioDeviceInfo {
  pub id: String,
  pub name: String,
  pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAudioFrame {
  pub timestamp_ms: f64,
  pub rms: f64,
  pub peak: f64,
  pub bass: f64,
  pub mid: f64,
  pub treble: f64,
  pub spectral_flux: f64,
  pub beat: bool,
  pub bpm: f64,
}

impl Default for NativeAudioFrame {
  fn default() -> Self {
    Self {
      timestamp_ms: 0.0,
      rms: 0.0,
      peak: 0.0,
      bass: 0.0,
      mid: 0.0,
      treble: 0.0,
      spectral_flux: 0.0,
      beat: false,
      bpm: 0.0,
    }
  }
}

pub struct AudioState {
  pub frame: Arc<Mutex<NativeAudioFrame>>,
  stop: Arc<AtomicBool>,
  running: AtomicBool,
}

impl Default for AudioState {
  fn default() -> Self {
    Self {
      frame: Arc::new(Mutex::new(NativeAudioFrame::default())),
      stop: Arc::new(AtomicBool::new(false)),
      running: AtomicBool::new(false),
    }
  }
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDeviceInfo>, String> {
  let host = cpal::default_host();
  let mut devices = vec![AudioDeviceInfo {
    id: "loopback:default".to_string(),
    name: "System audio (WASAPI loopback)".to_string(),
    kind: "loopback".to_string(),
  }];

  if let Ok(inputs) = host.input_devices() {
    for (index, device) in inputs.enumerate() {
      let name = device.name().unwrap_or_else(|_| format!("Input {index}"));
      let lowered = name.to_lowercase();
      let kind = if lowered.contains("stereo mix")
        || lowered.contains("what u hear")
        || lowered.contains("loopback")
      {
        "loopback"
      } else {
        "microphone"
      };
      devices.push(AudioDeviceInfo {
        id: format!("input:{index}:{name}"),
        name,
        kind: kind.to_string(),
      });
    }
  }

  Ok(devices)
}

fn analyze_samples(samples: &[f32], previous_flux: f64) -> (NativeAudioFrame, f64) {
  if samples.is_empty() {
    return (NativeAudioFrame::default(), previous_flux);
  }

  let mut sum_squares = 0.0_f64;
  let mut peak = 0.0_f64;
  let mut bass = 0.0_f64;
  let mut mid = 0.0_f64;
  let mut treble = 0.0_f64;
  let third = (samples.len() / 3).max(1);

  for (index, sample) in samples.iter().enumerate() {
    let value = sample.abs() as f64;
    sum_squares += value * value;
    peak = peak.max(value);
    if index < third {
      bass += value;
    } else if index < third * 2 {
      mid += value;
    } else {
      treble += value;
    }
  }

  let count = samples.len() as f64;
  let rms = (sum_squares / count).sqrt();
  let spectral_flux = (rms - previous_flux).abs();
  let beat = spectral_flux > 0.08 && rms > 0.05;

  (
    NativeAudioFrame {
      timestamp_ms: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs_f64() * 1000.0)
        .unwrap_or(0.0),
      rms,
      peak,
      bass: (bass / third as f64).clamp(0.0, 1.0),
      mid: (mid / third as f64).clamp(0.0, 1.0),
      treble: (treble / third as f64).clamp(0.0, 1.0),
      spectral_flux,
      beat,
      bpm: if beat { 120.0 } else { 0.0 },
    },
    rms,
  )
}

fn publish_frame(
  app: &AppHandle,
  frame_state: &Arc<Mutex<NativeAudioFrame>>,
  previous_flux: &Mutex<f64>,
  samples: &[f32],
) {
  let mut previous = previous_flux.lock();
  let (frame, next_flux) = analyze_samples(samples, *previous);
  *previous = next_flux;
  *frame_state.lock() = frame.clone();
  let _ = app.emit("audio://frame", frame);
}

fn spawn_cpal_capture(
  app: AppHandle,
  frame_state: Arc<Mutex<NativeAudioFrame>>,
  stop: Arc<AtomicBool>,
  device_id: Option<String>,
  prefer_loopback_name: bool,
) {
  std::thread::spawn(move || {
    let host = cpal::default_host();
    let device = if prefer_loopback_name {
      host
        .input_devices()
        .ok()
        .and_then(|devices| {
          devices.into_iter().find(|candidate| {
            candidate
              .name()
              .map(|name| {
                let lowered = name.to_lowercase();
                lowered.contains("stereo mix")
                  || lowered.contains("wave out")
                  || lowered.contains("loopback")
                  || lowered.contains("what u hear")
              })
              .unwrap_or(false)
          })
        })
        .or_else(|| host.default_input_device())
    } else if let Some(target) = device_id
      .as_deref()
      .filter(|value| value.starts_with("input:"))
    {
      let target_name = target.splitn(3, ':').nth(2).unwrap_or_default();
      host
        .input_devices()
        .ok()
        .and_then(|devices| {
          devices
            .into_iter()
            .find(|candidate| candidate.name().ok().as_deref() == Some(target_name))
        })
        .or_else(|| host.default_input_device())
    } else {
      host.default_input_device()
    };

    let Some(device) = device else {
      eprintln!("No audio capture device available.");
      return;
    };

    let Ok(config) = device.default_input_config() else {
      eprintln!("Unable to read default input config.");
      return;
    };

    let sample_format = config.sample_format();
    let stream_config: cpal::StreamConfig = config.into();
    let previous_flux = Arc::new(Mutex::new(0.0_f64));
    let err_fn = |error| eprintln!("Audio stream error: {error}");

    let stream = match sample_format {
      cpal::SampleFormat::F32 => {
        let previous_flux = Arc::clone(&previous_flux);
        let frame_state = Arc::clone(&frame_state);
        let app = app.clone();
        device.build_input_stream(
          &stream_config,
          move |data: &[f32], _| {
            publish_frame(&app, &frame_state, previous_flux.as_ref(), data);
          },
          err_fn,
          None,
        )
      }
      cpal::SampleFormat::I16 => {
        let previous_flux = Arc::clone(&previous_flux);
        let frame_state = Arc::clone(&frame_state);
        let app = app.clone();
        device.build_input_stream(
          &stream_config,
          move |data: &[i16], _| {
            let samples: Vec<f32> = data
              .iter()
              .map(|sample| *sample as f32 / i16::MAX as f32)
              .collect();
            publish_frame(&app, &frame_state, previous_flux.as_ref(), &samples);
          },
          err_fn,
          None,
        )
      }
      other => {
        eprintln!("Unsupported audio sample format: {other:?}");
        return;
      }
    };

    let Ok(stream) = stream else {
      eprintln!("Unable to build audio input stream.");
      return;
    };

    if let Err(error) = stream.play() {
      eprintln!("Unable to start audio stream: {error}");
      return;
    }

    while !stop.load(Ordering::SeqCst) {
      std::thread::sleep(std::time::Duration::from_millis(50));
    }
    drop(stream);
  });
}

#[tauri::command]
pub fn start_audio_capture(
  app: AppHandle,
  state: State<'_, AudioState>,
  source: String,
  device_id: Option<String>,
) -> Result<(), String> {
  stop_audio_capture_inner(&state);
  *state.frame.lock() = NativeAudioFrame::default();
  state.stop.store(false, Ordering::SeqCst);
  state.running.store(true, Ordering::SeqCst);

  let is_loopback = source == "system" || device_id.as_deref() == Some("loopback:default");
  spawn_cpal_capture(
    app,
    Arc::clone(&state.frame),
    Arc::clone(&state.stop),
    device_id,
    is_loopback,
  );
  Ok(())
}

fn stop_audio_capture_inner(state: &AudioState) {
  state.stop.store(true, Ordering::SeqCst);
  state.running.store(false, Ordering::SeqCst);
  // Give the capture thread a moment to observe the stop flag before restart.
  std::thread::sleep(std::time::Duration::from_millis(60));
  state.stop.store(false, Ordering::SeqCst);
  *state.frame.lock() = NativeAudioFrame::default();
}

#[tauri::command]
pub fn stop_audio_capture(state: State<'_, AudioState>) -> Result<(), String> {
  stop_audio_capture_inner(&state);
  Ok(())
}

#[tauri::command]
pub fn get_audio_frame(state: State<'_, AudioState>) -> NativeAudioFrame {
  state.frame.lock().clone()
}
