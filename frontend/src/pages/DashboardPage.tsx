import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatCurrency } from '../utils/formatters';

interface KPIs {
  date: string;
  totalSales: number;
  totalRevenue: string;
  avgTicket: string;
  prevTotalSales: number;
  prevTotalRevenue: string;
  byPayment: { CASH: string; CARD: string; TRANSFER: string };
  cashIn: string;
  cashOut: string;
}

export function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    client.get(`/dashboard/kpis?date=${date}`).then((r) => setKpis(r.data));
  }, [date]);

  if (!kpis) return <div className="p-6 text-gray-500">Cargando...</div>;

  const revenueChange = parseFloat(kpis.prevTotalRevenue) > 0
    ? ((parseFloat(kpis.totalRevenue) - parseFloat(kpis.prevTotalRevenue)) / parseFloat(kpis.prevTotalRevenue) * 100)
    : 0;

  const salesChange = kpis.prevTotalSales > 0
    ? ((kpis.totalSales - kpis.prevTotalSales) / kpis.prevTotalSales * 100)
    : 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border rounded-md"
        />
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Ventas del dia</div>
          <div className="text-2xl font-bold">{kpis.totalSales}</div>
          {kpis.prevTotalSales > 0 && (
            <div className={`text-xs mt-1 ${salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {salesChange >= 0 ? '+' : ''}{salesChange.toFixed(1)}% vs. dia anterior
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Ingresos totales</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.totalRevenue)}</div>
          {parseFloat(kpis.prevTotalRevenue) > 0 && (
            <div className={`text-xs mt-1 ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}% vs. dia anterior
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Ticket promedio</div>
          <div className="text-2xl font-bold">{formatCurrency(kpis.avgTicket)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Dia anterior</div>
          <div className="text-2xl font-bold text-gray-400">{formatCurrency(kpis.prevTotalRevenue)}</div>
          <div className="text-xs text-gray-400 mt-1">{kpis.prevTotalSales} ventas</div>
        </div>
      </div>

      {/* Desglose */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-3">Desglose por metodo de pago</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Efectivo</span>
              <span className="font-bold">{formatCurrency(kpis.byPayment.CASH)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tarjeta</span>
              <span className="font-bold">{formatCurrency(kpis.byPayment.CARD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Transferencia</span>
              <span className="font-bold">{formatCurrency(kpis.byPayment.TRANSFER)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-3">Movimientos de caja</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-green-600">Entradas</span>
              <span className="font-bold text-green-600">+{formatCurrency(kpis.cashIn)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Salidas</span>
              <span className="font-bold text-red-600">-{formatCurrency(kpis.cashOut)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Neto</span>
              <span>{formatCurrency(parseFloat(kpis.cashIn) - parseFloat(kpis.cashOut))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
