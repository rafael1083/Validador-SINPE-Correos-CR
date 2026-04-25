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
git checkout dev 2>nul || (git checkout -b dev && git push -u origin dev)

:: Verificar si hay cambios
git status --porcelain >nul
if %errorlevel% equ 0 (
    git add .
    git commit -m "Actualizacion: %date% %time%" 2>nul
    if %errorlevel% equ 0 (
        git push origin dev
        if %errorlevel% neq 0 (
            echo ✗ Error al pushear a dev
            pause & exit /b 1
        )
    )
) else (
    echo ✓ Sin cambios nuevos en dev
)

:: 3. Sincronizar MAIN (Produccion) con merge
echo [3/5] Sincronizando main desde dev (merge seguro)...
git checkout main 2>nul || git checkout -b main

:: Pull main para asegurar estado actualizado
git pull origin main 2>nul

:: Merge desde dev sin --force (preserva historial)
git merge dev -m "Release: sincronizacion dev a main (%date% %time%)"
if %errorlevel% neq 0 (
    echo ✗ Error en merge. Resolviendo...
    git merge --abort
    echo ⚠ Revisar manualmente conflictos
    pause & exit /b 1
)

:: Push a main (sin --force para seguridad)
git push origin main
if %errorlevel% neq 0 (
    echo ✗ Error al pushear main. Revisar permisos/conflictos.
    pause & exit /b 1
)

:: 4. Regresar a DEV para seguir trabajando
echo [4/5] Regresando a entorno de desarrollo...
git checkout dev

echo ====================================================
echo ✅ TODO LISTO EN GITHUB (DEV Y MAIN)
echo ✓ DEV actualizado y pusheado
echo ✓ MAIN sincronizado via merge (historial preservado)
echo.
echo Ahora ve a tu PC Windows 10 y corre 'actualizar_servidor.bat'
echo ====================================================
pause
