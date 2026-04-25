@echo off
chcp 65001 >nul
SET REPO_URL=https://github.com/rafael1083/Validador-SINPE-Correos-CR.git

echo ====================================================
echo   VALIDADOR SINPE - PUBLICADOR (WIN 11 DEV)
echo ====================================================

:: 0. Instalar dependencias
echo [0/7] Instalando dependencias npm...
call npm install
if errorlevel 1 (
    echo ❌ npm install falló
    pause
    exit /b 1
)

:: 1. Inicializar si es la primera vez
if not exist .git (
    echo [1/7] Inicializando repositorio local...
    git init
    git remote add origin %REPO_URL%
)

:: 2. Ejecutar tests
echo [2/7] Ejecutando tests...
call npm test
if errorlevel 1 (
    echo ⚠️  Tests fallaron
    set /p CONTINUE="¿Continuar anyway? (S/N): "
    if /i not "!CONTINUE!"=="S" (
        echo Cancelado por usuario
        pause
        exit /b 1
    )
)

:: 3. Guardar cambios en DEV
echo [3/7] Guardando cambios en rama 'dev'...
git checkout -b dev 2>nul || git checkout dev
if errorlevel 1 (
    echo ❌ Error al cambiar a rama dev
    pause
    exit /b 1
)

:: 4. Agregar y commitear
echo [4/7] Agregando cambios...
git add .
git commit -m "Feat: Actualización automatizada %date% %time%"
if errorlevel 1 (
    echo ⚠️  Sin cambios para commitear (OK)
)

:: 5. Pushear DEV
echo [5/7] Pusheando rama 'dev' a GitHub...
git push -u origin dev
if errorlevel 1 (
    echo ❌ Error al pushear dev
    pause
    exit /b 1
)

:: 6. Sincronizar MAIN (desde DEV)
echo [6/7] Sincronizando rama 'main' desde 'dev'...
git checkout -b main 2>nul || git checkout main
if errorlevel 1 (
    echo ❌ Error al cambiar a main
    pause
    exit /b 1
)
git reset --hard dev
git push -u origin main
if errorlevel 1 (
    echo ❌ Error al pushear main
    pause
    exit /b 1
)

:: 7. Regresar a DEV
echo [7/7] Regresando a rama 'dev' para desarrollo...
git checkout dev

echo ====================================================
echo ✅ TODO LISTO EN GITHUB (DEV Y MAIN)
echo.
echo Siguiente paso:
echo   → Ve a tu PC Windows 10
echo   → Ejecuta: 2.actualizar_servidor.bat
echo ====================================================
pause
