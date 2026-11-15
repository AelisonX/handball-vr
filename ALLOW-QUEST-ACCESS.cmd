@echo off
cd /d "%~dp0"
echo This adds a separate Handball firewall rule for local Wi-Fi devices only.
echo It permits Node on this PC's detected LAN address, TCP port 8444.
echo Run this file by right-clicking it and choosing Run as administrator.
set "HANDBALL_PROJECT=%~dp0"
if not exist "%HANDBALL_PROJECT%scripts\allow-quest-firewall.ps1" set "HANDBALL_PROJECT=%USERPROFILE%\Documents\Codex\2026-11-15\we-re-starting-a-new-game\handball-vr\"
powershell.exe -NoProfile -File "%HANDBALL_PROJECT%scripts\allow-quest-firewall.ps1"
if errorlevel 1 echo The rule was not added. Check the message above.
pause
