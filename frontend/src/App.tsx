import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ScaleProvider } from './contexts/ScaleContext';
import { PanelProvider } from './contexts/PanelContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModalStackProvider } from './contexts/ModalStackContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ScaleConnectionModal } from './components/ScaleConnectionModal';
import { GlobalHeader } from './components/layout/GlobalHeader';
import { InstallBanner } from './pwa/InstallBanner';
import { SetupBanner } from './components/SetupBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useConfigVersion } from './hooks/useConfigVersion';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const POSPage = lazy(() => import('./pages/POSPage').then(m => ({ default: m.POSPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const SalesPage = lazy(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CashPage = lazy(() => import('./pages/CashPage').then(m => ({ default: m.CashPage })));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })));
const ProcessingPage = lazy(() => import('./pages/ProcessingPage').then(m => ({ default: m.ProcessingPage })));
const BackupsPage = lazy(() => import('./pages/BackupsPage').then(m => ({ default: m.BackupsPage })));

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">Cargando...</p>
        </div>
      </div>
    }>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<ErrorBoundary><POSPage /></ErrorBoundary>} />
          <Route path="/dashboard" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><DashboardPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><ProductsPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><InventoryPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/sales" element={<ErrorBoundary><SalesPage /></ErrorBoundary>} />
          <Route path="/cash" element={<ErrorBoundary><CashPage /></ErrorBoundary>} />
          <Route path="/suppliers" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><SuppliersPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
          <Route path="/expenses" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR', 'VENDEDOR']}><ErrorBoundary><ExpensesPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><ReportsPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><CategoriesPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR', 'VENDEDOR']}><ErrorBoundary><CustomersPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><PurchaseOrdersPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/processing" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><ProcessingPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/processing/new" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><ProcessingPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/processing/:id" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><ProcessingPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/backups" element={<ProtectedRoute roles={['ADMIN']}><ErrorBoundary><BackupsPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><ErrorBoundary><SettingsPage /></ErrorBoundary></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>} />
      </Routes>
    </Suspense>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  useConfigVersion();

  return (
    <>
      <GlobalHeader />
      <div className="fixed top-14 bottom-0 left-0 right-0 flex flex-col bg-gray-100 dark:bg-slate-900">
        <AppRoutes />
      </div>
      {user && <ScaleConnectionModal />}
      <SetupBanner />
      <InstallBanner />
      <Toaster
        position="top-center"
        containerStyle={{ zIndex: 99999, top: 56 }}
        toastOptions={{ style: { zIndex: 99999 } }}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ScaleProvider>
            <PanelProvider>
              <ConfigProvider>
                <NotificationProvider>
                  <ModalStackProvider>
                    <AuthenticatedApp />
                  </ModalStackProvider>
                </NotificationProvider>
              </ConfigProvider>
            </PanelProvider>
          </ScaleProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
