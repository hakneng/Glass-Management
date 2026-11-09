@echo off
chcp 65001 >nul
title Create Update Package
color 0b

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-package.ps1"

if exist "Update_Package.zip" (
    echo [SUCCESS] Update_Package.zip created successfully!
) else (
    echo [ERROR] Failed to create Update_Package.zip
)

pause
