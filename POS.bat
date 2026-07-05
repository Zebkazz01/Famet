@echo off
REM Lanzador POS - autocompila si hay cambios, backend en ventana visible separada
cd /d "%~dp0"

if not exist "backend\.env" (
  echo Primera ejecucion: corriendo setup...
  call npm run setup
  if errorlevel 1 (
    echo Setup fallo. Revisa errores arriba.
    pause
    exit /b 1
  )
)

REM Detectar HTTPS
set USE_HTTPS=
if exist "frontend\cert.pem" if exist "frontend\key.pem" set USE_HTTPS=1

if defined USE_HTTPS (
  set URL=https://localhost:3001
) else (
  set URL=http://localhost:3001
)

REM Detectar Chrome / Edge
set BROWSER_PATH=
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set BROWSER_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set BROWSER_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set BROWSER_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe
if not defined BROWSER_PATH if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set BROWSER_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not defined BROWSER_PATH if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set BROWSER_PATH=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe

REM Lanzar loader. /K mantiene la ventana del .bat hasta que PowerShell termine; al terminar, cerramos.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0POS-loader.ps1" -Url "%URL%" -BrowserPath "%BROWSER_PATH%"

REM No pause - cerrar inmediatamente; el backend corre en su propia ventana visible
exit /b 0
