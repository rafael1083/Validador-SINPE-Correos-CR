@echo off
setlocal
SET "CHECK_INTERVAL=300"

echo ====================================================
echo   VALIDADOR SINPE - VIGILANTE DE PRODUCCION (WIN 10)
echo ====================================================
echo Este script revisara cambios en GitHub cada %CHECK_INTERVAL% segundos.
echo No cierres esta ventana para mantener la auto-actualizacion activa.
echo ----------------------------------------------------

:loop
echo [%time%] Revisando actualizaciones en GitHub...

:: 1. Consultar a GitHub sin descargar los cambios aun
git fetch origin main >nul 2>&1

:: 2. Comparar la version local con la de GitHub
for /f %%i in ('git rev-parse HEAD') do set LOCAL_VERSION=%%i
for /f %%i in ('git rev-parse origin/main') do set REMOTE_VERSION=%%i

if "%LOCAL_VERSION%"=="%REMOTE_VERSION%" (
    echo [%time%] Sin cambios. El servidor esta al dia.
) else (
    echo [%time%] ¡CAMBIOS DETECTADOS! Iniciando actualizacion...
    
    :: Llamar al script de actualizacion que ya creamos
    call actualizar_servidor.bat
    
    echo [%time%] Actualizacion completada exitosamente.
)

echo [%time%] Esperando %CHECK_INTERVAL% segundos para la proxima revision...
timeout /t %CHECK_INTERVAL% /nobreak >nul
goto loop
