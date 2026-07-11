import { NavLink } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useScale } from '../../contexts/ScaleContext';
import { usePanel } from '../../contexts/PanelContext';
import { useConfig } from '../../contexts/ConfigContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SidebarFooter } from './GlobalFooter';
import toast from 'react-hot-toast';
import {
  Storefront,
  ChartLineUp,
  Package,
  ClipboardText,
  ChartBar,
  CurrencyDollar,
  GearSix,
  Plugs,
  User,
  SignOut,
  Truck,
  Bell,
  Receipt,
  ChartPieSlice,
  Folder,
  UsersThree,
  ClipboardText as ClipboardTextIcon,
  Database,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import { getOne as getPref } from '../../api/preferences';
import client from '../../api/client';

interface NavItem {
  to: string;
  label: string;
  Icon: ComponentType<{ size?: number; weight?: 'duotone'; className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Punto de Venta', Icon: Storefront, roles: ['ADMIN', 'VENDEDOR'] },
  { to: '/dashboard', label: 'Dashboard', Icon: ChartLineUp, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/products', label: 'Productos', Icon: Package, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/categories', label: 'Categorías', Icon: Folder, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/inventory', label: 'Inventario', Icon: ClipboardText, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/sales', label: 'Historial Ventas', Icon: ChartBar, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { to: '/cash', label: 'Caja', Icon: CurrencyDollar, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { to: '/customers', label: 'Clientes', Icon: UsersThree, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { to: '/suppliers', label: 'Proveedores', Icon: Truck, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/purchase-orders', label: 'Órdenes Compra', Icon: ClipboardTextIcon, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/expenses', label: 'Gastos', Icon: Receipt, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { to: '/reports', label: 'Reportes', Icon: ChartPieSlice, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/notifications', label: 'Notificaciones', Icon: Bell, roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { to: '/processing', label: 'Procesamiento', Icon: ClipboardText, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/backups', label: 'Backups', Icon: Database, roles: ['ADMIN'] },
  { to: '/settings', label: 'Configuración', Icon: GearSix, roles: ['ADMIN'] },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  VENDEDOR: 'Vendedor',
};

const MENU_ORDER_KEY = 'menu_order';

function useMenuOrder(userId?: number) {
  const [order, setOrder] = useState<string[] | null>(null);

  useEffect(() => {
    if (!userId) return;

    getPref<string[]>(MENU_ORDER_KEY).then((personal) => {
      if (Array.isArray(personal) && personal.length > 0) {
        setOrder(personal);
        return;
      }
      client.get('/config').then((cfg) => {
        const raw = cfg.data?.[MENU_ORDER_KEY];
        if (raw) {
          try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed) && parsed.length > 0) setOrder(parsed);
          } catch { /* sin orden global */ }
        }
      }).catch(() => {});
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const handler = (e: any) => {
      if (Array.isArray(e?.detail)) setOrder(e.detail);
    };
    window.addEventListener('menu-order-changed', handler as any);
    return () => window.removeEventListener('menu-order-changed', handler as any);
  }, []);

  return order;
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { connected } = useScale();
  const { sidebarOpen, toggleSidebar } = usePanel();
  const { config } = useConfig();
  const { isDark } = useTheme();
  const menuOrder = useMenuOrder(user?.id);
  const { alertCount, activeCartsCount } = useNotifications();

  const sortedNav = menuOrder
    ? [...navItems].sort((a, b) => {
        const ia = menuOrder.indexOf(a.to);
        const ib = menuOrder.indexOf(b.to);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
    : navItems;

  return (
    <>
      {/* Backdrop — unificado con carrito y ventas recientes */}
      <div
        className={`fixed inset-0 z-30 md:hidden bg-black/40 transition-opacity duration-[350ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />
      <aside
        style={{ willChange: 'transform' }}
        className={`w-56 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'} flex flex-col h-full z-40 absolute md:relative rounded-r-2xl md:rounded-none overflow-hidden transition-all duration-[350ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] shadow-2xl md:shadow-none
        ${sidebarOpen
          ? 'translate-x-0'
          :         '-translate-x-full md:translate-x-0 md:w-14 md:overflow-visible'
        }`}>

        {/* Branding + datos del negocio */}
        <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} ${!sidebarOpen ? 'flex items-center justify-center' : ''}`}>
          <div className="flex items-center gap-2">
            <img src={config.businessLogo || '/pwa/icons/icon-any-96.png'} alt={config.businessName} className="w-8 h-8 rounded-lg flex-shrink-0 object-cover" />
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="text-base font-bold text-red-500 leading-none">{config.businessName}</h1>
                {config.businessAddress && <p className={`text-xs truncate leading-tight mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{config.businessAddress}</p>}
                {config.businessPhone && <p className={`text-xs leading-tight ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{config.businessPhone}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={`flex-1 p-1.5 ${sidebarOpen ? 'overflow-auto thin-scroll' : ''}`}>
          {sortedNav
            .filter((item) => item.roles.includes(user?.role || ''))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => { if (window.innerWidth < 768) toggleSidebar(); }}
                className={({ isActive }) =>
                  `relative group flex items-center gap-2 px-2 py-2 rounded-lg text-sm mb-0.5 transition-colors whitespace-nowrap ${!sidebarOpen ? 'justify-center' : ''} ${
                    isActive
                      ? 'bg-red-500 text-white'
                      : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <div className="relative">
                  <item.Icon size={18} weight="duotone" />
                  {item.to === '/inventory' && alertCount > 0 && !sidebarOpen && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{alertCount}</span>
                  )}
                  {item.to === '/' && activeCartsCount > 1 && !sidebarOpen && (
                    <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{activeCartsCount}</span>
                  )}
                </div>
                {!sidebarOpen && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none">
                    {item.label}
                  </div>
                )}
                {sidebarOpen && (
                  <span className="flex-1 flex items-center gap-1.5">
                    {item.label}
                    {item.to === '/inventory' && alertCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{alertCount}</span>
                    )}
                    {item.to === '/' && activeCartsCount > 1 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{activeCartsCount}</span>
                    )}
                  </span>
                )}
              </NavLink>
            ))}
        </nav>

        {/* Footer */}
        <div className={`p-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} space-y-2 ${!sidebarOpen ? 'hidden md:block text-center' : ''}`}>
          {/* Balanza status */}
          <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${
            connected
              ? isDark ? 'bg-green-900/30' : 'bg-green-50'
              : isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <Plugs size={16} weight="duotone" className={`flex-shrink-0 ${connected ? 'text-green-500' : 'text-gray-400'}`} />
            {sidebarOpen && (
              <span className={`text-xs font-medium ${connected ? 'text-green-600' : 'text-gray-500'}`}>
                {connected ? 'Balanza conectada' : 'Balanza desconectada'}
              </span>
            )}
          </div>

          {sidebarOpen && (
            <>
              {/* User info */}
              <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <User size={16} weight="duotone" className="text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{user?.name}</div>
                  <div className="text-[10px] text-gray-500">{roleLabels[user?.role || ''] || user?.role}</div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  toast(
                    (t) => (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium">Se cerrará tu sesión</p>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-3 py-1 text-xs rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => { toast.dismiss(t.id); logout(); }}
                            className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                          >
                            Cerrar sesión
                          </button>
                        </div>
                      </div>
                    ),
                    {
                      duration: 6000,
                      position: 'top-center',
                      style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' },
                    },
                  );
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${isDark ? 'bg-red-900/30 hover:bg-red-900/50' : 'bg-red-50 hover:bg-red-100'}`}
              >
                <SignOut size={16} weight="duotone" className="text-red-500 flex-shrink-0" />
                <span className="text-xs font-medium text-red-500">Cerrar Sesión</span>
              </button>
            </>
          )}
        </div>
        {sidebarOpen && <SidebarFooter />}
      </aside>
    </>
  );
}
