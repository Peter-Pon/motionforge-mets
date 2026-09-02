@echo off
setlocal
REM DYNMECH CycleView - test launcher (Windows)
REM
REM   start            build the production bundle, then run it in Electron
REM   start dev        Vite dev server + Electron with hot reload and DevTools
REM   start build      production bundle only, no launch
REM
REM Run from any directory; it changes into the project folder itself.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [CycleView] Node.js was not found on PATH. Install Node 18+ from https://nodejs.org
  exit /b 1
)

if not exist node_modules (
  echo [CycleView] node_modules missing - running npm install...
  call npm install
  if errorlevel 1 exit /b 1
)

if /i "%~1"=="dev" (
  echo [CycleView] Starting Vite dev server and Electron with hot reload...
  call npm run dev
  exit /b %errorlevel%
)

if /i "%~1"=="build" (
  echo [CycleView] Building production bundle...
  call npx vite build
  exit /b %errorlevel%
)

echo [CycleView] Building production bundle and launching Electron...
call npm run start
exit /b %errorlevel%
