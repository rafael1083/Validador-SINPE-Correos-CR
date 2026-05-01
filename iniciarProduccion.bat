@echo off
<<<<<<< HEAD
title Validador SINPE x Correos - Produccion
setlocal EnableDelayedExpansion

:: Guardar la ruta actual
set "WORK_DIR=%~dp0"

:: Verificar privilegios de administrador
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [SISTEMA] Solicitando permisos de administrador...
=======
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
>>>>>>> dev
    powershell -Command "Start-Process cmd -ArgumentList '/c \"cd /d %WORK_DIR% && %~f0\"' -Verb RunAs"
    exit /b
)

<<<<<<< HEAD
:: --- A PARTIR DE AQUI EJECUTA COMO ADMINISTRADOR ---
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
echo   - Escuchando correos en tiempo real
echo   - No cierres esta ventana para mantenerlo en linea
echo ====================================================
echo.
call npm start

if %errorLevel% NEQ 0 (
    echo.
    echo [ERROR] La aplicacion se detuvo inesperadamente (Codigo: %errorLevel%).
    pause
)
=======
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
>>>>>>> dev
