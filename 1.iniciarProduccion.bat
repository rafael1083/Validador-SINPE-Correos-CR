@echo off
setlocal EnableDelayedExpansion
set "WORK_DIR=%~dp0"

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"cd /d %WORK_DIR% && %~f0\"' -Verb RunAs"
    exit /b
)

taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM nodejs.exe >nul 2>&1
timeout /t 2 /nobreak >nul

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

cd /d "%WORK_DIR%"
start /min cmd /c npm start
exit /b
