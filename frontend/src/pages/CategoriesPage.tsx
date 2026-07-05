import { useEffect, useState, useMemo } from 'react';
import { Folder, Plus, PencilSimple, Trash, X, Tag } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import * as categoriesApi from '../api/categories';
import * as animalPartsApi from '../api/animalParts';
import type { Category, CookingMethod, AnimalType } from '../api/categories';
import { COOKING_METHODS, COOKING_METHOD_LABELS, ANIMAL_TYPES, ANIMAL_TYPE_LABELS } from '../api/categories';
import { Card, Button, Badge, Input, Textarea, Combobox } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { Portal } from '../components/Portal';
import { ConfirmModal } from '../components/ConfirmModal';
import { PageSkeleton } from '../components/PageSkeleton';

interface FormState {
  name: string;
  color: string;
  description: string;
  cookingMethods: CookingMethod[];
  animalType: AnimalType | null;
  animalPart: string;
  parentId: number | null;
}

const EMPTY_FORM: FormState = {
  name: '',
  color: '#3B82F6',
  description: '',
  cookingMethods: [],
  animalType: null,
  animalPart: '',
  parentId: null,
};

const COLOR_PRESETS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#84CC16', '#A855F7', '#0EA5E9', '#64748B',
];

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setCategories(await categoriesApi.list(true));
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function startNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(c: Category) {
    setEditId(c.id);
    setForm({
      name: c.name,
      color: c.color,
      description: c.description || '',
      cookingMethods: c.cookingMethods || [],
      animalType: c.animalType ?? null,
      animalPart: c.animalPart || '',
      parentId: c.parentId,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        description: form.description || null,
        parentId: form.parentId,
      };
      if (editId) {
        await categoriesApi.update(editId, payload as any);
        toast.success('Categoría actualizada');
      } else {
        await categoriesApi.create(payload as any);
        toast.success('Categoría creada');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      await refresh();
    } catch (e: any) {
      const data = e?.response?.data;
      const detail = data?.details?.[0]?.message || data?.details?.[0]?.field;
      const msg = detail ? `${data.error}: ${detail}` : (data?.error || data?.message || e.message || 'Error');
      console.error('Save category error:', data || e);
      toast.error(msg, { duration: 6000 });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await categoriesApi.remove(confirmDelete);
      toast.success('Categoría desactivada');
      setConfirmDelete(null);
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error');
    }
  }

  function toggleMethod(m: CookingMethod) {
    setForm((f) => ({
      ...f,
      cookingMethods: f.cookingMethods.includes(m)
        ? f.cookingMethods.filter((x) => x !== m)
        : [...f.cookingMethods, m],
    }));
  }

  const parentOptions = useMemo(() => {
    return [
      { value: '', label: 'Ninguna (categoría raíz)' },
      ...categories
        .filter((c) => c.id !== editId)
        .map((c) => ({ value: String(c.id), label: c.name })),
    ];
  }, [categories, editId]);

  // Animal parts dinámicos desde API (defaults + custom DB)
  const [parts, setParts] = useState<animalPartsApi.AnimalPartItem[]>([]);
  const [newPartInput, setNewPartInput] = useState('');
  const [creatingPart, setCreatingPart] = useState(false);

  useEffect(() => {
    if (!form.animalType) {
      setParts([]);
      return;
    }
    animalPartsApi.list(form.animalType).then(setParts).catch(() => setParts([]));
  }, [form.animalType]);

  async function handleCreatePart() {
    if (!form.animalType || !newPartInput.trim()) return;
    setCreatingPart(true);
    try {
      const item = await animalPartsApi.create(form.animalType, newPartInput.trim());
      // Recargar lista
      const list = await animalPartsApi.list(form.animalType);
      setParts(list);
      setForm((f) => ({ ...f, animalPart: item.name }));
      setNewPartInput('');
      toast.success(`Corte "${item.name}" agregado`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al agregar corte');
    } finally {
      setCreatingPart(false);
    }
  }

  if (loading) return <PageSkeleton type="table" />;

  return (
    <div className="flex-1 overflow-auto styled-scroll p-4 md:p-6 space-y-4">
      <PageHeader
        icon={<Folder size={24} weight="duotone" />}
        title="Categorías"
        description="Agrupa tus productos por categorías con color identificador. Las categorías aparecen como filtros rápidos en el punto de venta y permiten organizar reportes. Configura métodos de cocción sugeridos para carnes y pescados."
        actions={
          <Button id="categories-new-btn" variant="primary" iconLeft={<Plus size={16} weight="bold" />} onClick={startNew}>
            Nueva categoría
          </Button>
        }
      />

      <div id="categories-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.length === 0 && (
          <Card padding="md" className="col-span-full text-center text-sm text-gray-400">
            Sin categorías. Crea la primera.
          </Card>
        )}
        {categories.map((c) => (
          <Card key={c.id} padding="md" className={`relative ${!c.active ? 'opacity-50' : ''}`}>
            <span
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
              style={{ backgroundColor: c.color }}
            />
            <div className="pl-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {c.name}
                    {c.parent && <Badge variant="gray" size="xs">⤴ {c.parent.name}</Badge>}
                    {!c.active && <Badge variant="gray" size="xs">Inactiva</Badge>}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {c._count?.products || 0} producto(s)
                    {c.children && c.children.length > 0 && ` · ${c.children.length} subcategoría(s)`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-blue-600">
                    <PencilSimple size={14} weight="duotone" />
                  </button>
                  {c.active && (
                    <button onClick={() => setConfirmDelete(c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-red-600">
                      <Trash size={14} weight="duotone" />
                    </button>
                  )}
                </div>
              </div>
              {c.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">{c.description}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder size={22} weight="duotone" className="text-white" />
                  <h3 className="text-white font-bold text-lg">{editId ? 'Editar categoría' : 'Nueva categoría'}</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
                  <X size={18} weight="bold" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 space-y-4">
                <Input
                  label="Nombre *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Carnes, Pescados, Bebidas..."
                />
                <Textarea
                  label="Descripción"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Información que verán en POS, ej: corte de la pulpa trasera, ideal para asados"
                />
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Color</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${form.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <Combobox
                  label="Subcategoría de (opcional)"
                  icon={<Folder size={14} weight="duotone" />}
                  placeholder="Selecciona categoría padre"
                  options={parentOptions}
                  value={form.parentId ? String(form.parentId) : ''}
                  onChange={(v) => setForm({ ...form, parentId: v ? Number(v) : null })}
                />

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Para configurar <strong>tipo de animal</strong>, <strong>corte</strong> y <strong>métodos de cocción</strong>, edita cada producto individual (Productos → Editar). Esa configuración es por producto, no por categoría.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave} loading={saving}>
                  {editId ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Desactivar categoría"
        message="La categoría dejará de aparecer en formularios nuevos. Productos existentes la conservan."
        variant="warning"
        confirmText="Desactivar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
