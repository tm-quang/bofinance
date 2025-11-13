@echo off
REM ------------------------------------------------------------------
REM  push-to-git.bat
REM  Simple helper script to commit and push the current repo state.
REM  Usage:
REM     push-to-git.bat "commit message"
REM  If no commit message is provided, a default one will be used.
REM ------------------------------------------------------------------

setlocal EnableDelayedExpansion

REM Change to the directory where the script lives (project root)
cd /d "%~dp0"

if "%~1"=="" (
    set "COMMIT_MESSAGE=chore: update project snapshot"
) else (
    set "COMMIT_MESSAGE=%~1"
    shift
    :collectArgs
    if "%~1"=="" goto messageReady
    set "COMMIT_MESSAGE=!COMMIT_MESSAGE! %~1"
    shift
    goto collectArgs
)

:messageReady
echo.
echo ------------------------------------------------------------
echo Preparing to push changes to GitHub
echo Commit message: "!COMMIT_MESSAGE!"
echo ------------------------------------------------------------
echo.

REM Show current status before committing
git status
if errorlevel 1 goto gitError

REM Stage changes
git add -A

REM Commit staged changes
git commit -m "!COMMIT_MESSAGE!"
if errorlevel 1 (
    echo.
    echo Nothing committed. Either there were no changes or an error occurred.
    goto end
)

REM Push to origin main
git push origin main
if errorlevel 1 goto gitError

echo.
echo Push completed successfully.
goto end

:gitError
echo.
echo An error occurred while running a git command.
echo Please review the output above for details.

:end
echo.
pause

