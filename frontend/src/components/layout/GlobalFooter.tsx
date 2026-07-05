import { useTheme } from '../../contexts/ThemeContext';

export function GlobalFooter() {
  const { isDark } = useTheme();

  return (
    <footer className={`fixed bottom-0 left-0 right-0 py-1.5 text-center z-30 hidden md:block border-t ${
      isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
    }`}>
      <p className="text-xs text-gray-500">
        Elaborado y desarrollado por <span className="font-medium" style={{ color: '#14e0eb' }}>ByteGest</span> 2026
      </p>
    </footer>
  );
}

export function SidebarFooter() {
  const { isDark } = useTheme();

  return (
    <div className={`px-2 py-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} md:hidden`}>
      <p className="text-[10px] text-gray-500 text-center">
        Desarrollado por <span className="font-medium" style={{ color: '#14e0eb' }}>ByteGest</span> 2026
      </p>
    </div>
  );
}
