@echo off
REM ------------------------------------------------------------------
REM  check-secrets.bat
REM  Script to check for potential secrets and sensitive information
REM  before committing to Git.
REM  Usage:
REM       check-secrets.bat
REM ------------------------------------------------------------------

setlocal EnableExtensions EnableDelayedExpansion

REM Change to the directory where the script is located (project root)
cd /d "%~dp0"

echo.
echo ------------------------------------------------------------
echo Checking for potential secrets and sensitive information
echo ------------------------------------------------------------
echo.

set "FOUND_SECRETS=0"
set "ERRORS=0"

REM Check for .env files that might be committed
echo [1/5] Checking for .env files...
for %%F in (.env .env.local .env.production .env.development) do (
    if exist "%%F" (
        echo   WARNING: Found %%F - Make sure it's in .gitignore!
        set /a FOUND_SECRETS+=1
    )
)

REM Check for hardcoded Supabase keys
echo [2/5] Checking for hardcoded Supabase keys...
findstr /S /I /C:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" *.ts *.tsx *.js *.jsx *.json 2>nul | findstr /V "env.example check-secrets" >nul
if not errorlevel 1 (
    echo   WARNING: Found potential hardcoded JWT token!
    set /a FOUND_SECRETS+=1
)

REM Check for absolute Windows paths with usernames
echo [3/5] Checking for absolute paths with usernames...
findstr /S /I /C:"C:\\Users\\" *.json *.ts *.tsx *.js *.jsx *.bat 2>nul | findstr /V "check-secrets" >nul
if not errorlevel 1 (
    echo   WARNING: Found absolute Windows paths with usernames!
    set /a FOUND_SECRETS+=1
)

REM Check for keystore files
echo [4/5] Checking for keystore files...
if exist "*.keystore" (
    echo   WARNING: Found .keystore file - Make sure it's in .gitignore!
    set /a FOUND_SECRETS+=1
)

REM Check for common secret patterns
echo [5/5] Checking for common secret patterns...
findstr /S /I /R /C:"password\s*=\s*[^=]" *.ts *.tsx *.js *.jsx 2>nul | findstr /V "changePassword\|signInWithPassword\|formData.password\|currentPassword\|newPassword\|confirmPassword\|showPassword\|setPassword\|type.*password" >nul
if not errorlevel 1 (
    echo   WARNING: Found potential hardcoded passwords!
    set /a FOUND_SECRETS+=1
)

echo.
echo ------------------------------------------------------------
if %FOUND_SECRETS%==0 (
    echo Security check passed! No secrets found.
    echo.
    exit /b 0
) else (
    echo WARNING: Found %FOUND_SECRETS% potential security issue(s)!
    echo.
    echo Please review the warnings above before committing.
    echo.
    exit /b 1
)

:end
pause

