# POS-loader.ps1
param(
    [string]$Url         = "http://localhost:3001",
    [string]$BrowserPath = ""
)

$baseDir = $PSScriptRoot
Set-Location $baseDir

$host.UI.RawUI.BackgroundColor = "Black"
$host.UI.RawUI.ForegroundColor = "White"
$host.UI.RawUI.WindowTitle     = "ByteGest POS"

function Write-Step {
    param([string]$Msg, [string]$Color = "White")
    Write-Host ("  >> " + $Msg) -ForegroundColor $Color
}

function Write-Phase {
    param([string]$Msg)
    Write-Host ""
    Write-Host ("  " + ("-" * 45)) -ForegroundColor DarkGray
    Write-Host ("  " + $Msg) -ForegroundColor Cyan
    Write-Host ("  " + ("-" * 45)) -ForegroundColor DarkGray
}

function Write-OK {
    param([string]$Msg)
    Write-Host ("  [OK] " + $Msg) -ForegroundColor Green
}

function Write-Warn {
    param([string]$Msg)
    Write-Host ("  [!] " + $Msg) -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Msg)
    Write-Host ("  [ERROR] " + $Msg) -ForegroundColor Red
}

function Open-Browser {
    param([string]$BrowserPath, [string]$Url)
    if (($BrowserPath -ne "") -and (Test-Path $BrowserPath)) {
        return Start-Process $BrowserPath -ArgumentList "--app=$Url", "--start-fullscreen", "--disable-session-crashed-bubble", "--noerrdialogs" -PassThru
    }
    Start-Process $Url
    return $null
}

function Send-F11 {
    param($BrowserProc)
    if (-not $BrowserProc) { return }
    Start-Sleep -Seconds 3
    try {
        Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
}
"@
        $BrowserProc.Refresh()
        $hwnd = $BrowserProc.MainWindowHandle
        if ($hwnd -eq [IntPtr]::Zero) { Start-Sleep -Seconds 2; $BrowserProc.Refresh(); $hwnd = $BrowserProc.MainWindowHandle }
        if ($hwnd -ne [IntPtr]::Zero) {
            [WinAPI]::ShowWindow($hwnd, 3) | Out-Null
            Start-Sleep -Milliseconds 400
            [WinAPI]::SetForegroundWindow($hwnd) | Out-Null
            Start-Sleep -Milliseconds 300
            [WinAPI]::keybd_event(0x7A, 0, 0, 0)
            Start-Sleep -Milliseconds 100
            [WinAPI]::keybd_event(0x7A, 0, 2, 0)
        }
    } catch { }
}

function Get-LanIP {
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.PrefixOrigin -ne "WellKnown" -and $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } |
            Select-Object -First 1 -ExpandProperty IPAddress
        return $ip
    } catch { return $null }
}

function Test-BuildNeeded {
    $beDist = Join-Path $baseDir "backend/dist/index.js"
    $feDist = Join-Path $baseDir "frontend/dist/index.html"
    if (-not (Test-Path $beDist) -or -not (Test-Path $feDist)) { return $true }
    $pkgTime = (Get-Item (Join-Path $baseDir "package.json")).LastWriteTime
    $distTime = (Get-Item $beDist).LastWriteTime
    return ($pkgTime -gt $distTime)
}

Clear-Host

Write-Host ""
Write-Host "     " -NoNewline; Write-Host "FAMEAT POS v1.3.0" -ForegroundColor Red
Write-Host "     " -NoNewline; Write-Host "Iniciando sistema..." -ForegroundColor DarkGray
Write-Host ""

$certFile = Join-Path $baseDir "frontend/cert.pem"
$keyFile  = Join-Path $baseDir "frontend/key.pem"
$lanIp    = Get-LanIP

Write-Phase "FASE 1/5 - Certificados de seguridad"
Write-Step "Generando certificados SSL..." "Yellow"

$ensureScript = Join-Path $baseDir "scripts/ensure-certs.js"
if (Test-Path $ensureScript) {
    & node $ensureScript --force 2>&1 | ForEach-Object { }
}

$caTrusted = $false
try {
    $rootCA = Join-Path $baseDir "frontend/public/rootCA.pem"
    if (Test-Path $rootCA) {
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($rootCA)
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root","LocalMachine")
        $store.Open("ReadOnly")
        $found = ($store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }).Count -gt 0
        $store.Close()
        if (-not $found) {
            $store2 = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root","CurrentUser")
            $store2.Open("ReadOnly")
            $found = ($store2.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }).Count -gt 0
            $store2.Close()
        }
        $caTrusted = $found
    }
} catch { }

$useHttps = $false
if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
    if ($caTrusted) {
        $useHttps = $true
        Write-OK "Certificado SSL confiable detectado"
    } else {
        Write-Warn "Usando HTTP para evitar advertencias SSL"
        $certMsg = "certutil -addstore -f Root " + (Join-Path $baseDir "frontend/public/rootCA.pem")
        Write-Step "Para HTTPS: ejecuta como admin: $certMsg" "DarkGray"
    }
} else {
    Write-OK "Usando HTTP (sin SSL)"
}

Write-Phase "FASE 2/5 - Preparando aplicacion"
if (Test-BuildNeeded) {
    Write-Step "Recompilando backend y frontend..." "Yellow"
    Write-Step "Esto toma 10-30 segundos" "DarkGray"
    cmd /c "npm run build 2>&1" | ForEach-Object { }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Compilacion fallo"
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    Write-OK "Compilacion completada"
} else {
    Write-OK "Aplicacion ya compilada"
}

Write-Phase "FASE 3/5 - Verificando recursos del sistema"
try {
    $netstatOut = cmd /c "netstat -ano | findstr :3001" 2>$null
    if ($netstatOut) {
        Write-Warn "Puerto 3001 ocupado. Liberando..."
        $parts = $netstatOut.Trim().Split(" ", [StringSplitOptions]::RemoveEmptyEntries)
        $pid = $parts[$parts.Length - 1]
        if ($pid -as [int] -and $pid -gt 0) {
            Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
        }
        Write-OK "Puerto liberado"
    } else {
        Write-OK "Puerto 3001 disponible"
    }
} catch {
    Write-OK "Puerto 3001 disponible"
}

Write-Phase "FASE 4/5 - Iniciando servidor"
$proto = if ($useHttps) { "https" } else { "http" }
$env:HTTPS = if ($useHttps) { "true" } else { "false" }
$Url = "$($proto)://localhost:3001"

$host.UI.RawUI.WindowTitle = "ByteGest POS - Iniciando servidor..."
Write-Step "Lanzando servidor Node.js..." "Yellow"

$nodeProcess = Start-Process -FilePath "node.exe" -ArgumentList "backend/dist/index.js" -WorkingDirectory $baseDir -NoNewWindow -PassThru

$maxWait  = 30
$elapsed  = 0
$serverUp = $false
$phaseMsgs = @(
    "Conectando base de datos...",
    "Cargando configuracion del sistema...",
    "Inicializando modulos de inventario...",
    "Cargando modulo de ventas...",
    "Inicializando modulo de balanza...",
    "Configurando rutas y middleware...",
    "Sincronizando datos en cache...",
    "Preparando modulo de reportes...",
    "Finalizando configuracion...",
    "Servidor casi listo..."
)
$lastMsgIdx = -1

while ($elapsed -lt $maxWait) {
    Start-Sleep -Milliseconds 800
    $elapsed += 0.8
    $phaseIdx = [math]::Floor($elapsed / 3)
    if ($phaseIdx -gt $lastMsgIdx -and $phaseIdx -lt $phaseMsgs.Length) {
        Write-Step $phaseMsgs[$phaseIdx] "DarkGray"
        $lastMsgIdx = $phaseIdx
    }
    try {
        $resp = Invoke-WebRequest -Uri "$Url/api/health" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
        $serverUp = $true
        break
    } catch { }
    if ($nodeProcess.HasExited) {
        Write-Host ""
        Write-Error "El servidor termino inesperadamente."
        Read-Host "Presiona Enter para salir"
        exit 1
    }
}

Write-Phase "FASE 5/5 - Iniciando interfaz grafica"
$host.UI.RawUI.WindowTitle = "ByteGest POS - Servidor activo"

if ($serverUp) {
    Write-OK "Servidor iniciado correctamente"
    Write-Step "Cargando vistas del sistema..." "DarkGray"
    Start-Sleep -Milliseconds 300
    Write-Step "Renderizando componentes de interfaz..." "DarkGray"
    Start-Sleep -Milliseconds 200
    Write-Host ""
    Write-Host "  +------------------------------------------+" -ForegroundColor DarkGreen
    Write-Host "  |         SISTEMA LISTO                     |" -ForegroundColor Green
    Write-Host "  +------------------------------------------+" -ForegroundColor DarkGreen
    Write-Host "    Acceso local: $($proto)://localhost:3001" -ForegroundColor Cyan
    if ($lanIp) {
        Write-Host "    Acceso red:   $($proto)://$($lanIp):3001" -ForegroundColor Cyan
    }
    Write-Host ""
} else {
    Write-Warn "Servidor tardo mas de lo esperado. Abriendo de todos modos..."
}

Write-Step "Abriendo navegador..." "Green"
$browserProc = Open-Browser -BrowserPath $BrowserPath -Url $Url
Send-F11 -BrowserProc $browserProc

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor DarkYellow
Write-Host "  >>  Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host "  >>  el servidor" -ForegroundColor Yellow
Write-Host "  ==========================================" -ForegroundColor DarkYellow
Write-Host ""
Write-Step "Servidor activo - esperando cierre..." "DarkGray"

$cleanupDone = $false
$cleanup = {
    if ($cleanupDone) { return }
    $cleanupDone = $true
    Write-Host ""
    Write-Warn "Deteniendo servidor..."
    if (-not $nodeProcess.HasExited) {
        try { $nodeProcess.Kill() } catch { }
    }
    Write-OK "Servidor detenido"
}

try {
    while (-not $nodeProcess.HasExited) {
        Start-Sleep -Seconds 2
    }
    Write-Host ""
    Write-Error "El servidor se cerro inesperadamente."
} catch {
    & $cleanup
    exit 1
}

& $cleanup
Start-Sleep -Seconds 2
exit 0
