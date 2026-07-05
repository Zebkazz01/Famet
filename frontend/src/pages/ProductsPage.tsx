import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { formatCurrency, formatDateTime, formatQty } from '../utils/formatters';
import { Calendar, Clock } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { Package, Plus, Scales, Cube, ArrowsLeftRight, PencilSimple, Prohibit, Eye, ImageSquare, ChartLineUp, Truck, X, Check, ArrowCounterClockwise, WarningCircle, Tag, Folder, SortAscending, Funnel } from '@phosphor-icons/react';
import { StatsCards } from '../components/StatsCards';
import { ViewToggle } from '../components/ViewToggle';
import { StockBadge } from '../utils/stockHelpers';
import { ConfirmModal } from '../components/ConfirmModal';
import { Portal } from '../components/Portal';
import { CurrencyInput } from '../components/CurrencyInput';
import { PageHeader } from '../components/layout/PageHeader';

interface Category {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  saleType: string;
  price: string;
  cost: string | null;
  stockQty: string;
  minStock: string;
  categoryId: number;
  active: boolean;
  weightUnit: string;
  imageUrl: string | null;
  unitsPerPack: number | null;
  subUnitName: string | null;
  subUnitPrice: string | null;
  supplierId: number | null;
  supplier: { id: number; name: string } | null;
  category: Category;
  createdAt: string;
  updatedAt: string;
  hasBatches?: boolean;
  batches?: Array<{ id: number; expiryDate: string; qty: string | number; batchCode: string | null }>;
  discountRules?: Array<{ id: number; type: string; config: any; priority?: number }>;
  animalType?: string | null;
  animalPart?: string | null;
  cookingMethods?: string[];
}

interface PriceHistoryEntry {
  id: number;
  price: string;
  cost: string | null;
  notes: string | null;
  createdAt: string;
}

const emptForm = {
  name: '',
  saleType: 'WEIGHT' as 'WEIGHT' | 'UNIT' | 'BOTH',
  price: '',
  cost: '',
  costMode: 'unit' as 'unit' | 'bulk',
  bulkCost: '',
  stockQty: '0',
  minStock: '0',
  categoryId: '',
  supplierId: '',
  sku: '',
  barcode: '',
  unitsPerPack: '',
  subUnitName: '',
  subUnitPrice: '',
  weightUnit: 'kg' as string,
  animalType: '' as '' | 'RES' | 'CERDO' | 'POLLO' | 'PESCADO' | 'CORDERO' | 'CABRA' | 'MARISCO' | 'OTRO',
  animalPart: '',
  cookingMethods: [] as string[],
};

import { PageSkeleton } from '../components/PageSkeleton';
import { BarcodeField } from '../components/BarcodeScanner';
import { ErrorView } from '../components/ErrorBoundary';
import { ExpiryBadge } from '../components/products/ExpiryBadge';
import { BatchManagerModal } from '../components/products/BatchManagerModal';
import { DiscountRulesEditor } from '../components/products/DiscountRulesEditor';
import { FilterPanel, Combobox } from '../components/ui';
import { useTableFilters } from '../hooks/useTableFilters';
import { getBestPromoLabel } from '../utils/discountHelpers';
import { Barcode as BarcodeIcon } from '@phosphor-icons/react';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [batchesFor, setBatchesFor] = useState<Product | null>(null);
  const [search] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  // const imageInputRef = useRef<HTMLInputElement>(null); // removed unused
  const formImageRef = useRef<HTMLInputElement>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<{ url: string; name: string } | null>(null);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);

  const load = () => {
    client.get('/products?active=all').then((r) => setProducts(r.data));
    client.get('/categories').then((r) => setCategories(r.data));
    client.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => {});
  };

  const [searchParams, setSearchParams] = useSearchParams();

  // Carga inicial de datos (sólo mount)
  useEffect(() => {
    client.get('/products?active=all').then((r) => setProducts(r.data));
    client.get('/categories').then((r) => setCategories(r.data));
    client.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => {});
    Promise.all([
      client.get('/products?active=all'),
      client.get('/categories'),
    ]).catch((err) => setLoadError(err)).finally(() => setLoading(false));
  }, []);

  // Deep-link handler: reacciona a cambios en searchParams o cuando products se carga.
  // Conserva el param hasta que el usuario cierre el modal/form correspondiente.
  useEffect(() => {
    if (products.length === 0) return;
    const editParam = searchParams.get('edit');
    if (editParam) {
      const p = products.find((prod: Product) => prod.id === Number(editParam));
      if (p) handleEdit(p);
      return;
    }
    const pid = searchParams.get('productId');
    if (pid) {
      const p = products.find((prod: Product) => prod.id === Number(pid));
      if (p) setDetailProduct(p);
      return;
    }
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      setEditId(null);
      setForm(emptForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, products]);

  // Cuando todos los modales/forms están cerrados, limpiar los deep-link params
  useEffect(() => {
    if (!detailProduct && !showForm) {
      const next = new URLSearchParams(searchParams);
      let changed = false;
      ['productId', 'edit', 'new'].forEach((k) => {
        if (next.has(k)) { next.delete(k); changed = true; }
      });
      if (changed) setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailProduct, showForm]);

  const wUnit = form.weightUnit === '@' ? 'arroba' : form.weightUnit || 'kg';
  const priceLabel = form.saleType === 'UNIT' ? 'Precio por unidad *' : `Precio por ${wUnit} *`;
  // costLabel reserved for future use
  void (form.saleType === 'UNIT' ? 'Costo por unidad' : `Costo por ${wUnit}`);

  const computedUnitCost = form.costMode === 'bulk' && form.bulkCost && parseFloat(form.stockQty) > 0
    ? (parseFloat(form.bulkCost) / parseFloat(form.stockQty)).toFixed(2)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validar código de barras único
    if (form.barcode) {
      const duplicate = products.find((p) => p.barcode === form.barcode && p.id !== editId);
      if (duplicate) {
        toast.error(`El codigo de barras ya esta asignado a "${duplicate.name}"`);
        return;
      }
    }
    if (form.sku) {
      const duplicate = products.find((p) => p.sku === form.sku && p.id !== editId);
      if (duplicate) {
        toast.error(`El SKU ya esta asignado a "${duplicate.name}"`);
        return;
      }
    }
    const payload: any = {
      name: form.name,
      saleType: form.saleType,
      weightUnit: form.saleType === 'UNIT' ? 'kg' : form.weightUnit,
      price: parseFloat(form.price),
      cost: form.costMode === 'unit' && form.cost ? parseFloat(form.cost) : null,
      bulkCost: form.costMode === 'bulk' && form.bulkCost ? parseFloat(form.bulkCost) : null,
      stockQty: parseFloat(form.stockQty),
      minStock: parseFloat(form.minStock),
      categoryId: parseInt(form.categoryId),
      supplierId: form.supplierId ? parseInt(form.supplierId) : null,
      sku: form.sku || null,
      barcode: form.barcode || null,
      animalType: form.animalType || null,
      animalPart: form.animalPart || null,
      cookingMethods: form.cookingMethods,
      unitsPerPack: form.unitsPerPack ? parseInt(form.unitsPerPack) : null,
      subUnitName: form.subUnitName || null,
      subUnitPrice: form.subUnitPrice ? parseFloat(form.subUnitPrice) : null,
    };

    try {
      let productId = editId;
      if (editId) {
        await client.put(`/products/${editId}`, payload);
        toast.success('Producto actualizado');
      } else {
        const { data } = await client.post('/products', payload);
        productId = data.id;
        toast.success('Producto creado');
      }
      // Subir imagen si se seleccionó una nueva
      if (formImageFile && productId) {
        await handleUploadImage(productId, formImageFile);
      }
      setShowForm(false);
      setForm(emptForm);
      setEditId(null);
      setFormImagePreview(null);
      setFormImageFile(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleEdit = (p: Product) => {
    setForm({
      name: p.name,
      saleType: p.saleType as any,
      price: p.price,
      cost: p.cost || '',
      costMode: 'unit',
      bulkCost: '',
      stockQty: p.stockQty,
      minStock: p.minStock,
      categoryId: String(p.categoryId),
      supplierId: p.supplierId ? String(p.supplierId) : '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      unitsPerPack: p.unitsPerPack ? String(p.unitsPerPack) : '',
      weightUnit: p.weightUnit || 'kg',
      subUnitName: p.subUnitName || '',
      subUnitPrice: p.subUnitPrice || '',
      animalType: ((p as any).animalType || '') as any,
      animalPart: (p as any).animalPart || '',
      cookingMethods: (p as any).cookingMethods || [],
    });
    setEditId(p.id);
    setFormImagePreview(p.imageUrl || null);
    setFormImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    await client.delete(`/products/${id}`);
    toast.success('Producto desactivado');
    setConfirmDelete(null);
    load();
  };

  const handleReactivate = async (id: number) => {
    await client.put(`/products/${id}`, { active: true });
    toast.success('Producto reactivado');
    load();
  };

  const handleUploadImage = async (productId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      await client.post(`/products/${productId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Imagen actualizada');
      load();
    } catch {
      toast.error('Error al subir imagen');
    }
  };

  const loadPriceHistory = async (productId: number) => {
    try {
      const { data } = await client.get(`/products/${productId}/price-history`);
      setPriceHistory(data);
      setShowHistory(true);
    } catch {
      toast.error('Error al cargar historial');
    }
  };

  const { filters: pFilters, setFilter: setPFilter, clear: clearPFilters, activeCount: pActiveCount } = useTableFilters<{
    categoryId: string; supplierId: string; saleType: string; status: string; sort: string;
  }>({ categoryId: '', supplierId: '', saleType: '', status: '', sort: 'recent' });

  const filtered = products.filter((p) => {
    if (!p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (pFilters.categoryId && String(p.categoryId) !== pFilters.categoryId) return false;
    if (pFilters.supplierId && String(p.supplierId || '') !== pFilters.supplierId) return false;
    if (pFilters.saleType && p.saleType !== pFilters.saleType) return false;
    if (pFilters.status === 'active' && !p.active) return false;
    if (pFilters.status === 'inactive' && p.active) return false;
    if (pFilters.status === 'low' && parseFloat(p.stockQty) > parseFloat(p.minStock)) return false;
    if (pFilters.status === 'empty' && parseFloat(p.stockQty) > 0) return false;
    return true;
  }).sort((a, b) => {
    const s = pFilters.sort || 'recent';
    if (s === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (s === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (s === 'az') return a.name.localeCompare(b.name);
    if (s === 'za') return b.name.localeCompare(a.name);
    if (s === 'priceDesc') return parseFloat(b.price) - parseFloat(a.price);
    if (s === 'priceAsc') return parseFloat(a.price) - parseFloat(b.price);
    if (s === 'stockDesc') return parseFloat(b.stockQty) - parseFloat(a.stockQty);
    if (s === 'stockAsc') return parseFloat(a.stockQty) - parseFloat(b.stockQty);
    return 0;
  });

  const unitSuffix = (p: { saleType: string; weightUnit?: string }) => {
    if (p.saleType === 'UNIT') return '/ud';
    const wu = (p as any).weightUnit || 'kg';
    return `/${wu === '@' ? '@' : wu}`;
  };

  if (loading) return <PageSkeleton type="table" />;
  if (loadError) return <ErrorView error={loadError} onRetry={() => window.location.reload()} />;

  return (
    <div className="p-3 md:p-6">
      <PageHeader
        icon={<Package size={24} weight="duotone" />}
        title="Productos"
        description="Catálogo del negocio. Crea, edita o desactiva productos con precio, tipo de venta (peso/unidad/sub-unidad), categoría, animal y corte. Adjunta imagen, código de barras, costo y stock inicial."
        actions={
          <button
            id="products-new-btn"
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptForm); setFormImagePreview(null); setFormImageFile(null); }}
            className="inline-flex items-center gap-1.5 bg-red-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-xs md:text-sm"
          >
            <Plus size={16} weight="bold" /> Nuevo Producto
          </button>
        }
      />

      <StatsCards cards={[
        { label: 'Total productos', value: products.length, icon: <Package size={20} weight="duotone" />, color: 'bg-blue-100 text-blue-600' },
        { label: 'Activos', value: products.filter(p => p.active).length, icon: <Check size={20} weight="bold" />, color: 'bg-green-100 text-green-600' },
        { label: 'Inactivos', value: products.filter(p => !p.active).length, icon: <Prohibit size={20} weight="duotone" />, color: 'bg-gray-100 text-gray-500' },
        { label: 'Stock bajo', value: products.filter(p => p.active && parseFloat(p.stockQty) <= parseFloat(p.minStock)).length, icon: <WarningCircle size={20} weight="duotone" />, color: 'bg-red-100 text-red-500' },
      ]} />

      <div className="mb-4">
        <FilterPanel storageKey="products"
          activeCount={pActiveCount}
          onClear={clearPFilters}
          chips={[
            ...(pFilters.categoryId ? [{ key: 'cat', label: `Cat: ${categories.find((c) => String(c.id) === pFilters.categoryId)?.name}`, onRemove: () => setPFilter('categoryId', '') }] : []),
            ...(pFilters.supplierId ? [{ key: 'sup', label: `Prov: ${suppliers.find((s) => String(s.id) === pFilters.supplierId)?.name}`, onRemove: () => setPFilter('supplierId', '') }] : []),
            ...(pFilters.saleType ? [{ key: 'st', label: pFilters.saleType, onRemove: () => setPFilter('saleType', '') }] : []),
            ...(pFilters.status ? [{ key: 's', label: pFilters.status, onRemove: () => setPFilter('status', '') }] : []),
          ]}
        >
          <Combobox label="Categoría" icon={<Folder size={14} weight="duotone" />} placeholder="Selecciona categoría"
            options={[{ value: '', label: 'Todas' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
            value={pFilters.categoryId} onChange={(v) => setPFilter('categoryId', (v as string) || '')} />
          <Combobox label="Proveedor" icon={<Truck size={14} weight="duotone" />} placeholder="Selecciona proveedor"
            options={[{ value: '', label: 'Todos' }, ...suppliers.map((s) => ({ value: String(s.id), label: s.name }))]}
            value={pFilters.supplierId} onChange={(v) => setPFilter('supplierId', (v as string) || '')} />
          <Combobox label="Tipo venta" icon={<Scales size={14} weight="duotone" />} placeholder="Selecciona tipo" options={[
            { value: '', label: 'Todos' }, { value: 'WEIGHT', label: 'Por peso' }, { value: 'UNIT', label: 'Por unidad' }, { value: 'BOTH', label: 'Ambos' },
          ]} value={pFilters.saleType} onChange={(v) => setPFilter('saleType', (v as string) || '')} />
          <Combobox label="Estado" icon={<Funnel size={14} weight="duotone" />} placeholder="Selecciona estado" options={[
            { value: '', label: 'Todos' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' },
            { value: 'low', label: 'Stock bajo' }, { value: 'empty', label: 'Agotados' },
          ]} value={pFilters.status} onChange={(v) => setPFilter('status', (v as string) || '')} />
          <Combobox label="Ordenar por" icon={<SortAscending size={14} weight="duotone" />} options={[
            { value: 'recent', label: 'Más reciente' }, { value: 'oldest', label: 'Más antiguo' },
            { value: 'az', label: 'Nombre A-Z' }, { value: 'za', label: 'Nombre Z-A' },
            { value: 'priceDesc', label: 'Precio mayor a menor' }, { value: 'priceAsc', label: 'Precio menor a mayor' },
            { value: 'stockDesc', label: 'Más stock' }, { value: 'stockAsc', label: 'Menos stock' },
          ]} value={(pFilters as any).sort || 'recent'} onChange={(v) => setPFilter('sort' as any, v as any)} clearable={false} />
        </FilterPanel>
      </div>

      <div id="products-list" className="bg-white rounded-xl shadow p-4">
        <ViewToggle storageKey="products"
          data={filtered}
          searchFilter={(p, q) => p.name.toLowerCase().includes(q) || (p.category?.name || '').toLowerCase().includes(q)}
          searchPlaceholder="Buscar producto..."
          keyField="id"
          cardImage={(p) => p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setViewImage({ url: p.imageUrl!, name: p.name }); }} />
          ) : (
            <Package size={28} className="text-gray-300" />
          )}
          cardTitle={(p) => p.name}
          cardSubtitle={(p) => (
            <div className="flex flex-col gap-1.5 mt-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-400">{p.category?.name}</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs ${
                  p.saleType === 'WEIGHT' ? 'bg-blue-100 text-blue-700' :
                  p.saleType === 'UNIT' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {p.saleType === 'WEIGHT' ? <><Scales size={12} weight="duotone" /> Por peso</> :
                   p.saleType === 'UNIT' ? <><Cube size={12} weight="duotone" /> Por unidad</> :
                   <><ArrowsLeftRight size={12} weight="duotone" /> Peso/Unidad</>}
                </span>
                {p.unitsPerPack && (
                  <span className="px-1.5 py-0.5 rounded-lg text-xs bg-amber-100 text-amber-700">
                    {p.unitsPerPack} {p.subUnitName || 'sub'}
                  </span>
                )}
              </div>
              {/* Badges secundarios: stock + vencimiento + promo + barcode */}
              {(() => {
                const promo = getBestPromoLabel(p.discountRules);
                const hasStock = parseFloat(p.stockQty) <= parseFloat(p.minStock);
                const hasExpiry = p.batches && p.batches[0];
                const hasBarcode = !!p.barcode;
                if (!hasStock && !hasExpiry && !promo && !hasBarcode) return null;
                return (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasStock && <StockBadge stock={parseFloat(p.stockQty)} saleType={p.saleType} />}
                    {hasExpiry && <ExpiryBadge date={p.batches![0].expiryDate} size="xs" />}
                    {promo && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" title="Promoción activa">
                        <Tag size={10} weight="bold" /> {promo}
                      </span>
                    )}
                    {hasBarcode && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300" title={`Código: ${p.barcode}`}>
                        <BarcodeIcon size={11} weight="bold" />
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          cardBadge={(p) => (
            <div className="text-right">
              <div className="text-red-500 font-bold text-sm whitespace-nowrap">{formatCurrency(p.price)}<span className="text-xs font-normal text-gray-400">{unitSuffix(p)}</span></div>
              {p.subUnitPrice && <div className="text-xs text-amber-600 whitespace-nowrap">{formatCurrency(p.subUnitPrice)}/{p.subUnitName || 'sub'}</div>}
            </div>
          )}
          cardActions={(p) => (
            <>
              <button onClick={() => setDetailProduct(p)}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-medium">
                <Eye size={14} weight="duotone" /> Detalle
              </button>
              <button onClick={() => handleEdit(p)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                <PencilSimple size={14} weight="duotone" /> Editar
              </button>
              {p.active ? (
                <button onClick={() => setConfirmDelete(p.id)} className="inline-flex items-center gap-1 text-red-500 hover:text-red-800 text-xs font-medium">
                  <Prohibit size={14} weight="duotone" /> Desactivar
                </button>
              ) : (
                <button onClick={() => handleReactivate(p.id)} className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium">
                  <ArrowCounterClockwise size={14} weight="duotone" /> Reactivar
                </button>
              )}
            </>
          )}
          columns={[
            { key: 'name', label: 'Nombre', render: (p) => (
              <div className="flex items-center gap-2">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:opacity-80"
                    onClick={(e) => { e.stopPropagation(); setViewImage({ url: p.imageUrl!, name: p.name }); }} />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package size={14} className="text-gray-400" />
                  </div>
                )}
                <span className="font-medium">{p.name}</span>
              </div>
            ), cardHidden: true },
            { key: 'category', label: 'Categoria', render: (p) => p.category?.name, cardHidden: true },
            { key: 'type', label: 'Tipo', render: (p) => (
              <span className={`px-2 py-0.5 rounded-lg text-xs ${
                p.saleType === 'WEIGHT' ? 'bg-blue-100 text-blue-700' :
                p.saleType === 'UNIT' ? 'bg-green-100 text-green-700' :
                'bg-purple-100 text-purple-700'
              }`}>{p.saleType === 'WEIGHT' ? 'Peso' : p.saleType === 'UNIT' ? 'Unidad' : 'Ambos'}</span>
            ), cardHidden: true },
            { key: 'price', label: 'Precio', render: (p) => <span className="whitespace-nowrap">{formatCurrency(p.price)}<span className="text-xs text-gray-400">{unitSuffix(p)}</span></span>, cardHidden: true },
            { key: 'stock', label: 'Stock', render: (p) => (
              <div className="flex items-center gap-1.5 flex-wrap min-w-[140px]">
                <span className="font-medium whitespace-nowrap">{formatQty(p.stockQty)}</span>
                <StockBadge stock={parseFloat(p.stockQty)} saleType={p.saleType} />
                {p.batches && p.batches[0] && <ExpiryBadge date={p.batches[0].expiryDate} size="xs" />}
              </div>
            ), cardHidden: true },
            { key: 'tags', label: 'Etiquetas', render: (p) => {
              const promo = getBestPromoLabel(p.discountRules);
              const hasBarcode = !!p.barcode;
              if (!promo && !hasBarcode) return <span className="text-gray-300">—</span>;
              return (
                <div className="flex items-center gap-1.5 flex-wrap min-w-[100px]">
                  {promo && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 whitespace-nowrap" title="Promo activa">
                      <Tag size={10} weight="bold" /> {promo}
                    </span>
                  )}
                  {hasBarcode && (
                    <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300" title={`Código: ${p.barcode}`}>
                      <BarcodeIcon size={11} weight="bold" />
                    </span>
                  )}
                </div>
              );
            }, cardHidden: true },
            { key: 'supplier', label: 'Proveedor', render: (p) => <span className="whitespace-nowrap text-xs">{p.supplier?.name || '-'}</span>, cardHidden: true },
            { key: 'status', label: 'Estado', render: (p) => <span className={`w-2 h-2 inline-block rounded-full ${p.active ? 'bg-green-500' : 'bg-gray-400'}`} />, cardHidden: true },
            { key: 'actions', label: 'Acciones', render: (p) => (
              <div className="flex gap-2">
                <button onClick={() => setDetailProduct(p)}
                  className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-medium">
                  <Eye size={14} weight="duotone" /> Detalle
                </button>
                <button onClick={() => handleEdit(p)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                  <PencilSimple size={14} weight="duotone" /> Editar
                </button>
                {p.active ? (
                  <button onClick={() => setConfirmDelete(p.id)} className="inline-flex items-center gap-1 text-red-500 hover:text-red-800 text-xs font-medium">
                    <Prohibit size={14} weight="duotone" /> Desactivar
                  </button>
                ) : (
                  <button onClick={() => handleReactivate(p.id)} className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium">
                    <ArrowCounterClockwise size={14} weight="duotone" /> Reactivar
                  </button>
                )}
              </div>
            ), cardHidden: true },
          ]}
          emptyMessage="No hay productos"
          onCreateNew={() => { setShowForm(true); setEditId(null); setForm(emptForm); setFormImagePreview(null); setFormImageFile(null); }}
          createNewLabel="Crear producto"
        />
      </div>

      {/* Modal formulario */}
      {showForm && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package size={24} weight="duotone" className="text-white" />
                <h3 className="text-white font-bold text-lg">{editId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              </div>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors">
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
              <div className="p-6">
                {/* Imagen del producto (full width arriba) */}
                <div className="flex items-center gap-4 mb-4">
                  <div
                    onClick={() => formImageRef.current?.click()}
                    className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300 flex-shrink-0"
                  >
                    {formImagePreview ? (
                      <img src={formImagePreview} alt="Producto" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <ImageSquare size={24} className="text-gray-400 mx-auto" />
                        <p className="text-[9px] text-gray-400 mt-0.5">Agregar foto</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={formImageRef} accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormImageFile(file);
                        setFormImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <div className="flex-1 text-xs text-gray-400">
                    {formImagePreview ? (
                      <button type="button" onClick={() => { setFormImagePreview(null); setFormImageFile(null); }}
                        className="text-red-500 hover:text-red-700 text-xs">Quitar imagen</button>
                    ) : (
                      <p>Toca para agregar una foto del producto</p>
                    )}
                  </div>
                </div>

                {/* Secciones en 2 columnas en pantallas grandes */}
                <div className="grid lg:grid-cols-2 gap-x-6 gap-y-4">

                {/* Seccion: Info basica */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informacion basica</p>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nombre del producto *" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                      <option value="">Categoria *</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={form.saleType} onChange={(e) => setForm({ ...form, saleType: e.target.value as any })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                      <option value="WEIGHT">Por peso</option>
                      <option value="UNIT">Por unidad</option>
                      <option value="BOTH">Ambos</option>
                    </select>
                  </div>
                </div>
                {(form.saleType === 'WEIGHT' || form.saleType === 'BOTH') && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unidad de peso</label>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setForm((f) => ({ ...f, weightUnit: 'kg' }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.weightUnit === 'kg' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        KG
                      </button>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, weightUnit: 'lb' }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.weightUnit === 'lb' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        LB
                      </button>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, weightUnit: '@' }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.weightUnit === '@' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        Arroba (@)
                      </button>
                    </div>
                  </div>
                )}

                {/* Seccion: Precio y costo */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Precio y costo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{priceLabel}</label>
                      <CurrencyInput value={form.price} onChange={(v) => setForm({ ...form, price: v })} required className="w-full pr-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-xs text-gray-500">Costo</label>
                        <div className="flex bg-gray-100 rounded-lg p-0.5 text-[10px]">
                          <button type="button" onClick={() => setForm({ ...form, costMode: 'unit' })}
                            className={`px-1.5 py-0.5 rounded-lg ${form.costMode === 'unit' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500'}`}>
                            {form.saleType === 'UNIT' ? 'Und' : form.weightUnit === '@' ? 'Arroba' : form.weightUnit === 'lb' ? 'Lb' : 'Kg'}
                          </button>
                          <button type="button" onClick={() => setForm({ ...form, costMode: 'bulk' })}
                            className={`px-1.5 py-0.5 rounded-lg ${form.costMode === 'bulk' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500'}`}>
                            Lote
                          </button>
                        </div>
                      </div>
                      {form.costMode === 'unit' ? (
                        <CurrencyInput value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} placeholder="0" className="w-full pr-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                      ) : (
                        <CurrencyInput value={form.bulkCost} onChange={(v) => setForm({ ...form, bulkCost: v })} placeholder="Total lote" className="w-full pr-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                      )}
                      {form.costMode === 'bulk' && computedUnitCost && (
                        <p className="text-[10px] text-green-600 mt-0.5">
                          = {formatCurrency(computedUnitCost)} {form.saleType === 'UNIT' ? '/ud' : `/${form.weightUnit === '@' ? '@' : form.weightUnit}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seccion: Stock */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inventario</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Stock actual ({form.saleType === 'UNIT' ? 'uds' : form.weightUnit === '@' ? '@' : form.weightUnit})</label>
                      <input type="number" step={form.saleType === 'UNIT' ? '1' : '0.001'} min="0" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Stock minimo ({form.saleType === 'UNIT' ? 'uds' : form.weightUnit === '@' ? '@' : form.weightUnit})</label>
                      <input type="number" step={form.saleType === 'UNIT' ? '1' : '0.001'} min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Proveedor</label>
                      <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                        <option value="">Ninguno</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Equivalencias de peso */}
                  {(form.saleType === 'WEIGHT' || form.saleType === 'BOTH') && parseFloat(form.stockQty) > 0 && (() => {
                    const qty = parseFloat(form.stockQty);
                    const wu = form.weightUnit;
                    const toKg = wu === 'kg' ? qty : wu === 'lb' ? qty * 0.453592 : wu === '@' ? qty * 12.5 : qty;
                    const toLb = toKg * 2.20462;
                    const toArroba = toKg / 12.5;
                    return (
                      <div className="flex gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-1 rounded-lg ${wu === 'kg' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                          {formatQty(toKg)} kg
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-lg ${wu === 'lb' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                          {formatQty(toLb)} lb
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-lg ${wu === '@' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                          {formatQty(toArroba)} @
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Seccion: Sub-unidades */}
                {(form.saleType === 'UNIT' || form.saleType === 'BOTH') && (
                  <div className="border border-amber-200 rounded-xl p-4 bg-amber-50 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Venta por sub-unidad</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">Ej: Cubeta de 30 huevos → vender por huevo</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-amber-700 mb-1">Uds/paquete</label>
                        <input type="number" value={form.unitsPerPack} onChange={(e) => setForm({ ...form, unitsPerPack: e.target.value })} placeholder="30" className="w-full px-2 py-2 border border-amber-200 rounded-lg text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-amber-700 mb-1">Nombre</label>
                        <input value={form.subUnitName} onChange={(e) => setForm({ ...form, subUnitName: e.target.value })} placeholder="huevo" className="w-full px-2 py-2 border border-amber-200 rounded-lg text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-amber-700 mb-1">Precio</label>
                        <CurrencyInput value={form.subUnitPrice} onChange={(v) => setForm({ ...form, subUnitPrice: v })} placeholder="500" className="w-full pr-2 py-2 border border-amber-200 rounded-lg text-sm bg-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Seccion: Identificacion */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identificacion</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SKU (codigo interno)</label>
                    <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ej: CRN-001" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Codigo de barras</label>
                    <BarcodeField value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm w-full" />
                  </div>
                </div>

                {/* Carne/pescado (opcional) */}
                <MeatSection form={form} setForm={setForm} />

                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium transition-colors">
                  <X size={16} weight="bold" /> Cancelar
                </button>
                <button type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors">
                  <Check size={16} weight="bold" /> {editId ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>)}

      {/* Modal detalle producto */}
      {detailProduct && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setDetailProduct(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header con imagen */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                {detailProduct.imageUrl ? (
                  <img src={detailProduct.imageUrl} alt={detailProduct.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Package size={24} className="text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{detailProduct.name}</h3>
                  <p className="text-xs text-gray-500">{detailProduct.category?.name}</p>
                </div>
              </div>
              <button onClick={() => setDetailProduct(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Tipo de venta</p>
                  <p className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-medium ${
                    detailProduct.saleType === 'WEIGHT' ? 'bg-blue-100 text-blue-700' :
                    detailProduct.saleType === 'UNIT' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {detailProduct.saleType === 'WEIGHT' ? <><Scales size={12} weight="duotone" /> Por peso</> :
                     detailProduct.saleType === 'UNIT' ? <><Cube size={12} weight="duotone" /> Por unidad</> :
                     <><ArrowsLeftRight size={12} weight="duotone" /> Peso/Unidad</>}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Precio</p>
                  <p className="font-bold text-red-500">{formatCurrency(detailProduct.price)}<span className="text-xs font-normal text-gray-400">{unitSuffix(detailProduct)}</span></p>
                </div>
              </div>

              {detailProduct.unitsPerPack && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-xs text-amber-600 mb-0.5">Sub-unidad</p>
                  <p className="font-medium text-sm">{detailProduct.unitsPerPack} {detailProduct.subUnitName || 'uds'} por paquete</p>
                  {detailProduct.subUnitPrice && <p className="text-amber-700 font-bold">{formatCurrency(detailProduct.subUnitPrice)}/{detailProduct.subUnitName || 'sub'}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Costo</p>
                  <p className="font-medium text-sm">{detailProduct.cost ? <>{formatCurrency(detailProduct.cost)}<span className="text-xs text-gray-400">{unitSuffix(detailProduct)}</span></> : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Margen</p>
                  <p className="font-medium text-sm">
                    {detailProduct.cost
                      ? `${((1 - parseFloat(detailProduct.cost) / parseFloat(detailProduct.price)) * 100).toFixed(1)}%`
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Stock actual ({detailProduct.saleType === 'UNIT' ? 'uds' : detailProduct.weightUnit === '@' ? '@' : detailProduct.weightUnit || 'kg'})</p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm">{formatQty(detailProduct.stockQty)}</span>
                    <StockBadge stock={parseFloat(detailProduct.stockQty)} saleType={detailProduct.saleType} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Stock minimo ({detailProduct.saleType === 'UNIT' ? 'uds' : detailProduct.weightUnit === '@' ? '@' : detailProduct.weightUnit || 'kg'})</p>
                  <p className="font-medium text-sm">{formatQty(detailProduct.minStock)}</p>
                </div>
              </div>

              {detailProduct.supplier && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                  <Truck size={16} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Proveedor</p>
                    <p className="font-medium text-sm">{detailProduct.supplier.name}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">SKU</p>
                  <p className="font-mono text-sm">{detailProduct.sku || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Codigo de barras</p>
                  <p className="font-mono text-sm">{detailProduct.barcode || '-'}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Estado</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${detailProduct.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${detailProduct.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {detailProduct.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="border-t pt-3 mt-3">
                <DiscountRulesEditor productId={detailProduct.id} productPrice={detailProduct.price} />
              </div>

              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar size={14} weight="duotone" />
                  <span>Creado: {formatDateTime(detailProduct.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={14} weight="duotone" />
                  <span>Ultima edicion: {formatDateTime(detailProduct.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="p-4 border-t bg-gray-50 flex gap-2 flex-wrap">
              <button onClick={() => loadPriceHistory(detailProduct.id)}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 text-sm transition-colors">
                <ChartLineUp size={16} weight="duotone" /> Historial
              </button>
              <button onClick={() => { setBatchesFor(detailProduct); }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-amber-200 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 text-sm transition-colors">
                <Calendar size={16} weight="duotone" /> Lotes / Vencimiento
              </button>
              <button
                onClick={() => { setDetailProduct(null); handleEdit(detailProduct); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                <PencilSimple size={16} weight="duotone" /> Editar
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal historial de precios */}
      {showHistory && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ChartLineUp size={22} weight="duotone" className="text-red-500" />
                Historial de precios
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} weight="bold" />
              </button>
            </div>
            {/* Leyenda */}
            <div className="px-4 pt-3 flex flex-wrap gap-3 text-[10px]">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Actual</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Inicial</span>
              <span className="inline-flex items-center gap-1 text-red-500">▲ Subio</span>
              <span className="inline-flex items-center gap-1 text-green-600">▼ Bajo</span>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto">
              {priceHistory.length === 0 ? (
                <p className="text-gray-400 text-center py-6">Sin historial de precios</p>
              ) : (
                <div className="space-y-2">
                  {priceHistory.map((h, i) => {
                    const isInitial = i === priceHistory.length - 1;
                    // El siguiente en la lista es el registro anterior en el tiempo (orden desc)
                    const prev = priceHistory[i + 1];
                    const priceDiff = prev ? parseFloat(h.price) - parseFloat(prev.price) : 0;
                    const costDiff = prev && h.cost && prev.cost ? parseFloat(h.cost) - parseFloat(prev.cost) : 0;
                    const priceUp = priceDiff > 0;
                    const costUp = costDiff > 0;
                    void priceDiff; void costDiff; void priceUp; void costUp;

                    return (
                      <div key={h.id} className={`p-3 rounded-lg ${i === 0 ? 'bg-gray-50 border-2 border-red-200' : isInitial ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            {/* Precio */}
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{formatCurrency(h.price)}</span>
                              {prev && priceDiff !== 0 && (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${
                                  priceUp ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {priceUp ? '▲' : '▼'} {formatCurrency(Math.abs(priceDiff))}
                                </span>
                              )}
                            </div>
                            {/* Costo */}
                            {h.cost && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Costo: {formatCurrency(h.cost)}</span>
                                {prev && costDiff !== 0 && (
                                  <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-lg text-[9px] font-bold ${
                                    costUp ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {costUp ? '▲' : '▼'} {formatCurrency(Math.abs(costDiff))}
                                  </span>
                                )}
                              </div>
                            )}
                            {h.notes && <p className="text-[10px] text-gray-400">{h.notes}</p>}
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-[10px] text-gray-400">{formatDateTime(h.createdAt)}</p>
                            {i === 0 && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-lg font-bold mt-1 inline-block">ACTUAL</span>}
                            {isInitial && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-lg font-bold mt-1 inline-block">INICIAL</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal ver imagen completa */}
      {viewImage && (<Portal>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4"
          onClick={() => setViewImage(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 z-10">
              <span className="text-lg leading-none">&times;</span>
            </button>
            <img src={viewImage.url} alt={viewImage.name}
              className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]" />
            <p className="text-white text-center text-sm mt-3 font-medium">{viewImage.name}</p>
          </div>
        </div>
      </Portal>)}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Desactivar producto"
        message="Este producto se marcara como inactivo y no aparecera en el punto de venta."
        variant="danger"
        confirmText="Desactivar"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {batchesFor && (
        <BatchManagerModal
          open={!!batchesFor}
          productId={batchesFor.id}
          productName={batchesFor.name}
          onClose={() => setBatchesFor(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}

// === Sección carne/pescado (opcional por producto) ===
import * as animalPartsApi from '../api/animalParts';
import type { AnimalType, CookingMethod } from '../api/categories';
import { ANIMAL_TYPES, ANIMAL_TYPE_LABELS, COOKING_METHODS, COOKING_METHOD_LABELS } from '../api/categories';
import { Combobox as UICombobox, Input as UIInput, Button as UIButton } from '../components/ui';

function MeatSection({ form, setForm }: { form: any; setForm: any }) {
  const [parts, setParts] = useState<animalPartsApi.AnimalPartItem[]>([]);
  const [newPart, setNewPart] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!form.animalType) { setParts([]); return; }
    animalPartsApi.list(form.animalType).then(setParts).catch(() => setParts([]));
  }, [form.animalType]);

  async function addPart() {
    if (!form.animalType || !newPart.trim()) return;
    setCreating(true);
    try {
      const item = await animalPartsApi.create(form.animalType, newPart.trim());
      const list = await animalPartsApi.list(form.animalType);
      setParts(list);
      setForm({ ...form, animalPart: item.name });
      setNewPart('');
      toast.success(`Corte "${item.name}" agregado`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error');
    } finally {
      setCreating(false);
    }
  }

  function toggleMethod(m: CookingMethod) {
    const has = form.cookingMethods?.includes(m);
    const next = has
      ? form.cookingMethods.filter((x: string) => x !== m)
      : [...(form.cookingMethods || []), m];
    setForm({ ...form, cookingMethods: next });
  }

  return (
    <div className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 bg-amber-50/50 dark:bg-amber-900/10 space-y-3">
      <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
        Si es carne / pescado (opcional)
      </p>
      <UICombobox
        label="Tipo de animal"
        placeholder="No aplica / Selecciona animal"
        options={[
          { value: '', label: '— No aplica —' },
          ...ANIMAL_TYPES.map((a) => ({ value: a, label: ANIMAL_TYPE_LABELS[a] })),
        ]}
        value={form.animalType || ''}
        onChange={(v) => setForm({ ...form, animalType: (v as AnimalType) || '', animalPart: v ? form.animalPart : '' })}
      />
      {form.animalType && (
        <>
          <UICombobox
            label="Parte / corte"
            placeholder="Selecciona o busca un corte"
            options={[
              { value: '', label: '— Sin corte específico —' },
              ...parts.map((p) => ({ value: p.name, label: p.name, hint: p.custom ? 'personalizado' : undefined })),
            ]}
            value={form.animalPart}
            onChange={(v) => setForm({ ...form, animalPart: (v as string) || '' })}
          />
          <div className="flex gap-2 items-end">
            <UIInput
              label="¿No está en la lista? Agregar nuevo corte"
              value={newPart}
              onChange={(e) => setNewPart(e.target.value)}
              placeholder="Ej: Asado de tira, Solomito mariposa..."
              wrapperClassName="flex-1"
            />
            <UIButton size="md" variant="primary" iconLeft={<Plus size={14} weight="bold" />}
              onClick={addPart} loading={creating} disabled={!newPart.trim()}>
              Agregar
            </UIButton>
          </div>
          <p className="text-[10px] text-gray-500">
            {parts.length} cortes disponibles para {ANIMAL_TYPE_LABELS[form.animalType as AnimalType]} ({parts.filter((p) => p.custom).length} personalizados).
          </p>
        </>
      )}
      <div>
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
          Métodos de cocción
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COOKING_METHODS.map((m) => {
            const selected = form.cookingMethods?.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMethod(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  selected
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-amber-100'
                }`}
              >
                {COOKING_METHOD_LABELS[m]}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Se mostrarán en el POS al lado del producto.
        </p>
      </div>
    </div>
  );
}
