import { useEffect, useMemo, useState } from 'react';
import {
  ChartPieSlice, FileArrowDown, FilePdf, FileXls, Calendar, ChartBar,
  ArrowUp, ArrowDown, Lock, CheckCircle, ChartLine,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import * as reportsApi from '../api/reports';
import type { FinancialReport, MonthlyStatement } from '../api/reports';
import { Card, Button, Badge, Tabs, TabList, Tab, TabPanel, DateRangePicker, Select, SkeletonStatsRow, SkeletonText, SkeletonListItem } from '../components/ui';
import type { DateRange } from '../components/ui/DateRangePicker';
import { PageHeader } from '../components/layout/PageHeader';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';

function todayISO() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const TYPE_OPTIONS = [
  { value: 'sales', label: 'Ventas' },
  { value: 'financial', label: 'Financiero' },
  { value: 'expenses', label: 'Gastos' },
  { value: 'inventory', label: 'Inventario' },
];

export function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState<'range' | 'monthly' | 'compare'>('range');
  const [range, setRange] = useState<DateRange>({ from: monthStart(), to: todayISO() });
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportType, setReportType] = useState<'sales' | 'financial' | 'expenses' | 'inventory'>('financial');

  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [closeMonthValue, setCloseMonthValue] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const [, setClosingMonth] = useState(false);

  async function loadReport() {
    if (!range.from || !range.to) {
      toast.error('Selecciona un rango de fechas');
      return;
    }
    setLoadingReport(true);
    try {
      const data = reportType === 'financial' || reportType === 'sales' || reportType === 'expenses'
        ? await reportsApi.financialReport({ from: range.from, to: range.to })
        : null;
      if (data) setReport(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al cargar reporte');
    } finally {
      setLoadingReport(false);
    }
  }

  async function loadStatements() {
    setLoadingStatements(true);
    try {
      setStatements(await reportsApi.listStatements());
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error');
    } finally {
      setLoadingStatements(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, range.from, range.to]);

  useEffect(() => {
    if (tab === 'monthly' || tab === 'compare') loadStatements();
  }, [tab]);

  async function handleExport(format: 'pdf' | 'xlsx') {
    if (reportType === 'inventory') {
      await reportsApi.downloadReport('inventory', format, {});
      return;
    }
    if (!range.from || !range.to) {
      toast.error('Rango requerido');
      return;
    }
    try {
      await reportsApi.downloadReport(reportType, format, { from: range.from, to: range.to });
      toast.success(`${format.toUpperCase()} descargado`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al exportar');
    }
  }

  async function handleCloseMonth() {
    setClosingMonth(true);
    try {
      await reportsApi.closeMonth(closeMonthValue);
      toast.success(`Mes ${closeMonthValue} cerrado`);
      setConfirmClose(false);
      await loadStatements();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al cerrar mes');
    } finally {
      setClosingMonth(false);
    }
  }

  const compareData = useMemo(() => {
    return [...statements]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((s) => ({
        month: s.month,
        Ingresos: Number(s.totalSales),
        Gastos: Number(s.totalExpenses),
        Utilidad: Number(s.netIncome),
        Descuentos: Number(s.totalDiscounts),
      }));
  }, [statements]);

  return (
    <div className="flex-1 overflow-auto styled-scroll p-4 md:p-6 space-y-4">
      <PageHeader
        icon={<ChartPieSlice size={24} weight="duotone" />}
        title="Reportes"
        description="Análisis financiero del negocio: estado de resultados (ingresos vs gastos), ventas por rango, cierres mensuales y comparativas entre períodos. Exporta cualquier reporte en PDF o Excel para contabilidad."
      />

      <Card id="reports-tabs" padding="none">
        <Tabs value={tab} onChange={(v) => setTab(v as any)}>
          <TabList className="px-3">
            <Tab value="range">Por rango</Tab>
            <Tab value="monthly">Cierre mensual</Tab>
            <Tab value="compare">Comparativas</Tab>
          </TabList>

          <TabPanel value="range">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  label="Tipo de reporte"
                  options={TYPE_OPTIONS}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                />
                <div className="md:col-span-2">
                  <DateRangePicker
                    label="Rango de fechas"
                    value={range}
                    onChange={setRange}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="primary" onClick={loadReport} loading={loadingReport} iconLeft={<ChartBar size={14} weight="bold" />}>
                  Generar vista previa
                </Button>
                <Button variant="outline" onClick={() => handleExport('pdf')} iconLeft={<FilePdf size={14} weight="duotone" />}>
                  Exportar PDF
                </Button>
                <Button variant="outline" onClick={() => handleExport('xlsx')} iconLeft={<FileXls size={14} weight="duotone" />}>
                  Exportar Excel
                </Button>
              </div>

              {(loadingReport || report) && reportType !== 'inventory' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="red" size="sm">
                    {TYPE_OPTIONS.find((o) => o.value === reportType)?.label}
                  </Badge>
                  {range.from && range.to && (
                    <span className="text-xs text-gray-500">{range.from} a {range.to}</span>
                  )}
                  {loadingReport && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Generando vista previa...</span>
                  )}
                </div>
              )}
              {loadingReport && !report && (
                <div className="space-y-4">
                  <SkeletonStatsRow count={4} />
                  <Card padding="md"><SkeletonText lines={6} /></Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card padding="md"><SkeletonText lines={4} /></Card>
                    <Card padding="md"><SkeletonText lines={4} /></Card>
                  </div>
                </div>
              )}
              {report && reportType !== 'inventory' && !loadingReport && <ReportPreview report={report} />}
              {reportType === 'inventory' && (
                <Card padding="md" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    El reporte de inventario solo se exporta. Usa los botones <strong>Exportar PDF/Excel</strong> arriba.
                  </p>
                </Card>
              )}
            </div>
          </TabPanel>

          <TabPanel value="monthly">
            <div className="p-4 space-y-4">
              <Card padding="md" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50">
                <div className="flex items-start gap-3 flex-wrap">
                  <Lock size={20} weight="duotone" className="text-amber-600 dark:text-amber-400 mt-1" />
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Cerrar mes</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Genera y guarda el estado de resultados del mes seleccionado. Se podrá comparar después.
                    </p>
                  </div>
                  <div className="flex gap-2 items-end">
                    <input
                      type="month"
                      value={closeMonthValue}
                      onChange={(e) => setCloseMonthValue(e.target.value)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800"
                    />
                    {isAdmin ? (
                      <Button variant="primary" iconLeft={<CheckCircle size={14} weight="bold" />} onClick={() => setConfirmClose(true)}>
                        Cerrar mes
                      </Button>
                    ) : (
                      <Badge variant="gray" size="sm">Requiere ADMIN</Badge>
                    )}
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Estados guardados</p>
                {loadingStatements && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonListItem key={i} />)}
                  </div>
                )}
                {!loadingStatements && statements.length === 0 && (
                  <Card padding="md" className="text-center text-xs text-gray-400">
                    No hay estados mensuales cerrados aún
                  </Card>
                )}
                <ul className="space-y-1.5">
                  {statements.map((s) => {
                    const net = Number(s.netIncome);
                    const positive = net >= 0;
                    return (
                      <li key={s.id}>
                        <Card padding="md" hover className="flex items-center gap-3 flex-wrap">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${positive ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400'}`}>
                            <Calendar size={18} weight="duotone" />
                          </div>
                          <div className="flex-1 min-w-[150px]">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.month}</p>
                            <p className="text-[11px] text-gray-500">
                              {s.salesCount} ventas · {formatCurrency(Number(s.totalSales))} ingresos
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {formatCurrency(net)}
                            </p>
                            <p className="text-[10px] text-gray-500">Utilidad neta</p>
                          </div>
                          <Button size="sm" variant="outline" iconLeft={<FileArrowDown size={12} weight="duotone" />}
                            onClick={() => window.open(`/api/reports/monthly-statements/${s.month}/pdf?token=${localStorage.getItem('token')}`, '_blank')}>
                            PDF
                          </Button>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </TabPanel>

          <TabPanel value="compare">
            <div className="p-4 space-y-4">
              {statements.length < 2 ? (
                <Card padding="md" className="text-center text-xs text-gray-400 py-12">
                  <ChartLine size={32} weight="duotone" className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p>Necesitas al menos 2 cierres mensuales para comparar</p>
                </Card>
              ) : (
                <>
                  <Card padding="md">
                    <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Ingresos vs Gastos vs Utilidad</p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={compareData}>
                          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RTooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} />
                          <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} />
                          <Line type="monotone" dataKey="Utilidad" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  <Card padding="md">
                    <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Descuentos por mes</p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={compareData}>
                          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RTooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
                          <Bar dataKey="Descuentos" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </TabPanel>
        </Tabs>
      </Card>

      <ConfirmModal
        open={confirmClose}
        title={`Cerrar mes ${closeMonthValue}`}
        message="Se generará un estado de resultados snapshot del mes. Puedes regenerarlo después si lo cierras de nuevo. ¿Continuar?"
        variant="warning"
        confirmText="Cerrar mes"
        onConfirm={handleCloseMonth}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}

function ReportPreview({ report }: { report: FinancialReport }) {
  const t = report.totals;
  const positive = t.netIncome >= 0;
  return (
    <div className="space-y-4">
      <Card padding="md">
        <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Resumen</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KV label="Ventas" value={String(t.salesCount)} />
          <KV label="Ingresos brutos" value={formatCurrency(t.grossRevenue)} />
          <KV label="Descuentos" value={`- ${formatCurrency(t.discountTotal)}`} className="text-amber-600" />
          <KV label="Ingresos netos" value={formatCurrency(t.netRevenue)} highlight />
          <KV label="Costo productos" value={`- ${formatCurrency(t.totalCost)}`} />
          <KV label="Utilidad bruta" value={formatCurrency(t.grossProfit)} highlight />
          <KV label="Gastos" value={`- ${formatCurrency(t.expensesTotal)}`} className="text-red-500" />
          <KV
            label="UTILIDAD NETA"
            value={formatCurrency(t.netIncome)}
            highlight
            className={positive ? 'text-green-600' : 'text-red-500'}
            icon={positive ? <ArrowUp size={14} weight="bold" /> : <ArrowDown size={14} weight="bold" />}
          />
        </div>
      </Card>

      {report.topProducts.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Top 10 productos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-1.5">Producto</th>
                  <th className="text-right py-1.5">Uds</th>
                  <th className="text-right py-1.5">Ingreso</th>
                  <th className="text-right py-1.5">Utilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {report.topProducts.map((p) => (
                  <tr key={p.productId}>
                    <td className="py-1.5">{p.name}</td>
                    <td className="text-right py-1.5">{p.qty.toFixed(2)}</td>
                    <td className="text-right py-1.5">{formatCurrency(p.revenue)}</td>
                    <td className="text-right py-1.5 text-green-600 font-medium">{formatCurrency(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.byCategory.length > 0 && (
          <Card padding="md">
            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Por categoría</p>
            <ul className="space-y-1 text-xs">
              {report.byCategory.slice(0, 8).map((c) => (
                <li key={c.categoryId ?? c.name} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{c.name}</span>
                  <span className="font-medium">{formatCurrency(c.revenue)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.byPayment.length > 0 && (
          <Card padding="md">
            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Por método de pago</p>
            <ul className="space-y-1 text-xs">
              {report.byPayment.map((p) => (
                <li key={p.method} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {p.method === 'CASH' ? 'Efectivo' : p.method === 'CARD' ? 'Tarjeta' : 'Transferencia'}
                    {' '}<span className="text-gray-400">({p.count})</span>
                  </span>
                  <span className="font-medium">{formatCurrency(p.total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function KV({ label, value, highlight, className, icon }: { label: string; value: string; highlight?: boolean; className?: string; icon?: React.ReactNode }) {
  return (
    <div className={`px-3 py-2 rounded-lg ${highlight ? 'bg-gray-50 dark:bg-slate-700/40' : ''}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-bold flex items-center gap-1 ${className || 'text-gray-900 dark:text-gray-100'}`}>
        {icon}
        {value}
      </p>
    </div>
  );
}
