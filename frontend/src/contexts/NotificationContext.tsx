import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import client from '../api/client';
import * as notifApi from '../api/notifications';
import type { ServerNotification, NotificationFilter, NotificationType as SrvType } from '../api/notifications';
import { getRootSocket } from '../lib/socket';

// Notificación local (frontend-only, cart/info ad-hoc)
interface PushNotification {
  id: string;
  type: 'stock' | 'cart' | 'sale' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  archived: boolean;
  link?: string;
}

interface NotificationContextType {
  alertCount: number;
  activeCartsCount: number;
  notifications: PushNotification[];
  unreadCount: number;
  pushEnabled: boolean;
  bellEnabled: boolean;
  // Server notifications
  serverNotifications: ServerNotification[];
  serverUnread: number;
  serverLoading: boolean;
  serverHasMore: boolean;
  serverFilter: NotificationFilter;
  setServerFilter: (f: NotificationFilter) => void;
  fetchServer: (reset?: boolean) => Promise<void>;
  loadMoreServer: () => Promise<void>;
  markServerRead: (id: number) => Promise<void>;
  markAllServerRead: () => Promise<void>;
  archiveServer: (id: number) => Promise<void>;
  unarchiveServer: (id: number) => Promise<void>;
  trashServer: (id: number) => Promise<void>;
  restoreServer: (id: number) => Promise<void>;
  permanentlyDeleteServer: (id: number) => Promise<void>;
  // Legacy local
  setActiveCartsCount: (n: number) => void;
  refresh: () => void;
  markAllRead: () => void;
  clearAll: () => void;
  togglePush: () => void;
  toggleBell: () => void;
  markRead: (id: string) => void;
  archiveNotif: (id: string) => void;
  deleteNotif: (id: string) => void;
  notify: (type: PushNotification['type'], title: string, message: string, link?: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  alertCount: 0,
  activeCartsCount: 0,
  notifications: [],
  unreadCount: 0,
  pushEnabled: true,
  bellEnabled: true,
  serverNotifications: [],
  serverUnread: 0,
  serverLoading: false,
  serverHasMore: false,
  serverFilter: 'all',
  setServerFilter: () => {},
  fetchServer: async () => {},
  loadMoreServer: async () => {},
  markServerRead: async () => {},
  markAllServerRead: async () => {},
  archiveServer: async () => {},
  unarchiveServer: async () => {},
  trashServer: async () => {},
  restoreServer: async () => {},
  permanentlyDeleteServer: async () => {},
  setActiveCartsCount: () => {},
  refresh: () => {},
  markAllRead: () => {},
  clearAll: () => {},
  togglePush: () => {},
  toggleBell: () => {},
  markRead: () => {},
  archiveNotif: () => {},
  deleteNotif: () => {},
  notify: () => {},
});

const PUSH_KEY = 'fameat-push-enabled';
const BELL_KEY = 'fameat-bell-enabled';
const NOTIF_KEY = 'fameat-notifications';
const MAX_NOTIFICATIONS = 50;

function requestNativePermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function getBusinessLogo(): string {
  try {
    const config = JSON.parse(localStorage.getItem('fameat-config-cache') || '{}');
    return config.business_logo || '/pwa/icons/icon-any-96.png';
  } catch { return '/pwa/icons/icon-any-96.png'; }
}

function getBusinessName(): string {
  try {
    const config = JSON.parse(localStorage.getItem('fameat-config-cache') || '{}');
    return config.business_name || 'POS';
  } catch { return 'POS'; }
}

function sendNativePush(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const logo = getBusinessLogo();
  try {
    new Notification(title, { body, icon: logo, badge: logo });
  } catch {}
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [alertCount, setAlertCount] = useState(0);
  const [activeCartsCount, setActiveCartsCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(PUSH_KEY) !== 'false');
  const [bellEnabled, setBellEnabled] = useState(() => localStorage.getItem(BELL_KEY) !== 'false');
  const [notifications, setNotifications] = useState<PushNotification[]>(() => {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { return []; }
  });
  const prevAlertCount = useRef(0);
  const prevCartsCount = useRef(0);

  // ---- Server notifications ----
  const [serverNotifications, setServerNotifications] = useState<ServerNotification[]>([]);
  const [serverUnread, setServerUnread] = useState(0);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [serverFilter, setServerFilter] = useState<NotificationFilter>('all');
  const cursorRef = useRef<string | null>(null);
  const filterRef = useRef<NotificationFilter>(serverFilter);
  filterRef.current = serverFilter;

  // Persistir notificaciones locales
  useEffect(() => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  }, [notifications]);

  useEffect(() => {
    if (pushEnabled) requestNativePermission();
  }, [pushEnabled]);

  const notify = useCallback((type: PushNotification['type'], title: string, message: string, link?: string) => {
    if (!pushEnabled && !bellEnabled && type !== 'info') return;
    if (bellEnabled || type === 'info') {
      const notif: PushNotification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type, title, message,
        timestamp: Date.now(),
        read: false,
        archived: false,
        link,
      };
      setNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
    }
    if (pushEnabled) sendNativePush(title, message);
  }, [pushEnabled, bellEnabled]);

  const refresh = useCallback(() => {
    if (!localStorage.getItem('token')) return;
    client.get('/inventory/alerts').then((r) => {
      const count = r.data.length;
      if (count > prevAlertCount.current && prevAlertCount.current > 0 && pushEnabled) {
        const diff = count - prevAlertCount.current;
        notify('stock', 'Stock bajo', `${diff} producto${diff > 1 ? 's' : ''} con stock bajo`, '/inventory');
      }
      prevAlertCount.current = count;
      setAlertCount(count);
    }).catch(() => {});
  }, [notify, pushEnabled]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener('stock-changed', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('stock-changed', refresh);
    };
  }, [refresh]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && activeCartsCount > 0 && pushEnabled) {
        const carts = JSON.parse(localStorage.getItem('fameat-carts') || '[[]]');
        const withItems = carts.filter((c: any[]) => c.length > 0).length;
        if (withItems > 0 && prevCartsCount.current === 0) {
          notify('cart', 'Carritos pendientes', `Tienes ${withItems} carrito${withItems > 1 ? 's' : ''} con productos`, '/');
        }
        prevCartsCount.current = withItems;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeCartsCount, notify, pushEnabled]);

  // ---- Server fetch ----
  const fetchServer = useCallback(async (reset = true) => {
    if (!localStorage.getItem('token')) return;
    setServerLoading(true);
    try {
      const res = await notifApi.list({
        filter: filterRef.current,
        cursor: reset ? null : cursorRef.current,
        limit: 30,
      });
      cursorRef.current = res.nextCursor;
      setServerHasMore(Boolean(res.nextCursor));
      setServerNotifications((prev) => reset ? res.items : [...prev, ...res.items]);
    } catch {
      // silencioso
    } finally {
      setServerLoading(false);
    }
  }, []);

  const loadMoreServer = useCallback(() => fetchServer(false), [fetchServer]);

  const refreshUnreadCount = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const c = await notifApi.unreadCount();
      setServerUnread(c);
    } catch {}
  }, []);

  // Refetch al cambiar filtro
  useEffect(() => {
    cursorRef.current = null;
    fetchServer(true);
  }, [serverFilter, fetchServer]);

  // Inicial: count + lista
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Socket.IO subscribe a notification:new
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    const socket = getRootSocket();
    if (!socket) return; // Demo mode - no WebSocket
    const onNew = (n: ServerNotification) => {
      setServerNotifications((prev) => {
        if (prev.find((x) => x.id === n.id)) return prev;
        return [n, ...prev];
      });
      setServerUnread((c) => c + 1);
      if (pushEnabled) sendNativePush(n.title, n.message);
      // NO duplicar en bell legacy: la notif ya esta en serverNotifications.
      // El panel del bell lee de ambos arrays. Si la duplicamos aqui aparece 2 veces.
    };
    socket.on('notification:new', onNew);
    return () => { socket.off('notification:new', onNew); };
  }, [pushEnabled, bellEnabled]);

  // ---- Server actions ----
  const updateInList = useCallback((updated: ServerNotification) => {
    setServerNotifications((prev) => prev.map((n) => n.id === updated.id ? updated : n));
  }, []);

  const markServerRead = useCallback(async (id: number) => {
    const updated = await notifApi.markRead(id);
    updateInList(updated);
    setServerUnread((c) => Math.max(0, c - 1));
  }, [updateInList]);

  const markAllServerRead = useCallback(async () => {
    await notifApi.markAllRead();
    setServerNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setServerUnread(0);
  }, []);

  const archiveServer = useCallback(async (id: number) => {
    const updated = await notifApi.archive(id);
    updateInList(updated);
  }, [updateInList]);

  const unarchiveServer = useCallback(async (id: number) => {
    const updated = await notifApi.unarchive(id);
    updateInList(updated);
  }, [updateInList]);

  const trashServer = useCallback(async (id: number) => {
    const updated = await notifApi.trash(id);
    updateInList(updated);
  }, [updateInList]);

  const restoreServer = useCallback(async (id: number) => {
    const updated = await notifApi.restore(id);
    updateInList(updated);
  }, [updateInList]);

  const permanentlyDeleteServer = useCallback(async (id: number) => {
    await notifApi.remove(id);
    setServerNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ---- Legacy local actions ----
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const archiveNotif = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, archived: true, read: true } : n));
  }, []);

  const deleteNotif = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const togglePush = useCallback(() => {
    setPushEnabled((v) => {
      const next = !v;
      localStorage.setItem(PUSH_KEY, String(next));
      if (next && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          sendNativePush(getBusinessName(), 'Notificaciones push activadas');
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') sendNativePush(getBusinessName(), 'Notificaciones push activadas');
          });
        }
      }
      return next;
    });
  }, []);

  const toggleBell = useCallback(() => {
    setBellEnabled((v) => {
      const next = !v;
      localStorage.setItem(BELL_KEY, String(next));
      return next;
    });
  }, []);

  // Solo cuenta notificaciones LOCALES no leídas (legacy bell). Las del server cuentan via serverUnread.
  // No sumar ambas a menos que estén separadas — antes daba doble conteo cuando el socket duplicaba.
  const localUnread = notifications.filter((n) => !n.archived && !n.read).length;
  const unreadCount = localUnread + serverUnread;

  return (
    <NotificationContext.Provider value={{
      alertCount, activeCartsCount, notifications, unreadCount, pushEnabled, bellEnabled,
      serverNotifications, serverUnread, serverLoading, serverHasMore, serverFilter,
      setServerFilter, fetchServer, loadMoreServer,
      markServerRead, markAllServerRead, archiveServer, unarchiveServer,
      trashServer, restoreServer, permanentlyDeleteServer,
      setActiveCartsCount, refresh, markAllRead, clearAll, togglePush, toggleBell,
      markRead, archiveNotif, deleteNotif, notify,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export type { ServerNotification, NotificationFilter, NotificationSort, NotificationScope } from '../api/notifications';
export type { SrvType as ServerNotificationType };
