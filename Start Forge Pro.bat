@echo off
title Forge Studio Pro
cd /d "%~dp0"

rem Find Node.js: normally on PATH; fall back to the default install folder.
where npm >nul 2>nul
if errorlevel 1 if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js was not found on this PC.
  echo  Install the LTS version from https://nodejs.org and then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo  First run: installing Forge Studio Pro. This takes about a minute...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  Install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo.
echo  ==========================================================
echo   Forge Studio Pro is starting at  http://localhost:5199
echo   Your browser opens automatically when it is ready.
echo.
echo   KEEP THIS WINDOW OPEN while you work.
echo   To stop Forge Pro: close this window.
echo  ==========================================================
echo.
call npm run dev -- --open
echo.
echo  Forge Studio Pro has stopped.
pause
