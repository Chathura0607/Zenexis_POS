@echo off
title Zenexis Print Bridge - Auto Startup Installer
color 0a
echo =========================================================
echo   ZENEXIS PRINT BRIDGE - AUTO STARTUP CONFIGURATION
echo =========================================================
echo.

set TARGET_DIR=%~dp0
set VBS_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ZenexisPrintBridge.vbs

echo Creating background startup launcher...
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_PATH%"
echo WshShell.CurrentDirectory = "%TARGET_DIR%" >> "%VBS_PATH%"
echo WshShell.Run "node server.js", 0, False >> "%VBS_PATH%"

if exist "%VBS_PATH%" (
    echo.
    echo [SUCCESS] Zenexis Print Bridge added to Windows Startup!
    echo It will now run automatically in the background on every PC boot.
    echo.
) else (
    echo [ERROR] Failed to create startup file.
)

pause
