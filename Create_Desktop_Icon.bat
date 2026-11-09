@echo off
chcp 65001 >nul
title បង្កើត Shortcut Icon លើ Desktop
color 0b

echo ========================================================
echo   ប្រព័ន្ធបង្កើត Shortcut Icon លើ Desktop ដោយស្វ័យប្រវត្តិ
echo ========================================================
echo.
echo កំពុងបង្កើត Icon កម្មវិធីលើ Desktop...

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"
if errorlevel 1 (
    cscript //nologo "%~dp0create-shortcut.vbs"
)

echo.
echo ========================================================
echo   [ជោគជ័យ ១០០%%] បានបង្កើត Icon លើ Desktop រួចរាល់!
echo ========================================================
echo.
echo លោកគ្រូអាចមើលលើ Desktop នឹងឃើញ Icon "កម្មវិធីគ្រប់គ្រងពិន្ទុសិស្ស ថ្នាក់ទី១២A"
echo គ្រាន់តែចុចពីរដង (Double Click) លើ Icon នោះដើម្បីបើកកម្មវិធីភ្លាមៗ។
echo.
echo ចុចប៊ូតុងណាមួយដើម្បីចាកចេញ...
pause >nul
