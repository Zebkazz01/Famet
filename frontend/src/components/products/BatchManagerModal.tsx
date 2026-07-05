import { useEffect, useState } from 'react';
import { Portal } from '../Portal';
import { X, Plus, Trash, PencilSimple, Stack } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import * as batchesApi from '../../api/batches';
import type { Batch } from '../../api/batches';
import { Button, Input, DatePicker, Textarea, Badge } from '../ui';
import { ExpiryBadge } from './ExpiryBadge';
import { formatExpiry } from '../../utils/expiryHelpers';

export interface BatchManagerModalProps {
  productId: number;
  productName: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

interface FormState {
  batchCode: string;
  expiryDate: string;
  qty: string;
  notes: string;
}

const EMPTY_FORM: FormState = { batchCode: '', expiryDate: '', qty: '', notes: '' };

export function BatchManagerModal({ productId, productName, open, onClose, onChanged }: BatchManagerModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [totalQty, setTotalQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await batchesApi.listForProduct(productId);
      setBatches(data.batches);
      setTotalQty(data.totalQty);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  function startEdit(b: Batch) {
    setEditId(b.id);
    setForm({
      batchCode: b.batchCode || '',
      expiryDate: b.expiryDate.slice(0, 10),
      qty: String(b.qty),
      notes: b.notes || '',
    });
    setShowForm(true);
  }

  function startNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.expiryDate || !form.qty) {
      toast.error('Fecha y cantidad son requeridos');
      return;
    }
    const qty = Number(form.qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Cantidad debe ser > 0');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        batchCode: form.batchCode || null,
        expiryDate: form.expiryDate,
        qty,
        notes: form.notes || null,
      };
      if (editId) {
        await batchesApi.update(editId, payload);
        toast.success('Lote actualizado');
      } else {
        await batchesApi.create(productId, payload);
        toast.success('Lote creado');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await batchesApi.remove(id);
      toast.success('Lote eliminado');
      setConfirmDelete(null);
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al eliminar');
    }
  }

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Stack size={22} weight="duotone" className="text-white" />
              <div>
                <h3 className="text-white font-bold text-lg">Lotes de {productName}</h3>
                <p className="text-red-100 text-xs">{batches.length} lote(s) · Total {totalQty} uds</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto styled-scroll p-4 space-y-3">
            {showForm && (
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {editId ? 'Editar lote' : 'Nuevo lote'}
                  </p>
                  <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Código de lote"
                    placeholder="Opcional"
                    value={form.batchCode}
                    onChange={(e) => setForm({ ...form, batchCode: e.target.value })}
                  />
                  <DatePicker
                    label="Fecha de vencimiento *"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  />
                  <Input
                    label="Cantidad *"
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  />
                </div>
                <Textarea
                  label="Notas"
                  placeholder="Opcional"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</Button>
                  <Button size="sm" variant="primary" onClick={handleSave} loading={saving}>
                    {editId ? 'Guardar' : 'Crear lote'}
                  </Button>
                </div>
              </div>
            )}

            {!showForm && (
              <Button size="sm" variant="primary" iconLeft={<Plus size={14} weight="bold" />} onClick={startNew}>
                Agregar lote
              </Button>
            )}

            {loading && batches.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400">Cargando...</div>
            )}

            {!loading && batches.length === 0 && (
              <div className="py-10 text-center">
                <Stack size={36} weight="duotone" className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sin lotes registrados</p>
                <p className="text-xs text-gray-400 mt-1">Agrega lotes para activar control de vencimiento + FIFO</p>
              </div>
            )}

            <ul className="space-y-2">
              {batches.map((b) => {
                const isDeleting = confirmDelete === b.id;
                return (
                  <li key={b.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-start gap-3 bg-white dark:bg-slate-800">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {b.batchCode || `Lote #${b.id}`}
                        </span>
                        <Badge variant="blue" size="xs">{b.qty} uds</Badge>
                        <ExpiryBadge date={b.expiryDate} size="xs" />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Vence: {formatExpiry(b.expiryDate)}
                        {b.notes && <span className="ml-2 italic">· {b.notes}</span>}
                      </p>
                    </div>
                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">¿Eliminar?</span>
                        <button onClick={() => handleDelete(b.id)} className="px-1.5 py-0.5 rounded-lg bg-red-500 text-white text-[10px] hover:bg-red-600">Sí</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-1.5 py-0.5 rounded-lg bg-gray-200 dark:bg-slate-700 text-[10px]">No</button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(b)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-blue-600">
                          <PencilSimple size={14} weight="duotone" />
                        </button>
                        <button onClick={() => setConfirmDelete(b.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-red-500">
                          <Trash size={14} weight="duotone" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </Portal>
  );
}
