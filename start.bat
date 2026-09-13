@echo off
title Program Pembaca Rekapitulasi Kas Bengkel
echo =========================================================
echo    PROGRAM PEMBACA REKAPITULASI KAS & OMSET BENGKEL
echo    Shop & Drive ^& Bima Motor (Folder: UANG TUNAI)
echo =========================================================
echo.
echo [1/2] Membaca rekapitulasi cepat via Terminal...
node baca-rekap.js
echo.
echo [2/2] Membuka Visual Interactive Dashboard di Browser...
start "" "http://localhost:3500"
node server.js
pause
