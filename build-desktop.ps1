# Builds Forge Studio Pro as a Windows program:
#   desktop\dist\Forge-Studio-Pro-Setup-<version>.exe     (installer: Start menu + desktop shortcut)
#   desktop\dist\Forge-Studio-Pro-Portable-<version>.exe  (runs without installing)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host 'Building the editor...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Editor build failed.' }

Write-Host 'Copying it into the desktop app...' -ForegroundColor Cyan
if (Test-Path desktop\app) { Remove-Item -Recurse -Force desktop\app }
Copy-Item -Recurse dist desktop\app

Set-Location desktop
if (-not (Test-Path node_modules)) {
    Write-Host 'First run: downloading Electron (about 100 MB, one time only)...' -ForegroundColor Cyan
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed. Check your internet connection.' }
}

if (Test-Path dist) { Get-ChildItem dist -Filter *.exe | Remove-Item -Force -ErrorAction SilentlyContinue }  # keep only the newest version
Write-Host 'Packaging Windows installer and portable .exe...' -ForegroundColor Cyan
npm run dist
if ($LASTEXITCODE -ne 0) { throw 'Packaging failed.' }

Write-Host ''
Write-Host 'Done! Your files are in forge-pro\desktop\dist:' -ForegroundColor Green
Get-ChildItem dist\*.exe | ForEach-Object { Write-Host ("  {0}  ({1:N0} MB)" -f $_.Name, ($_.Length / 1MB)) }
