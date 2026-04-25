@echo off
SET REPO_URL=https://github.com/rafael1083/Validador-SINPE-Correos-CR.git

echo ====================================================
echo   VALIDADOR SINPE - PUBLICADOR (WIN 11 DEV)
echo ====================================================

:: 1. Inicializar si es la primera vez
if not exist .git (
    echo [1/5] Inicializando repositorio local...
    git init
    git remote add origin %REPO_URL%
)

:: 2. Sincronizar DEV
echo [2/5] Guardando cambios en rama 'dev'...
git checkout -b dev 2>nul || git checkout dev
git add .
git commit -m "Actualizacion: %date% %time%"
git push -u origin dev --force

:: 3. Sincronizar MAIN (Produccion)
echo [3/5] Preparando rama 'main' para Produccion...
git checkout -b main 2>nul || git checkout main
git reset --hard dev
git push -u origin main --force

:: 4. Regresar a DEV para seguir trabajando
echo [4/5] Regresando a entorno de desarrollo...
git checkout dev

echo ====================================================
echo ✅ TODO LISTO EN GITHUB (DEV Y MAIN)
echo Ahora ve a tu PC Windows 10 y corre 'actualizar_servidor.bat'
echo ====================================================
pause
