@echo off
REM ------------------------------------------------------------------
REM  dev-tools.bat
REM  All-in-one development tools for BOfin App
REM  Features:
REM    - Start/Stop development server
REM    - Build project
REM    - Push to GitHub with detailed logs
REM    - Deploy to Vercel with logs
REM    - Check PWA readiness
REM ------------------------------------------------------------------

setlocal EnableExtensions EnableDelayedExpansion

REM Change to project root directory
cd /d "%~dp0\.."

REM Create logs directory if not exists
if not exist "logs" mkdir logs

REM Set log file with timestamp
for /f "usebackq tokens=* delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'"`) do (
    set "TIMESTAMP=%%T"
)
set "LOG_FILE=logs\dev-tools_%TIMESTAMP%.log"

REM Function to log messages
:log
echo [%date% %time%] %~1 >> "%LOG_FILE%"
echo [%date% %time%] %~1
goto :eof

REM Function to show menu
:showMenu
cls
echo.
echo ============================================================
echo           BOfin App - Development Tools
echo ============================================================
echo.
echo   1. Start Development Server
echo   2. Stop Development Server
echo   3. Build Project
echo   4. Push Code to GitHub
echo   5. Deploy to Vercel
echo   6. Check PWA Readiness
echo   7. View Logs
echo   8. Exit
echo.
echo ============================================================
echo Log file: %LOG_FILE%
echo ============================================================
echo.
set /p "CHOICE=Select an option (1-8): "
goto :eof

REM Main menu loop
:main
call :showMenu

if "%CHOICE%"=="1" goto :startServer
if "%CHOICE%"=="2" goto :stopServer
if "%CHOICE%"=="3" goto :buildProject
if "%CHOICE%"=="4" goto :pushGitHub
if "%CHOICE%"=="5" goto :deployVercel
if "%CHOICE%"=="6" goto :checkPWA
if "%CHOICE%"=="7" goto :viewLogs
if "%CHOICE%"=="8" goto :exit
goto :invalidChoice

REM ============================================================
REM 1. Start Development Server
REM ============================================================
:startServer
call :log "=== Starting Development Server ==="

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    call :log "ERROR: Node.js is not installed or not in PATH"
    echo.
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    goto :main
)

REM Check if server is already running
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I /N "node.exe">nul
if not errorlevel 1 (
    call :log "WARNING: Node.js process already running"
    echo.
    echo WARNING: Development server might already be running!
    set /p "CONTINUE=Do you want to start anyway? (Y/N): "
    if /i not "!CONTINUE!"=="Y" goto :main
)

REM Check if node_modules exists
if not exist "node_modules\" (
    call :log "Installing dependencies..."
    echo.
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        call :log "ERROR: Failed to install dependencies"
        echo.
        echo ERROR: Failed to install dependencies!
        pause
        goto :main
    )
    call :log "Dependencies installed successfully"
)

REM Start server in new window
call :log "Starting Vite development server..."
echo.
echo Starting development server in a new window...
echo Server will be available at: http://localhost:3000
echo.
start "BOfin Dev Server" cmd /k "npm run dev"
call :log "Development server started successfully"

timeout /t 2 >nul
goto :main

REM ============================================================
REM 2. Stop Development Server
REM ============================================================
:stopServer
call :log "=== Stopping Development Server ==="

tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I /N "node.exe">nul
if not errorlevel 1 (
    echo.
    echo Stopping all Node.js processes...
    taskkill /F /IM node.exe >nul 2>&1
    if errorlevel 1 (
        call :log "ERROR: Failed to stop Node.js processes"
        echo ERROR: Failed to stop server!
    ) else (
        call :log "Development server stopped successfully"
        echo Development server stopped successfully!
    )
) else (
    call :log "INFO: No Node.js processes found"
    echo.
    echo No development server is currently running.
)

echo.
pause
goto :main

REM ============================================================
REM 3. Build Project
REM ============================================================
:buildProject
call :log "=== Building Project ==="

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    call :log "ERROR: Node.js is not installed"
    echo.
    echo ERROR: Node.js is not installed!
    pause
    goto :main
)

REM Check if node_modules exists
if not exist "node_modules\" (
    call :log "Installing dependencies..."
    echo.
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        call :log "ERROR: Failed to install dependencies"
        echo ERROR: Failed to install dependencies!
        pause
        goto :main
    )
)

REM Build project
call :log "Starting build process..."
echo.
echo Building project...
echo.

call npm run build
set "BUILD_EXIT_CODE=%ERRORLEVEL%"

if %BUILD_EXIT_CODE%==0 (
    call :log "Build completed successfully"
    echo.
    echo ============================================================
    echo Build completed successfully! ✓
    echo Output directory: dist\
    echo ============================================================
) else (
    call :log "ERROR: Build failed with exit code %BUILD_EXIT_CODE%"
    echo.
    echo ============================================================
    echo Build failed! ✗
    echo Check the errors above for details.
    echo ============================================================
)

echo.
pause
goto :main

REM ============================================================
REM 4. Push Code to GitHub
REM ============================================================
:pushGitHub
call :log "=== Pushing Code to GitHub ==="

REM Check if Git is installed
where git >nul 2>&1
if errorlevel 1 (
    call :log "ERROR: Git is not installed"
    echo.
    echo ERROR: Git is not installed!
    pause
    goto :main
)

REM Check if this is a Git repository
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    call :log "ERROR: Not a Git repository"
    echo.
    echo ERROR: This directory is not a Git repository!
    pause
    goto :main
)

REM Get current branch
set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do (
    set "CURRENT_BRANCH=%%B"
)
if not defined CURRENT_BRANCH set "CURRENT_BRANCH=main"

call :log "Current branch: %CURRENT_BRANCH%"

REM Security check
echo.
echo Running security check...
call tool\check-secrets.bat >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "WARNING: Security check found potential issues"
    echo.
    echo WARNING: Security check found potential issues!
    set /p "CONTINUE=Do you want to continue anyway? (Y/N): "
    if /i not "!CONTINUE!"=="Y" (
        call :log "Push cancelled by user"
        goto :main
    )
)

REM Get commit message
echo.
set /p "COMMIT_MSG=Enter commit message (or press Enter for auto): "
if "!COMMIT_MSG!"=="" (
    for /f "usebackq tokens=* delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do (
        set "TIMESTAMP=%%T"
    )
    set "COMMIT_MSG=chore: auto sync (!TIMESTAMP!)"
)

call :log "Commit message: !COMMIT_MSG!"

REM Show status
echo.
echo Checking Git status...
call :log "Git status:"
git status >> "%LOG_FILE%" 2>&1
git status

REM Stage all changes
echo.
echo Staging all changes...
call :log "Staging changes..."
git add -A >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "ERROR: Failed to stage changes"
    echo ERROR: Failed to stage changes!
    pause
    goto :main
)

REM Check if there are changes to commit
git diff --cached --quiet
if errorlevel 1 (
    REM Commit changes
    echo.
    echo Committing changes...
    call :log "Committing changes..."
    git commit -m "!COMMIT_MSG!" >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
        call :log "ERROR: Failed to commit"
        echo ERROR: Failed to commit!
        pause
        goto :main
    )
    call :log "Changes committed successfully"
    echo Changes committed successfully!
) else (
    call :log "INFO: No changes to commit"
    echo No changes to commit.
)

REM Push to GitHub
echo.
echo Pushing to GitHub...
call :log "Pushing to origin %CURRENT_BRANCH%..."
git push origin %CURRENT_BRANCH% >> "%LOG_FILE%" 2>&1
set "PUSH_EXIT_CODE=%ERRORLEVEL%"

if %PUSH_EXIT_CODE%==0 (
    call :log "Push completed successfully"
    echo.
    echo ============================================================
    echo Push completed successfully! ✓
    echo Branch: %CURRENT_BRANCH%
    echo ============================================================
) else (
    call :log "ERROR: Push failed with exit code %PUSH_EXIT_CODE%"
    echo.
    echo ============================================================
    echo Push failed! ✗
    echo Check the log file for details: %LOG_FILE%
    echo ============================================================
)

echo.
pause
goto :main

REM ============================================================
REM 5. Deploy to Vercel
REM ============================================================
:deployVercel
call :log "=== Deploying to Vercel ==="

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    call :log "ERROR: Node.js is not installed"
    echo.
    echo ERROR: Node.js is not installed!
    pause
    goto :main
)

REM Check if Vercel CLI is installed
where vercel >nul 2>&1
if errorlevel 1 (
    call :log "Vercel CLI not found, installing..."
    echo.
    echo Vercel CLI is not installed. Installing globally...
    call npm install -g vercel >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
        call :log "ERROR: Failed to install Vercel CLI"
        echo ERROR: Failed to install Vercel CLI!
        pause
        goto :main
    )
    call :log "Vercel CLI installed successfully"
)

REM Check if logged in
vercel whoami >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "Not logged in to Vercel, logging in..."
    echo.
    echo You are not logged in to Vercel.
    echo Please log in...
    call vercel login
    if errorlevel 1 (
        call :log "ERROR: Failed to log in to Vercel"
        echo ERROR: Failed to log in!
        pause
        goto :main
    )
)

REM Ask for deployment type
echo.
set /p "DEPLOY_TYPE=Deploy type (production/preview) [production]: "
if "!DEPLOY_TYPE!"=="" set "DEPLOY_TYPE=production"
if /i not "!DEPLOY_TYPE!"=="production" if /i not "!DEPLOY_TYPE!"=="preview" (
    set "DEPLOY_TYPE=production"
)

call :log "Deployment type: !DEPLOY_TYPE!"

REM Build first
echo.
echo Building project first...
call :log "Building project..."
call npm run build >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "ERROR: Build failed"
    echo.
    echo ERROR: Build failed! Cannot deploy.
    pause
    goto :main
)
call :log "Build completed successfully"

REM Deploy
echo.
echo Deploying to Vercel...
call :log "Deploying to Vercel (!DEPLOY_TYPE!)..."

if /i "!DEPLOY_TYPE!"=="production" (
    vercel --prod >> "%LOG_FILE%" 2>&1
) else (
    vercel >> "%LOG_FILE%" 2>&1
)
set "DEPLOY_EXIT_CODE=%ERRORLEVEL%"

if %DEPLOY_EXIT_CODE%==0 (
    call :log "Deployment completed successfully"
    echo.
    echo ============================================================
    echo Deployment completed successfully! ✓
    echo Type: !DEPLOY_TYPE!
    echo ============================================================
) else (
    call :log "ERROR: Deployment failed with exit code %DEPLOY_EXIT_CODE%"
    echo.
    echo ============================================================
    echo Deployment failed! ✗
    echo Check the log file for details: %LOG_FILE%
    echo ============================================================
)

echo.
pause
goto :main

REM ============================================================
REM 6. Check PWA Readiness
REM ============================================================
:checkPWA
call :log "=== Checking PWA Readiness ==="

echo.
set /p "PWA_URL=Enter your website URL (e.g., https://bofin.vercel.app): "
if "!PWA_URL!"=="" (
    echo ERROR: URL is required!
    pause
    goto :main
)

call :log "Checking PWA for: !PWA_URL!"

echo.
echo Checking PWA readiness...
echo.

set "ERRORS=0"

REM Check HTTPS
echo [1/6] Checking HTTPS...
echo !PWA_URL! | findstr /i "^https://" >nul
if errorlevel 1 (
    call :log "ERROR: URL must use HTTPS"
    echo   ERROR: URL must use HTTPS!
    set /a ERRORS+=1
) else (
    call :log "OK: URL uses HTTPS"
    echo   OK: URL uses HTTPS
)

REM Check manifest
echo [2/6] Checking manifest.webmanifest...
curl -s "!PWA_URL!/manifest.webmanifest" >nul 2>&1
if errorlevel 1 (
    call :log "WARNING: Cannot access manifest.webmanifest"
    echo   WARNING: Cannot access manifest.webmanifest
    set /a ERRORS+=1
) else (
    call :log "OK: manifest.webmanifest is accessible"
    echo   OK: manifest.webmanifest is accessible
)

REM Check service worker
echo [3/6] Checking service worker...
curl -s "!PWA_URL!/sw.js" >nul 2>&1
if errorlevel 1 (
    call :log "WARNING: Cannot access sw.js"
    echo   WARNING: Cannot access sw.js (might be registered with different name)
) else (
    call :log "OK: sw.js is accessible"
    echo   OK: sw.js is accessible
)

REM Check icons
echo [4/6] Checking icons...
curl -s "!PWA_URL!/icon-192x192.png" >nul 2>&1
if errorlevel 1 (
    call :log "WARNING: icon-192x192.png not accessible"
    echo   WARNING: icon-192x192.png not accessible
    set /a ERRORS+=1
) else (
    call :log "OK: icon-192x192.png is accessible"
    echo   OK: icon-192x192.png is accessible
)

curl -s "!PWA_URL!/icon-512x512.png" >nul 2>&1
if errorlevel 1 (
    call :log "WARNING: icon-512x512.png not accessible"
    echo   WARNING: icon-512x512.png not accessible
    set /a ERRORS+=1
) else (
    call :log "OK: icon-512x512.png is accessible"
    echo   OK: icon-512x512.png is accessible
)

REM Check website accessibility
echo [5/6] Checking website accessibility...
curl -s -o nul -w "%%{http_code}" "!PWA_URL!" | findstr "200" >nul
if errorlevel 1 (
    call :log "ERROR: Website is not accessible"
    echo   ERROR: Website is not accessible!
    set /a ERRORS+=1
) else (
    call :log "OK: Website is accessible"
    echo   OK: Website is accessible
)

REM Summary
echo [6/6] Summary...
echo.

if %ERRORS%==0 (
    call :log "PWA is ready for PWA Builder"
    echo ============================================================
    echo PWA is ready for PWA Builder! ✓
    echo ============================================================
    echo.
    echo Next steps:
    echo 1. Go to https://www.pwabuilder.com/
    echo 2. Enter your URL: !PWA_URL!
    echo 3. Click "Start" to analyze
    echo 4. Generate Android package
    echo.
) else (
    call :log "WARNING: Found %ERRORS% issue(s)"
    echo ============================================================
    echo WARNING: Found %ERRORS% issue(s)! ✗
    echo ============================================================
    echo.
    echo Please fix the issues above before using PWA Builder.
    echo.
)

echo.
pause
goto :main

REM ============================================================
REM 7. View Logs
REM ============================================================
:viewLogs
cls
echo.
echo ============================================================
echo                    View Logs
echo ============================================================
echo.
echo Current log file: %LOG_FILE%
echo.
echo Last 50 lines:
echo ============================================================
powershell -Command "Get-Content '%LOG_FILE%' -Tail 50"
echo ============================================================
echo.
echo Full log file location: %CD%\%LOG_FILE%
echo.
pause
goto :main

REM ============================================================
REM Invalid Choice
REM ============================================================
:invalidChoice
echo.
echo Invalid choice! Please select 1-8.
timeout /t 2 >nul
goto :main

REM ============================================================
REM Exit
REM ============================================================
:exit
call :log "=== Exiting Development Tools ==="
echo.
echo Thank you for using BOfin Development Tools!
echo Log file saved: %LOG_FILE%
echo.
timeout /t 2 >nul
exit /b 0

