# Requires: Windows 11, Rust, Node, and optionally Microsoft winapp CLI.
# Builds the Tauri release binary and packages an x64 MSIX for Store upload.

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Generating desktop icons"
npm run icons:tauri

Write-Host "==> Building Tauri release"
npm run tauri:build

$ReleaseDir = Join-Path $Root "src-tauri\target\release"
$ExePath = Join-Path $ReleaseDir "mapshroom.exe"
if (-not (Test-Path $ExePath)) {
  # Fallback for crate binary name differences.
  $ExePath = Get-ChildItem -Path $ReleaseDir -Filter "*.exe" |
    Where-Object { $_.Name -notmatch "uninstall|nsis" } |
    Select-Object -First 1 -ExpandProperty FullName
}

if (-not $ExePath -or -not (Test-Path $ExePath)) {
  throw "Unable to find Tauri release executable in $ReleaseDir"
}

$StageDir = Join-Path $Root "windows\msix-stage"
if (Test-Path $StageDir) {
  Remove-Item -Recurse -Force $StageDir
}
New-Item -ItemType Directory -Force -Path $StageDir | Out-Null
Copy-Item -Force $ExePath (Join-Path $StageDir "Mapshroom.exe")

$Winapp = Get-Command winapp -ErrorAction SilentlyContinue
if (-not $Winapp) {
  Write-Warning "winapp CLI not found. Staged executable at $StageDir"
  Write-Warning "Install Microsoft winapp CLI, run 'winapp init', bind Partner Center identity, then re-run."
  Write-Host "Staged files:"
  Get-ChildItem $StageDir | ForEach-Object { Write-Host " - $($_.FullName)" }
  exit 0
}

$Manifest = Join-Path $Root "windows\Package.appxmanifest"
if (-not (Test-Path $Manifest)) {
  Write-Host "==> Initializing winapp package identity (provisional)"
  Push-Location $Root
  winapp init --name Mapshroom --publisher "CN=Mapshroom-Provisional" --output windows
  Pop-Location
}

$OutDir = Join-Path $Root "windows\msix-out"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "==> Packaging MSIX"
winapp pack $StageDir --manifest $Manifest --output $OutDir

Write-Host "MSIX packaging complete. Output: $OutDir"
Write-Host "Before Store upload, replace provisional Publisher/Identity values with Partner Center values."
