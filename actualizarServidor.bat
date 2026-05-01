@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo ====================================================
echo   VALIDADOR SINPE - ACTUALIZAR SERVIDOR (WIN 10 PROD)
echo ====================================================
echo.

echo [1/4] Limpiando estado local y cambiando a 'main'...
git fetch origin main
git checkout main
git reset --hard origin/main

echo [2/4] Instalando/actualizando dependencias de produccion...
call npm install --production

echo [3/4] Deteniendo servidor actual si esta corriendo...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM nodejs.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo [4/4] Iniciando el servidor en produccion...
del "%~f0" >nul 2>&1
echo.
echo ====================================================
echo   SERVIDOR ACTUALIZADO Y LISTO
echo   Escuchando en tiempo real. No cierres esta ventana.
echo ====================================================
call npm start

if %errorLevel% NEQ 0 (
    echo.
    echo [ERROR] La aplicacion se detuvo inesperadamente (Codigo: %errorLevel%).
    pause
)
