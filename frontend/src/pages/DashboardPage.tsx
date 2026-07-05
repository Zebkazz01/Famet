import { useState, useEffect, useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import client from '../api/client';
import { formatCurrency } from '../utils/formatters';
import { PageSkeleton } from '../components/PageSkeleton';
import { ErrorView } from '../components/ErrorBoundary';
import {
  ChartLineUp, ShoppingBag, CurrencyDollar, Receipt,
  TrendUp, Warning, Calendar, Users, Clock, Package, Crown, ChartBar,
  CalendarBlank, WarningCircle, UserCircle,
} from '@phosphor-icons/react';
import { PageHeader } from '../components/layout/PageHeader';

function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n + 1);
  return d.toISOString().slice(0, 10);
}

interface Analytics {
  range: { start: string; end: string; days: number };
  totals: { revenue: number; expenses: number; profit: number; salesCount: number; avgTicket: number };
  creditSummary: { salesCount: number; totalAmount: number; pendingAmount: number; customersWithDebt: number };
  dailySeries: Array<{ date: string; revenue: number; count: number; expenses: number; profit: number }>;
  byCategory: Array<{ name: string; revenue: number; qty: number }>;
  topProducts: Array<{ id: number; name: string; revenue: number; qty: number }>;
  byHour: Array<{ hour: number; revenue: number; count: number }>;
  byPaymentMethod: Array<{ method: string; total: number; count: number }>;
  byUser: Array<{ id: number; name: string; revenue: number; count: number }>;
  lowStock: Array<{ id: number; name: string; stockQty: number; minStock: number; category: string }>;
  expiringSoon: Array<{ id: number; productName: string; expiryDate: string; qty: number; daysLeft: number }>;
  forecastSeries: Array<{ date: string; revenue: number }>;
  topProductsForecast: Array<{ id: number; name: string; revenue: number; qty: number; qtyPerDay: number; projectedQty7d: number; projectedRevenue7d: number }>;
}

const PAYMENT_LABELS: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' };
const COLOR_REVENUE = '#ef4444';
const COLOR_PROFIT = '#10b981';
const COLOR_EXPENSE = '#f59e0b';
const COLOR_FORECAST = '#8b5cf6';

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
];

export function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [preset, setPreset] = useState<number | null>(30);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    setLoadError(null);
    setData(null);
    let url: string;
    if (!preset && from && to) {
      url = `/dashboard/analytics?from=${from}&to=${to}`;
    } else {
      url = `/dashboard/analytics?days=${preset ?? 30}`;
    }
    client.get(url)
      .then((r) => setData(r.data))
      .catch((err) => setLoadError(err));
  }, [preset, from, to]);

  function applyCustom() {
    if (!from || !to || from > to) return;
    setPreset(null);
    setShowCustom(false);
  }

  function selectPreset(d: number) {
    setPreset(d);
    setFrom('');
    setTo('');
    setShowCustom(false);
  }

  // === ApexCharts configs ===
  const dailyChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data) return null;
    const dates = data.dailySeries.map((d) => d.date);
    const fcDates = data.forecastSeries.map((f) => f.date);
    const revActual = data.dailySeries.map((d) => d.revenue);
    const revFc = data.forecastSeries.map((f) => f.revenue);
    return {
      options: {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false } },
        colors: [COLOR_REVENUE, COLOR_FORECAST],
        stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 6] },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
        xaxis: { categories: [...dates, ...fcDates], labels: { rotate: -45, style: { fontSize: '10px' } } },
        yaxis: { labels: { formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`, style: { fontSize: '11px' } } },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
        legend: { position: 'top', horizontalAlign: 'right' },
        dataLabels: { enabled: false },
        grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
        annotations: {
          xaxis: dates.length > 0 ? [{
            x: dates[dates.length - 1],
            borderColor: '#9ca3af',
            label: { text: 'Hoy', style: { background: '#9ca3af', color: '#fff' } },
          }] : [],
        },
      },
      series: [
        { name: 'Ingresos reales', data: [...revActual, ...new Array(fcDates.length).fill(null)] },
        { name: 'Prediccion 7 dias', data: [...new Array(dates.length - 1).fill(null), revActual[revActual.length - 1] || 0, ...revFc] },
      ],
    };
  }, [data]);

  const revVsExpChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data) return null;
    return {
      options: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', stacked: false },
        colors: [COLOR_REVENUE, COLOR_EXPENSE, COLOR_PROFIT],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        xaxis: { categories: data.dailySeries.map((d) => d.date.slice(5)), labels: { style: { fontSize: '9px' }, rotate: -45 } },
        yaxis: { labels: { formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` } },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
        legend: { position: 'top', horizontalAlign: 'right' },
        dataLabels: { enabled: false },
      },
      series: [
        { name: 'Ingresos', data: data.dailySeries.map((d) => d.revenue) },
        { name: 'Gastos', data: data.dailySeries.map((d) => d.expenses) },
        { name: 'Utilidad', data: data.dailySeries.map((d) => d.profit) },
      ],
    };
  }, [data]);

  const categoryChart = useMemo<{ options: ApexOptions; series: number[] } | null>(() => {
    if (!data) return null;
    const top = data.byCategory.slice(0, 8);
    return {
      options: {
        chart: { type: 'donut', fontFamily: 'inherit' },
        labels: top.map((c) => c.name),
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
        legend: { position: 'bottom', fontSize: '11px' },
        dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(1)}%` },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
        plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', formatter: (w: any) => formatCurrency(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) } } } } },
      },
      series: top.map((c) => c.revenue),
    };
  }, [data]);

  const topProductsChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data) return null;
    const top = data.topProducts.slice(0, 10);
    return {
      options: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        colors: [COLOR_REVENUE],
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: false } },
        xaxis: { categories: top.map((p) => p.name.length > 25 ? p.name.slice(0, 23) + '...' : p.name), labels: { formatter: (v: any) => `$${(Number(v) / 1000).toFixed(0)}k` } },
        yaxis: { labels: { style: { fontSize: '10px' } } },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
        dataLabels: { enabled: false },
      },
      series: [{ name: 'Ingresos', data: top.map((p) => p.revenue) }],
    };
  }, [data]);

  const hourChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data) return null;
    return {
      options: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        colors: ['#3b82f6'],
        plotOptions: { bar: { borderRadius: 3, columnWidth: '70%' } },
        xaxis: { categories: data.byHour.map((h) => `${String(h.hour).padStart(2, '0')}:00`), labels: { style: { fontSize: '9px' } } },
        yaxis: { labels: { formatter: (v: number) => String(Math.round(v)) } },
        tooltip: { y: { formatter: (v: number) => `${v} ventas` } },
        dataLabels: { enabled: false },
      },
      series: [{ name: 'Ventas', data: data.byHour.map((h) => h.count) }],
    };
  }, [data]);

  const paymentChart = useMemo<{ options: ApexOptions; series: number[] } | null>(() => {
    if (!data) return null;
    return {
      options: {
        chart: { type: 'pie', fontFamily: 'inherit' },
        labels: data.byPaymentMethod.map((p) => PAYMENT_LABELS[p.method] || p.method),
        colors: ['#10b981', '#3b82f6', '#8b5cf6'],
        legend: { position: 'bottom' },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
        dataLabels: { formatter: (v: number) => `${v.toFixed(1)}%` },
      },
      series: data.byPaymentMethod.map((p) => p.total),
    };
  }, [data]);

  const userChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data || data.byUser.length === 0) return null;
    return {
      options: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        colors: ['#ec4899'],
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        xaxis: { categories: data.byUser.slice(0, 8).map((u) => u.name), labels: { formatter: (v: any) => `$${(Number(v) / 1000).toFixed(0)}k` } },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
        dataLabels: { enabled: false },
      },
      series: [{ name: 'Ingresos', data: data.byUser.slice(0, 8).map((u) => u.revenue) }],
    };
  }, [data]);

  if (loadError) return <ErrorView error={loadError} onRetry={() => window.location.reload()} />;
  if (!data) return <PageSkeleton type="dashboard" />;

  const profitMargin = data.totals.revenue > 0 ? (data.totals.profit / data.totals.revenue) * 100 : 0;

  return (
    <div className="h-full overflow-auto p-3 md:p-6 space-y-4">
      <PageHeader
        icon={<ChartLineUp size={24} weight="duotone" />}
        title="Dashboard"
        description={`Analítica del negocio ${!preset && from && to ? `del ${from} al ${to}` : `en los últimos ${preset} días`}: ingresos vs gastos, productos más vendidos, distribución horaria, vendedores top, predicciones 7 días y alertas de stock/vencimientos.`}
        actions={
          <div id="dashboard-date-filter" className="flex items-center gap-1 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => selectPreset(p.days)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  preset === p.days
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="relative">
              <button
                onClick={() => setShowCustom((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !preset
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <CalendarBlank size={13} weight="duotone" />
                {!preset && from && to ? `${from} → ${to}` : 'Rango'}
              </button>
              {showCustom && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl p-3 z-50 flex flex-col gap-2 min-w-[220px]">
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-0.5">Desde</label>
                    <input type="date" value={from} max={to || todayISO()}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-0.5">Hasta</label>
                    <input type="date" value={to} min={from} max={todayISO()}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-xs" />
                  </div>
                  <button
                    onClick={applyCustom}
                    disabled={!from || !to || from > to}
                    className="w-full py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium disabled:opacity-40"
                  >
                    Aplicar rango
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* KPIs */}
      <div id="dashboard-kpis" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard icon={<CurrencyDollar size={20} weight="duotone" />} label="Ingresos" value={formatCurrency(data.totals.revenue)} color="green" />
        <KPICard icon={<Receipt size={20} weight="duotone" />} label="Gastos" value={formatCurrency(data.totals.expenses)} color="amber" />
        <KPICard icon={<TrendUp size={20} weight="duotone" />} label="Utilidad" value={formatCurrency(data.totals.profit)} sub={`${profitMargin.toFixed(1)}% margen`} color="blue" />
        <KPICard icon={<ShoppingBag size={20} weight="duotone" />} label="Ventas" value={String(data.totals.salesCount)} color="red" />
        <KPICard icon={<ChartBar size={20} weight="duotone" />} label="Ticket promedio" value={formatCurrency(data.totals.avgTicket)} color="purple" />
      </div>

      {/* Crédito / Fiado */}
      {data.creditSummary && (
        <div id="dashboard-credit" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard icon={<ShoppingBag size={20} weight="duotone" />} label="Ventas a crédito" value={String(data.creditSummary.salesCount)} color="amber" />
          <KPICard icon={<CurrencyDollar size={20} weight="duotone" />} label="Total fiado" value={formatCurrency(data.creditSummary.totalAmount)} color="red" />
          <KPICard icon={<WarningCircle size={20} weight="duotone" />} label="Pendiente de cobro" value={formatCurrency(data.creditSummary.pendingAmount)} color="purple" />
          <KPICard icon={<UserCircle size={20} weight="duotone" />} label="Clientes con deuda" value={String(data.creditSummary.customersWithDebt)} color="blue" />
        </div>
      )}

      {/* Forecast + daily */}
      {dailyChart && (
        <Card title="Ingresos por dia + Prediccion 7 dias" icon={<TrendUp size={18} weight="duotone" className="text-purple-500" />}>
          <Chart options={dailyChart.options} series={dailyChart.series} type="area" height={300} />
        </Card>
      )}

      {/* Revenue vs Expenses */}
      {revVsExpChart && (
        <Card title="Ingresos vs Gastos vs Utilidad" icon={<ChartBar size={18} weight="duotone" className="text-red-500" />}>
          <Chart options={revVsExpChart.options} series={revVsExpChart.series} type="bar" height={280} />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top productos */}
        {topProductsChart && (
          <Card title="Top 10 productos por ingresos" icon={<Crown size={18} weight="duotone" className="text-amber-500" />}>
            <Chart options={topProductsChart.options} series={topProductsChart.series} type="bar" height={350} />
          </Card>
        )}

        {/* Categorias */}
        {categoryChart && (
          <Card title="Distribucion por categoria" icon={<Package size={18} weight="duotone" className="text-blue-500" />}>
            <Chart options={categoryChart.options} series={categoryChart.series} type="donut" height={350} />
          </Card>
        )}

        {/* Hora del dia */}
        {hourChart && (
          <Card title="Ventas por hora del dia" icon={<Clock size={18} weight="duotone" className="text-cyan-500" />}>
            <Chart options={hourChart.options} series={hourChart.series} type="bar" height={280} />
          </Card>
        )}

        {/* Pago */}
        {paymentChart && data.byPaymentMethod.length > 0 && (
          <Card title="Metodos de pago" icon={<CurrencyDollar size={18} weight="duotone" className="text-green-500" />}>
            <Chart options={paymentChart.options} series={paymentChart.series} type="pie" height={280} />
          </Card>
        )}

        {/* Vendedores */}
        {userChart && (
          <Card title="Ingresos por vendedor" icon={<Users size={18} weight="duotone" className="text-pink-500" />}>
            <Chart options={userChart.options} series={userChart.series} type="bar" height={280} />
          </Card>
        )}

        {/* Forecast tabla */}
        <Card title="Prediccion proximos 7 dias (top productos)" icon={<TrendUp size={18} weight="duotone" className="text-purple-500" />}>
          <div className="text-xs text-gray-500 mb-2">Estimado segun tasa de venta diaria del período analizado ({data?.range.days ?? preset} días)</div>
          <div className="overflow-auto max-h-[350px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-2 text-[10px] uppercase text-gray-500">Producto</th>
                  <th className="text-right px-2 py-2 text-[10px] uppercase text-gray-500">Qty 7d</th>
                  <th className="text-right px-2 py-2 text-[10px] uppercase text-gray-500">Rev 7d</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {data.topProductsForecast.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-2 py-1.5 text-xs truncate max-w-[150px]">{p.name}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs">{p.projectedQty7d.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs font-bold text-green-600">{formatCurrency(p.projectedRevenue7d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.lowStock.length > 0 && (
          <Card title={`Stock bajo (${data.lowStock.length})`} icon={<Warning size={18} weight="duotone" className="text-amber-500" />}>
            <ul className="divide-y dark:divide-gray-700 max-h-[300px] overflow-auto">
              {data.lowStock.map((p) => (
                <li key={p.id} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.category}</p>
                  </div>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${p.stockQty <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.stockQty} / {p.minStock}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data.expiringSoon.length > 0 && (
          <Card title={`Por vencer 7d (${data.expiringSoon.length})`} icon={<Calendar size={18} weight="duotone" className="text-orange-500" />}>
            <ul className="divide-y dark:divide-gray-700 max-h-[300px] overflow-auto">
              {data.expiringSoon.map((b) => (
                <li key={b.id} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium truncate">{b.productName}</p>
                    <p className="text-[10px] text-gray-400">{new Date(b.expiryDate).toLocaleDateString('es-CO')}</p>
                  </div>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${b.daysLeft <= 0 ? 'bg-red-100 text-red-700' : b.daysLeft <= 2 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                    {b.daysLeft <= 0 ? 'VENCIDO' : `${b.daysLeft}d`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function KPICard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: 'red' | 'green' | 'blue' | 'amber' | 'purple' }) {
  const colors = {
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
        <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
