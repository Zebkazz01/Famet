import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime, formatQty } from '../utils/formatters';
import { getBusinessDayDate } from '../utils/businessDay';
import toast from 'react-hot-toast';
import { ChartBar, Receipt, Eye, X, ShoppingBag, CurrencyDollar, CreditCard, Money, Funnel, SortAscending, Wallet, Trash, Cow, Heart } from '@phosphor-icons/react';
import { Portal } from '../components/Portal';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatsCards } from '../components/StatsCards';
import { PageSkeleton } from '../components/PageSkeleton';
import { PageHeader } from '../components/layout/PageHeader';
import { ErrorView } from '../components/ErrorBoundary';
import { ViewToggle } from '../components/ViewToggle';
import { FilterDropdown, RefreshButton, DateRangePicker, Combobox } from '../components/ui';
import { useTableFilters } from '../hooks/useTableFilters';
import { useModalEscape } from '../contexts/ModalStackContext';

interface Sale {
  id: number;
  total: string;
  paymentMethod: string;
  isCredit?: boolean;
  creditBalance?: string;
  customerId?: number | null;
  customer?: { id: number; name: string } | null;
  corrected?: boolean;
  correctionReason?: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
  _count: { items: number };
  productNames: string;
  animalTypes?: string[];
}

interface SaleDetail {
  id: number;
  total: string;
  subtotal: string;
  paymentMethod: string;
  amountPaid: string;
  changeAmount: string;
  discountTotal?: string;
  isCredit?: boolean;
  creditBalance?: string;
  customerId?: number | null;
  customer?: { id: number; name: string; currentDebt: string } | null;
  corrected: boolean;
  correctionReason: string | null;
  correctedBy: number | null;
  correctedAt: string | null;
  createdAt: string;
  userId: number;
  user: { firstName: string; lastName: string };
  items: Array<{
    id?: number;
    quantity: string;
    unitPrice: string;
    subtotal: string;
    isSubUnit?: boolean;
    product: {
      id?: number;
      name: string;
      saleType: string;
      weightUnit?: string;
      subUnitName?: string;
      imageUrl?: string | null;
      category?: { name: string; color?: string };
    };
  }>;
}

interface Summary {
  totalSales: number;
  totalRevenue: string;
  topProducts: Array<{ name: string; qty: string; revenue: string }>;
  byPayment: { CASH: string; CARD: string; TRANSFER: string };
}

export function SalesPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const requestId = useRef(0);
  const { filters, setFilter, clear: _clear, activeCount } = useTableFilters<{ range: { from?: string; to?: string }; paymentMethod: string; corrected: string; sort: string; animalType: string }>({
    range: { from: '', to: '' },
    paymentMethod: '',
    corrected: '',
    sort: 'recent',
    animalType: '',
  });
  // Vacío = todas las ventas (sin filtro de fecha)
  const dateFrom = filters.range.from || '';
  const dateTo = filters.range.to || '';

  // Correction state
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');

  useModalEscape(detail ? () => closeDetail() : null);
  useModalEscape(showCorrection ? () => setShowCorrection(false) : null);

  const showSummary = hasRole('ADMIN', 'SUPERVISOR');

  const load = useCallback((from?: string, to?: string, animalType?: string) => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      client.get('/sales', { params: { ...(from ? { from } : {}), ...(to ? { to } : {}), ...(animalType ? { animalType } : {}), limit: 500 } }).then((r) => {
        if (id === requestId.current) setSales(r.data);
      }),
      showSummary ? client.get(`/sales/summary?date=${from || getBusinessDayDate()}`).then((r) => {
        if (id === requestId.current) setSummary(r.data);
      }).catch(() => {}) : Promise.resolve(),
    ]).catch((err) => {
      if (id === requestId.current) setLoadError(err);
    }).finally(() => {
      if (id === requestId.current) setLoading(false);
    });
  }, [showSummary]);

  useEffect(() => { load(dateFrom, dateTo, filters.animalType); }, [dateFrom, dateTo, filters.animalType, load]);

  const viewDetail = async (id: number) => {
    const { data } = await client.get(`/sales/${id}`);
    setDetail(data);
    setShowCorrection(false);
    setCorrectionReason('');
  };

  // Abrir detail desde notif: /sales?saleId=123 — reactivo a cambios y evita re-fetch si ya está abierto
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const saleId = searchParams.get('saleId');
    if (saleId) {
      const id = Number(saleId);
      if (!detail || detail.id !== id) {
        viewDetail(id).catch(() => toast.error('Venta no encontrada'));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const closeDetail = () => {
    setDetail(null);
    setShowCorrection(false);
    setCorrectionReason('');
    if (searchParams.get('saleId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('saleId');
      setSearchParams(next, { replace: true });
    }
  };

  const downloadTicket = (id: number) => {
    const token = localStorage.getItem('token');
    window.open(`/api/sales/${id}/ticket?token=${token}`, '_blank');
  };

  const submitCorrection = async () => {
    if (!detail) return;
    if (!correctionReason.trim()) return toast.error('El motivo es obligatorio');
    try {
      await client.patch(`/sales/${detail.id}/correct`, { correctionReason: correctionReason.trim() });
      toast.success('Venta marcada como corregida');
      setShowCorrection(false);
      setCorrectionReason('');
      // Reload detail and list
      viewDetail(detail.id);
      load(dateFrom, dateTo);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al corregir');
    }
  };

  const handleDeleteSale = async () => {
    if (!confirmDelete) return;
    try {
      await client.delete(`/sales/${confirmDelete}`);
      toast.success('Venta anulada exitosamente');
      setDetail(null);
      setConfirmDelete(null);
      load(dateFrom, dateTo);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al anular venta');
      setConfirmDelete(null);
    }
  };

  const canCorrect = (sale: SaleDetail) => {
    if (sale.corrected) return false;
    if (hasRole('ADMIN', 'SUPERVISOR')) return true;
    // VENDEDOR can only correct own sales
    return hasRole('VENDEDOR') && sale.userId === user?.id;
  };

  const payMethodLabel: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transfer.' };

  const fiadoStats = useMemo(() => {
    const creditSales = sales.filter(s => s.isCredit);
    const totalFiado = creditSales.reduce((sum, s) => sum + Number(s.creditBalance || 0), 0);
    const byCustomer = new Map<number, { name: string; total: number }>();
    for (const s of creditSales) {
      if (!s.customer) continue;
      const existing = byCustomer.get(s.customer.id);
      if (existing) existing.total += Number(s.creditBalance || 0);
      else byCustomer.set(s.customer.id, { name: s.customer.name, total: Number(s.creditBalance || 0) });
    }
    const topDebtor = [...byCustomer.values()].sort((a, b) => b.total - a.total)[0];
    return { totalFiado, topDebtor: topDebtor || null };
  }, [sales]);

  const meatStats = useMemo(() => {
    const resSales = sales.filter(s => s.animalTypes?.includes('RES'));
    const cerdoSales = sales.filter(s => s.animalTypes?.includes('CERDO'));
    const totalRes = resSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const totalCerdo = cerdoSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    return { totalRes, totalCerdo, resCount: resSales.length, cerdoCount: cerdoSales.length };
  }, [sales]);

  if (loading) return <PageSkeleton type="table" />;
  if (loadError) return <ErrorView error={loadError} onRetry={() => { setLoadError(null); setLoading(true); }} />;

  const salesFilters = (
    <>
      <DateRangePicker label="Rango de fechas" value={filters.range} onChange={(v) => setFilter('range', v)} />
      <Combobox
        label="Tipo de carne"
        icon={<Cow size={14} weight="duotone" />}
        placeholder="Selecciona tipo"
        options={[
          { value: '', label: 'Todos' },
          { value: 'RES', label: 'Res' },
          { value: 'CERDO', label: 'Cerdo' },
        ]}
        value={filters.animalType}
        onChange={(v) => setFilter('animalType', (v as string) || '')}
      />
      <Combobox
        label="Método de pago"
        icon={<Wallet size={14} weight="duotone" />}
        placeholder="Selecciona método"
        options={[
          { value: '', label: 'Todos' },
          { value: 'CASH', label: 'Efectivo' },
          { value: 'CARD', label: 'Tarjeta' },
          { value: 'TRANSFER', label: 'Transferencia' },
        ]}
        value={filters.paymentMethod}
        onChange={(v) => setFilter('paymentMethod', (v as string) || '')}
      />
      <Combobox
        label="Estado"
        icon={<Funnel size={14} weight="duotone" />}
        placeholder="Selecciona estado"
        options={[
          { value: '', label: 'Todas' },
          { value: 'yes', label: 'Corregidas' },
          { value: 'no', label: 'Sin corregir' },
        ]}
        value={filters.corrected}
        onChange={(v) => setFilter('corrected', (v as string) || '')}
      />
      <Combobox
        label="Ordenar por"
        icon={<SortAscending size={14} weight="duotone" />}
        options={[
          { value: 'recent', label: 'Más reciente' },
          { value: 'oldest', label: 'Más antiguo' },
          { value: 'totalDesc', label: 'Monto mayor a menor' },
          { value: 'totalAsc', label: 'Monto menor a mayor' },
        ]}
        value={filters.sort}
        onChange={(v) => setFilter('sort', (v as string) || 'recent')}
        clearable={false}
      />
    </>
  );

  const salesChips = [
    ...(filters.range.from || filters.range.to ? [{ key: 'date', label: `${filters.range.from || '...'} → ${filters.range.to || '...'}`, onRemove: () => setFilter('range', {}) }] : []),
    ...(filters.animalType ? [{ key: 'at', label: filters.animalType === 'RES' ? 'Res' : 'Cerdo', onRemove: () => setFilter('animalType', '') }] : []),
    ...(filters.paymentMethod ? [{ key: 'pm', label: filters.paymentMethod, onRemove: () => setFilter('paymentMethod', '') }] : []),
    ...(filters.corrected ? [{ key: 'c', label: filters.corrected === 'yes' ? 'Corregidas' : 'Sin corregir', onRemove: () => setFilter('corrected', '') }] : []),
  ];

  return (
    <div className="p-3 md:p-6">
      <PageHeader
        icon={<ChartBar size={24} weight="duotone" />}
        title="Historial de Ventas"
        description="Consulta todas las ventas realizadas con filtros por fecha, método de pago y usuario."
        actions={
          <>
            <button onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium">
              <Receipt size={14} weight="duotone" /> Nueva Venta
            </button>
            <FilterDropdown
              activeCount={activeCount}
              onClear={() => { setFilter('range', {}); setFilter('paymentMethod', ''); setFilter('corrected', ''); setFilter('sort', 'recent'); setFilter('animalType', ''); }}
              chips={salesChips}
              storageKey="sales"
            >
              {salesFilters}
            </FilterDropdown>
          </>
        }
      />

      <StatsCards cards={[
        { label: 'Ventas', value: sales.length, icon: <ShoppingBag size={20} weight="duotone" />, color: 'bg-blue-100 text-blue-600' },
        { label: 'Ingresos', value: formatCurrency(sales.reduce((s, v) => s + parseFloat(v.total), 0)), icon: <CurrencyDollar size={20} weight="duotone" />, color: 'bg-green-100 text-green-600' },
        { label: 'Res', value: formatCurrency(meatStats.totalRes), icon: <Heart size={20} weight="duotone" />, color: 'bg-red-100 text-red-600', sub: `${meatStats.resCount} ventas` },
        { label: 'Cerdo', value: formatCurrency(meatStats.totalCerdo), icon: <Cow size={20} weight="duotone" />, color: 'bg-amber-100 text-amber-600', sub: `${meatStats.cerdoCount} ventas` },
      ]} />

      {/* Lista de ventas */}
      <div id="sales-list" className="bg-white rounded-xl shadow p-4">
        <ViewToggle storageKey="sales" searchInputProps={{ 'data-search-input': '' }}
          refreshSlot={<RefreshButton onClick={() => load(dateFrom, dateTo)} loading={loading} />}
          totalCount={sales.length}
          data={sales.filter((s) => {
            if (filters.paymentMethod && s.paymentMethod !== filters.paymentMethod) return false;
            if (filters.corrected === 'yes' && !s.corrected) return false;
            if (filters.corrected === 'no' && s.corrected) return false;
            return true;
          }).sort((a, b) => {
            const s = filters.sort || 'recent';
            if (s === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (s === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (s === 'totalDesc') return parseFloat(b.total) - parseFloat(a.total);
            if (s === 'totalAsc') return parseFloat(a.total) - parseFloat(b.total);
            return 0;
          })}
          keyField="id"
          searchFilter={(s, q) => `${s.id}`.includes(q) || `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.toLowerCase().includes(q) || s.productNames.toLowerCase().includes(q)}
          searchPlaceholder="Buscar por #, cajero o producto..."
          cardTitle={(s) => <span className="cursor-pointer" onClick={() => viewDetail(s.id)}>Venta #{s.id}</span>}
          cardSubtitle={(s) => formatDateTime(s.createdAt)}
          cardBadge={(s) => {
            if (s.isCredit) {
              const paid = Number(s.creditBalance || 0) <= 0;
              return (
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {paid ? 'Fiado · Pagada' : 'Fiado'}
                </span>
              );
            }
            return (
              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                s.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' :
                s.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>{payMethodLabel[s.paymentMethod]}</span>
            );
          }}
          cardActions={(s) => (
            <>
              <button onClick={() => viewDetail(s.id)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                <Eye size={14} weight="duotone" /> Detalle
              </button>
              <button onClick={() => downloadTicket(s.id)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                <Receipt size={14} weight="duotone" /> Ticket
              </button>
            </>
          )}
          columns={[
            { key: 'id', label: '#', render: (s) => <span className="cursor-pointer text-blue-600" onClick={() => viewDetail(s.id)}>{s.id}</span>, cardHidden: true },
            { key: 'date', label: 'Fecha', render: (s) => formatDateTime(s.createdAt), cardHidden: true },
            { key: 'cashier', label: 'Cajero', render: (s) => `${s.user.firstName} ${s.user.lastName}` },
            { key: 'items', label: 'Items', render: (s) => s._count?.items ?? 0 },
            { key: 'payment', label: 'Pago', render: (s) => {
              if (s.isCredit) {
                const paid = Number(s.creditBalance || 0) <= 0;
                return (
                  <span className="inline-flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {paid ? 'Fiado · Pagada' : 'Fiado'}
                    </span>
                    {s.customer && <span className="text-[10px] text-gray-500">{s.customer.name}</span>}
                  </span>
                );
              }
              return payMethodLabel[s.paymentMethod];
            }, cardHidden: true },
            { key: 'total', label: 'Total', render: (s) => (
              <div className="flex flex-col items-end">
                <span className="font-bold">{formatCurrency(s.total)}</span>
                {s.isCredit && Number(s.creditBalance || 0) > 0 && (
                  <span className="text-[10px] text-amber-600 font-mono">debe {formatCurrency(s.creditBalance || 0)}</span>
                )}
              </div>
            ) },
            { key: 'status', label: 'Estado', render: (s) => s.corrected ? <span className="px-2 py-0.5 rounded-lg text-xs bg-yellow-100 text-yellow-700">Corregida</span> : null },
            { key: 'actions', label: 'Acciones', render: (s) => (
              <button onClick={(e) => { e.stopPropagation(); downloadTicket(s.id); }} className="text-blue-600 hover:underline text-xs">Ticket</button>
            ), cardHidden: true },
          ]}
          emptyMessage="Sin ventas en este período"
        />
      </div>

      {/* Modal detalle — diseño limpio con secciones, no amontonado */}
      {detail && (<Portal>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 md:p-4" onClick={closeDetail}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* HEADER */}
            <div className="px-5 py-4 bg-gradient-to-br from-red-50 via-white to-red-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Receipt size={22} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                    Venta #{detail.id}
                  </h3>
<p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap mt-0.5">
	                        <span>{formatDateTime(detail.createdAt)}</span>
	                        <span className="text-gray-300">·</span>
	                        <span>{detail.user?.firstName ?? ''} {detail.user?.lastName ?? ''}</span>
	                      </p>
                </div>
              </div>
              <button onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Status pill row (correction) */}
            {detail.corrected && (
              <div className="px-5 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-900/40">
                <div className="flex items-start gap-2">
                  <Receipt size={18} weight="duotone" className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-yellow-800 dark:text-yellow-300">Venta corregida</p>
                    <p className="text-yellow-700 dark:text-yellow-400 mt-0.5">{detail.correctionReason}</p>
                    {detail.correctedAt && (
                      <p className="text-yellow-600/70 dark:text-yellow-400/70 mt-0.5">
                        {formatDateTime(detail.correctedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Banner FIADO */}
            {detail.isCredit && (() => {
              const balance = Number(detail.creditBalance || 0);
              const paid = balance <= 0;
              return (
                <div className={`px-5 py-3 border-b ${paid ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/40' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/40'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${paid ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                      <CreditCard size={18} weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${paid ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
                        {paid ? 'Venta a crédito · PAGADA' : 'Venta a crédito · PENDIENTE'}
                      </p>
                      <p className="text-xs mt-0.5">
                        {detail.customer && <><span className="font-semibold">Cliente:</span> {detail.customer.name}</>}
                        {!paid && (
                          <>
                            <span className="mx-1.5 text-gray-300">·</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-400">Saldo pendiente: {formatCurrency(detail.creditBalance || 0)}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* BODY — scrolleable */}
            <div className="flex-1 overflow-auto styled-scroll">
              {/* Mini-stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Productos</p>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">{detail.items?.length ?? 0}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Unidades</p>
<p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
	                    {detail.items?.reduce((s, i) => s + parseFloat(i.quantity), 0).toFixed(2) ?? '0'}
	                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Pago</p>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5 flex items-center gap-1">
                    {detail.paymentMethod === 'CASH' && <Money size={14} weight="duotone" className="text-green-600" />}
                    {detail.paymentMethod === 'CARD' && <CreditCard size={14} weight="duotone" className="text-blue-600" />}
                    {detail.paymentMethod === 'TRANSFER' && <Wallet size={14} weight="duotone" className="text-purple-600" />}
                    {payMethodLabel[detail.paymentMethod]}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Total</p>
                  <p className="text-base font-bold text-green-600 mt-0.5">{formatCurrency(detail.total)}</p>
                </div>
              </div>

              {/* Items table */}
              <div className="px-4 py-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <ShoppingBag size={14} weight="duotone" /> Productos vendidos
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500 tracking-wide">Producto</th>
                        <th className="text-right px-2 py-2 text-[10px] font-bold uppercase text-gray-500 tracking-wide">Cant.</th>
                        <th className="text-right px-2 py-2 text-[10px] font-bold uppercase text-gray-500 tracking-wide hidden sm:table-cell">Precio</th>
                        <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-gray-500 tracking-wide">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {detail.items?.map((item, i) => {
                        const unitLabel = item.isSubUnit
                          ? (item.product.subUnitName || 'ud')
                          : item.product.saleType === 'WEIGHT'
                            ? (item.product.weightUnit || 'kg')
                            : 'ud';
                        return (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {item.product.imageUrl ? (
                                  <img src={item.product.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <ShoppingBag size={14} className="text-gray-300" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.product.name}</p>
                                  {item.product.category?.name && (
                                    <p className="text-[10px] text-gray-400">{item.product.category.name}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-right px-2 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap">
                              {formatQty(item.quantity)} {unitLabel}
                            </td>
                            <td className="text-right px-2 py-2.5 font-mono text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="text-right px-3 py-2.5 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales detallados */}
              <div className="px-4 pb-3">
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-1.5 text-sm">
                  {detail.subtotal && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatCurrency(detail.subtotal)}</span>
                    </div>
                  )}
                  {detail.discountTotal && parseFloat(detail.discountTotal) > 0 && (
                    <div className="flex justify-between text-purple-600 dark:text-purple-400">
                      <span>Descuentos</span>
                      <span className="font-mono">- {formatCurrency(detail.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-1.5">
                    <span>TOTAL</span>
                    <span className="text-green-600 font-mono">{formatCurrency(detail.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs">
                    <span>Pagado ({payMethodLabel[detail.paymentMethod]})</span>
                    <span className="font-mono">{formatCurrency(detail.amountPaid)}</span>
                  </div>
                  {parseFloat(detail.changeAmount) > 0 && (
                    <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs">
                      <span>Cambio entregado</span>
                      <span className="font-mono">{formatCurrency(detail.changeAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sección de corrección (formulario) */}
              {canCorrect(detail) && showCorrection && (
                <div className="px-4 pb-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/40 rounded-lg p-3 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wide text-yellow-800 dark:text-yellow-300">
                      Motivo de la corrección *
                    </label>
                    <textarea
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-900/60 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      rows={3}
                      placeholder="Describe por qué se está corrigiendo esta venta..."
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowCorrection(false); setCorrectionReason(''); }}
                        className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">
                        Cancelar
                      </button>
                      <button onClick={submitCorrection}
                        className="px-3 py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                        Confirmar corrección
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER — acciones */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between gap-2 flex-wrap">
              <button onClick={() => {
                navigator.clipboard?.writeText(String(detail.id));
                toast.success(`ID #${detail.id} copiado`);
              }}
                className="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1">
                Copiar ID
              </button>
              <div className="flex items-center gap-2">
                {hasRole('ADMIN') && !detail.corrected && (
                  <button onClick={() => setConfirmDelete(detail.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-red-100 border border-red-300 text-red-700 rounded-lg hover:bg-red-200 inline-flex items-center gap-1.5">
                    <Trash size={14} weight="duotone" /> Anular venta
                  </button>
                )}
                {hasRole('ADMIN') && detail.corrected && (
                  <button onClick={() => setConfirmDelete(detail.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-red-100 border border-red-300 text-red-700 rounded-lg hover:bg-red-200 inline-flex items-center gap-1.5">
                    <Trash size={14} weight="duotone" /> Eliminar venta
                  </button>
                )}
                {canCorrect(detail) && !showCorrection && (
                  <button onClick={() => setShowCorrection(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-700 border border-yellow-400 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 inline-flex items-center gap-1.5">
                    Marcar como corregida
                  </button>
                )}
                <button onClick={() => downloadTicket(detail.id)}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5">
                  <Receipt size={14} weight="duotone" /> Descargar ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      </Portal>)}

      <ConfirmModal
        open={confirmDelete !== null}
        title={detail?.corrected ? 'Eliminar venta' : 'Anular venta'}
        message={detail?.corrected
          ? 'Esta venta ya está anulada. Se eliminará permanentemente de la base de datos. ¿Estás seguro?'
          : 'Esta acción restaurará el stock de todos los productos de la venta y eliminará el registro permanentemente. ¿Estás seguro?'}
        variant="danger"
        confirmText={detail?.corrected ? 'Eliminar' : 'Anular y eliminar'}
        onConfirm={handleDeleteSale}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
