# FAMEAT POS - Guia de Implementacion PWA

## Arquitectura

```
fameat/
├── backend/          Express + Socket.IO + Prisma + PostgreSQL
│   ├── src/modules/  auth, users, products, sales, inventory, cash, dashboard, suppliers, tickets
│   ├── prisma/       schema + migraciones
│   └── uploads/      imagenes productos + logo negocio
├── frontend/         React 19 + Vite 7 + Tailwind CSS v4
│   ├── src/
│   │   ├── api/          cliente axios con interceptores
│   │   ├── components/   ViewToggle, StatsCards, CurrencyInput, ConfirmModal, Portal, PageSkeleton, SetupBanner
│   │   ├── contexts/     Auth, Scale, Panel, Config, Theme, Notification
│   │   ├── hooks/        useTour, useSystemDiagnostic
│   │   ├── pages/        POS, Products, Inventory, Sales, Cash, Dashboard, Suppliers, Settings, Login
│   │   └── pwa/          InstallBanner, registerSW, useInstallPrompt
│   ├── public/       manifest.json, sw.js, iconos PWA
│   └── plugins/      banner.ts (Vite plugin)
```

## Stack Tecnico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS v4 |
| Backend | Express, Socket.IO, Prisma ORM |
| Base de datos | PostgreSQL |
| Comunicacion serial | serialport v12 (balanza) |
| PWA | Service Worker, manifest.json, mkcert HTTPS |
| Iconos | @phosphor-icons/react |
| Tour guiado | driver.js |
| Graficos | Recharts |

## Funcionalidades Implementadas

### Punto de Venta (POS)
- Multi-carrito: hasta 5 carritos simultaneos con tabs
- Drag & drop de productos entre carritos
- Busqueda con dropdown de sugerencias (imagen, precio, stock)
- Venta por peso (balanza o manual), unidad, sub-unidad (ej: huevos)
- Equivalencias de peso: kg, lb, arroba (@) simultaneas
- Ventas recientes: cargar venta en carrito para edicion
- Edicion de ventas: validacion stock, diferencia cobrar/devolver, motivo obligatorio
- No duplica ventas al editar (PUT en vez de POST)
- Carrito con memoria (persiste al recargar)

### Productos
- CRUD con imagen, proveedor, sub-unidades, unidad de peso (kg/lb/@)
- Historial de precios con badges subio/bajo e indicador ACTUAL/INICIAL
- Costo unitario o costo total del lote (calculo automatico)
- Reactivar productos inactivos
- Vista imagen completa en modal

### Inventario
- Movimientos con detalle completo (modal)
- Alertas de stock bajo con badge en sidebar (tiempo real, polling 30s)
- Boton "Llenar stock" navega a edicion del producto
- Tab persistente (Movimientos/Alertas)

### Proveedores
- CRUD completo con NIT, telefono, email, direccion, ciudad, notas
- Productos asociados por proveedor

### Ventas
- Historial con filtro de fechas
- Detalle de venta con items
- Correccion de ventas con motivo
- Descarga de ticket

### Caja
- Movimientos de entrada/salida
- Cierres de caja con diferencia esperado vs real

### Dashboard
- KPIs: ventas, ingresos, ticket promedio, comparacion dia anterior
- Desglose por metodo de pago

### Configuracion
- Balanza: conectar/desconectar, puerto, baud rate
- Procesamiento: sensibilidad, filtros, tare
- Negocio: nombre, direccion, telefono, logo
- Menu: reordenar opciones (personal o global)

## Sistema de Temas

- Claro/oscuro con toggle animado
- PC: animacion circular (View Transitions API)
- Movil: fade suave
- Barra de estado del dispositivo cambia con tema
- meta theme-color dinamico
- Persistencia en localStorage
- CSS dark mode con @custom-variant y overrides globales

## PWA

### Instalacion
- HTTPS con mkcert (certificados trusted)
- Android: prompt nativo `beforeinstallprompt`
- iOS: guia paso a paso con bottom-sheet
- Banner de instalacion con dismiss permanente

### Service Worker
- Auto-actualizacion al detectar nueva version
- Polling cada 30s para updates
- Recarga automatica al activar nuevo SW

### Manifest
- display: standalone
- orientation: any
- Shortcuts: POS, Dashboard
- Iconos: any + maskable (96-512px)

### Logo Personalizado
- Subir logo en Configuracion > Negocio
- Se usa en: Sidebar, Login, InstallBanner
- Endpoint: POST /api/config/logo

## Componentes Reutilizables

### ViewToggle
- Vista tabla/tarjetas con toggle
- Busqueda con X para limpiar
- Paginacion
- Imagen en tarjetas (cardImage)
- Empty state con banner y boton crear
- Acciones en primera columna en movil
- onCreateNew callback

### StatsCards
- 4 tarjetas de estadisticas por vista
- Colapsable en movil con memoria
- Soporte campo sub opcional

### CurrencyInput
- Formateo de millares automatico (ej: 15.000)
- Prefijo $ con inputMode numeric
- Valor raw para calculos

### ConfirmModal
- Variantes: danger, warning, info
- Iconos en botones
- X para cerrar
- Portal para z-index correcto

### PageSkeleton
- 4 variantes: table, cards, dashboard, pos
- Bones con animate-pulse adaptado a tema
- Responsive PC/movil

### Portal
- createPortal al body
- Evita stacking context del layout
- Usado en todos los modales

## Notificaciones en Tiempo Real

- NotificationContext centralizado
- Polling /inventory/alerts cada 30s
- Evento 'stock-changed' para refresh inmediato post-venta
- Badges reactivos en sidebar: Inventario (rojo), POS carritos (azul)
- Solo fetch si hay token (previene loop 401)

## Tutorial Guiado (driver.js)

- Boton ? en header
- Tour contextual por pagina
- POS: 13 pasos con apertura/cierre de sidebar y carrito
- Cada seccion: 2-3 pasos con descripciones detalladas

## Seguridad

- JWT con interceptor axios
- Roles: ADMIN, SUPERVISOR, VENDEDOR
- Proteccion de rutas frontend (ProtectedRoute)
- Middleware authorize() en backend
- VENDEDOR solo ve sus propias ventas

## Red Local

- IP estatica: 192.168.100.7
- HTTPS con mkcert (certificado trusted)
- Acceso movil: https://192.168.100.7:5174
- CA root disponible en /rootCA.pem para instalar en dispositivos

## Comandos

```bash
# Desarrollo
npm run dev              # Backend + Frontend (HTTP)
npm run dev:https        # Frontend HTTPS (para PWA en movil)
npm run dev:backend      # Solo backend
npm run dev:frontend     # Solo frontend

# Base de datos
npm run db:migrate       # Ejecutar migraciones
npm run db:seed          # Datos iniciales
npm run db:studio        # Prisma Studio

# Release
npm run release          # Patch version
npm run release:minor    # Minor version
npm run release:major    # Major version
```

## Usuarios Default

| Usuario | Password | Rol |
|---------|----------|-----|
| admin | admin123 | ADMIN |
| supervisor1 | super123 | SUPERVISOR |
| cajero1 | cajero123 | VENDEDOR |
