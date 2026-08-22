# Desktop hardware smoke matrix

Use this checklist on a Windows 11 machine with a second display before Store upload.

| Area | Steps | Expected |
|------|-------|----------|
| Output window | Launch app → Open Output → choose secondary monitor | Borderless/fullscreen on selected display only |
| Microphone | Enable audio reactive → Microphone | Levels/beat respond to mic input |
| System audio | Enable audio reactive → System | Loopback or Stereo Mix responds; recoverable error otherwise |
| MIDI | Connect SMC-style mixer → enable MIDI | Faders update uniforms / timeline mix |
| OpenAI | Save key → generate shader | Success without CORS errors |
| Anthropic | Save key → generate shader | Success without CORS errors |
| Google | Save key → generate shader | Success via desktop REST proxy |
| Local AI | Run segmentation/depth once, then again offline-ish | First run downloads; second uses cache |
| Exports | Save project JSON + timeline MP4 | Native save dialog writes files |
| Tools | Open slicer / segmentation / depth / shader lab | Pages load under the packaged origin |
| External links | Open ChatGPT/Perplexity helpers | System browser opens |
| Install page | Visit `#/download` inside desktop app | Treated as already installed |

Record GPU driver version, WebView2 runtime version, and WACK result in the release notes.
