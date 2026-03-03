import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import toast from 'react-hot-toast';

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

  const [tab, setTab] = useState<'movements' | 'closings'>(canCreateMovement ? 'movements' : 'closings');
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states
  const [showMovForm, setShowMovForm] = useState(false);
  const [movType, setMovType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');

  const [showCloseForm, setShowCloseForm] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const loadMovements = () => {
    client.get(`/cash/movements?date=${date}`).then((r) => setMovements(r.data));
  };

  const loadClosings = () => {
    client.get(`/cash/closings?from=${date}&to=${date}`).then((r) => setClosings(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadMovements();
    if (canCreateClosing) loadClosings();
  }, [date]);

  const submitMovement = async () => {
    if (!movAmount || !movReason) return toast.error('Completa todos los campos');
    try {
      await client.post('/cash/movement', { type: movType, amount: parseFloat(movAmount), reason: movReason });
      toast.success('Movimiento registrado');
      setShowMovForm(false);
      setMovAmount('');
      setMovReason('');
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Caja</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border rounded-md" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {canCreateMovement && (
          <button
            onClick={() => setTab('movements')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'movements' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Movimientos
          </button>
        )}
        {canCreateClosing && (
          <button
            onClick={() => setTab('closings')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'closings' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Cierres de Caja
          </button>
        )}
      </div>

      {/* Tab: Movimientos */}
      {tab === 'movements' && (
        <div>
          {canCreateMovement && (
            <button onClick={() => setShowMovForm(true)} className="mb-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
              + Nuevo Movimiento
            </button>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Hora</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-right p-3">Monto</th>
                  <th className="text-left p-3">Motivo</th>
                  <th className="text-left p-3">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{formatDateTime(m.createdAt)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.type === 'CASH_IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.type === 'CASH_IN' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-bold ${m.type === 'CASH_IN' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'CASH_IN' ? '+' : '-'}{formatCurrency(m.amount)}
                    </td>
                    <td className="p-3">{m.reason}</td>
                    <td className="p-3">{m.user.firstName} {m.user.lastName}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-400">Sin movimientos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Cierres */}
      {tab === 'closings' && (
        <div>
          {canCreateClosing && (
            <button onClick={() => setShowCloseForm(true)} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
              + Nuevo Cierre
            </button>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-right p-3">Esperado</th>
                  <th className="text-right p-3">Real</th>
                  <th className="text-right p-3">Diferencia</th>
                  <th className="text-left p-3">Notas</th>
                  <th className="text-left p-3">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {closings.map((c) => {
                  const diff = parseFloat(c.difference);
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="p-3">{formatDateTime(c.createdAt)}</td>
                      <td className="p-3 text-right">{formatCurrency(c.expectedAmount)}</td>
                      <td className="p-3 text-right">{formatCurrency(c.actualAmount)}</td>
                      <td className={`p-3 text-right font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff >= 0 ? '+' : ''}{formatCurrency(c.difference)}
                      </td>
                      <td className="p-3 text-gray-500">{c.notes || '-'}</td>
                      <td className="p-3">{c.user.firstName} {c.user.lastName}</td>
                    </tr>
                  );
                })}
                {closings.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-400">Sin cierres</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Nuevo movimiento */}
      {showMovForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMovForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Nuevo Movimiento de Caja</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMovType('CASH_IN')}
                    className={`flex-1 py-2 rounded text-sm font-medium ${movType === 'CASH_IN' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                  >
                    Entrada
                  </button>
                  <button
                    onClick={() => setMovType('CASH_OUT')}
                    className={`flex-1 py-2 rounded text-sm font-medium ${movType === 'CASH_OUT' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
                  >
                    Salida
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto ($)</label>
                <input type="number" value={movAmount} onChange={(e) => setMovAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md" min="0.01" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <input type="text" value={movReason} onChange={(e) => setMovReason(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Ej: Cambio para caja" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowMovForm(false)} className="flex-1 py-2 bg-gray-200 rounded-md text-sm">Cancelar</button>
              <button onClick={submitMovement} className="flex-1 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo cierre */}
      {showCloseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCloseForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Cierre de Caja</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Monto esperado ($)</label>
                <input type="number" value={expectedAmount} onChange={(e) => setExpectedAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto real ($)</label>
                <input type="number" value={actualAmount} onChange={(e) => setActualAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md" min="0" step="0.01" />
              </div>
              {expectedAmount && actualAmount && (
                <div className={`p-3 rounded-md text-sm font-medium ${difference >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  Diferencia: {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCloseForm(false)} className="flex-1 py-2 bg-gray-200 rounded-md text-sm">Cancelar</button>
              <button onClick={submitClosing} className="flex-1 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Registrar Cierre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
