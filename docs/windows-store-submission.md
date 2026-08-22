# Windows Store submission checklist

## Product identity (Partner Center)

Store ID: `9P2DNCLDXSD5`  
Store URL: https://apps.microsoft.com/detail/9P2DNCLDXSD5

| Field | Value |
|-------|--------|
| Package/Identity/Name | `mapshroom.mapshroom` |
| Package/Identity/Publisher | `CN=F9E069E3-AF42-4141-BF2D-CF97EAB366D4` |
| PublisherDisplayName | `mapshroom` |
| Package Family Name | `mapshroom.mapshroom_ngq221hvd1nym` |

These values are wired into [`windows/Package.appxmanifest`](../windows/Package.appxmanifest).

## Capabilities declared
- `internetClient` — LLM APIs, Hugging Face model downloads, analytics
- `microphone` — microphone audio reactivity
- `midi` — hardware MIDI controllers
- `runFullTrust` — classic Win32/Tauri desktop shell

Privacy copy must mention:
- Optional cloud AI providers (OpenAI, Anthropic, Google) using user-supplied keys
- Optional analytics (PostHog via `mapshroom.dev`)
- Local model downloads from Hugging Face
- Microphone / system-audio capture for reactivity
- MIDI device access

## Code signing (required before wide public download)

Unsigned builds will trigger SmartScreen warnings.

1. Obtain **Azure Trusted Signing** or an OV/EV Authenticode certificate.
2. Set signing for Tauri Windows builds via environment / CI secrets, for example:
   - `TAURI_SIGNING_PRIVATE_KEY` / certificate thumbprint per [Tauri Windows signer docs](https://v2.tauri.app/distribute/sign/windows/)
3. Rebuild (`npm run tauri:build`) and verify:

```powershell
Get-AuthenticodeSignature .\src-tauri\target\release\mapshroom.exe
Get-AuthenticodeSignature .\src-tauri\target\release\bundle\nsis\Mapshroom_3.0.0_x64-setup.exe
```

Status must be `Valid`.

4. Publish checksums next to the download:

```powershell
npm run release:checksums
```

This writes `release-artifacts/SHA256SUMS.txt` and copies the installers.

## Security posture (desktop)

- Cloud API keys are stored in **Windows Credential Manager** only (never `localStorage` / project JSON on desktop).
- The Rust HTTP proxy allowlists OpenAI / Anthropic / Google hosts and **injects secrets from the keyring**; client-supplied secret headers and `key=` query params are stripped.
- External links are limited to `http:` / `https:` URLs.


Store-oriented WebView2 offline installer config lives in
[`src-tauri/tauri.microsoftstore.conf.json`](../src-tauri/tauri.microsoftstore.conf.json):

```powershell
npm run tauri -- build --config src-tauri/tauri.microsoftstore.conf.json
```

## Packaging notes
- Prefer **MSIX** via Microsoft `winapp` CLI so the Store can re-sign the package.
- Install CLI: `winget install Microsoft.WinAppCLI`
- Use a local/dev certificate only for sideload testing.
- Do **not** commit Partner Center secrets or production `.pfx` files.
- Staged payload directory: `windows/msix-stage/`
- Output directory: `windows/msix-out/`

See also the ordered runbook: [`windows-publication-next.md`](./windows-publication-next.md).

## Hardware smoke matrix (Windows 11)
- [ ] Launch main window and open projector output on a second monitor
- [ ] Microphone reactivity
- [ ] WASAPI / system-audio loopback reactivity (or Stereo Mix fallback)
- [ ] MIDI hardware faders/transport
- [ ] OpenAI / Anthropic / Google shader generation with user keys
- [ ] Local AI first download + cached second run
- [ ] WebGL2 stage render; WebGPU or WASM fallback for transformers
- [ ] Project import/export, MP4 export, slicer/segmentation/depth tools
- [ ] External AI links open in system browser
- [ ] PWA install UI hidden / marked installed inside the desktop shell

## Certification
- Run the Windows App Certification Kit against the MSIX or installed package.
- Attach WACK logs to the Partner Center submission notes if requested.

## Support URLs
- App website: `https://mapshroom.dev/`
- Privacy: `https://mapshroom.dev/#/privacy`
- Support email / URL: fill before submission
