@echo off
cd /d "%~dp0"
start "Handball room server - close to stop" cmd /k "npm run server"
start "Handball PC server - close to stop" cmd /k "npm run dev -- --port 5176 --strictPort"
echo Open http://127.0.0.1:5176 in your browser.
echo Close the two server windows to stop hosting.
pause
