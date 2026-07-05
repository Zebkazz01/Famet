#!/usr/bin/env bash
# FAMEAT POS — Instalador one-shot (Linux/Mac/Git-Bash)
# Uso: bash setup.sh

set -e

step() { echo -e "\n>>> \033[36m$1\033[0m"; }
ok()   { echo -e "    \033[32mOK\033[0m  $1"; }
warn() { echo -e "    \033[33m!!\033[0m  $1"; }
fail() { echo -e "    \033[31mXX\033[0m  $1"; exit 1; }

# ---- Validar Node ----
step "Verificando Node.js"
command -v node >/dev/null 2>&1 || fail "Node.js no instalado. Descarga: https://nodejs.org/"
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 20 ] || fail "Node.js $(node -v) detectado. Requiere 20+."
ok "Node.js $(node -v)"

# ---- Validar Postgres ----
step "Verificando PostgreSQL"
if command -v psql >/dev/null 2>&1; then ok "$(psql --version)"; PG_FOUND=1
else warn "psql no en PATH (continuando)"; PG_FOUND=0; fi

# ---- Configurar backend/.env ----
step "Configurando backend/.env"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  read -p "  Password de PostgreSQL (usuario postgres): " DB_PASS
  read -p "  Nombre de la base de datos [fameat_pos]: " DB_NAME
  DB_NAME=${DB_NAME:-fameat_pos}
  read -p "  Nombre del negocio [ByteGest]: " BIZ_NAME
  BIZ_NAME=${BIZ_NAME:-ByteGest}
  JWT=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()' </dev/urandom | head -c 48)

  # macOS sed quirk: -i ''  vs GNU sed -i
  SEDI=(-i)
  if [[ "$OSTYPE" == "darwin"* ]]; then SEDI=(-i ''); fi
  sed "${SEDI[@]}" "s|CHANGEME_PASSWORD|${DB_PASS}|g" backend/.env
  sed "${SEDI[@]}" "s|fameat_pos|${DB_NAME}|g" backend/.env
  sed "${SEDI[@]}" "s|cambia-esto-por-un-secreto-largo-y-aleatorio|${JWT}|g" backend/.env
  sed "${SEDI[@]}" "s|BUSINESS_NAME=\"ByteGest\"|BUSINESS_NAME=\"${BIZ_NAME}\"|g" backend/.env
  ok "backend/.env creado"
else ok "backend/.env ya existe (no se sobreescribe)"; fi

# ---- Crear DB si no existe ----
if [ "$PG_FOUND" -eq 1 ]; then
  step "Creando base de datos (si no existe)"
  DB_URL=$(grep '^DATABASE_URL=' backend/.env | sed 's/DATABASE_URL=//' | tr -d '"')
  PG_USER=$(echo "$DB_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
  PG_PASS=$(echo "$DB_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')
  PG_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:]+):.*|\1|')
  PG_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  PG_DB=$(echo   "$DB_URL" | sed -E 's|.*:[0-9]+/(.+)$|\1|')
  EXISTS=$(PGPASSWORD="$PG_PASS" psql -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" 2>/dev/null)
  if [ "$EXISTS" != "1" ]; then
    PGPASSWORD="$PG_PASS" psql -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -d postgres -c "CREATE DATABASE \"${PG_DB}\"" >/dev/null
    ok "DB '$PG_DB' creada"
  else ok "DB '$PG_DB' ya existe"; fi
fi

# ---- Dependencias ----
step "Instalando dependencias npm (workspaces)"
npm install
ok "Dependencias instaladas"

# ---- Migraciones + cliente Prisma + seed ----
step "Aplicando migraciones Prisma"
npx --workspace=backend prisma migrate deploy
ok "Migraciones aplicadas"

step "Generando cliente Prisma"
npx --workspace=backend prisma generate
ok "Cliente Prisma generado"

step "Sembrando datos iniciales"
read -p "  Correr seed (crea usuarios admin/admin123, supervisor1/super123, cajero1/cajero123)? [s/N]: " SEED_ANS
if [[ "$SEED_ANS" =~ ^[sSyY] ]]; then
  npm run db:seed
  ok "Seed completado"
else ok "Seed omitido"; fi

# ---- Builds ----
step "Compilando backend"
npm run build --workspace=backend
ok "Backend compilado"

step "Compilando frontend"
npm run build --workspace=frontend
ok "Frontend compilado"

echo
echo -e "\033[32m==================================================\033[0m"
echo -e "\033[32m FAMEAT POS instalado correctamente\033[0m"
echo -e "\033[32m==================================================\033[0m"
echo
echo " Inicio rápido:"
echo "   npm start              # producción (un solo proceso)"
echo "   npm run dev            # desarrollo (hot reload)"
echo
echo " Abrir: http://localhost:3001"
echo
