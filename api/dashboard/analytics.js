export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({
    range: { start: '2026-05-02', end: '2026-06-01', days: 30 },
    totals: { revenue: 93500, expenses: 75000, profit: 18500, salesCount: 4, avgTicket: 23375 },
    creditSummary: { salesCount: 0, totalAmount: 0, pendingAmount: 25000, customersWithDebt: 1 },
    dailySeries: [
      { date: '2026-06-01', revenue: 93500, count: 4, expenses: 75000, profit: 18500 },
      { date: '2026-05-31', revenue: 67000, count: 3, expenses: 45000, profit: 22000 },
      { date: '2026-05-30', revenue: 82000, count: 5, expenses: 52000, profit: 30000 },
      { date: '2026-05-29', revenue: 55000, count: 2, expenses: 38000, profit: 17000 },
      { date: '2026-05-28', revenue: 71000, count: 4, expenses: 41000, profit: 30000 },
      { date: '2026-05-27', revenue: 98000, count: 6, expenses: 60000, profit: 38000 },
      { date: '2026-05-26', revenue: 45000, count: 2, expenses: 30000, profit: 15000 }
    ],
    byCategory: [
      { name: 'Carnes', revenue: 49500, qty: 3 },
      { name: 'Lácteos', revenue: 15000, qty: 1 },
      { name: 'Bebidas', revenue: 26500, qty: 6 },
      { name: 'Mariscos', revenue: 0, qty: 0 },
      { name: 'Embutidos', revenue: 0, qty: 0 }
    ],
    topProducts: [
      { id: 4, name: 'Lomo de Res', revenue: 28000, qty: 1 },
      { id: 1, name: 'Huevos AA', revenue: 15000, qty: 1 },
      { id: 3, name: 'Pechuga de Pollo', revenue: 12000, qty: 1 },
      { id: 5, name: 'Cerveza Águila', revenue: 17500, qty: 5 },
      { id: 8, name: 'Gaseosa Coca-Cola 1.5L', revenue: 5500, qty: 1 }
    ],
    byHour: [
      { hour: 8, revenue: 15000, count: 1 },
      { hour: 10, revenue: 8500, count: 1 },
      { hour: 11, revenue: 45500, count: 1 },
      { hour: 13, revenue: 12000, count: 1 },
      { hour: 14, revenue: 12500, count: 1 }
    ],
    byPaymentMethod: [
      { method: 'CASH', total: 73000, count: 3 },
      { method: 'CARD', total: 12000, count: 1 },
      { method: 'TRANSFER', total: 8500, count: 1 }
    ],
    byUser: [
      { id: 1, name: 'Carlos López', revenue: 48000, count: 3 },
      { id: 2, name: 'María García', revenue: 45500, count: 1 }
    ],
    lowStock: [
      { id: 6, name: 'Chorizo artesanal', stockQty: 8.2, minStock: 2, category: 'Embutidos' }
    ],
    expiringSoon: [
      { id: 1, productName: 'Huevos AA', expiryDate: '2026-06-15', qty: 30, daysLeft: 14 }
    ],
    forecastSeries: [
      { date: '2026-06-02', revenue: 65000 },
      { date: '2026-06-03', revenue: 72000 },
      { date: '2026-06-04', revenue: 58000 },
      { date: '2026-06-05', revenue: 80000 },
      { date: '2026-06-06', revenue: 69000 },
      { date: '2026-06-07', revenue: 95000 }
    ],
    topProductsForecast: [
      { id: 4, name: 'Lomo de Res', revenue: 28000, qty: 1, qtyPerDay: 0.03, projectedQty7d: 0.21, projectedRevenue7d: 5880 },
      { id: 5, name: 'Cerveza Águila', revenue: 17500, qty: 5, qtyPerDay: 0.17, projectedQty7d: 1.17, projectedRevenue7d: 4083 },
      { id: 1, name: 'Huevos AA', revenue: 15000, qty: 1, qtyPerDay: 0.03, projectedQty7d: 0.23, projectedRevenue7d: 3500 }
    ]
  });
}
