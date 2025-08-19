@echo off
title SpotSpinner - MULTIBALL Automation
color 0A

echo.
echo ========================================================
echo               SpotSpinner - Starting...
echo ========================================================
echo.
echo Built by @AThinkingMind (https://x.com/AThinkingMind)
echo.

:: Change to script directory
cd /d "%~dp0"

:: Check if .env exists
if not exist ".env" (
    echo ❌ Configuration file not found!
    echo.
    echo It looks like you haven't run the setup wizard yet.
    echo Please run SETUP.bat first to configure SpotSpinner.
    echo.
    pause
    exit /b 1
)

:: Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js or run SETUP.bat for automatic installation
    echo.
    pause
    exit /b 1
)

echo ✅ Configuration found
echo ✅ Node.js available
echo.
echo Starting SpotSpinner server...
echo Web UI will be available at: http://localhost:3001
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul

:: Start browser
start http://localhost:3001

:: Start the server
echo.
echo ========================================================
echo Server is running! Keep this window open.
echo Close this window to stop SpotSpinner.
echo ========================================================
echo.

npm run dev