@echo off
SET REPO_URL=https://github.com/rafael1083/Validador-SINPE-Correos-CR.git

echo ====================================================
echo   VALIDADOR SINPE - PUBLICADOR (WIN 11 DEV)
echo ====================================================

:: 1. Inicializar si es la primera vez
if not exist .git (
    echo [1/7] Inicializando repositorio local...
    git init
    git remote add origin %REPO_URL%
)

:: 2. Ejecutar tests
echo [2/7] Ejecutando tests...
call npm test
if %errorlevel% neq 0 (
    echo ⚠ Tests fallaron. Continuar? (S/N)
    set /p CONTINUE=
    if /i not "%CONTINUE%"=="S" (
        echo ✗ Publicacion cancelada
        pause & exit /b 1
    )
)

:: 3. Sincronizar DEV
echo [3/7] Guardando cambios en rama 'dev'...
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

:: 4. Sincronizar MAIN (Produccion) con merge
echo [4/7] Sincronizando main desde dev (merge seguro)...
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

:: 5. Regresar a DEV para seguir trabajando
echo [5/7] Regresando a entorno de desarrollo...
git checkout dev

:: 6. Reinstalar dependencias (npm install)
echo [6/7] Actualizando dependencias...
call npm install

:: 7. Confirmar finalizacion
echo [7/7] Verificando estado final...

echo ====================================================
echo ✅ PUBLICACION COMPLETADA
echo ====================================================
echo ✓ [1] Repo inicializado
echo ✓ [2] Tests ejecutados
echo ✓ [3] Cambios guardados en dev
echo ✓ [4] Main sincronizado con dev
echo ✓ [5] Regresado a dev
echo ✓ [6] Dependencias actualizadas
echo ✓ [7] Todo listo
echo.
echo GitHub main tiene los cambios listos para produccion
echo.
echo Próximo paso:
echo   Ve a tu PC Windows 10 y corre 'actualizar_servidor.bat'
echo ====================================================
pause
