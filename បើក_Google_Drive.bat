@echo off
chcp 65001 >nul
title បើក Google Drive ដើម្បី Upload ឯកសារ

:: 1. Open Google Drive in browser
start "" "https://drive.google.com"

:: 2. Highlight the Excel file in Windows Explorer
explorer /select,"%~dp0គំរូ_Google_Sheet_ថ្នាក់១២A.xlsx"

exit
