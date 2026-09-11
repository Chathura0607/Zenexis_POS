@echo off
title Zenexis Free Print Bridge (Local Service)
color 0b
echo =========================================================
echo       ZENEXIS POS - FREE SILENT PRINT BRIDGE v1.0
echo =========================================================
echo.
echo Starting Zenexis Local Print Service on port 18211...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
node server.js
pause
