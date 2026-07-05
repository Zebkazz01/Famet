# Guía de Instalación — POS

Sistema de Punto de Venta con balanza digital, gestión de inventario, ventas, caja, clientes con crédito, órdenes de compra y backups automáticos.

---

## Tabla de contenido

1. [Pre-requisitos](#1-pre-requisitos)
2. [Instalación inicial](#2-instalación-inicial)
3. [Primera ejecución](#3-primera-ejecución)
4. [Modo producción (recomendado)](#4-modo-producción-recomendado)
5. [HTTPS para PWA + cámara](#5-https-para-pwa--cámara)
6. [Acceso desde celular u otro PC en la red](#6-acceso-desde-celular-u-otro-pc-en-la-red)
7. [Acceso directo del escritorio](#7-acceso-directo-del-escritorio)
8. [Instalar como PWA](#8-instalar-como-pwa)
9. [Backups automáticos](#9-backups-automáticos)
10. [CLI de balanza](#10-cli-de-balanza)
11. [Solución de problemas](#11-solución-de-problemas)
12. [Comandos rápidos](#12-comandos-rápidos)

---

## 1. Pre-requisitos

Instalar **antes** de empezar (no son automatizables sin permisos de admin):

| Software | Versión | Descarga |
|---|---|---|
| **Node.js** | 20+ | https://nodejs.org/ |
| **PostgreSQL** | 14+ | https://www.postgresql.org/download/ |
| **Git** (opcional) | cualquiera | https://git-scm.com/ |
| **mkcert** (opcional para HTTPS LAN) | cualquiera | https://github.com/FiloSottile/mkcert |

Verifica en PowerShell o CMD:
```cmd
node -v       :: debe decir v20.x.x o superior
psql --version
```

---

## 2. Instalación inicial

### Opción A — Clonar de Git
```cmd
git clone <url-del-repo> pos
cd pos
```

### Opción B — Copiar carpeta
Copia el directorio del proyecto a `C:\Users\<tuusuario>\Documents\pos` o donde prefieras.

### Correr el setup automático
```cmd
npm run setup
```

El script `setup`:
- Valida Node 20+ y PostgreSQL
- Pide password de Postgres, nombre de la BD y nombre del negocio
- Genera `backend/.env` con JWT aleatorio
- Crea la base de datos si no existe
- Instala dependencias (npm workspaces)
- Aplica migraciones Prisma + genera cliente
- Pregunta si correr seed (crea usuarios default)
- Compila backend y frontend

Tarda **3-8 minutos** dependiendo de la PC e internet.

### Usuarios por defecto (si corriste seed)

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `supervisor1` | `super123` | SUPERVISOR |
| `cajero1` | `cajero123` | VENDEDOR |

**Cambia las contraseñas en producción.**

---

## 3. Primera ejecución

```cmd
npm start
```

Verás:
```
[server] escuchando en http://0.0.0.0:3001
[server] sirviendo frontend desde ...frontend\dist
```

Abre **http://localhost:3001** en el navegador.

Login con `admin / admin123`.

Ve a **Configuración → Negocio**, cambia:
- Nombre del negocio (afecta título, manifest PWA, shortcut, reportes)
- Logo (afecta tab del navegador, splash, PDFs, icono del shortcut)
- Dirección y teléfono (aparecen en tickets)

---

## 4. Modo producción (recomendado)

Un solo proceso Node sirve API + frontend desde el mismo puerto `3001`. No requiere Vite.

```cmd
npm run build       :: compila backend + frontend
npm start           :: arranca el servidor
```

O **doble-click a `POS.bat`** — detecta automáticamente:
- Si falta `backend/.env` → corre setup
- Si falta `backend/dist` → compila
- Si hay certs HTTPS → arranca con HTTPS
- Lanza la PWA en modo standalone (Chrome `--app=URL` si está instalado, Edge fallback)

Para correr en **modo desarrollo** (hot reload, sólo desde el PC):
```cmd
npm run dev         :: backend :3001 + frontend Vite :5174
```

---

## 5. HTTPS para PWA + cámara

PWA install y `getUserMedia` (cámara para barcode scanner) **sólo funcionan en HTTPS** (excepto en `localhost`).

### Opción 1 — mkcert (recomendado para LAN)

`mkcert` genera certs locales de confianza para tu PC y dispositivos. Una vez instalado:

```cmd
:: 1. Instalar CA local (una sola vez por máquina)
mkcert -install

:: 2. Generar cert para localhost + tu IP de LAN
cd C:\Users\zebka\Documents\fameat\frontend
mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 192.168.100.7
```

Cambia `192.168.100.7` por la IP real de tu PC en la red (averígualo con `ipconfig` → IPv4 del adaptador WiFi).

### Opción 2 — Cert auto-firmado (warning del navegador)

Si ya tienes cert.pem + key.pem propios, déjalos en `frontend/`.

### Arrancar con HTTPS

```cmd
npm run start:https
```

O simplemente **`POS.bat`** detecta los certs y arranca con HTTPS automáticamente.

Verás:
```
[server] escuchando en https://0.0.0.0:3001
```

URLs:
- PC: `https://localhost:3001`
- LAN: `https://192.168.100.7:3001`

### Instalar el CA en el celular

Para que el celular acepte el cert sin warning:
1. `mkcert -CAROOT` → te muestra la carpeta donde está `rootCA.pem`
2. Envíalo al celular (email, WhatsApp, etc.)
3. Android: Ajustes → Seguridad → Cifrado → Instalar certificado → Certificado CA → seleccionar `rootCA.pem`
4. iPhone: enviarlo por AirDrop → Ajustes → Perfil descargado → Instalar → Ajustes → General → Información → Ajustes de confianza del certificado → activar

---

## 6. Acceso desde celular u otro PC en la red

1. **Averigua la IP del PC servidor**:
   ```cmd
   ipconfig
   ```
   Mira la "Dirección IPv4" del adaptador conectado al WiFi (ej. `192.168.100.7`).

2. **Abre el puerto 3001 en el firewall** de Windows (PowerShell como admin):
   ```powershell
   New-NetFirewallRule -DisplayName "POS 3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
   ```

3. Desde el celular o cualquier dispositivo en la misma red WiFi:
   - HTTP: `http://192.168.100.7:3001`
   - HTTPS: `https://192.168.100.7:3001` (recomendado para PWA)

4. **Verifica conectividad**:
   ```
   https://192.168.100.7:3001/api/health
   ```
   Debe responder JSON `{"status":"ok"...}`.

---

## 7. Acceso directo del escritorio

Genera un `.lnk` en el escritorio con el logo del negocio:

```cmd
npm run shortcut
```

- Nombre del shortcut = nombre del negocio (`Minimercado El Castillo.lnk`)
- Icono = `backend/uploads/logo/logo.png` convertido a `.ico` con tamaños 16/32/48/64/128/256
- Target = `POS.bat`

**Auto-regenerate**: cuando cambies el nombre o logo desde **Configuración**, el shortcut se regenera automáticamente en background (sin acción manual).

Desactivable con env var `AUTO_SHORTCUT=false`.

---

## 8. Instalar como PWA

### En PC (Chrome/Edge)

1. Abre `https://localhost:3001`
2. En la barra de direcciones aparece icono "Instalar" o un botón en el banner inferior
3. Click "Instalar" → la app queda en el menú de inicio y crea su propio shortcut Chrome

### En celular Android (Chrome)

1. Abre `https://192.168.100.7:3001`
2. Aparece banner "Instalar [Negocio]" abajo → tap "Instalar"
3. O en el menú ⋮ → "Instalar aplicación"
4. Se agrega al lanzador como app independiente

### En celular iPhone (Safari)

1. Abre `https://192.168.100.7:3001` en Safari (no Chrome)
2. Botón Compartir → "Agregar a pantalla de inicio"

La PWA usa el logo y nombre configurados en el sistema. Si cambias el logo desde el admin, **reinstala la PWA** en el celular para que tome la nueva imagen.

---

## 9. Backups automáticos

Configuración (en `backend/.env`):
```
BACKUP_ENABLED=true            # "false" para deshabilitar
BACKUP_DIR=./backups           # ruta destino (default: backend/backups)
BACKUP_RETENTION=14            # días a conservar
BACKUP_CRON="0 2 * * *"        # default: 02:00 diario
```

Requiere `pg_dump` en PATH (incluido con PostgreSQL).

### Comandos

```cmd
npm run backup:run             :: hacer backup ahora
npm run backup:list            :: listar backups
npm run backup:restore <file>  :: restaurar (pide confirmación)
npm run backup:restore <file> --clean    :: con DROP de objetos previo
```

Ejemplo restore:
```cmd
npm run backup:list
:: muestra: Minimercado_2026-06-03_140530.dump

npm run backup:restore Minimercado_2026-06-03_140530.dump --clean
:: te pide escribir "RESTAURAR" para confirmar
:: genera safety backup automáticamente antes
```

### Desde la UI

Login como ADMIN → menú **Backups** → click "Restaurar" en cualquier dump. Pide confirmación + recarga automáticamente la app tras el restore.

---

## 10. CLI de balanza

Diagnóstico y testing de la balanza serial sin la app:

```cmd
npm run scale:ports            :: lista puertos COM disponibles
npm run scale:test             :: prueba conexión
npm run scale:monitor          :: ver peso en vivo
npm run scale:raw              :: bytes crudos (debug protocolo)
npm run scale:tare             :: aplicar tare
npm run scale:config           :: ver config actual
```

Default: `COM3` a `9600 baud` (configurable en `backend/.env` → `SCALE_PORT` y `SCALE_BAUD_RATE`).

Si no hay balanza, el sistema funciona con ingreso manual de peso.

---

## 11. Solución de problemas

### "Cannot find module 'backend/dist/index.js'" al hacer `npm start`
Falta build. Ejecuta:
```cmd
npm run build
npm start
```

### Login no funciona / no hay usuarios
Corre el seed:
```cmd
npm run db:seed
```

### Logo no carga / imagen rota en login
Asegúrate de tener la última versión compilada del backend:
```cmd
npm run build:backend
npm start
```

### Puerto 3001 ya en uso
Cambia `PORT=` en `backend/.env`. O cierra la otra instancia:
```cmd
netstat -ano | findstr :3001
taskkill /PID <pid> /F
```

### PWA stuck en spinner
- Borra cache: F12 → Application → Service Workers → Unregister → Storage → Clear site data
- En celular: desinstala PWA, abre en navegador, vuelve a instalar
- Verifica que tienes el frontend compilado (`frontend/dist/index.html` existe)

### "Backup falló" al restaurar
- Verifica `pg_dump` y `pg_restore` están en PATH
- Verifica que `BACKUP_DIR` exista (`mkdir backend\backups`)
- Cierra otras conexiones a la BD (Prisma Studio, pgAdmin, etc.)

### Cámara no funciona en celular
HTTP no permite getUserMedia. Necesitas HTTPS — ver [sección 5](#5-https-para-pwa--cámara).

### Cert HTTPS no es de confianza en celular
Instala el `rootCA.pem` de mkcert en el celular ([sección 5](#5-https-para-pwa--cámara) al final).

### Backend no responde desde celular
Verifica:
1. Mismo WiFi (no datos móviles)
2. Firewall Windows permitiendo puerto 3001
3. `http://192.168.100.7:3001/api/health` desde el celular debe responder JSON

### Migraciones Prisma fallan
Verifica `DATABASE_URL` en `backend/.env`. Crea la BD manualmente si no existe:
```cmd
psql -U postgres -c "CREATE DATABASE pos"
npm run db:migrate:deploy
```

### Quiero resetear todo
```cmd
:: PELIGROSO: borra todos los datos
psql -U postgres -c "DROP DATABASE IF EXISTS pos"
psql -U postgres -c "CREATE DATABASE pos"
npm run db:migrate:deploy
npm run db:seed
```

---

## 12. Comandos rápidos

### Operación diaria
| Comando | Descripción |
|---|---|
| `POS.bat` (doble-click) | Arranca todo + abre PWA |
| `npm start` | Arranca backend HTTP en :3001 |
| `npm run start:https` | Arranca backend HTTPS en :3001 |
| `npm run dev` | Desarrollo (hot reload) |

### Setup y mantenimiento
| Comando | Descripción |
|---|---|
| `npm run setup` | Instalación inicial completa |
| `npm run build` | Compila backend + frontend |
| `npm run shortcut` | Regenera icono escritorio |

### Base de datos
| Comando | Descripción |
|---|---|
| `npm run db:migrate:deploy` | Aplica migraciones pendientes |
| `npm run db:seed` | Crea datos default |
| `npm run db:studio` | Abre UI de Prisma para inspeccionar |
| `npm run prisma:generate` | Regenera cliente Prisma |

### Backups
| Comando | Descripción |
|---|---|
| `npm run backup:run` | Backup manual ahora |
| `npm run backup:list` | Listar backups |
| `npm run backup:restore <file>` | Restaurar (con confirmación) |
| `npm run backup:help` | Ayuda del CLI |

### Balanza
| Comando | Descripción |
|---|---|
| `npm run scale:ports` | Listar puertos COM |
| `npm run scale:test` | Test de conexión |
| `npm run scale:monitor` | Monitor en vivo |
| `npm run scale:tare` | Tarar |

---

## Estructura del proyecto

```
fameat/
├── backend/              Express + Prisma + Postgres
│   ├── prisma/           Schema + migraciones + seed
│   ├── src/              Código TypeScript
│   ├── uploads/          Logo, imágenes productos, comprobantes gastos
│   ├── backups/          Dumps PostgreSQL (auto-creado)
│   ├── dist/             Compilado (auto-creado por npm run build)
│   └── .env              Config (NO commitear)
├── frontend/             React + Vite + Tailwind
│   ├── src/              Código TypeScript + JSX
│   ├── public/           Assets estáticos (manifest, sw, iconos PWA)
│   ├── dist/             Compilado (auto-creado por npm run build)
│   ├── cert.pem          Cert HTTPS (mkcert)
│   └── key.pem           Key HTTPS (mkcert)
├── scripts/              Scripts utilitarios (setup, shortcut)
├── drivers/              Drivers CH340 para balanza
├── POS.bat               Lanzador Windows doble-click
├── setup.ps1             Instalador Windows
├── setup.sh              Instalador Linux/Mac
└── package.json          npm workspaces (backend + frontend)
```

---

## Soporte

- **Stack**: Node 20 + TypeScript + Prisma 6 + PostgreSQL 14+ + React 19 + Vite 7 + Tailwind v4 + Socket.IO
- **Hardware soportado**: balanza RC-A01E con chip CH340 (USB-Serial), scanner USB código de barras
- **PWA**: installable Android (Chrome), iPhone (Safari), Windows (Chrome/Edge)
