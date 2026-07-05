# POS - Instalador one-shot (Windows)
# Uso: powershell -ExecutionPolicy Bypass -File setup.ps1
#
# Pre-requisitos manuales:
#   1. Node.js 20+      -> https://nodejs.org/
#   2. PostgreSQL 14+   -> https://www.postgresql.org/download/windows/
#   3. (opcional) Git   -> https://git-scm.com/
#
# Este script: valida prereqs, crea .env, instala deps, migra+seed DB, builds.

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Fail($msg)       { Write-Host "    XX  $msg" -ForegroundColor Red; exit 1 }

# ---- Helper: detectar winget ----
function Has-Winget {
    try { winget --version | Out-Null; return $true } catch { return $false }
}

# ---- Validar Node ----
Write-Step "Verificando Node.js"
$nodeOk = $false
try {
    $nodeVer = (node -v) -replace 'v',''
    $major = [int]($nodeVer.Split('.')[0])
    if ($major -ge 20) { Write-Ok "Node.js v$nodeVer"; $nodeOk = $true }
    else { Write-Warn "Node.js $nodeVer detectado. Requiere 20+." }
} catch {
    Write-Warn "Node.js no instalado."
}
if (-not $nodeOk) {
    Write-Host ""
    Write-Host "  Opciones para instalar Node.js 20+:" -ForegroundColor Yellow
    if (Has-Winget) {
        Write-Host "    A) Instalar AHORA con winget:" -ForegroundColor White
        Write-Host "       winget install OpenJS.NodeJS.LTS" -ForegroundColor Gray
        $ans = Read-Host "  Quieres que lo instale ahora? [s/N]"
        if ($ans -match '^[sSyY]') {
            winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
            Write-Warn "Cierra y abre una NUEVA terminal para que tome el PATH, luego corre 'npm run setup' otra vez."
            exit 0
        }
    }
    Write-Host "    B) Descargar manual: https://nodejs.org/" -ForegroundColor White
    Write-Host "    C) Con nvm-windows: nvm install 22.20.0 && nvm use 22.20.0" -ForegroundColor White
    Fail "Instala Node y vuelve a ejecutar 'npm run setup'."
}

# ---- Validar Postgres ----
Write-Step "Verificando PostgreSQL"
$pgFound = $false
try { psql --version | Out-Null; $pgFound = $true; Write-Ok ((psql --version) -join ' ') } catch {}

if (-not $pgFound) {
    Write-Host ""
    Write-Host "  PostgreSQL no detectado en PATH." -ForegroundColor Yellow
    Write-Host "  Opciones para instalar PostgreSQL 16:" -ForegroundColor Yellow
    if (Has-Winget) {
        Write-Host "    A) Instalar AHORA con winget (recomendado):" -ForegroundColor White
        Write-Host "       winget install PostgreSQL.PostgreSQL.16" -ForegroundColor Gray
        $ans = Read-Host "  Quieres que lo instale ahora? [s/N]"
        if ($ans -match '^[sSyY]') {
            winget install PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements
            Write-Host ""
            Write-Warn "PostgreSQL instalado. El instalador pidio una contrasena para el usuario 'postgres' - GUARDALA, la pediremos abajo."
            Write-Warn "Si psql sigue sin estar en PATH, agrega: C:\Program Files\PostgreSQL\16\bin"
            Write-Warn "Cierra y abre una NUEVA terminal, luego corre 'npm run setup' de nuevo."
            exit 0
        }
    }
    Write-Host "    B) Descargar manual:" -ForegroundColor White
    Write-Host "       https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "       (Bajar 'Windows x86-64' del instalador oficial EnterpriseDB)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    Durante la instalacion:" -ForegroundColor White
    Write-Host "      - Anota la contrasena del usuario 'postgres'" -ForegroundColor Gray
    Write-Host "      - Puerto: 5432 (default)" -ForegroundColor Gray
    Write-Host "      - Asegurate de marcar 'Command Line Tools' (incluye psql)" -ForegroundColor Gray
    Write-Host ""
    $cont = Read-Host "  Continuar de todas formas? (asume Postgres remoto o en otro path) [s/N]"
    if ($cont -notmatch '^[sSyY]') {
        Fail "Instala PostgreSQL y vuelve a ejecutar 'npm run setup'."
    }
    Write-Warn "Continuando sin psql en PATH. Asegurate que Postgres responde en DATABASE_URL."
}

# ---- Configurar backend/.env ----
Write-Step "Configurando backend/.env"
$envPath = "backend\.env"
if (-not (Test-Path $envPath)) {
    Copy-Item "backend\.env.example" $envPath
    $dbPass = Read-Host "  Password de PostgreSQL (usuario postgres)"
    $dbName = Read-Host "  Nombre de la base de datos [pos]"
    if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "pos" }
    $bizName = Read-Host "  Nombre del negocio [Mi Negocio]"
    if ([string]::IsNullOrWhiteSpace($bizName)) { $bizName = "Mi Negocio" }

    $jwt = -join ((1..48) | ForEach-Object { [char](Get-Random -Min 33 -Max 126) })
    $content = Get-Content $envPath -Raw
    $content = $content -replace 'CHANGEME_PASSWORD', [regex]::Escape($dbPass) -replace '\\','\'
    $content = $content -replace 'fameat_pos', $dbName
    $content = $content -replace 'pos_default', $dbName
    $content = $content -replace 'cambia-esto-por-un-secreto-largo-y-aleatorio', $jwt
    $content = $content -replace 'BUSINESS_NAME="ByteGest"', "BUSINESS_NAME=`"$bizName`""
    $content = $content -replace 'BUSINESS_NAME="POS"', "BUSINESS_NAME=`"$bizName`""
    Set-Content $envPath $content -Encoding UTF8
    Write-Ok "backend/.env creado"
} else {
    Write-Ok "backend/.env ya existe (no se sobreescribe)"
}

# ---- Crear DB si no existe ----
if ($pgFound) {
    Write-Step "Creando base de datos (si no existe)"
    $dbUrl = (Get-Content $envPath | Where-Object { $_ -match '^DATABASE_URL=' }) -replace 'DATABASE_URL=', '' -replace '"',''
    if ($dbUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)$') {
        $pgUser = $matches[1]
        $pgPass = $matches[2]
        $pgHost = $matches[3]
        $pgPort = $matches[4]
        $pgDb   = $matches[5]
        $env:PGPASSWORD = $pgPass
        $existsOut = $null
        try {
            $existsOut = & psql -U $pgUser -h $pgHost -p $pgPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$pgDb'" 2>&1
        } catch {
            $existsOut = $null
        }
        if ($null -eq $existsOut -or $existsOut -match 'authentication failed|password|FATAL|could not connect') {
            Write-Warn "No se pudo conectar a Postgres con las credenciales de backend/.env"
            Write-Warn "Verifica DATABASE_URL en backend/.env, o borra el archivo y vuelve a correr 'npm run setup'."
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
            Fail "Conexion a Postgres fallo. Revisa password y vuelve a intentar."
        }
        $existsTrim = ($existsOut | Out-String).Trim()
        if ($existsTrim -ne '1') {
            & psql -U $pgUser -h $pgHost -p $pgPort -d postgres -c "CREATE DATABASE `"$pgDb`"" 2>&1 | Out-Null
            Write-Ok "DB '$pgDb' creada"
        } else {
            Write-Ok "DB '$pgDb' ya existe"
        }
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# ---- Instalar dependencias ----
Write-Step "Instalando dependencias npm (workspaces)"
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install fallo" }
Write-Ok "Dependencias instaladas"

# ---- Prisma generate + migrate + seed ----
Write-Step "Aplicando migraciones Prisma"
npx --workspace=backend prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Fail "Migraciones fallaron. Revisa DATABASE_URL." }
Write-Ok "Migraciones aplicadas"

Write-Step "Generando cliente Prisma"
npx --workspace=backend prisma generate
Write-Ok "Cliente Prisma generado"

Write-Step "Sembrando datos iniciales"
$seedAnswer = Read-Host "  Correr seed (crea usuarios admin/admin123, supervisor1/super123, cajero1/cajero123)? [s/N]"
if ($seedAnswer -match '^[sSyY]') {
    npm run db:seed
    Write-Ok "Seed completado"
} else {
    Write-Ok "Seed omitido"
}

# ---- Build ----
Write-Step "Compilando backend"
npm run build --workspace=backend
if ($LASTEXITCODE -ne 0) { Fail "Build backend fallo" }
Write-Ok "Backend compilado"

Write-Step "Compilando frontend"
npm run build --workspace=frontend
if ($LASTEXITCODE -ne 0) { Fail "Build frontend fallo" }
Write-Ok "Frontend compilado"

# ---- Listo ----
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host " POS instalado correctamente" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Inicio rapido:" -ForegroundColor White
Write-Host "   npm start              # produccion (un solo proceso)" -ForegroundColor Gray
Write-Host "   npm run start:https    # produccion con HTTPS (PWA + camara)" -ForegroundColor Gray
Write-Host "   npm run dev            # desarrollo (hot reload)" -ForegroundColor Gray
Write-Host ""
Write-Host " Abrir: http://localhost:3001" -ForegroundColor White
Write-Host ""
