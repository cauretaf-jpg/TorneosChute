@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  Subir Chute Plataforma a GitHub
REM  Carpeta del proyecto: C:\Users\caure\Desktop\Paginas\PaginaChute
REM  Repositorio: https://github.com/cauretaf-jpg/TorneosChute.git
REM ============================================================

set "PROJECT_DIR=C:\Users\caure\Desktop\Paginas\PaginaChute"
set "REMOTE_URL=https://github.com/cauretaf-jpg/TorneosChute.git"

echo.
echo ==========================================
echo  Chute Plataforma - Subir a GitHub
echo ==========================================
echo.

if not exist "%PROJECT_DIR%" (
  echo ERROR: No se encontro la carpeta:
  echo %PROJECT_DIR%
  echo.
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%"

REM Crear/actualizar .gitignore para evitar subir archivos innecesarios.
echo # Dependencias y build> .gitignore
echo node_modules/>> .gitignore
echo dist/>> .gitignore
echo package-lock.json>> .gitignore
echo.>> .gitignore
echo # Variables/credenciales>> .gitignore
echo .env>> .gitignore
echo .env.local>> .gitignore
echo .env.*.local>> .gitignore
echo.>> .gitignore
echo # Caches y logs>> .gitignore
echo .vite/>> .gitignore
echo .cache/>> .gitignore
echo *.log>> .gitignore
echo npm-debug.log*>> .gitignore
echo yarn-debug.log*>> .gitignore
echo yarn-error.log*>> .gitignore
echo pnpm-debug.log*>> .gitignore
echo.>> .gitignore
echo # Sistema operativo>> .gitignore
echo .DS_Store>> .gitignore
echo Thumbs.db>> .gitignore
echo.>> .gitignore
echo # Editor>> .gitignore
echo .vscode/>> .gitignore
echo .idea/>> .gitignore

if not exist ".git" (
  echo Inicializando repositorio Git...
  git init
)

REM Asegurar rama main.
git branch -M main

REM Configurar remoto.
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo Agregando remoto origin...
  git remote add origin "%REMOTE_URL%"
) else (
  echo Actualizando remoto origin...
  git remote set-url origin "%REMOTE_URL%"
)

REM Si estos archivos fueron agregados accidentalmente antes, se sacan del seguimiento.
git rm -r --cached node_modules >nul 2>&1
git rm -r --cached dist >nul 2>&1
git rm --cached package-lock.json >nul 2>&1
git rm --cached .env >nul 2>&1
git rm --cached .env.local >nul 2>&1

echo.
echo Revisando archivos...
git status --short

echo.
set /p COMMIT_MSG="Mensaje del commit (Enter para usar 'Actualizar Chute Plataforma'): "
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Actualizar Chute Plataforma"

echo.
echo Agregando archivos permitidos...
git add .

echo.
echo Creando commit...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo.
  echo No se creo un commit nuevo. Puede que no existan cambios pendientes.
)

echo.
echo Subiendo a GitHub...
git push -u origin main

echo.
echo Proceso finalizado.
pause
