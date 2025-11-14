@echo off
REM ------------------------------------------------------------------
REM  auto-push.bat
REM  One-click helper to commit and push the current repo to GitHub.
REM  Usage:
REM       auto-push.bat "commit message"
REM  If no commit message is provided, a timestamped default is used.
REM ------------------------------------------------------------------

setlocal EnableExtensions EnableDelayedExpansion

REM Change to the directory where the script is located (project root)
cd /d "%~dp0"

REM Verify we are inside a git repository
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo.
    echo This directory is not a Git repository. Aborting.
    goto :end
)

REM Determine current branch (fallback to main)
set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do (
    set "CURRENT_BRANCH=%%B"
)
if not defined CURRENT_BRANCH set "CURRENT_BRANCH=main"

REM Resolve commit message
set "COMMIT_MESSAGE=%*"
if "%COMMIT_MESSAGE%"=="" (
    for /f "usebackq tokens=* delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do (
        set "TIMESTAMP=%%T"
    )
    if not defined TIMESTAMP set "TIMESTAMP=%date% %time%"
    set "COMMIT_MESSAGE=chore: auto sync (!TIMESTAMP!)"
)

echo.
echo ------------------------------------------------------------
echo Auto pushing to GitHub
echo Branch         : %CURRENT_BRANCH%
echo Commit message : %COMMIT_MESSAGE%
echo ------------------------------------------------------------
echo.

REM Security check before committing
echo Running security check...
call check-secrets.bat
if errorlevel 1 (
    echo.
    echo SECURITY WARNING: Potential secrets detected!
    echo Please review and fix the issues before committing.
    set /p "CONTINUE=Do you want to continue anyway? (Y/N): "
    if /i not "!CONTINUE!"=="Y" (
        echo.
        echo Commit cancelled for security reasons.
        goto :end
    )
    echo.
    echo Continuing with commit (user confirmed)...
    echo.
)

REM Show status for context
git status
if errorlevel 1 goto gitError

REM Stage the entire working tree
git add -A
if errorlevel 1 goto gitError

REM Check if there is anything to commit
set "HAS_CHANGES="
for /f "delims=" %%S in ('git status --porcelain') do (
    set "HAS_CHANGES=1"
    goto :hasChanges
)

if not defined HAS_CHANGES (
    echo Nothing new to commit. Attempting to push existing commits...
    goto :push
)

:hasChanges
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
    echo.
    echo Commit failed. Please review the git output above.
    goto :end
)

:push
git push origin %CURRENT_BRANCH%
if errorlevel 1 goto gitError

echo.
echo Push completed successfully.
goto :end

:gitError
echo.
echo An error occurred while running a git command.
echo Please review the output above for details.

:end
echo.
pause


