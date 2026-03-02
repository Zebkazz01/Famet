import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatDateTime } from '../utils/formatters';
import toast from 'react-hot-toast';
import { MOVEMENT_TYPES } from '../utils/constants';

interface Product {
  id: number;
  name: string;
  stockQty: string;
  minStock: string;
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
}

export function InventoryPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: '', type: 'ENTRY', quantity: '', notes: '' });
  const [tab, setTab] = useState<'movements' | 'alerts'>('movements');

  const load = () => {
    client.get('/inventory/movements').then((r) => setMovements(r.data));
    client.get('/inventory/alerts').then((r) => setAlerts(r.data));
    client.get('/products').then((r) => setProducts(r.data));
  };

  useEffect(load, []);

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
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <button onClick={() => setShowForm(true)} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
          + Nuevo Movimiento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('movements')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'movements' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
          Movimientos
        </button>
        <button onClick={() => setTab('alerts')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'alerts' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
          Alertas Stock Bajo {alerts.length > 0 && <span className="ml-1 bg-red-100 text-red-700 px-1.5 rounded-full text-xs">{alerts.length}</span>}
        </button>
      </div>

      {tab === 'movements' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Producto</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-right p-3">Cantidad</th>
                <th className="text-right p-3">Anterior</th>
                <th className="text-right p-3">Nuevo</th>
                <th className="text-left p-3">Notas</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const mt = MOVEMENT_TYPES[m.type as keyof typeof MOVEMENT_TYPES];
                return (
                  <tr key={m.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{formatDateTime(m.createdAt)}</td>
                    <td className="p-3 font-medium">{m.product.name}</td>
                    <td className="p-3">
                      <span className={mt?.color}>{mt?.label || m.type}</span>
                    </td>
                    <td className="p-3 text-right">{parseFloat(m.quantity).toFixed(3)}</td>
                    <td className="p-3 text-right text-gray-500">{parseFloat(m.previousQty).toFixed(3)}</td>
                    <td className="p-3 text-right font-medium">{parseFloat(m.newQty).toFixed(3)}</td>
                    <td className="p-3 text-gray-500 text-xs">{m.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Sin alertas de stock bajo</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Producto</th>
                  <th className="text-right p-3">Stock Actual</th>
                  <th className="text-right p-3">Stock Mínimo</th>
                  <th className="text-right p-3">Faltante</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((p) => {
                  const stock = parseFloat(p.stockQty);
                  const min = parseFloat(p.minStock);
                  return (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-right text-red-600 font-bold">{stock.toFixed(3)}</td>
                      <td className="p-3 text-right">{min.toFixed(3)}</td>
                      <td className="p-3 text-right text-red-600">{(min - stock).toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal movimiento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Nuevo Movimiento de Inventario</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Producto *</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required className="w-full px-3 py-2 border rounded-md">
                  <option value="">Seleccionar</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Stock: {parseFloat(p.stockQty).toFixed(3)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                  <option value="ENTRY">Entrada</option>
                  <option value="RETURN">Devolución</option>
                  <option value="ADJUSTMENT">Ajuste (resta)</option>
                  <option value="LOSS">Merma (resta)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cantidad (kg o unidades) *</label>
                <input type="number" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="Opcional" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-md hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
