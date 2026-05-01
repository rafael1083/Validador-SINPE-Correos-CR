@echo off
cd /d "%~dp0"
chcp 65001 >nul

echo ====================================================
echo   PASO 2: ACTUALIZAR SERVIDOR (WIN 10 PRO)
echo ====================================================

echo [1/2] Descargando ultimos cambios de 'main'...
git fetch origin
git checkout main
git reset --hard origin/main
git clean -fd

echo [2/2] Instalando dependencias de produccion...
call npm install --omit=dev

echo ====================================================
echo ??? SERVIDOR ACTUALIZADO.
echo ====================================================
pause
