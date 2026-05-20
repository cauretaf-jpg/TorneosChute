@echo off
cd /d "%~dp0"
echo Revisando estado de Git...
git status

echo.
echo Agregando cambios...
git add .

echo.
set /p msg="Mensaje del commit: "
if "%msg%"=="" set msg=Actualizar Chute Plataforma

git commit -m "%msg%"
git branch -M main
git push

echo.
echo Proceso terminado.
pause
