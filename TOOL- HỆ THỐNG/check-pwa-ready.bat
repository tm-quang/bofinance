@echo off
REM ------------------------------------------------------------------
REM  check-pwa-ready.bat
REM  Script to check if PWA is ready for PWA Builder
REM  Usage:
REM       check-pwa-ready.bat [url]
REM  Example:
REM       check-pwa-ready.bat https://bofin.vercel.app
REM ------------------------------------------------------------------

setlocal EnableExtensions EnableDelayedExpansion

REM Change to the directory where the script is located (project root)
cd /d "%~dp0\.."

set "URL=%1"
if "%URL%"=="" (
    echo.
    echo Usage: check-pwa-ready.bat [url]
    echo Example: check-pwa-ready.bat https://bofin.vercel.app
    echo.
    pause
    exit /b 1
)

echo.
echo ------------------------------------------------------------
echo Checking PWA Readiness for: %URL%
echo ------------------------------------------------------------
echo.

set "ERRORS=0"

REM Check if URL is HTTPS
echo [1/6] Checking HTTPS...
echo %URL% | findstr /i "^https://" >nul
if errorlevel 1 (
    echo   ERROR: URL must use HTTPS!
    set /a ERRORS+=1
) else (
    echo   OK: URL uses HTTPS
)

REM Check manifest
echo [2/6] Checking manifest.webmanifest...
curl -s "%URL%/manifest.webmanifest" >nul 2>&1
if errorlevel 1 (
    echo   WARNING: Cannot access manifest.webmanifest
    echo   Make sure website is deployed and manifest is accessible
    set /a ERRORS+=1
) else (
    echo   OK: manifest.webmanifest is accessible
)

REM Check service worker
echo [3/6] Checking service worker...
curl -s "%URL%/sw.js" >nul 2>&1
if errorlevel 1 (
    echo   WARNING: Cannot access sw.js
    echo   Service worker might be registered with different name
) else (
    echo   OK: sw.js is accessible
)

REM Check icons
echo [4/6] Checking icons...
curl -s "%URL%/icon-192x192.png" >nul 2>&1
if errorlevel 1 (
    echo   WARNING: icon-192x192.png not accessible
    set /a ERRORS+=1
) else (
    echo   OK: icon-192x192.png is accessible
)

curl -s "%URL%/icon-512x512.png" >nul 2>&1
if errorlevel 1 (
    echo   WARNING: icon-512x512.png not accessible
    set /a ERRORS+=1
) else (
    echo   OK: icon-512x512.png is accessible
)

REM Check if website is accessible
echo [5/6] Checking website accessibility...
curl -s -o nul -w "%%{http_code}" "%URL%" | findstr "200" >nul
if errorlevel 1 (
    echo   ERROR: Website is not accessible!
    set /a ERRORS+=1
) else (
    echo   OK: Website is accessible
)

REM Final check
echo [6/6] Summary...
echo.
echo ------------------------------------------------------------
if %ERRORS%==0 (
    echo PWA is ready for PWA Builder! ✓
    echo.
    echo Next steps:
    echo 1. Go to https://www.pwabuilder.com/
    echo 2. Enter your URL: %URL%
    echo 3. Click "Start" to analyze
    echo 4. Follow the guide to generate Android package
    echo.
) else (
    echo WARNING: Found %ERRORS% issue(s)!
    echo.
    echo Please fix the issues above before using PWA Builder.
    echo.
)

echo.
echo You can also manually check:
echo - Manifest: %URL%/manifest.webmanifest
echo - Icon 192: %URL%/icon-192x192.png
echo - Icon 512: %URL%/icon-512x512.png
echo.

pause

