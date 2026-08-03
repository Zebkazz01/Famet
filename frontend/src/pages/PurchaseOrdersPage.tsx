import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { ClipboardText, Plus, X, Check, ArrowsClockwise, Truck, Package as PackageIcon, Trash, Clock, CheckCircle, CurrencyDollar, MagnifyingGlass, Funnel, SortAscending } from '@phosphor-icons/react';
import { StatsCards } from '../components/StatsCards';
import * as api from '../api/purchaseOrders';
import type { PurchaseOrder } from '../api/purchaseOrders';
import client from '../api/client';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { PageHeader } from '../components/layout/PageHeader';
import { Portal } from '../components/Portal';
import { FilterDropdown, Combobox } from '../components/ui';
import { useTableFilters } from '../hooks/useTableFilters';
import { useEnterSubmit } from '../hooks/useEnterSubmit';
import { useModalEscape } from '../contexts/ModalStackContext';

interface Supplier { id: number; name: string; nit: string | null }
interface ProductLite { id: number; name: string; cost: string | null; weightUnit: string; saleType: string }

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Borrador',  color: 'bg-gray-200 text-gray-700' },
  SENT:      { label: 'Enviada',   color: 'bg-blue-100 text-blue-700' },
  PARTIAL:   { label: 'Parcial',   color: 'bg-amber-100 text-amber-700' },
  RECEIVED:  { label: 'Recibida',  color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
};

export function PurchaseOrdersPage() {
  const [list, setList] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);

  // Form de OC nueva
  const [form, setForm] = useState({
    supplierId: 0,
    expectedDate: '',
    notes: '',
    tax: 0,
    items: [] as Array<{ productId: number; quantityOrdered: number; unitCost: number; notes?: string }>,
  });

  // Recepción
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');

  useModalEscape(showForm ? () => setShowForm(false) : null);
  useModalEscape(detail ? () => setDetail(null) : null);
  useModalEscape(showReceive ? () => setShowReceive(false) : null);

  const { filters: oFilters, setFilter: setOFilter, clear: clearOFilters, activeCount: oActiveCount } = useTableFilters<{
    status: string; supplierId: string; sort: string;
  }>({ status: '', supplierId: '', sort: 'recent' });

  const load = () => {
    setLoading(true);
    api.list({}).then((data) => { setList(data); setLoading(false); }).catch(() => { setLoading(false); });
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    client.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => {});
    client.get('/products').then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return list.filter((o) => {
      if (oFilters.status && o.status !== oFilters.status) return false;
      if (oFilters.supplierId && String(o.supplierId) !== oFilters.supplierId) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.code.toLowerCase().includes(q) && !(o.supplier?.name || '').toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const s = oFilters.sort || 'recent';
      if (s === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (s === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (s === 'totalDesc') return parseFloat(b.total) - parseFloat(a.total);
      if (s === 'totalAsc') return parseFloat(a.total) - parseFloat(b.total);
      return 0;
    });
  }, [list, oFilters, search]);

  function addItem() {
    setForm({ ...form, items: [...form.items, { productId: 0, quantityOrdered: 1, unitCost: 0 }] });
  }
  function removeItem(idx: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }
  function updateItem(idx: number, patch: Partial<typeof form.items[number]>) {
    setForm({ ...form, items: form.items.map((it, i) => i === idx ? { ...it, ...patch } : it) });
  }

  const formSubtotal = form.items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);
  const formTotal = formSubtotal + (form.tax || 0);

  async function createOrder() {
    if (!form.supplierId) return toast.error('Selecciona proveedor');
    if (form.items.length === 0) return toast.error('Agrega al menos un item');
    if (form.items.some((it) => !it.productId || it.quantityOrdered <= 0)) return toast.error('Items inválidos');
    try {
      await api.create(form);
      toast.success('OC creada');
      setShowForm(false);
      setForm({ supplierId: 0, expectedDate: '', notes: '', tax: 0, items: [] });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al crear OC');
    }
  }

  async function openDetail(id: number) {
    try {
      const d = await api.getOne(id);
      setDetail(d);
      const qty: Record<number, number> = {};
      d.items?.forEach((it) => { qty[it.id] = Math.max(0, Number(it.quantityOrdered) - Number(it.quantityReceived)); });
      setReceiveQty(qty);
      setReceiveNotes('');
    } catch { toast.error('OC no encontrada'); }
  }

  async function doReceive() {
    if (!detail) return;
    const items = Object.entries(receiveQty)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ itemId: Number(id), quantityReceived: q }));
    if (items.length === 0) return toast.error('Sin cantidades a recibir');
    try {
      const updated = await api.receive(detail.id, { items, notes: receiveNotes || undefined });
      toast.success('Recepción registrada');
      setDetail(updated);
      setShowReceive(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error en recepción');
    }
  }

  async function doCancel() {
    if (!detail) return;
    if (!confirm(`Cancelar OC ${detail.code}?`)) return;
    try {
      await api.cancel(detail.id);
      toast.success('OC cancelada');
      setDetail(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error');
    }
  }

  useEnterSubmit(createOrder, showForm);

  return (
    <div className="p-3 md:p-6">
      <PageHeader
        icon={<ClipboardText size={24} weight="duotone" />}
        title="Órdenes de Compra"
        description="Gestiona el flujo de compras a proveedores. Crea órdenes con productos y cantidades, registra recepción parcial o total — al recibir se actualiza automáticamente el stock con costo promedio ponderado y genera movimiento de inventario tipo ENTRY."
        actions={
          <>
            <button id="orders-new-btn" onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-xs md:text-sm">
              <Plus size={16} weight="bold" /> Nueva OC
            </button>
            <FilterDropdown activeCount={oActiveCount} onClear={clearOFilters} chips={[
              ...(oFilters.status ? [{ key: 'status', label: STATUS_META[oFilters.status]?.label || oFilters.status, onRemove: () => setOFilter('status', '') }] : []),
              ...(oFilters.supplierId ? [{ key: 'sup', label: `Prov: ${suppliers.find((s) => String(s.id) === oFilters.supplierId)?.name || oFilters.supplierId}`, onRemove: () => setOFilter('supplierId', '') }] : []),
            ]} storageKey="purchaseOrders">
              <Combobox label="Estado" icon={<Funnel size={14} weight="duotone" />} placeholder="Selecciona estado"
                options={[
                  { value: '', label: 'Todos' },
                  ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label })),
                ]}
                value={oFilters.status} onChange={(v) => setOFilter('status', (v as string) || '')} />
              <Combobox label="Proveedor" icon={<Truck size={14} weight="duotone" />} placeholder="Selecciona proveedor"
                options={[{ value: '', label: 'Todos' }, ...suppliers.map((s) => ({ value: String(s.id), label: s.name }))]}
                value={oFilters.supplierId} onChange={(v) => setOFilter('supplierId', (v as string) || '')} />
              <Combobox label="Ordenar por" icon={<SortAscending size={14} weight="duotone" />} options={[
                { value: 'recent', label: 'Más reciente' },
                { value: 'oldest', label: 'Más antiguo' },
                { value: 'totalDesc', label: 'Total mayor a menor' },
                { value: 'totalAsc', label: 'Total menor a mayor' },
              ]} value={oFilters.sort || 'recent'} onChange={(v) => setOFilter('sort', (v as string) || '')} clearable={false} />
            </FilterDropdown>
          </>
        }
      />

      {/* Stats */}
      <StatsCards cards={[
        { label: 'Total órdenes', value: list.length, icon: <ClipboardText size={20} weight="duotone" />, color: 'bg-blue-100 text-blue-600' },
        { label: 'Pendientes', value: list.filter(o => o.status === 'SENT').length, icon: <Clock size={20} weight="duotone" />, color: 'bg-amber-100 text-amber-600' },
        { label: 'Recibidas', value: list.filter(o => o.status === 'RECEIVED').length, icon: <CheckCircle size={20} weight="duotone" />, color: 'bg-green-100 text-green-600' },
        { label: 'Total gastado', value: formatCurrency(list.reduce((s, o) => s + parseFloat(o.total), 0)), icon: <CurrencyDollar size={20} weight="duotone" />, color: 'bg-purple-100 text-purple-600' },
      ]} />

      {/* Barra de búsqueda */}
      <div className="relative mb-3">
        <MagnifyingGlass size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} data-search-input=""
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o proveedor..."
          className="w-full pl-9 pr-8 h-10 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} weight="bold" />
          </button>
        )}
      </div>

      {/* Lista */}
      <div id="orders-list" className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
        {list.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <ClipboardText size={32} weight="duotone" className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Aún no hay órdenes de compra</p>
            <p className="text-sm text-gray-400 mb-4">Crea la primera orden para empezar a gestionar compras</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} weight="bold" /> Nueva OC
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
              <MagnifyingGlass size={32} weight="duotone" className="text-amber-500" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Sin resultados</p>
            <p className="text-sm text-gray-400 mb-4">No hay órdenes que coincidan con los filtros o búsqueda</p>
            <div className="flex gap-2">
              <button onClick={() => { setSearch(''); clearOFilters(); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                <X size={14} weight="bold" /> Limpiar filtros
              </button>
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                <Plus size={16} weight="bold" /> Nueva OC
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Código</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Proveedor</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Estado</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500 hidden md:table-cell">Fecha</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Items</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((o) => (
                <tr key={o.id} onClick={() => openDetail(o.id)} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer">
                  <td className="px-3 py-2 font-mono font-bold">{o.code}</td>
                  <td className="px-3 py-2">{o.supplier?.name || `#${o.supplierId}`}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[o.status]?.color}`}>
                      {STATUS_META[o.status]?.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-gray-500 text-xs">{formatDateTime(o.createdAt)}</td>
                  <td className="px-3 py-2 text-right">{o._count?.items || 0}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear OC */}
      {showForm && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardText size={20} weight="duotone" className="text-red-500" /> Nueva orden de compra</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400"><X size={18} weight="bold" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Combobox
                    label="Proveedor *"
                    placeholder="Buscar proveedor..."
                    options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
                    value={form.supplierId ? String(form.supplierId) : ''}
                    onChange={(v) => setForm({ ...form, supplierId: Number(v) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha esperada</label>
                  <input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Productos</label>
                  <button onClick={addItem} className="text-xs text-red-500 hover:underline">+ Agregar item</button>
                </div>
                <div className="border rounded-lg dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase text-gray-500">Producto</th>
                        <th className="text-right px-2 py-1.5 text-[10px] uppercase text-gray-500">Cantidad</th>
                        <th className="text-right px-2 py-1.5 text-[10px] uppercase text-gray-500">Costo unit.</th>
                        <th className="text-right px-2 py-1.5 text-[10px] uppercase text-gray-500">Subtotal</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {form.items.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-4 text-xs">Sin items. Agrega uno.</td></tr>}
                      {form.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <Combobox
                              placeholder="Buscar producto..."
                              options={products.map((p) => ({ value: String(p.id), label: p.name }))}
                              value={it.productId ? String(it.productId) : ''}
                              onChange={(v) => {
                                const p = products.find((pp) => pp.id === Number(v));
                                updateItem(idx, { productId: Number(v), unitCost: p?.cost ? Number(p.cost) : it.unitCost });
                              }}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" step="0.01" min="0" value={it.quantityOrdered}
                              onChange={(e) => updateItem(idx, { quantityOrdered: Number(e.target.value) })}
                              className="w-20 px-2 py-1 border rounded text-xs text-right font-mono dark:bg-slate-700 dark:border-gray-600" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" step="0.01" min="0" value={it.unitCost}
                              onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })}
                              className="w-24 px-2 py-1 border rounded text-xs text-right font-mono dark:bg-slate-700 dark:border-gray-600" />
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-xs">{formatCurrency(it.quantityOrdered * it.unitCost)}</td>
                          <td><button onClick={() => removeItem(idx)} className="text-red-500"><Trash size={14} weight="duotone" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Impuesto (IVA)</label>
                  <input type="number" min="0" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Subtotal: <span className="font-mono">{formatCurrency(formSubtotal)}</span></p>
                  <p className="text-lg font-bold text-green-600 mt-1">Total: {formatCurrency(formTotal)}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600" />
              </div>
            </div>
            <div className="border-t dark:border-gray-700 p-3 flex gap-2 bg-gray-50 dark:bg-slate-900/50">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-lg text-sm dark:border-gray-600">Cancelar</button>
              <button onClick={createOrder} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Crear OC</button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal detalle */}
      {detail && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setDetail(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg font-mono">{detail.code}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                  <Truck size={12} weight="duotone" /> {detail.supplier?.name}
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[detail.status]?.color}`}>{STATUS_META[detail.status]?.label}</span>
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400"><X size={18} weight="bold" /></button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded p-2">
                  <p className="text-[10px] uppercase text-gray-400">Subtotal</p>
                  <p className="font-mono font-bold">{formatCurrency(detail.subtotal)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded p-2">
                  <p className="text-[10px] uppercase text-gray-400">Impuesto</p>
                  <p className="font-mono font-bold">{formatCurrency(detail.tax)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                  <p className="text-[10px] uppercase text-gray-400">Total</p>
                  <p className="font-mono font-bold text-green-600">{formatCurrency(detail.total)}</p>
                </div>
              </div>

              <div className="border rounded-lg dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="text-left px-2 py-1.5 text-[10px] uppercase text-gray-500">Producto</th>
                      <th className="text-right px-2 py-1.5 text-[10px] uppercase text-gray-500">Ordenado</th>
                      <th className="text-right px-2 py-1.5 text-[10px] uppercase text-gray-500">Recibido</th>
                      <th className="text-right px-2 py-1.5 text-[10px] uppercase text-gray-500">Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {detail.items?.map((it) => {
                      const ord = Number(it.quantityOrdered);
                      const rcv = Number(it.quantityReceived);
                      return (
                        <tr key={it.id}>
                          <td className="px-2 py-1.5"><PackageIcon size={11} className="inline mr-1 text-gray-400" />{it.product?.name || `#${it.productId}`}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{ord.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-green-600">{rcv.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-amber-600">{(ord - rcv).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {detail.notes && <p className="text-xs text-gray-500 bg-gray-50 dark:bg-slate-900/50 p-2 rounded">{detail.notes}</p>}
            </div>

            <div className="border-t dark:border-gray-700 p-3 flex gap-2 bg-gray-50 dark:bg-slate-900/50">
              {(detail.status === 'DRAFT' || detail.status === 'SENT' || detail.status === 'PARTIAL') && (
                <>
                  <button onClick={doCancel} className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-xs hover:bg-red-50">
                    Cancelar OC
                  </button>
                  <button onClick={() => setShowReceive(true)} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 inline-flex items-center justify-center gap-1.5">
                    <Check size={14} weight="bold" /> Recibir mercancía
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal recepción */}
      {showReceive && detail && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" onClick={() => setShowReceive(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><ArrowsClockwise size={18} weight="duotone" className="text-green-600" /> Recibir mercancía</h3>
              <button onClick={() => setShowReceive(false)} className="text-gray-400"><X size={18} weight="bold" /></button>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {detail.items?.map((it) => {
                const pending = Number(it.quantityOrdered) - Number(it.quantityReceived);
                if (pending <= 0) return null;
                return (
                  <div key={it.id} className="bg-gray-50 dark:bg-slate-900/50 rounded p-2">
                    <p className="text-sm font-medium">{it.product?.name}</p>
                    <p className="text-[10px] text-gray-500 mb-1">Pendiente: {pending.toFixed(2)}</p>
                    <input type="number" min="0" max={pending} step="0.01"
                      value={receiveQty[it.id] ?? ''}
                      onChange={(e) => setReceiveQty({ ...receiveQty, [it.id]: Math.min(pending, Number(e.target.value) || 0) })}
                      className="w-full px-2 py-1 border rounded text-sm font-mono text-right dark:bg-slate-700 dark:border-gray-600" />
                  </div>
                );
              })}
              <div>
                <label className="block text-xs font-medium mb-1">Notas / Nº factura</label>
                <textarea value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600" />
              </div>
            </div>
            <div className="border-t dark:border-gray-700 p-3 flex gap-2">
              <button onClick={() => setShowReceive(false)} className="flex-1 py-2 border rounded-lg text-sm dark:border-gray-600">Cancelar</button>
              <button onClick={doReceive} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                Confirmar recepción
              </button>
            </div>
          </div>
        </div>
      </Portal>)}
    </div>
  );
}
