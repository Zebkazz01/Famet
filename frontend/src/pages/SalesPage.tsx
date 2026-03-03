import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import toast from 'react-hot-toast';

interface Sale {
  id: number;
  total: string;
  paymentMethod: string;
  corrected?: boolean;
  correctionReason?: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
  _count: { items: number };
}

interface SaleDetail {
  id: number;
  total: string;
  subtotal: string;
  paymentMethod: string;
  amountPaid: string;
  changeAmount: string;
  corrected: boolean;
  correctionReason: string | null;
  correctedBy: number | null;
  correctedAt: string | null;
  createdAt: string;
  userId: number;
  user: { firstName: string; lastName: string };
  items: Array<{
    quantity: string;
    unitPrice: string;
    subtotal: string;
    product: { name: string; saleType: string };
  }>;
}

interface Summary {
  totalSales: number;
  totalRevenue: string;
  topProducts: Array<{ name: string; qty: string; revenue: string }>;
  byPayment: { CASH: string; CARD: string; TRANSFER: string };
}

export function SalesPage() {
  const { user, hasRole } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Correction state
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');

  const showSummary = hasRole('ADMIN', 'SUPERVISOR');

  const load = () => {
    client.get(`/sales?from=${dateFrom}&to=${dateTo}`).then((r) => setSales(r.data));
    if (showSummary) {
      client.get(`/sales/summary?date=${dateFrom}`).then((r) => setSummary(r.data)).catch(() => {});
    }
  };

  useEffect(load, [dateFrom, dateTo]);

  const viewDetail = async (id: number) => {
    const { data } = await client.get(`/sales/${id}`);
    setDetail(data);
    setShowCorrection(false);
    setCorrectionReason('');
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
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al corregir');
    }
  };

  const canCorrect = (sale: SaleDetail) => {
    if (sale.corrected) return false;
    if (hasRole('ADMIN', 'SUPERVISOR')) return true;
    // VENDEDOR can only correct own sales
    return hasRole('VENDEDOR') && sale.userId === user?.id;
  };

  const payMethodLabel: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transfer.' };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>

      {/* Filtros */}
      <div className="flex gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Desde</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hasta</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border rounded-md" />
        </div>
      </div>

      {/* Resumen del dia */}
      {showSummary && summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Ventas del dia</div>
            <div className="text-2xl font-bold">{summary.totalSales}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total del dia</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Efectivo</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.byPayment.CASH)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Tarjeta + Transfer.</div>
            <div className="text-2xl font-bold">{formatCurrency(parseFloat(summary.byPayment.CARD) + parseFloat(summary.byPayment.TRANSFER))}</div>
          </div>
        </div>
      )}

      {/* Lista de ventas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Cajero</th>
              <th className="text-center p-3">Items</th>
              <th className="text-left p-3">Pago</th>
              <th className="text-right p-3">Total</th>
              <th className="text-center p-3">Estado</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => viewDetail(s.id)}>
                <td className="p-3">{s.id}</td>
                <td className="p-3">{formatDateTime(s.createdAt)}</td>
                <td className="p-3">{`${s.user.firstName} ${s.user.lastName}`}</td>
                <td className="p-3 text-center">{s._count.items}</td>
                <td className="p-3">{payMethodLabel[s.paymentMethod]}</td>
                <td className="p-3 text-right font-bold">{formatCurrency(s.total)}</td>
                <td className="p-3 text-center">
                  {s.corrected && (
                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">Corregida</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <button onClick={(e) => { e.stopPropagation(); downloadTicket(s.id); }} className="text-blue-600 hover:underline text-xs">
                    Ticket
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Venta #{detail.id}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadTicket(detail.id)} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs">
                  Descargar Ticket
                </button>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">&#10005;</button>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-3">
              {formatDateTime(detail.createdAt)} — {detail.user.firstName} {detail.user.lastName}
            </div>

            {/* Correction badge */}
            {detail.corrected && (
              <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <span className="font-medium text-yellow-700">Corregida</span>
                <span className="text-gray-500 ml-2">Motivo: {detail.correctionReason}</span>
                {detail.correctedAt && (
                  <span className="text-gray-400 ml-2">({formatDateTime(detail.correctedAt)})</span>
                )}
              </div>
            )}

            <div className="space-y-2 mb-4">
              {detail.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.product.name}</span>
                    <span className="text-gray-500 ml-2">
                      {parseFloat(item.quantity).toFixed(3)} {item.product.saleType === 'WEIGHT' ? 'kg' : 'uds'} x {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL</span>
                <span>{formatCurrency(detail.total)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Pago: {payMethodLabel[detail.paymentMethod]}</span>
                <span>Pagado: {formatCurrency(detail.amountPaid)}</span>
              </div>
              {parseFloat(detail.changeAmount) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Cambio</span>
                  <span>{formatCurrency(detail.changeAmount)}</span>
                </div>
              )}
            </div>

            {/* Correction section */}
            {canCorrect(detail) && (
              <div className="border-t mt-4 pt-3">
                {!showCorrection ? (
                  <button onClick={() => setShowCorrection(true)} className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                    Marcar como corregida
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Motivo de la corrección *</label>
                    <textarea
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      rows={2}
                      placeholder="Describe el motivo de la corrección..."
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowCorrection(false)} className="px-3 py-1 bg-gray-200 rounded text-sm">Cancelar</button>
                      <button onClick={submitCorrection} className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">Confirmar Corrección</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
