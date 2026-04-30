@echo off
cd /d "%~dp0"
chcp 65001 >nul
SET REPO_URL=https://github.com/rafael1083/Validador-SINPE-Correos-CR.git

echo ====================================================
echo   PASO 1: PUBLICAR CAMBIOS (WIN 11 DEV)
echo ====================================================

echo [1/5] Verificando dependencias...
if not exist "node_modules\" (
    echo Instalando dependencias...
    call npm install
) else (
    echo Dependencias ya instaladas. Omitiendo npm install.
)

echo [2/5] Ejecutando tests...
call npm test
if errorlevel 1 (
    echo [ADVERTENCIA] Tests fallaron. Publicando de todos modos...
)

echo [3/5] Guardando cambios en rama 'dev'...
git checkout -b dev 2>nul || git checkout dev
git add .
git commit -m "Actualizacion desde DEV %date% %time%"
git push -u origin dev

echo [4/5] Sincronizando rama 'main' (Produccion)...
git checkout -b main 2>nul || git checkout main
git reset --hard dev
git push -u origin main

echo [5/5] Regresando a 'dev'...
git checkout dev

echo ====================================================
echo ??? PUBLICACION COMPLETA EN GITHUB.
echo ====================================================
pause
