import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

interface Category {
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
  category: Category;
}

const emptForm = {
  name: '',
  saleType: 'WEIGHT' as 'WEIGHT' | 'UNIT' | 'BOTH',
  price: '',
  cost: '',
  stockQty: '0',
  minStock: '0',
  categoryId: '',
  sku: '',
  barcode: '',
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    client.get('/products?active=all').then((r) => setProducts(r.data));
    client.get('/categories').then((r) => setCategories(r.data));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      cost: form.cost ? parseFloat(form.cost) : null,
      stockQty: parseFloat(form.stockQty),
      minStock: parseFloat(form.minStock),
      categoryId: parseInt(form.categoryId),
      sku: form.sku || null,
      barcode: form.barcode || null,
    };

    try {
      if (editId) {
        await client.put(`/products/${editId}`, payload);
        toast.success('Producto actualizado');
      } else {
        await client.post('/products', payload);
        toast.success('Producto creado');
      }
      setShowForm(false);
      setForm(emptForm);
      setEditId(null);
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
      stockQty: p.stockQty,
      minStock: p.minStock,
      categoryId: String(p.categoryId),
      sku: p.sku || '',
      barcode: p.barcode || '',
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar este producto?')) return;
    await client.delete(`/products/${id}`);
    toast.success('Producto desactivado');
    load();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptForm); }}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          + Nuevo Producto
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Categoría</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-right p-3">Precio</th>
              <th className="text-right p-3">Stock</th>
              <th className="text-right p-3">Min. Stock</th>
              <th className="text-center p-3">Estado</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.category?.name}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    p.saleType === 'WEIGHT' ? 'bg-blue-100 text-blue-700' :
                    p.saleType === 'UNIT' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {p.saleType === 'WEIGHT' ? 'Peso' : p.saleType === 'UNIT' ? 'Unidad' : 'Ambos'}
                  </span>
                </td>
                <td className="p-3 text-right">{formatCurrency(p.price)}</td>
                <td className="p-3 text-right">{parseFloat(p.stockQty).toFixed(3)}</td>
                <td className="p-3 text-right">{parseFloat(p.minStock).toFixed(3)}</td>
                <td className="p-3 text-center">
                  <span className={`w-2 h-2 inline-block rounded-full ${p.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => handleEdit(p)} className="text-blue-600 hover:underline text-xs mr-2">Editar</button>
                  {p.active && (
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">Desactivar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría *</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required className="w-full px-3 py-2 border rounded-md">
                    <option value="">Seleccionar</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de venta *</label>
                  <select value={form.saleType} onChange={(e) => setForm({ ...form, saleType: e.target.value as any })} className="w-full px-3 py-2 border rounded-md">
                    <option value="WEIGHT">Por peso</option>
                    <option value="UNIT">Por unidad</option>
                    <option value="BOTH">Ambos</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Precio *</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Costo</label>
                  <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock actual</label>
                  <input type="number" step="0.001" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock mínimo</label>
                  <input type="number" step="0.001" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Código de barras</label>
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="flex-1 py-2 border rounded-md hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                  {editId ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
