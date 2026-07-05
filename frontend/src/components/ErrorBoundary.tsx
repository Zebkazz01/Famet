import { Component, type ReactNode } from 'react';
import { WarningCircle, ArrowLeft, ArrowClockwise } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
  fallbackPath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorView error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

export function ErrorView({ error, onRetry }: { error?: Error | null; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-4">
        <WarningCircle size={36} weight="duotone" className="text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Vista no disponible</h2>
      <p className="text-sm text-gray-500 mb-1 max-w-sm">
        Ocurrio un problema al cargar esta seccion. Puede ser un error temporal de conexion.
      </p>
      {error && (
        <p className="text-[10px] text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-1.5 mt-2 max-w-sm truncate">
          {error.message}
        </p>
      )}
      <div className="flex gap-3 mt-6">
        <button onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} weight="bold" /> Volver
        </button>
        <button onClick={onRetry || (() => window.location.reload())}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
          <ArrowClockwise size={16} weight="bold" /> Reintentar
        </button>
      </div>
    </div>
  );
}
