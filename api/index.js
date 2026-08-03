const path = require('path');

const HANDLERS = {};

function loadHandler(name, mod) {
  HANDLERS[name] = mod;
}

const health = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({ status:'ok', timestamp:new Date().toISOString() }); }};
loadHandler('health', health);

const login = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'}); const USERS=[{id:1,username:'admin',password:'admin123',firstName:'Admin',lastName:'Sistema',role:'ADMIN'},{id:2,username:'supervisor1',password:'super123',firstName:'María',lastName:'García',role:'SUPERVISOR'},{id:3,username:'cajero1',password:'cajero123',firstName:'Carlos',lastName:'López',role:'VENDEDOR'}]; const{username,password}=req.body||{}; const user=USERS.find(u=>u.username===username&&u.password===password); if(!user) return res.status(401).json({error:'Credenciales inválidas'}); const{password:_,...u}=user; res.status(200).json({token:`demo_${user.id}`,user:u}); }};
loadHandler('login', login);

const configPublic = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({businessName:'Minimercado El Castillo',businessAddress:'Cra 5 #2f-03',businessPhone:'3187226478',businessLogo:null,currency:'COP',currencySymbol:'$'}); }};
loadHandler('config-public', configPublic);

const configIndex = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,PUT,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='PUT'||req.method==='POST') return res.status(200).json({ok:true}); res.status(200).json({business_name:'Minimercado El Castillo',business_address:'Cra 5 #2f-03',business_phone:'3187226478',business_logo:null,logo_version:0,config_version:1,accent_color:'cian',currency:'COP',currency_symbol:'$',scale_port:'COM3',scale_baud_rate:'9600',tax_enabled:'false',tax_rate:'0'}); }};
loadHandler('config', configIndex);

const PRODUCTS=[
{id:1,name:'Huevos AA',price:'15000.00',stockQty:'150.000',saleType:'BOTH',weightUnit:'ud',category:{id:1,name:'Lácteos',color:'#10B981'},subUnitPrice:'500.00',subUnitName:'Huevo',unitsPerPack:30},
{id:2,name:'Muslo de Pollo',price:'9500.00',stockQty:'25.500',saleType:'WEIGHT',weightUnit:'lb',category:{id:2,name:'Carnes',color:'#EF4444'}},
{id:3,name:'Pechuga de Pollo',price:'12000.00',stockQty:'18.300',saleType:'WEIGHT',weightUnit:'lb',category:{id:2,name:'Carnes',color:'#EF4444'}},
{id:4,name:'Lomo de Res',price:'28000.00',stockQty:'12.800',saleType:'WEIGHT',weightUnit:'lb',category:{id:2,name:'Carnes',color:'#EF4444'}},
{id:5,name:'Cerveza Águila',price:'3500.00',stockQty:'48.000',saleType:'UNIT',weightUnit:'und',category:{id:3,name:'Bebidas',color:'#3B82F6'}},
{id:6,name:'Chorizo artesanal',price:'18000.00',stockQty:'8.200',saleType:'WEIGHT',weightUnit:'lb',category:{id:4,name:'Embutidos',color:'#F59E0B'}},
{id:7,name:'Camarón importado',price:'45000.00',stockQty:'5.500',saleType:'WEIGHT',weightUnit:'lb',category:{id:5,name:'Mariscos',color:'#06B6D4'}},
{id:8,name:'Gaseosa Coca-Cola 1.5L',price:'5500.00',stockQty:'36.000',saleType:'UNIT',weightUnit:'und',category:{id:3,name:'Bebidas',color:'#3B82F6'}}
];
const CATEGORIES=[{id:1,name:'Lácteos',color:'#10B981',active:true},{id:2,name:'Carnes',color:'#EF4444',active:true},{id:3,name:'Bebidas',color:'#3B82F6',active:true},{id:4,name:'Embutidos',color:'#F59E0B',active:true},{id:5,name:'Mariscos',color:'#06B6D4',active:true},{id:6,name:'Varios',color:'#8B5CF6',active:true}];
const SALES=[
{id:1001,total:'27500.00',paymentMethod:'CASH',createdAt:'2026-06-01T14:30:00.000Z',user:{firstName:'Carlos',lastName:'López'},_count:{items:2},items:[{product:{name:'Huevos AA'},quantity:'1.000',subtotal:'15000.00'},{product:{name:'Muslo de Pollo'},quantity:'1.310',subtotal:'12500.00'}]},
{id:1002,total:'12000.00',paymentMethod:'CARD',createdAt:'2026-06-01T13:15:00.000Z',user:{firstName:'Carlos',lastName:'López'},_count:{items:1},items:[{product:{name:'Pechuga de Pollo'},quantity:'1.000',subtotal:'12000.00'}]},
{id:1003,total:'45500.00',paymentMethod:'CASH',createdAt:'2026-06-01T11:45:00.000Z',user:{firstName:'María',lastName:'García'},_count:{items:2},items:[{product:{name:'Lomo de Res'},quantity:'1.000',subtotal:'28000.00'},{product:{name:'Cerveza Águila'},quantity:'5.000',subtotal:'17500.00'}]},
{id:1004,total:'8500.00',paymentMethod:'TRANSFER',createdAt:'2026-06-01T10:20:00.000Z',user:{firstName:'Carlos',lastName:'López'},_count:{items:2},items:[{product:{name:'Cerveza Águila'},quantity:'1.000',subtotal:'3500.00'},{product:{name:'Gaseosa Coca-Cola 1.5L'},quantity:'1.000',subtotal:'5500.00'}]}
];
const CUSTOMERS=[{id:1,name:'Juan Pérez',phone:'3101234567',document:'1234567890',currentDebt:'0.00',creditLimit:'500000.00',discountPercent:'5.00',active:true},{id:2,name:'María García',phone:'3159876543',document:'0987654321',currentDebt:'25000.00',creditLimit:'300000.00',discountPercent:null,active:true}];
const SUPPLIERS=[{id:1,name:'Distribuidora Central',nit:'900123456',phone:'3101112233',email:'ventas@distcentral.com',active:true},{id:2,name:'Avícola del Norte',nit:'900789012',phone:'3154445566',contact:'pedidos@avinorte.com',active:true}];
const EXPENSES=[{id:1,amount:'50000.00',description:'Servicios públicos',category:'Servicios',date:'2026-06-01T00:00:00.000Z',paymentMethod:'CASH'},{id:2,amount:'25000.00',description:'Papelería',category:'Suministros',date:'2026-06-01T00:00:00.000Z',paymentMethod:'CARD'}];
const USERS=[{id:1,firstName:'Admin',lastName:'Sistema',role:'ADMIN'},{id:2,firstName:'María',lastName:'García',role:'SUPERVISOR'},{id:3,firstName:'Carlos',lastName:'López',role:'VENDEDOR'}];

const productsHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:PRODUCTS.length+1,...req.body,category:req.body.category||{id:6,name:'Varios',color:'#8B5CF6'}}); res.status(200).json(PRODUCTS); }};
loadHandler('products', productsHandler);

const categoriesHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:CATEGORIES.length+1,...req.body,active:true}); res.status(200).json(CATEGORIES); }};
loadHandler('categories', categoriesHandler);

const salesHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:Date.now(),...req.body,createdAt:new Date().toISOString(),items:[]}); res.status(200).json(SALES); }};
loadHandler('sales', salesHandler);

const customersHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:Date.now(),...req.body,active:true}); res.status(200).json(CUSTOMERS); }};
loadHandler('customers', customersHandler);

const suppliersHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:Date.now(),...req.body,active:true}); res.status(200).json(SUPPLIERS); }};
loadHandler('suppliers', suppliersHandler);

const expensesHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:Date.now(),...req.body}); res.status(200).json(EXPENSES); }};
loadHandler('expenses', expensesHandler);

const usersHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json(USERS); }};
loadHandler('users', usersHandler);

const emptyArrayHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:Date.now(),ok:true}); res.status(200).json([]); }};
loadHandler('scale-ports', emptyArrayHandler);
loadHandler('cash-movements', emptyArrayHandler);
loadHandler('cash-closings', emptyArrayHandler);
loadHandler('inventory-movements', emptyArrayHandler);
loadHandler('backup-list', emptyArrayHandler);
loadHandler('animal-parts', emptyArrayHandler);
loadHandler('barcodes', emptyArrayHandler);

const inventoryAlerts = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json([{id:6,name:'Chorizo artesanal',stockQty:8.2,minStock:2,categoryName:'Embutidos'}]); }};
loadHandler('inventory-alerts', inventoryAlerts);

const notificationsHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({items:[],nextCursor:null}); }};
loadHandler('notifications', notificationsHandler);

const unreadCountHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({count:0}); }};
loadHandler('unread-count', unreadCountHandler);

const preferencesHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='PUT') return res.status(200).json({ok:true}); if(req.method==='DELETE') return res.status(200).json({ok:true}); res.status(200).json({menu_order:'[]'}); }};
loadHandler('preferences', preferencesHandler);

const menuOrderHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({menuOrder:[]}); }};
loadHandler('menu-order', menuOrderHandler);

const dashboardAnalytics = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({range:{start:'2026-05-02',end:'2026-06-01',days:30},totals:{revenue:93500,expenses:75000,profit:18500,salesCount:4,avgTicket:23375},creditSummary:{salesCount:0,totalAmount:0,pendingAmount:25000,customersWithDebt:1},dailySeries:[{date:'2026-06-01',revenue:93500,count:4,expenses:75000,profit:18500},{date:'2026-05-31',revenue:67000,count:3,expenses:45000,profit:22000},{date:'2026-05-30',revenue:82000,count:5,expenses:52000,profit:30000},{date:'2026-05-29',revenue:55000,count:2,expenses:38000,profit:17000},{date:'2026-05-28',revenue:71000,count:4,expenses:41000,profit:30000},{date:'2026-05-27',revenue:98000,count:6,expenses:60000,profit:38000},{date:'2026-05-26',revenue:45000,count:2,expenses:30000,profit:15000}],byCategory:[{name:'Carnes',revenue:49500,qty:3},{name:'Lácteos',revenue:15000,qty:1},{name:'Bebidas',revenue:26500,qty:6},{name:'Mariscos',revenue:0,qty:0},{name:'Embutidos',revenue:0,qty:0}],topProducts:[{id:4,name:'Lomo de Res',revenue:28000,qty:1},{id:1,name:'Huevos AA',revenue:15000,qty:1},{id:3,name:'Pechuga de Pollo',revenue:12000,qty:1},{id:5,name:'Cerveza Águila',revenue:17500,qty:5},{id:8,name:'Gaseosa Coca-Cola 1.5L',revenue:5500,qty:1}],byHour:[{hour:8,revenue:15000,count:1},{hour:10,revenue:8500,count:1},{hour:11,revenue:45500,count:1},{hour:13,revenue:12000,count:1},{hour:14,revenue:12500,count:1}],byPaymentMethod:[{method:'CASH',total:73000,count:3},{method:'CARD',total:12000,count:1},{method:'TRANSFER',total:8500,count:1}],byUser:[{id:1,name:'Carlos López',revenue:48000,count:3},{id:2,name:'María García',revenue:45500,count:1}],lowStock:[{id:6,name:'Chorizo artesanal',stockQty:8.2,minStock:2,category:'Embutidos'}],expiringSoon:[{id:1,productName:'Huevos AA',expiryDate:'2026-06-15',qty:30,daysLeft:14}],forecastSeries:[{date:'2026-06-02',revenue:65000},{date:'2026-06-03',revenue:72000},{date:'2026-06-04',revenue:58000},{date:'2026-06-05',revenue:80000},{date:'2026-06-06',revenue:69000},{date:'2026-06-07',revenue:95000}],topProductsForecast:[{id:4,name:'Lomo de Res',revenue:28000,qty:1,qtyPerDay:0.03,projectedQty7d:0.21,projectedRevenue7d:5880},{id:5,name:'Cerveza Águila',revenue:17500,qty:5,qtyPerDay:0.17,projectedQty7d:1.17,projectedRevenue7d:4083},{id:1,name:'Huevos AA',revenue:15000,qty:1,qtyPerDay:0.03,projectedQty7d:0.23,projectedRevenue7d:3500}]}); }};
loadHandler('dashboard-analytics', dashboardAnalytics);

const salesSummary = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({totalSales:93500,totalTransactions:4,cashTotal:73000,cardTotal:12000,transferTotal:8500,date:req.query.date||'2026-06-01'}); }};
loadHandler('sales-summary', salesSummary);

const cashStatus = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({isOpen:true,openingAmount:200000,currentBalance:247500,openedBy:{firstName:'Carlos',lastName:'López'},openedAt:'2026-06-01T08:00:00.000Z'}); }};
loadHandler('cash-status', cashStatus);

const reportsSales = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({items:[],total:0}); }};
loadHandler('reports-sales', reportsSales);

const reportsFinancial = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({totalRevenue:93500,totalExpenses:75000,netProfit:18500,categoryBreakdown:[]}); }};
loadHandler('reports-financial', reportsFinancial);

const reportsInventory = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({items:[],totalProducts:8}); }};
loadHandler('reports-inventory', reportsInventory);

const purchaseOrders = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:Date.now(),...req.body}); res.status(200).json({items:[],nextCursor:null}); }};
loadHandler('purchase-orders', purchaseOrders);

const discountRules = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:Date.now(),...req.body}); res.status(200).json({items:[],nextCursor:null}); }};
loadHandler('discount-rules', discountRules);

const manifestHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.setHeader('Content-Type','application/json'); res.status(200).json({name:'FAMEAT POS',short_name:'FAMEAT',description:'Sistema de Punto de Venta',start_url:'/',display:'standalone',background_color:'#ffffff',theme_color:'#dc2626',icons:[]}); }};
loadHandler('manifest.json', manifestHandler);

const networkHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({ip:'127.0.0.1',port:3000,hostname:'localhost'}); }};
loadHandler('network', networkHandler);

const processingHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); if(req.method==='POST') return res.status(201).json({id:Date.now(),...req.body}); res.status(200).json([]); }};
loadHandler('processing', processingHandler);

const processingSummaryHandler = { default: (req, res) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(200).end(); res.status(200).json({month:'2026-06',activeBatches:0,totalInvested:0,totalOutputWeight:0,totalRecoveredCost:0,totalRecoveredRevenue:0,recoveryPct:0,pendingRecovery:0}); }};
loadHandler('processing/summary', processingSummaryHandler);

const ROUTE_MAP = {
  'health': 'health',
  'auth/login': 'login',
  'config/public': 'config-public',
  'config': 'config',
  'products': 'products',
  'categories': 'categories',
  'sales': 'sales',
  'customers': 'customers',
  'suppliers': 'suppliers',
  'expenses': 'expenses',
  'users': 'users',
  'scale/ports': 'scale-ports',
  'cash/movements': 'cash-movements',
  'cash/closings': 'cash-closings',
  'cash/status': 'cash-status',
  'inventory/movements': 'inventory-movements',
  'inventory/alerts': 'inventory-alerts',
  'backup/list': 'backup-list',
  'notifications/unread-count': 'unread-count',
  'notifications': 'notifications',
  'preferences/menu_order': 'menu-order',
  'preferences': 'preferences',
  'dashboard/analytics': 'dashboard-analytics',
  'sales/summary': 'sales-summary',
  'animal-parts': 'animal-parts',
  'barcodes': 'barcodes',
  'reports/sales': 'reports-sales',
  'reports/financial': 'reports-financial',
  'reports/inventory': 'reports-inventory',
  'purchase-orders': 'purchase-orders',
  'discount-rules': 'discount-rules',
  'manifest.json': 'manifest.json',
  'network': 'network',
  'processing': 'processing',
  'processing/summary': 'processing/summary',
};

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, 'http://localhost');
  let pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    pathname = pathname.slice(5);
  }

  pathname = pathname.replace(/^\/+|\/+$/g, '');

  if (pathname === '') {
    return res.status(200).json({ status: 'ok', message: 'FAMEAT POS API' });
  }

  let handlerKey = ROUTE_MAP[pathname];

  if (!handlerKey) {
    for (const [route, key] of Object.entries(ROUTE_MAP)) {
      if (pathname.startsWith(route + '/')) {
        handlerKey = key;
        break;
      }
    }
  }

  if (!handlerKey) {
    return res.status(404).json({ error: 'Not found', path: pathname });
  }

  const mod = HANDLERS[handlerKey];
  if (!mod || !mod.default) {
    return res.status(500).json({ error: 'Handler not found: ' + handlerKey });
  }

  req.query = Object.fromEntries(url.searchParams);

  return mod.default(req, res);
};
