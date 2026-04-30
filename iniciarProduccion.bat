@echo off
setlocal EnableDelayedExpansion
set "WORK_DIR=%~dp0"
chcp 65001 >nul

echo ====================================================
echo   PASO 3: INICIAR PRODUCCION (WIN 10 PRO)
echo ====================================================

:: Pedir permisos de administrador
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"cd /d %WORK_DIR% && %~f0\"' -Verb RunAs"
    exit /b
)

echo [1/2] Deteniendo servidor actual (si existe)...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo [2/2] Iniciando nuevo servidor en segundo plano...
cd /d "%WORK_DIR%"
start /min cmd /c npm start

echo ====================================================
echo ??? PRODUCCION INICIADA CORRECTAMENTE
echo El sistema esta escuchando en el puerto 3001
echo ====================================================
timeout /t 5
exit /b
