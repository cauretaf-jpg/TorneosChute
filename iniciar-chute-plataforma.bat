@echo off
setlocal
cd /d "%~dp0"

echo Iniciando Chute Plataforma 1.9.0...
where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo No se encontro npm. Instala Node.js LTS y vuelve a ejecutar este archivo.
  echo Descarga oficial: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo Configurando npm publico...
call npm config set registry https://registry.npmjs.org/ >nul
call npm config delete proxy >nul 2>nul
call npm config delete https-proxy >nul 2>nul

if not exist ".chute-deps-ok" (
  echo Preparando instalacion limpia...
  if exist package-lock.json del /f /q package-lock.json
  if exist node_modules (
    echo Eliminando dependencias anteriores...
    cmd /c rmdir /s /q node_modules
  )
)

if not exist node_modules (
  echo Instalando dependencias desde npm publico...
  call npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
  if errorlevel 1 (
    echo.
    echo No se pudieron instalar las dependencias.
    echo Revisa tu conexion a internet o ejecuta manualmente:
    echo npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
    echo.
    pause
    exit /b 1
  )
  echo ok> ".chute-deps-ok"
)

echo Abriendo servidor local...
call npm run dev
pause
