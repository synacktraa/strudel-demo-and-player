@echo off
rem
rem  Strudel Workshop Notebook - one-command start (Windows)
rem
rem    start.cmd        (or just double-click this file)
rem
rem  Runs fully offline. If it complains about missing assets, run setup.cmd
rem  once on a machine with internet.

setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto no_node

if not exist "vendor\manifest.json" goto no_vendor

node server.mjs --open %*
exit /b %ERRORLEVEL%

:no_node
echo.
echo   Node.js is not installed - run setup.cmd first.
echo.
pause
exit /b 1

:no_vendor
echo.
echo   Offline assets are missing (vendor\ is empty).
echo   Run setup.cmd once, on a machine with internet.
echo.
pause
exit /b 1
