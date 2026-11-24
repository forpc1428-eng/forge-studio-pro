@echo off
title Build Forge Studio Pro desktop app
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-desktop.ps1"
if errorlevel 1 (pause & exit /b 1)
explorer "%~dp0desktop\dist"
pause
