@echo off
echo ====================================================
echo   VALIDADOR SINPE - PRODUCCION (WINDOWS 10)
echo ====================================================

:: 1. Asegurar que estamos en la carpeta correcta
cd /d "%~dp0"

:: 2. Limpiar cambios locales accidentales en produccion para evitar conflictos
echo [1/4] Limpiando entorno de produccion...
git reset --hard

:: 3. Cambiar a rama main y descargar
echo [2/4] Descargando actualizaciones de GitHub (MAIN)...
git checkout main 2>nul || git checkout -b main origin/main
git pull origin main

:: 4. Instalar solo dependencias de produccion
echo [3/4] Verificando dependencias de Node.js...
call npm install --production

:: 5. Reiniciar el proceso
echo [4/4] Reiniciando el Validador SINPE...
call iniciarBackground.bat

echo ====================================================
echo ✅ PRODUCCION ACTUALIZADA Y EN LINEA
echo ====================================================
pause
