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

set "COMMIT_MESSAGE=%*"
if "%COMMIT_MESSAGE%"=="" set "COMMIT_MESSAGE=chore: update project snapshot"

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

REM Check if there is anything to commit
set "HAS_CHANGES="
for /f "delims=" %%S in ('git status --porcelain') do (
    set "HAS_CHANGES=1"
    goto hasChanges
)

if not defined HAS_CHANGES (
    echo Nothing to commit. Working tree is clean.
    goto end
)

:hasChanges

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

