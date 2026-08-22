# Windows publication — next steps

Goal: get Mapshroom from “unsigned beta download” to a **Store-ready / signed** Windows release.

## Recommended order

### 1. Partner Center identity — DONE
- Name: `mapshroom.mapshroom`
- Publisher: `CN=F9E069E3-AF42-4141-BF2D-CF97EAB366D4`
- Publisher display name: `mapshroom`
- Store ID: `9P2DNCLDXSD5`

### 2. Package MSIX — DONE (local)
Output:

`windows/msix-out/mapshroom.mapshroom_3.0.0.0_x64.msix`

Signed with a **local test certificate** for packaging. Microsoft Store re-signs on certification — that is expected.

### 3. Upload package (you — next in Partner Center)
1. Open the **mapshroom** submission draft
2. Click **Packages**
3. Upload `windows\msix-out\mapshroom.mapshroom_3.0.0.0_x64.msix`
4. Wait for processing; fix any validation errors if shown

### 4. Finish listing sections
- Pricing: free
- Properties: privacy `https://mapshroom.dev/#/privacy`
- Age ratings: complete IARC questionnaire
- Store listings: EN (+ optional IT), screenshots
- Then Submit for certification

## Current repo status

| Item | Status |
|------|--------|
| Tauri Windows app | Working (you confirmed) |
| NSIS / MSI beta on site | Live via email gate + R2 |
| Code signing | Not set (`NotSigned` → SmartScreen) |
| `windows/Package.appxmanifest` | Provisional identity |
| Store logos | Placeholder icons present |
| `pack-msix.ps1` | Stages exe; needs `winapp` + real identity |
| winapp CLI | Not detected on this machine |

## Draft Store short description

> Free shader-based projection mapping studio with audio reactivity, MIDI, and local AI tools. Creative projects stay on your device by default.

## Draft Store support contacts (fill before submit)

- Website: https://mapshroom.dev/
- Privacy: https://mapshroom.dev/#/privacy
- Support email: _(you choose, e.g. download@mapshroom.dev or support@mapshroom.dev)_
