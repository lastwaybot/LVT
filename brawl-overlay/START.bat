@echo off
title Brawl Stars Overlay Server
color 0A

echo.
echo  =============================================
echo   BRAWL STARS BROADCAST OVERLAY SYSTEM
echo  =============================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js is not installed!
    echo.
    echo  Please install Node.js from: https://nodejs.org/
    echo  Download the LTS version and run the installer.
    echo  Then double-click this file again.
    echo.
    pause
    start https://nodejs.org/
    exit
)

echo  [OK] Node.js found!
echo.
echo  Starting server on http://localhost:8080 ...
echo.
echo  -----------------------------------------------
echo   Control Panel : http://localhost:8080/
echo   Overlay URL   : http://localhost:8080/overlay/overlay.html
echo  -----------------------------------------------
echo.
echo  Opening Control Panel in your browser...
echo.
echo  [Keep this window open while using the overlay]
echo  [Close this window to stop the server]
echo.

:: Wait 2 seconds then open browser
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080/control/control.html"

:: Start the server
node "%~dp0server.js"

pause
