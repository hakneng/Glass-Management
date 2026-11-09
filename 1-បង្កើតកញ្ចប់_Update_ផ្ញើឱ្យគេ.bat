@echo off
chcp 65001 >nul
title ប្រព័ន្ធបង្កើតកញ្ចប់ Update ស្វ័យប្រវត្តិ
color 0b

echo ========================================================
echo   ប្រព័ន្ធបង្កើតកញ្ចប់ UPDATE ស្វ័យប្រវត្តិ (1-Click Package)
echo ========================================================
echo.
echo កំពុងវេចខ្ចប់ឯកសារកូដថ្មី...

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-package.ps1"

if exist "Update_Package.zip" (
    echo.
    echo ========================================================
    echo   [ជោគជ័យ ១០០%%] បានបង្កើតកញ្ចប់ Update រួចរាល់!
    echo ========================================================
    echo.
    echo ឈ្មោះឯកសារ ៖ "Update_Package.zip"
    echo ទីតាំង      ៖ នៅក្នុង Folder នេះផ្ទាល់
    echo.
    echo 👉 របៀបប្រើប្រាស់ ៖
    echo 1. ផ្ញើឯកសារ "Update_Package.zip" នេះទៅឱ្យគេតាម Telegram។
    echo 2. ខាងគេគ្រាន់តែពន្លា (Extract) ហើយចុចលើ "2-ចុចត្រង់នេះដើម្បី_Update.bat" ជាការស្រេច!
    echo.
) else (
    echo [កំហុស] មិនអាចបង្កើតឯកសារ zip បានឡើយ។
)

pause
