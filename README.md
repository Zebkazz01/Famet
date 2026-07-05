<div align="center">

# 🥩 FAMEAT POS

### Sistema de Punto de Venta | Point of Sale System

![Version](https://img.shields.io/badge/version-1.3.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/node-20%2B-brightgreen?style=for-the-badge)
![React](https://img.shields.io/badge/react-19-61DAFB?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/typescript-5.8-3178C6?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/postgresql-14%2B-4169E1?style=for-the-badge)

**Punto de venta completo para carnicerías, restaurantes y negocios que manejan productos por peso.**

**Complete point of sale for butcher shops, restaurants, and businesses handling products by weight.**

[English](#english) | [Español](#español)

---

**Preview de la Aplicación / Application Preview**

![FAMEAT POS Preview](preview.png)

</div>

---

# Español

## 📋 Índice

1. [Descripción](#descripción)
2. [Características](#características)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Instalación](#instalación)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Funcionalidades](#funcionalidades)
7. [Ejemplos de Código](#ejemplos-de-código)
8. [Configuración](#configuración)
9. [Backups](#backups)
10. [Desarrollo](#desarrollo)
11. [Futuras Mejoras](#futuras-mejoras)
12. [Licencia](#licencia)

---

## Descripción

**FAMEAT POS** es un sistema completo de punto de venta diseñado específicamente para carnicerías, restaurantes y negocios que manejan productos por peso. Integra una balanza digital, gestión de inventario, ventas, caja, clientes con crédito, proveedores y reportes detallados.

El sistema funciona como una **PWA (Progressive Web App)** instalable en dispositivos móviles y de escritorio, permitiendo acceso desde cualquier dispositivo en la red local.

### ¿Para quién es?

- **Carnicerías**: Control de productos por peso con balanza digital
- **Restaurantes**: Gestión de inventario y ventas en tiempo real
- **Minimercados**: Control de stock, clientes y proveedores
- **Negocios de alimentos**: Seguimiento de vencimiento y lotes

---

## Características

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

---

## Stack Tecnológico

### Arquitectura

| Patrón | Descripción |
|--------|-------------|
| **Stack** | **PERN** (PostgreSQL, Express, React, Node.js) |
| **Patrón Backend** | **Arquitectura Modular** (controller + routes + schema por módulo) |
| **Patrón Frontend** | **Component-Based** (React Context + Custom Hooks + Pages) |
| **Monorepo** | npm workspaces (backend + frontend) |

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

### Backend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Runtime | Node.js | 20+ |
| Lenguaje | TypeScript | 5.8 |
| Framework | Express | 4.21 |
| ORM | Prisma | 6.5 |
| Base de Datos | PostgreSQL | 14+ |
| Autenticación | JWT (jsonwebtoken) | 9.0 |
| Real-time | Socket.IO | 4.8 |
| PDF | PDFKit | 0.16 |
| Balanza | Serialport | 12.0 |
| Validación | Zod | 3.24 |
| Excel | ExcelJS | 4.4 |

### Frontend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | 19.2 |
| Bundler | Vite | 7.3 |
| CSS | Tailwind CSS | 4.2 |
| Rutas | React Router DOM | 7.13 |
| HTTP Client | Axios | 1.13 |
| Gráficas | Recharts / ApexCharts | 3.7 / 5.13 |
| Iconos | Phosphor Icons | 2.1 |
| Notificaciones | React Hot Toast | 2.6 |
| Scanner | html5-qrcode / @zxing | 2.3 / 0.22 |

### Infraestructura

| Componente | Tecnología |
|------------|------------|
| Monorepo | npm workspaces |
| Versionado | standard-version |
| PWA | Service Worker + Manifest |
| HTTPS | mkcert (certificados locales) |
| Drivers | CH340 USB-Serial |

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
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Instalación Detallada

Para instrucciones completas, ver [INSTALL.md](INSTALL.md)

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
│   │   │   ├── categories/     # Categorías
│   │   │   ├── expenses/       # Gastos
│   │   │   ├── reports/        # Reportes
│   │   │   ├── notifications/  # Notificaciones
│   │   │   └── ...             # Otros módulos
│   │   ├── jobs/               # Tareas programadas (cron)
│   │   ├── cli/                # Herramientas de línea de comandos
│   │   ├── pdf/                # Generación de PDFs
│   │   ├── scale/              # Integración con balanza
│   │   └── realtime/           # Socket.IO
│   ├── uploads/                # Imágenes y archivos
│   └── .env                    # Variables de entorno
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/              # 15 páginas principales
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── ui/             # Botones, inputs, cards, etc.
│   │   │   ├── layout/         # Header, Sidebar, Footer
│   │   │   └── products/       # Componentes específicos
│   │   ├── contexts/           # React Context (Auth, Theme, etc.)
│   │   ├── hooks/              # Custom hooks
│   │   ├── api/                # Clientes API
│   │   ├── utils/              # Utilidades
│   │   └── pwa/                # PWA features
│   ├── public/                 # Assets estáticos
│   └── dist/                   # Build de producción
│
├── scripts/                    # Scripts de utilería
├── drivers/                    # Drivers CH340 (balanza)
├── POS.bat                     # Lanzador Windows
├── setup.ps1                   # Instalador Windows
└── setup.sh                    # Instalador Linux/Mac
```

---

## Funcionalidades

### Punto de Venta (POS)

El módulo principal permite realizar ventas de forma rápida e intuitiva:

- **Búsqueda de productos**: Por nombre, código de barras o categoría
- **Balanza integrada**: Peso en tiempo real desde la balanza USB
- **Carrito de compras**: Agregar, modificar cantidades, eliminar items
- **Múltiples formas de pago**: Efectivo, tarjeta, transferencia
- **Descuentos**: Automáticos por cantidad o manuales
- **Crédito a clientes**: Venta a crédito con seguimiento

```typescript
// Ejemplo: Conexión con balanza
const scale = new ScaleManager({
  port: process.env.SCALE_PORT || 'COM3',
  baudRate: parseInt(process.env.SCALE_BAUD_RATE || '9600')
});

scale.on('weight', (weight) => {
  // Actualizar peso en la UI en tiempo real
  io.emit('scale:weight', weight);
});
```

### Gestión de Inventario

Control completo del stock de productos:

- **Movimientos**: Entradas, salidas, ajustes, pérdidas, devoluciones
- **Lotes**: Seguimiento por lote con fechas de vencimiento
- **Alertas**: Notificaciones de stock bajo y productos próximos a vencer
- **Historial**: Registro completo de cada movimiento

### Sistema de Clientes

Gestión de clientes con sistema de crédito:

- **Crédito**: Límite de crédito por cliente
- **Pagos parciales**: Abonos con seguimiento FIFO
- **Descuentos**: Descuento porcentual por cliente
- **Historial**: Todas las ventas y pagos de cada cliente

### Proveedores y Órdenes de Compra

- **Catálogo de proveedores**: Datos de contacto y productos
- **Órdenes de compra**: Flujo DRAFT → SENT → RECEIVED
- **Recepción**: Genera movimiento de inventario automáticamente
- **Adjuntos**: Facturas escaneadas del proveedor

### Caja y Finanzas

- **Apertura/Cierre**: Control diario de caja
- **Movimientos**: Entradas y salidas con motivo
- **Arqueo**: Comparación entre esperado y real
- **Gastos**: Registro categorizado de gastos operativos

### Reportes

- **Ventas**: Por período, categoría, método de pago
- **Inventario**: Stock actual, valorización, rotación
- **Financieros**: Ingresos, gastos, utilidad neta
- **Excel**: Exportación a hojas de cálculo
- **PDFs**: Tickets y reportes detallados

---

## Ejemplos de Código

### Backend - Ruta API con Autenticación

```typescript
// backend/src/modules/products/products.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { productSchema } from './products.schema';

const router = Router();

// GET /api/products - Listar productos activos
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

// POST /api/products - Crear producto
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

### Frontend - Componente React

```tsx
// frontend/src/pages/POSPage.tsx
import { useState } from 'react';
import { useScale } from '../contexts/ScaleContext';
import { useCart } from '../hooks/useCart';
import { ProductSearch } from '../components/products/ProductSearch';
import { CartTable } from '../components/CartTable';
import { PaymentModal } from '../components/PaymentModal';

export function POSPage() {
  const { weight, isConnected } = useScale();
  const { cart, addItem, removeItem, total } = useCart();
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="flex h-full">
      {/* Panel izquierdo: Productos */}
      <div className="flex-1 p-4">
        <ProductSearch onSelect={addItem} />
        
        {/* Indicador de balanza */}
        {isConnected && (
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <span className="text-green-700">
              ⚖️ Peso: {weight.toFixed(3)} kg
            </span>
          </div>
        )}
      </div>

      {/* Panel derecho: Carrito */}
      <div className="w-96 border-l bg-gray-50 p-4">
        <CartTable items={cart} onRemove={removeItem} />
        
        <div className="mt-4 text-right">
          <p className="text-2xl font-bold">Total: ${total.toFixed(2)}</p>
          <button 
            onClick={() => setShowPayment(true)}
            className="mt-2 w-full bg-green-600 text-white py-3 rounded-lg"
          >
            Cobrar
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal 
          total={total} 
          onClose={() => setShowPayment(false)} 
        />
      )}
    </div>
  );
}
```

### Integración con Balanza

```typescript
// backend/src/scale/scaleManager.ts
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';

export class ScaleManager extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private currentWeight: number = 0;

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
      // Protocolo de balanza: extraer peso del string
      const weight = this.parseWeight(data);
      if (weight !== null) {
        this.currentWeight = weight;
        this.emit('weight', weight);
      }
    });

    this.emit('connected');
  }

  private parseWeight(data: string): number | null {
    // Ejemplo: "ST,GS,   0.123,kg" → 0.123
    const match = data.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  async tare(): Promise<void> {
    // Enviar comando de tare a la balanza
    this.port?.write('T\r\n');
  }

  disconnect(): void {
    this.port?.close();
    this.emit('disconnected');
  }
}
```

### Context de Autenticación

```typescript
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'VENDEDOR';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verificar token y obtener usuario
      fetchUser();
    }
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = {
      ADMIN: ['*'],
      SUPERVISOR: ['products:read', 'products:write', 'sales:read', 'inventory:write'],
      VENDEDOR: ['pos:use', 'sales:read'],
    };
    return permissions[user.role]?.includes(permission) || 
           permissions[user.role]?.includes('*');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout: () => {}, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}
```

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

### Configuración de la Balanza

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `SCALE_PORT` | COM3 | Puerto COM de la balanza |
| `SCALE_BAUD_RATE` | 9600 | Velocidad de transmisión |
| `SCALE_ENABLED` | true | Habilitar/deshabilitar balanza |

---

## Backups

### Configuración

```env
BACKUP_ENABLED=true
BACKUP_DIR=./backups
BACKUP_RETENTION=14
BACKUP_CRON="0 2 * * *"
```

### Comandos

```bash
# Backup manual
npm run backup:run

# Listar backups
npm run backup:list

# Restaurar backup
npm run backup:restore archivo.dump

# Restaurar con limpieza previa
npm run backup:restore archivo.dump --clean
```

### Desde la UI

Los usuarios ADMIN pueden gestionar backups desde **Menú → Backups**.

---

## Desarrollo

### Modo Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo (hot reload)
npm run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:5174
```

### Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con hot reload |
| `npm run build` | Compilar para producción |
| `npm start` | Iniciar servidor producción |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run db:seed` | Crear datos iniciales |
| `npm run db:migrate:deploy` | Aplicar migraciones |
| `npm run backup:run` | Backup manual |

### Base de Datos

```bash
# Crear migración
npx prisma migrate dev --name nombre-migracion

# Aplicar migraciones
npx prisma migrate deploy

# Regenerar cliente Prisma
npx prisma generate

# Abrir Prisma Studio
npx prisma studio
```

---

## Futuras Mejoras

- [ ] **CRM Completo**: Gestión avanzada de clientes con historial de compras
- [ ] **Multi-sucursal**: Soporte para múltiples tiendas
- [ ] **App Móvil Nativa**: React Native para iOS/Android
- [ ] **Pasarelas de Pago**: Integración con Stripe, MercadoPago
- [ ] **Analytics Avanzado**: Dashboard con IA predictiva
- [ ] **API Pública**: Documentación OpenAPI/Swagger
- [ ] **Modo Offline**: Funcionamiento sin conexión
- [ ] **Etiquetas de Precio**: Impresión directa
- [ ] **Recetas**: Gestión de recetas con ingredientes
- [ ] **Fidelización**: Programa de puntos y recompensas

---

## Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

# English

## 📋 Table of Contents

1. [Description](#description-1)
2. [Features](#features-1)
3. [Tech Stack](#tech-stack-1)
4. [Installation](#installation-1)
5. [Project Structure](#project-structure-1)
6. [Functionalities](#functionalities-1)
7. [Code Examples](#code-examples-1)
8. [Configuration](#configuration-1)
9. [Backups](#backups-1)
10. [Development](#development-1)
11. [Future Improvements](#future-improvements-1)
12. [License](#license-1)

---

## Description

**FAMEAT POS** is a complete point of sale system designed specifically for butcher shops, restaurants, and businesses handling products by weight. It integrates a digital scale, inventory management, sales, cash register, customer credit, suppliers, and detailed reports.

The system works as an installable **PWA (Progressive Web App)** on mobile and desktop devices, allowing access from any device on the local network.

### Who is it for?

- **Butcher shops**: Product control by weight with digital scale
- **Restaurants**: Real-time inventory and sales management
- **Convenience stores**: Stock, customer, and supplier control
- **Food businesses**: Expiration and batch tracking

---

## Features

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

---

## Tech Stack

### Architecture

| Pattern | Description |
|---------|-------------|
| **Stack** | **PERN** (PostgreSQL, Express, React, Node.js) |
| **Backend Pattern** | **Modular Architecture** (controller + routes + schema per module) |
| **Frontend Pattern** | **Component-Based** (React Context + Custom Hooks + Pages) |
| **Monorepo** | npm workspaces (backend + frontend) |

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

### Backend

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5.8 |
| Framework | Express | 4.21 |
| ORM | Prisma | 6.5 |
| Database | PostgreSQL | 14+ |
| Auth | JWT (jsonwebtoken) | 9.0 |
| Real-time | Socket.IO | 4.8 |
| PDF | PDFKit | 0.16 |
| Scale | Serialport | 12.0 |
| Validation | Zod | 3.24 |
| Excel | ExcelJS | 4.4 |

### Frontend

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 19.2 |
| Bundler | Vite | 7.3 |
| CSS | Tailwind CSS | 4.2 |
| Routes | React Router DOM | 7.13 |
| HTTP Client | Axios | 1.13 |
| Charts | Recharts / ApexCharts | 3.7 / 5.13 |
| Icons | Phosphor Icons | 2.1 |
| Notifications | React Hot Toast | 2.6 |
| Scanner | html5-qrcode / @zxing | 2.3 / 0.22 |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Monorepo | npm workspaces |
| Versioning | standard-version |
| PWA | Service Worker + Manifest |
| HTTPS | mkcert (local certificates) |
| Drivers | CH340 USB-Serial |

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
- **Username**: `admin`
- **Password**: `admin123`

### Detailed Installation

For complete instructions, see [INSTALL.md](INSTALL.md)

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
│   │   │   ├── categories/     # Categories
│   │   │   ├── expenses/       # Expenses
│   │   │   ├── reports/        # Reports
│   │   │   ├── notifications/  # Notifications
│   │   │   └── ...             # Other modules
│   │   ├── jobs/               # Scheduled tasks (cron)
│   │   ├── cli/                # Command line tools
│   │   ├── pdf/                # PDF generation
│   │   ├── scale/              # Scale integration
│   │   └── realtime/           # Socket.IO
│   ├── uploads/                # Images and files
│   └── .env                    # Environment variables
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/              # 15 main pages
│   │   ├── components/         # Reusable components
│   │   │   ├── ui/             # Buttons, inputs, cards, etc.
│   │   │   ├── layout/         # Header, Sidebar, Footer
│   │   │   └── products/       # Specific components
│   │   ├── contexts/           # React Context (Auth, Theme, etc.)
│   │   ├── hooks/              # Custom hooks
│   │   ├── api/                # API clients
│   │   ├── utils/              # Utilities
│   │   └── pwa/                # PWA features
│   ├── public/                 # Static assets
│   └── dist/                   # Production build
│
├── scripts/                    # Utility scripts
├── drivers/                    # CH340 drivers (scale)
├── POS.bat                     # Windows launcher
├── setup.ps1                   # Windows installer
└── setup.sh                    # Linux/Mac installer
```

---

## Functionalities

### Point of Sale (POS)

The main module allows quick and intuitive sales:

- **Product search**: By name, barcode, or category
- **Integrated scale**: Real-time weight from USB scale
- **Shopping cart**: Add, modify quantities, remove items
- **Multiple payment methods**: Cash, card, transfer
- **Discounts**: Automatic by quantity or manual
- **Customer credit**: Credit sales with tracking

```typescript
// Example: Scale connection
const scale = new ScaleManager({
  port: process.env.SCALE_PORT || 'COM3',
  baudRate: parseInt(process.env.SCALE_BAUD_RATE || '9600')
});

scale.on('weight', (weight) => {
  // Update weight in UI in real-time
  io.emit('scale:weight', weight);
});
```

### Inventory Management

Complete stock control:

- **Movements**: Entries, exits, adjustments, losses, returns
- **Batches**: Batch tracking with expiration dates
- **Alerts**: Low stock and expiring product notifications
- **History**: Complete record of each movement

### Customer System

Customer management with credit system:

- **Credit**: Credit limit per customer
- **Partial payments**: Installments with FIFO tracking
- **Discounts**: Percentage discount per customer
- **History**: All sales and payments for each customer

### Suppliers and Purchase Orders

- **Supplier catalog**: Contact information and products
- **Purchase orders**: DRAFT → SENT → RECEIVED workflow
- **Receiving**: Automatically generates inventory movement
- **Attachments**: Supplier invoices (scanned)

### Cash and Finance

- **Opening/Closing**: Daily cash control
- **Movements**: Income and expenses with reason
- **Reconciliation**: Expected vs actual comparison
- **Expenses**: Categorized operational expense tracking

### Reports

- **Sales**: By period, category, payment method
- **Inventory**: Current stock, valuation, rotation
- **Financial**: Income, expenses, net profit
- **Excel**: Export to spreadsheets
- **PDFs**: Tickets and detailed reports

---

## Code Examples

### Backend - API Route with Authentication

```typescript
// backend/src/modules/products/products.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { productSchema } from './products.schema';

const router = Router();

// GET /api/products - List active products
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

// POST /api/products - Create product
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

### Frontend - React Component

```tsx
// frontend/src/pages/POSPage.tsx
import { useState } from 'react';
import { useScale } from '../contexts/ScaleContext';
import { useCart } from '../hooks/useCart';
import { ProductSearch } from '../components/products/ProductSearch';
import { CartTable } from '../components/CartTable';
import { PaymentModal } from '../components/PaymentModal';

export function POSPage() {
  const { weight, isConnected } = useScale();
  const { cart, addItem, removeItem, total } = useCart();
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="flex h-full">
      {/* Left panel: Products */}
      <div className="flex-1 p-4">
        <ProductSearch onSelect={addItem} />
        
        {/* Scale indicator */}
        {isConnected && (
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <span className="text-green-700">
              ⚖️ Weight: {weight.toFixed(3)} kg
            </span>
          </div>
        )}
      </div>

      {/* Right panel: Cart */}
      <div className="w-96 border-l bg-gray-50 p-4">
        <CartTable items={cart} onRemove={removeItem} />
        
        <div className="mt-4 text-right">
          <p className="text-2xl font-bold">Total: ${total.toFixed(2)}</p>
          <button 
            onClick={() => setShowPayment(true)}
            className="mt-2 w-full bg-green-600 text-white py-3 rounded-lg"
          >
            Checkout
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal 
          total={total} 
          onClose={() => setShowPayment(false)} 
        />
      )}
    </div>
  );
}
```

### Scale Integration

```typescript
// backend/src/scale/scaleManager.ts
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';

export class ScaleManager extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private currentWeight: number = 0;

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
      // Scale protocol: extract weight from string
      const weight = this.parseWeight(data);
      if (weight !== null) {
        this.currentWeight = weight;
        this.emit('weight', weight);
      }
    });

    this.emit('connected');
  }

  private parseWeight(data: string): number | null {
    // Example: "ST,GS,   0.123,kg" → 0.123
    const match = data.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  async tare(): Promise<void> {
    // Send tare command to scale
    this.port?.write('T\r\n');
  }

  disconnect(): void {
    this.port?.close();
    this.emit('disconnected');
  }
}
```

### Authentication Context

```typescript
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'VENDEDOR';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user
      fetchUser();
    }
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = {
      ADMIN: ['*'],
      SUPERVISOR: ['products:read', 'products:write', 'sales:read', 'inventory:write'],
      VENDEDOR: ['pos:use', 'sales:read'],
    };
    return permissions[user.role]?.includes(permission) || 
           permissions[user.role]?.includes('*');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout: () => {}, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}
```

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

### Scale Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `SCALE_PORT` | COM3 | Scale COM port |
| `SCALE_BAUD_RATE` | 9600 | Transmission speed |
| `SCALE_ENABLED` | true | Enable/disable scale |

---

## Backups

### Configuration

```env
BACKUP_ENABLED=true
BACKUP_DIR=./backups
BACKUP_RETENTION=14
BACKUP_CRON="0 2 * * *"
```

### Commands

```bash
# Manual backup
npm run backup:run

# List backups
npm run backup:list

# Restore backup
npm run backup:restore file.dump

# Restore with cleanup
npm run backup:restore file.dump --clean
```

### From the UI

ADMIN users can manage backups from **Menu → Backups**.

---

## Development

### Development Mode

```bash
# Install dependencies
npm install

# Run in development (hot reload)
npm run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:5174
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Create initial data |
| `npm run db:migrate:deploy` | Apply migrations |
| `npm run backup:run` | Manual backup |

### Database

```bash
# Create migration
npx prisma migrate dev --name migration-name

# Apply migrations
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

---

## Future Improvements

- [ ] **Complete CRM**: Advanced customer management with purchase history
- [ ] **Multi-store**: Support for multiple locations
- [ ] **Native Mobile App**: React Native for iOS/Android
- [ ] **Payment Gateways**: Stripe, MercadoPago integration
- [ ] **Advanced Analytics**: AI-powered predictive dashboard
- [ ] **Public API**: OpenAPI/Swagger documentation
- [ ] **Offline Mode**: Functionality without connection
- [ ] **Price Labels**: Direct printing
- [ ] **Recipes**: Recipe management with ingredients
- [ ] **Loyalty Program**: Points and rewards system

---

## License

This project is under the MIT License. See [LICENSE](LICENSE) for more details.

---

<div align="center">

**Made with ❤️ by Zebkazz01**

[![GitHub](https://img.shields.io/badge/GitHub-Zebkazz01-181717?style=for-the-badge&logo=github)](https://github.com/Zebkazz01)

</div>
