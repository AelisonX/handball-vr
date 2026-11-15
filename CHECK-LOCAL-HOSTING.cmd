@echo off
setlocal
set "CHECK_LOG=%~dp0local-hosting-diagnostic.txt"
echo LOCAL HOSTING DIAGNOSTIC > "%CHECK_LOG%"
echo %date% %time% >> "%CHECK_LOG%"
echo ==== LISTENING GAME PORTS ==== >> "%CHECK_LOG%"
netstat -ano -p tcp | findstr /C:":8443 " /C:":8444 " /C:":8788 " /C:":5176 " >> "%CHECK_LOG%" 2>&1
echo ==== NODE SERVER PROCESSES ==== >> "%CHECK_LOG%"
tasklist /FI "IMAGENAME eq node.exe" >> "%CHECK_LOG%" 2>&1
echo ==== WINDOWS NETWORK PROFILES ==== >> "%CHECK_LOG%"
powershell.exe -NoProfile -Command "Get-NetConnectionProfile | Select-Object InterfaceAlias,NetworkCategory,IPv4Connectivity | Format-Table -AutoSize" >> "%CHECK_LOG%" 2>&1
echo ==== BEAN THERE PORT 8443 FIREWALL RULE ==== >> "%CHECK_LOG%"
netsh advfirewall firewall show rule name="BeanThereVR-LAN-8443" >> "%CHECK_LOG%" 2>&1
echo ==== HANDBALL PORT 8444 FIREWALL RULE ==== >> "%CHECK_LOG%"
netsh advfirewall firewall show rule name="HandballVR-LAN-8444" >> "%CHECK_LOG%" 2>&1
echo ==== NETWORK ADAPTER ADDRESSES ==== >> "%CHECK_LOG%"
powershell.exe -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*'} | Select-Object InterfaceAlias,IPAddress | Format-Table -AutoSize" >> "%CHECK_LOG%" 2>&1
set "WORK_LOG=%USERPROFILE%\Documents\Codex\2026-11-15\we-re-starting-a-new-game\work\local-hosting-diagnostic.txt"
if exist "%USERPROFILE%\Documents\Codex\2026-11-15\we-re-starting-a-new-game\work\" copy /Y "%CHECK_LOG%" "%WORK_LOG%" >nul
type "%CHECK_LOG%"
echo.
echo This was read-only. No firewall, network, game or service settings changed.
echo Saved beside this file as local-hosting-diagnostic.txt.
echo Tell ChatGPT when this check has finished.
pause
