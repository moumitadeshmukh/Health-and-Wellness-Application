@echo off
title WellnessApp
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Please install the LTS version from https://nodejs.org and then run this file again.
  echo.
  start https://nodejs.org/en/download
  pause
  exit /b 1
)
echo.
echo  Closing any older copy of WellnessApp that is still running on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo  Starting the latest version...
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"
node server.js
echo.
echo  WellnessApp has stopped.
pause
