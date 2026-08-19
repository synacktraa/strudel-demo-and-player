@echo off
rem
rem  Strudel Workshop Notebook - one-command setup (Windows)
rem
rem    setup.cmd        (or just double-click this file)
rem
rem  Needs internet. Downloads Strudel and every sample it uses into .\vendor,
rem  so the notebook works with the network disconnected afterwards.

setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto no_node

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 goto old_node

node scripts\setup.mjs %*
set EXITCODE=%ERRORLEVEL%
echo.
pause
exit /b %EXITCODE%

:no_node
echo.
echo   Node.js 18+ is required and was not found.
echo.
where winget >nul 2>&1
if errorlevel 1 goto manual_node
echo   This will run:
echo       winget install OpenJS.NodeJS.LTS
echo.
set /p REPLY="  Install Node.js now? [y/N] "
if /i not "%REPLY%"=="y" goto manual_node
winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
echo.
echo   Node.js installed. Close this window, open a NEW terminal,
echo   and run setup.cmd again so the PATH change takes effect.
echo.
pause
exit /b 1

:manual_node
echo.
echo   Install Node.js 18 or newer from https://nodejs.org
echo   then run setup.cmd again.
echo.
pause
exit /b 1

:old_node
echo.
echo   Node.js 18 or newer is required.
node --version
echo   Upgrade from https://nodejs.org then run setup.cmd again.
echo.
pause
exit /b 1
