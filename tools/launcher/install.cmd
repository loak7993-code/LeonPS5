@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (
  echo Node.js was not found. Install it from https://nodejs.org and run this file again.
  exit /b 1
)
where python >nul 2>nul || (
  echo Python was not found. Install Python 3 from https://python.org and run this file again.
  exit /b 1
)

echo LeonPS5 launcher setup
pushd web
call npm install --no-audit --no-fund || (popd & exit /b 1)
call npm run build || (popd & exit /b 1)
popd

if not exist "%USERPROFILE%\Games\LeonPS5" mkdir "%USERPROFILE%\Games\LeonPS5"
echo Games directory: %USERPROFILE%\Games\LeonPS5

python server.py --open
pause