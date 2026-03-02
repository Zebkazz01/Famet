import { useState, useEffect, useCallback } from 'react';
import { useScale } from '../contexts/ScaleContext';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { formatCurrency, formatWeight } from '../utils/formatters';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  saleType: 'WEIGHT' | 'UNIT' | 'BOTH';
  price: string;
  stockQty: string;
  category: { id: number; name: string; color: string };
}

interface Category {
  id: number;
  name: string;
  color: string;
}

interface CartItem {
  productId: number;
  name: string;
  saleType: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export function POSPage() {
  const { weight, rawWeight, stable, connected, unit, tareActive, tareOffset, tare, clearTare, setUnit } = useScale();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    client.get('/categories').then((r) => setCategories(r.data));
    client.get('/products').then((r) => setProducts(r.data));
  }, []);

  const filteredProducts = products.filter((p) => {
    if (selectedCategory && p.category.id !== selectedCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = useCallback((product: Product) => {
    const price = parseFloat(product.price);

    if (product.saleType === 'WEIGHT' || (product.saleType === 'BOTH' && connected && weight > 0)) {
      // Venta por peso: capturar peso actual de la balanza
      const currentWeight = weight;
      if (currentWeight <= 0) {
        if (!connected) {
          // Sin balanza: pedir peso manual
          const manualWeight = prompt('Balanza no conectada. Ingrese peso en kg:');
          if (!manualWeight || isNaN(parseFloat(manualWeight))) return;
          const qty = parseFloat(manualWeight);
          setCart((prev) => [...prev, {
            productId: product.id,
            name: product.name,
            saleType: 'WEIGHT',
            quantity: qty,
            unitPrice: price,
            subtotal: qty * price,
          }]);
          return;
        }
        toast.error('Coloque el producto en la balanza');
        return;
      }

      if (!stable && connected) {
        toast('Espere a que la balanza se estabilice', { icon: '⏳' });
        return;
      }

      setCart((prev) => [...prev, {
        productId: product.id,
        name: product.name,
        saleType: 'WEIGHT',
        quantity: currentWeight,
        unitPrice: price,
        subtotal: currentWeight * price,
      }]);
      toast.success(`${formatWeight(currentWeight)} de ${product.name}`);
    } else {
      // Venta por unidad
      const existing = cart.find((item) => item.productId === product.id && item.saleType === 'UNIT');
      if (existing) {
        setCart((prev) =>
          prev.map((item) =>
            item === existing
              ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
              : item
          )
        );
      } else {
        setCart((prev) => [...prev, {
          productId: product.id,
          name: product.name,
          saleType: 'UNIT',
          quantity: 1,
          unitPrice: price,
          subtotal: price,
        }]);
      }
    }
  }, [weight, stable, connected, cart]);

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: qty, subtotal: qty * item.unitPrice } : item
      )
    );
  };

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const change = parseFloat(amountPaid || '0') - total;

  const handlePayment = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CASH' && change < 0) {
      toast.error('Monto insuficiente');
      return;
    }

    setProcessing(true);
    try {
      const { data } = await client.post('/sales', {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod,
        amountPaid: paymentMethod === 'CASH' ? parseFloat(amountPaid) : total,
      });

      toast.success(`Venta #${data.id} registrada`);
      setCart([]);
      setShowPayment(false);
      setAmountPaid('');

      // Recargar productos para actualizar stock
      client.get('/products').then((r) => setProducts(r.data));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al procesar venta');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Panel izquierdo: Productos */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Indicador de balanza */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold font-mono">
                {connected
                  ? `${unit === 'g' ? weight.toFixed(0) : weight.toFixed(3)} ${unit}`
                  : `--- ${unit}`}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${connected ? (stable ? 'bg-green-500' : 'bg-yellow-500 animate-pulse') : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-500">
                  {connected ? (stable ? 'ESTABLE' : 'INESTABLE') : 'BALANZA NO CONECTADA'}
                </span>
                {tareActive && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    TARE: {tareOffset.toFixed(3)} kg
                  </span>
                )}
                {connected && (
                  <span className="text-xs text-gray-400">
                    raw: {rawWeight.toFixed(3)} kg
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {/* Controles de unidad */}
              <div className="flex gap-1">
                {(['kg', 'lb', 'g'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                      unit === u ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              {/* Controles de tare */}
              <div className="flex gap-1">
                <button
                  onClick={tare}
                  disabled={!connected}
                  className="px-2 py-1 text-xs rounded font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-40 transition-colors"
                >
                  TARAR
                </button>
                {tareActive && (
                  <button
                    onClick={clearTare}
                    className="px-2 py-1 text-xs rounded font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Quitar Tare
                  </button>
                )}
              </div>
              {!connected && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  Ingreso manual
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-red-500"
        />

        {/* Categorías */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id ? 'text-white' : 'text-gray-700 hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedCategory === cat.id ? cat.color : `${cat.color}30`,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 content-start">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white rounded-lg shadow p-3 text-left hover:shadow-md transition-shadow border-l-4"
              style={{ borderLeftColor: product.category.color }}
            >
              <div className="font-medium text-sm truncate">{product.name}</div>
              <div className="text-red-600 font-bold">
                {formatCurrency(product.price)}
                {product.saleType !== 'UNIT' && <span className="text-xs font-normal">/kg</span>}
              </div>
              <div className="text-xs text-gray-400">
                {product.saleType === 'WEIGHT' ? 'Por peso' : product.saleType === 'UNIT' ? `Stock: ${parseFloat(product.stockQty)}` : 'Peso/Unidad'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel derecho: Carrito */}
      <div className="w-80 bg-white shadow-lg flex flex-col border-l">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-lg">Carrito</h2>
          <p className="text-xs text-gray-500">{user?.name}</p>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <p className="text-4xl mb-2">🛒</p>
              <p>Carrito vacío</p>
              <p className="text-xs">Seleccione un producto</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded p-2 mb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.saleType === 'WEIGHT' ? (
                        `${formatWeight(item.quantity)} x ${formatCurrency(item.unitPrice)}/kg`
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(index, item.quantity - 1)} className="w-5 h-5 bg-gray-200 rounded text-xs">-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(index, item.quantity + 1)} className="w-5 h-5 bg-gray-200 rounded text-xs">+</button>
                          <span>x {formatCurrency(item.unitPrice)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{formatCurrency(item.subtotal)}</div>
                    <button onClick={() => removeFromCart(index)} className="text-red-500 text-xs hover:underline">
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between text-lg font-bold mb-3">
            <span>TOTAL</span>
            <span className="text-red-600">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            COBRAR
          </button>
        </div>
      </div>

      {/* Modal de pago */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Cobrar Venta</h3>

            <div className="text-3xl font-bold text-center text-red-600 mb-6">
              {formatCurrency(total)}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'CARD', 'TRANSFER'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-md text-sm font-medium transition-colors ${
                      paymentMethod === method ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {method === 'CASH' ? 'Efectivo' : method === 'CARD' ? 'Tarjeta' : 'Transfer.'}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Monto recibido</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                  autoFocus
                />
                {parseFloat(amountPaid || '0') > 0 && (
                  <div className={`text-lg font-bold mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Cambio: {formatCurrency(Math.max(0, change))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setShowPayment(false); setAmountPaid(''); }}
                className="flex-1 py-2 border rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                disabled={processing || (paymentMethod === 'CASH' && change < 0)}
                className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                {processing ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
