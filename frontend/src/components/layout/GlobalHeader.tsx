import { useAuth } from '../../contexts/AuthContext';
import { usePanel } from '../../contexts/PanelContext';
import { useLocation } from 'react-router-dom';
import { ArrowsClockwise, X, SignOut, List, ShoppingCart, ArrowLeft, Moon, Sun, Question, Bell, Package, CurrencyDollar, Info, MagnifyingGlass, ArrowSquareOut, Archive, Trash } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useTour } from '../../hooks/useTour';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNotifications } from '../../contexts/NotificationContext';
import { Portal } from '../Portal';
import { useState } from 'react';
import { ModuleSearch } from './ModuleSearch';

const CYAN = '#14e0eb';

function HeaderButton({ active, onClick, title, children, light }: {
  active?: boolean; onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode; light?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        light
          ? active ? 'bg-red-100 text-red-500' : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
          : active ? 'bg-white/20 text-white' : 'text-red-200 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const { sidebarOpen, cartOpen, cartCount, toggleSidebar, toggleCart } = usePanel();
  const { isDark, toggleTheme } = useTheme();
  const { startTour } = useTour();
  const { notifications, unreadCount, markRead, bellEnabled, archiveNotif, deleteNotif } = useNotifications();
  const [confirmDeleteNotif, setConfirmDeleteNotif] = useState<string | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifTab, setNotifTab] = useState<'new' | 'read'>('new');
  const [notifSearch, setNotifSearch] = useState('');
  const [notifLimit, setNotifLimit] = useState(15);
  const [showShortcutsCard, setShowShortcutsCard] = useState(false);
  const location = useLocation();

  const navigate = useNavigate();
  const isPOS = location.pathname === '/';
  const isLogin = location.pathname === '/login';
  const canGoBack = user && !isPOS;

  useKeyboardShortcuts([
    { key: '?', shift: true, allowInInput: true, handler: () => startTour(), description: 'Abrir tutorial guiado' },
    { key: 'h', alt: true, allowInInput: true, handler: () => startTour(), description: 'Abrir tutorial guiado (alt)' },
  ]);

  const handleReload = async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    window.location.reload();
  };

  const handleLogout = () => {
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
  };

  const handleClose = () => {
    // Intentar múltiples métodos para cerrar PWA/navegador
    try { window.close(); } catch {}
    try { (window as any).navigator?.app?.exitApp?.(); } catch {}
    try { window.open('', '_self')?.close(); } catch {}
    // Si estamos en PWA standalone, navegar a about:blank cierra la app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    if (isStandalone) {
      window.location.href = 'about:blank';
      return;
    }
    // Fallback: mostrar pantalla de cierre
    setTimeout(() => {
      document.documentElement.innerHTML =
        '<body style="background:#0f172a;color:#64748b;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;flex-direction:column;gap:8px"><p style="font-size:16px">Aplicacion cerrada</p><p style="font-size:12px">Puedes cerrar esta pestana</p></body>';
    }, 200);
  };

  const light = !isDark;

  return (
    <header className={`fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-3 z-40 ${
      isDark ? 'bg-gray-900' : 'bg-white'
    }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* Izquierda: menu + marca */}
      <div className="flex items-center gap-3">
        {user && (
          <span id="header-menu-toggle">
            <HeaderButton light={light} active={sidebarOpen} onClick={toggleSidebar} title={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}>
              <List size={20} weight="bold" />
            </HeaderButton>
          </span>
        )}
        <span className={`font-bold text-base tracking-wide ${isDark ? 'text-white' : 'text-gray-800'}`}>
          <span style={{ color: CYAN }}>ByteGest</span>
        </span>
      </div>

      {/* Centro: buscador global (desktop ancho completo) */}
      <div className="hidden md:flex flex-1 justify-center px-4">
        <ModuleSearch />
      </div>

      {/* Derecha: carrito + acciones */}
      <div className="flex items-center gap-1">
        {/* Buscador mobile: icono junto a otros iconos */}
        <div className="md:hidden"><ModuleSearch /></div>
        {user && (isPOS || cartCount > 0) && (
          <span id="header-cart-btn"><HeaderButton light={light} active={cartOpen} onClick={() => {
            if (!isPOS) {
              navigate('/');
              if (!cartOpen) setTimeout(() => toggleCart(), 50);
            } else {
              toggleCart();
            }
          }} title={cartOpen ? 'Cerrar carrito' : 'Abrir carrito'}>
            <div className="relative">
              <ShoppingCart size={20} weight="duotone" />
              {cartCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none ${
                  isDark ? 'bg-white text-red-500' : 'bg-red-500 text-white'
                }`}>
                  {cartCount}
                </span>
              )}
            </div>
          </HeaderButton></span>
        )}
        <span id="header-theme-btn">
          <HeaderButton light={light} onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
            {isDark ? <Sun size={18} weight="duotone" /> : <Moon size={18} weight="duotone" />}
          </HeaderButton>
        </span>
        <span id="header-tour-btn" className="relative"
          onMouseEnter={() => setShowShortcutsCard(true)}
          onMouseLeave={() => setShowShortcutsCard(false)}>
          <HeaderButton light={light} onClick={startTour} title="Tutorial guiado (? o Alt+H)">
            <Question size={18} weight="bold" />
          </HeaderButton>
          {showShortcutsCard && isPOS && (
            <div className={`absolute top-full right-0 mt-2 w-[380px] rounded-xl shadow-2xl border z-[9999] pointer-events-none select-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}>
              <div className={`px-4 py-3 rounded-t-xl flex items-center gap-2 ${isDark ? 'bg-slate-700/60' : 'bg-gray-50'}`}>
                <Question size={16} weight="bold" className="text-red-500 flex-shrink-0" />
                <span className="text-sm font-bold tracking-wide">Atajos del POS</span>
                <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-500'}`}>? · Alt+H</span>
              </div>
              <div className={`h-px ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
              <div className="px-3 py-2 space-y-1">
                {/* Grupo: Interfaz de productos */}
                <div className={`rounded-lg px-2 pt-1.5 pb-1 border-l-4 ${isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Interfaz de productos</p>
                  {[
                    { keys: ['/', 'Alt+B'], desc: 'Enfocar buscador' },
                    { keys: ['.', 'Alt+S'], desc: 'Abrir scanner' },
                    { keys: [',', 'Alt+T'], desc: 'Tarar balanza' },
                    { keys: ['↑', '↓', 'Enter'], desc: 'Navegar resultados' },
                  ].map(({ keys, desc }) => (
                    <div key={desc} className="flex items-center justify-between py-0.5 text-xs">
                      <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{desc}</span>
                      <span className="flex gap-0.5 flex-shrink-0 ml-2">
                        {keys.map((k) => (
                          <kbd key={k} className={`px-1 py-0.5 rounded text-[10px] font-mono font-semibold border ${isDark ? 'bg-slate-900 text-slate-200 border-slate-600' : 'bg-white text-gray-700 border-gray-300 shadow-sm'}`}>{k}</kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Grupo: Carrito */}
                <div className={`rounded-lg px-2 pt-1.5 pb-1 border-l-4 ${isDark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Carrito</p>
                  {[
                    { keys: [';', 'Alt+C'], desc: 'Abrir/cerrar carrito' },
                    { keys: ['*', 'Alt+P'], desc: 'Cobrar' },
                    { keys: ['['], desc: 'Reducir último item' },
                    { keys: [']'], desc: 'Sumar al último item' },
                    { keys: ['\\'], desc: 'Quitar último item' },
                    { keys: ['Alt+L'], desc: 'Limpiar carrito' },
                  ].map(({ keys, desc }) => (
                    <div key={desc} className="flex items-center justify-between py-0.5 text-xs">
                      <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{desc}</span>
                      <span className="flex gap-0.5 flex-shrink-0 ml-2">
                        {keys.map((k) => (
                          <kbd key={k} className={`px-1 py-0.5 rounded text-[10px] font-mono font-semibold border ${isDark ? 'bg-slate-900 text-slate-200 border-slate-600' : 'bg-white text-gray-700 border-gray-300 shadow-sm'}`}>{k}</kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Grupo: Modal */}
                <div className={`rounded-lg px-2 pt-1.5 pb-1 border-l-4 ${isDark ? 'border-amber-500 bg-amber-900/20' : 'border-amber-500 bg-amber-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Modal de producto</p>
                  {[
                    { keys: ['+', '↑'], desc: 'Aumentar cantidad' },
                    { keys: ['-', '↓'], desc: 'Disminuir cantidad' },
                    { keys: ['Enter'], desc: 'Agregar al carrito' },
                    { keys: ['Shift+Enter'], desc: 'Agregar y continuar' },
                  ].map(({ keys, desc }) => (
                    <div key={desc} className="flex items-center justify-between py-0.5 text-xs">
                      <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{desc}</span>
                      <span className="flex gap-0.5 flex-shrink-0 ml-2">
                        {keys.map((k) => (
                          <kbd key={k} className={`px-1 py-0.5 rounded text-[10px] font-mono font-semibold border ${isDark ? 'bg-slate-900 text-slate-200 border-slate-600' : 'bg-white text-gray-700 border-gray-300 shadow-sm'}`}>{k}</kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Grupo: General */}
                <div className={`rounded-lg px-2 pt-1.5 pb-1 border-l-4 ${isDark ? 'border-slate-500 bg-slate-700/40' : 'border-gray-400 bg-gray-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>General</p>
                  {[
                    { keys: ['?', 'Alt+H'], desc: 'Abrir tutorial' },
                    { keys: ['Esc'], desc: 'Cerrar modales' },
                  ].map(({ keys, desc }) => (
                    <div key={desc} className="flex items-center justify-between py-0.5 text-xs">
                      <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{desc}</span>
                      <span className="flex gap-0.5 flex-shrink-0 ml-2">
                        {keys.map((k) => (
                          <kbd key={k} className={`px-1 py-0.5 rounded text-[10px] font-mono font-semibold border ${isDark ? 'bg-slate-900 text-slate-200 border-slate-600' : 'bg-white text-gray-700 border-gray-300 shadow-sm'}`}>{k}</kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`px-4 py-2 rounded-b-xl border-t text-[10px] text-center ${isDark ? 'border-slate-700 text-slate-500 bg-slate-700/40' : 'border-gray-100 text-gray-400 bg-gray-50/80'}`}>
                Clic para abrir tutorial completo
              </div>
            </div>
          )}
        </span>
        {user && bellEnabled && (
          <span className="relative">
            <HeaderButton light={light} onClick={() => setShowNotifs(!showNotifs)} title="Notificaciones">
              <Bell size={18} weight="duotone" />
            </HeaderButton>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center pointer-events-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
        )}
        <HeaderButton light={light} onClick={handleReload} title="Recargar sistema">
          <ArrowsClockwise size={18} weight="duotone" />
        </HeaderButton>
        {canGoBack && (
          <HeaderButton light={light} onClick={() => navigate(-1)} title="Volver">
            <ArrowLeft size={18} weight="bold" />
          </HeaderButton>
        )}
        {user && (
          <HeaderButton light={light} onClick={handleLogout} title="Cerrar sesión">
            <SignOut size={18} weight="duotone" />
          </HeaderButton>
        )}
        {!user && (
          <HeaderButton light={light} onClick={handleClose} title="Cerrar aplicación">
            <X size={18} weight="bold" />
          </HeaderButton>
        )}
      </div>

      {/* Panel notificaciones */}
      {showNotifs && (<Portal>
        <div className="fixed inset-0 z-[9999]" onClick={() => setShowNotifs(false)}>
          <div className={`absolute top-14 right-2 w-[calc(100vw-16px)] sm:w-80 md:w-96 max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100'}`}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50'}`}>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : ''}`}>Notificaciones</h3>
              <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex border-b ${isDark ? 'border-slate-700' : ''}`}>
              <button onClick={() => { setNotifTab('new'); setNotifLimit(15); }}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${notifTab === 'new' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500'}`}>
                Nuevas {unreadCount > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
              </button>
              <button onClick={() => { setNotifTab('read'); setNotifLimit(15); setNotifSearch(''); }}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${notifTab === 'read' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500'}`}>
                Archivadas {notifications.filter((n) => n.archived).length > 0 && (
                  <span className="ml-1 bg-gray-400 text-white text-[9px] px-1.5 py-0.5 rounded-full">{notifications.filter((n) => n.archived).length}</span>
                )}
              </button>
            </div>

            {/* Buscador en tab archivadas */}
            {notifTab === 'read' && (
              <div className={`px-3 py-2 border-b relative ${isDark ? 'border-slate-700' : ''}`}>
                <MagnifyingGlass size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={notifSearch} onChange={(e) => setNotifSearch(e.target.value)}
                  placeholder="Buscar notificacion..."
                  className="w-full pl-7 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400" />
                {notifSearch && (
                  <button onClick={() => setNotifSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} weight="bold" />
                  </button>
                )}
              </div>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-auto styled-scroll"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
                  setNotifLimit((l) => l + 15);
                }
              }}>
              {(() => {
                const filtered = notifTab === 'new'
                  ? notifications.filter((n) => !n.archived)
                  : notifications.filter((n) => n.archived).filter((n) =>
                      !notifSearch || `${n.title} ${n.message}`.toLowerCase().includes(notifSearch.toLowerCase())
                    );
                const visible = filtered.slice(0, notifLimit);

                if (visible.length === 0) return (
                  <div className="py-8 text-center">
                    <Bell size={28} weight="duotone" className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">
                      {notifTab === 'new' ? 'Sin notificaciones' : notifSearch ? 'Sin resultados' : 'Sin archivadas'}
                    </p>
                  </div>
                );

                return visible.map((n) => {
                  const isDeleting = confirmDeleteNotif === n.id;
                  return (
                    <div key={n.id} className={`px-4 py-3 border-b last:border-0 transition-colors ${
                      isDark
                        ? `border-slate-700 hover:bg-slate-700 ${!n.archived ? 'bg-slate-800' : ''}`
                        : `border-gray-50 hover:bg-gray-50 ${!n.archived ? 'bg-blue-50/30' : ''}`
                    }`}>
                      {isDeleting ? (
                        /* Confirmación de eliminar */
                        <div className="space-y-2">
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Eliminar notificacion?</p>
                          <div className={`rounded-lg p-2 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                            <p className="text-[11px] font-semibold">{n.title}</p>
                            <p className="text-[10px] text-gray-500">{n.message}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">{new Date(n.timestamp).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmDeleteNotif(null)}
                              className="flex-1 py-1.5 text-[11px] border border-gray-200 rounded-lg hover:bg-gray-50">No</button>
                            <button onClick={() => { deleteNotif(n.id); setConfirmDeleteNotif(null); }}
                              className="flex-1 py-1.5 text-[11px] bg-red-500 text-white rounded-lg hover:bg-red-600">Eliminar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            n.type === 'stock' ? 'bg-amber-100 text-amber-600' :
                            n.type === 'cart' ? 'bg-blue-100 text-blue-600' :
                            n.type === 'sale' ? 'bg-green-100 text-green-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {n.type === 'stock' ? <Package size={16} weight="duotone" /> :
                             n.type === 'cart' ? <ShoppingCart size={16} weight="duotone" /> :
                             n.type === 'sale' ? <CurrencyDollar size={16} weight="duotone" /> :
                             <Info size={16} weight="duotone" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{n.title}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-gray-400">
                                {new Date(n.timestamp).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {n.link && (
                                <button onClick={() => { markRead(n.id); navigate(n.link!); setShowNotifs(false); }}
                                  className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 font-medium">
                                  <ArrowSquareOut size={10} /> Ver detalle
                                </button>
                              )}
                              {notifTab === 'new' && (
                                <button onClick={() => archiveNotif(n.id)}
                                  className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-600 font-medium">
                                  <Archive size={10} /> Archivar
                                </button>
                              )}
                              {notifTab === 'read' && (
                                <button onClick={() => setConfirmDeleteNotif(n.id)}
                                  className="inline-flex items-center gap-0.5 text-[10px] text-red-400 hover:text-red-500 font-medium">
                                  <Trash size={10} /> Eliminar
                                </button>
                              )}
                            </div>
                          </div>
                          {!n.read && !n.archived && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </Portal>)}
    </header>
  );
}
