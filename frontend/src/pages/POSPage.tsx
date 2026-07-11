import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScale } from '../contexts/ScaleContext';
import { useAuth } from '../contexts/AuthContext';
import { usePanel } from '../contexts/PanelContext';
import client from '../api/client';
import { formatCurrency, formatWeight, roundTo100 } from '../utils/formatters';
import toast from 'react-hot-toast';
import { ShoppingCart, Scales, Minus, Plus, Trash, CurrencyDollar, X, ShoppingCartSimple, PencilSimple, Check, Package, Receipt, Barcode, Tag, MagnifyingGlass, Eye, ArrowSquareOut, User, Info, CaretDown, CaretUp, Columns as ColumnsIcon } from '@phosphor-icons/react';
import { Portal } from '../components/Portal';
import { SafeImg } from '../components/SafeImg';
import { CurrencyInput } from '../components/CurrencyInput';
import { BarcodeScanner, playBeep } from '../components/BarcodeScanner';
import { useNotifications } from '../contexts/NotificationContext';
import { getExpiryStatus, formatExpiry } from '../utils/expiryHelpers';
import { getBestPromoLabel } from '../utils/discountHelpers';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useModalEscape } from '../contexts/ModalStackContext';

interface Product {
  id: number;
  name: string;
  saleType: 'WEIGHT' | 'UNIT' | 'BOTH';
  price: string;
  stockQty: string;
  weightUnit: string;
  imageUrl: string | null;
  unitsPerPack: number | null;
  subUnitName: string | null;
  subUnitPrice: string | null;
  category: { id: number; name: string; color: string; description?: string | null };
  animalType?: string | null;
  animalPart?: string | null;
  cookingMethods?: string[];
  hasBatches?: boolean;
  batches?: Array<{ id: number; expiryDate: string; qty: string | number; batchCode: string | null }>;
  discountRules?: Array<{ id: number; type: string; config: any; priority: number }>;
  sku?: string | null;
  barcode?: string | null;
  minStock?: string;
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
  isSubUnit?: boolean;
  subUnitName?: string;
  weightUnit?: string;
}

export function POSPage() {
  const { weight, stable, connected, unit, tareActive, tareOffset, tare, clearTare, setUnit, captureWeight } = useScale();
  const { user } = useAuth();
  const MAX_CARTS = 5;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [topSellers, setTopSellers] = useState<Product[]>([]);
  const [columns, setColumns] = useState(() => {
    try { return parseInt(localStorage.getItem('pos-columns') || '4', 10); } catch { return 4; }
  });

  // Multi-carrito
  const [carts, setCarts] = useState<CartItem[][]>(() => {
    try { return JSON.parse(localStorage.getItem('fameat-carts') || '[[]]'); } catch { return [[]]; }
  });
  const [activeCartIndex, setActiveCartIndex] = useState(0);
  const cart = carts[activeCartIndex] || [];
  const setCart = useCallback((updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCarts((prev) => {
      const copy = [...prev];
      copy[activeCartIndex] = typeof updater === 'function' ? updater(copy[activeCartIndex] || []) : updater;
      return copy;
    });
  }, [activeCartIndex]);

  const [dragItem, setDragItem] = useState<{ cartIdx: number; itemIdx: number } | null>(null);

  const { cartOpen, toggleCart, setCartCount } = usePanel();
  const { setActiveCartsCount, refresh: refreshNotifications, notify } = useNotifications();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [unitQty, setUnitQty] = useState(1);
  const [subUnitQty, setSubUnitQty] = useState(1);
  const [weightModal, setWeightModal] = useState<Product | null>(null);
  const [manualWeight, setManualWeight] = useState('');
  const weightInputRef = useRef<HTMLInputElement>(null);
  // editWeightIndex removed — replaced by editWeightProduct
  const [editWeightProduct, setEditWeightProduct] = useState<{ product: Product; index: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CREDIT'>('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  // Cliente para fiado a nivel de venta (distinto al modalCustomer del modal de producto)
  const [saleCustomer, setSaleCustomer] = useState<{ id: number; name: string; currentDebt?: string; creditLimit?: string } | null>(null);
  const [saleCustomerSearch, setSaleCustomerSearch] = useState('');
  const [showSaleCustomerDrop, setShowSaleCustomerDrop] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedResult, setScannedResult] = useState<{ code: string; product: Product | null } | null>(null);
  const [fromBarcode, setFromBarcode] = useState(false);
  const [showPosDescription, setShowPosDescription] = useState(false);

  // Descuento + cliente opcionales en modal de producto
  const [showDiscountOpts, setShowDiscountOpts] = useState(false);
  const [modalDiscountPct, setModalDiscountPct] = useState(0);
  const [modalCustomer, setModalCustomer] = useState<{ id: number; name: string; discountPercent: string | null } | null>(null);
  const [posCustomers, setPosCustomers] = useState<{ id: number; name: string; discountPercent: string | null }[]>([]);
  const [posCustomersLoaded, setPosCustomersLoaded] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [discountChoice, setDiscountChoice] = useState('');
  const [modalManualPct, setModalManualPct] = useState(0);

  useModalEscape(selectedProduct ? () => setSelectedProduct(null) : null);
  useModalEscape(weightModal ? () => { setWeightModal(null); setManualWeight(''); } : null);
  useModalEscape(editWeightProduct ? () => setEditWeightProduct(null) : null);
  useModalEscape(showPayment ? () => setShowPayment(false) : null);
  useModalEscape(showEditConfirm ? () => setShowEditConfirm(false) : null);
  useModalEscape(showScanner ? () => setShowScanner(false) : null);
  useModalEscape(scannedResult ? () => setScannedResult(null) : null);

  const applyDiscountChoice = useCallback((choice: string, prod: typeof selectedProduct, customer: typeof modalCustomer, manualPct: number) => {
    if (!choice || choice === '') { setModalDiscountPct(0); return; }
    if (choice === 'customer') { setModalDiscountPct(Number(customer?.discountPercent ?? 0)); return; }
    if (choice === 'manual') { setModalDiscountPct(manualPct); return; }
    if (choice.startsWith('rule_') && prod) {
      const ruleId = parseInt(choice.slice(5));
      const rule = prod.discountRules?.find((r) => r.id === ruleId);
      if (rule) {
        let pct = 0;
        if (rule.type === 'PERCENTAGE') pct = rule.config?.pct ?? 0;
        else if (rule.type === 'QUANTITY_THRESHOLD') pct = rule.config?.discountPct ?? 0;
        else if (rule.type === 'FIXED_AMOUNT') {
          const price = parseFloat(prod.price);
          pct = price > 0 ? ((rule.config?.amount ?? 0) / price) * 100 : 0;
        }
        setModalDiscountPct(Math.round(pct * 100) / 100);
      }
    }
  }, []);

  // Producto con precio descontado (para botones de acción del modal)
  const discountedProduct = useCallback(() => {
    if (!selectedProduct || modalDiscountPct === 0) return selectedProduct;
    return { ...selectedProduct, price: String(Math.round(parseFloat(selectedProduct.price) * (1 - modalDiscountPct / 100))) };
  }, [selectedProduct, modalDiscountPct]);

  // Reset el flag cuando se cierra el modal de producto
  useEffect(() => {
    if (!selectedProduct) {
      if (fromBarcode) setFromBarcode(false);
      setShowDiscountOpts(false);
      setModalDiscountPct(0);
      setModalCustomer(null);
      setCustomerSearch('');
      setShowCustomerDrop(false);
      setDiscountChoice('');
      setModalManualPct(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  // Auto-foco en boton de confirmar al abrir modal de producto
  useEffect(() => {
    if (!selectedProduct) return;
    const timer = setTimeout(() => {
      let value = 'unit';
      if (selectedProduct.saleType === 'WEIGHT' || selectedProduct.saleType === 'BOTH') {
        value = connected ? 'scale' : 'manual';
      }
      const btn = document.querySelector<HTMLButtonElement>(`[data-confirm="${value}"]`);
      btn?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedProduct, connected]);
  const [editReason, setEditReason] = useState('');
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [saleDetail, setSaleDetail] = useState<any | null>(null);
  useModalEscape(saleDetail ? () => { setSaleDetail(null); } : null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(0);
  const searchListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (searchHighlight < 0 || !searchListRef.current) return;
    const container = searchListRef.current.querySelector<HTMLElement>('.overflow-auto, .styled-scroll');
    if (!container) return;
    const items = container.querySelectorAll('button');
    const target = items[searchHighlight];
    if (!target) return;
    const cTop = container.scrollTop;
    const cBottom = cTop + container.clientHeight;
    const tTop = (target as HTMLElement).offsetTop;
    const tBottom = tTop + (target as HTMLElement).offsetHeight;
    if (tBottom > cBottom) {
      container.scrollTop = tBottom - container.clientHeight;
    } else if (tTop < cTop) {
      container.scrollTop = tTop;
    }
  }, [searchHighlight]);

  // Atajos de teclado POS
  useKeyboardShortcuts([
    { key: '.', description: '.  Abrir scanner barcode', handler: () => setShowScanner(true) },
    { key: ',', description: ',  Tarar balanza', handler: () => { try { (window as any).__posTare?.(); } catch {} } },
    { key: '*', description: '*  Cobrar (pagar)', handler: () => { if (cart.length > 0) setShowPayment(true); } },
    { key: 's', alt: true, allowInInput: true, description: 'Alt+S: Scanner barcode', handler: () => setShowScanner(true) },
    { key: 't', alt: true, allowInInput: true, description: 'Alt+T: Tarar balanza', handler: () => { try { (window as any).__posTare?.(); } catch {} } },
    { key: 'p', alt: true, allowInInput: true, description: 'Alt+P: Cobrar', handler: () => { if (cart.length > 0) setShowPayment(true); } },


    // Operaciones rápidas sobre el carrito (sin foco en input, sin modal abierto)
    { key: '[', description: '[ : Reducir 1 al último item del carrito', handler: () => {
      if (cart.length === 0) return;
      const lastIdx = cart.length - 1;
      const last = cart[lastIdx];
      if (last && !last.isSubUnit) updateQuantity(lastIdx, last.quantity - 1);
    } },
    { key: ']', description: '] : Sumar 1 al último item del carrito', handler: () => {
      if (cart.length === 0) return;
      const lastIdx = cart.length - 1;
      const last = cart[lastIdx];
      if (last && !last.isSubUnit) updateQuantity(lastIdx, last.quantity + 1);
    } },
    { key: '\\', description: '\\ : Quitar último item del carrito', handler: () => {
      if (cart.length === 0) return;
      removeFromCart(cart.length - 1);
      toast.success('Producto removido');
    } },
    { key: 'l', alt: true, description: 'Alt+L: Limpiar carrito completo', handler: () => {
      if (cart.length === 0) return;
      if (window.confirm(`¿Limpiar carrito con ${cart.length} producto(s)?`)) {
        setCart([]);
        toast.success('Carrito limpiado');
      }
    } },

    // Contextual: solo cuando hay modal de producto abierto
    { key: '+', description: '+ : Aumentar cantidad', handler: () => { if (selectedProduct) setUnitQty((q) => q + 1); } },
    { key: '=', description: '= : Aumentar cantidad', handler: () => { if (selectedProduct) setUnitQty((q) => q + 1); } },
    { key: '-', description: '- : Disminuir cantidad', handler: () => { if (selectedProduct) setUnitQty((q) => Math.max(1, q - 1)); } },
    { key: 'ArrowUp', description: '↑ : Aumentar (en modal producto)', handler: () => { if (selectedProduct) setUnitQty((q) => q + 1); } },
    { key: 'ArrowDown', description: '↓ : Disminuir (en modal producto)', handler: () => { if (selectedProduct) setUnitQty((q) => Math.max(1, q - 1)); } },
  ]);

  // Productos frecuentes basados en clicks (localStorage)
  const trackProductClick = (productId: number) => {
    try {
      const stored = JSON.parse(localStorage.getItem('pos-product-clicks') || '{}');
      stored[productId] = (stored[productId] || 0) + 1;
      localStorage.setItem('pos-product-clicks', JSON.stringify(stored));
    } catch {}
  };

  const frequentProducts = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pos-product-clicks') || '{}') as Record<string, number>;
      const ranked = products
        .filter((p) => stored[p.id] > 0)
        .sort((a, b) => (stored[b.id] || 0) - (stored[a.id] || 0))
        .slice(0, 6);
      if (ranked.length > 0) return ranked;
      // Fallback: primeros 6 productos activos
      return products.slice(0, 6);
    } catch {
      return products.slice(0, 6);
    }
  })();
  const [showRecent, setShowRecent] = useState(() => localStorage.getItem('fameat-recent-open') === 'true');
  // Track qué carritos son edición de venta (saleId por carrito) — persistente
  const [editingSales, setEditingSales] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fameat-editing-sales') || '{}'); } catch { return {}; }
  });
  // Items originales de ventas cargadas para edición (para devolver stock virtual) — persistente
  const [originalSaleItems, setOriginalSaleItems] = useState<Record<number, CartItem[]>>(() => {
    try { return JSON.parse(localStorage.getItem('fameat-original-items') || '{}'); } catch { return {}; }
  });

  const loadRecentSales = () => {
    client.get('/sales?limit=10').then((r) => setRecentSales(r.data)).catch(() => {});
  };

  useEffect(() => {
    client.get('/categories').then((r) => setCategories(r.data));
    client.get('/products').then((r) => setProducts(r.data));
    client.get('/products/top-sellers').then((r) => setTopSellers(r.data)).catch(() => {});
    loadRecentSales();
  }, []);

  // Persistir carritos, ediciones y sincronizar conteos
  useEffect(() => {
    localStorage.setItem('fameat-carts', JSON.stringify(carts));
    localStorage.setItem('fameat-editing-sales', JSON.stringify(editingSales));
    localStorage.setItem('fameat-original-items', JSON.stringify(originalSaleItems));
    const totalItems = carts.reduce((s, c) => s + c.length, 0);
    setCartCount(totalItems);
    const activeCarts = carts.filter((c) => c.length > 0).length;
    setActiveCartsCount(activeCarts);
  }, [carts, setCartCount, setActiveCartsCount]);

  const [selectedExpiry, setSelectedExpiry] = useState<'fresh' | 'caution' | 'warning' | 'critical' | 'none' | null>(null);

  // Productos visibles en la grilla — sólo categoría + vencimiento. NO aplica búsqueda
  // (la búsqueda alimenta el dropdown únicamente, así la grilla no se mueve al tipear).
  const gridProducts = products.filter((p) => {
    if (selectedCategory && p.category.id !== selectedCategory) return false;
    if (selectedExpiry) {
      const next = p.batches?.[0];
      const exp = getExpiryStatus(next?.expiryDate);
      const target = selectedExpiry === 'critical' ? ['critical', 'expired'] : [selectedExpiry];
      if (!target.includes(exp.level)) return false;
    }
    return true;
  });

  // Resultados para el dropdown del buscador — incluye filtro de búsqueda.
  const searchResults = !search ? gridProducts : gridProducts.filter((p) => {
    const q = search.toLowerCase();
    const matchName = p.name.toLowerCase().includes(q);
    const matchSku = (p as any).sku && (p as any).sku.toLowerCase().includes(q);
    const matchBarcode = (p as any).barcode && (p as any).barcode.toLowerCase().includes(q);
    const matchAnimal = p.animalType && (
      p.animalType.toLowerCase().includes(q) ||
      p.animalType.toLowerCase() === q
    );
    const matchPart = p.animalPart && p.animalPart.toLowerCase().includes(q);
    const matchCategory = p.category?.name && p.category.name.toLowerCase().includes(q);
    return matchName || matchSku || matchBarcode || matchAnimal || matchPart || matchCategory;
  });

  // Alias retro: la grilla usa gridProducts, el dropdown searchResults.
  const filteredProducts = gridProducts;

  const handleBarcodeScan = (code: string) => {
    const product = products.find((p) => p.barcode === code) || null;
    setShowScanner(false);
    if (product) {
      playBeep(true);
      // Saltar el modal intermedio: abrir directo el modal de cantidad
      trackProductClick(product.id);
      setSelectedProduct(product);
      setUnitQty(1);
      setSubUnitQty(1);
      setFromBarcode(true);
    } else {
      playBeep(false);
      // Sólo mostrar modal cuando NO se encuentra
      setScannedResult({ code, product });
    }
  };

  /** Agregar producto por peso (balanza o manual). Retorna true si se agreg\u00F3. */
  const addWeightToCart = useCallback((product: Product, openCart: boolean): boolean => {
    const price = parseFloat(product.price);
    const currentWeight = captureWeight();

    if (!connected) {
      // Sin balanza: abrir modal peso manual
      setWeightModal(product);
      setManualWeight('');
      setTimeout(() => weightInputRef.current?.focus(), 100);
      return false;
    }

    if (currentWeight <= 0) {
      toast.error('Coloque el producto en la balanza');
      return false;
    }

    if (!stable) {
      toast('Espere a que la balanza se estabilice', { icon: '\u231B' });
      return false;
    }

    const stockNumW = parseFloat(product.stockQty || '0');
    if (stockNumW > 0) {
      const availableW = getAvailableStock(product.id);
      if (currentWeight > availableW) {
        toast.error(availableW <= 0
          ? 'Producto agotado'
          : `Solo quedan ${availableW.toFixed(3)} ${product.weightUnit || 'kg'} disponibles`);
        return false;
      }
    }

    setCart((prev) => [...prev, {
      productId: product.id, name: product.name, saleType: 'WEIGHT',
      quantity: currentWeight, unitPrice: price, subtotal: currentWeight * price,
      weightUnit: product.weightUnit || 'kg',
    }]);
    toast.success(`${formatWeight(currentWeight)} de ${product.name}`);
    if (openCart && !cartOpen) toggleCart();
    return true;
  }, [captureWeight, stable, connected, cartOpen, toggleCart, cart, products, originalSaleItems, activeCartIndex]);

  /** Agregar producto por unidad. Retorna true si se agregó, false si falló (p.ej. stock). */
  const addUnitsToCart = (product: Product, qty: number, openCart: boolean): boolean => {
    const available = getAvailableStock(product.id);
    if (available < qty) {
      toast.error(available <= 0 ? 'Producto agotado' : `Solo quedan ${available} unidades disponibles`);
      return false;
    }
    const price = parseFloat(product.price);
    const existing = cart.find((item) => item.productId === product.id && item.saleType === 'UNIT');
    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item === existing
            ? { ...item, quantity: item.quantity + qty, subtotal: (item.quantity + qty) * item.unitPrice }
            : item
        )
      );
    } else {
      setCart((prev) => [...prev, {
        productId: product.id, name: product.name, saleType: 'UNIT',
        quantity: qty, unitPrice: price, subtotal: qty * price,
      }]);
    }
    toast.success(`${qty}x ${product.name} agregado`);
    // Alertar si queda poco stock después de agregar
    const remaining = available - qty;
    if (remaining <= 0) {
      notify('stock', 'Ultimo disponible', `${product.name} se agotara con esta venta`, `/products?productId=${product.id}`);
    } else if (remaining <= 3) {
      notify('stock', 'Quedan pocas unidades', `${product.name}: solo quedan ${remaining} unidades`, `/products?productId=${product.id}`);
    }
    if (openCart && !cartOpen) toggleCart();
    return true;
  };

  const confirmManualWeight = (openCart: boolean) => {
    if (!weightModal) return;
    const qty = parseFloat(manualWeight);
    if (!manualWeight || isNaN(qty) || qty <= 0) {
      toast.error('Ingrese un peso válido');
      return;
    }
    const stockNumM = parseFloat(weightModal.stockQty || '0');
    const wuM = weightModal.weightUnit || 'kg';
    if (stockNumM > 0) {
      const availM = getAvailableStock(weightModal.id);
      if (qty > availM) {
        toast.error(availM <= 0
          ? 'Producto agotado'
          : `Solo quedan ${availM.toFixed(3)} ${wuM} disponibles`);
        return;
      }
    }
    const price = parseFloat(weightModal.price);
    const wu = weightModal.weightUnit || 'kg';
    setCart((prev) => [...prev, {
      productId: weightModal.id, name: weightModal.name, saleType: 'WEIGHT',
      quantity: qty, unitPrice: price, subtotal: qty * price,
      weightUnit: wu,
    }]);
    toast.success(`${qty.toFixed(3)} ${wu} de ${weightModal.name}`);
    setManualWeight('');
    setWeightModal(null);
    if (openCart && !cartOpen) toggleCart();
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) { removeFromCart(index); return; }
    const current = cart[index];
    if (current) {
      const product = products.find((p) => p.id === current.productId);
      if (product && parseFloat(product.stockQty || '0') > 0) {
        // Stock disponible incluyendo lo que este item ya consume (lo "devolvemos" antes de comparar)
        const consumes =
          current.saleType === 'WEIGHT' ? current.quantity :
          current.isSubUnit && product.unitsPerPack ? current.quantity / product.unitsPerPack :
          current.quantity;
        const available = getAvailableStock(current.productId) + consumes;
        const wants =
          current.saleType === 'WEIGHT' ? qty :
          current.isSubUnit && product.unitsPerPack ? qty / product.unitsPerPack :
          qty;
        if (wants > available) {
          const wu = current.saleType === 'WEIGHT' ? ` ${current.weightUnit || 'kg'}` : '';
          toast.error(`Solo quedan ${available.toFixed(current.saleType === 'WEIGHT' ? 3 : 0)}${wu} de ${current.name}`);
          return;
        }
      }
    }
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: qty, subtotal: qty * item.unitPrice } : item
      )
    );
  };

  const rawTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = roundTo100(rawTotal);
  const roundingDiff = total - rawTotal;
  const change = parseFloat(amountPaid || '0') - total;

  /** Cargar venta en carrito para edición */
  const loadSaleToCart = async (saleId: number) => {
    // Validar que no se edite dos veces
    const alreadyEditing = Object.values(editingSales).includes(saleId);
    if (alreadyEditing) {
      toast.error(`La venta #${saleId} ya esta siendo editada`);
      // Ir al carrito que la tiene
      const idx = Object.entries(editingSales).find(([, v]) => v === saleId);
      if (idx) setActiveCartIndex(Number(idx[0]));
      if (!cartOpen) toggleCart();
      return;
    }
    try {
      const { data } = await client.get(`/sales/${saleId}`);
      const items: CartItem[] = data.items.map((item: any) => ({
        productId: item.productId,
        name: item.product.name,
        saleType: item.product.saleType === 'WEIGHT' ? 'WEIGHT' : 'UNIT',
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        subtotal: parseFloat(item.subtotal),
        isSubUnit: item.isSubUnit || false,
        subUnitName: item.product.subUnitName || undefined,
        weightUnit: item.product.weightUnit || 'kg',
      }));
      if (carts.length >= MAX_CARTS) {
        toast.error('Maximo 5 carritos activos');
        return;
      }
      const newIdx = carts.length;
      setCarts((prev) => [...prev, items]);
      setActiveCartIndex(newIdx);
      setEditingSales((prev) => ({ ...prev, [newIdx]: saleId }));
      setOriginalSaleItems((prev) => ({ ...prev, [newIdx]: [...items] }));
      if (!cartOpen) toggleCart();
      toast.success(`Venta #${saleId} cargada para edicion`);
    } catch {
      toast.error('Error al cargar venta');
    }
  };

  /** Stock disponible = stock real + stock de venta original (si editando) - cantidad en carrito */
  const getAvailableStock = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    let stock = parseFloat(product.stockQty);

    // Si es carrito de edición, sumar stock que la venta original descontó
    const origItems = originalSaleItems[activeCartIndex];
    if (origItems) {
      stock += origItems
        .filter((item) => item.productId === productId)
        .reduce((sum, item) => {
          if (item.saleType === 'WEIGHT') return sum + item.quantity;
          if (item.isSubUnit && product.unitsPerPack) return sum + item.quantity / product.unitsPerPack;
          return sum + item.quantity;
        }, 0);
    }

    const inCart = cart
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => {
        if (item.saleType === 'WEIGHT') return sum + item.quantity;
        if (item.isSubUnit && product.unitsPerPack) return sum + item.quantity / product.unitsPerPack;
        return sum + item.quantity;
      }, 0);
    return stock - inCart;
  };

  const getStockBadge = (product: Product) => {
    const available = getAvailableStock(product.id);
    if (product.saleType === 'WEIGHT') return null;
    if (available <= 0) return { text: 'Agotado', color: 'bg-red-500 text-white' };
    if (available <= 5) return { text: `Por agotarse (${available})`, color: 'bg-orange-500 text-white' };
    if (available <= 10) return { text: `Pocas unidades (${available})`, color: 'bg-yellow-500 text-white' };
    return null;
  };

  const handlePayment = async () => {
    const isEditing = !!editingSales[activeCartIndex];
    // En venta nueva, cart debe tener items. En edición permite 0 (devolución total).
    if (!isEditing && cart.length === 0) return;
    // Validaciones por método de pago
    if (!isEditing && paymentMethod === 'CASH' && change < 0) {
      toast.error('Monto insuficiente');
      return;
    }
    if (!isEditing && paymentMethod === 'CREDIT' && !saleCustomer) {
      toast.error('Selecciona un cliente para fiado');
      return;
    }

    setProcessing(true);
    try {
      // 'CREDIT' es solo de UI — el backend recibe paymentMethod=CASH + isCredit=true
      const isFiado = !isEditing && paymentMethod === 'CREDIT';
      const backendMethod = isFiado ? 'CASH' : (paymentMethod as 'CASH' | 'TRANSFER');
      const salePayload: any = {
        items: cart.map((item) => ({
          productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice,
          isSubUnit: item.isSubUnit || false,
        })),
        paymentMethod: isEditing ? 'CASH' : backendMethod,
        amountPaid: isEditing ? total : (paymentMethod === 'CASH' ? parseFloat(amountPaid) : (isFiado ? 0 : total)),
        correctionReason: editReason || undefined,
      };
      if (saleCustomer) salePayload.customerId = saleCustomer.id;
      if (isFiado) salePayload.isCredit = true;

      const wasEditing = editingSales[activeCartIndex];
      let data;
      if (wasEditing) {
        // Actualizar venta existente (no crear nueva)
        ({ data } = await client.put(`/sales/${wasEditing}`, salePayload));
      } else {
        ({ data } = await client.post('/sales', salePayload));
      }

      if (wasEditing) {
        notify('sale', 'Venta editada', `Venta #${wasEditing} modificada - ${editReason}`, `/sales?saleId=${wasEditing}`);
        toast.success(`Venta #${wasEditing} modificada`);
      } else {
        notify('sale', 'Venta registrada', `Venta #${data.id} por ${formatCurrency(total)}`, `/sales?saleId=${data.id}`);
        toast.success(`Venta #${data.id} realizada por ${formatCurrency(total)}`);
      }
      setCart([]);
      setShowPayment(false);
      setAmountPaid('');
      setSaleCustomer(null);
      setSaleCustomerSearch('');
      setPaymentMethod('CASH');
      if (wasEditing) {
        setEditingSales((prev) => { const c = { ...prev }; delete c[activeCartIndex]; return c; });
        setOriginalSaleItems((prev) => { const c = { ...prev }; delete c[activeCartIndex]; return c; });
        setEditReason('');
      }
      client.get('/products').then((r) => {
        setProducts(r.data);
        // Verificar stock de productos vendidos
        for (const item of cart) {
          const prod = r.data.find((p: any) => p.id === item.productId);
          if (!prod || prod.saleType === 'WEIGHT') continue;
          const stock = parseFloat(prod.stockQty);
          const min = parseFloat(prod.minStock);
          if (stock <= 0) {
            notify('stock', 'Producto agotado', `${prod.name} se quedo sin stock`, `/products?productId=${prod.id}`);
          } else if (stock <= min) {
            notify('stock', 'Stock bajo', `${prod.name} tiene solo ${stock} unidades (minimo: ${min})`, `/products?productId=${prod.id}`);
          } else if (stock <= 5) {
            notify('stock', 'Pocas unidades', `${prod.name} tiene solo ${stock} unidades`, `/products?productId=${prod.id}`);
          }
        }
      });
      loadRecentSales();
      refreshNotifications();
      window.dispatchEvent(new Event('stock-changed'));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al procesar venta');
    } finally {
      setProcessing(false);
    }
  };

  const renderRecentSalesList = () => {
    if (recentSales.length === 0) {
      return <p className="text-xs text-gray-400 text-center py-4">Sin ventas recientes</p>;
    }
    return recentSales.map((sale) => (
      <div key={sale.id} className="flex items-center justify-between px-3 py-2 border-b last:border-0 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">#{sale.id}</span>
            <span className="text-[10px] text-gray-400">{new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
            {(sale as any).isCredit ? (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg font-bold ${
                Number((sale as any).creditBalance || 0) <= 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {Number((sale as any).creditBalance || 0) <= 0 ? 'Fiado · Pagada' : 'Fiado'}
              </span>
            ) : (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg font-medium ${
                sale.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' :
                sale.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {sale.paymentMethod === 'CASH' ? 'Efectivo' : sale.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transfer'}
              </span>
            )}
            {(sale as any).customer && <span className="text-[10px] text-gray-500 truncate max-w-[100px]">· {(sale as any).customer.name}</span>}
            {sale.corrected && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-lg">Corregida</span>}
          </div>
          <p className="text-[10px] text-gray-400">{sale._count?.items || '?'} productos</p>
        </div>
        <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrency(sale.total)}</span>
          <button onClick={async () => {
            setLoadingDetail(true);
            try {
              const { data } = await client.get(`/sales/${sale.id}`);
              setSaleDetail(data);
            } catch {
              toast.error('No se pudo cargar el detalle');
            } finally {
              setLoadingDetail(false);
            }
          }}
            title="Ver detalle aquí"
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
            <Eye size={14} weight="duotone" />
          </button>
          <button onClick={() => navigate(`/sales?saleId=${sale.id}`)}
            title="Abrir en historial de ventas"
            className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
            <ArrowSquareOut size={14} weight="duotone" />
          </button>
          <button onClick={() => loadSaleToCart(sale.id)}
            title="Editar venta"
            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
            <PencilSimple size={14} weight="bold" />
          </button>
        </div>
      </div>
    ));
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Panel izquierdo: Productos */}
      <div className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden relative">
        {/* Móvil: solo título */}
        <div className="mt-2 mb-4 md:hidden">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 leading-tight">
            <ShoppingCartSimple size={24} weight="duotone" className="text-red-500 flex-shrink-0" />
            <span className="truncate">Punto de Venta</span>
            <button
              type="button"
              onClick={() => setShowPosDescription((v) => !v)}
              title={showPosDescription ? 'Ocultar descripción' : 'Ver descripción del módulo'}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              {showPosDescription ? <X size={14} weight="bold" /> : <Info size={16} weight="duotone" />}
            </button>
          </h1>
          <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed ${showPosDescription ? '' : 'hidden'}`}>
            Registra ventas escaneando, pesando o seleccionando productos. Gestiona hasta 5 carritos simultáneos, edita ventas previas y cobra en efectivo, tarjeta o transferencia.
          </p>
        </div>

        {/* Desktop: título + báscula lado a lado (50/50) */}
        <div className="hidden md:flex items-stretch gap-4 mb-5">
          <div id="pos-title" className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl shadow p-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 leading-tight">
              <ShoppingCartSimple size={24} weight="duotone" className="text-red-500 flex-shrink-0" />
              <span className="truncate">Punto de Venta</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
              Registra ventas escaneando, pesando o seleccionando productos. Gestiona hasta 5 carritos simultáneos, edita ventas previas y cobra en efectivo, tarjeta o transferencia.
            </p>
          </div>
          {/* Indicador de balanza */}
          <div id="pos-weight-display" className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl shadow p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-3xl font-bold font-mono leading-tight">
                  {connected
                    ? `${unit === 'g' ? weight.toFixed(0) : weight.toFixed(3)} ${unit === '@' ? '@' : unit}`
                    : `--- ${unit === '@' ? '@' : unit}`}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`w-2 h-2 rounded-full ${connected ? (stable ? 'bg-green-500' : 'bg-yellow-500 animate-pulse') : 'bg-gray-400'}`} />
                  <span className="text-sm text-gray-500">
                    {connected ? (stable ? 'ESTABLE' : 'INESTABLE') : 'BALANZA NO CONECTADA'}
                  </span>
                  {tareActive && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      TARE: {tareOffset.toFixed(3)} kg
                    </span>
                  )}
                </div>
                {connected && weight > 0 && (
                  <div className="flex gap-3 mt-2 text-xs">
                    {unit !== 'kg' && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">{(weight * (unit === 'lb' ? 0.453592 : unit === 'g' ? 0.001 : unit === '@' ? 12.5 : 1)).toFixed(3)} kg</span>}
                    {unit !== 'lb' && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg">{(weight * (unit === 'kg' ? 2.20462 : unit === 'g' ? 0.00220462 : unit === '@' ? 27.5578 : 1)).toFixed(3)} lb</span>}
                    {unit !== '@' && (() => {
                      const kg = weight * (unit === 'kg' ? 1 : unit === 'lb' ? 0.453592 : unit === 'g' ? 0.001 : 1);
                      const arroba = kg / 12.5;
                      return (
                        <span className={`px-2 py-0.5 rounded-lg ${arroba >= 0.9 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-amber-50 text-amber-700'}`}>
                          {arroba.toFixed(3)} @ {arroba >= 0.9 && arroba < 1 ? `(${(arroba * 100).toFixed(0)}%)` : ''}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div id="pos-scale-controls" className="flex flex-col gap-2 items-end flex-shrink-0">
                <div className="flex gap-1">
                  {(['kg', 'lb', '@'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u as any)}
                      className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                        unit === u ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {u === '@' ? 'Arroba' : u}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={tare}
                    disabled={!connected}
                    className="px-2 py-1 text-xs rounded-lg font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-40 transition-colors"
                  >
                    TARAR
                  </button>
                  {tareActive && (
                    <button
                      onClick={clearTare}
                      className="px-2 py-1 text-xs rounded-lg font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      Quitar Tare
                    </button>
                  )}
                </div>
                {!connected && (
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                    Ingreso manual
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Búsqueda con sugerencias */}
        <div className="flex gap-2 mb-1.5 md:mb-3">
          <div className="relative flex-1" ref={searchListRef}>
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" weight="bold" />
            <input
              id="pos-search-input"
              type="text"
              autoFocus
              placeholder="Buscar por nombre, animal (res, cerdo...), corte, categoría, SKU o código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearchHighlight(0); }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onKeyDown={(e) => {
                const list = search.length === 0 ? topSellers : search.length < 2 ? frequentProducts : searchResults;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSearchHighlight((h) => Math.min(h + 1, list.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSearchHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const p = list[searchHighlight];
                  if (p) {
                    trackProductClick(p.id);
                    setSelectedProduct(p);
                    setUnitQty(1);
                    setSubUnitQty(1);
                    setSearch('');
                    setSearchFocused(false);
                    (document.getElementById('pos-search-input') as HTMLInputElement | null)?.blur();
                  }
                } else if (e.key === 'Escape') {
                  setSearch('');
                  setSearchFocused(false);
                  (document.getElementById('pos-search-input') as HTMLInputElement | null)?.blur();
                }
              }}
              className="w-full pl-9 pr-8 h-11 md:h-auto md:py-2 text-xs md:text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                <X size={16} weight="bold" />
              </button>
            )}
            {/* Dropdown: más vendidos al enfocar sin búsqueda */}
            {searchFocused && search.length === 0 && topSellers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 max-h-72 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-slate-900/50">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">Los más vendidos</span>
                </div>
                <ul className="overflow-auto styled-scroll divide-y divide-gray-100 dark:divide-gray-700">
                  {topSellers.map((p, idx) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); trackProductClick(p.id); setSelectedProduct(p); setUnitQty(1); setSubUnitQty(1); setSearch(''); setSearchFocused(false); }}
                        onMouseEnter={() => setSearchHighlight(idx)}
                        className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${idx === searchHighlight ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={14} className="text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name} {(p as any).sku && <span className="text-gray-400 font-normal">· {(p as any).sku}</span>}</p>
                          <p className="text-[10px] text-gray-400">{p.category.name}</p>
                        </div>
                        <span className="text-sm font-bold text-red-500 whitespace-nowrap">{formatCurrency(p.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Dropdown: productos frecuentes solo cuando user escribe 1 caracter */}
              {searchFocused && search.length >= 1 && search.length < 2 && frequentProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 max-h-72 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-slate-900/50">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">Productos frecuentes</span>
                </div>
                <ul className="overflow-auto styled-scroll divide-y divide-gray-100 dark:divide-gray-700">
                  {frequentProducts.map((p, idx) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); trackProductClick(p.id); setSelectedProduct(p); setUnitQty(1); setSubUnitQty(1); setSearch(''); setSearchFocused(false); }}
                        onMouseEnter={() => setSearchHighlight(idx)}
                        className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${idx === searchHighlight ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={14} className="text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name} {(p as any).sku && <span className="text-gray-400 font-normal">· {(p as any).sku}</span>}</p>
                          <p className="text-[10px] text-gray-400">{p.category.name}</p>
                        </div>
                        <span className="text-sm font-bold text-red-500 whitespace-nowrap">{formatCurrency(p.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {/* Dropdown sugerencias */}
          {search.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 z-20 max-h-72 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                <span className="text-[11px] text-gray-400 font-medium">
                  {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => setSearch('')} className="text-[11px] text-red-500 hover:text-red-700 font-medium">
                  Limpiar
                </button>
              </div>

              <div className="overflow-auto flex-1">
                {searchResults.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package size={24} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No encontramos "{search}"</p>
                    <p className="text-xs text-gray-400 mt-1">Intenta con otro nombre o categoria</p>
                  </div>
                ) : (
                  searchResults.slice(0, 8).map((product, i) => {
                    const available = getAvailableStock(product.id);
                    const isAgotado = product.saleType !== 'WEIGHT' && available <= 0;
                    const highlighted = i === searchHighlight;
                    return (
                      <button
                        key={product.id}
                        disabled={isAgotado}
                        onClick={() => {
                          trackProductClick(product.id);
                          setSelectedProduct(product); setUnitQty(1); setSubUnitQty(1); setSearch('');
                          (document.getElementById('pos-search-input') as HTMLInputElement | null)?.blur();
                        }}
                        onMouseEnter={() => setSearchHighlight(i)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all group ${
                          isAgotado ? 'opacity-40 cursor-not-allowed' : highlighted ? 'bg-red-100 dark:bg-red-900/30' : 'hover:bg-red-50 active:bg-red-100'
                        } ${i > 0 ? 'border-t border-gray-50' : ''}`}
                      >
                        {/* Imagen */}
                        <div className="w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden ring-2 ring-gray-100 group-hover:ring-red-200 transition-all">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="text-gray-300" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-red-700 transition-colors">{product.name} {(product as any).sku && <span className="text-gray-400 font-normal">· {(product as any).sku}</span>}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-400">{product.category.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              product.saleType === 'WEIGHT' ? 'bg-blue-50 text-blue-600' :
                              product.saleType === 'UNIT' ? 'bg-green-50 text-green-600' :
                              'bg-purple-50 text-purple-600'
                            }`}>
                              {product.saleType === 'WEIGHT' ? 'Peso' : product.saleType === 'UNIT' ? 'Unidad' : 'Ambos'}
                            </span>
                            {product.saleType !== 'WEIGHT' && (
                              <span className={`text-[10px] font-medium ${available <= 0 ? 'text-red-500' : available <= 5 ? 'text-amber-500' : 'text-gray-400'}`}>
                                Stock: {available}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Precio */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-red-500">{formatCurrency(product.price)}</p>
                          <p className="text-[10px] text-gray-400 font-medium">por {product.saleType === 'UNIT' ? 'ud' : product.weightUnit === '@' ? '@' : product.weightUnit || 'kg'}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="h-11 md:h-auto px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
            title="Escanear codigo de barras"
          >
            <Barcode className="text-gray-600 w-5 h-5" weight="duotone" />
          </button>
          <button
            onClick={() => {
              const next = columns >= 4 ? 1 : columns + 1;
              setColumns(next);
              localStorage.setItem('pos-columns', String(next));
            }}
            className="h-11 md:h-auto px-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors flex items-center justify-center flex-shrink-0 gap-1"
            title={`Cambiar columnas (actual: ${columns})`}
          >
            <ColumnsIcon className="text-gray-500 w-4 h-4" weight="duotone" />
            <span className="text-[11px] font-bold text-gray-600">{columns}</span>
          </button>
        </div>

        {/* Escáner */}
        {showScanner && (
          <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
        )}

        {/* Resultado del escáner */}
        {scannedResult && (<Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <Barcode size={20} weight="duotone" className="text-red-500" />
                  <h3 className="font-bold text-sm">Codigo escaneado</h3>
                </div>
                <button onClick={() => setScannedResult(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={18} weight="bold" />
                </button>
              </div>

              <div className="p-4">
                {/* Código */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Codigo de barras</p>
                  <p className="text-lg font-bold font-mono">{scannedResult.code}</p>
                </div>

                {scannedResult.product ? (
                  <>
                    {/* Producto encontrado */}
                    <div className="flex items-center gap-3 mb-4 bg-green-50 rounded-lg p-3 border border-green-100">
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {scannedResult.product.imageUrl ? (
                          <img src={scannedResult.product.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} className="text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{scannedResult.product.name}</p>
                        <p className="text-xs text-gray-500">{scannedResult.product.category.name}</p>
                        <p className="text-lg font-bold text-red-500 mt-0.5">
                          {formatCurrency(scannedResult.product.price)}
                          <span className="text-xs font-normal text-gray-400">
                            /{scannedResult.product.saleType === 'UNIT' ? 'ud' : scannedResult.product.weightUnit || 'kg'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => { setShowScanner(true); setScannedResult(null); }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                        <Barcode size={16} weight="duotone" /> Escanear otro
                      </button>
                      <button onClick={() => {
                        const p = scannedResult.product!;
                        setScannedResult(null);
                        setSelectedProduct(p);
                        setUnitQty(1);
                        setSubUnitQty(1);
                      }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                        <ShoppingCartSimple size={16} weight="duotone" /> Agregar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* No encontrado */}
                    <div className="text-center py-4 mb-4 bg-red-50 rounded-lg border border-red-100">
                      <X size={32} weight="bold" className="text-red-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-red-500">Producto no registrado</p>
                      <p className="text-xs text-red-400 mt-1">No existe producto con este codigo</p>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setScannedResult(null)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                        <X size={16} weight="bold" /> Cerrar
                      </button>
                      <button onClick={() => { setShowScanner(true); setScannedResult(null); }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">
                        <Barcode size={16} weight="duotone" /> Escanear otro
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Portal>)}

        {/* Categorías — altura explícita en móvil para que sean píldoras compactas */}
        <div id="pos-category-filter" className="flex flex-wrap gap-1 md:gap-1.5 mb-1 md:mb-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`h-5 md:h-auto px-2 md:px-3 md:py-1.5 rounded-full md:rounded-lg text-[10px] md:text-sm font-medium leading-none transition-colors whitespace-nowrap inline-flex items-center justify-center ${
              !selectedCategory ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-5 md:h-auto px-2 md:px-3 md:py-1.5 rounded-full md:rounded-lg text-[10px] md:text-sm font-medium leading-none transition-colors whitespace-nowrap inline-flex items-center justify-center ${
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

        {/* Leyenda + filtro de vencimiento (píldoras compactas) */}
        <div className="flex items-center gap-1 md:gap-1.5 flex-wrap text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 px-0.5 py-0 md:py-1">
          <span className="font-semibold text-gray-600 dark:text-gray-400 leading-none">Vencimiento:</span>
          {([
            { key: 'fresh', label: 'Fresco', labelDesktop: 'Fresco (>30d)', dot: 'bg-green-500', activeBg: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
            { key: 'caution', label: 'Atención', labelDesktop: 'Atención (8-30d)', dot: 'bg-amber-500', activeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
            { key: 'warning', label: 'Próximo', labelDesktop: 'Próximo (2-7d)', dot: 'bg-orange-500', activeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
            { key: 'critical', label: 'Crítico', labelDesktop: 'Crítico / Vencido', dot: 'bg-red-500 animate-pulse', activeBg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
            { key: 'none', label: 'S/fecha', labelDesktop: 'Sin fecha', dot: 'bg-gray-300', activeBg: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
          ] as const).map((chip) => {
            const active = selectedExpiry === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setSelectedExpiry(active ? null : chip.key)}
                title={active ? 'Quitar filtro' : `Filtrar por: ${chip.labelDesktop}`}
                className={`inline-flex items-center gap-1 h-[18px] md:h-auto px-2 md:px-2.5 md:py-0.5 rounded-full leading-none transition-colors whitespace-nowrap ${
                  active
                    ? `${chip.activeBg} font-semibold`
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${chip.dot}`} />
                <span className="md:hidden">{chip.label}</span>
                <span className="hidden md:inline">{chip.labelDesktop}</span>
              </button>
            );
          })}
          {selectedExpiry && (
            <button
              onClick={() => setSelectedExpiry(null)}
              title="Limpiar filtro de vencimiento"
              className="inline-flex items-center justify-center h-[18px] w-[18px] md:h-5 md:w-5 rounded-full leading-none text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X size={10} weight="bold" />
            </button>
          )}
        </div>

        {/* Grid de productos */}
        {filteredProducts.length === 0 ? (() => {
            const hasNoProducts = products.length === 0;
            const hasFilters = !!(selectedCategory || selectedExpiry || search);
            const isOnlySearch = !!search && !selectedCategory && !selectedExpiry;

            if (hasNoProducts) {
              return (
                <div className="flex-1 flex items-center justify-center py-6 md:py-10">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6 md:p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 shadow-inner flex items-center justify-center">
                      <Package size={36} weight="duotone" className="text-red-500" />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100">
                      Tu catálogo está vacío
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      Aún no hay productos registrados. Crea el primero para empezar a vender — podrás definir precio, tipo (peso o unidad), categoría e imagen.
                    </p>
                    <button
                      onClick={() => navigate('/products?new=1')}
                      className="mt-5 inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-lg hover:bg-red-600 text-sm font-semibold transition-colors shadow-sm"
                    >
                      <Plus size={16} weight="bold" /> Crear primer producto
                    </button>
                  </div>
                </div>
              );
            }

            if (hasFilters) {
              return (
                <div className="flex-1 flex items-center justify-center py-6 md:py-10">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6 md:p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/40 shadow-inner flex items-center justify-center">
                      <MagnifyingGlass size={32} weight="duotone" className="text-amber-500" />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100">
                      {isOnlySearch ? 'Sin coincidencias' : 'No hay productos con esos filtros'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      {isOnlySearch
                        ? `No encontramos productos para "${search}". Prueba otro término o quita los filtros.`
                        : 'Ajusta o quita uno de los filtros activos para ver más resultados.'}
                    </p>

                    {/* Chips de filtros activos */}
                    <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <X size={10} weight="bold" /> "{search}"
                        </button>
                      )}
                      {selectedCategory && (
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <X size={10} weight="bold" /> Categoría
                        </button>
                      )}
                      {selectedExpiry && (
                        <button
                          onClick={() => setSelectedExpiry(null)}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <X size={10} weight="bold" /> Vencimiento
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => { setSearch(''); setSelectedCategory(null); setSelectedExpiry(null); }}
                      className="mt-4 inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-semibold transition-colors shadow-sm"
                    >
                      <X size={14} weight="bold" /> Limpiar todos los filtros
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })() : (
          <div id="pos-product-grid" className="flex-1 min-h-0 overflow-auto styled-scroll grid gap-3 auto-rows-[150px] md:auto-rows-[140px] content-start relative" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {filteredProducts.map((product) => {
            const badge = getStockBadge(product);
            const available = getAvailableStock(product.id);
            const isAgotado = product.saleType !== 'WEIGHT' && available <= 0;
            const promoLabel = getBestPromoLabel(product.discountRules);
            const hasPromo = !!promoLabel;
            const nextBatch = product.batches?.[0];
            const expiry = getExpiryStatus(nextBatch?.expiryDate);
            const dotColor =
              expiry.level === 'none' ? 'bg-gray-300' :
              expiry.level === 'fresh' ? 'bg-green-500' :
              expiry.level === 'caution' ? 'bg-amber-500' :
              expiry.level === 'warning' ? 'bg-orange-500' :
              'bg-red-500';
            const dotTooltip = expiry.level === 'none'
              ? 'Sin fecha de vencimiento'
              : `${expiry.label}${nextBatch ? ` · ${formatExpiry(nextBatch.expiryDate)}` : ''}`;
            return (
              <button
                key={product.id}
                onClick={() => { if (!isAgotado) { trackProductClick(product.id); setSelectedProduct(product); setUnitQty(1); setSubUnitQty(1); } }}
                disabled={isAgotado}
                className={`bg-white dark:bg-slate-800 rounded-lg shadow text-left hover:shadow-md transition-all border-l-4 relative flex flex-col h-full ${isAgotado ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ borderLeftColor: product.category.color }}
              >
                {/* Indicador de vencimiento (punto) */}
                <span
                  title={dotTooltip}
                  className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full z-10 ring-2 ring-white dark:ring-slate-800 ${dotColor} ${expiry.level === 'critical' || expiry.level === 'expired' ? 'animate-pulse' : ''}`}
                />
                <div className="flex flex-1">
                  {/* Imagen cuadrada */}
                  <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-gray-50 dark:bg-slate-900/40 flex items-center justify-center overflow-hidden">
                    <SafeImg src={product.imageUrl || undefined} alt={product.name} className="w-full h-full object-cover" iconSize={20} />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 p-2 flex flex-col">
                    <div className="font-medium text-sm md:text-base truncate leading-tight text-gray-900 dark:text-gray-100 pl-3">{product.name}</div>
                    <div className="text-red-500 font-bold text-base md:text-lg mt-0.5">
                      {formatCurrency(product.price)}
                      <span className="text-xs font-normal text-gray-400">/{product.saleType === 'UNIT' ? 'ud' : product.weightUnit === '@' ? '@' : product.weightUnit || 'kg'}</span>
                    </div>
                    {product.subUnitPrice && (
                      <div className="text-xs text-amber-600">{formatCurrency(product.subUnitPrice)}/{product.subUnitName || 'sub'}</div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-auto">
                      {product.saleType === 'WEIGHT' ? 'Por peso' :
                        product.saleType === 'UNIT' ? `Stock: ${available}` : 'Peso/Unidad'}
                    </div>
                  </div>
                </div>
                {/* Carne: animal + parte (juntos) */}
                {product.animalType && (() => {
                  const at = product.animalType;
                  const animalLabel = at.charAt(0) + at.slice(1).toLowerCase();
                  return (
                    <div className="flex flex-wrap items-center gap-0.5 px-2 pb-0.5 text-xs">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-semibold">
                        <span>{animalLabel}</span>
                        {product.animalPart && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="font-normal">{product.animalPart}</span>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })()}
                {/* Métodos de cocción (por producto) */}
                {product.cookingMethods && product.cookingMethods.length > 0 && (
                  <div className="flex flex-wrap items-center gap-0.5 px-2 pb-1">
                    {product.cookingMethods.slice(0, 3).map((m: string) => (
                      <span key={m} className="inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40">
                        {m === 'ASAR' ? 'Asar' : m === 'FREIR' ? 'Freír' : m === 'SUDAR' ? 'Sudar' : m === 'SOPA' ? 'Sopa' : m === 'GUISAR' ? 'Guisar' : m === 'PLANCHA' ? 'Plancha' : m === 'CRUDO' ? 'Crudo' : m === 'AHUMAR' ? 'Ahumar' : m}
                      </span>
                    ))}
                  </div>
                )}

                {/* Badges (pills) - se acomodan en grid */}
                {(badge || hasPromo || product.barcode) && (
                  <div className="flex flex-wrap items-center gap-1 px-2 pb-1.5">
                    {badge && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${badge.color}`}>
                        {badge.text}
                      </span>
                    )}
                    {hasPromo && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500 text-white shadow-sm" title="Promoción activa">
                        <Tag size={8} weight="bold" /> {promoLabel}
                      </span>
                    )}
                    {product.barcode && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 shadow-sm" title={`Código: ${product.barcode}`}>
                        <Barcode size={11} weight="bold" />
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
          </div>
        )}

        {/* Trigger ventas recientes — siempre visible */}
        <div id="pos-recent-sales" className="flex-shrink-0">
          <button onClick={() => { const next = !showRecent; setShowRecent(next); localStorage.setItem('fameat-recent-open', String(next)); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <Receipt size={14} weight="duotone" />
            {showRecent ? 'Ocultar ventas recientes' : 'Ventas recientes'}
            {recentSales.length > 0 && !showRecent && (
              <span className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{recentSales.length}</span>
            )}
          </button>
        </div>

        {/* Backdrop al abrir ventas recientes */}
        <div
          onClick={() => { setShowRecent(false); localStorage.setItem('fameat-recent-open', 'false'); }}
          className={`fixed inset-0 z-10 bg-black/30 backdrop-blur-[1px] transition-opacity duration-[350ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
            showRecent ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Panel ventas recientes — slide-up desde abajo en todos los tamaños */}
        <div
          style={{ willChange: 'transform' }}
          className={`
            fixed left-0 bottom-0 z-20
            ${cartOpen ? 'right-0 md:right-80' : 'right-0'}
            bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm
            rounded-t-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.15)]
            p-3 pt-2
            transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]
            ${showRecent ? 'translate-y-0' : 'translate-y-full'}
          `}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full mx-auto mb-2" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Receipt size={14} weight="duotone" /> Ventas recientes
              {recentSales.length > 0 && (
                <span className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{recentSales.length}</span>
              )}
            </span>
            <button onClick={() => { setShowRecent(false); localStorage.setItem('fameat-recent-open', 'false'); }}
              className="text-gray-400 hover:text-gray-600 p-1">
              <X size={16} weight="bold" />
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 max-h-[40vh] overflow-auto styled-scroll">
            {renderRecentSalesList()}
          </div>
        </div>
      </div>

      {/* Panel derecho: Carrito — unificado con animación smooth y borde redondeado del lado interno */}
      <div
        className={`fixed inset-0 z-30 md:hidden bg-black/40 transition-opacity duration-[350ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] ${cartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleCart}
      />
      <div
        id="pos-cart-panel"
        style={{ willChange: 'transform' }}
        className={`w-[85vw] sm:w-80 bg-white dark:bg-slate-800 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700 z-40 absolute right-0 top-0 bottom-0 md:relative md:flex-shrink-0 rounded-l-2xl md:rounded-none overflow-hidden transition-all duration-[350ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]
          ${cartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-0'}`}
      >
        {/* Tab strip — fondo separado, tab activo se ancla a la tarjeta blanca de abajo */}
        <div className="bg-gradient-to-b from-gray-100 to-gray-50 dark:from-slate-900 dark:to-slate-800/80 px-3 pt-2.5">
          <div id="pos-cart-tabs" className="flex items-end gap-1">
            {carts.map((c, i) => (
              <button
                key={i}
                onClick={() => setActiveCartIndex(i)}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-blue-400'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-blue-400'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                  if (dragItem && dragItem.cartIdx !== i) {
                    setCarts((prev) => {
                      const copy = prev.map((cart) => [...cart]);
                      const [moved] = copy[dragItem.cartIdx].splice(dragItem.itemIdx, 1);
                      copy[i].push(moved);
                      return copy;
                    });
                    setDragItem(null);
                    toast.success(`Producto movido al carrito ${i + 1}`);
                  }
                }}
                className={`px-3 pt-2 pb-2 rounded-t-lg text-xs font-bold transition-colors relative ${
                  activeCartIndex === i
                    ? 'bg-white dark:bg-slate-800 text-red-500 border-l border-r border-t border-gray-200 dark:border-gray-700 -mb-px z-10'
                    : 'bg-gray-200/60 dark:bg-slate-700/40 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200 border-l border-r border-t border-transparent'
                }`}
              >
                #{i + 1}
                {c.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{c.length}</span>
                )}
              </button>
            ))}
            {carts.length < MAX_CARTS && (
              <button
                onClick={() => setCarts((prev) => [...prev, []])}
                className="px-2 pt-1.5 pb-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
                title="Nuevo carrito"
              >
                <Plus size={14} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Info del carrito activo — fondo blanco, ancla visual del tab activo */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <ShoppingCartSimple size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm flex items-center gap-1.5 text-gray-900 dark:text-gray-100">
                Carrito #{activeCartIndex + 1}
                {editingSales[activeCartIndex] && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
                    Editando #{editingSales[activeCartIndex]}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                <User size={9} weight="duotone" /> {user?.name}
                {cart.length > 0 && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="font-medium">{cart.length} {cart.length === 1 ? 'item' : 'items'}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          {carts.length > 1 && cart.length === 0 && (
            <button
              onClick={() => {
                const idx = activeCartIndex;
                setCarts((prev) => prev.filter((_, i) => i !== idx));
                setEditingSales((prev) => { const c = { ...prev }; delete c[idx]; return c; });
                setOriginalSaleItems((prev) => { const c = { ...prev }; delete c[idx]; return c; });
                setActiveCartIndex((i) => Math.max(0, i - 1));
              }}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
            >
              Eliminar
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <ShoppingCart size={48} weight="duotone" className="mx-auto mb-2 text-gray-300" />
              <p>Carrito vacío</p>
              <p className="text-xs">Seleccione un producto</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index}
                draggable={carts.length > 1}
                onDragStart={() => setDragItem({ cartIdx: activeCartIndex, itemIdx: index })}
                onDragEnd={() => setDragItem(null)}
                className={`bg-gray-50 rounded-lg p-3 mb-2 border border-gray-100 ${carts.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {item.name}
                      {item.isSubUnit && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-lg">{item.subUnitName || 'sub'}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.saleType === 'WEIGHT' ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span>{item.quantity.toFixed(3)} {item.weightUnit || 'kg'} x {formatCurrency(item.unitPrice)}/{item.weightUnit || 'kg'}</span>
                          <button
                            onClick={() => {
                              const prod = products.find((p) => p.id === item.productId);
                              if (prod) {
                                setEditWeightProduct({ product: prod, index });
                                setManualWeight(item.quantity.toFixed(3));
                              }
                            }}
                            className="w-5 h-5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg flex items-center justify-center"
                            title="Editar peso"
                          >
                            <PencilSimple size={10} weight="bold" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1">
                          <button
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Minus size={12} weight="bold" />
                          </button>
                          <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-500 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Plus size={12} weight="bold" />
                          </button>
                          <span className="text-gray-400 ml-1">x {formatCurrency(item.unitPrice)}{item.isSubUnit ? `/${item.subUnitName || 'sub'}` : '/ud'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="font-bold text-sm text-gray-800">{formatCurrency(item.subtotal)}</div>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs transition-colors"
                    >
                      <Trash size={12} weight="duotone" /> Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between text-lg font-bold mb-1">
            <span>TOTAL</span>
            <span className="text-red-500">{formatCurrency(total)}</span>
          </div>
          {/* Diferencia con venta original si es edición */}
          {editingSales[activeCartIndex] && originalSaleItems[activeCartIndex] && (() => {
            const originalTotal = originalSaleItems[activeCartIndex].reduce((s, i) => s + i.subtotal, 0);
            const diff = total - originalTotal;
            return (
              <div className={`flex justify-between text-xs font-medium mb-2 px-1 py-1 rounded-lg ${
                diff > 0 ? 'bg-red-50 text-red-500' : diff < 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                <span>{diff > 0 ? 'Cliente debe pagar mas' : diff < 0 ? 'Devolver al cliente' : 'Sin diferencia'}</span>
                <span className="font-bold">{diff > 0 ? '+' : ''}{formatCurrency(diff)}</span>
              </div>
            );
          })()}
          <div className="flex gap-2">
            {cart.length > 0 && (
              <button
                onClick={() => {
                  const isEditing = !!editingSales[activeCartIndex];
                  toast((t) => (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium">
                        {isEditing ? `Cancelar edicion de venta #${editingSales[activeCartIndex]}?` : 'Limpiar todo el carrito?'}
                      </p>
                      {isEditing && <p className="text-xs text-gray-400">Se eliminara el carrito y no se guardaran cambios</p>}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => toast.dismiss(t.id)}
                          className="px-3 py-1 text-xs rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">No</button>
                        <button onClick={() => {
                          toast.dismiss(t.id);
                          if (isEditing && carts.length > 1) {
                            const idx = activeCartIndex;
                            setCarts((prev) => prev.filter((_, i) => i !== idx));
                            setEditingSales((prev) => { const c = { ...prev }; delete c[idx]; return c; });
                            setOriginalSaleItems((prev) => { const c = { ...prev }; delete c[idx]; return c; });
                            setActiveCartIndex((i) => Math.max(0, i - 1));
                            toast.success('Edicion cancelada', { duration: 2000 });
                          } else {
                            setCart([]);
                            if (isEditing) {
                              setEditingSales((prev) => { const c = { ...prev }; delete c[activeCartIndex]; return c; });
                              setOriginalSaleItems((prev) => { const c = { ...prev }; delete c[activeCartIndex]; return c; });
                            }
                          }
                        }}
                          className={`px-3 py-1 text-xs rounded-lg text-white transition-colors ${isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-500 hover:bg-red-600'}`}>
                          {isEditing ? 'Cancelar edicion' : 'Limpiar'}
                        </button>
                      </div>
                    </div>
                  ), { duration: 8000, position: 'top-center', style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } });
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-3 border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Trash size={18} weight="duotone" />
              </button>
            )}
            {editingSales[activeCartIndex] ? (
              <button
                onClick={() => { setEditReason(''); setShowEditConfirm(true); }}
                className={`flex-1 inline-flex items-center justify-center gap-2 text-white py-3 rounded-lg font-bold text-lg transition-colors ${
                  cart.length === 0
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <PencilSimple size={22} weight="duotone" />
                {cart.length === 0 ? `ANULAR + DEVOLVER VENTA #${editingSales[activeCartIndex]}` : `EDITAR VENTA #${editingSales[activeCartIndex]}`}
              </button>
            ) : (
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CurrencyDollar size={22} weight="duotone" /> COBRAR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmación edición de venta */}
      {showEditConfirm && editingSales[activeCartIndex] && (<Portal>
        <div className={`fixed inset-0 flex items-center justify-center z-[9999] p-4 ${showPayment ? 'bg-transparent pointer-events-none' : 'bg-black/40 backdrop-blur-sm'}`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-amber-500 px-5 py-4 flex items-center gap-3">
              <PencilSimple size={24} weight="duotone" className="text-white" />
              <h3 className="text-white font-bold text-lg">Confirmar edicion</h3>
              <button onClick={() => setShowEditConfirm(false)}
                className="ml-auto text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20">
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info de la venta */}
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Venta original</p>
                <p className="text-lg font-bold">#{editingSales[activeCartIndex]}</p>
              </div>

              {/* Diferencia */}
              {(() => {
                const origTotal = (originalSaleItems[activeCartIndex] || []).reduce((s, i) => s + i.subtotal, 0);
                const diff = total - origTotal;
                return (
                  <div className={`rounded-xl p-4 text-center ${
                    diff > 0 ? 'bg-red-50 border border-red-200' : diff < 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <p className="text-xs text-gray-500 mb-1">
                      {diff > 0 ? 'El cliente debe pagar adicional' : diff < 0 ? 'Se debe devolver al cliente' : 'No hay diferencia de dinero'}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400">Original</p>
                        <p className="font-bold">{formatCurrency(origTotal)}</p>
                      </div>
                      <span className="text-xl text-gray-300">→</span>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400">Nuevo</p>
                        <p className="font-bold">{formatCurrency(total)}</p>
                      </div>
                      <div className={`text-right font-bold text-lg ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Motivo */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Motivo de la edicion *</label>
                <select value={editReason} onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-2">
                  <option value="">Seleccionar motivo...</option>
                  <option value="Error en cantidad">Error en cantidad</option>
                  <option value="Producto equivocado">Producto equivocado</option>
                  <option value="Cliente agrego productos">Cliente agrego productos</option>
                  <option value="Cliente quito productos">Cliente quito productos</option>
                  <option value="Cliente cambio de opinion">Cliente cambio de opinion</option>
                  <option value="Devolucion parcial">Devolucion parcial</option>
                  <option value="Devolucion total">Devolucion total</option>
                  <option value="Precio incorrecto">Precio incorrecto</option>
                  <option value="Peso incorrecto">Peso incorrecto</option>
                  <option value="Error del cajero">Error del cajero</option>
                  <option value="Cambio de metodo de pago">Cambio de metodo de pago</option>
                  <option value="Otro">Otro</option>
                </select>
                {editReason === 'Otro' && (
                  <input type="text" placeholder="Describe el motivo..."
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowEditConfirm(false)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <X size={16} weight="bold" /> Cancelar
              </button>
              <button
                onClick={() => {
                  if (!editReason || editReason === 'Seleccionar motivo...') {
                    toast.error('Selecciona un motivo');
                    return;
                  }
                  setShowPayment(true);
                }}
                disabled={!editReason}
                autoFocus
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
                <Check size={16} weight="bold" /> Confirmar edicion
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal de pago */}
      {showPayment && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xl relative">
            <button onClick={() => { setShowPayment(false); setAmountPaid(''); }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} weight="bold" />
            </button>

            {editingSales[activeCartIndex] ? (() => {
              const origTotal = (originalSaleItems[activeCartIndex] || []).reduce((s, i) => s + i.subtotal, 0);
              const diff = total - origTotal;
              return (
                <>
                  <div className="text-center mb-4">
                    <PencilSimple size={32} weight="duotone" className="text-amber-500 mx-auto mb-2" />
                    <h3 className="text-xl font-bold">Editar Venta #{editingSales[activeCartIndex]}</h3>
                    <p className="text-xs text-gray-400 mt-1">{editReason}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-400 uppercase">Original</p>
                      <p className="text-lg font-bold">{formatCurrency(origTotal)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-400 uppercase">Nuevo total</p>
                      <p className="text-lg font-bold">{formatCurrency(total)}</p>
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 text-center mb-4 ${
                    diff > 0 ? 'bg-red-50 border border-red-200' : diff < 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {diff > 0 ? 'Cobrar al cliente' : diff < 0 ? 'Devolver al cliente' : 'Sin diferencia'}
                    </p>
                    <p className={`text-3xl font-bold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {diff !== 0 ? formatCurrency(Math.abs(diff)) : '$0'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setShowPayment(false); setAmountPaid(''); }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                      <X size={16} weight="bold" /> Cancelar
                    </button>
                    <button onClick={handlePayment} disabled={processing}
                      autoFocus
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
                      <Check size={16} weight="bold" /> {processing ? 'Procesando...' : 'Confirmar edicion'}
                    </button>
                  </div>
                </>
              );
            })() : (
              <>
                <h3 className="text-xl font-bold mb-4">Cobrar Venta</h3>

                <div className="text-3xl font-bold text-center text-red-500 mb-4">
                  {formatCurrency(total)}
                </div>
                {roundingDiff !== 0 && (
                  <div className="text-center -mt-3 mb-4">
                    <span className="text-[11px] text-gray-400">
                      Redondeo: {formatCurrency(roundingDiff)}
                    </span>
                  </div>
                )}

                {/* Cliente (opcional, requerido para fiado) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1.5 flex items-center justify-between">
                    <span>Cliente <span className="text-gray-400 font-normal text-xs">(opcional)</span></span>
                    {saleCustomer && Number(saleCustomer.currentDebt || 0) > 0 && (
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        Deuda actual: {formatCurrency(saleCustomer.currentDebt || 0)}
                      </span>
                    )}
                  </label>
                  {saleCustomer ? (
                    <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {saleCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium truncate">{saleCustomer.name}</span>
                      </div>
                      <button type="button" onClick={() => { setSaleCustomer(null); if (paymentMethod === 'CREDIT') setPaymentMethod('CASH'); }} className="p-1 hover:bg-blue-200 rounded">
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={saleCustomerSearch}
                        onChange={(e) => { setSaleCustomerSearch(e.target.value); setShowSaleCustomerDrop(true); }}
                        onFocus={() => {
                          setShowSaleCustomerDrop(true);
                          if (!posCustomersLoaded) {
                            client.get('/customers', { params: { active: true } }).then((r) => {
                              setPosCustomers(r.data);
                              setPosCustomersLoaded(true);
                            }).catch(() => {});
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowSaleCustomerDrop(false), 150)}
                        placeholder="Buscar cliente para fiado..."
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-300 focus:outline-none"
                      />
                      {showSaleCustomerDrop && (
                        <div className="absolute top-full left-0 right-0 z-30 bg-white border-2 rounded-lg shadow-xl max-h-44 overflow-y-auto mt-1">
                          {(posCustomers as any[])
                            .filter((c) => !saleCustomerSearch || c.name.toLowerCase().includes(saleCustomerSearch.toLowerCase()))
                            .slice(0, 8)
                            .map((c: any) => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={() => {
                                  setSaleCustomer({ id: c.id, name: c.name, currentDebt: c.currentDebt, creditLimit: c.creditLimit });
                                  setSaleCustomerSearch('');
                                  setShowSaleCustomerDrop(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 border-b last:border-b-0"
                              >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 truncate">{c.name}</span>
                                {Number(c.currentDebt || 0) > 0 && (
                                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                    Debe {formatCurrency(c.currentDebt)}
                                  </span>
                                )}
                              </button>
                            ))}
                          {(posCustomers as any[]).filter((c) => !saleCustomerSearch || c.name.toLowerCase().includes(saleCustomerSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-3 text-xs text-gray-400 text-center">
                              {posCustomersLoaded ? 'Sin resultados' : 'Cargando...'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Método de pago */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Método de pago</label>
                  <div className={`grid gap-2 ${saleCustomer ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <button
                      onClick={() => setPaymentMethod('CASH')}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        paymentMethod === 'CASH' ? 'bg-green-600 text-white shadow' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Efectivo
                    </button>
                    <button
                      onClick={() => setPaymentMethod('TRANSFER')}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        paymentMethod === 'TRANSFER' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Transferencia
                    </button>
                    {saleCustomer && (
                      <button
                        onClick={() => setPaymentMethod('CREDIT')}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          paymentMethod === 'CREDIT' ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        title="La venta se carga a la deuda del cliente"
                      >
                        Fiado
                      </button>
                    )}
                  </div>
                </div>

                {paymentMethod === 'CASH' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Monto recibido</label>
                    <CurrencyInput
                      value={amountPaid}
                      onChange={setAmountPaid}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !processing && change >= 0) handlePayment(); }}
                      className="w-full pr-3 py-2 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                      placeholder="0"
                      autoFocus
                    />
                    {parseFloat(amountPaid || '0') > 0 && (
                      <div className={`text-lg font-bold mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        Cambio: {formatCurrency(Math.max(0, change))}
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'CREDIT' && saleCustomer && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Venta a crédito</p>
                    <p className="text-xs text-amber-700">
                      Se sumará <span className="font-bold">{formatCurrency(total)}</span> a la deuda de <span className="font-bold">{saleCustomer.name}</span>.
                    </p>
                    {Number(saleCustomer.currentDebt || 0) > 0 && (
                      <p className="text-[11px] text-amber-700 mt-1">
                        Deuda anterior: {formatCurrency(saleCustomer.currentDebt || 0)} → Nueva: <span className="font-bold">{formatCurrency(Number(saleCustomer.currentDebt || 0) + total)}</span>
                      </p>
                    )}
                    {Number(saleCustomer.creditLimit || 0) > 0 && (Number(saleCustomer.currentDebt || 0) + total) > Number(saleCustomer.creditLimit || 0) && (
                      <p className="text-[11px] text-red-700 font-bold mt-1">
                        ⚠ Supera el límite de crédito ({formatCurrency(saleCustomer.creditLimit || 0)})
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <button onClick={() => { setShowPayment(false); setAmountPaid(''); setSaleCustomer(null); setSaleCustomerSearch(''); setPaymentMethod('CASH'); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
                    <X size={16} weight="bold" /> Cancelar
                  </button>
                  <button key={`pay-${paymentMethod}`} onClick={handlePayment}
                    disabled={processing || (paymentMethod === 'CASH' && change < 0) || (paymentMethod === 'CREDIT' && !saleCustomer)}
                    autoFocus={paymentMethod !== 'CASH'}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium">
                    <Check size={16} weight="bold" /> {processing ? 'Procesando...' : (paymentMethod === 'CREDIT' ? 'Cargar a deuda' : 'Confirmar')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Portal>)}

      {/* Modal peso manual */}
      {weightModal && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => { setWeightModal(null); setManualWeight(''); }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} weight="bold" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <Scales size={32} weight="duotone" className="text-red-500" />
              <div>
                <h3 className="text-lg font-bold">Ingreso manual de peso</h3>
                <p className="text-sm text-gray-500">{weightModal.name}</p>
              </div>
            </div>

            {(() => {
              const wu = weightModal.weightUnit || 'kg';
              const wuLabel = wu === '@' ? 'arroba' : wu;
              const mw = parseFloat(manualWeight || '0');
              const toKg = wu === 'kg' ? mw : wu === 'lb' ? mw * 0.453592 : wu === '@' ? mw * 12.5 : mw;
              return (
                <>
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Precio por {wuLabel}</p>
                      <p className="text-xl font-bold text-red-500">{formatCurrency(weightModal.price)}</p>
                    </div>
                    {parseFloat(weightModal.stockQty || '0') > 0 && (
                      <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-400 mb-1">Stock disponible</p>
                        <p className="text-xl font-bold text-blue-600">{parseFloat(weightModal.stockQty).toFixed(2)} {wu}</p>
                      </div>
                    )}
                  </div>

                  <label className="block text-sm font-medium mb-1">Peso ({wu === '@' ? 'arrobas' : wu})</label>
                  <input
                    ref={weightInputRef}
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={manualWeight}
                    onChange={(e) => setManualWeight(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmManualWeight(true); }}
                    className="w-full px-3 py-3 border-2 rounded-lg text-2xl font-mono text-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-500"
                    placeholder="0.000"
                  />

                  {mw > 0 && (
                    <>
                      {/* Equivalencias */}
                      <div className="flex gap-2 mt-2 justify-center flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-lg ${wu === 'kg' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                          {toKg.toFixed(3)} kg
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-lg ${wu === 'lb' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                          {(toKg * 2.20462).toFixed(3)} lb
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-lg ${wu === '@' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                          {(toKg / 12.5).toFixed(3)} @
                        </span>
                      </div>
                      {/* Subtotal */}
                      <div className="bg-green-50 rounded-lg p-3 mt-2 text-center">
                        <p className="text-xs text-gray-400">Subtotal</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(mw * parseFloat(weightModal.price))}
                        </p>
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            <div className="flex flex-col gap-2 mt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => confirmManualWeight(true)}
                  disabled={!manualWeight || parseFloat(manualWeight) <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  <ShoppingCartSimple size={16} weight="duotone" /> Agregar al carrito
                </button>
                <button
                  onClick={() => confirmManualWeight(false)}
                  disabled={!manualWeight || parseFloat(manualWeight) <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  <Plus size={16} weight="bold" /> Registrar más
                </button>
              </div>
              <button
                onClick={() => { setWeightModal(null); setManualWeight(''); }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <X size={16} weight="bold" /> Cancelar
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal selección de producto */}
      {selectedProduct && (<Portal>
        <div className={`fixed inset-0 flex items-center justify-center z-[9999] p-1 sm:p-2 md:p-4 ${weightModal || showScanner || scannedResult ? 'bg-transparent pointer-events-none' : 'bg-black/40 backdrop-blur-sm'}`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[100dvh] p-0 overflow-hidden flex flex-col" style={{ maxHeight: 'min(100dvh - 8px, 600px)' }}
            onKeyDown={(e) => {
              if (!selectedProduct) return;
              const tag = (e.target as HTMLElement).tagName;
              if (e.key === 'Enter' && e.shiftKey) {
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                e.preventDefault();
                if (selectedProduct.saleType === 'WEIGHT') { addWeightToCart(selectedProduct, false); return; }
                if (selectedProduct.saleType === 'UNIT' || selectedProduct.saleType === 'BOTH') { addUnitsToCart(selectedProduct, unitQty, false); }
                return;
              }
              if (e.key === 'Enter') {
                if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'A') return;
                e.preventDefault();
                if (selectedProduct.saleType === 'WEIGHT') {
                  const ok = addWeightToCart(selectedProduct, true);
                  if (!connected || (!ok && captureWeight() <= 0)) {
                    setWeightModal(selectedProduct);
                    setManualWeight('');
                    setTimeout(() => weightInputRef.current?.focus(), 100);
                  } else if (ok) setSelectedProduct(null);
                  return;
                }
                if (selectedProduct.saleType === 'UNIT' || selectedProduct.saleType === 'BOTH') {
                  if (addUnitsToCart(selectedProduct, unitQty, true)) setSelectedProduct(null);
                }
              }
            }}
          >
            {/* Header — limpio, solo nombre + cerrar */}
            <div className="px-3 md:px-4 py-2 md:py-2.5 border-b flex items-start justify-between gap-2 flex-shrink-0"
              style={{ borderLeftWidth: 4, borderLeftColor: selectedProduct.category.color }}>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm md:text-base truncate leading-tight">{selectedProduct.name}</h3>
                <p className="text-[10px] md:text-[11px] text-gray-500 flex items-center gap-1.5 mt-px">
                  {selectedProduct.category.name}
                  {fromBarcode && (
                    <span className="inline-flex items-center gap-1 text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                      <Barcode size={9} weight="bold" /> Escaneado
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 -mr-1 -mt-0.5">
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Content — NO scroll */}
            <div className="flex-1 overflow-hidden flex flex-col px-3 md:px-4 py-1.5 md:py-2 space-y-1 md:space-y-1.5 min-h-0">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 md:px-3 py-1.5 md:py-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] md:text-xs text-gray-400 flex-shrink-0">Precio</span>
                  <span className="text-sm md:text-base font-bold text-red-500 truncate">
                    {formatCurrency(selectedProduct.price)}<span className="text-[9px] md:text-[10px] font-normal text-gray-400">/{selectedProduct.saleType === 'UNIT' ? 'ud' : selectedProduct.weightUnit === '@' ? '@' : selectedProduct.weightUnit || 'kg'}</span>
                  </span>
                  {selectedProduct.subUnitPrice && (
                    <span className="text-[9px] md:text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded truncate">{formatCurrency(selectedProduct.subUnitPrice)}/{selectedProduct.subUnitName || 'sub'}</span>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-medium flex-shrink-0 ${
                  selectedProduct.saleType === 'WEIGHT' ? 'bg-blue-100 text-blue-700' :
                  selectedProduct.saleType === 'UNIT' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {selectedProduct.saleType === 'WEIGHT' ? 'Peso' : selectedProduct.saleType === 'UNIT' ? 'Ud.' : 'Peso/Ud.'}
                </span>
              </div>

              {/* Categoría + animal + preparación — una línea compacta */}
              {(selectedProduct.animalType || (selectedProduct.cookingMethods && selectedProduct.cookingMethods.length > 0)) && (
                <div className="flex items-center gap-1 flex-wrap bg-gray-50 rounded-lg px-2.5 md:px-3 py-1 md:py-1.5">
                  {selectedProduct.animalType && (() => {
                    const at = selectedProduct.animalType as string;
                    return (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-semibold bg-red-100 text-red-700 leading-tight">
                        {at.charAt(0) + at.slice(1).toLowerCase()}{selectedProduct.animalPart ? ` · ${selectedProduct.animalPart}` : ''}
                      </span>
                    );
                  })()}
                  {selectedProduct.cookingMethods && selectedProduct.cookingMethods.length > 0 && (
                    (selectedProduct.cookingMethods as string[]).map((m) => (
                      <span key={m} className="inline-block px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 leading-tight">
                        {m === 'ASAR' ? 'Asar' : m === 'FREIR' ? 'Freír' : m === 'SUDAR' ? 'Sudar' : m === 'SOPA' ? 'Sopa' : m === 'GUISAR' ? 'Guisar' : m === 'PLANCHA' ? 'Plancha' : m === 'CRUDO' ? 'Crudo' : m === 'AHUMAR' ? 'Ahumar' : m}
                      </span>
                    ))
                  )}
                </div>
              )}

              {/* Descuento + cliente (opcional) */}
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showDiscountOpts;
                    setShowDiscountOpts(next);
                    if (next && !posCustomersLoaded) {
                      client.get('/customers', { params: { active: true } }).then((r) => {
                        setPosCustomers(r.data);
                        setPosCustomersLoaded(true);
                      }).catch(() => {});
                    }
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1 rounded bg-gray-50 text-[10px] text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <Tag size={10} />
                    {modalDiscountPct > 0 || modalCustomer ? (
                      <span className="text-green-600 font-medium truncate max-w-[180px]">
                        {modalCustomer ? modalCustomer.name : ''}
                        {modalCustomer && modalDiscountPct > 0 ? ' · ' : ''}
                        {modalDiscountPct > 0 ? `-${modalDiscountPct}%` : ''}
                      </span>
                    ) : 'Descuento / cliente'}
                  </span>
                  {showDiscountOpts ? <CaretUp size={10} /> : <CaretDown size={10} />}
                </button>
                {showDiscountOpts && (
                  <div className="mt-1 bg-white dark:bg-slate-800 rounded-xl p-2 space-y-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">

                    {/* Cliente */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Cliente</label>
                        {modalCustomer && Number(modalCustomer.discountPercent) > 0 && (
                          <span className="text-[8px] text-green-600 font-semibold bg-green-50 px-1 py-0.5 rounded">
                            {modalCustomer.discountPercent}% dcto
                          </span>
                        )}
                      </div>

                      {modalCustomer ? (
                        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-lg px-2 py-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                              {modalCustomer.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[10px] md:text-xs font-medium truncate">{modalCustomer.name}</span>
                          </div>
                          <button type="button" onClick={() => { setModalCustomer(null); setCustomerSearch(''); const nc = discountChoice === 'customer' ? '' : discountChoice; setDiscountChoice(nc); applyDiscountChoice(nc, selectedProduct, null, modalManualPct); }}
                            className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors flex-shrink-0">
                            <X size={10} weight="bold" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input type="text" value={customerSearch}
                            onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                            onFocus={() => setShowCustomerDrop(true)}
                            onBlur={() => setTimeout(() => setShowCustomerDrop(false), 150)}
                            placeholder="Buscar cliente..."
                            className="w-full px-2.5 py-1 border border-gray-200 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-slate-700 focus:border-blue-400 focus:outline-none transition-colors"
                          />
                          {showCustomerDrop && (
                            <div className="absolute top-full left-0 right-0 z-30 bg-white dark:bg-slate-700 border dark:border-gray-600 rounded shadow-xl max-h-32 overflow-y-auto mt-0.5">
                              {posCustomers.filter((c) => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                                .slice(0, 5).map((c) => (
                                  <button key={c.id} type="button" onMouseDown={() => { setModalCustomer(c); setCustomerSearch(''); setShowCustomerDrop(false); if (Number(c.discountPercent) > 0 && !discountChoice) { setDiscountChoice('customer'); applyDiscountChoice('customer', selectedProduct, c, modalManualPct); } }}
                                    className="w-full text-left px-2 py-1 text-[10px] hover:bg-blue-50 dark:hover:bg-slate-600 flex items-center gap-1.5 border-b border-gray-50 dark:border-slate-600 last:border-b-0">
                                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-[7px] font-bold flex-shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                                    <span className="flex-1 truncate">{c.name}</span>
                                    {Number(c.discountPercent) > 0 && <span className="text-[8px] text-green-700 font-bold bg-green-100 px-1 py-0.5 rounded">{c.discountPercent}%</span>}
                                  </button>
                                ))}
                              {posCustomers.filter((c) => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                <p className="px-3 py-2 text-[10px] text-gray-400 text-center">{posCustomersLoaded ? 'Sin resultados' : 'Cargando...'}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Descuento — chips */}
                    <div>
                      <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Descuento</label>
                      <div className="flex flex-wrap gap-0.5">
                        {(() => {
                              const chip = (val: string, label: string, color: 'gray' | 'green' | 'blue' | 'amber') => {
                                const active = discountChoice === val;
                                const colorMap = {
                                  gray: active ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500',
                                  green: active ? 'bg-green-500 text-white border-green-500' : 'bg-green-50 text-green-700 border-green-200 hover:border-green-400',
                                  blue: active ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
                                  amber: active ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
                                };
                                return (
                                  <button key={val} type="button"
                                    onClick={() => { setDiscountChoice(val); applyDiscountChoice(val, selectedProduct, modalCustomer, modalManualPct); }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${colorMap[color]}`}>{label}</button>
                                );
                              };
                          const rules = selectedProduct.discountRules ?? [];
                          const ruleLabel = (r: any) => {
                            const cfg = r.config || {};
                            if (r.type === 'PERCENTAGE') return `${cfg.pct}% off`;
                            if (r.type === 'QUANTITY_THRESHOLD') return `${cfg.minQty}+ uds → ${cfg.discountPct}%`;
                            if (r.type === 'FIXED_AMOUNT') return `$${cfg.amount} off`;
                            if (r.type === 'BUY_X_GET_Y') return `${cfg.buy}x${cfg.buy + cfg.get}`;
                            return 'Promo';
                          };
                          return (
                            <>
                              {chip('', 'Sin', 'gray')}
                              {rules.map((r) => chip(`rule_${r.id}`, ruleLabel(r), 'green'))}
                              {modalCustomer && Number(modalCustomer.discountPercent) > 0 && chip('customer', `Cliente -${modalCustomer.discountPercent}%`, 'blue')}
                              {chip('manual', 'Personalizado', 'amber')}
                            </>
                          );
                        })()}
                      </div>
                      {discountChoice === 'manual' && (
                        <div className="mt-1 relative">
                          <input type="number" min="0" max="100" step="0.5" value={modalManualPct || ''}
                            onChange={(e) => { const v = parseFloat(e.target.value); const safe = isNaN(v) ? 0 : Math.min(100, Math.max(0, v)); setModalManualPct(safe); setModalDiscountPct(safe); }}
                            autoFocus placeholder="0"
                            className="w-full pl-2.5 pr-7 py-1 border border-amber-200 rounded text-[10px] bg-white dark:bg-slate-700 focus:border-amber-400 focus:outline-none"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-amber-600">%</span>
                        </div>
                      )}
                    </div>

                    {/* Vista previa del precio */}
                    {modalDiscountPct > 0 && (
                      <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border border-green-200 dark:border-green-700 rounded px-2 py-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 line-through">{formatCurrency(selectedProduct.price)}</span>
                          <span className="text-[8px] bg-green-600 text-white px-1 py-0.5 rounded font-bold">-{modalDiscountPct}%</span>
                        </div>
                        <span className="text-[11px] font-bold text-green-700 dark:text-green-400">{formatCurrency(parseFloat(selectedProduct.price) * (1 - modalDiscountPct / 100))}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(selectedProduct.saleType === 'UNIT' || selectedProduct.saleType === 'BOTH') && (() => {
                const available = getAvailableStock(selectedProduct.id);
                const stockBadge = getStockBadge(selectedProduct);
                return (
                  <>
                    <div className="flex justify-between items-center bg-gray-50 rounded px-2.5 md:px-3 py-1 md:py-1.5">
                      <span className="text-[10px] md:text-xs text-gray-500">Stock</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] md:text-xs font-bold ${available <= 0 ? 'text-red-500' : available <= 5 ? 'text-orange-600' : 'text-gray-800'}`}>{available}</span>
                        {stockBadge && <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${stockBadge.color}`}>{stockBadge.text}</span>}
                      </div>
                    </div>

                    {available > 0 && (() => {
                      const remaining = available - unitQty;
                      return (
                        <div className="bg-gray-50 rounded px-2.5 md:px-3 py-1.5 md:py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setUnitQty((q) => Math.max(1, q - 1))}
                              className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center transition-colors">
                              <Minus size={12} weight="bold" />
                            </button>
                            <input type="number" min="1" max={available} value={unitQty}
                              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setUnitQty(Math.min(available, v)); }}
                              onFocus={(e) => e.target.select()}
                              className="text-base md:text-lg font-bold w-12 text-center border-b border-gray-200 focus:border-red-400 outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button onClick={() => setUnitQty((q) => Math.min(available, q + 1))} disabled={unitQty >= available}
                              className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-500 rounded flex items-center justify-center transition-colors disabled:opacity-30">
                              <Plus size={12} weight="bold" />
                            </button>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 mt-1">
                            <span className="text-[10px] md:text-xs font-bold text-gray-600">Subtotal: {formatCurrency(unitQty * parseFloat(selectedProduct.price))}</span>
                            <span className={`text-[9px] ${remaining <= 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>(quedan {remaining})</span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                );
              })()}

              {/* Lectura balanza en vivo */}
              {connected && (selectedProduct.saleType === 'WEIGHT' || selectedProduct.saleType === 'BOTH') && (() => {
                const weightKg = weight * (unit === 'kg' ? 1 : unit === 'lb' ? 0.453592 : unit === 'g' ? 0.001 : unit === '@' ? 12.5 : 1);
                return (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-center border border-blue-100">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-[10px] md:text-xs text-blue-500">Balanza:</p>
                      <p className={`text-lg md:text-xl font-bold font-mono ${stable ? 'text-blue-700' : 'text-yellow-600'}`}>
                        {weight.toFixed(3)} {unit === '@' ? '@' : unit}
                      </p>
                      {weight > 0 && stable && (
                        <span className="text-xs font-bold text-green-600 ml-1">
                          {formatCurrency(weight * parseFloat(selectedProduct.price))}
                        </span>
                      )}
                    </div>
                    {weight > 0 && (
                      <div className="flex justify-center gap-1.5 mt-1 text-[9px] md:text-[10px]">
                        {unit !== 'kg' && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{weightKg.toFixed(3)} kg</span>}
                        {unit !== 'lb' && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{(weightKg * 2.20462).toFixed(3)} lb</span>}
                        {unit !== '@' && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{(weightKg / 12.5).toFixed(3)} @</span>}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Cart subtotal preview */}
              {cart.length > 0 && (() => {
                const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0);
                return (
                  <div className="bg-indigo-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between border border-indigo-100">
                    <div className="flex items-center gap-1.5 text-xs md:text-sm text-indigo-700">
                      <ShoppingCartSimple size={14} weight="duotone" />
                      <span>Carrito ({cart.length})</span>
                    </div>
                    <span className="text-xs md:text-sm font-bold text-indigo-700">{formatCurrency(cartTotal)}</span>
                  </div>
                );
              })()}
            </div>

            {/* Acciones */}
            <div className="px-3 py-2.5 md:px-4 md:py-3 border-t bg-gray-50 space-y-1.5 md:space-y-2 flex-shrink-0">
              {/* === PESO: Agregar con balanza → abre carrito === */}
              {(selectedProduct.saleType === 'WEIGHT' || selectedProduct.saleType === 'BOTH') && connected && (
                <button data-confirm="scale"
                  onClick={() => {
                    const ok = addWeightToCart(discountedProduct()!, true);
                    if (ok) setSelectedProduct(null);
                  }}
                  disabled={!stable || captureWeight() <= 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-xs md:text-sm"
                >
                  <Scales size={16} weight="duotone" />
                  Agregar con balanza ({captureWeight().toFixed(3)} {unit})
                </button>
              )}

              {/* === PESO: Agregar con balanza → registrar más === */}
              {(selectedProduct.saleType === 'WEIGHT' || selectedProduct.saleType === 'BOTH') && connected && (
                <button
                  onClick={() => {
                    addWeightToCart(discountedProduct()!, false);
                  }}
                  disabled={!stable || captureWeight() <= 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 md:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-xs md:text-sm"
                >
                  <Plus size={16} weight="bold" />
                  Pesar y registrar más
                </button>
              )}

              {/* === PESO: Ingreso manual (siempre disponible) === */}
              {(selectedProduct.saleType === 'WEIGHT' || selectedProduct.saleType === 'BOTH') && (
                <button data-confirm="manual"
                  onClick={() => {
                    setWeightModal(discountedProduct()!);
                    setManualWeight('');
                    setTimeout(() => weightInputRef.current?.focus(), 100);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs md:text-sm"
                >
                  <Scales size={16} weight="duotone" />
                  Ingresar peso manual
                </button>
              )}

              {/* === UNIDAD: Agregar al carrito + Ver carrito === */}
              {(selectedProduct.saleType === 'UNIT' || selectedProduct.saleType === 'BOTH') && (
                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                  <button data-confirm="unit"
                    onClick={() => {
                      const ok = addUnitsToCart(discountedProduct()!, unitQty, false);
                      if (ok) setSelectedProduct(null);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-2 md:py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-xs md:text-sm"
                  >
                    <ShoppingCartSimple size={14} weight="duotone" />
                    Agregar {unitQty > 1 ? `${unitQty}` : ''}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      if (!cartOpen) toggleCart();
                    }}
                    title="Abrir carrito sin agregar este producto"
                    className="inline-flex items-center justify-center gap-1.5 py-2 md:py-2.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors font-medium text-xs md:text-sm"
                  >
                    <ShoppingCart size={14} weight="duotone" />
                    Ver carrito
                  </button>
                </div>
              )}

              {/* === UNIDAD: Registrar más (no cierra modal en fallo de stock) === */}
              {(selectedProduct.saleType === 'UNIT' || selectedProduct.saleType === 'BOTH') && (
                <button
                  onClick={() => {
                    addUnitsToCart(discountedProduct()!, unitQty, false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 md:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs md:text-sm"
                >
                  <Plus size={16} weight="bold" />
                  Registrar mas
                </button>
              )}

              {/* === SUB-UNIDAD: Vender por sub-unidad === */}
              {selectedProduct.unitsPerPack && selectedProduct.subUnitPrice && (() => {
                const subName = selectedProduct.subUnitName || 'sub-unidad';
                const subPrice = parseFloat(selectedProduct.subUnitPrice!);
                const maxSub = Math.floor(getAvailableStock(selectedProduct.id) * selectedProduct.unitsPerPack!);
                return (
                  <div className="border-t border-amber-200 pt-1.5 mt-1 space-y-1.5">
                    <div className="flex items-center justify-between bg-amber-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[11px] font-medium text-amber-800">Por {subName}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSubUnitQty((q) => Math.max(1, q - 1))}
                          className="w-6 h-6 bg-amber-200 hover:bg-amber-300 rounded-lg flex items-center justify-center transition-colors">
                          <Minus size={11} weight="bold" />
                        </button>
                        <input
                          type="number" min="1" max={maxSub > 0 ? maxSub : 999}
                          value={subUnitQty}
                          onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setSubUnitQty(Math.min(maxSub > 0 ? maxSub : 999, v)); }}
                          onFocus={(e) => e.target.select()}
                          className="text-base font-bold w-10 text-center border-b-2 border-amber-200 focus:border-amber-500 outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button onClick={() => setSubUnitQty((q) => Math.min(maxSub > 0 ? maxSub : 999, q + 1))}
                          className="w-6 h-6 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded-lg flex items-center justify-center transition-colors">
                          <Plus size={11} weight="bold" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCart((prev) => {
                          const existing = prev.find((item) => item.productId === selectedProduct.id && item.isSubUnit);
                          if (existing) {
                            return prev.map((item) => item === existing
                              ? { ...item, quantity: item.quantity + subUnitQty, subtotal: (item.quantity + subUnitQty) * subPrice }
                              : item);
                          }
                          return [...prev, {
                            productId: selectedProduct.id,
                            name: selectedProduct.name,
                            saleType: 'UNIT',
                            quantity: subUnitQty,
                            unitPrice: subPrice,
                            subtotal: subUnitQty * subPrice,
                            isSubUnit: true,
                            subUnitName: subName,
                          }];
                        });
                        toast.success(`${subUnitQty} ${subName}(es) de ${selectedProduct.name}`);
                        setSelectedProduct(null);
                        if (!cartOpen) toggleCart();
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 md:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-xs md:text-sm"
                    >
                      <ShoppingCartSimple size={14} weight="duotone" />
                      Vender {subUnitQty} {subName}(es) - {formatCurrency(subUnitQty * subPrice)}
                    </button>
                  </div>
                );
              })()}

              {/* Acciones de escaneo continuo (sólo cuando viene del barcode) */}
              {fromBarcode && (
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 mt-1 border-t border-gray-100">
                  <button
                    onClick={() => { setSelectedProduct(null); setShowScanner(true); }}
                    title="Descarta este producto y abre el scanner"
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 md:py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-[10px] md:text-[11px] font-medium transition-colors"
                  >
                    <Barcode size={12} weight="duotone" /> Escanear otro
                  </button>
                  <button
                    onClick={() => {
                      let ok = false;
                      const dp = discountedProduct()!;
                      if (selectedProduct.saleType === 'UNIT' || selectedProduct.saleType === 'BOTH') {
                        ok = addUnitsToCart(dp, unitQty, false);
                      } else if (selectedProduct.saleType === 'WEIGHT') {
                        ok = addWeightToCart(dp, false);
                      }
                      if (!ok) return;
                      setSelectedProduct(null);
                      setShowScanner(true);
                    }}
                    title="Agrega este al carrito y abre el scanner para otro"
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 md:py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-[10px] md:text-[11px] font-medium transition-colors"
                  >
                    <Check size={12} weight="bold" /> Guardar y escanear
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal editar peso */}
      {editWeightProduct && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => { setEditWeightProduct(null); setManualWeight(''); }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} weight="bold" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <PencilSimple size={28} weight="duotone" className="text-blue-600" />
              <div>
                <h3 className="text-lg font-bold">Editar peso</h3>
                <p className="text-sm text-gray-500">{editWeightProduct.product.name}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Peso actual en carrito</p>
              <p className="text-lg font-bold text-gray-600">{cart[editWeightProduct.index]?.quantity.toFixed(3)} kg</p>
            </div>

            {/* Balanza en vivo */}
            {connected && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3 text-center border border-blue-100">
                <p className="text-xs text-blue-500 mb-1">Balanza</p>
                <p className={`text-xl font-bold font-mono ${stable ? 'text-blue-700' : 'text-yellow-600'}`}>
                  {weight.toFixed(3)} {unit}
                </p>
                {weight > 0 && stable && (
                  <button
                    onClick={() => {
                      setManualWeight(weight.toFixed(3));
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors"
                  >
                    <Scales size={14} weight="duotone" /> Usar este peso
                  </button>
                )}
              </div>
            )}

            <label className="block text-sm font-medium mb-1">Nuevo peso (kg)</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={manualWeight}
              onChange={(e) => setManualWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const newW = parseFloat(manualWeight);
                  if (newW > 0) {
                    const it = cart[editWeightProduct.index];
                    const prodE = it ? products.find((p) => p.id === it.productId) : null;
                    if (prodE && parseFloat(prodE.stockQty || '0') > 0 && it) {
                      const availE = getAvailableStock(it.productId) + it.quantity;
                      if (newW > availE) {
                        toast.error(`Solo quedan ${availE.toFixed(3)} ${it.weightUnit || 'kg'} de ${it.name}`);
                        return;
                      }
                    }
                    setCart((prev) => prev.map((p, i) =>
                      i === editWeightProduct.index ? { ...p, quantity: newW, subtotal: newW * p.unitPrice } : p
                    ));
                    toast.success(`Peso actualizado: ${newW.toFixed(3)} kg`);
                    setEditWeightProduct(null);
                    setManualWeight('');
                  }
                }
              }}
              autoFocus
              className="w-full px-3 py-3 border-2 rounded-lg text-2xl font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.000"
            />

            {manualWeight && parseFloat(manualWeight) > 0 && (
              <div className="bg-green-50 rounded-lg p-3 mt-3 text-center">
                <p className="text-xs text-gray-400">Nuevo subtotal</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(parseFloat(manualWeight) * parseFloat(editWeightProduct.product.price))}
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setEditWeightProduct(null); setManualWeight(''); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X size={16} weight="bold" /> Cancelar
              </button>
              <button
                onClick={() => {
                  const newW = parseFloat(manualWeight);
                  if (newW > 0) {
                    const it = cart[editWeightProduct.index];
                    const prodE = it ? products.find((p) => p.id === it.productId) : null;
                    if (prodE && parseFloat(prodE.stockQty || '0') > 0 && it) {
                      const availE = getAvailableStock(it.productId) + it.quantity;
                      if (newW > availE) {
                        toast.error(`Solo quedan ${availE.toFixed(3)} ${it.weightUnit || 'kg'} de ${it.name}`);
                        return;
                      }
                    }
                    setCart((prev) => prev.map((p, i) =>
                      i === editWeightProduct.index ? { ...p, quantity: newW, subtotal: newW * p.unitPrice } : p
                    ));
                    toast.success(`Peso actualizado: ${newW.toFixed(3)} kg`);
                    setEditWeightProduct(null);
                    setManualWeight('');
                  }
                }}
                disabled={!manualWeight || parseFloat(manualWeight) <= 0}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                <Check size={16} weight="bold" /> Guardar
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      {/* Modal detalle de venta */}
      {saleDetail && (<Portal>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setSaleDetail(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Receipt size={20} weight="duotone" className="text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm dark:text-white">Venta #{saleDetail.id}</h3>
                  <p className="text-[10px] text-gray-500">
                    {new Date(saleDetail.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button onClick={() => setSaleDetail(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="flex-1 overflow-auto styled-scroll">
              <ul className="divide-y dark:divide-slate-700">
                {saleDetail.items?.map((item: any) => (
                  <li key={item.id} className="px-4 py-2.5 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.product?.name || `Producto #${item.productId}`}</p>
                      <p className="text-[11px] text-gray-500">
                        {parseFloat(item.quantity).toFixed(item.isSubUnit ? 0 : 3)}
                        {item.isSubUnit ? ` ${item.product?.subUnitName || 'sub-unidad'}` : ` ${item.product?.weightUnit || ''}`}
                        {' × '}{formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">{formatCurrency(item.subtotal)}</span>
                  </li>
                )) || <li className="px-4 py-4 text-center text-xs text-gray-400">Sin items</li>}
              </ul>
            </div>

            <div className="border-t dark:border-slate-700 px-4 py-3 bg-gray-50 dark:bg-slate-900 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Pago</span>
                <span className={`px-1.5 py-0.5 rounded-lg font-medium text-[10px] ${
                  saleDetail.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' :
                  saleDetail.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {saleDetail.paymentMethod === 'CASH' ? 'Efectivo' : saleDetail.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transferencia'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold dark:text-gray-200">Total</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(saleDetail.total)}</span>
              </div>
              {saleDetail.corrected && (
                <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                  Corregida: {saleDetail.correctionReason || 'sin motivo'}
                </p>
              )}
            </div>

            <div className="border-t dark:border-slate-700 px-4 py-2.5 flex gap-2 bg-white dark:bg-slate-800">
              <button onClick={() => { setSaleDetail(null); navigate(`/sales?saleId=${saleDetail.id}`); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium">
                <ArrowSquareOut size={14} weight="duotone" /> Abrir en historial
              </button>
              <button onClick={() => { const id = saleDetail.id; setSaleDetail(null); loadSaleToCart(id); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
                <PencilSimple size={14} weight="bold" /> Editar
              </button>
            </div>
          </div>
        </div>
      </Portal>)}

      {loadingDetail && (
        <div className="fixed top-4 right-4 z-[10000] bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-lg text-xs flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Cargando detalle...
        </div>
      )}
    </div>
  );
}
