@echo off
title Validador SINPE x Correos - Produccion
setlocal EnableDelayedExpansion

set "WORK_DIR=%~dp0"

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [SISTEMA] Solicitando permisos de administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"cd /d %WORK_DIR% && %~f0\"' -Verb RunAs"
    exit /b
)

cd /d "%WORK_DIR%"

echo ====================================================
echo   VALIDADOR SINPE - INICIO PRODUCCION (ADMIN)
echo ====================================================
echo.

echo [1/3] Matando procesos Node previos (limpiando puerto 3001)...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM nodejs.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo [2/3] Instalando dependencias de produccion...
call npm install --production

echo [3/3] Arrancando servidor...
echo.
echo ====================================================
echo   SERVIDOR DE PRODUCCION ACTIVO
echo   No cierres esta ventana para mantenerlo en linea
echo ====================================================
echo.
call npm start

if %errorLevel% NEQ 0 (
    echo.
    echo [ERROR] La aplicacion se detuvo inesperadamente (Codigo: %errorLevel%).
    pause
)
