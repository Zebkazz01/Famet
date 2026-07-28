<div align="center">

# 🥩 FAMEAT POS

### Punto de Venta completo para carnicerías, restaurantes y negocios que manejan productos por peso

![Version](https://img.shields.io/badge/version-1.3.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/node-20%2B-brightgreen?style=for-the-badge)
![React](https://img.shields.io/badge/react-19-61DAFB?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/typescript-5.8-3178C6?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/postgresql-14%2B-4169E1?style=for-the-badge)

[English](#english) | [Español](#español) | [Índice (ES)](#-índice-es) | [Index (EN)](#-table-of-contents-en)

---

**🎬 Demo en vivo**

![FAMEAT POS Preview](preview.png)

**🔗 [Demo en vivo → famet-backend-iota.vercel.app](https://famet-backend-iota.vercel.app)**

</div>

---

# Español

## 📋 Índice

1. [¿Por qué existe?](#por-qué-existe-fameat-pos)
2. [Características principales](#características-principales)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Decisiones de arquitectura](#decisiones-de-arquitectura)
5. [Instalación](#instalación)
6. [Estructura del Proyecto](#estructura-del-proyecto)
7. [Ejemplos de Código](#ejemplos-de-código)
8. [Testing](#testing)
9. [Configuración](#configuración)
10. [Desarrollo](#desarrollo)
11. [Futuras Mejoras](#futuras-mejoras)
12. [Licencia](#licencia)

---

## ¿Por qué existe FAMEAT POS?

FAMEAT POS nació de una necesidad real: las carnicerías y minimercados en Latinoamérica necesitan un sistema POS que entienda que **el producto se vende por peso**, no por unidad. La mayoría de los sistemas existentes son genéricos (cajas registradoras, Shopify POS, etc.) y no resuelven la integración directa con una balanza USB, el control de lotes con vencimiento, o el crédito a clientes con seguimiento FIFO. Este sistema está diseñado desde cero para ese flujo específico.

---

## Características principales

| | |
|---|---|
| ⚖️ **Balanza USB integrada** | Conexión directa con balanzas CH340 — peso en tiempo real sin clics extra |
| 📦 **Inventario por lotes** | Control de stock con fechas de vencimiento y movimientos (entradas, salidas, pérdidas) |
| 👥 **Crédito a clientes** | Límite de crédito, pagos parciales con seguimiento FIFO, historial completo |
| 💰 **Caja diaria** | Apertura, movimientos, arqueo y gastos operativos |
| 📱 **PWA instalable** | Funciona como app en Android, iPhone y PC — sin app store |
| 🔒 **Roles granulares** | ADMIN, SUPERVISOR, VENDEDOR con permisos por módulo |
| 📊 **Reportes + Excel** | Ventas, inventario, financieros — exportables a hojas de cálculo |
| 🖨️ **Tickets PDF** | Generados con PDFKit, personalizables con logo del negocio |

<details>
<summary><strong>Ver todas las funcionalidades (15)</strong></summary>

| Característica | Descripción |
|----------------|-------------|
| 🖥️ **Punto de Venta** | Interfaz intuitiva con balanza integrada |
| ⚖️ **Balanza Digital** | Conexión directa con balanzas CH340 USB-Serial |
| 📦 **Inventario** | Gestión completa con lotes y fechas de vencimiento |
| 👥 **Clientes** | Sistema de crédito con límites y pagos parciales |
| 🏪 **Proveedores** | Órdenes de compra y seguimiento de entregas |
| 💰 **Caja** | Control de movimientos y arqueo diario |
| 📊 **Dashboard** | Métricas y gráficas en tiempo real |
| 🔔 **Notificaciones** | Alertas de stock bajo, vencimientos y ventas |
| 📱 **PWA** | Instalable en Android, iPhone y PC |
| 🔒 **Roles** | ADMIN, SUPERVISOR, VENDEDOR con permisos granulares |
| 💾 **Backups** | Respaldos automáticos programados |
| 🎨 **Temas** | Modo claro y oscuro personalizable |
| 🖨️ **PDFs** | Tickets y reportes generados con PDFKit |
| 📈 **Reportes** | Ventas, inventario, financieros y Excel |
| 🔍 **Código de Barras** | Escáner integrado con cámara o dispositivo USB |

</details>

---

## Stack Tecnológico

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     FAMEAT POS (PERN)                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)     │  Backend (Express)    │  Database   │
│  ─────────────────    │  ──────────────────   │  ─────────  │
│  • Pages              │  • Modules            │  PostgreSQL │
│  • Components         │    ├─ controller.ts   │  (Prisma)   │
│  • Contexts           │    ├─ routes.ts       │             │
│  • Hooks              │    └─ schema.ts       │             │
│  • API Client         │  • Jobs (cron)        │             │
│                       │  • PDF Generator      │             │
│                       │  • Scale Manager      │             │
└─────────────────────────────────────────────────────────────┘
```

| Capa | Tecnología | Versión |
|------|------------|---------|
| Runtime | Node.js | 20+ |
| Lenguaje | TypeScript | 5.8 |
| Backend Framework | Express | 4.21 |
| ORM | Prisma | 6.5 |
| Base de datos | PostgreSQL | 14+ |
| Auth | JWT | 9.0 |
| Real-time | Socket.IO | 4.8 |
| Frontend Framework | React | 19.2 |
| Bundler | Vite | 7.3 |
| CSS | Tailwind CSS | 4.2 |
| Monorepo | npm workspaces | — |

---

## Decisiones de arquitectura

**¿Por qué PostgreSQL + Prisma en vez de MongoDB?** Las relaciones entre ventas → inventario → clientes → caja requieren integridad referencial real. Una venta afecta el stock, el saldo del cliente y el estado de la caja en una transacción. MongoDB exige lógica de consistencia en la aplicación; PostgreSQL la garantiza a nivel de base de datos.

**¿Por qué monorepo con npm workspaces?** El frontend y backend comparten tipos (interfaces de API, enums de roles) y se despliegan juntos. Un monorepo simplifica el desarrollo local (`npm run dev` arranca ambos) y evita la duplicación de configuración de TypeScript/ESLint.

**¿Por qué Express en vez de Fastify/NestJS?** Para este volumen (un solo negocio, no SaaS multi-tenant), Express es suficiente y tiene el ecosistema más amplio. NestJS añade complejidad innecesaria para una app que no escala a miles de usuarios concurrentes.

---

## Instalación

### Pre-requisitos

| Software | Versión | Descarga |
|----------|---------|----------|
| **Node.js** | 20+ | https://nodejs.org/ |
| **PostgreSQL** | 14+ | https://www.postgresql.org/download/ |
| **Git** | cualquiera | https://git-scm.com/ |

### Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/Zebkazz01/Famet.git fameat
cd fameat

# 2. Ejecutar setup automático
npm run setup

# 3. Iniciar el servidor
npm start
```

### Acceso

- **URL**: http://localhost:3001
- **Credenciales**: Las credenciales de acceso inicial se generan automáticamente durante el seed (`npm run db:seed`). Consulta [INSTALL.md](INSTALL.md) para el detalle de los usuarios por defecto y cómo personalizarlos.

### Instalación Detallada

Para instrucciones completas (HTTPS, PWA, acceso LAN, backups), ver [INSTALL.md](INSTALL.md)

---

## Estructura del Proyecto

```
fameat/
├── backend/                    # Servidor Express + Prisma + PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma       # Modelo de datos
│   │   ├── seed.ts             # Datos iniciales
│   │   └── migrations/         # Migraciones de BD
│   ├── src/
│   │   ├── modules/            # Módulos de la API
│   │   │   ├── products/       # Productos
│   │   │   ├── sales/          # Ventas
│   │   │   ├── inventory/      # Inventario
│   │   │   ├── cash/           # Caja
│   │   │   ├── customers/      # Clientes
│   │   │   ├── suppliers/      # Proveedores
│   │   │   └── ...             # Otros módulos
│   │   ├── jobs/               # Tareas programadas (cron)
│   │   ├── scale/              # Integración con balanza
│   │   ├── pdf/                # Generación de PDFs
│   │   └── realtime/           # Socket.IO
│   └── uploads/                # Imágenes y archivos
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/              # 15 páginas principales
│   │   ├── components/         # Componentes reutilizables
│   │   ├── contexts/           # React Context (Auth, Theme, etc.)
│   │   ├── hooks/              # Custom hooks
│   │   └── api/                # Clientes API
│   └── public/                 # Assets estáticos + PWA
│
├── scripts/                    # Scripts de utilería
├── drivers/                    # Drivers CH340 (balanza)
└── POS.bat                     # Lanzador Windows
```

---

## Ejemplos de Código

### Ruta API con autenticación y validación

```typescript
// backend/src/modules/products/products.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { productSchema } from './products.schema';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { 
      category: true,
      batches: { where: { expiryDate: { gte: new Date() } } }
    },
    orderBy: { name: 'asc' }
  });
  res.json({ data: products });
});

router.post('/', 
  authenticate, 
  validate(productSchema),
  async (req, res) => {
    const product = await prisma.product.create({
      data: req.body,
      include: { category: true }
    });
    res.status(201).json({ data: product });
  }
);
```

### Integración con balanza USB (diferenciador real)

```typescript
// backend/src/scale/scaleManager.ts
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';

export class ScaleManager extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;

  constructor(private config: { port: string; baudRate: number }) {
    super();
  }

  async connect(): Promise<void> {
    this.port = new SerialPort({
      path: this.config.port,
      baudRate: this.config.baudRate,
    });

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    this.parser.on('data', (data: string) => {
      const weight = this.parseWeight(data);
      if (weight !== null) {
        this.emit('weight', weight);
      }
    });
  }

  private parseWeight(data: string): number | null {
    const match = data.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  async tare(): Promise<void> {
    this.port?.write('T\r\n');
  }
}
```

> Para ver los demás ejemplos (AuthContext, componente POS, etc.), revisa el código fuente directamente en `backend/src/modules/` y `frontend/src/pages/`.

---

## Testing

Tests unitarios con **Vitest** — ejecutados sin base de datos ni servicios externos.

```bash
cd backend
npm test                    # Ejecutar todos los tests
npm run test:watch          # Modo watch (desarrollo)
```

### Cobertura actual

| Archivo | Tests | Qué valida |
|---------|-------|------------|
| `scale/scaleParser.ts` | 19 | Parsing de 3 protocolos de balanza (ST/US, =/+, numérico puro) |
| `modules/discounts/discountEngine.ts` | 14 | Reglas de descuento: QUANTITY_THRESHOLD, PERCENTAGE, BUY_X_GET_Y, FIXED_AMOUNT, prioridad, expiración |
| `utils/businessDay.ts` | 19 | Lógica de día laboral (07:00-06:59), bordes de mes/año, parseo de fechas |
| `middleware/auth.ts` | 11 | JWT authenticate + authorize (tokens válidos, expirados, roles) |
| `modules/sales/sales.schema.ts` | 10 | Validación Zod de ventas (items, pagos, crédito, defaults) |
| `modules/auth/auth.schema.ts` | 4 | Validación de login (campos requeridos) |

### Próximos tests a implementar

| Módulo | Tipo | Prioridad |
|--------|------|-----------|
| Inventario / Lotes | Unit + Integration | Alta |
| Caja / Arqueo | Integration | Media |
| Frontend (componentes) | E2E con Playwright | Baja |

---

## Configuración

### Variables de Entorno (backend/.env)

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/fameat

# JWT
JWT_SECRET=tu-secreto-seguro-aqui

# Puerto del servidor
PORT=3001

# Balanza
SCALE_PORT=COM3
SCALE_BAUD_RATE=9600

# Backups
BACKUP_ENABLED=true
BACKUP_DIR=./backups
BACKUP_RETENTION=14
BACKUP_CRON="0 2 * * *"

# HTTPS (opcional)
HTTPS=false
```

### Backups

```bash
npm run backup:run          # Backup manual
npm run backup:list         # Listar backups
npm run backup:restore <archivo>  # Restaurar
```

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo (hot reload)
npm run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:5174
```

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con hot reload |
| `npm run build` | Compilar para producción |
| `npm start` | Iniciar servidor producción |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run db:seed` | Crear datos iniciales |

---

## Futuras mejoras

- [ ] **Tests automatizados** — Vitest + Playwright
- [ ] **Multi-sucursal** — Soporte para múltiples tiendas
- [ ] **App móvil nativa** — React Native para iOS/Android
- [ ] **Pasarelas de pago** — Integración con Stripe, MercadoPago
- [ ] **Modo offline** — Funcionamiento sin conexión
- [ ] **API pública** — Documentación OpenAPI/Swagger
- [ ] **Fidelización** — Programa de puntos y recompensas

---

## Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

# English

## 📋 Table of Contents

1. [Why does it exist?](#why-does-fameat-pos-exist)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Architecture Decisions](#architecture-decisions)
5. [Installation](#installation)
6. [Project Structure](#project-structure)
7. [Code Examples](#code-examples)
8. [Testing](#testing-1)
9. [Configuration](#configuration)
10. [Development](#development)
11. [Future Improvements](#future-improvements)
12. [License](#license-1)

---

## Why does FAMEAT POS exist?

FAMEAT POS was built from a real need: butcher shops and convenience stores in Latin America need a POS system that understands **products are sold by weight**, not by unit. Most existing systems are generic (cash registers, Shopify POS, etc.) and don't solve direct USB scale integration, batch tracking with expiration dates, or customer credit with FIFO tracking. This system is designed from the ground up for that specific workflow.

---

## Key Features

| | |
|---|---|
| ⚖️ **USB Scale Integration** | Direct connection with CH340 scales — real-time weight with zero extra clicks |
| 📦 **Batch Inventory** | Stock control with expiration dates and movements (entries, exits, losses) |
| 👥 **Customer Credit** | Credit limits, partial payments with FIFO tracking, full history |
| 💰 **Daily Cash Register** | Opening, movements, reconciliation and operational expenses |
| 📱 **Installable PWA** | Works as an app on Android, iPhone and PC — no app store needed |
| 🔒 **Granular Roles** | ADMIN, SUPERVISOR, VENDOR with per-module permissions |
| 📊 **Reports + Excel** | Sales, inventory, financials — exportable to spreadsheets |
| 🖨️ **PDF Tickets** | Generated with PDFKit, customizable with business logo |

<details>
<summary><strong>See all features (15)</strong></summary>

| Feature | Description |
|---------|-------------|
| 🖥️ **Point of Sale** | Intuitive interface with integrated scale |
| ⚖️ **Digital Scale** | Direct connection with CH340 USB-Serial scales |
| 📦 **Inventory** | Complete management with batches and expiration dates |
| 👥 **Customers** | Credit system with limits and partial payments |
| 🏪 **Suppliers** | Purchase orders and delivery tracking |
| 💰 **Cash Register** | Movement control and daily reconciliation |
| 📊 **Dashboard** | Real-time metrics and charts |
| 🔔 **Notifications** | Low stock, expirations, and sales alerts |
| 📱 **PWA** | Installable on Android, iPhone, and PC |
| 🔒 **Roles** | ADMIN, SUPERVISOR, VENDOR with granular permissions |
| 💾 **Backups** | Scheduled automatic backups |
| 🎨 **Themes** | Customizable light and dark mode |
| 🖨️ **PDFs** | Tickets and reports generated with PDFKit |
| 📈 **Reports** | Sales, inventory, financial, and Excel |
| 🔍 **Barcode Scanner** | Integrated scanner with camera or USB device |

</details>

---

## Tech Stack

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FAMEAT POS (PERN)                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)     │  Backend (Express)    │  Database   │
│  ─────────────────    │  ──────────────────   │  ─────────  │
│  • Pages              │  • Modules            │  PostgreSQL │
│  • Components         │    ├─ controller.ts   │  (Prisma)   │
│  • Contexts           │    ├─ routes.ts       │             │
│  • Hooks              │    └─ schema.ts       │             │
│  • API Client         │  • Jobs (cron)        │             │
│                       │  • PDF Generator      │             │
│                       │  • Scale Manager      │             │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5.8 |
| Backend Framework | Express | 4.21 |
| ORM | Prisma | 6.5 |
| Database | PostgreSQL | 14+ |
| Auth | JWT | 9.0 |
| Real-time | Socket.IO | 4.8 |
| Frontend Framework | React | 19.2 |
| Bundler | Vite | 7.3 |
| CSS | Tailwind CSS | 4.2 |
| Monorepo | npm workspaces | — |

---

## Architecture Decisions

**Why PostgreSQL + Prisma instead of MongoDB?** Relationships between sales → inventory → customers → cash register require real referential integrity. A sale affects stock, customer balance, and cash register state in a single transaction. MongoDB requires consistency logic in the application; PostgreSQL guarantees it at the database level.

**Why monorepo with npm workspaces?** Frontend and backend share types (API interfaces, role enums) and deploy together. A monorepo simplifies local development (`npm run dev` starts both) and avoids duplicating TypeScript/ESLint configuration.

**Why Express instead of Fastify/NestJS?** For this volume (a single business, not a multi-tenant SaaS), Express is sufficient and has the widest ecosystem. NestJS adds unnecessary complexity for an app that won't scale to thousands of concurrent users.

---

## Installation

### Prerequisites

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | 20+ | https://nodejs.org/ |
| **PostgreSQL** | 14+ | https://www.postgresql.org/download/ |
| **Git** | any | https://git-scm.com/ |

### Quick Install

```bash
# 1. Clone the repository
git clone https://github.com/Zebkazz01/Famet.git fameat
cd fameat

# 2. Run automatic setup
npm run setup

# 3. Start the server
npm start
```

### Access

- **URL**: http://localhost:3001
- **Credentials**: Access credentials are generated automatically during seed (`npm run db:seed`). See [INSTALL.md](INSTALL.md) for default users and how to customize them.

### Detailed Installation

For complete instructions (HTTPS, PWA, LAN access, backups), see [INSTALL.md](INSTALL.md)

---

## Project Structure

```
fameat/
├── backend/                    # Express + Prisma + PostgreSQL server
│   ├── prisma/
│   │   ├── schema.prisma       # Data model
│   │   ├── seed.ts             # Initial data
│   │   └── migrations/         # Database migrations
│   ├── src/
│   │   ├── modules/            # API modules
│   │   │   ├── products/       # Products
│   │   │   ├── sales/          # Sales
│   │   │   ├── inventory/      # Inventory
│   │   │   ├── cash/           # Cash register
│   │   │   ├── customers/      # Customers
│   │   │   ├── suppliers/      # Suppliers
│   │   │   └── ...             # Other modules
│   │   ├── jobs/               # Scheduled tasks (cron)
│   │   ├── scale/              # Scale integration
│   │   ├── pdf/                # PDF generation
│   │   └── realtime/           # Socket.IO
│   └── uploads/                # Images and files
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/              # 15 main pages
│   │   ├── components/         # Reusable components
│   │   ├── contexts/           # React Context (Auth, Theme, etc.)
│   │   ├── hooks/              # Custom hooks
│   │   └── api/                # API clients
│   └── public/                 # Static assets + PWA
│
├── scripts/                    # Utility scripts
├── drivers/                    # CH340 drivers (scale)
└── POS.bat                     # Windows launcher
```

---

## Code Examples

### API route with auth and validation

```typescript
// backend/src/modules/products/products.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { productSchema } from './products.schema';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { 
      category: true,
      batches: { where: { expiryDate: { gte: new Date() } } }
    },
    orderBy: { name: 'asc' }
  });
  res.json({ data: products });
});

router.post('/', 
  authenticate, 
  validate(productSchema),
  async (req, res) => {
    const product = await prisma.product.create({
      data: req.body,
      include: { category: true }
    });
    res.status(201).json({ data: product });
  }
);
```

### USB scale integration (the real differentiator)

```typescript
// backend/src/scale/scaleManager.ts
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';

export class ScaleManager extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;

  constructor(private config: { port: string; baudRate: number }) {
    super();
  }

  async connect(): Promise<void> {
    this.port = new SerialPort({
      path: this.config.port,
      baudRate: this.config.baudRate,
    });

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    this.parser.on('data', (data: string) => {
      const weight = this.parseWeight(data);
      if (weight !== null) {
        this.emit('weight', weight);
      }
    });
  }

  private parseWeight(data: string): number | null {
    const match = data.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  async tare(): Promise<void> {
    this.port?.write('T\r\n');
  }
}
```

> For more examples (AuthContext, POS component, etc.), check the source code directly in `backend/src/modules/` and `frontend/src/pages/`.

---

## Testing

Unit tests with **Vitest** — runs without database or external services.

```bash
cd backend
npm test                    # Run all tests
npm run test:watch          # Watch mode (development)
```

### Current coverage

| File | Tests | What it validates |
|------|-------|-------------------|
| `scale/scaleParser.ts` | 19 | Parsing 3 scale protocols (ST/US, =/+, raw numeric) |
| `modules/discounts/discountEngine.ts` | 14 | Discount rules: QUANTITY_THRESHOLD, PERCENTAGE, BUY_X_GET_Y, FIXED_AMOUNT, priority, expiration |
| `utils/businessDay.ts` | 19 | Business day logic (07:00-06:59), month/year boundaries, date parsing |
| `middleware/auth.ts` | 11 | JWT authenticate + authorize (valid, expired, roles) |
| `modules/sales/sales.schema.ts` | 10 | Zod validation for sales (items, payments, credit, defaults) |
| `modules/auth/auth.schema.ts` | 4 | Login validation (required fields) |

### Next tests to implement

| Module | Type | Priority |
|--------|------|----------|
| Inventory / Batches | Unit + Integration | High |
| Cash Register | Integration | Medium |
| Frontend (components) | E2E with Playwright | Low |

---

## Configuration

### Environment Variables (backend/.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fameat

# JWT
JWT_SECRET=your-secret-key-here

# Server port
PORT=3001

# Scale
SCALE_PORT=COM3
SCALE_BAUD_RATE=9600

# Backups
BACKUP_ENABLED=true
BACKUP_DIR=./backups
BACKUP_RETENTION=14
BACKUP_CRON="0 2 * * *"

# HTTPS (optional)
HTTPS=false
```

### Backups

```bash
npm run backup:run          # Manual backup
npm run backup:list         # List backups
npm run backup:restore <file>  # Restore
```

---

## Development

```bash
# Install dependencies
npm install

# Run in development (hot reload)
npm run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:5174
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Development with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Create initial data |

---

## Future Improvements

- [ ] **Automated tests** — Vitest + Playwright
- [ ] **Multi-store** — Support for multiple locations
- [ ] **Native mobile app** — React Native for iOS/Android
- [ ] **Payment gateways** — Stripe, MercadoPago integration
- [ ] **Offline mode** — Functionality without connection
- [ ] **Public API** — OpenAPI/Swagger documentation
- [ ] **Loyalty program** — Points and rewards system

---

## License

This project is under the MIT License. See [LICENSE](LICENSE) for more details.

---

<div align="center">

**Made with ❤️ by Zebkazz01**

[![GitHub](https://img.shields.io/badge/GitHub-Zebkazz01-181717?style=for-the-badge&logo=github)](https://github.com/Zebkazz01)

</div>
