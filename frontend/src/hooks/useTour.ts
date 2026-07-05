import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanel } from '../contexts/PanelContext';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

const toursByRoute: Record<string, (ctx: { openSidebar: () => void; closeSidebar: () => void; openCart: () => void; closeCart: () => void }) => DriveStep[]> = {
  '/': ({ openSidebar, closeSidebar, openCart, closeCart }) => {
    const dark = document.documentElement.classList.contains('dark');
    const s = dark ? {
      prod: 'background:#1e3a5f; border-color:#3b82f6;',
      prodH: 'color:#93c5fd;',
      cart: 'background:#064e3b; border-color:#10b981;',
      cartH: 'color:#6ee7b7;',
      modal: 'background:#3a1a00; border-color:#f59e0b;',
      modalH: 'color:#fcd34d;',
      gen: 'background:#1e293b; border-color:#475569;',
      genH: 'color:#cbd5e1;',
      grpTxt: 'color:#e2e8f0;',
      kbd: 'background:#0f172a; color:#e2e8f0;',
      tip: 'color:#94a3b8;',
    } : {
      prod: 'background:#eff6ff; border-color:#3b82f6;',
      prodH: 'color:#1d4ed8;',
      cart: 'background:#ecfdf5; border-color:#10b981;',
      cartH: 'color:#047857;',
      modal: 'background:#fef3c7; border-color:#f59e0b;',
      modalH: 'color:#b45309;',
      gen: 'background:#f3f4f6; border-color:#6b7280;',
      genH: 'color:#374151;',
      grpTxt: 'color:#374151;',
      kbd: 'background:#1f2937; color:#fff;',
      tip: 'color:#6b7280;',
    };
    return [
    {
      popover: {
        title: 'Atajos rápidos de teclado',
        description: `
          <style>
            .ft-grp { border-radius:8px; padding:8px 10px; margin-bottom:8px; border-left:4px solid; }
            .ft-grp h4 { margin:0 0 6px 0; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
            .ft-grp .row { display:flex; justify-content:space-between; font-size:12px; line-height:1.7; ${s.grpTxt} }
            .ft-grp kbd { ${s.kbd} padding:2px 6px; border-radius:4px; font-size:11px; font-family:monospace; box-shadow:0 1px 0 rgba(0,0,0,.2); }
            .ft-tip { font-size:10px; margin-top:4px; font-style:italic; ${s.tip} }
          </style>
          <div style="text-align:left; max-width:420px">
            <div class="ft-grp" style="${s.prod}">
              <h4 style="${s.prodH}">Interfaz de productos</h4>
              <div class="row"><span>Enfocar buscador</span><span><kbd>/</kbd> · <kbd>Alt+B</kbd></span></div>
              <div class="row"><span>Abrir scanner barcode</span><span><kbd>.</kbd> · <kbd>Alt+S</kbd></span></div>
              <div class="row"><span>Tarar balanza</span><span><kbd>,</kbd> · <kbd>Alt+T</kbd></span></div>
              <div class="row"><span>Navegar resultados (foco buscador)</span><span><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></span></div>
            </div>

            <div class="ft-grp" style="${s.cart}">
              <h4 style="${s.cartH}">Carrito</h4>
              <div class="row"><span>Abrir / cerrar carrito</span><span><kbd>;</kbd> · <kbd>Alt+C</kbd></span></div>
              <div class="row"><span>Cobrar (pagar)</span><span><kbd>*</kbd> · <kbd>Alt+P</kbd></span></div>
              <div class="row"><span>Reducir último item</span><span><kbd>[</kbd></span></div>
              <div class="row"><span>Sumar al último item</span><span><kbd>]</kbd></span></div>
              <div class="row"><span>Quitar último item</span><span><kbd>\\</kbd></span></div>
              <div class="row"><span>Limpiar carrito completo</span><span><kbd>Alt+L</kbd></span></div>
            </div>

            <div class="ft-grp" style="${s.modal}">
              <h4 style="${s.modalH}">Modal de producto</h4>
              <div class="row"><span>Aumentar cantidad</span><span><kbd>+</kbd> · <kbd>↑</kbd></span></div>
              <div class="row"><span>Disminuir cantidad</span><span><kbd>-</kbd> · <kbd>↓</kbd></span></div>
              <div class="row"><span>Agregar al carrito</span><span><kbd>Enter</kbd></span></div>
              <div class="row"><span>Agregar y registrar más</span><span><kbd>Shift+Enter</kbd></span></div>
            </div>

            <div class="ft-grp" style="${s.gen}">
              <h4 style="${s.genH}">General</h4>
              <div class="row"><span>Abrir este tutorial</span><span><kbd>?</kbd> · <kbd>Alt+H</kbd></span></div>
              <div class="row"><span>Cerrar modales</span><span><kbd>Esc</kbd></span></div>
            </div>

            <p class="ft-tip">Los atajos con <kbd>Alt+</kbd> funcionan aunque estés escribiendo en un input. Los de una sola tecla requieren no tener foco en input.</p>
          </div>
        `,
      },
    },
    {
      element: '#header-menu-toggle',
      popover: {
        title: 'Menú de navegación',
        description: 'Abre el menú lateral con acceso a todas las secciones: Productos, Inventario (con alertas de stock), Ventas, Caja, Proveedores, Clientes y más. El orden del menú se personaliza en Configuración → Menú.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { closeCart(); openSidebar(); },
      onDeselected: () => { closeSidebar(); },
    },
    {
      element: '#header-theme-btn',
      popover: {
        title: 'Cambiar tema',
        description: 'Alterna entre modo claro y oscuro. Toda la interfaz, la barra de estado y los modales se adaptan al tema elegido. El tema persiste entre sesiones.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#header-tour-btn',
      popover: {
        title: 'Tutorial guiado',
        description: 'Este botón (?) lanza el tutorial de la página actual. Pasa el cursor sobre él para ver un resumen de atajos. Atajos directos: <kbd>?</kbd> o <kbd>Alt+H</kbd>.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#pos-title',
      popover: {
        title: 'Punto de Venta',
        description: 'Vista principal de ventas. Registra ventas escaneando, pesando o seleccionando productos. Gestiona hasta 5 carritos simultáneos, edita ventas previas y cobra en efectivo, tarjeta o transferencia.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#pos-weight-display',
      popover: {
        title: 'Lectura de la balanza',
        description: 'Peso en tiempo real. <b>Verde</b> = estable, <b>amarillo</b> = inestable, <b>gris</b> = desconectada. Muestra equivalencias en kg, lb y arroba (@). Sin balanza física, ingresa el peso manualmente.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#pos-scale-controls',
      popover: {
        title: 'Controles de peso',
        description: '<b>KG / LB / Arroba</b>: cambia la unidad principal. <b>TARAR</b>: descuenta el peso del recipiente vacío — pon el recipiente, pulsa Tarar, y el peso neto del producto se calcula automáticamente. "Quitar Tare" restaura el peso bruto. Atajo: <kbd>,</kbd>',
        side: 'left' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#pos-search-input',
      popover: {
        title: 'Buscar producto',
        description: 'Busca por nombre, animal (res, cerdo, pollo…), corte, categoría, SKU o código de barras. Teclea y usa <kbd>↓ ↑</kbd> para navegar resultados, <kbd>Enter</kbd> para seleccionar. Atajo para enfocar: <kbd>/</kbd> o <kbd>Alt+B</kbd>.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#pos-category-filter',
      popover: {
        title: 'Filtro por categoría',
        description: 'Filtra los productos del grid por categoría. "Todas" muestra todos. Colores de las categorías coinciden con los badges en las tarjetas. Las categorías se gestionan en la sección Categorías del menú.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#pos-product-grid',
      popover: {
        title: 'Productos disponibles',
        description: 'Cada tarjeta muestra: imagen, nombre, animal+corte, preparaciones sugeridas, precio y stock. Toca un producto para abrir el modal de venta: vende por peso (balanza o manual), por unidad con +/- o por sub-unidad (medio, cuarto…).',
        side: 'top' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#pos-recent-sales',
      popover: {
        title: 'Ventas recientes',
        description: 'Últimas 10 ventas del día con hora y total. El ícono de lápiz carga la venta en un carrito nuevo para editarla — muestra la diferencia a cobrar o devolver al cliente.',
        side: 'top' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#header-cart-btn',
      popover: {
        title: 'Botón del carrito',
        description: 'Muestra el total de ítems en todos los carritos activos. Toca para abrir/cerrar el panel del carrito. Atajo: <kbd>;</kbd> o <kbd>Alt+C</kbd>.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { closeSidebar(); closeCart(); },
    },
    {
      element: '#pos-cart-panel',
      popover: {
        title: 'Panel del carrito',
        description: 'Gestiona los productos agregados: edita peso con el lápiz, ajusta unidades con +/-, elimina ítems. <b>COBRAR</b> abre el modal de pago (efectivo, tarjeta, transferencia, mezcla). En edición de venta: muestra diferencia a cobrar o devolver.',
        side: 'left' as const,
      },
      onHighlightStarted: () => { closeSidebar(); openCart(); },
    },
    {
      element: '#pos-cart-tabs',
      popover: {
        title: 'Carritos múltiples',
        description: 'Crea hasta 5 carritos simultáneos con el botón +. Cada carrito es independiente — ideal para atender varios clientes a la vez. Badge "Editando #N" indica edición de venta previa. Carritos vacíos se pueden eliminar con ×.',
        side: 'bottom' as const,
      },
      onHighlightStarted: () => { openCart(); },
      onDeselected: () => { closeCart(); },
    },
  ];
  },

  '/products': () => [
    {
      element: '#products-new-btn',
      popover: {
        title: 'Nuevo producto',
        description: 'Crea un producto con: nombre, tipo de venta (por peso / unidad / sub-unidad), precio de venta, costo, stock mínimo, categoría, proveedor, SKU, código de barras e imagen. Los productos desactivados no aparecen en el POS.',
        side: 'bottom' as const,
      },
    },
    {
      popover: {
        title: 'Tipos de venta',
        description: '<b>Por peso</b>: se multiplica el precio por los kg/lb/arrobas pesados en balanza o ingresados manualmente.<br><b>Por unidad</b>: cantidad entera, precio fijo por pieza.<br><b>Sub-unidad</b>: permite vender medio, cuarto, etc., con precio proporcional.<br>El tipo se selecciona al crear o editar el producto.',
      },
    },
    {
      element: '#products-list',
      popover: {
        title: 'Lista de productos',
        description: 'Busca por nombre, SKU o código de barras. Alterna entre vista de tarjetas y tabla con el selector de vista. Toca un producto para ver su detalle: historial de precios, movimientos de inventario, y opciones de editar o desactivar/reactivar.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Edición y precios',
        description: 'Al editar un producto puedes actualizar el precio de venta — el cambio queda registrado en el historial de precios con fecha y usuario. Esto permite auditar la evolución de precios en el tiempo.',
      },
    },
  ],

  '/categories': () => [
    {
      element: '#categories-new-btn',
      popover: {
        title: 'Nueva categoría',
        description: 'Crea una categoría con nombre, color identificador (aparece en el filtro del POS y en los badges de las tarjetas) y descripción opcional. Puedes asignarle una categoría padre para crear jerarquías (ej: Carnes > Res).',
        side: 'bottom' as const,
      },
    },
    {
      popover: {
        title: 'Métodos de cocción',
        description: 'En cada categoría puedes definir los métodos de cocción sugeridos (Asar, Freír, Hornear, Estofar, etc.). Estos aparecen como chips en las tarjetas del POS para orientar al cliente sobre la preparación del producto.',
      },
    },
    {
      element: '#categories-grid',
      popover: {
        title: 'Grid de categorías',
        description: 'Cada tarjeta muestra el color, nombre, descripción, tipo de animal y métodos de cocción asociados. Usa el ícono de lápiz para editar o el de basura para desactivar. Las categorías activas aparecen como filtros en el POS.',
        side: 'top' as const,
      },
    },
  ],

  '/inventory': () => [
    {
      element: '#inventory-tabs',
      popover: {
        title: 'Pestañas de inventario',
        description: '<b>Movimientos</b>: historial completo de entradas (ENTRY), salidas (EXIT), ajustes (ADJUSTMENT) y mermas (LOSS). <b>Alertas</b>: productos cuyo stock actual está por debajo del mínimo configurado — muestra el déficit y permite generar OC directamente.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#inventory-new-movement-btn',
      popover: {
        title: 'Nuevo movimiento',
        description: 'Registra manualmente un movimiento de inventario: <b>ENTRY</b> (compra o entrada), <b>EXIT</b> (salida por uso), <b>ADJUSTMENT</b> (corrección de conteo físico) o <b>LOSS</b> (pérdida/merma). Al recibir una Orden de Compra, el ENTRY se genera automáticamente.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#inventory-list',
      popover: {
        title: 'Historial de movimientos',
        description: 'Cada fila muestra: producto, tipo de movimiento, stock anterior → nuevo, cantidad del movimiento, notas y usuario que lo registró. Filtra por fecha, tipo o producto para auditorías de inventario.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Alertas de stock',
        description: 'La pestaña "Alertas" lista los productos con stock crítico. Cada alerta indica el stock actual, el mínimo configurado y el déficit. Desde allí puedes ir directo a crear una Orden de Compra para el proveedor del producto.',
      },
    },
  ],

  '/sales': () => [
    {
      element: '#sales-date-filters',
      popover: {
        title: 'Filtros de fecha y búsqueda',
        description: 'Selecciona un rango de fechas (hoy, semana, mes o rango personalizado) para filtrar el historial de ventas. También puedes buscar por número de venta o cajero. Los filtros se combinan.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#sales-summary',
      popover: {
        title: 'Resumen del período',
        description: 'Totales del rango seleccionado: cantidad de ventas, ingresos brutos, desglose por método de pago (efectivo, tarjeta, transferencia) y ticket promedio. Solo visible para ADMIN y SUPERVISOR.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#sales-list',
      popover: {
        title: 'Historial de ventas',
        description: 'Lista todas las ventas del período. Toca una venta para ver el detalle: productos vendidos, cantidades, precios, método de pago, cajero y hora. Desde el detalle puedes descargar el ticket en PDF o marcar la venta como corregida.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Editar una venta',
        description: 'El ícono de lápiz en el historial carga la venta en un carrito nuevo del POS. Agrega o quita productos, ajusta cantidades y cobra: el sistema calcula automáticamente si el cliente debe pagar diferencia adicional o recibe cambio/devolución.',
      },
    },
  ],

  '/cash': () => [
    {
      element: '#cash-tabs',
      popover: {
        title: 'Pestañas de caja',
        description: '<b>Movimientos</b>: todas las entradas y salidas de efectivo del día (fondos de caja, pagos a proveedores, gastos menores). <b>Cierres</b>: cuadres de caja al final del turno con monto esperado vs. real contado y diferencia.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#cash-new-btn',
      popover: {
        title: 'Nueva operación de caja',
        description: 'Registra una entrada (ej: fondo inicial, depósito) o salida (ej: pago a proveedor, gasto menor) de efectivo con descripción, monto y categoría. Las ventas en efectivo se registran automáticamente — aquí solo van los movimientos manuales.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#cash-list',
      popover: {
        title: 'Historial de caja',
        description: 'Movimientos ordenados por hora. En la pestaña Cierres, cada registro muestra: monto esperado (calculado por el sistema), monto real ingresado y la diferencia. Un cierre con diferencia positiva indica sobrante; negativa indica faltante.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Cierre de caja',
        description: 'Para cerrar el turno: ve a Cierres → Nueva Operación de Cierre. Ingresa el efectivo contado físicamente en caja. El sistema calcula el esperado (ventas efectivo + entradas - salidas) y muestra si hay diferencia.',
      },
    },
  ],

  '/customers': () => [
    {
      element: '#customers-new-btn',
      popover: {
        title: 'Nuevo cliente',
        description: 'Registra un cliente con: nombre, teléfono, documento de identidad, límite de crédito y notas. El límite de crédito controla cuánto puede deber el cliente — si supera el límite, el sistema alerta al cobrar.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#customers-stats',
      popover: {
        title: 'Resumen de cartera',
        description: 'Muestra el total de clientes registrados, cuántos tienen deuda activa y el monto total de cartera. Útil para monitorear la exposición crediticia del negocio.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#customers-list',
      popover: {
        title: 'Lista de clientes',
        description: 'Busca clientes por nombre, teléfono o documento. Cada fila muestra su límite de crédito y deuda actual. El ícono de lápiz abre el formulario de edición. Toca el nombre para ver el historial de ventas a crédito y pagos realizados.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Ventas a crédito y abonos',
        description: 'En el POS, al cobrar puedes seleccionar un cliente y marcar la venta como "A crédito". El saldo queda pendiente. Desde el detalle del cliente puedes registrar abonos parciales (efectivo, tarjeta o transferencia) y ver el historial completo de pagos.',
      },
    },
  ],

  '/suppliers': () => [
    {
      element: '#suppliers-new-btn',
      popover: {
        title: 'Nuevo proveedor',
        description: 'Registra un proveedor con: nombre, NIT/identificación, teléfono, email, ciudad, dirección y notas. Los proveedores se vinculan a productos (para calcular costo) y a Órdenes de Compra para trazabilidad de compras.',
        side: 'bottom' as const,
      },
    },
    {
      popover: {
        title: 'Filtros y búsqueda',
        description: 'Filtra por ciudad, estado (activo/inactivo) y ordena por fecha o nombre. La búsqueda cubre nombre, NIT y ciudad. La vista alterna entre tarjetas y tabla para adaptar la densidad de información.',
      },
    },
    {
      element: '#suppliers-list',
      popover: {
        title: 'Lista de proveedores',
        description: 'Cada tarjeta/fila muestra: nombre, NIT, ciudad, estado activo/inactivo y cantidad de productos vinculados. Toca "Detalle" para ver todos los datos de contacto. Toca "Editar" para actualizar la información. Desactivar un proveedor no elimina sus productos.',
        side: 'top' as const,
      },
    },
  ],

  '/purchase-orders': () => [
    {
      element: '#orders-new-btn',
      popover: {
        title: 'Nueva Orden de Compra',
        description: 'Crea una OC seleccionando el proveedor, fecha estimada de entrega y los productos con cantidades y costos unitarios. El sistema calcula subtotal e impuestos. La OC se puede enviar en estado BORRADOR y confirmar después.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#orders-status-filter',
      popover: {
        title: 'Filtro por estado',
        description: '<b>Borrador</b>: en preparación. <b>Enviada</b>: confirmada al proveedor. <b>Parcial</b>: recibida parcialmente. <b>Recibida</b>: recepción completa (stock actualizado). <b>Cancelada</b>: anulada. Las OC en Borrador no afectan el inventario.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#orders-list',
      popover: {
        title: 'Lista de órdenes',
        description: 'Cada OC muestra: código, proveedor, estado, fecha, total e ítems. Al abrir el detalle puedes registrar la recepción — ingresa las cantidades recibidas por ítem. Al confirmar recepción, el stock se actualiza con costo promedio ponderado y se genera un movimiento ENTRY en inventario.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Costo promedio ponderado',
        description: 'Al recibir una OC, el sistema recalcula el costo del producto usando costo promedio ponderado: ((stock_actual × costo_actual) + (cantidad_nueva × costo_oc)) / (stock_actual + cantidad_nueva). Esto mantiene el costo de inventario actualizado automáticamente.',
      },
    },
  ],

  '/expenses': () => [
    {
      element: '#expenses-new-btn',
      popover: {
        title: 'Nuevo gasto',
        description: 'Registra un egreso con: monto, descripción, categoría, fecha, método de pago (efectivo, tarjeta, transferencia) y comprobante adjunto (foto o PDF). El gasto se descontará del resultado neto del período en los reportes financieros.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#expenses-summary',
      popover: {
        title: 'Resumen del mes',
        description: 'Muestra el total de gastos del mes en curso, el promedio diario y la categoría con mayor gasto. Útil para controlar los egresos y comparar con los ingresos del período en Reportes.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#expenses-list',
      popover: {
        title: 'Lista de gastos',
        description: 'Filtra por categoría, rango de fechas o búsqueda de texto. Cada gasto tiene ícono de ojo para ver el comprobante adjunto (imagen o PDF) y ícono de lápiz para editar. Solo ADMIN puede eliminar gastos — los demás pueden editarlos.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Categorías de gastos',
        description: 'Ingresa categorías libres (texto) como: "Arriendo", "Servicios públicos", "Nómina", "Transporte", "Insumos", etc. Mantener categorías consistentes te permite ver en Reportes el desglose por tipo de gasto y tomar decisiones.',
      },
    },
  ],

  '/reports': () => [
    {
      element: '#reports-tabs',
      popover: {
        title: 'Tipos de reportes',
        description: '<b>Por rango</b>: análisis financiero (ingresos, gastos, utilidad neta, top productos) para cualquier período. <b>Cierre mensual</b>: estado de resultados mensual oficial — se puede cerrar el mes para congelarlo. <b>Comparativas</b>: compara períodos lado a lado.',
        side: 'bottom' as const,
      },
    },
    {
      popover: {
        title: 'Reporte por rango',
        description: 'Selecciona el tipo de reporte (Ventas, Financiero, Gastos o Inventario) y el rango de fechas. Genera el reporte y obtén: total de ventas, ingresos brutos, gastos del período, utilidad neta, top 10 productos más vendidos y desglose por categoría.',
      },
    },
    {
      popover: {
        title: 'Exportar reportes',
        description: 'Cada reporte puede exportarse en <b>PDF</b> (para imprimir o archivar) o <b>Excel/CSV</b> (para análisis en hoja de cálculo). Los exports incluyen tablas de detalle con fechas, montos y notas — listos para contabilidad o declaraciones tributarias.',
      },
    },
    {
      popover: {
        title: 'Cierre mensual',
        description: 'El cierre mensual "congela" los números del mes. Una vez cerrado, el período queda bloqueado y aparece con el indicador de candado. Solo ADMIN puede cerrar meses. Los cierres anteriores se pueden exportar pero no editar.',
      },
    },
  ],

  '/notifications': () => [
    {
      element: '#notifs-tabs',
      popover: {
        title: 'Centro de notificaciones',
        description: 'Organiza las alertas en pestañas: <b>Nuevas</b> (sin leer), <b>Leídas</b>, <b>Archivadas</b> y <b>Papelera</b>. Las notificaciones del sistema (stock bajo, vencimientos, ventas) aparecen automáticamente. Puedes filtrar por tipo y rango de fechas.',
        side: 'bottom' as const,
      },
    },
    {
      popover: {
        title: 'Tipos de alertas automáticas',
        description: '<b>Stock</b>: producto por debajo del mínimo configurado.<br><b>Vencimiento</b>: producto próximo a vencer (según días de alerta).<br><b>Venta</b>: confirmación de venta registrada.<br><b>Advertencia</b>: errores o situaciones que requieren atención.<br><b>Sistema</b>: actualizaciones y eventos del sistema.',
      },
    },
    {
      popover: {
        title: 'Gestión de notificaciones',
        description: 'Cada notificación tiene acciones: marcar como leída, archivar (guardarla para referencia) o enviar a papelera. Las archivadas no generan badge de alerta. Desde el detalle, el enlace "Ver detalle" navega directamente al recurso relacionado (producto, venta, etc.).',
      },
    },
    {
      popover: {
        title: 'Vista de administrador',
        description: 'Los usuarios ADMIN pueden ver notificaciones de todos los empleados usando el filtro "Alcance: Todas". Esto permite supervisar alertas que otros cajeros o supervisores recibieron pero no han atendido.',
      },
    },
  ],

  '/dashboard': () => [
    {
      element: '#dashboard-date-filter',
      popover: {
        title: 'Selector de fecha',
        description: 'Selecciona el día para ver los indicadores de ese período. Opciones rápidas: hoy, ayer, esta semana, este mes, o ingresa un rango personalizado. Los gráficos y KPIs se actualizan automáticamente al cambiar la fecha.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#dashboard-kpis',
      popover: {
        title: 'Indicadores clave (KPIs)',
        description: 'Las tarjetas resumen muestran: total de ventas del día, ingresos brutos, ticket promedio por venta, comparación porcentual con el día anterior y desglose por método de pago. Una flecha verde indica mejora respecto al período anterior.',
        side: 'bottom' as const,
      },
    },
    {
      popover: {
        title: 'Gráficos de desempeño',
        description: 'El dashboard incluye: curva de ingresos del día por hora, comparativa ingresos vs. gastos, productos más vendidos (top 10), ventas por categoría, distribución de métodos de pago y ventas por cajero. Útil para detectar horas pico y productos más rentables.',
      },
    },
    {
      popover: {
        title: 'Alertas del dashboard',
        description: 'En la parte inferior aparecen alertas activas de stock bajo y productos próximos a vencer. Sirven de recordatorio para hacer pedidos o hacer seguimiento del inventario antes de que se convierta en pérdida.',
      },
    },
  ],

  '/backups': () => [
    {
      element: '#backups-btn',
      popover: {
        title: 'Generar backup ahora',
        description: 'Crea un backup manual inmediato de la base de datos PostgreSQL usando pg_dump. El archivo se guarda en la carpeta <code>backups/</code> en formato .dump. Los backups automáticos se ejecutan diariamente a las 02:00 AM (configurable con BACKUP_CRON).',
        side: 'bottom' as const,
      },
    },
    {
      element: '#backups-list',
      popover: {
        title: 'Archivos de backup',
        description: 'Lista de todos los backups disponibles con nombre, tamaño y fecha. Cada archivo muestra el botón "Restaurar". La retención por defecto es 14 días (configurable con BACKUP_RETENTION). Backups más antiguos se eliminan automáticamente.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Restaurar un backup',
        description: '<b>⚠ Operación destructiva:</b> restaurar un backup reemplaza TODOS los datos actuales. Al confirmar debes escribir la palabra RESTAURAR. El sistema crea un "safety backup" automático justo antes de restaurar para que puedas revertir si algo sale mal.',
      },
    },
    {
      popover: {
        title: 'Restauración manual (pg_restore)',
        description: 'También puedes restaurar desde terminal con: <code>pg_restore -U postgres -d fameat_pos backups/archivo.dump</code>. Útil si el sistema web no está disponible o para migrar a otro servidor.',
      },
    },
  ],

  '/settings': () => [
    {
      element: '#settings-tabs',
      popover: {
        title: 'Secciones de configuración',
        description: '<b>Balanza</b>: conectar/desconectar, puerto COM y velocidad. <b>Procesamiento</b>: sensibilidad de lectura, filtros de estabilidad. <b>Negocio</b>: nombre, dirección, teléfono, logo (aparece en el login y encabezado). <b>Menú</b>: reordenar ítems del menú lateral.',
        side: 'bottom' as const,
      },
    },
    {
      element: '#settings-content',
      popover: {
        title: 'Configuración de balanza',
        description: 'Selecciona el puerto COM donde está conectada la báscula (ej: COM3) y la velocidad en baudios (9600 por defecto). Pulsa "Conectar" y observa el estado en tiempo real. Si la balanza no responde, verifica que esté encendida y el cable conectado.',
        side: 'top' as const,
      },
    },
    {
      popover: {
        title: 'Configuración del negocio',
        description: 'El nombre del negocio aparece en la pantalla de login, en el encabezado del sidebar y en los tickets PDF. El logo se muestra en el login y en la parte superior del sidebar. Sube una imagen cuadrada en JPG o PNG para mejor resultado.',
      },
    },
    {
      popover: {
        title: 'Personalización del menú',
        description: 'En la pestaña Menú puedes reordenar los ítems del sidebar arrastrando con las flechas ↑↓. Guarda el orden como personal (solo para ti) o global (para todos los usuarios). El orden global se aplica a todos los usuarios que no tengan un orden personal.',
      },
    },
  ],

  '/login': () => [
    {
      element: '#login-form',
      popover: {
        title: 'Inicio de sesión',
        description: 'Ingresa tu usuario y contraseña. El acceso a secciones depende de tu rol: <b>ADMIN</b> accede a todo, <b>SUPERVISOR</b> a reportes y gestión (sin backups ni configuración), <b>VENDEDOR</b> solo al POS, ventas y clientes. Cuentas de prueba: admin/admin123 · supervisor1/super123 · cajero1/cajero123.',
        side: 'bottom' as const,
      },
    },
    {
      popover: {
        title: 'Roles y permisos',
        description: '<b>ADMIN</b>: control total incluyendo usuarios, backups y configuración del sistema.<br><b>SUPERVISOR</b>: gestión de productos, inventario, proveedores, reportes y dashboard. Sin acceso a configuración ni backups.<br><b>VENDEDOR</b>: únicamente POS, historial de ventas y clientes.',
      },
    },
  ],
};

export function useTour() {
  const location = useLocation();
  const { sidebarOpen, cartOpen, toggleSidebar, toggleCart } = usePanel();

  const startTour = useCallback(() => {
    const buildSteps = toursByRoute[location.pathname];
    if (!buildSteps) return;

    const steps = buildSteps({
      openSidebar: () => { if (!sidebarOpen) toggleSidebar(); },
      closeSidebar: () => { if (sidebarOpen) toggleSidebar(); },
      openCart: () => { if (!cartOpen) toggleCart(); },
      closeCart: () => { if (cartOpen) toggleCart(); },
    });

    const validSteps = steps.filter((step) => {
      if (!step.element) return true;
      const el = document.querySelector(step.element as string) as HTMLElement | null;
      if (!el) return false;
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
      return true;
    });

    if (validSteps.length === 0) return;

    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.7)',
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'fameat-tour-popover',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Listo',
      progressText: '{{current}} de {{total}}',
      steps: validSteps,
    });

    d.drive();
  }, [location.pathname, sidebarOpen, cartOpen, toggleSidebar, toggleCart]);

  return { startTour };
}
