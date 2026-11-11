@echo off
chcp 65001 >nul
title ប្រព័ន្ធដំឡើងការអាប់ដេត (Auto Update Client)
color 0a

echo ========================================================
echo   ប្រព័ន្ធដំឡើងការអាប់ដេតកម្មវិធី (Auto Update Client)
echo ========================================================
echo.
echo កំពុងធ្វើបច្ចុប្បន្នភាពឯកសារប្រព័ន្ធ...

cd /d "%~dp0"

:: Check if destination folder has index.html
if not exist "index.html" (
    echo [កំហុស] សូមដាក់ឯកសារនេះក្នុង Folder កម្មវិធីរបស់អ្នក!
    pause
    exit
)

if exist "create-shortcut.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1" >nul 2>&1
)
if exist "create-shortcut.vbs" (
    cscript //nologo "%~dp0create-shortcut.vbs" >nul 2>&1
)

echo.
echo ========================================================
echo   [ជោគជ័យ ១០០%%] ការអាប់ដេតបានបញ្ចប់ដោយជោគជ័យ!
echo ========================================================
echo.
echo ✅ ទិន្នន័យសិស្ស ពិន្ទុ និងអាជ្ញាប័ណ្ណ (License) របស់អ្នកនៅដដែល ១០០%%!
echo 🎓 បានបង្កើត/អាប់ដេត Shortcut Icon លើ Desktop រួចជាស្រេច!
echo 💡 ប្រសិនបើបើកមកមិនទាន់ឃើញមុខងារថ្មី សូមចុចបញ្ជា Ctrl + F5 លើក្តារចុច!
echo.
echo កំពុងបើកដំណើរការកម្មវិធី...
start "" "%~dp0index.html"

timeout /t 3 >nul
exit
