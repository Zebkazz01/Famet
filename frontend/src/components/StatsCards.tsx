import { useState } from 'react';
import { CaretDown, CaretUp, TrendUp, TrendDown, Minus } from '@phosphor-icons/react';

export interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  /** Tailwind colors para el icono. Ej: "bg-red-100 text-red-500" */
  color?: string;
  /** Texto secundario debajo del valor */
  sub?: string;
  /** Tendencia opcional: positivo (verde), negativo (rojo), neutro */
  trend?: { value: number; label?: string; positive?: boolean };
  /** Acción al click en la card */
  onClick?: () => void;
  /** Accent color para barra decorativa lateral. Ej: "from-red-500 to-red-400" */
  accent?: string;
}

interface StatsCardsProps {
  cards: StatCard[];
}

const COLLAPSED_KEY = 'fameat-stats-collapsed';

function defaultAccent(color?: string): string {
  if (!color) return 'from-gray-400 to-gray-300';
  if (color.includes('red')) return 'from-red-500 to-red-300';
  if (color.includes('green')) return 'from-green-500 to-green-300';
  if (color.includes('blue')) return 'from-blue-500 to-blue-300';
  if (color.includes('amber') || color.includes('yellow')) return 'from-amber-500 to-amber-300';
  if (color.includes('purple')) return 'from-purple-500 to-purple-300';
  if (color.includes('orange')) return 'from-orange-500 to-orange-300';
  if (color.includes('gray')) return 'from-gray-400 to-gray-300';
  return 'from-gray-400 to-gray-300';
}

export function StatsCards({ cards }: StatsCardsProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  };

  return (
    <div className="mb-5">
      {/* Toggle móvil */}
      <button onClick={toggle} className="md:hidden flex items-center gap-1.5 text-xs text-gray-500 mb-2 px-1">
        {collapsed ? <CaretDown size={12} weight="bold" /> : <CaretUp size={12} weight="bold" />}
        {collapsed ? 'Ver estadísticas' : 'Ocultar'}
      </button>

      <div className={`grid grid-cols-2 md:grid-cols-${Math.min(cards.length, 4)} gap-2 md:gap-3 ${collapsed ? 'hidden md:grid' : ''}`}>
        {cards.map((card, i) => {
          const accent = card.accent || defaultAccent(card.color);
          const TrendIcon = card.trend ? (card.trend.positive ? TrendUp : card.trend.value === 0 ? Minus : TrendDown) : null;
          return (
            <button
              key={i}
              type="button"
              onClick={card.onClick}
              disabled={!card.onClick}
              className={`group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all p-3 md:p-4 text-left overflow-hidden ${card.onClick ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
            >
              {/* Barra decorativa lateral */}
              <span className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accent}`} />
              {/* Glow del icono al hover */}
              <span className={`absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${accent} blur-2xl pointer-events-none`} />

              <div className="flex items-start gap-3 md:gap-4 relative">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${card.color || 'bg-gray-100 text-gray-500'}`}>
                  {card.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold truncate">{card.label}</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-lg md:text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100 truncate">{card.value}</p>
                    {card.trend && TrendIcon && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                        card.trend.positive ? 'text-green-600' : card.trend.value === 0 ? 'text-gray-400' : 'text-red-500'
                      }`}>
                        <TrendIcon size={10} weight="bold" />
                        {Math.abs(card.trend.value)}%
                      </span>
                    )}
                  </div>
                  {card.sub && <p className="text-[10px] text-gray-400 truncate mt-0.5">{card.sub}</p>}
                  {card.trend?.label && <p className="text-[9px] text-gray-400 truncate mt-0.5">{card.trend.label}</p>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
