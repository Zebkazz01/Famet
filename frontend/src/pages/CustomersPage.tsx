import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Users, Plus, X, PencilSimple, Money, CurrencyDollar, Phone, IdentificationCard, Receipt, Check, Tag, Warning, UserCircle, NotePencil, SortAscending } from '@phosphor-icons/react';
import * as api from '../api/customers';
import type { Customer, CustomerPayment } from '../api/customers';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { PageHeader } from '../components/layout/PageHeader';
import { Portal } from '../components/Portal';
import { PageSkeleton } from '../components/PageSkeleton';
import { ViewToggle } from '../components/ViewToggle';

const emptyForm = { name: '', phone: '', document: '', notes: '', creditLimit: '', discountPercent: '' };

type FilterMode = 'all' | 'debt' | 'discount' | 'noDebt';
type SortMode = 'name' | 'debtDesc' | 'debtAsc' | 'discountDesc' | 'recent';

export function CustomersPage() {
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState<(Customer & { sales: any[]; payments: CustomerPayment[] }) | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'CASH' as const, reference: '', notes: '', saleId: null as number | null });

  const load = () => api.list()
    .then((data) => { setList(data); setLoading(false); })
    .catch(() => { setLoading(false); });

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const f = list.filter((c) => {
      if (filterMode === 'debt') return Number(c.currentDebt) > 0;
      if (filterMode === 'noDebt') return Number(c.currentDebt) <= 0;
      if (filterMode === 'discount') return Number(c.discountPercent) > 0;
      return true;
    });
    return f.sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name, 'es');
      if (sortMode === 'debtDesc') return Number(b.currentDebt) - Number(a.currentDebt);
      if (sortMode === 'debtAsc') return Number(a.currentDebt) - Number(b.currentDebt);
      if (sortMode === 'discountDesc') return Number(b.discountPercent) - Number(a.discountPercent);
      if (sortMode === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });
  }, [list, filterMode, sortMode]);

  const stats = useMemo(() => {
    const withDebt = list.filter((c) => Number(c.currentDebt) > 0);
    const withDiscount = list.filter((c) => Number(c.discountPercent) > 0);
    const totalDebt = list.reduce((s, c) => s + Number(c.currentDebt), 0);
    return { withDebt, withDiscount, totalDebt };
  }, [list]);

  function startNew() { setEditId(null); setForm(emptyForm); setShowForm(true); }
  function startEdit(c: Customer) {
    setEditId(c.id);
    setForm({ name: c.name, phone: c.phone || '', document: c.document || '', notes: c.notes || '', creditLimit: c.creditLimit ? String(Number(c.creditLimit)) : '', discountPercent: c.discountPercent ? String(Number(c.discountPercent)) : '' });
    setShowForm(true);
  }

  async function save() {
    try {
      if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
      const cl = parseFloat(form.creditLimit as string);
      const dp = parseFloat(form.discountPercent as string);
      const payload: any = { name: form.name.trim() };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.document.trim()) payload.document = form.document.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (!isNaN(cl) && cl > 0) payload.creditLimit = cl;
      if (!isNaN(dp) && form.discountPercent !== '') payload.discountPercent = dp;
      if (editId) await api.update(editId, payload);
      else await api.create(payload);
      toast.success('Guardado');
      setShowForm(false);
      load();
    } catch (e: any) {
      const details = e?.response?.data?.details;
      const detailMsg = Array.isArray(details) && details.length > 0
        ? details.map((d: any) => `${(d.path?.join?.('.') || d.field || 'campo')}: ${d.message}`).join(' · ')
        : '';
      const baseMsg = e?.response?.data?.error || 'Error al guardar';
      toast.error(detailMsg ? `${baseMsg} — ${detailMsg}` : baseMsg, { duration: 6000 });
    }
  }

  async function viewDetail(id: number) {
    try {
      const d = await api.getOne(id);
      setDetail(d);
    } catch { toast.error('Cliente no encontrado'); }
  }

  async function submitPayment() {
    if (!detail) return;
    try {
      const res: any = await api.createPayment({
        customerId: detail.id,
        saleId: paymentForm.saleId,
        amount: paymentForm.amount,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      const change = Number(res?.change || 0);
      if (change > 0) {
        toast.success(`Pago registrado · Devolver ${formatCurrency(change)} al cliente`, { duration: 6000 });
      } else {
        toast.success('Pago registrado');
      }
      setShowPayment(false);
      setPaymentForm({ amount: 0, method: 'CASH', reference: '', notes: '', saleId: null });
      viewDetail(detail.id);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error en pago');
    }
  }

  if (loading) return <PageSkeleton type="table" />;

  return (
    <div className="p-3 md:p-6">
      <PageHeader
        icon={<Users size={24} weight="duotone" />}
        title="Clientes"
        description="Base de clientes para gestionar crédito, abonos y descuentos personalizados. Registra ventas a crédito, controla saldos, recibe pagos parciales y consulta historial."
        actions={
          <button id="customers-new-btn" onClick={startNew} className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 text-xs md:text-sm shadow-md hover:shadow-lg transition-all font-medium">
            <Plus size={16} weight="bold" /> Nuevo Cliente
          </button>
        }
      />

      {/* Stats cards con gradient e iconos */}
      <div id="customers-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <button
          onClick={() => setFilterMode('all')}
          className={`relative overflow-hidden text-left rounded-xl p-4 border transition-all ${filterMode === 'all' ? 'ring-2 ring-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700 hover:border-blue-200'}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <Users size={20} weight="duotone" />
            </div>
            {filterMode === 'all' && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">Activo</span>}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Total clientes</p>
          <p className="text-2xl font-bold mt-0.5">{list.length}</p>
        </button>

        <button
          onClick={() => setFilterMode('debt')}
          className={`relative overflow-hidden text-left rounded-xl p-4 border transition-all ${filterMode === 'debt' ? 'ring-2 ring-amber-400 bg-gradient-to-br from-amber-50 to-orange-100/50 dark:from-amber-900/30 dark:to-amber-900/10 border-amber-200 dark:border-amber-700' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700 hover:border-amber-200'}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Warning size={20} weight="duotone" />
            </div>
            {filterMode === 'debt' && <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">Activo</span>}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Con deuda</p>
          <p className="text-2xl font-bold mt-0.5 text-amber-600">{stats.withDebt.length}</p>
        </button>

        <button
          onClick={() => setFilterMode('discount')}
          className={`relative overflow-hidden text-left rounded-xl p-4 border transition-all ${filterMode === 'discount' ? 'ring-2 ring-green-400 bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-900/30 dark:to-green-900/10 border-green-200 dark:border-green-700' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700 hover:border-green-200'}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-green-500/15 text-green-600 flex items-center justify-center">
              <Tag size={20} weight="duotone" />
            </div>
            {filterMode === 'discount' && <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">Activo</span>}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Con descuento</p>
          <p className="text-2xl font-bold mt-0.5 text-green-600">{stats.withDiscount.length}</p>
        </button>

        <div className="rounded-xl p-4 border bg-gradient-to-br from-red-50 to-rose-100/50 dark:from-red-900/30 dark:to-red-900/10 border-red-200 dark:border-red-700">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center">
              <CurrencyDollar size={20} weight="duotone" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Deuda total</p>
          <p className="text-2xl font-bold mt-0.5 text-red-600">{formatCurrency(stats.totalDebt)}</p>
        </div>
      </div>

      {/* Sort + indicador de filtro */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative">
          <SortAscending size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg text-sm focus:border-red-300 focus:outline-none transition-colors appearance-none cursor-pointer h-9"
          >
            <option value="name">Nombre (A-Z)</option>
            <option value="recent">Más recientes</option>
            <option value="debtDesc">Mayor deuda</option>
            <option value="debtAsc">Menor deuda</option>
            <option value="discountDesc">Mayor descuento</option>
          </select>
        </div>
        {filterMode !== 'all' && (
          <button onClick={() => setFilterMode('all')} className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-xs font-medium text-gray-600 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200">
            <X size={12} weight="bold" /> Quitar filtro: {filterMode === 'debt' ? 'Con deuda' : filterMode === 'discount' ? 'Con descuento' : 'Sin deuda'}
          </button>
        )}
      </div>

      {/* Lista de clientes — tabla / tarjetas */}
      <div id="customers-list" className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3">
        <ViewToggle
          storageKey="customers"
          data={filtered}
          keyField="id"
          searchPlaceholder="Buscar por nombre, teléfono o documento..."
          searchFilter={(c, query) =>
            c.name.toLowerCase().includes(query) ||
            (c.phone || '').toLowerCase().includes(query) ||
            (c.document || '').toLowerCase().includes(query)
          }
          emptyMessage={filterMode === 'all' ? 'Aún no hay clientes' : 'Sin clientes en este filtro'}
          emptyIcon={<UserCircle size={32} weight="duotone" className="text-gray-400" />}
          onCreateNew={startNew}
          createNewLabel="Nuevo cliente"
          cardImage={(c) => {
            const debt = Number(c.currentDebt);
            return (
              <div className={`w-full h-full flex items-center justify-center text-2xl font-bold text-white ${debt > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-red-400 to-red-600'}`}>
                {c.name.charAt(0).toUpperCase()}
              </div>
            );
          }}
          cardTitle={(c) => c.name}
          cardSubtitle={(c) => (
            <span className="flex items-center gap-1.5 text-[11px]">
              {c.phone && <span className="inline-flex items-center gap-0.5"><Phone size={10} weight="duotone" />{c.phone}</span>}
              {c.document && <span className="inline-flex items-center gap-0.5"><IdentificationCard size={10} weight="duotone" />{c.document}</span>}
              {!c.phone && !c.document && <span className="text-gray-400">Sin contacto</span>}
            </span>
          )}
          cardBadge={(c) => {
            const debt = Number(c.currentDebt);
            return debt > 0 ? (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                {formatCurrency(debt)}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                <Check size={10} weight="bold" /> Al día
              </span>
            );
          }}
          cardActions={(c) => (
            <>
              <button onClick={() => viewDetail(c.id)} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 text-xs font-medium transition-colors">
                <Receipt size={12} weight="duotone" /> Detalle
              </button>
              <button onClick={() => startEdit(c)} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 text-xs font-medium transition-colors">
                <PencilSimple size={12} weight="bold" /> Editar
              </button>
            </>
          )}
          columns={[
            {
              key: 'customer',
              label: 'Cliente',
              render: (c) => {
                const debt = Number(c.currentDebt);
                return (
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${debt > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-gradient-to-br from-red-400 to-red-600 text-white'}`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold truncate text-gray-900 dark:text-gray-100">{c.name}</p>
                  </div>
                );
              },
            },
            {
              key: 'contact',
              label: 'Contacto',
              cardHidden: true,
              render: (c) => (
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                  {c.phone && <p className="flex items-center gap-1.5"><Phone size={11} weight="duotone" className="text-blue-500" />{c.phone}</p>}
                  {c.document && <p className="flex items-center gap-1.5"><IdentificationCard size={11} weight="duotone" className="text-gray-500" />{c.document}</p>}
                  {!c.phone && !c.document && <span className="text-gray-400">—</span>}
                </div>
              ),
            },
            {
              key: 'discount',
              label: 'Descuento',
              render: (c) =>
                Number(c.discountPercent) > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-[11px] font-bold">
                    <Tag size={10} weight="bold" /> {Number(c.discountPercent)}%
                  </span>
                ) : <span className="text-gray-300">—</span>,
            },
            {
              key: 'creditLimit',
              label: 'Límite',
              render: (c) => {
                const debt = Number(c.currentDebt);
                const limit = Number(c.creditLimit);
                const usage = limit > 0 ? Math.min(100, (debt / limit) * 100) : 0;
                return limit > 0 ? (
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-mono text-xs font-medium">{formatCurrency(limit)}</span>
                    {debt > 0 && (
                      <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full ${usage >= 90 ? 'bg-red-500' : usage >= 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${usage}%` }} />
                      </div>
                    )}
                  </div>
                ) : <span className="text-[10px] text-gray-400">Sin límite</span>;
              },
            },
            {
              key: 'debt',
              label: 'Deuda',
              render: (c) => {
                const debt = Number(c.currentDebt);
                return debt > 0 ? (
                  <span className="font-mono text-sm font-bold text-red-600">{formatCurrency(debt)}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
                    <Check size={12} weight="bold" /> Al día
                  </span>
                );
              },
            },
            {
              key: 'actions',
              label: 'Acciones',
              cardHidden: true,
              render: (c) => (
                <div className="inline-flex gap-1">
                  <button onClick={() => viewDetail(c.id)} title="Ver detalle" className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors">
                    <Receipt size={14} weight="duotone" />
                  </button>
                  <button onClick={() => startEdit(c)} title="Editar" className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors">
                    <PencilSimple size={14} weight="bold" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Form modal */}
      {showForm && (<Portal>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {editId ? <PencilSimple size={20} weight="bold" /> : <Plus size={20} weight="bold" />}
                </div>
                <div>
                  <h3 className="font-bold text-base">{editId ? 'Editar cliente' : 'Nuevo cliente'}</h3>
                  <p className="text-[11px] text-white/80">{editId ? 'Actualiza los datos del cliente' : 'Registra un cliente para gestionar crédito y descuentos'}</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><X size={18} weight="bold" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300 uppercase tracking-wide">Nombre *</label>
                <div className="relative">
                  <UserCircle size={18} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="Juan Pérez" className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-slate-700 focus:border-red-300 focus:outline-none transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300 uppercase tracking-wide">Teléfono</label>
                  <div className="relative">
                    <Phone size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="3001234567" className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-slate-700 focus:border-red-300 focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300 uppercase tracking-wide">Documento</label>
                  <div className="relative">
                    <IdentificationCard size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="CC / NIT" className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-slate-700 focus:border-red-300 focus:outline-none transition-colors" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                    <CurrencyDollar size={12} weight="bold" /> Límite de crédito
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                    <input type="text" inputMode="decimal" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="0 = sin límite" className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-slate-700 focus:border-red-300 focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                    <Tag size={12} weight="bold" /> Descuento fijo
                  </label>
                  <div className="relative">
                    <input type="text" inputMode="decimal" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="0" className="w-full pl-3 pr-8 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-slate-700 focus:border-green-300 focus:outline-none transition-colors" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                  <NotePencil size={12} weight="bold" /> Notas
                </label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Observaciones, dirección, preferencias..." className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-slate-700 focus:border-red-300 focus:outline-none transition-colors resize-none" />
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={!form.name.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-bold hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <Check size={14} weight="bold" /> {editId ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Detail modal */}
      {detail && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setDetail(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center text-sm">
                    {detail.name.charAt(0).toUpperCase()}
                  </div>
                  {detail.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                  {detail.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {detail.phone}</span>}
                  {detail.document && <span className="inline-flex items-center gap-1"><IdentificationCard size={11} /> {detail.document}</span>}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={18} weight="bold" /></button>
            </div>

            <div className="grid grid-cols-4 gap-2 p-4 border-b dark:border-gray-700">
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded p-2 text-center">
                <p className="text-[10px] uppercase text-gray-400">Deuda actual</p>
                <p className={`text-lg font-bold ${Number(detail.currentDebt) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCurrency(detail.currentDebt)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded p-2 text-center">
                <p className="text-[10px] uppercase text-gray-400">Límite</p>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{formatCurrency(detail.creditLimit)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
                <p className="text-[10px] uppercase text-gray-400">Descuento</p>
                <p className="text-lg font-bold text-green-600">{Number(detail.discountPercent) > 0 ? `${Number(detail.discountPercent)}%` : '—'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded p-2 text-center">
                <p className="text-[10px] uppercase text-gray-400">Disponible</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(Math.max(0, Number(detail.creditLimit) - Number(detail.currentDebt)))}</p>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {detail.sales?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Ventas con saldo pendiente</h4>
                  <ul className="divide-y dark:divide-gray-700 text-sm border rounded-lg dark:border-gray-700">
                    {detail.sales.map((s) => (
                      <li key={s.id} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="font-medium">Venta #{s.id}</p>
                          <p className="text-[10px] text-gray-400">{formatDateTime(s.createdAt)}</p>
                        </div>
                        <span className="font-mono text-red-600">{formatCurrency(s.creditBalance)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.payments?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Historial de abonos</h4>
                  <ul className="divide-y dark:divide-gray-700 text-sm border rounded-lg dark:border-gray-700">
                    {detail.payments.map((p) => (
                      <li key={p.id} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-600">{formatCurrency(p.amount)}</p>
                          <p className="text-[10px] text-gray-400">{formatDateTime(p.createdAt)} · {p.method}{p.reference ? ` · ${p.reference}` : ''}</p>
                        </div>
                        {p.saleId && <span className="text-[10px] text-gray-400">venta #{p.saleId}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="border-t dark:border-gray-700 p-3 flex gap-2 bg-gray-50 dark:bg-slate-900/50">
              <button onClick={() => setShowPayment(true)} disabled={Number(detail.currentDebt) <= 0}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 inline-flex items-center justify-center gap-1.5">
                <Money size={16} weight="duotone" /> Registrar abono
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Payment modal */}
      {showPayment && detail && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" onClick={() => setShowPayment(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><Money size={20} weight="duotone" className="text-green-600" /> Registrar abono</h3>
              <button onClick={() => setShowPayment(false)} className="text-gray-400"><X size={18} weight="bold" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Cliente: <strong>{detail.name}</strong></p>
              <p className="text-xs">Deuda actual: <strong className="text-red-600">{formatCurrency(detail.currentDebt)}</strong></p>
              <div>
                <label className="block text-xs font-medium mb-1">Monto *</label>
                <input type="number" min="0" value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-lg font-mono text-right dark:bg-slate-700 dark:border-gray-600" />
                {paymentForm.amount > Number(detail.currentDebt) && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    Se devolverán {formatCurrency(paymentForm.amount - Number(detail.currentDebt))} al cliente como vuelto.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Método</label>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600">
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              {paymentForm.method !== 'CASH' && (
                <div>
                  <label className="block text-xs font-medium mb-1">Referencia / Voucher</label>
                  <input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder="Nº de aprobación o referencia"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1">Notas</label>
                <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowPayment(false)} className="flex-1 py-2 border rounded-lg text-sm dark:border-gray-600">Cancelar</button>
                <button onClick={submitPayment} disabled={!paymentForm.amount}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                  <Check size={14} weight="bold" /> Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      </Portal>)}
    </div>
  );
}
