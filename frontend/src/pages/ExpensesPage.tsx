import { useEffect, useMemo, useState } from 'react';
import {
  Receipt, Plus, Trash, Eye, FileArrowDown, CurrencyDollar, ChartPie,
  Calendar, MagnifyingGlass, X, PencilSimple, Folder, SortAscending,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import * as expensesApi from '../api/expenses';
import type { Expense, ExpensePaymentMethod } from '../api/expenses';
import { Card, Button, Badge, Input, Combobox, FilterPanel, DatePicker, Select, FileInput, SkeletonRow } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { useTableFilters } from '../hooks/useTableFilters';
import { Portal } from '../components/Portal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useEnterSubmit } from '../hooks/useEnterSubmit';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useModalEscape } from '../contexts/ModalStackContext';

interface PageFilters extends Record<string, any> {
  q: string;
  category: string;
  from: string;
  to: string;
  sort: string;
}

const PAYMENT_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

interface FormState {
  amount: string;
  description: string;
  category: string;
  date: string;
  paymentMethod: '' | ExpensePaymentMethod;
  evidence: File | null;
}

const EMPTY_FORM: FormState = {
  amount: '',
  description: '',
  category: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: '',
  evidence: null,
};

export function ExpensesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<expensesApi.ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [viewEvidence, setViewEvidence] = useState<Expense | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useModalEscape(showForm ? () => setShowForm(false) : null);
  useModalEscape(viewEvidence ? () => setViewEvidence(null) : null);

  const { filters, setFilter, clear, activeCount } = useTableFilters<PageFilters>({
    q: '',
    category: '',
    from: '',
    to: '',
    sort: 'recent',
  });

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const s = filters.sort || 'recent';
      if (s === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (s === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (s === 'amountDesc') return Number(b.amount) - Number(a.amount);
      if (s === 'amountAsc') return Number(a.amount) - Number(b.amount);
      if (s === 'az') return a.description.localeCompare(b.description);
      if (s === 'za') return b.description.localeCompare(a.description);
      return 0;
    });
  }, [expenses, filters.sort]);

  const monthYM = new Date().toISOString().slice(0, 7);

  async function refresh() {
    setLoading(true);
    try {
      const [items, sum] = await Promise.all([
        expensesApi.list({
          q: filters.q || undefined,
          category: filters.category || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        }),
        expensesApi.summary(monthYM),
      ]);
      setExpenses(items);
      setSummary(sum);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.category, filters.from, filters.to]);

  function startNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(e: Expense) {
    setEditId(e.id);
    setForm({
      amount: String(e.amount),
      description: e.description,
      category: e.category,
      date: e.date.slice(0, 10),
      paymentMethod: e.paymentMethod ?? '',
      evidence: null,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.amount || !form.description || !form.category || !form.date) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Monto inválido');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        amount,
        description: form.description,
        category: form.category,
        date: form.date,
        paymentMethod: (form.paymentMethod || null) as ExpensePaymentMethod | null,
      };
      if (editId) {
        await expensesApi.update(editId, payload, form.evidence);
        toast.success('Gasto actualizado');
      } else {
        await expensesApi.create(payload, form.evidence);
        toast.success('Gasto registrado');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await expensesApi.remove(confirmDelete);
      toast.success('Gasto eliminado');
      setConfirmDelete(null);
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al eliminar');
    }
  }

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(expensesApi.EXPENSE_CATEGORY_SUGGESTIONS);
    for (const e of expenses) set.add(e.category);
    return [{ value: '', label: 'Todas las categorías' }, ...Array.from(set).sort().map((c) => ({ value: c, label: c }))];
  }, [expenses]);

  useEnterSubmit(handleSave, showForm);

  return (
    <div className="flex-1 overflow-auto styled-scroll p-4 md:p-6 space-y-4">
      <PageHeader
        icon={<Receipt size={24} weight="duotone" />}
        title="Gastos"
        description="Registra egresos del negocio con categoría, proveedor opcional, descripción y comprobante adjunto (foto o PDF). Filtra por fecha y categoría para análisis. Los gastos impactan el resultado neto del período."
        actions={
          <Button id="expenses-new-btn" size="md" variant="primary" iconLeft={<Plus size={16} weight="bold" />} onClick={startNew}>
            Nuevo gasto
          </Button>
        }
      />

      {/* Stats */}
      <div id="expenses-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <CurrencyDollar size={20} weight="duotone" className="text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Total mes</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {summary ? formatCurrency(summary.totalAmount) : '—'}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Calendar size={20} weight="duotone" className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Promedio diario</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {summary ? formatCurrency(summary.dailyAvg) : '—'}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <ChartPie size={20} weight="duotone" className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Categoría líder</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {summary?.topCategories[0]?.category || '—'}
              </p>
              <p className="text-[11px] text-gray-500">
                {summary?.topCategories[0] ? formatCurrency(summary.topCategories[0].amount) : ''}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <FilterPanel storageKey="expenses" toggleOnEvent="fameat:toggle-filters"
        activeCount={activeCount}
        onClear={clear}
        chips={[
          ...(filters.q ? [{ key: 'q', label: `"${filters.q}"`, onRemove: () => setFilter('q', '') }] : []),
          ...(filters.category ? [{ key: 'category', label: filters.category, onRemove: () => setFilter('category', '') }] : []),
          ...(filters.from || filters.to ? [{ key: 'date', label: `${filters.from || '...'} → ${filters.to || '...'}`, onRemove: () => { setFilter('from', ''); setFilter('to', ''); } }] : []),
        ]}
      >
        <Input
          label="Buscar"
          placeholder="Descripción o categoría..."
          value={filters.q}
          onChange={(e) => setFilter('q', e.target.value)}
          prefix={<MagnifyingGlass size={14} />}
          data-search-input=""
        />
        <Combobox
          label="Categoría"
          icon={<Folder size={14} weight="duotone" />}
          placeholder="Selecciona categoría"
          options={categoryOptions}
          value={filters.category}
          onChange={(v) => setFilter('category', (v as string) || '')}
        />
        <DatePicker label="Desde" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
        <DatePicker label="Hasta" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
        <Combobox
          label="Ordenar por"
          icon={<SortAscending size={14} weight="duotone" />}
          options={[
            { value: 'recent', label: 'Más reciente' },
            { value: 'oldest', label: 'Más antiguo' },
            { value: 'amountDesc', label: 'Monto mayor a menor' },
            { value: 'amountAsc', label: 'Monto menor a mayor' },
            { value: 'az', label: 'Descripción A-Z' },
            { value: 'za', label: 'Descripción Z-A' },
          ]}
          value={filters.sort}
          onChange={(v) => setFilter('sort', (v as string) || 'recent')}
          clearable={false}
        />
      </FilterPanel>

      {/* Lista */}
      <Card id="expenses-list" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Descripción</th>
                <th className="px-4 py-2 text-left">Categoría</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-left">Pago</th>
                <th className="px-4 py-2 text-left">Evidencia</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && expenses.length === 0 && (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              )}
              {!loading && expenses.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center">
                  {filters.q || filters.category || filters.from || filters.to ? (
                    <>
                      <MagnifyingGlass size={36} weight="duotone" className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-medium mb-1">Sin resultados</p>
                      <p className="text-xs text-gray-400 mb-3">No hay gastos que coincidan con los filtros</p>
                      <button onClick={clear} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200">
                        <X size={12} weight="bold" /> Limpiar filtros
                      </button>
                    </>
                  ) : (
                    <>
                      <Receipt size={36} weight="duotone" className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-medium mb-1">Aún no hay gastos</p>
                      <p className="text-xs text-gray-400 mb-3">Registra el primer gasto para llevar el control</p>
                      <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">
                        <Plus size={12} weight="bold" /> Nuevo gasto
                      </button>
                    </>
                  )}
                </td></tr>
              )}
              {sortedExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{formatDateTime(e.date).split(' ')[0]}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{e.description}</p>
                    {e.user && <p className="text-[10px] text-gray-400">{e.user.firstName} {e.user.lastName}</p>}
                  </td>
                  <td className="px-4 py-2"><Badge variant="blue" size="xs">{e.category}</Badge></td>
                  <td className="px-4 py-2 text-right font-bold text-red-500">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-2">
                    {e.paymentMethod ? (
                      <Badge variant="gray" size="xs">{
                        e.paymentMethod === 'CASH' ? 'Efectivo' :
                        e.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transferencia'
                      }</Badge>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    {e.evidenceUrl ? (
                      <button onClick={() => setViewEvidence(e)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Eye size={12} /> Ver
                      </button>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => startEdit(e)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-blue-600">
                        <PencilSimple size={14} weight="duotone" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => setConfirmDelete(e.id)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-red-500">
                          <Trash size={14} weight="duotone" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Form */}
      {showForm && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(ev) => ev.stopPropagation()}>
              <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt size={22} weight="duotone" className="text-white" />
                  <h3 className="text-white font-bold text-lg">{editId ? 'Editar gasto' : 'Nuevo gasto'}</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
                  <X size={18} weight="bold" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Monto *"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    prefix={<CurrencyDollar size={14} />}
                  />
                  <DatePicker
                    label="Fecha *"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                  <Combobox
                    label="Categoría *"
                    options={expensesApi.EXPENSE_CATEGORY_SUGGESTIONS.map((c) => ({ value: c, label: c }))}
                    value={form.category}
                    onChange={(v) => setForm({ ...form, category: (v as string) || '' })}
                    placeholder="Seleccionar o escribir..."
                  />
                  <Select
                    label="Método de pago"
                    options={PAYMENT_OPTIONS}
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as any })}
                  />
                </div>
                <Input
                  label="Descripción *"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej: Factura de agua mes mayo"
                />
                <FileInput
                  label="Evidencia (imagen o PDF, opcional)"
                  accept="image/*,application/pdf"
                  maxSizeMB={10}
                  value={form.evidence}
                  onChange={(file) => setForm({ ...form, evidence: file })}
                  existingUrl={editId ? expenses.find((x) => x.id === editId)?.evidenceUrl ?? undefined : undefined}
                  hint="Adjunta foto del recibo o PDF de la factura"
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave} loading={saving}>
                  {editId ? 'Guardar' : 'Registrar'}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Visor evidencia */}
      {viewEvidence && viewEvidence.evidenceUrl && (
        <Portal>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4" onClick={() => setViewEvidence(null)}>
            <div className="relative max-w-3xl w-full" onClick={(ev) => ev.stopPropagation()}>
              <button onClick={() => setViewEvidence(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 z-10">
                <X size={16} weight="bold" />
              </button>
              {/\.(pdf)$/i.test(viewEvidence.evidenceUrl) ? (
                <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
                  <FileArrowDown size={48} weight="duotone" className="text-red-500" />
                  <p className="text-sm text-gray-700">PDF · {viewEvidence.description}</p>
                  <a href={viewEvidence.evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                    Abrir PDF
                  </a>
                </div>
              ) : (
                <img src={viewEvidence.evidenceUrl} alt="evidencia" className="w-full rounded-xl shadow-2xl object-contain max-h-[85vh]" />
              )}
              <p className="text-white text-center text-sm mt-3 font-medium">{viewEvidence.description}</p>
            </div>
          </div>
        </Portal>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Eliminar gasto"
        message="Esta acción es permanente. ¿Continuar?"
        variant="danger"
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
