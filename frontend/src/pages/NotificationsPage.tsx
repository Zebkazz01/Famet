import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Package, CurrencyDollar, Info, Warning,
  Calendar, Archive, Trash, ArrowCounterClockwise, CheckCircle,
  ArrowSquareOut, MagnifyingGlass, User as UserIcon, SortAscending, SortDescending,
} from '@phosphor-icons/react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import * as notifApi from '../api/notifications';
import type { ServerNotification, NotificationFilter, ServerNotificationType, NotificationSort, NotificationScope } from '../contexts/NotificationContext';
import client from '../api/client';
import {
  Card, Button, Badge, Input, Select, FilterPanel, Tabs, TabList, Tab, TabPanel, SkeletonListItem, DateRangePicker,
} from '../components/ui';
import type { DateRange } from '../components/ui';
import { useTableFilters } from '../hooks/useTableFilters';
import { PageHeader } from '../components/layout/PageHeader';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<ServerNotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  STOCK: { icon: Package, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  EXPIRY: { icon: Calendar, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  SALE: { icon: CurrencyDollar, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  WARNING: { icon: Warning, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  INFO: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  SYSTEM: { icon: Bell, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
};

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'STOCK', label: 'Stock' },
  { value: 'EXPIRY', label: 'Vencimiento' },
  { value: 'SALE', label: 'Ventas' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Advertencias' },
  { value: 'SYSTEM', label: 'Sistema' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguas' },
];

type TabValue = 'all' | 'new' | 'read' | 'archived' | 'trash';

const FILTER_BY_TAB: Record<TabValue, NotificationFilter> = {
  all: 'all',
  new: 'unread',
  read: 'read',
  archived: 'archived',
  trash: 'deleted',
};

interface PageFilters extends Record<string, any> {
  type: string;
  q: string;
  sort: NotificationSort;
  scope: NotificationScope;
  userId: string;
  range: DateRange;
}

interface UserOpt { id: number; username: string; firstName: string; lastName: string; role: string; }

export function NotificationsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { markAllServerRead } = useNotifications();

  const [tab, setTab] = useState<TabValue>('new');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { filters, setFilter, clear, activeCount } = useTableFilters<PageFilters>({
    type: '',
    q: '',
    sort: 'newest',
    scope: 'mine',
    userId: '',
    range: { from: '', to: '' },
  });

  // Lista local (no usar el cache del contexto para tener filtros independientes)
  const [items, setItems] = useState<ServerNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);

  // Usuarios para selector (sólo ADMIN)
  const [users, setUsers] = useState<UserOpt[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    client.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  }, [isAdmin]);

  const fetchPage = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const res = await notifApi.list({
        filter: FILTER_BY_TAB[tab],
        type: (filters.type || undefined) as any,
        q: filters.q || undefined,
        from: filters.range?.from || undefined,
        to: filters.range?.to || undefined,
        sort: filters.sort,
        scope: isAdmin ? filters.scope : 'mine',
        userId: isAdmin && filters.scope === 'all' && filters.userId ? filters.userId : undefined,
        cursor: reset ? null : cursorRef.current,
        limit: 30,
      });
      cursorRef.current = res.nextCursor;
      setHasMore(Boolean(res.nextCursor));
      setItems((prev) => reset ? res.items : [...prev, ...res.items]);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [tab, filters.type, filters.q, filters.range?.from, filters.range?.to, filters.sort, filters.scope, filters.userId, isAdmin]);

  useEffect(() => {
    cursorRef.current = null;
    fetchPage(true);
  }, [fetchPage]);

  const counts = useMemo(() => ({
    all: items.length,
    new: items.filter((n) => !n.read && !n.archived && !n.deleted).length,
    read: items.filter((n) => n.read && !n.archived && !n.deleted).length,
    archived: items.filter((n) => n.archived && !n.deleted).length,
    trash: items.filter((n) => n.deleted).length,
  }), [items]);

  const updateLocal = (updated: ServerNotification) => {
    setItems((prev) => prev.map((n) => n.id === updated.id ? updated : n));
  };

  async function handleMarkRead(id: number) {
    try { updateLocal(await notifApi.markRead(id)); } catch (e: any) { toast.error(e?.response?.data?.error || 'Error'); }
  }
  async function handleArchive(id: number) {
    try { updateLocal(await notifApi.archive(id)); } catch (e: any) { toast.error(e?.response?.data?.error || 'Error'); }
  }
  async function handleUnarchive(id: number) {
    try { updateLocal(await notifApi.unarchive(id)); } catch (e: any) { toast.error(e?.response?.data?.error || 'Error'); }
  }
  async function handleTrash(id: number) {
    try { updateLocal(await notifApi.trash(id)); } catch (e: any) { toast.error(e?.response?.data?.error || 'Error'); }
  }
  async function handleRestore(id: number) {
    try { updateLocal(await notifApi.restore(id)); } catch (e: any) { toast.error(e?.response?.data?.error || 'Error'); }
  }
  async function confirmPermanent(id: number) {
    try {
      await notifApi.remove(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      toast.success('Eliminada permanentemente');
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error');
    }
  }
  async function handleMarkAllRead() {
    try {
      await markAllServerRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('Todas marcadas como leídas');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error');
    }
  }

  function openLink(n: ServerNotification) {
    if (!n.read) handleMarkRead(n.id);
    if (n.link) navigate(n.link);
  }

  function timeFmt(iso: string): string {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function userLabel(u?: ServerNotification['user']) {
    if (!u) return 'Global';
    const fn = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return fn || u.username;
  }

  const userOptions = useMemo(() => ([
    { value: '', label: 'Todos los usuarios' },
    ...users.map((u) => ({
      value: String(u.id),
      label: `${u.firstName} ${u.lastName} (${u.username}) — ${u.role}`,
    })),
  ]), [users]);

  const scopeOptions = [
    { value: 'mine', label: 'Mis notificaciones + Globales' },
    { value: 'all', label: 'Todas (admin)' },
  ];

  return (
    <div className="flex-1 overflow-auto styled-scroll p-4 md:p-6 space-y-4">
      <PageHeader
        icon={<Bell size={24} weight="duotone" />}
        title="Notificaciones"
        description={`Centro de alertas del sistema: stock bajo, productos por vencer, ventas registradas, ajustes de inventario, cierres de caja y eventos importantes. Filtra por tipo, fecha o usuario y archiva las que ya leíste.${isAdmin && filters.scope === 'all' ? ' Modo admin: viendo notificaciones de todos los usuarios.' : ''}`}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              iconLeft={<CheckCircle size={14} weight="duotone" />}
              onClick={handleMarkAllRead}
              disabled={counts.new === 0}
            >
              Marcar todas leídas
            </Button>
            <Button
              size="sm"
              variant="ghost"
              iconLeft={<ArrowCounterClockwise size={14} />}
              onClick={() => fetchPage(true)}
              loading={loading}
            >
              Refrescar
            </Button>
          </>
        }
      />

      <FilterPanel storageKey="notifications"
        activeCount={activeCount}
        onClear={clear}
        chips={[
          ...(filters.type ? [{ key: 'type', label: `Tipo: ${TYPE_OPTIONS.find((o) => o.value === filters.type)?.label}`, onRemove: () => setFilter('type', '') }] : []),
          ...(filters.q ? [{ key: 'q', label: `Búsqueda: "${filters.q}"`, onRemove: () => setFilter('q', '') }] : []),
          ...(filters.sort !== 'newest' ? [{ key: 'sort', label: 'Orden: Más antiguas', onRemove: () => setFilter('sort', 'newest') }] : []),
          ...(filters.range?.from || filters.range?.to ? [{ key: 'range', label: `Fecha: ${filters.range.from || '...'} → ${filters.range.to || '...'}`, onRemove: () => setFilter('range', { from: '', to: '' }) }] : []),
          ...(isAdmin && filters.scope === 'all' ? [{ key: 'scope', label: 'Alcance: Todas', onRemove: () => setFilter('scope', 'mine') }] : []),
          ...(isAdmin && filters.userId ? [{ key: 'userId', label: `Usuario: ${users.find((u) => String(u.id) === filters.userId)?.username || filters.userId}`, onRemove: () => setFilter('userId', '') }] : []),
        ]}
      >
        <Input
          label="Buscar"
          placeholder="Título o mensaje..."
          value={filters.q}
          onChange={(e) => setFilter('q', e.target.value)}
          prefix={<MagnifyingGlass size={14} />}
        />
        <Select
          label="Tipo"
          icon={<Bell size={14} weight="duotone" />}
          placeholder="Selecciona tipo"
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(e) => setFilter('type', e.target.value)}
        />
        <Select
          label="Orden"
          icon={filters.sort === 'newest' ? <SortDescending size={14} weight="duotone" /> : <SortAscending size={14} weight="duotone" />}
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(e) => setFilter('sort', e.target.value as NotificationSort)}
        />
        <DateRangePicker
          label="Rango de fechas"
          value={filters.range}
          onChange={(r) => setFilter('range', r)}
        />
        {isAdmin && (
          <Select
            label="Alcance"
            icon={<UserIcon size={14} weight="duotone" />}
            options={scopeOptions}
            value={filters.scope}
            onChange={(e) => setFilter('scope', e.target.value as NotificationScope)}
          />
        )}
        {isAdmin && filters.scope === 'all' && (
          <Select
            label="Usuario"
            icon={<UserIcon size={14} weight="duotone" />}
            options={userOptions}
            value={filters.userId}
            onChange={(e) => setFilter('userId', e.target.value)}
          />
        )}
      </FilterPanel>

      <Card id="notifs-tabs" padding="none">
        <Tabs value={tab} onChange={(v) => setTab(v as TabValue)}>
          <TabList className="px-3 overflow-x-auto styled-scroll">
            <Tab value="all">
              Todas {counts.all > 0 && <Badge variant="blue" size="xs" className="ml-1">{counts.all}</Badge>}
            </Tab>
            <Tab value="new">
              Nuevas {counts.new > 0 && <Badge variant="red" size="xs" className="ml-1">{counts.new}</Badge>}
            </Tab>
            <Tab value="read">
              Leídas {counts.read > 0 && <Badge variant="gray" size="xs" className="ml-1">{counts.read}</Badge>}
            </Tab>
            <Tab value="archived">
              Archivadas {counts.archived > 0 && <Badge variant="gray" size="xs" className="ml-1">{counts.archived}</Badge>}
            </Tab>
            <Tab value="trash">
              Papelera {counts.trash > 0 && <Badge variant="amber" size="xs" className="ml-1">{counts.trash}</Badge>}
            </Tab>
          </TabList>

          {(['all', 'new', 'read', 'archived', 'trash'] as TabValue[]).map((t) => (
            <TabPanel key={t} value={t}>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading && items.length === 0 && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="px-4 py-3"><SkeletonListItem /></li>
                  ))
                )}
                {!loading && items.length === 0 && (
                  <li className="py-12 text-center">
                    <Bell size={36} weight="duotone" className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {t === 'all' ? 'No hay notificaciones' :
                       t === 'new' ? 'No hay notificaciones nuevas' :
                       t === 'read' ? 'No hay notificaciones leídas' :
                       t === 'archived' ? 'No hay archivadas' : 'Papelera vacía'}
                    </p>
                  </li>
                )}
                {items.map((n) => {
                  const meta = TYPE_ICONS[n.type] || TYPE_ICONS.SYSTEM;
                  const Icon = meta.icon;
                  return (
                    <li key={n.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${!n.read && !n.archived && !n.deleted ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                        <Icon size={20} weight="duotone" className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              {n.title}
                              {!n.read && !n.archived && !n.deleted && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              )}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{n.message}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={
                              n.type === 'STOCK' ? 'amber' :
                              n.type === 'EXPIRY' ? 'orange' :
                              n.type === 'SALE' ? 'green' :
                              n.type === 'WARNING' ? 'red' :
                              n.type === 'INFO' ? 'blue' : 'gray'
                            } size="xs">
                              {n.type}
                            </Badge>
                            {isAdmin && filters.scope === 'all' && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                                <UserIcon size={10} weight="duotone" /> {userLabel(n.user)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                          <span className="text-gray-400">{timeFmt(n.createdAt)}</span>
                          {n.link && (
                            <button onClick={() => openLink(n)}
                              className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline">
                              <ArrowSquareOut size={11} /> Ver detalle
                            </button>
                          )}
                          {/* Acciones disponibles según estado de la notif (independiente del tab) */}
                          {!n.deleted && !n.read && (
                            <button onClick={() => handleMarkRead(n.id)}
                              className="inline-flex items-center gap-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                              <CheckCircle size={11} /> Marcar leída
                            </button>
                          )}
                          {!n.deleted && !n.archived && (
                            <button onClick={() => handleArchive(n.id)}
                              className="inline-flex items-center gap-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                              <Archive size={11} /> Archivar
                            </button>
                          )}
                          {!n.deleted && n.archived && (
                            <button onClick={() => handleUnarchive(n.id)}
                              className="inline-flex items-center gap-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                              <ArrowCounterClockwise size={11} /> Desarchivar
                            </button>
                          )}
                          {!n.deleted && (
                            <button onClick={() => handleTrash(n.id)}
                              className="inline-flex items-center gap-0.5 text-amber-600 hover:text-amber-700">
                              <Trash size={11} /> A papelera
                            </button>
                          )}
                          {n.deleted && (
                            <>
                              <button onClick={() => handleRestore(n.id)}
                                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700">
                                <ArrowCounterClockwise size={11} /> Restaurar
                              </button>
                              {confirmDelete === n.id ? (
                                <span className="inline-flex items-center gap-1 ml-1">
                                  <span className="text-red-500 dark:text-red-400 font-medium">¿Eliminar definitivamente?</span>
                                  <button onClick={() => confirmPermanent(n.id)}
                                    className="px-1.5 py-0.5 rounded-lg bg-red-500 text-white text-[10px] hover:bg-red-600">Sí</button>
                                  <button onClick={() => setConfirmDelete(null)}
                                    className="px-1.5 py-0.5 rounded-lg bg-gray-200 dark:bg-slate-700 text-[10px]">No</button>
                                </span>
                              ) : (
                                <button onClick={() => setConfirmDelete(n.id)}
                                  className="inline-flex items-center gap-0.5 text-red-500 hover:text-red-700">
                                  <Trash size={11} /> Eliminar permanente
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <div className="px-4 py-3 text-center border-t border-gray-100 dark:border-gray-700">
                  <Button size="sm" variant="ghost" onClick={() => fetchPage(false)} loading={loading}>
                    Cargar más
                  </Button>
                </div>
              )}
            </TabPanel>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}
