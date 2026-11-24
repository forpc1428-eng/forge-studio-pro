@echo off
title Forge Studio Pro
cd /d "%~dp0"
where npm >/dev/null 2>/dev/null || (echo Please install Node.js 18+ from https://nodejs.org first. & pause & exit /b 1)
if not exist node_modules (
  echo Installing Forge Studio Pro - first run only...
  call npm install --no-audit --no-fund
)
echo Starting Forge Studio Pro at http://localhost:5199
start "" http://localhost:5199
call npm run dev
