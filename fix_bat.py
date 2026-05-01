content = """@echo off
chcp 65001 >nul
SET REPO_URL=https://github.com/rafael1083/Validador-SINPE-Correos-CR.git

echo ====================================================
echo   VALIDADOR SINPE - PUBLICADOR (WIN 11 DEV)
echo ====================================================

rem 1. Ejecutar tests
echo [1/5] Ejecutando tests...
call npm test
if errorlevel 1 (
    echo [ADVERTENCIA] Tests fallaron
    set /p CONTINUE="Continuar de todos modos? (S/N): "
    if /i not "!CONTINUE!"=="S" (
        echo Cancelado por el usuario.
        pause
        exit /b 1
    )
)

rem 2. Guardar cambios en DEV
echo [2/5] Guardando version en rama 'dev'...
git checkout -b dev 2>nul || git checkout dev
git add .
git commit -m "Auto-deploy: %date% %time%"

rem 3. Pushear DEV
echo [3/5] Pusheando rama 'dev' a GitHub...
git push -u origin dev

rem 4. Sincronizar MAIN (desde DEV) conservando historial
echo [4/5] Mergeando versiones hacia la rama 'main'...
git checkout -b main 2>nul || git checkout main
git merge dev -m "Merge dev into main"
git push -u origin main

rem 5. Regresar a DEV
echo [5/5] Regresando a entorno de desarrollo...
git checkout dev

echo.
echo ====================================================
echo [EXITO] TODO LISTO EN GITHUB (DEV Y MAIN)
echo Ahora ve a tu PC Windows 10 y corre 'actualizar_servidor.bat'
echo ====================================================
pause
"""

with open('publicarDesarrollo.bat', 'w', encoding='utf-8', newline='\\r\\n') as f:
    f.write(content)
