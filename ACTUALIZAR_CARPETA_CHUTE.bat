@echo off
setlocal
set "SOURCE=%~dp0"
set "TARGET=C:\Users\caure\Desktop\Paginas\PaginaChute"

echo Actualizando carpeta local de Chute Plataforma...
echo Origen: %SOURCE%
echo Destino: %TARGET%
echo.

if not exist "%TARGET%" (
  echo No existe la carpeta destino.
  echo Crea o restaura primero: %TARGET%
  pause
  exit /b 1
)

if not exist "%TARGET%\.git" (
  echo La carpeta destino no tiene .git.
  echo No se copiara nada para evitar romper la conexion con GitHub.
  echo Usa la carpeta antigua que ya estaba conectada a GitHub.
  pause
  exit /b 1
)

echo Copiando archivos de la version nueva sin tocar .git...
robocopy "%SOURCE%" "%TARGET%" /E /XD .git /NFL /NDL /NJH /NJS /NP
if errorlevel 8 (
  echo.
  echo Ocurrio un error copiando archivos.
  pause
  exit /b 1
)

echo.
echo Carpeta actualizada correctamente.
echo Ahora puedes probar la app y luego ejecutar subir-chute-github.bat desde:
echo %TARGET%
pause
