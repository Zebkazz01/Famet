export const API_URL = '/api';

export const ROLES = {
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
} as const;

export const SALE_TYPES = {
  WEIGHT: 'WEIGHT',
  UNIT: 'UNIT',
  BOTH: 'BOTH',
} as const;

export const PAYMENT_METHODS = {
  CASH: { key: 'CASH', label: 'Efectivo' },
  CARD: { key: 'CARD', label: 'Tarjeta' },
  TRANSFER: { key: 'TRANSFER', label: 'Transferencia' },
} as const;

export const MOVEMENT_TYPES = {
  ENTRY: { key: 'ENTRY', label: 'Entrada', color: 'text-green-600' },
  SALE: { key: 'SALE', label: 'Venta', color: 'text-blue-600' },
  ADJUSTMENT: { key: 'ADJUSTMENT', label: 'Ajuste', color: 'text-yellow-600' },
  LOSS: { key: 'LOSS', label: 'Merma', color: 'text-red-600' },
  RETURN: { key: 'RETURN', label: 'Devolución', color: 'text-purple-600' },
} as const;
