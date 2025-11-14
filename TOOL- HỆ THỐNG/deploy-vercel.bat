@echo off
REM ------------------------------------------------------------------
REM  deploy-vercel.bat
REM  One-click helper to build and deploy the BOfin app to Vercel.
REM  Usage:
REM       deploy-vercel.bat [production|preview]
REM  Default: production
REM ------------------------------------------------------------------

setlocal EnableExtensions EnableDelayedExpansion

REM Change to the directory where the script is located (project root)
cd /d "%~dp0"

REM Determine deployment type
set "DEPLOY_TYPE=%1"
if "%DEPLOY_TYPE%"=="" set "DEPLOY_TYPE=production"
if /i not "%DEPLOY_TYPE%"=="production" if /i not "%DEPLOY_TYPE%"=="preview" (
    set "DEPLOY_TYPE=production"
)

echo.
echo ------------------------------------------------------------
echo Deploying BOfin App to Vercel
echo Deployment Type: %DEPLOY_TYPE%
echo ------------------------------------------------------------
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    goto :end
)

REM Check if npm is installed
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH.
    goto :end
)

REM Check if Vercel CLI is installed
where vercel >nul 2>&1
if errorlevel 1 (
    echo.
    echo Vercel CLI is not installed. Installing globally...
    echo.
    call npm install -g vercel
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install Vercel CLI.
        echo Please install manually: npm install -g vercel
        goto :end
    )
    echo.
    echo Vercel CLI installed successfully.
    echo.
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo.
    echo You are not logged in to Vercel.
    echo Please log in first...
    echo.
    call vercel login
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to log in to Vercel.
        goto :end
    )
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules\" (
    echo.
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies.
        goto :end
    )
    echo.
)

REM Build the project
echo.
echo Building project...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: Build failed. Please check the errors above.
    goto :end
)

echo.
echo Build completed successfully.
echo.

REM Deploy to Vercel
echo.
echo Deploying to Vercel...
echo.

if /i "%DEPLOY_TYPE%"=="production" (
    call vercel --prod
) else (
    call vercel
)

if errorlevel 1 (
    echo.
    echo ERROR: Deployment failed. Please check the errors above.
    goto :end
)

echo.
echo ------------------------------------------------------------
echo Deployment completed successfully!
echo ------------------------------------------------------------
echo.
echo NOTE: Make sure you have set the following environment variables in Vercel:
echo   - VITE_SUPABASE_URL
echo   - VITE_SUPABASE_ANON_KEY
echo.
echo You can set them in Vercel Dashboard or using:
echo   vercel env add VITE_SUPABASE_URL
echo   vercel env add VITE_SUPABASE_ANON_KEY
echo.

:end
echo.
pause

