import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, X, CheckCircle, ChartPieSlice,
  SealCheck, Package, CurrencyDollar, Scales, ClipboardText,
  MagnifyingGlass, TrendUp, WarningCircle, ArrowsLeftRight, Trash,
} from '@phosphor-icons/react';
import * as api from '../api/processing';
import type { ProcessingBatch, AnalysisResult, ProcessingOutputItem, DashboardSummary } from '../api/processing';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatsCards, type StatCard } from '../components/StatsCards';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { ErrorView } from '../components/ErrorBoundary';

type View = 'list' | 'new' | 'detail';
type WeightUnit = 'kg' | 'lb';

const ANIMALS = [
  { value: 'RES', label: 'Res' },
  { value: 'CERDO', label: 'Cerdo' },
  { value: 'POLLO', label: 'Pollo' },
  { value: 'PESCADO', label: 'Pescado' },
  { value: 'CORDERO', label: 'Cordero' },
  { value: 'CABRA', label: 'Cabra' },
  { value: 'MARISCO', label: 'Marisco' },
  { value: 'OTRO', label: 'Otro' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const ANIMAL_LABELS: Record<string, string> = {};
for (const a of ANIMALS) ANIMAL_LABELS[a.value] = a.label;

const KG_PER_LB = 0.453592;

function toUnit(kg: number, unit: WeightUnit): number {
  if (unit === 'lb') return kg / KG_PER_LB;
  return kg;
}

function toUnitFixed(kg: number, unit: WeightUnit, decimals = 2): string {
  return toUnit(kg, unit).toFixed(decimals);
}

function unitLabel(unit: WeightUnit): string {
  return unit === 'lb' ? 'lb' : 'kg';
}

function unitLabelPer(unit: WeightUnit): string {
  return unit === 'lb' ? '$/lb' : '$/kg';
}

const STORAGE_KEY = 'fameat-processing-unit';

function statusBadge(status: string) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || ''}`}>{STATUS_LABELS[status] || status}</span>;
}

function loadUnit(): WeightUnit {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'lb') return 'lb';
  localStorage.setItem(STORAGE_KEY, 'kg');
  return 'kg';
}

function saveUnit(u: WeightUnit) {
  localStorage.setItem(STORAGE_KEY, u);
}

interface ProductOption {
  id: number;
  name: string;
  stockQty: number;
}

interface CutEntry {
  productId: number;
  productName: string;
  weightKg: string;
  salePricePerKg: string;
}

export function ProcessingPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [view, setView] = useState<View>(() => {
    if (id) return 'detail';
    if (location.pathname === '/processing/new') return 'new';
    return 'list';
  });
  const [unit, setUnit] = useState<WeightUnit>(loadUnit);

  const toggleUnit = useCallback(() => {
    setUnit((prev) => {
      const next = prev === 'kg' ? 'lb' : 'kg';
      saveUnit(next);
      return next;
    });
  }, []);

  const [batches, setBatches] = useState<api.ProcessingBatch[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [step, setStep] = useState(1);
  const [animalType, setAnimalType] = useState('RES');
  const [inputProductId, setInputProductId] = useState(0);
  const [inputWeightKg, setInputWeightKg] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [wasteKg, setWasteKg] = useState('');
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [cuts, setCuts] = useState<CutEntry[]>([]);
  const [cutProductSearch, setCutProductSearch] = useState<Record<number, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (view === 'list') {
      setLoading(true);
      setLoadError(null);
      Promise.all([
        api.list({ status: statusFilter || undefined }),
        api.getSummary().catch(() => null),
      ]).then(([b, s]) => {
        setBatches(b);
        setSummary(s);
      }).catch((err) => setLoadError(err)).finally(() => setLoading(false));
    } else if (view === 'detail' && id) {
      setLoading(true);
      setLoadError(null);
      Promise.all([
        api.getOne(Number(id)),
        api.getAnalysis(Number(id)).catch(() => null),
      ]).then(([b, a]) => {
        setAnalysis(a);
      }).catch((err) => setLoadError(err)).finally(() => setLoading(false));
    } else if (view === 'new') {
      setLoading(true);
      client.get('/products?active=true&pageSize=200').then((r) => {
        setProducts((r.data?.data || r.data || []).map((p: any) => ({ id: p.id, name: p.name, stockQty: Number(p.stockQty) })));
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [view, id, statusFilter]);

  const addCut = useCallback(() => {
    setCuts((prev) => [...prev, { productId: 0, productName: '', weightKg: '', salePricePerKg: '' }]);
  }, []);

  const updateCut = useCallback((index: number, field: keyof CutEntry, value: any) => {
    setCuts((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        next[index].productName = prod?.name || '';
      }
      return next;
    });
  }, [products]);

  const removeCut = useCallback((index: number) => {
    setCuts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!inputProductId) { toast.error('Selecciona el producto de entrada'); return; }
    if (!inputWeightKg || Number(inputWeightKg) <= 0) { toast.error('Peso de entrada inválido'); return; }
    if (!totalCost || Number(totalCost) <= 0) { toast.error('Costo total inválido'); return; }
    if (cuts.length === 0) { toast.error('Agrega al menos 1 corte'); return; }
    for (const c of cuts) {
      if (!c.productId) { toast.error('Selecciona un producto para cada corte'); return; }
      if (!c.weightKg || Number(c.weightKg) <= 0) { toast.error('Peso inválido en corte'); return; }
    }

    setSaving(true);
    try {
      const outputs: ProcessingOutputItem[] = cuts.map((c) => ({
        productId: c.productId,
        weightKg: Number(c.weightKg),
        salePricePerKg: c.salePricePerKg ? Number(c.salePricePerKg) : null,
      }));

      const batch = await api.create({
        animalType,
        inputProductId,
        inputWeightKg: Number(inputWeightKg),
        totalCost: Number(totalCost),
        wasteWeightKg: Number(wasteKg) || 0,
        notes: notes || null,
        outputs,
      });

      const completed = await api.complete(batch.id);
      toast.success(`Proceso ${completed.code} completado`);
      navigate('/processing');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Error al crear proceso');
    } finally {
      setSaving(false);
    }
  }, [animalType, inputProductId, inputWeightKg, totalCost, wasteKg, notes, cuts, navigate]);

  const handleCancel = useCallback(async (batchId: number) => {
    if (!confirm('¿Cancelar este proceso?')) return;
    try {
      await api.cancel(batchId);
      toast.success('Proceso cancelado');
      setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, status: 'CANCELLED' } : b));
    } catch { toast.error('Error al cancelar'); }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    try {
      await api.remove(confirmDeleteId);
      toast.success('Proceso eliminado permanentemente');
      setBatches((prev) => prev.filter((b) => b.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Error al eliminar');
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId]);

  const handleComplete = useCallback(async (batchId: number) => {
    if (!confirm('¿Finalizar este proceso? Se actualizará el stock y los costos.')) return;
    try {
      await api.complete(batchId);
      toast.success('Proceso finalizado');
      navigate('/processing');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Error al finalizar');
    }
  }, [navigate]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCuts = (searchVal: string) =>
    products.filter((p) => p.name.toLowerCase().includes(searchVal.toLowerCase())).slice(0, 8);

  const statuses = ['DRAFT', 'COMPLETED', 'CANCELLED'];

  if (loadError) return <ErrorView error={loadError} onRetry={() => window.location.reload()} />;

  // ── New / Wizard ──────────────────────────────────────────────
  if (view === 'new') {
    return (
      <div className="h-full overflow-auto p-3 md:p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/processing')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowLeft size={20} weight="bold" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nuevo Procesamiento</h1>
              <p className="text-xs text-gray-500">Registra el desposte de un animal</p>
            </div>
            <button onClick={toggleUnit}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowsLeftRight size={12} weight="bold" />
              {unit.toUpperCase()}
            </button>
          </div>

          {/* Steps */}
          <div className="flex gap-2">
            {['Producto entrada', 'Cortes', 'Confirmar'].map((label, i) => (
              <button
                key={label}
                onClick={() => setStep(i + 1)}
                className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-colors ${step >= i + 1 ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando productos...</div>
          ) : (
            <>
              {/* Step 1: Input */}
              {step === 1 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tipo de animal</label>
                      <select value={animalType} onChange={(e) => setAnimalType(e.target.value)}
                        className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent">
                        {ANIMALS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Producto de entrada</label>
                      <div className="relative">
                        <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Buscar producto..."
                          className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                        />
                        <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      {productSearch && (
                        <div className="mt-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 shadow-lg">
                          {filteredProducts.slice(0, 10).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setInputProductId(p.id); setProductSearch(p.name); }}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${inputProductId === p.id ? 'bg-red-50 dark:bg-red-900/20 font-medium' : ''}`}
                            >
                              {p.name} <span className="text-gray-400">({p.stockQty} kg)</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Peso total ({unitLabel(unit)})</label>
                      <input type="number" step="0.01" value={inputWeightKg} onChange={(e) => setInputWeightKg(e.target.value)}
                        placeholder={`Ej: ${unit === 'lb' ? '551' : '250'}`} className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Costo total ($)</label>
                      <input type="number" step="1000" value={totalCost} onChange={(e) => setTotalCost(e.target.value)}
                        placeholder="Ej: 800000" className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Merma / huesos ({unitLabel(unit)})</label>
                      <input type="number" step="0.01" value={wasteKg} onChange={(e) => setWasteKg(e.target.value)}
                        placeholder="0" className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notas</label>
                      <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Opcional" className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={() => { if (inputProductId && inputWeightKg && totalCost) setStep(2); else toast.error('Completa los campos requeridos'); }}>
                      Siguiente: Cortes →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Cuts */}
              {step === 2 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Agrega los cortes obtenidos del desposte</p>
                    <Button size="sm" onClick={addCut}><Plus size={14} weight="bold" /> Agregar corte</Button>
                  </div>
                  {cuts.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">No hay cortes. Haz clic en "Agregar corte"</div>
                  )}
                  <div className="space-y-2">
                    {cuts.map((cut, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-xs text-gray-400 font-bold w-5">{i + 1}</span>
                        <div className="flex-1 relative">
                          <input type="text"
                            value={cutProductSearch[i] || (cut.productId ? cut.productName : '')}
                            onChange={(e) => {
                              setCutProductSearch((prev) => ({ ...prev, [i]: e.target.value }));
                              if (cut.productId) updateCut(i, 'productId', 0);
                            }}
                            placeholder="Buscar producto..."
                            className="w-full h-9 px-3 text-xs border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                          />
                          {(cutProductSearch[i] || '') && (
                            <div className="absolute top-full left-0 right-0 z-10 mt-0.5 max-h-28 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 shadow-lg">
                              {filteredCuts(cutProductSearch[i] || '').map((p) => (
                                <button key={p.id} type="button" onClick={() => { updateCut(i, 'productId', p.id); setCutProductSearch((prev) => ({ ...prev, [i]: '' })); }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700">{p.name}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input type="number" step="0.01" value={cut.weightKg} onChange={(e) => updateCut(i, 'weightKg', e.target.value)}
                          placeholder={unitLabel(unit)} className="w-20 h-9 px-2 text-xs border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                        <input type="number" step="100" value={cut.salePricePerKg} onChange={(e) => updateCut(i, 'salePricePerKg', e.target.value)}
                          placeholder={unitLabelPer(unit)} className="w-24 h-9 px-2 text-xs border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                        <button onClick={() => removeCut(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                          <X size={14} weight="bold" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="secondary" onClick={() => setStep(1)}>← Anterior</Button>
                    <Button onClick={() => { if (cuts.length > 0) setStep(3); else toast.error('Agrega al menos 1 corte'); }}>
                      Siguiente: Costos →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Confirm */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 md:p-5 space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100"><ChartPieSlice size={16} weight="duotone" className="text-green-600" /> Resumen de costos</h3>
                    {(() => {
                      const totalIn = Number(inputWeightKg) || 0;
                      const totalOut = cuts.reduce((s, c) => s + (Number(c.weightKg) || 0), 0);
                      const waste = Number(wasteKg) || 0;
                      const invest = Number(totalCost) || 0;
                      const uniformCost = totalOut > 0 ? invest / totalOut : 0;
                      const u = unit;
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-gray-500">Inversión total:</div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">${invest.toLocaleString()}</div>
                            <div className="text-gray-500">Peso entrada / salida:</div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">{toUnitFixed(totalIn, u)} {unitLabel(u)} → {toUnitFixed(totalOut, u)} {unitLabel(u)}</div>
                            <div className="text-gray-500">Costo por {unitLabel(u)} uniforme:</div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">${(u === 'lb' ? uniformCost / KG_PER_LB : uniformCost).toFixed(2)} / {unitLabel(u)}</div>
                            <div className="text-gray-500">Merma:</div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">{toUnitFixed(waste, u)} {unitLabel(u)}</div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 border-b border-green-200 dark:border-green-700">
                                  <th className="text-left py-1.5 font-semibold">Corte</th>
                                  <th className="text-right py-1.5 font-semibold">{unitLabel(u)}</th>
                                  <th className="text-right py-1.5 font-semibold">$/{unitLabel(u)}</th>
                                  <th className="text-right py-1.5 font-semibold">Costo</th>
                                  <th className="text-right py-1.5 font-semibold">Precio</th>
                                  <th className="text-right py-1.5 font-semibold">Margen</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cuts.map((c, i) => {
                                  const kg = Number(c.weightKg) || 0;
                                  const cost = kg * uniformCost;
                                  const price = Number(c.salePricePerKg) || 0;
                                  const margin = price > 0 ? ((price - uniformCost) / price * 100) : 0;
                                  const pricePerUnit = u === 'lb' ? price / KG_PER_LB : price;
                                  return (
                                    <tr key={i} className="border-b border-green-100 dark:border-green-900/30">
                                      <td className="py-1.5 text-gray-800 dark:text-gray-200">{c.productName || `Corte ${i + 1}`}</td>
                                      <td className="text-right py-1.5 text-gray-800 dark:text-gray-200">{toUnitFixed(kg, u)}</td>
                                      <td className="text-right py-1.5 text-gray-800 dark:text-gray-200">${(u === 'lb' ? uniformCost / KG_PER_LB : uniformCost).toFixed(2)}</td>
                                      <td className="text-right py-1.5 text-gray-800 dark:text-gray-200">${cost.toFixed(2)}</td>
                                      <td className="text-right py-1.5 text-gray-800 dark:text-gray-200">{price > 0 ? `$${pricePerUnit.toFixed(2)}` : '-'}</td>
                                      <td className={`text-right py-1.5 font-semibold ${margin > 0 ? 'text-green-600' : 'text-red-500'}`}>{margin > 0 ? `${margin.toFixed(1)}%` : '0%'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4 md:p-5">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-gray-800 dark:text-gray-100"><SealCheck size={16} weight="duotone" className="text-amber-600" /> Confirmar</h3>
                    <p className="text-xs text-gray-500 mb-4">Al confirmar se creará el proceso y se actualizará el stock de cada corte automáticamente.</p>
                    <div className="flex justify-between">
                      <Button variant="secondary" onClick={() => setStep(2)}>← Anterior</Button>
                      <Button onClick={handleCreate} loading={saving}>{saving ? 'Guardando...' : 'Confirmar y finalizar'}</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Detail ────────────────────────────────────────────────────
  if (view === 'detail' && id) {
    return (
      <div className="h-full overflow-auto p-3 md:p-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/processing')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowLeft size={20} weight="bold" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Proceso {analysis?.code || `#${id}`}</h1>
            </div>
            <button onClick={toggleUnit}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowsLeftRight size={12} weight="bold" />
              {unit.toUpperCase()}
            </button>
            {analysis && analysis.status !== 'COMPLETED' && hasRole('ADMIN', 'SUPERVISOR') && (
              <Button size="sm" variant="danger" onClick={() => setConfirmDeleteId(Number(id))}>
                <Trash size={14} weight="bold" />
              </Button>
            )}
          </div>

          {loading ? (
            <PageSkeleton type="dashboard" />
          ) : loadError ? (
            <ErrorView error={loadError} onRetry={() => window.location.reload()} />
          ) : analysis ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    <CurrencyDollar size={14} weight="duotone" className="text-red-500" /> Inversión total
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">${analysis.totalInvested.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    <Scales size={14} weight="duotone" className="text-blue-500" /> Peso total cortes
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{toUnitFixed(analysis.totalOutputWeight, unit)} {unitLabel(unit)}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    <ChartPieSlice size={14} weight="duotone" className="text-purple-500" /> Costo/{unitLabel(unit)} uniforme
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">${(unit === 'lb' ? analysis.costPerKgUniform / KG_PER_LB : analysis.costPerKgUniform).toFixed(2)}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    <TrendUp size={14} weight="duotone" className={analysis.recovery.recoveryPct >= 100 ? 'text-green-500' : 'text-amber-500'} /> Recuperación
                  </div>
                  <div className={`text-xl font-bold ${analysis.recovery.recoveryPct >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                    {analysis.recovery.recoveryPct}%
                  </div>
                </div>
              </div>

              {/* Cuts table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Cortes producidos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-slate-900/50">
                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Corte</th>
                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Peso ({unitLabel(unit)})</th>
                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">$/{unitLabel(unit)} costo</th>
                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Costo total</th>
                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Precio venta</th>
                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Stock</th>
                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Vendido</th>
                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {analysis.cuts.map((cut) => (
                        <tr key={cut.productId} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{cut.productName}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{toUnitFixed(cut.weightKg, unit)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">${(unit === 'lb' ? cut.costPerKg / KG_PER_LB : cut.costPerKg).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">${cut.totalCost.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">${cut.salePrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{toUnitFixed(cut.stockQty, unit)} {unitLabel(unit)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{toUnitFixed(cut.soldQty, unit)} {unitLabel(unit)}</td>
                          <td className={`px-4 py-3 text-right text-sm font-semibold ${cut.margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {cut.margin}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recovery analysis */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 md:p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <ChartPieSlice size={16} weight="duotone" className="text-purple-500" /> Análisis de recuperación
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Costo vendido</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">${analysis.recovery.soldCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Ingreso por ventas</div>
                    <div className="text-lg font-bold text-green-600">${analysis.recovery.recoveredRevenue.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Valor stock (costo)</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">${analysis.recovery.remainingStockCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Valor stock (venta)</div>
                    <div className="text-lg font-bold text-blue-600">${analysis.recovery.remainingStockRevenue.toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Recuperación de inversión</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${Math.min(analysis.recovery.recoveryPct, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Ganancia esperada</div>
                    <div className={`text-lg font-bold ${analysis.recovery.expectedProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      ${analysis.recovery.expectedProfit.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">No se encontró el proceso</div>
          )}
        </div>

        <ConfirmModal
          open={confirmDeleteId !== null}
          title="Eliminar proceso"
          message="Este proceso se eliminará permanentemente de la base de datos. ¿Estás seguro?"
          variant="danger"
          confirmText="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    );
  }

  // ── List (default) ────────────────────────────────────────────
  const statsCards: StatCard[] = summary ? [
    {
      label: 'Procesos este mes',
      value: String(summary.activeBatches),
      icon: <ClipboardText size={20} weight="duotone" />,
      color: 'bg-blue-100 text-blue-600',
      sub: summary.month,
    },
    {
      label: 'Invertido',
      value: `$${summary.totalInvested.toLocaleString()}`,
      icon: <CurrencyDollar size={20} weight="duotone" />,
      color: 'bg-red-100 text-red-500',
    },
    {
      label: 'Recuperado',
      value: `${summary.recoveryPct}%`,
      icon: <TrendUp size={20} weight="duotone" />,
      color: summary.recoveryPct >= 100 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600',
      sub: `$${summary.totalRecoveredCost.toLocaleString()}`,
    },
    {
      label: 'Pendiente',
      value: `$${summary.pendingRecovery.toLocaleString()}`,
      icon: <WarningCircle size={20} weight="duotone" />,
      color: 'bg-purple-100 text-purple-600',
    },
  ] : [];

  return (
    <div className="h-full overflow-auto p-3 md:p-6 space-y-5">
      <PageHeader
        icon={<ClipboardText size={24} weight="duotone" />}
        title="Procesamiento / Desposte"
        description="Registra lotes de desposte de animales, divide en cortes, y analiza la recuperación de inversión vs ventas."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={toggleUnit}
              className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowsLeftRight size={12} weight="bold" />
              {unit.toUpperCase()}
            </button>
            <Button onClick={() => navigate('/processing/new')}><Plus size={16} weight="bold" /> Nuevo proceso</Button>
          </div>
        }
      />

      {statsCards.length > 0 && <StatsCards cards={statsCards} />}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código..." data-search-input
            className="w-full pl-8 pr-8 h-9 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent">
          <option value="">Todos los estados</option>
          {statuses.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <PageSkeleton type="table" />
      ) : batches.length === 0 && !search && !statusFilter ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
            <Package size={32} weight="duotone" className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Aún no hay procesos</p>
          <p className="text-sm text-gray-400 mb-5">Crea el primer proceso de desposte para empezar</p>
          <Button onClick={() => navigate('/processing/new')}><Plus size={16} weight="bold" /> Crear primer proceso</Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Código</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Animal</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Inversión</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Peso entrada ({unitLabel(unit)})</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Peso cortes ({unitLabel(unit)})</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">$/{unitLabel(unit)}</th>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Fecha</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {batches
                  .filter((b) => !search || b.code.toLowerCase().includes(search.toLowerCase()))
                  .map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => navigate(`/processing/${batch.id}`)}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{batch.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{ANIMAL_LABELS[batch.animalType] || batch.animalType}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">${Number(batch.totalCost).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{toUnitFixed(Number(batch.inputWeightKg), unit)} {unitLabel(unit)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{batch.totalOutputWeight ? `${toUnitFixed(batch.totalOutputWeight, unit)} ${unitLabel(unit)}` : '-'}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{batch.totalOutputWeight ? `$${(unit === 'lb' ? Number(batch.totalCost) / batch.totalOutputWeight / KG_PER_LB : Number(batch.totalCost) / batch.totalOutputWeight).toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(batch.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(batch.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {batch.status === 'DRAFT' && (
                          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" onClick={() => handleComplete(batch.id)}><CheckCircle size={14} weight="bold" /></Button>
                            <Button size="sm" variant="danger" onClick={() => handleCancel(batch.id)}><X size={14} weight="bold" /></Button>
                            {hasRole('ADMIN', 'SUPERVISOR') && (
                              <Button size="sm" variant="danger" onClick={() => setConfirmDeleteId(batch.id)}><Trash size={14} weight="bold" /></Button>
                            )}
                          </div>
                        )}
                        {batch.status === 'CANCELLED' && hasRole('ADMIN', 'SUPERVISOR') && (
                          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="danger" onClick={() => setConfirmDeleteId(batch.id)}><Trash size={14} weight="bold" /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {batches.filter((b) => !search || b.code.toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3">
                <MagnifyingGlass size={24} weight="duotone" className="text-amber-500" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Sin resultados</p>
              <p className="text-sm text-gray-400 mb-4">No hay procesos que coincidan con tu búsqueda</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setSearch(''); setStatusFilter(''); }}>Limpiar filtros</Button>
                <Button onClick={() => navigate('/processing/new')}><Plus size={16} weight="bold" /> Nuevo proceso</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Eliminar proceso"
        message="Este proceso se eliminará permanentemente de la base de datos. ¿Estás seguro?"
        variant="danger"
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
