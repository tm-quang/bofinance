@echo off
REM ------------------------------------------------------------------
REM  setup-vercel-env.bat
REM  Helper script to set up environment variables in Vercel.
REM  This script reads from env.example and helps you add them to Vercel.
REM  Usage:
REM       setup-vercel-env.bat
REM ------------------------------------------------------------------

setlocal EnableExtensions EnableDelayedExpansion

REM Change to the directory where the script is located (project root)
cd /d "%~dp0"

echo.
echo ------------------------------------------------------------
echo Setting up Vercel Environment Variables
echo ------------------------------------------------------------
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>&1
if errorlevel 1 (
    echo ERROR: Vercel CLI is not installed.
    echo Please install it first: npm install -g vercel
    goto :end
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

REM Check if env.example exists
if not exist "env.example" (
    echo ERROR: env.example file not found.
    goto :end
)

echo.
echo Reading environment variables from env.example...
echo.

REM Read env.example and extract variables
set "VARS_FOUND=0"
for /f "usebackq tokens=1,* delims==" %%A in ("env.example") do (
    set "VAR_NAME=%%A"
    set "VAR_VALUE=%%B"
    
    REM Skip empty lines and comments
    if not "!VAR_NAME!"=="" (
        echo !VAR_NAME! | findstr /r "^[A-Za-z_][A-Za-z0-9_]*$" >nul
        if not errorlevel 1 (
            set /a VARS_FOUND+=1
            echo.
            echo Found variable: !VAR_NAME!
            echo Current value: !VAR_VALUE!
            echo.
            set /p "ADD_VAR=Do you want to add this to Vercel? (Y/N): "
            if /i "!ADD_VAR!"=="Y" (
                echo.
                echo Adding !VAR_NAME! to Vercel...
                echo !VAR_VALUE! | vercel env add !VAR_NAME! production
                if errorlevel 1 (
                    echo WARNING: Failed to add !VAR_NAME! to production.
                ) else (
                    echo !VAR_VALUE! | vercel env add !VAR_NAME! preview
                    echo !VAR_VALUE! | vercel env add !VAR_NAME! development
                    echo Successfully added !VAR_NAME!
                )
            )
        )
    )
)

if %VARS_FOUND%==0 (
    echo.
    echo No environment variables found in env.example
    echo.
) else (
    echo.
    echo ------------------------------------------------------------
    echo Environment variables setup completed!
    echo ------------------------------------------------------------
    echo.
    echo You can verify your environment variables using:
    echo   vercel env ls
    echo.
)

:end
echo.
pause

