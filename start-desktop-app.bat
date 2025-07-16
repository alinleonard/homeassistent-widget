@echo off
echo ===================================================
echo    Home Assistant Desktop Widget (Electron App)
echo ===================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo 📦 Installing dependencies...

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing Electron and dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        echo.
        echo Trying to install Electron specifically...
        npm install electron@latest
        if %errorlevel% neq 0 (
            echo ❌ Failed to install Electron
            pause
            exit /b 1
        )
    )
) else (
    echo Dependencies already installed.
)

echo 🚀 Starting Home Assistant Desktop Widget...
echo.
echo 📊 Monitoring: sensor.solarnet_power_grid_export
echo 🏠 Home Assistant: http://192.168.1.136:8123
echo.
echo The widget will appear as a native Windows application.
echo You can:
echo - Drag it around the screen
echo - Right-click the system tray icon for options
echo - Minimize to system tray
echo ===================================================

REM Start the Electron app
echo Starting Electron app...
npx electron .

if %errorlevel% neq 0 (
    echo ❌ Failed to start Electron app
    echo.
    echo Trying alternative method...
    .\node_modules\.bin\electron.cmd .
    if %errorlevel% neq 0 (
        echo ❌ All methods failed. Please check the error messages above.
        pause
        exit /b 1
    )
)

echo.
echo Widget closed.
pause
