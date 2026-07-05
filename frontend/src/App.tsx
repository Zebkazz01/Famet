import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ScaleProvider } from './contexts/ScaleContext';
import { PanelProvider } from './contexts/PanelContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ScaleConnectionModal } from './components/ScaleConnectionModal';
import { GlobalHeader } from './components/layout/GlobalHeader';
import { InstallBanner } from './pwa/InstallBanner';
import { SetupBanner } from './components/SetupBanner';
import { LoginPage } from './pages/LoginPage';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { CashPage } from './pages/CashPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CustomersPage } from './pages/CustomersPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { BackupsPage } from './pages/BackupsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useConfigVersion } from './hooks/useConfigVersion';

function AppRoutes() {
  const { user } = useAuth();

  return (
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
        <Route path="/expenses" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><ExpensesPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><ReportsPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><CategoriesPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR', 'VENDEDOR']}><ErrorBoundary><CustomersPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ErrorBoundary><PurchaseOrdersPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/backups" element={<ProtectedRoute roles={['ADMIN']}><ErrorBoundary><BackupsPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><ErrorBoundary><SettingsPage /></ErrorBoundary></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>} />
    </Routes>
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
                  <AuthenticatedApp />
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
