@echo off
setlocal enabledelayedexpansion
title SpotSpinner - Easy Setup Wizard
color 0A

echo.
echo ========================================================
echo               SpotSpinner Setup Wizard
echo ========================================================
echo.
echo Welcome! This wizard will automatically set up SpotSpinner
echo for you. The process includes:
echo.
echo [1] Checking and installing Node.js (if needed)
echo [2] Installing project dependencies
echo [3] Building the user interface
echo [4] Collecting your private key securely
echo [5] Starting the application
echo.
echo This process is completely LOCAL - nothing is sent online!
echo All your data stays on your computer.
echo.
pause

:: Change to script directory
cd /d "%~dp0"

echo.
echo ========================================================
echo STEP 1: Checking Node.js Installation
echo ========================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js is already installed!
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo    Version: !NODE_VERSION!
    echo.
) else (
    echo ❌ Node.js is not installed.
    echo.
    echo Node.js is required to run SpotSpinner. Would you like to
    echo download and install it now? This will open your browser
    echo to the official Node.js website.
    echo.
    choice /c YN /m "Install Node.js now? (Y/N)"
    
    if !errorlevel! equ 1 (
        echo.
        echo Opening Node.js download page...
        start https://nodejs.org/en/download/
        echo.
        echo IMPORTANT: Please download and install Node.js LTS version
        echo After installation, close this window and run SETUP.bat again
        echo.
        pause
        exit /b 1
    ) else (
        echo.
        echo ❌ Setup cannot continue without Node.js
        echo Please install Node.js manually and run this setup again
        echo.
        pause
        exit /b 1
    )
)

:: Check npm
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm is available!
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo    Version: !NPM_VERSION!
    echo.
) else (
    echo ❌ npm is not available (should come with Node.js)
    echo Please reinstall Node.js and try again
    pause
    exit /b 1
)

echo.
echo ========================================================
echo STEP 2: Installing Project Dependencies
echo ========================================================
echo.

echo Installing main project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install main dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo.
echo ✅ Main dependencies installed successfully!
echo.
echo Installing UI dependencies...
cd ui
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install UI dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo.
echo ✅ UI dependencies installed successfully!
echo.

echo.
echo ========================================================
echo STEP 3: Building User Interface
echo ========================================================
echo.

echo Building the React UI (this may take a few minutes)...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build UI
    echo Please check the error messages above
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ User interface built successfully!
echo.

echo.
echo ========================================================
echo STEP 4: Security & Configuration Setup
echo ========================================================
echo.

echo Starting secure configuration wizard...
node setup-wizard.js

if %errorlevel% neq 0 (
    echo ❌ Configuration setup failed
    echo Please try running the setup again
    pause
    exit /b 1
)

echo.
echo ========================================================
echo STEP 5: Final Setup Complete!
echo ========================================================
echo.

echo ✅ SpotSpinner has been set up successfully!
echo.
echo Your installation is now ready. You can:
echo.
echo • Run "npm run dev" to start the server
echo • Or double-click "START.bat" for easy startup
echo • Open http://localhost:3001 in your browser
echo.
echo IMPORTANT SECURITY NOTES:
echo • Your private key is stored locally in .env file
echo • NEVER share your .env file or private key
echo • This application runs entirely on your computer
echo • No data is sent to external servers
echo.
echo Thank you for using SpotSpinner!
echo Built by @AThinkingMind (https://x.com/AThinkingMind)
echo.

choice /c YN /m "Would you like to start SpotSpinner now? (Y/N)"
if !errorlevel! equ 1 (
    echo.
    echo Starting SpotSpinner...
    echo Opening browser to http://localhost:3001
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:3001
    npm run dev
) else (
    echo.
    echo Setup complete! Run START.bat when you're ready to begin.
)

pause