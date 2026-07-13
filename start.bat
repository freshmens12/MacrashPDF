@echo off
setlocal
title MacrashPDF Launcher
cd /d "%~dp0"

echo.
echo  ============================================
echo   MacrashPDF - starting local servers...
echo  ============================================
echo.

REM --- 1. Make sure Node.js exists ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found. Install it from https://nodejs.org and try again.
    pause
    exit /b 1
)

REM --- 2. First run only: install dependencies ---
if not exist "server\node_modules" (
    echo First run: installing server dependencies...
    pushd server
    call npm install
    popd
)
if not exist "client\node_modules" (
    echo First run: installing client dependencies...
    pushd client
    call npm install
    popd
)

REM --- 3. Find Ghostscript (PATH first, then the known install folder) ---
where gswin64c >nul 2>nul
if errorlevel 1 (
    if exist "%LOCALAPPDATA%\Ghostscript\bin\gswin64c.exe" (
        set "GHOSTSCRIPT_PATH=%LOCALAPPDATA%\Ghostscript\bin\gswin64c.exe"
    ) else (
        echo [WARNING] Ghostscript not found - compression will fail until it is installed.
        echo           Download: https://ghostscript.com/releases/gsdnld.html
    )
)

REM --- 4. Launch server and client, each in its own window ---
start "MacrashPDF Server (close this window to stop)" /d "%~dp0server" cmd /k "npm run dev"
start "MacrashPDF Client (close this window to stop)" /d "%~dp0client" cmd /k "npm run dev"

REM --- 5. Wait until the client answers, then open the browser ---
echo Waiting for the app to come online...
set /a tries=0
:wait
set /a tries+=1
if %tries% gtr 60 (
    echo [ERROR] The app did not start within 60 seconds. Check the two MacrashPDF windows for errors.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:5173 -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 goto wait

start "" http://localhost:5173

echo.
echo  MacrashPDF is running at http://localhost:5173
echo  To stop it: close the two MacrashPDF windows, or run stop.bat
echo.
timeout /t 5 >nul
exit /b 0
