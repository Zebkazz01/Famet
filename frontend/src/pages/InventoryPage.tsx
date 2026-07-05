import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { formatDateTime, formatQty } from '../utils/formatters';
import toast from 'react-hot-toast';
import { MOVEMENT_TYPES } from '../utils/constants';
import { ClipboardText, Plus, X, Eye, ArrowSquareOut, ArrowDown as ArrowDownIcon, ArrowUp as ArrowUpIcon, WarningCircle, Swap, Barcode, Funnel, Package as PackageIcon, SortAscending, CurrencyDollar } from '@phosphor-icons/react';
import { StatsCards } from '../components/StatsCards';
import { PageSkeleton } from '../components/PageSkeleton';
import { ErrorView } from '../components/ErrorBoundary';
import { Portal } from '../components/Portal';
import { ViewToggle } from '../components/ViewToggle';
import { StockBadge } from '../utils/stockHelpers';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useBarcodeResolver } from '../hooks/useBarcodeResolver';
import { PageHeader } from '../components/layout/PageHeader';
import { BarcodeConflictModal } from '../components/inventory/BarcodeConflictModal';
import { FilterPanel, Select, Combobox, Input, Textarea, Button, DateRangePicker } from '../components/ui';
import { useTableFilters } from '../hooks/useTableFilters';

interface Product {
  id: number;
  name: string;
  stockQty: string;
  minStock: string;
  saleType?: string;
}

interface Movement {
  id: number;
  type: string;
  quantity: string;
  previousQty: string;
  newQty: string;
  notes: string | null;
  createdAt: string;
  product: { name: string };
  user?: { firstName: string; lastName: string } | null;
  saleId?: number | null;
  unitCost?: string | null;
  totalValue?: string | null;
}

export function InventoryPage() {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [form, setForm] = useState({ productId: '', type: 'ENTRY', quantity: '', notes: '' });
  const [detail, setDetail] = useState<Movement | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const barcodeResolver = useBarcodeResolver();
  const [showConflict, setShowConflict] = useState(false);
  const { filters: iFilters, setFilter: setIFilter, clear: clearIFilters, activeCount: iActiveCount } = useTableFilters<{ type: string; productId: string; sort: string; range: { from?: string; to?: string } }>({ type: '', productId: '', sort: 'recent', range: { from: '', to: '' } });
  const [tab, setTabState] = useState<'movements' | 'alerts'>(() => {
    const saved = localStorage.getItem('fameat-inventory-tab');
    return saved === 'alerts' ? 'alerts' : 'movements';
  });

  const setTab = (t: typeof tab) => { setTabState(t); localStorage.setItem('fameat-inventory-tab', t); };

  const load = () => {
    Promise.all([
      client.get('/inventory/movements').then((r) => setMovements(r.data)),
      client.get('/inventory/alerts').then((r) => setAlerts(r.data)),
      client.get('/products').then((r) => setProducts(r.data)),
    ]).catch((err) => setLoadError(err)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Deep link desde notif: ?productId=N → filtra movements de ese producto.
  // Conserva el param para que el usuario sepa de dónde viene el filtro.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const pid = searchParams.get('productId');
    if (pid && iFilters.productId !== pid) {
      setIFilter('productId', pid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Si el usuario quita el filtro manualmente, limpiar también el param.
  useEffect(() => {
    if (!iFilters.productId && searchParams.get('productId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('productId');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iFilters.productId]);

  const handleScanned = async (code: string) => {
    setShowScanner(false);
    const result = await barcodeResolver.resolve(code);
    if (!result) {
      toast.error('Error al resolver código');
      return;
    }
    if (result.isNew) {
      toast(`Código ${code} es nuevo — registra primero el producto`, { icon: '⚠️' });
      return;
    }
    // Si solo hay exacto y no hay sugerido distinto, asignar directo
    if (result.exactProduct && (!result.suggestedProduct || result.suggestedProduct.id === result.exactProduct.id)) {
      setForm((f) => ({ ...f, productId: String(result.exactProduct.id) }));
      toast.success(`Producto: ${result.exactProduct.name}`);
      return;
    }
    // Sin exacto pero con sugerido (categoría conocida sin producto activo con ese barcode)
    if (!result.exactProduct && result.suggestedProduct) {
      setShowConflict(true);
      return;
    }
    // Conflict: ambos exacto y sugerido distintos
    setShowConflict(true);
  };

  const onAssignToSuggested = async () => {
    const r = barcodeResolver.resolved;
    if (!r?.suggestedProduct) return;
    try {
      await barcodeResolver.assign(r.code, r.suggestedProduct.id);
      setForm((f) => ({ ...f, productId: String(r.suggestedProduct.id) }));
      setShowConflict(false);
      toast.success(`Asociado a: ${r.suggestedProduct.name}`);
      barcodeResolver.reset();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al asociar');
    }
  };

  const onUseExact = () => {
    const r = barcodeResolver.resolved;
    if (!r?.exactProduct) return;
    setForm((f) => ({ ...f, productId: String(r.exactProduct.id) }));
    setShowConflict(false);
    toast.success(`Producto: ${r.exactProduct.name}`);
    barcodeResolver.reset();
  };

  const onCreateNew = () => {
    setShowConflict(false);
    barcodeResolver.reset();
    toast('Ve a Productos para crear el nuevo item con ese código', { icon: 'ℹ️' });
    navigate('/products?new=1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.post('/inventory/movements', {
        productId: parseInt(form.productId),
        type: form.type,
        quantity: parseFloat(form.quantity),
        notes: form.notes || null,
      });
      toast.success('Movimiento registrado');
      setShowForm(false);
      setForm({ productId: '', type: 'ENTRY', quantity: '', notes: '' });
      window.dispatchEvent(new Event('stock-changed'));
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  if (loading) return <PageSkeleton type="table" />;
  if (loadError) return <ErrorView error={loadError} onRetry={() => window.location.reload()} />;

  return (
    <div className="p-3 md:p-6">
      <PageHeader
        icon={<ClipboardText size={24} weight="duotone" />}
        title="Inventario"
        description="Registra y consulta movimientos de stock: entradas de mercancía, devoluciones, ajustes, mermas y salidas por venta. Cada movimiento queda trazado con usuario, cantidad anterior/nueva, costo y notas. Revisa también alertas de stock mínimo."
        actions={
          <button id="inventory-new-movement-btn" onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 bg-red-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-600 text-xs md:text-sm">
            <Plus size={16} weight="bold" /> Nuevo Movimiento
          </button>
        }
      />

      {(() => {
        // Stats que reflejan los filtros activos cuando estamos en pestaña Movimientos
        const matchesAllFilters = (m: typeof movements[number]): boolean => {
          if (iFilters.type && m.type !== iFilters.type) return false;
          if (iFilters.productId && !m.product.name.toLowerCase().includes((products.find((p) => String(p.id) === iFilters.productId)?.name || '').toLowerCase())) return false;
          if (iFilters.range?.from) {
            if (new Date(m.createdAt) < new Date(iFilters.range.from + 'T00:00:00')) return false;
          }
          if (iFilters.range?.to) {
            const toD = new Date(iFilters.range.to + 'T23:59:59');
            if (new Date(m.createdAt) > toD) return false;
          }
          return true;
        };
        const filteredMovements = tab === 'movements' ? movements.filter(matchesAllFilters) : movements;
        const isFiltered = tab === 'movements' && (iFilters.type || iFilters.productId || iFilters.range?.from || iFilters.range?.to);
        // Valor total: si filtra por producto, usa stock real * costo de ese producto.
        // Si no, suma stockQty * cost de todos los productos activos.
        const totalStockValue = (() => {
          if (iFilters.productId) {
            const p = products.find((pp) => String(pp.id) === iFilters.productId);
            if (!p) return 0;
            return parseFloat(p.stockQty || '0') * parseFloat((p as any).cost || '0');
          }
          return products.reduce((sum, p) => sum + parseFloat(p.stockQty || '0') * parseFloat((p as any).cost || '0'), 0);
        })();
        const totalStockQty = (() => {
          if (iFilters.productId) {
            const p = products.find((pp) => String(pp.id) === iFilters.productId);
            return p ? parseFloat(p.stockQty || '0') : 0;
          }
          return products.reduce((sum, p) => sum + parseFloat(p.stockQty || '0'), 0);
        })();
        return (
          <StatsCards cards={[
            { label: isFiltered ? 'Movimientos filtrados' : 'Total movimientos', value: filteredMovements.length, icon: <Swap size={20} weight="duotone" />, color: 'bg-blue-100 text-blue-600' },
            { label: 'Entradas', value: filteredMovements.filter(m => m.type === 'ENTRY' || m.type === 'RETURN').length, icon: <ArrowDownIcon size={20} weight="bold" />, color: 'bg-green-100 text-green-600' },
            { label: 'Salidas', value: filteredMovements.filter(m => m.type === 'SALE' || m.type === 'LOSS' || m.type === 'ADJUSTMENT').length, icon: <ArrowUpIcon size={20} weight="bold" />, color: 'bg-amber-100 text-amber-600' },
            { label: iFilters.productId ? 'Stock disponible' : 'Stock total', value: totalStockQty.toFixed(2), icon: <PackageIcon size={20} weight="duotone" />, color: 'bg-purple-100 text-purple-600' },
            { label: iFilters.productId ? 'Valor del producto' : 'Valor total del inventario', value: `$${totalStockValue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, icon: <CurrencyDollar size={20} weight="duotone" />, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Alertas stock', value: alerts.length, icon: <WarningCircle size={20} weight="duotone" />, color: 'bg-red-100 text-red-500' },
          ]} />
        );
      })()}

      {/* Tabs */}
      <div id="inventory-tabs" className="flex gap-2 mb-4">
        <button onClick={() => setTab('movements')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'movements' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>
          Movimientos
        </button>
        <button onClick={() => setTab('alerts')} className={`relative px-4 py-2 rounded-lg text-sm font-medium ${tab === 'alerts' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>
          Alertas Stock Bajo
          {alerts.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'movements' && (
        <>
        <div className="mb-4">
          <FilterPanel storageKey="inventory"
            activeCount={iActiveCount}
            onClear={clearIFilters}
            chips={[
              ...(iFilters.type ? [{ key: 't', label: iFilters.type, onRemove: () => setIFilter('type', '') }] : []),
              ...(iFilters.productId ? [{ key: 'p', label: products.find((p) => String(p.id) === iFilters.productId)?.name || '', onRemove: () => setIFilter('productId', '') }] : []),
              ...((iFilters.range?.from || iFilters.range?.to) ? [{ key: 'd', label: `${iFilters.range.from || '...'} → ${iFilters.range.to || '...'}`, onRemove: () => setIFilter('range', { from: '', to: '' }) }] : []),
            ]}
          >
            <DateRangePicker label="Rango de fechas" value={iFilters.range} onChange={(v) => setIFilter('range', v)} />
            <Select label="Tipo de movimiento" icon={<Funnel size={14} weight="duotone" />} placeholder="Selecciona tipo" options={[
              { value: '', label: 'Todos' },
              { value: 'ENTRY', label: 'Entrada' },
              { value: 'SALE', label: 'Venta' },
              { value: 'ADJUSTMENT', label: 'Ajuste' },
              { value: 'LOSS', label: 'Merma' },
              { value: 'RETURN', label: 'Devolución' },
              { value: 'EXPIRED', label: 'Vencido' },
            ]} value={iFilters.type} onChange={(e) => setIFilter('type', e.target.value)} />
            <Combobox label="Producto" icon={<PackageIcon size={14} weight="duotone" />} placeholder="Selecciona producto" options={[{ value: '', label: 'Todos' }, ...products.map((p) => ({ value: String(p.id), label: p.name }))]}
              value={iFilters.productId} onChange={(v) => setIFilter('productId', (v as string) || '')} />
            <Combobox label="Ordenar por" icon={<SortAscending size={14} weight="duotone" />} options={[
              { value: 'recent', label: 'Más reciente' },
              { value: 'oldest', label: 'Más antiguo' },
              { value: 'qtyDesc', label: 'Cantidad mayor a menor' },
              { value: 'qtyAsc', label: 'Cantidad menor a mayor' },
            ]} value={iFilters.sort} onChange={(v) => setIFilter('sort', (v as string) || 'recent')} clearable={false} />
          </FilterPanel>
        </div>
        <div id="inventory-list" className="bg-white rounded-xl shadow p-4">
          <ViewToggle storageKey="inventory"
            data={movements.filter((m) => {
              if (iFilters.type && m.type !== iFilters.type) return false;
              if (iFilters.productId && !m.product.name.toLowerCase().includes((products.find((p) => String(p.id) === iFilters.productId)?.name || '').toLowerCase())) return false;
              if (iFilters.range?.from && new Date(m.createdAt) < new Date(iFilters.range.from + 'T00:00:00')) return false;
              if (iFilters.range?.to && new Date(m.createdAt) > new Date(iFilters.range.to + 'T23:59:59')) return false;
              return true;
            }).sort((a, b) => {
              const s = iFilters.sort || 'recent';
              if (s === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              if (s === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              if (s === 'qtyDesc') return parseFloat(b.quantity) - parseFloat(a.quantity);
              if (s === 'qtyAsc') return parseFloat(a.quantity) - parseFloat(b.quantity);
              return 0;
            })}
            keyField="id"
            searchFilter={(m, q) => m.product.name.toLowerCase().includes(q)}
            searchPlaceholder="Buscar por producto..."
            cardTitle={(m) => m.product.name}
            cardSubtitle={(m) => formatDateTime(m.createdAt)}
            cardBadge={(m) => {
              const mt = MOVEMENT_TYPES[m.type as keyof typeof MOVEMENT_TYPES];
              return <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${mt?.color}`}>{mt?.label || m.type}</span>;
            }}
            cardActions={(m) => (
              <button onClick={() => setDetail(m)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-medium">
                <Eye size={14} weight="duotone" /> Detalle
              </button>
            )}
            columns={[
              { key: 'actions', label: '', render: (m) => (
                <button onClick={() => setDetail(m)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-medium">
                  <Eye size={14} weight="duotone" /> Detalle
                </button>
              ), cardHidden: true },
              { key: 'date', label: 'Fecha', render: (m) => formatDateTime(m.createdAt), cardHidden: true },
              { key: 'product', label: 'Producto', render: (m) => <span className="font-medium">{m.product.name}</span>, cardHidden: true },
              { key: 'type', label: 'Tipo', render: (m) => {
                const mt = MOVEMENT_TYPES[m.type as keyof typeof MOVEMENT_TYPES];
                return <span className={mt?.color}>{mt?.label || m.type}</span>;
              }, cardHidden: true },
              { key: 'qty', label: 'Cantidad', render: (m) => formatQty(m.quantity) },
              { key: 'prev', label: 'Anterior', render: (m) => <span className="text-gray-500">{formatQty(m.previousQty)}</span> },
              { key: 'new', label: 'Nuevo', render: (m) => <span className="font-medium">{formatQty(m.newQty)}</span> },
            ]}
            emptyMessage="Sin movimientos"
            onCreateNew={() => setShowForm(true)}
            createNewLabel="Nuevo movimiento"
          />
        </div>
        </>
      )}

      {tab === 'alerts' && (
        <div className="bg-white rounded-xl shadow p-4">
          <ViewToggle storageKey="inventory"
            data={alerts}
            keyField="id"
            searchFilter={(p, q) => p.name.toLowerCase().includes(q)}
            searchPlaceholder="Buscar producto..."
            cardTitle={(p) => p.name}
            cardBadge={(p) => <StockBadge stock={parseFloat(p.stockQty)} saleType={p.saleType || 'UNIT'} />}
            cardActions={(p) => (
              <button onClick={() => {
                setForm({ productId: String(p.id), type: 'ENTRY', quantity: '', notes: '' });
                setShowForm(true);
                setTab('movements');
              }}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs font-medium">
                <Plus size={14} weight="bold" /> Llenar stock
              </button>
            )}
            columns={[
              { key: 'actions', label: '', render: (p) => (
                <button onClick={() => {
                  setForm({ productId: String(p.id), type: 'ENTRY', quantity: '', notes: '' });
                  setShowForm(true);
                  setTab('movements');
                }}
                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs font-medium">
                  <Plus size={14} weight="bold" /> Llenar stock
                </button>
              ), cardHidden: true },
              { key: 'name', label: 'Producto', render: (p) => <span className="font-medium">{p.name}</span>, cardHidden: true },
              { key: 'stock', label: 'Stock Actual', render: (p) => <span className="text-red-500 font-bold">{formatQty(p.stockQty)}</span> },
              { key: 'min', label: 'Stock Mínimo', render: (p) => formatQty(p.minStock) },
              { key: 'missing', label: 'Faltante', render: (p) => <span className="text-red-500">{formatQty(parseFloat(p.minStock) - parseFloat(p.stockQty))}</span> },
            ]}
            emptyMessage="Sin alertas de stock bajo"
          />
        </div>
      )}

      {/* Modal detalle movimiento */}
      {detail && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ClipboardText size={22} weight="duotone" className="text-red-500" />
                Detalle del movimiento
              </h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Producto</p>
                <p className="font-semibold">{detail.product.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Tipo</p>
                  {(() => {
                    const mt = MOVEMENT_TYPES[detail.type as keyof typeof MOVEMENT_TYPES];
                    return <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${mt?.color}`}>{mt?.label || detail.type}</span>;
                  })()}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Cantidad</p>
                  <p className="font-bold text-lg">{formatQty(detail.quantity)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Stock anterior</p>
                  <p className="font-medium">{formatQty(detail.previousQty)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Stock nuevo</p>
                  <p className="font-bold">{formatQty(detail.newQty)}</p>
                </div>
              </div>

              {/* Diferencia visual */}
              <div className={`rounded-lg p-3 text-center ${
                parseFloat(detail.newQty) >= parseFloat(detail.previousQty) ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className="text-xs text-gray-400 mb-0.5">Cambio en stock</p>
                <p className={`font-bold text-lg ${
                  parseFloat(detail.newQty) >= parseFloat(detail.previousQty) ? 'text-green-600' : 'text-red-500'
                }`}>
                  {parseFloat(detail.newQty) >= parseFloat(detail.previousQty) ? '+' : ''}{formatQty(parseFloat(detail.newQty) - parseFloat(detail.previousQty))}
                </p>
              </div>

              {detail.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Notas</p>
                  <p className="text-sm">{detail.notes}</p>
                </div>
              )}

              {/* Valor monetario */}
              {detail.totalValue && parseFloat(detail.totalValue) > 0 && (() => {
                const sums = detail.type === 'ENTRY' || detail.type === 'RETURN';
                return (
                  <div className={`rounded-lg p-3 border ${sums ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50'}`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Valor del movimiento</p>
                    <p className={`font-bold text-lg ${sums ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
                      {sums ? '+ ' : '- '}${parseFloat(detail.totalValue).toLocaleString('es-CO')}
                    </p>
                    {detail.unitCost && <p className="text-[10px] text-gray-500 mt-0.5">Costo unitario: ${parseFloat(detail.unitCost).toLocaleString('es-CO')}</p>}
                  </div>
                );
              })()}

              {/* Venta asociada */}
              {detail.saleId && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Venta asociada</p>
                  <button
                    onClick={() => { setDetail(null); navigate(`/sales?saleId=${detail.saleId}`); }}
                    className="text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline inline-flex items-center gap-1"
                  >
                    Venta #{detail.saleId} <ArrowSquareOut size={12} />
                  </button>
                </div>
              )}

              {detail.user && (
                <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Registrado por</p>
                  <p className="text-sm font-medium">{detail.user.firstName} {detail.user.lastName}</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Fecha y hora</p>
                <p className="text-sm">{formatDateTime(detail.createdAt)}</p>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button onClick={() => setDetail(null)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium transition-colors">
                <X size={14} weight="bold" /> Cerrar
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal movimiento */}
      {showForm && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Swap size={22} weight="duotone" className="text-white" />
                <h3 className="text-white font-bold text-lg">Nuevo movimiento de inventario</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X size={18} weight="bold" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
              <div className="flex gap-2 items-end">
                <Combobox
                  label="Producto *"
                  icon={<PackageIcon size={14} weight="duotone" />}
                  placeholder="Selecciona producto"
                  options={[
                    { value: '', label: '— Selecciona —' },
                    ...products.map((p) => ({ value: String(p.id), label: p.name, hint: `Stock: ${formatQty(p.stockQty)}` })),
                  ]}
                  value={form.productId}
                  onChange={(v) => setForm({ ...form, productId: (v as string) || '' })}
                  wrapperClassName="flex-1"
                />
                <Button type="button" size="md" variant="outline" iconLeft={<Barcode size={16} weight="duotone" />}
                  onClick={() => setShowScanner(true)}>
                  Escanear
                </Button>
              </div>
              <Select
                label="Tipo de movimiento *"
                icon={<Funnel size={14} weight="duotone" />}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                options={[
                  { value: 'ENTRY', label: '↓ Entrada (suma stock)' },
                  { value: 'RETURN', label: '↩ Devolución (suma stock)' },
                  { value: 'ADJUSTMENT', label: '⚖ Ajuste (resta stock)' },
                  { value: 'LOSS', label: '✗ Merma (resta stock)' },
                ]}
              />
              <Input
                label="Cantidad *"
                type="number"
                step="0.001"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
                hint={form.productId ? `Stock actual: ${formatQty(products.find((p) => String(p.id) === form.productId)?.stockQty || '0')}` : ''}
              />
              <Textarea
                label="Notas"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Opcional. Ej: Recibido de proveedor X, factura #123"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" iconLeft={<Plus size={16} weight="bold" />}>
                  Registrar movimiento
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Portal>)}

      {showScanner && (
        <BarcodeScanner onScan={handleScanned} onClose={() => setShowScanner(false)} />
      )}

      <BarcodeConflictModal
        open={showConflict}
        resolved={barcodeResolver.resolved}
        onClose={() => { setShowConflict(false); barcodeResolver.reset(); }}
        onAssignToSuggested={onAssignToSuggested}
        onUseExact={onUseExact}
        onCreateNew={onCreateNew}
      />
    </div>
  );
}
