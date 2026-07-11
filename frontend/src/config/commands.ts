import type { ComponentType } from 'react';
import {
  Storefront, ChartLineUp, Package, ClipboardText, ChartBar, CurrencyDollar,
  GearSix, Truck, Bell, Plus, Lock, Receipt, ChartPieSlice, Calendar, Tag,
  MagnifyingGlass, FileArrowDown, Folder, Barcode, Users, Scales, ListChecks,
  Question, ShoppingCart, Trash, UsersThree, ClipboardText as ClipboardTextIcon,
  Database, FloppyDisk, HandCoins, PaintBucket,
} from '@phosphor-icons/react';

export type Role = 'ADMIN' | 'SUPERVISOR' | 'VENDEDOR';

export interface Command {
  id: string;
  label: string;
  /** Palabras alternativas para fuzzy match */
  keywords: string[];
  /** Sección visual */
  section: 'module' | 'action';
  /** Ruta destino */
  route: string;
  /** Query string opcional (sin ?) */
  query?: string;
  /** Hash opcional (sin #) */
  hash?: string;
  /** Icono Phosphor */
  icon: ComponentType<{ size?: number; weight?: 'duotone'; className?: string }>;
  /** Roles que pueden ver/ejecutar el comando */
  roles: Role[];
}

export const COMMANDS: Command[] = [
  // ====== Módulos ======
  { id: 'pos', label: 'Punto de Venta', keywords: ['pos', 'venta', 'caja', 'cobrar', 'vender', 'cobrar'], section: 'module', route: '/', icon: Storefront, roles: ['ADMIN', 'VENDEDOR'] },
  { id: 'dashboard', label: 'Dashboard', keywords: ['inicio', 'kpis', 'metricas', 'resumen', 'home'], section: 'module', route: '/dashboard', icon: ChartLineUp, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'products', label: 'Productos', keywords: ['catalogo', 'articulos', 'items', 'producto'], section: 'module', route: '/products', icon: Package, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'categories', label: 'Categorías', keywords: ['categoria', 'grupos', 'clases', 'tipos'], section: 'module', route: '/categories', icon: Folder, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'inventory', label: 'Inventario', keywords: ['stock', 'existencias', 'movimientos', 'almacen'], section: 'module', route: '/inventory', icon: ClipboardText, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'sales', label: 'Historial de Ventas', keywords: ['ventas', 'tickets', 'facturas', 'historial'], section: 'module', route: '/sales', icon: ChartBar, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { id: 'cash', label: 'Caja', keywords: ['cash', 'efectivo', 'movimientos', 'cierre', 'arqueo'], section: 'module', route: '/cash', icon: CurrencyDollar, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { id: 'customers', label: 'Clientes', keywords: ['cliente', 'customer', 'credito', 'deuda', 'abono', 'descuento'], section: 'module', route: '/customers', icon: UsersThree, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { id: 'suppliers', label: 'Proveedores', keywords: ['proveedor', 'compras', 'distribuidor', 'vendor'], section: 'module', route: '/suppliers', icon: Truck, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'purchase-orders', label: 'Órdenes de Compra', keywords: ['orden', 'compra', 'pedido', 'proveedor', 'recepcion', 'po'], section: 'module', route: '/purchase-orders', icon: ClipboardTextIcon, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'processing', label: 'Procesamiento / Desposte', keywords: ['procesamiento', 'desposte', 'corte', 'carne', 'res', 'cerdo', 'animal', 'procesar'], section: 'module', route: '/processing', icon: ClipboardTextIcon, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'expenses', label: 'Gastos', keywords: ['expense', 'egresos', 'compras', 'pagos', 'gasto'], section: 'module', route: '/expenses', icon: Receipt, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { id: 'reports', label: 'Reportes', keywords: ['reporte', 'pdf', 'excel', 'estado de resultados', 'analytics'], section: 'module', route: '/reports', icon: ChartPieSlice, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'notifications', label: 'Notificaciones', keywords: ['alertas', 'avisos', 'campana', 'mensajes', 'bell'], section: 'module', route: '/notifications', icon: Bell, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { id: 'backups', label: 'Backups', keywords: ['backup', 'respaldo', 'copia', 'restaurar', 'database', 'bd'], section: 'module', route: '/backups', icon: Database, roles: ['ADMIN'] },
  { id: 'settings', label: 'Configuración', keywords: ['ajustes', 'preferencias', 'negocio', 'balanza', 'config'], section: 'module', route: '/settings', icon: GearSix, roles: ['ADMIN'] },

  // ====== Acciones rápidas — Productos / Inventario ======
  { id: 'product-new', label: 'Agregar producto', keywords: ['nuevo', 'crear', 'producto', 'item'], section: 'action', route: '/products', query: 'new=1', icon: Plus, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'category-new', label: 'Crear categoría', keywords: ['nueva', 'agregar', 'categoria', 'grupo'], section: 'action', route: '/categories', query: 'new=1', icon: Plus, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'inventory-entry', label: 'Registrar entrada de inventario', keywords: ['entrada', 'compra', 'recepcion', 'stock', 'ingreso'], section: 'action', route: '/inventory', query: 'action=entry', icon: Plus, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'inventory-loss', label: 'Registrar merma / pérdida', keywords: ['merma', 'perdida', 'baja', 'descartar'], section: 'action', route: '/inventory', query: 'action=loss', icon: Trash, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'inventory-adjust', label: 'Ajuste de inventario', keywords: ['ajuste', 'corregir', 'stock'], section: 'action', route: '/inventory', query: 'action=adjustment', icon: ListChecks, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'inventory-alerts', label: 'Ver alertas de stock bajo', keywords: ['stock bajo', 'alertas', 'inventario'], section: 'action', route: '/inventory', hash: 'alerts', icon: Bell, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'barcode-scan', label: 'Escanear código de barras', keywords: ['barcode', 'scanner', 'escanear', 'codigo'], section: 'action', route: '/', query: 'action=scan', icon: Barcode, roles: ['ADMIN', 'VENDEDOR'] },

  // ====== Acciones rápidas — Ventas / POS ======
  { id: 'sale-new', label: 'Nueva venta', keywords: ['venta', 'cobrar', 'pos', 'nueva'], section: 'action', route: '/', icon: ShoppingCart, roles: ['ADMIN', 'VENDEDOR'] },
  { id: 'export-sales', label: 'Exportar reporte de ventas', keywords: ['exportar', 'descargar', 'pdf', 'excel', 'ventas'], section: 'action', route: '/reports', hash: 'sales', icon: FileArrowDown, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'export-expenses', label: 'Exportar reporte de gastos', keywords: ['exportar', 'descargar', 'pdf', 'excel', 'gastos'], section: 'action', route: '/reports', hash: 'expenses', icon: FileArrowDown, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'monthly-statement', label: 'Cierre mensual', keywords: ['cierre', 'mes', 'estado', 'resultados'], section: 'action', route: '/reports', hash: 'monthly', icon: Calendar, roles: ['ADMIN', 'SUPERVISOR'] },

  // ====== Acciones rápidas — Caja ======
  { id: 'cash-in', label: 'Entrada de caja', keywords: ['ingreso', 'caja', 'efectivo', 'cash-in'], section: 'action', route: '/cash', query: 'action=in', icon: Plus, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { id: 'cash-out', label: 'Salida de caja', keywords: ['salida', 'gasto', 'caja', 'cash-out'], section: 'action', route: '/cash', query: 'action=out', icon: Plus, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { id: 'cash-close', label: 'Cierre de caja', keywords: ['cerrar', 'cuadre', 'arqueo'], section: 'action', route: '/cash', hash: 'close', icon: Lock, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },

  // ====== Acciones rápidas — Clientes ======
  { id: 'customer-new', label: 'Crear cliente', keywords: ['nuevo', 'cliente', 'agregar', 'registrar'], section: 'action', route: '/customers', query: 'new=1', icon: Plus, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'customers-debt', label: 'Ver clientes con deuda', keywords: ['deuda', 'cartera', 'credito', 'pendiente', 'cobranza'], section: 'action', route: '/customers', query: 'filter=debt', icon: HandCoins, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },

  // ====== Acciones rápidas — Proveedores / Gastos ======
  { id: 'supplier-new', label: 'Crear proveedor', keywords: ['nuevo', 'proveedor', 'agregar'], section: 'action', route: '/suppliers', query: 'new=1', icon: Plus, roles: ['ADMIN', 'SUPERVISOR'] },
  { id: 'expense-new', label: 'Registrar gasto', keywords: ['nuevo', 'gasto', 'agregar', 'compra'], section: 'action', route: '/expenses', query: 'new=1', icon: Plus, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { id: 'purchase-order-new', label: 'Crear orden de compra', keywords: ['nueva', 'orden', 'compra', 'pedido', 'proveedor'], section: 'action', route: '/purchase-orders', query: 'new=1', icon: Plus, roles: ['ADMIN', 'SUPERVISOR'] },

  // ====== Acciones rápidas — Backups ======
  { id: 'backup-new', label: 'Crear backup ahora', keywords: ['backup', 'respaldo', 'guardar', 'copia', 'database'], section: 'action', route: '/backups', query: 'action=run', icon: FloppyDisk, roles: ['ADMIN'] },

  // ====== Acciones rápidas — Configuración ======
  { id: 'config-logo', label: 'Cambiar logo del negocio', keywords: ['logo', 'imagen', 'marca', 'negocio'], section: 'action', route: '/settings', hash: 'business', icon: Tag, roles: ['ADMIN'] },
  { id: 'config-expiry', label: 'Configurar alertas de vencimiento', keywords: ['vencimiento', 'caducidad', 'alertas'], section: 'action', route: '/settings', hash: 'expiry', icon: Calendar, roles: ['ADMIN'] },
  { id: 'config-scale', label: 'Configurar balanza', keywords: ['balanza', 'puerto', 'serial', 'baud', 'rs232'], section: 'action', route: '/settings', hash: 'scale', icon: Scales, roles: ['ADMIN'] },
  { id: 'config-menu', label: 'Reordenar menú lateral', keywords: ['menu', 'orden', 'sidebar', 'navegacion'], section: 'action', route: '/settings', hash: 'menu', icon: ListChecks, roles: ['ADMIN'] },
  { id: 'config-users', label: 'Gestionar usuarios', keywords: ['usuarios', 'crear usuario', 'permisos', 'roles'], section: 'action', route: '/settings', hash: 'users', icon: Users, roles: ['ADMIN'] },
  { id: 'config-accent', label: 'Cambiar color de acento', keywords: ['color', 'acento', 'tema', 'paleta', 'marca', 'apariencia'], section: 'action', route: '/settings', hash: 'business', icon: PaintBucket, roles: ['ADMIN'] },

  // ====== Notificaciones ======
  { id: 'notifications-mark-all', label: 'Marcar todas las notificaciones como leídas', keywords: ['alertas', 'avisos', 'limpiar', 'marcar'], section: 'action', route: '/notifications', icon: Bell, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },

  // ====== Ayuda ======
  { id: 'help-tour', label: 'Abrir tutorial guiado', keywords: ['ayuda', 'tour', 'tutorial', 'guia'], section: 'action', route: window.location.pathname, query: 'tour=1', icon: Question, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
];

export { MagnifyingGlass };
