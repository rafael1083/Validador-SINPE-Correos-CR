@echo off
title Validador SINPE x Correos - Dev
setlocal EnableDelayedExpansion

:: Guardar la ruta actual
set "WORK_DIR=%~dp0"

:: Verificar privilegios de administrador
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [SISTEMA] Solicitando permisos de administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"cd /d %WORK_DIR% && %~f0\"' -Verb RunAs"
    exit /b
)

:: --- A PARTIR DE AQUÍ EJECUTA COMO ADMINISTRADOR ---
cd /d "%WORK_DIR%"

echo ====================================================
echo   VALIDADOR SINPE - MODO DESARROLLO (ADMIN)
echo ====================================================
echo.

echo [1/4] Matando TODOS los procesos Node...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM nodejs.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Limpiando puerto 3001...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo [3/4] Verificando entorno...
where npm >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] No se encontro 'npm'. Asegurate de que Node.js este instalado.
    pause
    exit /b
)

echo [4/4] Iniciando servidor + IMAP IDLE...
echo.
echo ====================================================
echo   ESCUCHANDO EN TIEMPO REAL
echo   - Etelgive: BCR (rafael051962@gmail.com)
echo   - Multichunches: Banco Nacional (sinpes.multichunches@gmail.com)
echo ====================================================
echo.
echo Busca estos logs:
echo   [IMAP][Etelgive] Conectado exitosamente
echo   [IMAP][Multichunches] Conectado exitosamente
echo.
call npm start

if %errorLevel% NEQ 0 (
    echo.
    echo [ERROR] La aplicacion se detuvo inesperadamente (Codigo: %errorLevel%).
    pause
)
