@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed on this computer.
    echo Opening application directly in web browser...
    start "" "%~dp0index.html"
    exit /b
)
echo Starting local server at http://localhost:3000 ...
start "" "http://localhost:3000"
node server.js
pause
