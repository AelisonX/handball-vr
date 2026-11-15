@echo off
setlocal
set "HANDBALL_PROJECT=%~dp0"
if not exist "%HANDBALL_PROJECT%scripts\start-quest.mjs" set "HANDBALL_PROJECT=%USERPROFILE%\Documents\Codex\2026-11-15\we-re-starting-a-new-game\handball-vr\"
if not exist "%HANDBALL_PROJECT%scripts\start-quest.mjs" (
  echo Could not find the Handball project.
  echo Open the original project folder and run START-QUEST.cmd there.
  pause
  exit /b 1
)
cd /d "%HANDBALL_PROJECT%"
where node >nul 2>nul
if errorlevel 1 (
  if exist "C:\Program Files\nodejs\node.exe" (
    "C:\Program Files\nodejs\node.exe" "%HANDBALL_PROJECT%scripts\start-quest.mjs"
  ) else (
    echo Node.js could not be found. The server has not started.
  )
) else (
  node "%HANDBALL_PROJECT%scripts\start-quest.mjs"
)
pause
