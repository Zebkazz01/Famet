import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useScale } from '../../contexts/ScaleContext';

const navItems = [
  { to: '/', label: 'Punto de Venta', icon: '🏪', roles: ['ADMIN', 'VENDEDOR'] },
  { to: '/dashboard', label: 'Dashboard', icon: '📈', roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/products', label: 'Productos', icon: '📦', roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/inventory', label: 'Inventario', icon: '📋', roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/sales', label: 'Historial Ventas', icon: '📊', roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { to: '/cash', label: 'Caja', icon: '💰', roles: ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] },
  { to: '/settings', label: 'Configuración', icon: '⚙️', roles: ['ADMIN'] },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  VENDEDOR: 'Vendedor',
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const { connected } = useScale();

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-red-500">FAMEAT</h1>
        <p className="text-xs text-gray-400">Punto de Venta</p>
      </div>

      <nav className="flex-1 p-2">
        {navItems
          .filter((item) => item.roles.includes(user?.role || ''))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded text-sm mb-1 transition-colors ${
                  isActive ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">
            Balanza: {connected ? 'Conectada' : 'No conectada'}
          </span>
        </div>
        <div className="text-sm text-gray-300 mb-2">
          {user?.name} ({roleLabels[user?.role || ''] || user?.role})
        </div>
        <button
          onClick={logout}
          className="w-full text-xs text-gray-400 hover:text-white py-1 px-2 rounded hover:bg-gray-800 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
