import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ScaleProvider } from './contexts/ScaleContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ScaleConnectionModal } from './components/ScaleConnectionModal';
import { LoginPage } from './pages/LoginPage';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { CashPage } from './pages/CashPage';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<POSPage />} />
        <Route path="/dashboard" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><ProductsPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/cash" element={<CashPage />} />
        <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();

  return (
    <>
      <AppRoutes />
      {user && <ScaleConnectionModal />}
      <Toaster position="top-right" />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScaleProvider>
          <AuthenticatedApp />
        </ScaleProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
