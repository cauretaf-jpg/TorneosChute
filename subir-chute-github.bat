@echo off
setlocal
cd /d "%~dp0"

echo Preparando subida de Chute Plataforma...
echo.

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo Esta carpeta no esta conectada a Git.
  echo Usa este ZIP copiandolo sobre la carpeta que ya tiene Git:
  echo C:\Users\caure\Desktop\Paginas\PaginaChute
  echo.
  pause
  exit /b 1
)

echo Revisando estado de Git...
git status

echo.
echo Agregando cambios...
git add .

echo.
set /p msg="Mensaje del commit: "
if "%msg%"=="" set msg=Agregar Club Chute y palmares historico v1.12.0

git commit -m "%msg%"
if errorlevel 1 (
  echo.
  echo No se creo commit nuevo. Puede que no existan cambios pendientes.
)

echo.
echo Actualizando con GitHub antes de subir...
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo Git encontro conflictos al actualizar. No se subio nada.
  echo Copia el mensaje de error y revisamos el conflicto.
  echo No uses git push --force.
  pause
  exit /b 1
)

echo.
echo Subiendo a GitHub...
git push origin main
if errorlevel 1 (
  echo.
  echo No se pudo subir a GitHub. Copia el error y lo revisamos.
  pause
  exit /b 1
)

echo.
echo Subida terminada correctamente.
pause
