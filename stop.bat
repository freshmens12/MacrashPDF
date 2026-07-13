@echo off
title MacrashPDF - Stop
echo Stopping MacrashPDF (ports 5000 and 5173)...

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5000 " ^| findstr "LISTENING"') do taskkill /f /pid %%p >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /f /pid %%p >nul 2>nul

echo Done. You can close any leftover MacrashPDF windows.
timeout /t 3 >nul
