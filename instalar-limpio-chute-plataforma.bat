@echo off
setlocal
cd /d "%~dp0"

echo Reinstalando Chute Plataforma v6 desde cero...
where npm >nul 2>nul
if errorlevel 1 (
  echo No se encontro npm. Instala Node.js LTS desde https://nodejs.org/
  pause
  exit /b 1
)

call npm config set registry https://registry.npmjs.org/ >nul
call npm config delete proxy >nul 2>nul
call npm config delete https-proxy >nul 2>nul

if exist ".chute-deps-ok" del /f /q ".chute-deps-ok"
if exist package-lock.json del /f /q package-lock.json
if exist node_modules (
  echo Eliminando node_modules...
  cmd /c rmdir /s /q node_modules
)

echo Instalando dependencias desde npm publico...
call npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
if errorlevel 1 (
  echo.
  echo Fallo la instalacion. Cierra VS Code/terminales abiertas y vuelve a intentar.
  pause
  exit /b 1
)

echo ok> ".chute-deps-ok"
echo Instalacion completada. Iniciando app...
call npm run dev
pause
