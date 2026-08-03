import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { getBusinessDayDate, getTodayCalendarDate } from '../utils/businessDay';
import toast from 'react-hot-toast';
import { CurrencyDollar, Plus, Vault, X, ArrowDown, ArrowUp, Wallet, Funnel, SortAscending, Trash, Eye } from '@phosphor-icons/react';

import { Portal } from '../components/Portal';
import { ConfirmModal } from '../components/ConfirmModal';
import { CurrencyInput } from '../components/CurrencyInput';
import { StatsCards } from '../components/StatsCards';
import { PageSkeleton } from '../components/PageSkeleton';
import { ErrorView } from '../components/ErrorBoundary';
import { ViewToggle } from '../components/ViewToggle';
import { FilterDropdown, RefreshButton, DatePicker, Select } from '../components/ui';
import { useTableFilters } from '../hooks/useTableFilters';
import { useEnterSubmit } from '../hooks/useEnterSubmit';
import { PageHeader } from '../components/layout/PageHeader';
import { useModalEscape } from '../contexts/ModalStackContext';

interface CashMovement {
  id: number;
  type: 'CASH_IN' | 'CASH_OUT';
  amount: string;
  reason: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

interface CashClosing {
  id: number;
  expectedAmount: string;
  actualAmount: string;
  difference: string;
  notes: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

export function CashPage() {
  const { hasRole } = useAuth();
  const canCreateMovement = hasRole('ADMIN', 'VENDEDOR');
  const canCreateClosing = hasRole('ADMIN', 'SUPERVISOR');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [tab, setTab] = useState<'movements' | 'closings'>(canCreateMovement ? 'movements' : 'closings');
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [date, setDate] = useState(() => getBusinessDayDate());

  const todayStr = getBusinessDayDate();

  // Form states
  const [showMovForm, setShowMovForm] = useState(false);
  const [movType, setMovType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movSource, setMovSource] = useState('MANUAL');

  const [showOpeningForm, setShowOpeningForm] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');

  const [showCloseForm, setShowCloseForm] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const [detailMovement, setDetailMovement] = useState<CashMovement | null>(null);
  const [confirmDeleteMov, setConfirmDeleteMov] = useState<number | null>(null);
  const [confirmDeleteClosing, setConfirmDeleteClosing] = useState<number | null>(null);

  useModalEscape(showMovForm ? () => setShowMovForm(false) : null);
  useModalEscape(showOpeningForm ? () => setShowOpeningForm(false) : null);
  useModalEscape(showCloseForm ? () => setShowCloseForm(false) : null);
  useModalEscape(detailMovement ? () => setDetailMovement(null) : null);

  const { filters: cFilters, setFilter: setCFilter, clear: clearCFilters, activeCount: cActiveCount } = useTableFilters<{ type: string; sort: string }>({ type: '', sort: 'recent' });

  const loadMovements = () =>
    client.get(`/cash/movements?date=${date}`)
      .then((r) => setMovements(r.data))
      .catch((err) => { toast.error(err.response?.data?.error || 'Error al cargar movimientos'); });

  const loadClosings = () =>
    client.get(`/cash/closings?from=${date}&to=${date}`)
      .then((r) => setClosings(r.data))
      .catch(() => {});

  const handleDeleteMovement = async () => {
    if (!confirmDeleteMov) return;
    try {
      await client.delete(`/cash/movement/${confirmDeleteMov}`);
      toast.success('Movimiento eliminado permanentemente');
      setDetailMovement(null);
      setConfirmDeleteMov(null);
      loadMovements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar movimiento');
      setConfirmDeleteMov(null);
    }
  };

  const handleDeleteClosing = async () => {
    if (!confirmDeleteClosing) return;
    try {
      await client.delete(`/cash/closing/${confirmDeleteClosing}`);
      toast.success('Cierre eliminado permanentemente');
      setConfirmDeleteClosing(null);
      loadClosings();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar cierre');
      setConfirmDeleteClosing(null);
    }
  };

  useEffect(() => {
    Promise.all([
      loadMovements(),
      canCreateClosing ? loadClosings() : Promise.resolve(),
    ]).catch((err) => setLoadError(err)).finally(() => setLoading(false));
  }, [date]);

  const submitMovement = async () => {
    if (!movAmount || !movReason) return toast.error('Completa todos los campos');
    try {
      await client.post('/cash/movement', { type: movType, amount: parseFloat(movAmount), reason: movReason, source: movSource });
      toast.success('Movimiento registrado');
      setShowMovForm(false);
      setMovAmount('');
      setMovReason('');
      setMovSource('MANUAL');
      loadMovements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const submitOpening = async () => {
    if (!openingAmount) return toast.error('Ingresa el monto de apertura');
    try {
      await client.post('/cash/movement', { type: 'CASH_IN', amount: parseFloat(openingAmount), reason: 'Fondo de apertura', source: 'OPENING' });
      toast.success('Fondo de apertura registrado');
      setShowOpeningForm(false);
      setOpeningAmount('');
      loadMovements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const submitClosing = async () => {
    if (!expectedAmount || !actualAmount) return toast.error('Completa los montos');
    try {
      await client.post('/cash/closing', {
        expectedAmount: parseFloat(expectedAmount),
        actualAmount: parseFloat(actualAmount),
        notes: closeNotes || undefined,
      });
      toast.success('Cierre registrado');
      setShowCloseForm(false);
      setExpectedAmount('');
      setActualAmount('');
      setCloseNotes('');
      loadClosings();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const difference = expectedAmount && actualAmount ? parseFloat(actualAmount) - parseFloat(expectedAmount) : 0;

  useEnterSubmit(submitMovement, showMovForm);

  if (loading) return <PageSkeleton type="table" />;
  if (loadError) return <ErrorView error={loadError} onRetry={() => window.location.reload()} />;

  return (
    <div className="p-3 md:p-6">
      <PageHeader
        icon={<CurrencyDollar size={24} weight="duotone" />}
        title="Caja"
        description="Controla el efectivo del negocio: registra entradas (fondos, depósitos) y salidas (pagos, retiros). Realiza cierres de caja al final del turno comparando lo esperado con lo real para detectar diferencias."
        actions={
          <>
            <FilterDropdown
              activeCount={cActiveCount + (date !== todayStr ? 1 : 0)}
              onClear={() => { clearCFilters(); setDate(todayStr); }}
              chips={cFilters.type ? [{ key: 't', label: cFilters.type === 'CASH_IN' ? 'Entradas' : 'Salidas', onRemove: () => setCFilter('type', '') }] : []}
              storageKey="cash"
            >
              <DatePicker label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} />
              <Select label="Tipo" icon={<Funnel size={14} weight="duotone" />} placeholder="Selecciona tipo" options={[
                { value: '', label: 'Todos' }, { value: 'CASH_IN', label: 'Entradas' }, { value: 'CASH_OUT', label: 'Salidas' },
              ]} value={cFilters.type} onChange={(e) => setCFilter('type', e.target.value)} />
              <Select label="Ordenar por" icon={<SortAscending size={14} weight="duotone" />} options={[
                { value: 'recent', label: 'Más reciente' },
                { value: 'oldest', label: 'Más antiguo' },
                { value: 'amountDesc', label: 'Monto mayor a menor' },
                { value: 'amountAsc', label: 'Monto menor a mayor' },
              ]} value={cFilters.sort} onChange={(e) => setCFilter('sort', e.target.value)} />
            </FilterDropdown>
          </>
        }
      />

      <StatsCards cards={(() => {
        const inTotal = movements.filter(m => m.type === 'CASH_IN').reduce((s, m) => s + parseFloat(m.amount), 0);
        const outTotal = movements.filter(m => m.type === 'CASH_OUT').reduce((s, m) => s + parseFloat(m.amount), 0);
        return [
          { label: 'Movimientos', value: movements.length, icon: <Wallet size={20} weight="duotone" />, color: 'bg-blue-100 text-blue-600' },
          { label: 'Entradas', value: formatCurrency(inTotal), icon: <ArrowDown size={20} weight="bold" />, color: 'bg-green-100 text-green-600' },
          { label: 'Salidas', value: formatCurrency(outTotal), icon: <ArrowUp size={20} weight="bold" />, color: 'bg-red-100 text-red-500' },
          { label: 'Balance', value: formatCurrency(inTotal - outTotal), icon: <CurrencyDollar size={20} weight="duotone" />, color: inTotal - outTotal >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500' },
        ];
      })()} />

      {/* Tabs */}
      <div id="cash-tabs" className="flex gap-2 mb-4">
        {canCreateMovement && (
          <button
            onClick={() => setTab('movements')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'movements' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Movimientos
          </button>
        )}
        {canCreateClosing && (
          <button
            onClick={() => setTab('closings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'closings' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Cierres de Caja
          </button>
        )}
      </div>

      {/* Tab: Movimientos */}
      {tab === 'movements' && (
        <div>
          {canCreateMovement && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                id="cash-opening-btn"
                onClick={() => setShowOpeningForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium shadow-sm"
              >
                <Wallet size={16} weight="duotone" /> Fondo de Apertura
              </button>
              <button id="cash-new-btn" onClick={() => { setMovSource('MANUAL'); setShowMovForm(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                <Plus size={16} weight="bold" /> Nuevo Movimiento
              </button>
            </div>
          )}

          <div id="cash-list" className="bg-white rounded-xl shadow p-4">
            <ViewToggle storageKey="cash"
              data={movements.filter((m) => !cFilters.type || m.type === cFilters.type).sort((a, b) => {
                const s = cFilters.sort || 'recent';
                if (s === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                if (s === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                if (s === 'amountDesc') return parseFloat(b.amount) - parseFloat(a.amount);
                if (s === 'amountAsc') return parseFloat(a.amount) - parseFloat(b.amount);
                return 0;
              })}
              totalCount={movements.length}
              refreshSlot={<RefreshButton onClick={() => { loadMovements(); if (canCreateClosing) loadClosings(); }} loading={loading} />}
              keyField="id"
              searchFilter={(m, q) => m.reason.toLowerCase().includes(q) || `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(q)}
              searchPlaceholder="Buscar por motivo o usuario..."
              cardTitle={(m) => m.reason}
              cardSubtitle={(m) => formatDateTime(m.createdAt)}
              cardBadge={(m) => (
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${m.type === 'CASH_IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {m.type === 'CASH_IN' ? 'Entrada' : 'Salida'}
                </span>
              )}
              cardActions={(m) => (
                <button onClick={() => setDetailMovement(m)}
                  className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-medium">
                  <Eye size={14} weight="duotone" /> Detalle
                </button>
              )}
              columns={[
                { key: 'date', label: 'Hora', render: (m) => formatDateTime(m.createdAt), cardHidden: true },
                { key: 'type', label: 'Tipo', render: (m) => (
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${m.type === 'CASH_IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {m.type === 'CASH_IN' ? 'Entrada' : 'Salida'}
                  </span>
                ), cardHidden: true },
                { key: 'amount', label: 'Monto', render: (m) => (
                  <span className={`font-bold ${m.type === 'CASH_IN' ? 'text-green-600' : 'text-red-500'}`}>
                    {m.type === 'CASH_IN' ? '+' : '-'}{formatCurrency(m.amount)}
                  </span>
                )},
                { key: 'reason', label: 'Motivo', render: (m) => m.reason, cardHidden: true },
                { key: 'user', label: 'Usuario', render: (m) => `${m.user.firstName} ${m.user.lastName}` },
              ]}
              emptyMessage="Sin movimientos de caja"
              onCreateNew={() => setShowMovForm(true)}
              createNewLabel="Nuevo movimiento"
            />
          </div>
        </div>
      )}

      {/* Tab: Cierres */}
      {tab === 'closings' && (
        <div>
          {canCreateClosing && (
            <button onClick={() => setShowCloseForm(true)} className="inline-flex items-center gap-1.5 mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Vault size={16} weight="duotone" /> Nuevo Cierre
            </button>
          )}

          <div className="bg-white rounded-xl shadow p-4">
            <ViewToggle storageKey="cash"
              data={closings}
              keyField="id"
              searchFilter={(c, q) => `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(q)}
              searchPlaceholder="Buscar por responsable..."
              cardTitle={(c) => `Cierre - ${c.user.firstName} ${c.user.lastName}`}
              cardSubtitle={(c) => formatDateTime(c.createdAt)}
              cardBadge={(c) => {
                const diff = parseFloat(c.difference);
                return <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${diff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {diff >= 0 ? '+' : ''}{formatCurrency(c.difference)}
                </span>;
              }}
              cardActions={(c) => hasRole('ADMIN') ? (
                <button onClick={() => setConfirmDeleteClosing(c.id)}
                  className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium">
                  <Trash size={14} weight="duotone" /> Eliminar
                </button>
              ) : null}
              columns={[
                { key: 'date', label: 'Fecha', render: (c) => formatDateTime(c.createdAt), cardHidden: true },
                { key: 'expected', label: 'Esperado', render: (c) => formatCurrency(c.expectedAmount) },
                { key: 'actual', label: 'Real', render: (c) => formatCurrency(c.actualAmount) },
                { key: 'diff', label: 'Diferencia', render: (c) => {
                  const diff = parseFloat(c.difference);
                  return <span className={`font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>{diff >= 0 ? '+' : ''}{formatCurrency(c.difference)}</span>;
                }, cardHidden: true },
                { key: 'notes', label: 'Notas', render: (c) => <span className="text-gray-500">{c.notes || '-'}</span> },
                { key: 'actions', label: 'Acciones', render: (c) => hasRole('ADMIN') ? (
                  <button onClick={() => setConfirmDeleteClosing(c.id)}
                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium">
                    <Trash size={14} weight="duotone" /> Eliminar
                  </button>
                ) : null, cardHidden: true },
              ]}
              emptyMessage="Sin cierres de caja"
              onCreateNew={() => setShowCloseForm(true)}
              createNewLabel="Nuevo cierre"
            />
          </div>
        </div>
      )}

      {/* Modal: Nuevo movimiento */}
      {showMovForm && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowMovForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-auto relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowMovForm(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} weight="bold" />
            </button>
            <h3 className="text-lg font-bold mb-4">Nuevo Movimiento de Caja</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMovType('CASH_IN')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${movType === 'CASH_IN' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                  >
                    Entrada
                  </button>
                  <button
                    onClick={() => setMovType('CASH_OUT')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${movType === 'CASH_OUT' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                  >
                    Salida
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto ($)</label>
                <CurrencyInput value={movAmount} onChange={setMovAmount} className="w-full pr-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <input type="text" value={movReason} onChange={(e) => setMovReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: Cambio para caja" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowMovForm(false)} className="flex-1 py-2 bg-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={submitMovement} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Registrar</button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal: Fondo de apertura */}
      {showOpeningForm && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowOpeningForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowOpeningForm(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} weight="bold" />
            </button>
            <h3 className="text-lg font-bold mb-1">Fondo de Apertura</h3>
            <p className="text-sm text-gray-500 mb-4">Registra el efectivo inicial en caja al abrir el turno.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Monto de apertura ($)</label>
                <CurrencyInput value={openingAmount} onChange={setOpeningAmount} className="w-full pr-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowOpeningForm(false)} className="flex-1 py-2 bg-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={submitOpening} className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 font-medium">Registrar Apertura</button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal: Nuevo cierre */}
      {showCloseForm && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowCloseForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-auto relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowCloseForm(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} weight="bold" />
            </button>
            <h3 className="text-lg font-bold mb-4">Cierre de Caja</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Monto esperado ($)</label>
                <CurrencyInput value={expectedAmount} onChange={setExpectedAmount} className="w-full pr-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto real ($)</label>
                <CurrencyInput value={actualAmount} onChange={setActualAmount} className="w-full pr-3 py-2 border rounded-lg" />
              </div>
              {expectedAmount && actualAmount && (
                <div className={`p-3 rounded-lg text-sm font-medium ${difference >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  Diferencia: {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCloseForm(false)} className="flex-1 py-2 bg-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={submitClosing} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Registrar Cierre</button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal detalle movimiento */}
      {detailMovement && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setDetailMovement(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">Detalle del movimiento</h3>
              <button onClick={() => setDetailMovement(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-500">Tipo</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${detailMovement.type === 'CASH_IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {detailMovement.type === 'CASH_IN' ? 'Entrada' : 'Salida'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-500">Monto</span>
                <span className={`text-lg font-bold ${detailMovement.type === 'CASH_IN' ? 'text-green-600' : 'text-red-500'}`}>
                  {detailMovement.type === 'CASH_IN' ? '+' : '-'}{formatCurrency(detailMovement.amount)}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Motivo</p>
                <p className="text-sm font-medium">{detailMovement.reason}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Registrado por</p>
                <p className="text-sm font-medium">{detailMovement.user.firstName} {detailMovement.user.lastName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Fecha</p>
                <p className="text-sm font-medium">{formatDateTime(detailMovement.createdAt)}</p>
              </div>
            </div>
            <div className="px-4 pb-4 flex gap-2">
              {hasRole('ADMIN') && (
                <button
                  onClick={() => setConfirmDeleteMov(detailMovement.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors"
                >
                  <Trash size={16} weight="duotone" /> Eliminar movimiento
                </button>
              )}
              <button onClick={() => setDetailMovement(null)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      <ConfirmModal
        open={confirmDeleteMov !== null}
        title="Eliminar movimiento"
        message="Este movimiento se eliminará permanentemente de la base de datos. ¿Estás seguro?"
        variant="danger"
        confirmText="Eliminar"
        onConfirm={handleDeleteMovement}
        onCancel={() => setConfirmDeleteMov(null)}
      />
      <ConfirmModal
        open={confirmDeleteClosing !== null}
        title="Eliminar cierre"
        message="Este cierre de caja se eliminará permanentemente de la base de datos. ¿Estás seguro?"
        variant="danger"
        confirmText="Eliminar"
        onConfirm={handleDeleteClosing}
        onCancel={() => setConfirmDeleteClosing(null)}
      />
    </div>
  );
}
