# Generates SHA256 checksums for Windows release artifacts.
# Usage: powershell -ExecutionPolicy Bypass -File ./scripts/write-release-checksums.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Release = Join-Path $Root "src-tauri\target\release"
$OutDir = Join-Path $Root "release-artifacts"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$files = @(
  (Join-Path $Release "mapshroom.exe"),
  (Join-Path $Release "bundle\nsis\Mapshroom_3.0.1_x64-setup.exe"),
  (Join-Path $Release "bundle\msi\Mapshroom_3.0.1_x64_en-US.msi")
) | Where-Object { Test-Path $_ }

if (-not $files) {
  throw "No release artifacts found. Run npm run tauri:build first."
}

$checksumPath = Join-Path $OutDir "SHA256SUMS.txt"
$lines = @()
foreach ($file in $files) {
  $hash = (Get-FileHash -Algorithm SHA256 -Path $file).Hash.ToLowerInvariant()
  $name = Split-Path $file -Leaf
  $lines += "$hash  $name"
  Copy-Item -Force $file (Join-Path $OutDir $name)
  $sig = Get-AuthenticodeSignature $file
  Write-Host ("{0}: {1} ({2})" -f $name, $sig.Status, $hash)
}

$lines -join "`n" | Set-Content -Path $checksumPath -Encoding ascii
Write-Host "Wrote $checksumPath"
Write-Host "Publish the files in $OutDir over HTTPS with the checksums next to the download link."
Write-Host "Before public release, Authenticode Status must be Valid (sign with a trusted CA / Azure Trusted Signing)."
