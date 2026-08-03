import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSystemDiagnostic } from '../hooks/useSystemDiagnostic';
import { useConfig } from '../contexts/ConfigContext';
import { GlobalFooter } from '../components/layout/GlobalFooter';
import { NetworkInfo } from '../components/NetworkInfo';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  useSystemDiagnostic();
  const { config } = useConfig();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      const data = err.response?.data;
      const msg = typeof data?.error === 'string' ? data.error : data?.message || 'Error al iniciar sesión';
      setError(typeof msg === 'string' ? msg : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <img src={config.businessLogo || '/pwa/icons/icon-any-96.png'} alt={config.businessName} className="w-16 h-16 mx-auto mb-3 rounded-xl object-cover" />
          <h1 className="text-3xl font-bold text-red-500">{config.businessName}</h1>
          <p className="text-gray-500 text-sm">Punto de Venta</p>
        </div>

        <form id="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4 animate-pulse">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              placeholder="admin"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          admin / admin123 | supervisor1 / super123 | cajero1 / cajero123
        </p>

        <NetworkInfo />
      </div>
      <GlobalFooter />
    </div>
  );
}
