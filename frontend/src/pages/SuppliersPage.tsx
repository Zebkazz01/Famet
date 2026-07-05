import { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import { formatDateTime } from '../utils/formatters';
import toast from 'react-hot-toast';
import { Truck, Plus, PencilSimple, Prohibit, Eye, Phone, Envelope, MapPin, X, Check, Package, Funnel, SortAscending } from '@phosphor-icons/react';
import { StatsCards } from '../components/StatsCards';
import { PageSkeleton } from '../components/PageSkeleton';
import { ErrorView } from '../components/ErrorBoundary';
import { ViewToggle } from '../components/ViewToggle';
import { ConfirmModal } from '../components/ConfirmModal';
import { PageHeader } from '../components/layout/PageHeader';
import { Portal } from '../components/Portal';
import { FilterPanel, Combobox } from '../components/ui';
import { useTableFilters } from '../hooks/useTableFilters';

interface Supplier {
  id: number;
  name: string;
  nit: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { products: number };
}

const emptyForm = {
  name: '', nit: '', phone: '', email: '', address: '', city: '', notes: '',
};

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const { filters, setFilter, clear, activeCount } = useTableFilters<{ city: string; active: string; sort: string }>({
    city: '',
    active: '',
    sort: 'recent',
  });

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliers) if (s.city) set.add(s.city);
    return [{ value: '', label: 'Todas las ciudades' }, ...Array.from(set).sort().map((c) => ({ value: c, label: c }))];
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (filters.city && s.city !== filters.city) return false;
      if (filters.active === 'yes' && !s.active) return false;
      if (filters.active === 'no' && s.active) return false;
      return true;
    }).sort((a, b) => {
      const s = filters.sort || 'recent';
      if (s === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (s === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (s === 'az') return a.name.localeCompare(b.name);
      if (s === 'za') return b.name.localeCompare(a.name);
      return 0;
    });
  }, [suppliers, filters]);

  const load = () => {
    client.get('/suppliers?active=all').then((r) => setSuppliers(r.data)).catch((err) => setLoadError(err)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      nit: form.nit || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      notes: form.notes || null,
    };

    try {
      if (editId) {
        await client.put(`/suppliers/${editId}`, payload);
        toast.success('Proveedor actualizado');
      } else {
        await client.post('/suppliers', payload);
        toast.success('Proveedor creado');
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleEdit = (s: Supplier) => {
    setForm({
      name: s.name,
      nit: s.nit || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      city: s.city || '',
      notes: s.notes || '',
    });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    await client.delete(`/suppliers/${id}`);
    toast.success('Proveedor desactivado');
    setConfirmDelete(null);
    load();
  };

  if (loading) return <PageSkeleton type="table" />;
  if (loadError) return <ErrorView error={loadError} onRetry={() => window.location.reload()} />;

  return (
    <div className="p-3 md:p-6">
      <PageHeader
        icon={<Truck size={24} weight="duotone" />}
        title="Proveedores"
        description="Administra la red de proveedores del negocio con contacto, dirección, NIT/identificación y notas. Vincúlalos a productos y movimientos de inventario para trazabilidad de compras."
        actions={
          <button
            id="suppliers-new-btn"
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="inline-flex items-center gap-1.5 bg-red-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-xs md:text-sm"
          >
            <Plus size={16} weight="bold" /> Nuevo Proveedor
          </button>
        }
      />

      <StatsCards cards={[
        { label: 'Total proveedores', value: suppliers.length, icon: <Truck size={20} weight="duotone" />, color: 'bg-blue-100 text-blue-600' },
        { label: 'Activos', value: suppliers.filter(s => s.active).length, icon: <Check size={20} weight="bold" />, color: 'bg-green-100 text-green-600' },
        { label: 'Inactivos', value: suppliers.filter(s => !s.active).length, icon: <Prohibit size={20} weight="duotone" />, color: 'bg-gray-100 text-gray-500' },
        { label: 'Con productos', value: suppliers.filter(s => s._count.products > 0).length, icon: <Package size={20} weight="duotone" />, color: 'bg-purple-100 text-purple-600' },
      ]} />

      <div className="mb-4">
        <FilterPanel storageKey="suppliers"
          activeCount={activeCount}
          onClear={clear}
          chips={[
            ...(filters.city ? [{ key: 'c', label: filters.city, onRemove: () => setFilter('city', '') }] : []),
            ...(filters.active ? [{ key: 'a', label: filters.active === 'yes' ? 'Activos' : 'Inactivos', onRemove: () => setFilter('active', '') }] : []),
          ]}
        >
          <Combobox label="Ciudad" icon={<MapPin size={14} weight="duotone" />} placeholder="Selecciona ciudad" options={cityOptions} value={filters.city} onChange={(v) => setFilter('city', (v as string) || '')} />
          <Combobox
            label="Estado"
            icon={<Funnel size={14} weight="duotone" />}
            placeholder="Selecciona estado"
            options={[
              { value: '', label: 'Todos' },
              { value: 'yes', label: 'Activos' },
              { value: 'no', label: 'Inactivos' },
            ]}
            value={filters.active}
            onChange={(v) => setFilter('active', (v as string) || '')}
          />
          <Combobox
            label="Ordenar por"
            icon={<SortAscending size={14} weight="duotone" />}
            options={[
              { value: 'recent', label: 'Más reciente' },
              { value: 'oldest', label: 'Más antiguo' },
              { value: 'az', label: 'Nombre A-Z' },
              { value: 'za', label: 'Nombre Z-A' },
            ]}
            value={filters.sort}
            onChange={(v) => setFilter('sort', (v as string) || 'recent')}
            clearable={false}
          />
        </FilterPanel>
      </div>

      <div id="suppliers-list" className="bg-white rounded-xl shadow p-4">
        <ViewToggle storageKey="suppliers"
          data={filteredSuppliers}
          searchFilter={(s, q) => s.name.toLowerCase().includes(q) || (s.nit || '').includes(q) || (s.city || '').toLowerCase().includes(q)}
          searchPlaceholder="Buscar proveedor..."
          keyField="id"
          cardTitle={(s) => s.name}
          cardSubtitle={(s) => (
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
              {s.nit && <span>NIT: {s.nit}</span>}
              {s.city && <span>{s.city}</span>}
              <span>{s._count.products} productos</span>
            </div>
          )}
          cardBadge={(s) => (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-green-500' : 'bg-gray-400'}`} />
              {s.active ? 'Activo' : 'Inactivo'}
            </span>
          )}
          cardActions={(s) => (
            <>
              <button onClick={() => setDetail(s)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-medium">
                <Eye size={14} weight="duotone" /> Detalle
              </button>
              <button onClick={() => handleEdit(s)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                <PencilSimple size={14} weight="duotone" /> Editar
              </button>
              {s.active && (
                <button onClick={() => setConfirmDelete(s.id)} className="inline-flex items-center gap-1 text-red-500 hover:text-red-800 text-xs font-medium">
                  <Prohibit size={14} weight="duotone" /> Desactivar
                </button>
              )}
            </>
          )}
          columns={[
            { key: 'name', label: 'Nombre', render: (s) => <span className="font-medium">{s.name}</span>, cardHidden: true },
            { key: 'nit', label: 'NIT', render: (s) => s.nit || '-' },
            { key: 'phone', label: 'Teléfono', render: (s) => s.phone || '-' },
            { key: 'city', label: 'Ciudad', render: (s) => s.city || '-' },
            { key: 'products', label: 'Productos', render: (s) => s._count.products },
            { key: 'status', label: 'Estado', render: (s) => <span className={`w-2 h-2 inline-block rounded-full ${s.active ? 'bg-green-500' : 'bg-gray-400'}`} /> },
            { key: 'actions', label: 'Acciones', render: (s) => (
              <div className="flex gap-2">
                <button onClick={() => setDetail(s)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-medium">
                  <Eye size={14} weight="duotone" /> Detalle
                </button>
                <button onClick={() => handleEdit(s)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                  <PencilSimple size={14} weight="duotone" /> Editar
                </button>
                {s.active && (
                  <button onClick={() => setConfirmDelete(s.id)} className="inline-flex items-center gap-1 text-red-500 hover:text-red-800 text-xs font-medium">
                    <Prohibit size={14} weight="duotone" /> Desactivar
                  </button>
                )}
              </div>
            ), cardHidden: true },
          ]}
          emptyMessage="No hay proveedores registrados"
          onCreateNew={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          createNewLabel="Crear proveedor"
        />
      </div>

      {/* Modal formulario */}
      {showForm && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto relative">
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} weight="bold" />
            </button>
            <h3 className="text-lg font-bold mb-4">{editId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">NIT</label>
                  <input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="123456789-0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ciudad</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                  {editId ? 'Guardar Cambios' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>)}

      {/* Modal detalle */}
      {detail && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Truck size={22} weight="duotone" className="text-red-500" />
                <h3 className="font-bold text-lg">Detalle del proveedor</h3>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-auto">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Nombre</p>
                <p className="font-semibold">{detail.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">NIT</p>
                  <p className="font-medium text-sm">{detail.nit || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Ciudad</p>
                  <p className="font-medium text-sm">{detail.city || '-'}</p>
                </div>
              </div>
              {detail.phone && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <p className="font-medium text-sm">{detail.phone}</p>
                </div>
              )}
              {detail.email && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                  <Envelope size={16} className="text-gray-400" />
                  <p className="font-medium text-sm">{detail.email}</p>
                </div>
              )}
              {detail.address && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <p className="font-medium text-sm">{detail.address}</p>
                </div>
              )}
              {detail.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Notas</p>
                  <p className="text-sm">{detail.notes}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Productos asociados</p>
                <p className="font-bold text-lg">{detail._count.products}</p>
              </div>
              <div className="text-xs text-gray-400">
                Creado: {formatDateTime(detail.createdAt)}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button onClick={() => { setDetail(null); handleEdit(detail); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                <PencilSimple size={16} weight="duotone" /> Editar
              </button>
              <button onClick={() => setDetail(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 text-sm transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Desactivar proveedor"
        message="Este proveedor se marcará como inactivo. Los productos asociados no se verán afectados."
        variant="danger"
        confirmText="Desactivar"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
