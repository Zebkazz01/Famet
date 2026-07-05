import { useEffect, useState } from 'react';
import { Plus, Trash, PencilSimple, Percent, Stack, Tag, X, Check } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import * as discountsApi from '../../api/discounts';
import type { DiscountRule, DiscountType } from '../../api/discounts';
import { Button, Select, Input, Badge, Card, Combobox } from '../ui';

export interface DiscountRulesEditorProps {
  productId: number;
  productPrice?: number | string;
  /** Si productId es null/undefined (nuevo producto sin guardar) muestra mensaje */
  disabled?: boolean;
}

const TYPE_OPTIONS = [
  { value: 'QUANTITY_THRESHOLD', label: 'Descuento por cantidad' },
  { value: 'PERCENTAGE', label: 'Porcentaje fijo' },
  { value: 'BUY_X_GET_Y', label: 'Lleva X paga Y' },
  { value: 'FIXED_AMOUNT', label: 'Monto fijo' },
];

interface FormState {
  type: DiscountType;
  active: boolean;
  priority: number;
  // QUANTITY_THRESHOLD
  minQty: string;
  discountPct: string;
  // PERCENTAGE
  pct: string;
  // BUY_X_GET_Y
  buy: string;
  get: string;
  // FIXED_AMOUNT
  amount: string;
  perLine: boolean;
  // Vigencia
  validFrom: string;
  validTo: string;
}

const EMPTY_FORM: FormState = {
  type: 'QUANTITY_THRESHOLD',
  active: true,
  priority: 0,
  minQty: '5',
  discountPct: '20',
  pct: '10',
  buy: '2',
  get: '1',
  amount: '500',
  perLine: false,
  validFrom: '',
  validTo: '',
};

function ruleSummary(rule: DiscountRule): string {
  const cfg = rule.config;
  switch (rule.type) {
    case 'QUANTITY_THRESHOLD':
      return `Compra ${cfg.minQty}+ uds → ${cfg.discountPct}% off`;
    case 'PERCENTAGE':
      return `${cfg.pct}% siempre`;
    case 'BUY_X_GET_Y':
      return `Lleva ${cfg.buy}+${cfg.get} (${cfg.get} gratis)`;
    case 'FIXED_AMOUNT':
      return `$${cfg.amount} ${cfg.perLine ? 'por línea' : 'por unidad'}`;
    default:
      return 'Descuento';
  }
}

function ruleIcon(type: DiscountType) {
  switch (type) {
    case 'PERCENTAGE':
    case 'QUANTITY_THRESHOLD':
      return Percent;
    case 'BUY_X_GET_Y':
      return Stack;
    case 'FIXED_AMOUNT':
      return Tag;
  }
}

export function DiscountRulesEditor({ productId, productPrice, disabled }: DiscountRulesEditorProps) {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function refresh() {
    if (!productId) return;
    setLoading(true);
    try {
      setRules(await discountsApi.listForProduct(productId));
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function buildConfig(s: FormState): Record<string, any> {
    switch (s.type) {
      case 'QUANTITY_THRESHOLD':
        return { minQty: Number(s.minQty), discountPct: Number(s.discountPct) };
      case 'PERCENTAGE':
        return { pct: Number(s.pct) };
      case 'BUY_X_GET_Y':
        return { buy: Number(s.buy), get: Number(s.get), freePct: 100 };
      case 'FIXED_AMOUNT':
        return { amount: Number(s.amount), perLine: s.perLine };
    }
  }

  function startNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(r: DiscountRule) {
    setEditId(r.id);
    const cfg = r.config;
    setForm({
      ...EMPTY_FORM,
      type: r.type,
      active: r.active,
      priority: r.priority,
      minQty: String(cfg.minQty ?? '5'),
      discountPct: String(cfg.discountPct ?? '20'),
      pct: String(cfg.pct ?? '10'),
      buy: String(cfg.buy ?? '2'),
      get: String(cfg.get ?? '1'),
      amount: String(cfg.amount ?? '500'),
      perLine: Boolean(cfg.perLine),
      validFrom: r.validFrom?.slice(0, 10) ?? '',
      validTo: r.validTo?.slice(0, 10) ?? '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        productId,
        type: form.type,
        config: buildConfig(form),
        active: form.active,
        priority: form.priority,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      };
      if (editId) {
        await discountsApi.update(editId, payload);
        toast.success('Regla actualizada');
      } else {
        await discountsApi.create(payload);
        toast.success('Regla creada');
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (e: any) {
      const msg = e?.response?.data?.details?.[0]?.message || e?.response?.data?.error || 'Error al guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await discountsApi.remove(id);
      toast.success('Regla eliminada');
      setConfirmDelete(null);
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error');
    }
  }

  if (disabled || !productId) {
    return (
      <Card padding="md" className="bg-gray-50 dark:bg-slate-900/30">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Guarda el producto primero para configurar reglas de descuento
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Reglas de descuento {rules.length > 0 && <span className="text-gray-400">({rules.length})</span>}
        </p>
        {!showForm && (
          <Button size="sm" variant="primary" iconLeft={<Plus size={12} weight="bold" />} onClick={startNew}>
            Agregar regla
          </Button>
        )}
      </div>

      {showForm && (
        <Card padding="md" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                {editId ? 'Editar regla' : 'Nueva regla'}
              </p>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
            <Select
              label="Tipo de descuento"
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}
            />

            {form.type === 'QUANTITY_THRESHOLD' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Cantidad mínima"
                  type="number"
                  min="1"
                  value={form.minQty}
                  onChange={(e) => setForm({ ...form, minQty: e.target.value })}
                  hint="Ej: 5 = aplica desde la 5ta unidad"
                />
                <Input
                  label="% de descuento"
                  type="number"
                  min="0"
                  max="100"
                  value={form.discountPct}
                  onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
                  suffix="%"
                />
              </div>
            )}
            {form.type === 'PERCENTAGE' && (
              <Input
                label="% de descuento"
                type="number"
                min="0"
                max="100"
                value={form.pct}
                onChange={(e) => setForm({ ...form, pct: e.target.value })}
                suffix="%"
              />
            )}
            {form.type === 'BUY_X_GET_Y' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Lleva (X)"
                  type="number"
                  min="1"
                  value={form.buy}
                  onChange={(e) => setForm({ ...form, buy: e.target.value })}
                />
                <Input
                  label="Gratis (Y)"
                  type="number"
                  min="1"
                  value={form.get}
                  onChange={(e) => setForm({ ...form, get: e.target.value })}
                />
              </div>
            )}
            {form.type === 'FIXED_AMOUNT' && (
              <div className="space-y-2">
                <Input
                  label="Monto descontado"
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  prefix={<span className="text-xs">$</span>}
                />
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={form.perLine}
                    onChange={(e) => setForm({ ...form, perLine: e.target.checked })}
                    className="rounded-lg"
                  />
                  Aplicar por línea completa (no por unidad)
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200 dark:border-amber-900/50">
              <Input
                label="Válido desde"
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                hint="Opcional"
              />
              <Input
                label="Válido hasta"
                type="date"
                value={form.validTo}
                onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                hint="Opcional"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Combobox
                label="Prioridad"
                options={[
                  { value: '0', label: 'Baja' },
                  { value: '5', label: 'Media' },
                  { value: '10', label: 'Alta' },
                  { value: '100', label: 'Crítica' },
                ]}
                value={String(form.priority)}
                onChange={(v) => setForm({ ...form, priority: Number(v) || 0 })}
                hint="Mayor prioridad gana ante reglas simultáneas"
                clearable={false}
              />
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-6">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded-lg"
                />
                Activa
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>
                Cancelar
              </Button>
              <Button size="sm" variant="primary" onClick={handleSave} loading={saving} iconLeft={<Check size={12} weight="bold" />}>
                {editId ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading && rules.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">Cargando...</p>
      )}

      {!loading && rules.length === 0 && !showForm && (
        <Card padding="md" className="text-center text-xs text-gray-400">
          Sin reglas de descuento. Agrega una para aplicar promociones automáticas.
        </Card>
      )}

      <ul className="space-y-1.5">
        {rules.map((r) => {
          const Icon = ruleIcon(r.type);
          const isDeleting = confirmDelete === r.id;
          return (
            <li key={r.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${r.active ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900/50' : 'border-gray-200 bg-gray-50 dark:bg-slate-700/30 dark:border-gray-700'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.active ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-gray-400'}`}>
                <Icon size={16} weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ruleSummary(r)}</span>
                  {!r.active && <Badge variant="gray" size="xs">Inactiva</Badge>}
                  {r.priority > 0 && (
                    <Badge variant={r.priority >= 100 ? 'red' : r.priority >= 10 ? 'orange' : 'blue'} size="xs">
                      {r.priority >= 100 ? 'Crítica' : r.priority >= 10 ? 'Alta' : 'Media'}
                    </Badge>
                  )}
                </div>
                {(r.validFrom || r.validTo) && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Vigente: {r.validFrom?.slice(0, 10) || '...'} → {r.validTo?.slice(0, 10) || '...'}
                  </p>
                )}
              </div>
              {isDeleting ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(r.id)} className="px-1.5 py-0.5 rounded-lg bg-red-500 text-white text-[10px] hover:bg-red-600">Sí</button>
                  <button onClick={() => setConfirmDelete(null)} className="px-1.5 py-0.5 rounded-lg bg-gray-200 dark:bg-slate-700 text-[10px]">No</button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700 text-gray-500 hover:text-blue-600">
                    <PencilSimple size={13} weight="duotone" />
                  </button>
                  <button onClick={() => setConfirmDelete(r.id)} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700 text-gray-500 hover:text-red-500">
                    <Trash size={13} weight="duotone" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {productPrice && rules.some((r) => r.active && r.type === 'PERCENTAGE') && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          Nota: las reglas se aplican automáticamente al crear ventas. El descuento se contabiliza en `discountTotal` de la venta.
        </p>
      )}
    </div>
  );
}
