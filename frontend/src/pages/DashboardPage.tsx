import { useState, useEffect, useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import client from '../api/client';
import { formatCurrency, formatQty } from '../utils/formatters';
import { PageSkeleton } from '../components/PageSkeleton';
import { ErrorView } from '../components/ErrorBoundary';
import {
  ChartLineUp, ShoppingBag, CurrencyDollar, Receipt,
  TrendUp, Warning, Calendar, Users, Clock, Package, Crown, ChartBar,
  CalendarBlank, WarningCircle, UserCircle, ArrowUp, ArrowDown, Minus,
  ListChecks, ArrowRight, Funnel, SortAscending, SortDescending,
  CaretDown, Eye, EyeSlash, ArrowLeft, Heart, ForkKnife, Cow,
} from '@phosphor-icons/react';
import { PageHeader } from '../components/layout/PageHeader';
import { getSummary } from '../api/processing';
import type { DashboardSummary } from '../api/processing';
import { getBusinessDayDate, getTodayCalendarDate } from '../utils/businessDay';

function todayISO() { return getBusinessDayDate(); }
function todayCalendarISO() { return getTodayCalendarDate(); }
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
  byAnimalType: Array<{ type: string; revenue: number; qty: number; weightQtyKg: number; unitQty: number; count: number }>;
  topProducts: Array<{ id: number; name: string; revenue: number; qty: number }>;
  byHour: Array<{ hour: number; revenue: number; count: number }>;
  byPaymentMethod: Array<{ method: string; total: number; count: number }>;
  byUser: Array<{ id: number; name: string; revenue: number; count: number }>;
  lowStock: Array<{ id: number; name: string; stockQty: number; minStock: number; category: string }>;
  expiringSoon: Array<{ id: number; productName: string; expiryDate: string; qty: number; daysLeft: number }>;
  forecastSeries: Array<{ date: string; revenue: number }>;
  topProductsForecast: Array<{ id: number; name: string; revenue: number; qty: number; qtyPerDay: number; projectedQty7d: number; projectedRevenue7d: number }>;
  inventorySummary: {
    totalValue: number; lowStockCount: number; expiringCount: number;
    topRotated: Array<{ name: string; qtySold: number; revenue: number }>;
    recentMovements: Array<{ id: number; type: string; productName: string; quantity: number; date: string; user: string }>;
  };
  recentActivity: Array<{ id: number; type: 'sale' | 'expense' | 'movement'; description: string; amount: number; timestamp: string; user: string }>;
  periodComparison: {
    current: { revenue: number; salesCount: number; profit: number; avgTicket: number };
    previous: { revenue: number; salesCount: number; profit: number; avgTicket: number };
    deltas: { revenue: number; salesCount: number; profit: number; avgTicket: number };
  };
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

const SECTION_COLORS = {
  daily: 'border-l-green-500',
  products: 'border-l-amber-500',
  categories: 'border-l-blue-500',
  meat: 'border-l-orange-500',
  charts: 'border-l-purple-500',
  comparison: 'border-l-indigo-500',
  activity: 'border-l-cyan-500',
  processing: 'border-l-teal-500',
  credit: 'border-l-pink-500',
  alerts: 'border-l-red-500',
} as const;

type SectionColor = keyof typeof SECTION_COLORS;

function Section({ color, title, icon, actions, children }: {
  color: SectionColor;
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div id={`dashboard-${color}`} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-[3px] ${SECTION_COLORS[color]} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
          {icon} {title}
        </h3>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
      active ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-slate-600 hover:text-red-500'
    }`}>{children}</button>
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
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colors[color]}`}>{icon}</div>
        <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [preset, setPreset] = useState<number | null>(30);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [processing, setProcessing] = useState<DashboardSummary | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // ── Section filters ──
  const [dailyView, setDailyView] = useState<'today' | 'yesterday' | 'avg7'>('today');
  const [topN, setTopN] = useState<5 | 10>(5);
  const [catSort, setCatSort] = useState<'qty' | 'revenue'>('qty');
  const [showCharts, setShowCharts] = useState<Record<string, boolean>>({
    daily: true, category: true, topProducts: true, hour: true, payment: true, revVsExp: true,
  });
  const [compMetric, setCompMetric] = useState<'revenue' | 'salesCount' | 'profit'>('revenue');
  const [activityFilter, setActivityFilter] = useState<'all' | 'sale' | 'expense'>('all');
  const [meatWeightUnit, setMeatWeightUnit] = useState<'lb' | 'kg'>('lb');

  useEffect(() => { getSummary().then(setProcessing).catch(() => {}); }, []);

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(el.classList.contains('dark')));
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  // ── Daily view data ──
  const dailyData = useMemo(() => {
    if (!data) return { revenue: 0, profit: 0, count: 0, expenses: 0, label: '' };
    const today = getBusinessDayDate();
    const yesterday = new Date(Date.now() - 86400000);
    if (yesterday.getHours() < 7) yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (dailyView === 'today') {
      const row = data.dailySeries.find((d) => d.date === today);
      return { revenue: row?.revenue ?? 0, profit: row?.profit ?? 0, count: row?.count ?? 0, expenses: row?.expenses ?? 0, label: 'Hoy' };
    }
    if (dailyView === 'yesterday') {
      const row = data.dailySeries.find((d) => d.date === yesterdayStr);
      return { revenue: row?.revenue ?? 0, profit: row?.profit ?? 0, count: row?.count ?? 0, expenses: row?.expenses ?? 0, label: 'Ayer' };
    }
    const last7 = data.dailySeries.slice(-7);
    const avg = last7.length > 0 ? {
      revenue: last7.reduce((s, d) => s + d.revenue, 0) / last7.length,
      profit: last7.reduce((s, d) => s + d.profit, 0) / last7.length,
      count: last7.reduce((s, d) => s + d.count, 0) / last7.length,
      expenses: last7.reduce((s, d) => s + d.expenses, 0) / last7.length,
    } : { revenue: 0, profit: 0, count: 0, expenses: 0 };
    return { ...avg, label: 'Promedio 7d' };
  }, [data, dailyView]);

  // ── ApexCharts configs ──
  const dailyChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data) return null;
    const dates = data.dailySeries.map((d) => d.date);
    const fcDates = data.forecastSeries.map((f) => f.date);
    const revActual = data.dailySeries.map((d) => d.revenue);
    const revFc = data.forecastSeries.map((f) => f.revenue);
    const gridColor = isDark ? '#334155' : '#e5e7eb';
    const labelColor = isDark ? '#94a3b8' : '#6b7280';
    return {
      options: {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false }, background: 'transparent' },
        colors: [COLOR_REVENUE, COLOR_FORECAST],
        stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 6] },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
        xaxis: { categories: [...dates, ...fcDates], labels: { rotate: -45, style: { fontSize: '10px', colors: labelColor } } },
        yaxis: { labels: { formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`, style: { fontSize: '11px', colors: labelColor } } },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) }, theme: isDark ? 'dark' : 'light' },
        legend: { position: 'top', horizontalAlign: 'right', labels: { colors: labelColor } },
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor, strokeDashArray: 4 },
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
  }, [data, isDark]);

  const revVsExpChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data) return null;
    const labelColor = isDark ? '#94a3b8' : '#6b7280';
    const gridColor = isDark ? '#334155' : '#e5e7eb';
    return {
      options: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', stacked: false, background: 'transparent' },
        colors: [COLOR_REVENUE, COLOR_EXPENSE, COLOR_PROFIT],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        xaxis: { categories: data.dailySeries.map((d) => d.date.slice(5)), labels: { style: { fontSize: '9px', colors: labelColor }, rotate: -45 } },
        yaxis: { labels: { formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`, style: { colors: labelColor } } },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) }, theme: isDark ? 'dark' : 'light' },
        legend: { position: 'top', horizontalAlign: 'right', labels: { colors: labelColor } },
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor },
      },
      series: [
        { name: 'Ingresos', data: data.dailySeries.map((d) => d.revenue) },
        { name: 'Gastos', data: data.dailySeries.map((d) => d.expenses) },
        { name: 'Utilidad', data: data.dailySeries.map((d) => d.profit) },
      ],
    };
  }, [data, isDark]);

  const categoryChart = useMemo<{ options: ApexOptions; series: number[] } | null>(() => {
    if (!data) return null;
    const sorted = [...data.byCategory].sort((a, b) => catSort === 'qty' ? b.qty - a.qty : b.revenue - a.revenue);
    const top = sorted.slice(0, 8);
    const labelColor = isDark ? '#94a3b8' : '#6b7280';
    return {
      options: {
        chart: { type: 'donut', fontFamily: 'inherit', background: 'transparent' },
        labels: top.map((c) => c.name),
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
        legend: { position: 'bottom', fontSize: '11px', labels: { colors: labelColor } },
        dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(1)}%` },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) }, theme: isDark ? 'dark' : 'light' },
        plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', formatter: (w: any) => formatCurrency(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) } } } } },
      },
      series: top.map((c) => c.revenue),
    };
  }, [data, catSort, isDark]);

  const topProductsChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data) return null;
    const top = data.topProducts.slice(0, topN);
    const labelColor = isDark ? '#94a3b8' : '#6b7280';
    const gridColor = isDark ? '#334155' : '#e5e7eb';
    return {
      options: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
        colors: [COLOR_REVENUE],
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: false } },
        xaxis: { categories: top.map((p) => p.name.length > 25 ? p.name.slice(0, 23) + '...' : p.name), labels: { formatter: (v: any) => `$${(Number(v) / 1000).toFixed(0)}k`, style: { colors: labelColor } } },
        yaxis: { labels: { style: { fontSize: '10px', colors: labelColor } } },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) }, theme: isDark ? 'dark' : 'light' },
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor },
      },
      series: [{ name: 'Ingresos', data: top.map((p) => p.revenue) }],
    };
  }, [data, topN, isDark]);

  const hourChart = useMemo<{ options: ApexOptions; series: any[] } | null>(() => {
    if (!data) return null;
    const labelColor = isDark ? '#94a3b8' : '#6b7280';
    const gridColor = isDark ? '#334155' : '#e5e7eb';
    return {
      options: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
        colors: ['#3b82f6'],
        plotOptions: { bar: { borderRadius: 3, columnWidth: '70%' } },
        xaxis: { categories: data.byHour.map((h) => `${String(h.hour).padStart(2, '0')}:00`), labels: { style: { fontSize: '9px', colors: labelColor } } },
        yaxis: { labels: { formatter: (v: number) => String(Math.round(v)), style: { colors: labelColor } } },
        tooltip: { y: { formatter: (v: number) => `${v} ventas` }, theme: isDark ? 'dark' : 'light' },
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor },
      },
      series: [{ name: 'Ventas', data: data.byHour.map((h) => h.count) }],
    };
  }, [data, isDark]);

  const paymentChart = useMemo<{ options: ApexOptions; series: number[] } | null>(() => {
    if (!data) return null;
    const labelColor = isDark ? '#94a3b8' : '#6b7280';
    return {
      options: {
        chart: { type: 'pie', fontFamily: 'inherit', background: 'transparent' },
        labels: data.byPaymentMethod.map((p) => PAYMENT_LABELS[p.method] || p.method),
        colors: ['#10b981', '#3b82f6', '#8b5cf6'],
        legend: { position: 'bottom', labels: { colors: labelColor } },
        tooltip: { y: { formatter: (v: number) => formatCurrency(v) }, theme: isDark ? 'dark' : 'light' },
        dataLabels: { formatter: (v: number) => `${v.toFixed(1)}%` },
      },
      series: data.byPaymentMethod.map((p) => p.total),
    };
  }, [data, isDark]);

  if (loadError) return <ErrorView error={loadError} onRetry={() => window.location.reload()} />;
  if (!data) return <PageSkeleton type="dashboard" />;

  return (
    <div className="h-full overflow-auto p-3 md:p-6 space-y-4">
      <PageHeader
        icon={<ChartLineUp size={24} weight="duotone" />}
        title="Dashboard"
        description={!preset && from && to ? `${from} → ${to}` : `Últimos ${preset} días`}
        actions={
          <div id="dashboard-date-filter" className="flex items-center gap-1 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.days} onClick={() => selectPreset(p.days)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${preset === p.days ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                {p.label}
              </button>
            ))}
            <div className="relative">
              <button onClick={() => setShowCustom((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${!preset ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                <CalendarBlank size={13} weight="duotone" />
                {!preset && from && to ? `${from} → ${to}` : 'Rango'}
              </button>
              {showCustom && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl p-3 z-50 flex flex-col gap-2 min-w-[220px]">
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-0.5">Desde</label>
                    <input type="date" value={from} max={to || todayCalendarISO()} onChange={(e) => setFrom(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-0.5">Hasta</label>
                    <input type="date" value={to} min={from} max={todayCalendarISO()} onChange={(e) => setTo(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-xs" />
                  </div>
                  <button onClick={applyCustom} disabled={!from || !to || from > to}
                    className="w-full py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium disabled:opacity-40">Aplicar</button>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* ─── 1. FLUJO DEL DÍA ─── */}
      <Section color="daily" title="Flujo del día" icon={<Clock size={16} weight="duotone" className="text-green-500" />}
        actions={
          <>
            <FilterPill active={dailyView === 'today'} onClick={() => setDailyView('today')}>Hoy</FilterPill>
            <FilterPill active={dailyView === 'yesterday'} onClick={() => setDailyView('yesterday')}>Ayer</FilterPill>
            <FilterPill active={dailyView === 'avg7'} onClick={() => setDailyView('avg7')}>7d prom.</FilterPill>
          </>
        }>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard icon={<CurrencyDollar size={18} weight="duotone" />} label="Ingresos" value={formatCurrency(dailyData.revenue)} color="green" />
          <KPICard icon={<TrendUp size={18} weight="duotone" />} label="Utilidad" value={formatCurrency(dailyData.profit)} color="blue" />
          <KPICard icon={<Receipt size={18} weight="duotone" />} label="Gastos" value={formatCurrency(dailyData.expenses)} color="amber" />
          <KPICard icon={<ShoppingBag size={18} weight="duotone" />} label="Ventas" value={String(Math.round(dailyData.count))} color="red" />
          <KPICard icon={<CurrencyDollar size={18} weight="duotone" />} label="Neto" value={formatCurrency(dailyData.revenue - dailyData.expenses)} color="purple" sub="Ingresos - Gastos" />
        </div>
      </Section>

      {/* ─── 2. PRODUCTOS MÁS VENDIDOS ─── */}
      {data.topProducts.length > 0 && (
        <Section color="products" title="Productos más vendidos" icon={<Crown size={16} weight="duotone" className="text-amber-500" />}
          actions={
            <>
              <FilterPill active={topN === 5} onClick={() => setTopN(5)}>Top 5</FilterPill>
              <FilterPill active={topN === 10} onClick={() => setTopN(10)}>Top 10</FilterPill>
            </>
          }>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {data.topProducts.slice(0, topN).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                  i === 1 ? 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300' :
                  i === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-gray-500'
                }`}>{i + 1}</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate text-gray-800 dark:text-gray-200">{p.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatQty(p.qty)} uds · {formatCurrency(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ─── 3. VENTAS POR CATEGORÍA ─── */}
      {data.byCategory.length > 0 && (
        <Section color="categories" title="Ventas por categoría" icon={<Package size={16} weight="duotone" className="text-blue-500" />}
          actions={
            <>
              <FilterPill active={catSort === 'qty'} onClick={() => setCatSort('qty')}>Unidades</FilterPill>
              <FilterPill active={catSort === 'revenue'} onClick={() => setCatSort('revenue')}>Ingresos</FilterPill>
            </>
          }>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...data.byCategory].sort((a, b) => catSort === 'qty' ? b.qty - a.qty : b.revenue - a.revenue).slice(0, 6).map((cat) => (
              <div key={cat.name} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatQty(cat.qty)}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{cat.name}</div>
                <div className="text-[10px] text-green-600 dark:text-green-400 font-mono mt-0.5">{formatCurrency(cat.revenue)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ─── 3b. VENTAS POR TIPO DE CARNE (Res vs Cerdo) ─── */}
      {data.byAnimalType && data.byAnimalType.length > 0 && (() => {
        const meatTypes = data.byAnimalType.filter(at => ['RES', 'CERDO'].includes(at.type));
        const totalRevenue = meatTypes.reduce((sum, at) => sum + at.revenue, 0);
        const resData = meatTypes.find(at => at.type === 'RES');
        const cerdoData = meatTypes.find(at => at.type === 'CERDO');
        
        const convertWeight = (kg: number) => meatWeightUnit === 'lb' ? kg * 2.20462 : kg;
        
        const getResUnitLabel = () => {
          if (!resData) return '';
          const parts = [];
          if (resData.weightQtyKg > 0) parts.push(`${formatQty(convertWeight(resData.weightQtyKg))} ${meatWeightUnit}`);
          if (resData.unitQty > 0) parts.push(`${formatQty(resData.unitQty)} uds`);
          return parts.length > 0 ? `${parts.join(' · ')} vendidos` : '0 vendidos';
        };
        const getCerdoUnitLabel = () => {
          if (!cerdoData) return '';
          const parts = [];
          if (cerdoData.weightQtyKg > 0) parts.push(`${formatQty(convertWeight(cerdoData.weightQtyKg))} ${meatWeightUnit}`);
          if (cerdoData.unitQty > 0) parts.push(`${formatQty(cerdoData.unitQty)} uds`);
          return parts.length > 0 ? `${parts.join(' · ')} vendidos` : '0 vendidos';
        };

        return (
          <Section color="meat" title="Ventas por tipo de carne" icon={<ForkKnife size={16} weight="duotone" className="text-orange-500" />}
            actions={
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
                <button onClick={() => setMeatWeightUnit('lb')} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${meatWeightUnit === 'lb' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-red-500'}`}>LB</button>
                <button onClick={() => setMeatWeightUnit('kg')} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${meatWeightUnit === 'kg' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-red-500'}`}>KG</button>
              </div>
            }>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 rounded-xl p-4 border border-red-200/50 dark:border-red-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500 text-white flex items-center justify-center shadow-sm">
                    <Heart size={20} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Res</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{resData?.count || 0} ventas</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(resData?.revenue || 0)}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{getResUnitLabel()}</div>
                {totalRevenue > 0 && (
                  <div className="mt-2 w-full bg-red-200 dark:bg-red-800/30 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${((resData?.revenue || 0) / totalRevenue) * 100}%` }} />
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
                    <Cow size={20} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Cerdo</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{cerdoData?.count || 0} ventas</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(cerdoData?.revenue || 0)}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{getCerdoUnitLabel()}</div>
                {totalRevenue > 0 && (
                  <div className="mt-2 w-full bg-amber-200 dark:bg-amber-800/30 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${((cerdoData?.revenue || 0) / totalRevenue) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
          </Section>
        );
      })()}

      {/* ─── 4. GRÁFICOS ─── */}
      <Section color="charts" title="Gráficos" icon={<ChartBar size={16} weight="duotone" className="text-purple-500" />}
        actions={
          <>
            <FilterPill active={showCharts.daily} onClick={() => setShowCharts((s) => ({ ...s, daily: !s.daily }))}>
              {showCharts.daily ? <Eye size={10} weight="bold" /> : <EyeSlash size={10} weight="bold" />} Ingresos
            </FilterPill>
            <FilterPill active={showCharts.category} onClick={() => setShowCharts((s) => ({ ...s, category: !s.category }))}>
              {showCharts.category ? <Eye size={10} weight="bold" /> : <EyeSlash size={10} weight="bold" />} Categorías
            </FilterPill>
            <FilterPill active={showCharts.topProducts} onClick={() => setShowCharts((s) => ({ ...s, topProducts: !s.topProducts }))}>
              {showCharts.topProducts ? <Eye size={10} weight="bold" /> : <EyeSlash size={10} weight="bold" />} Top
            </FilterPill>
            <FilterPill active={showCharts.hour} onClick={() => setShowCharts((s) => ({ ...s, hour: !s.hour }))}>
              {showCharts.hour ? <Eye size={10} weight="bold" /> : <EyeSlash size={10} weight="bold" />} Hora
            </FilterPill>
            <FilterPill active={showCharts.payment} onClick={() => setShowCharts((s) => ({ ...s, payment: !s.payment }))}>
              {showCharts.payment ? <Eye size={10} weight="bold" /> : <EyeSlash size={10} weight="bold" />} Pagos
            </FilterPill>
            <FilterPill active={showCharts.revVsExp} onClick={() => setShowCharts((s) => ({ ...s, revVsExp: !s.revVsExp }))}>
              {showCharts.revVsExp ? <Eye size={10} weight="bold" /> : <EyeSlash size={10} weight="bold" />} I vs G
            </FilterPill>
          </>
        }>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showCharts.daily && dailyChart && (
            <Card title="Ingresos por día" icon={<TrendUp size={14} weight="duotone" className="text-purple-500" />}>
              <Chart options={dailyChart.options} series={dailyChart.series} type="area" height={260} />
            </Card>
          )}
          {showCharts.category && categoryChart && (
            <Card title="Distribución por categoría" icon={<Package size={14} weight="duotone" className="text-blue-500" />}>
              <Chart options={categoryChart.options} series={categoryChart.series} type="donut" height={260} />
            </Card>
          )}
          {showCharts.topProducts && topProductsChart && (
            <Card title={`Top ${topN} productos`} icon={<Crown size={14} weight="duotone" className="text-amber-500" />}>
              <Chart options={topProductsChart.options} series={topProductsChart.series} type="bar" height={240} />
            </Card>
          )}
          {showCharts.hour && hourChart && (
            <Card title="Ventas por hora" icon={<Clock size={14} weight="duotone" className="text-cyan-500" />}>
              <Chart options={hourChart.options} series={hourChart.series} type="bar" height={240} />
            </Card>
          )}
          {showCharts.payment && paymentChart && data.byPaymentMethod.length > 0 && (
            <Card title="Métodos de pago" icon={<CurrencyDollar size={14} weight="duotone" className="text-green-500" />}>
              <Chart options={paymentChart.options} series={paymentChart.series} type="pie" height={240} />
            </Card>
          )}
          {showCharts.revVsExp && revVsExpChart && (
            <Card title="Ingresos vs Gastos" icon={<ChartBar size={14} weight="duotone" className="text-red-500" />}>
              <Chart options={revVsExpChart.options} series={revVsExpChart.series} type="bar" height={240} />
            </Card>
          )}
        </div>
      </Section>

      {/* ─── 5. COMPARATIVOS + INVENTARIO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.periodComparison && (
          <Section color="comparison" title="Comparativa" icon={<ArrowRight size={16} weight="duotone" className="text-indigo-500" />}
            actions={
              <>
                <FilterPill active={compMetric === 'revenue'} onClick={() => setCompMetric('revenue')}>Ingresos</FilterPill>
                <FilterPill active={compMetric === 'salesCount'} onClick={() => setCompMetric('salesCount')}>Ventas</FilterPill>
                <FilterPill active={compMetric === 'profit'} onClick={() => setCompMetric('profit')}>Utilidad</FilterPill>
              </>
            }>
            <div className="space-y-3">
              {([
                { key: 'revenue' as const, label: 'Ingresos', icon: <CurrencyDollar size={14} weight="duotone" /> },
                { key: 'salesCount' as const, label: 'Ventas', icon: <ShoppingBag size={14} weight="duotone" /> },
                { key: 'profit' as const, label: 'Utilidad', icon: <TrendUp size={14} weight="duotone" /> },
              ]).filter(({ key }) => compMetric === key).map(({ key, label, icon }) => {
                const delta = data.periodComparison.deltas[key];
                const isUp = delta > 0.5;
                const isDown = delta < -0.5;
                const arrow = isUp ? <ArrowUp size={16} weight="bold" className="text-green-500" /> : isDown ? <ArrowDown size={16} weight="bold" className="text-red-500" /> : <Minus size={16} weight="bold" className="text-gray-400" />;
                const pctColor = isUp ? 'text-green-600 dark:text-green-400' : isDown ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500';
                const barColor = isUp ? 'bg-green-400' : isDown ? 'bg-red-400' : 'bg-gray-300';
                const clampedDelta = Math.min(Math.abs(delta), 100);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">{icon}<span className="text-sm font-semibold">{label}</span></div>
                      <div className="flex items-center gap-1.5">{arrow}<span className={`text-sm font-bold ${pctColor}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</span></div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden mb-1">
                      <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${clampedDelta}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>1ra mitad: {formatCurrency(data.periodComparison.previous[key])}</span>
                      <span>2da mitad: {formatCurrency(data.periodComparison.current[key])}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {data.inventorySummary && (
          <Section color="alerts" title="Inventario" icon={<Package size={16} weight="duotone" className="text-red-500" />}>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-gray-500 dark:text-gray-400">Valor total en stock</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.inventorySummary.totalValue)}</span>
              </div>
              <div className="flex justify-between items-center text-xs bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-gray-500 dark:text-gray-400">Stock bajo</span>
                <span className={`font-bold ${data.inventorySummary.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{data.inventorySummary.lowStockCount} productos</span>
              </div>
              <div className="flex justify-between items-center text-xs bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-gray-500 dark:text-gray-400">Por vencer (7 días)</span>
                <span className={`font-bold ${data.inventorySummary.expiringCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{data.inventorySummary.expiringCount} lotes</span>
              </div>
              {data.inventorySummary.topRotated.length > 0 && (
                <>
                  <div className="border-t dark:border-gray-700 pt-2"><span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold">Más rotados</span></div>
                  {data.inventorySummary.topRotated.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
                      <span className="truncate max-w-[160px]">{p.name}</span>
                      <span className="font-mono text-gray-500 dark:text-gray-400">{formatQty(p.qtySold)} uds</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Section>
        )}
      </div>

      {/* ─── 6. ACTIVIDAD RECIENTE ─── */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <Section color="activity" title="Actividad reciente" icon={<ListChecks size={16} weight="duotone" className="text-cyan-500" />}
          actions={
            <>
              <FilterPill active={activityFilter === 'all'} onClick={() => setActivityFilter('all')}>Todo</FilterPill>
              <FilterPill active={activityFilter === 'sale'} onClick={() => setActivityFilter('sale')}>Ventas</FilterPill>
              <FilterPill active={activityFilter === 'expense'} onClick={() => setActivityFilter('expense')}>Gastos</FilterPill>
            </>
          }>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 max-h-[200px] overflow-auto pr-1">
            {data.recentActivity
              .filter((act) => activityFilter === 'all' || act.type === activityFilter)
              .slice(0, 15)
              .map((act, i) => {
                const dotColor = act.type === 'sale' ? 'bg-green-500' : act.type === 'expense' ? 'bg-amber-500' : 'bg-blue-500';
                const amountColor = act.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                return (
                  <div key={`${act.type}-${act.id}-${i}`} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className="truncate flex-1 text-gray-700 dark:text-gray-300">{act.description}</span>
                    <span className={`font-mono font-bold whitespace-nowrap ${amountColor}`}>
                      {act.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(act.amount))}
                    </span>
                  </div>
                );
              })}
          </div>
        </Section>
      )}

      {/* ─── 7. PROCESAMIENTO ─── */}
      {processing && (
        <Section color="processing" title="Desposte" icon={<ChartBar size={16} weight="duotone" className="text-teal-500" />}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard icon={<TrendUp size={18} weight="duotone" />} label="Lotes" value={String(processing.activeBatches)} color="blue" sub={processing.month} />
            <KPICard icon={<CurrencyDollar size={18} weight="duotone" />} label="Invertido" value={formatCurrency(processing.totalInvested)} color="red" />
            <KPICard icon={<ChartBar size={18} weight="duotone" />} label="Peso" value={`${processing.totalOutputWeight.toFixed(1)} kg`} color="green" />
            <KPICard icon={<Receipt size={18} weight="duotone" />} label="Recuperado" value={formatCurrency(processing.totalRecoveredCost)} sub={`${Number(processing.recoveryPct).toFixed(1)}%`} color="amber" />
            <KPICard icon={<WarningCircle size={18} weight="duotone" />} label="Pte. recuperar" value={formatCurrency(processing.pendingRecovery)} color="purple" />
          </div>
        </Section>
      )}

      {/* ─── 8. CRÉDITO ─── */}
      {data.creditSummary && data.creditSummary.salesCount > 0 && (
        <Section color="credit" title="Crédito / Fiado" icon={<WarningCircle size={16} weight="duotone" className="text-pink-500" />}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard icon={<ShoppingBag size={18} weight="duotone" />} label="Ventas crédito" value={String(data.creditSummary.salesCount)} color="amber" />
            <KPICard icon={<CurrencyDollar size={18} weight="duotone" />} label="Total fiado" value={formatCurrency(data.creditSummary.totalAmount)} color="red" />
            <KPICard icon={<WarningCircle size={18} weight="duotone" />} label="Pendiente cobro" value={formatCurrency(data.creditSummary.pendingAmount)} color="purple" />
            <KPICard icon={<UserCircle size={18} weight="duotone" />} label="Con deuda" value={String(data.creditSummary.customersWithDebt)} color="blue" />
          </div>
        </Section>
      )}

      {/* ─── 9. ALERTAS ─── */}
      {(data.lowStock.length > 0 || data.expiringSoon.length > 0) && (
        <Section color="alerts" title="Alertas" icon={<Warning size={16} weight="duotone" className="text-red-500" />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.lowStock.length > 0 && (
              <div>
                <h4 className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold mb-2">Stock bajo ({data.lowStock.length})</h4>
                <ul className="divide-y dark:divide-gray-700 max-h-[200px] overflow-auto">
                  {data.lowStock.slice(0, 8).map((p) => (
                    <li key={p.id} className="py-1.5 flex justify-between items-center text-xs">
                      <span className="truncate max-w-[140px]">{p.name}</span>
                      <span className={`font-mono px-1.5 py-0.5 rounded ${p.stockQty <= 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                        {formatQty(p.stockQty)}/{formatQty(p.minStock)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.expiringSoon.length > 0 && (
              <div>
                <h4 className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold mb-2">Por vencer ({data.expiringSoon.length})</h4>
                <ul className="divide-y dark:divide-gray-700 max-h-[200px] overflow-auto">
                  {data.expiringSoon.slice(0, 8).map((b) => (
                    <li key={b.id} className="py-1.5 flex justify-between items-center text-xs">
                      <span className="truncate max-w-[140px]">{b.productName}</span>
                      <span className={`font-mono px-1.5 py-0.5 rounded ${b.daysLeft <= 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                        {b.daysLeft <= 0 ? 'VENCIDO' : `${b.daysLeft}d`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
      <h3 className="font-bold text-xs mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}
