import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../contexts/ThemeContext';

export function AppLayout() {
  const location = useLocation();
  const { isDark } = useTheme();
  return (
    <div className={`flex flex-1 h-full relative ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="relative z-10 flex flex-1 min-w-0">
        <Sidebar />
        <main className="flex-1 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 relative mx-2 mb-2">
          {/* Esferas decorativas detrás del contenido, clipadas por rounded-2xl */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0" aria-hidden="true">
            <div
              className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--accent-400) 35%, transparent), color-mix(in oklab, var(--accent-300) 18%, transparent) 55%, transparent 80%)' }}
            />
            <div
              className="absolute top-1/3 -right-32 w-[34rem] h-[34rem] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle at 70% 40%, color-mix(in oklab, var(--accent-500) 30%, transparent), color-mix(in oklab, var(--accent-300) 15%, transparent) 55%, transparent 80%)' }}
            />
            <div
              className="absolute -bottom-40 left-1/4 w-[26rem] h-[26rem] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--accent-400) 28%, transparent), color-mix(in oklab, var(--accent-200) 18%, transparent) 55%, transparent 80%)' }}
            />
            <div
              className="absolute top-10 right-1/3 w-72 h-72 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--accent-300) 22%, transparent), transparent 70%)' }}
            />
          </div>
          <div key={location.pathname} className={`page-transition h-full relative z-10${location.pathname !== '/' ? ' overflow-y-auto styled-scroll' : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
