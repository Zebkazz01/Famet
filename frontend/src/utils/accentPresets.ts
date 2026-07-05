// Paletas de color de acento. Cada preset reemplaza el palette `red-*` de Tailwind
// vía CSS variables. Los valores están elegidos para mantener buen contraste WCAG AA
// sobre fondos blancos (light) y oscuros (dark).

export interface AccentShades {
  '50': string;
  '100': string;
  '200': string;
  '300': string;
  '400': string;
  '500': string;
  '600': string;
  '700': string;
  '800': string;
  '900': string;
}

export interface AccentPreset {
  id: string;
  label: string;
  description: string;
  swatch: string; // color principal para el preview
  shades: AccentShades;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'rojo',
    label: 'Rojo Carne',
    description: 'Color clásico del negocio. Vibrante y enérgico.',
    swatch: '#ef4444',
    shades: {
      '50':  '#fef2f2',
      '100': '#fee2e2',
      '200': '#fecaca',
      '300': '#fca5a5',
      '400': '#f87171',
      '500': '#ef4444',
      '600': '#dc2626',
      '700': '#b91c1c',
      '800': '#991b1b',
      '900': '#7f1d1d',
    },
  },
  {
    id: 'azul',
    label: 'Azul Profesional',
    description: 'Confianza y formalidad. Buen contraste.',
    swatch: '#2563eb',
    shades: {
      '50':  '#eff6ff',
      '100': '#dbeafe',
      '200': '#bfdbfe',
      '300': '#93c5fd',
      '400': '#60a5fa',
      '500': '#3b82f6',
      '600': '#2563eb',
      '700': '#1d4ed8',
      '800': '#1e40af',
      '900': '#1e3a8a',
    },
  },
  {
    id: 'verde',
    label: 'Verde Esmeralda',
    description: 'Frescura y crecimiento. Ideal para alimentos frescos.',
    swatch: '#059669',
    shades: {
      '50':  '#ecfdf5',
      '100': '#d1fae5',
      '200': '#a7f3d0',
      '300': '#6ee7b7',
      '400': '#34d399',
      '500': '#10b981',
      '600': '#059669',
      '700': '#047857',
      '800': '#065f46',
      '900': '#064e3b',
    },
  },
  {
    id: 'naranja',
    label: 'Naranja Cálido',
    description: 'Energía y apetito. Llamativo y amigable.',
    swatch: '#ea580c',
    shades: {
      '50':  '#fff7ed',
      '100': '#ffedd5',
      '200': '#fed7aa',
      '300': '#fdba74',
      '400': '#fb923c',
      '500': '#f97316',
      '600': '#ea580c',
      '700': '#c2410c',
      '800': '#9a3412',
      '900': '#7c2d12',
    },
  },
  {
    id: 'violeta',
    label: 'Violeta Premium',
    description: 'Sofisticación y exclusividad.',
    swatch: '#7c3aed',
    shades: {
      '50':  '#f5f3ff',
      '100': '#ede9fe',
      '200': '#ddd6fe',
      '300': '#c4b5fd',
      '400': '#a78bfa',
      '500': '#8b5cf6',
      '600': '#7c3aed',
      '700': '#6d28d9',
      '800': '#5b21b6',
      '900': '#4c1d95',
    },
  },
  {
    id: 'cian',
    label: 'Cian Moderno',
    description: 'Tecnológico y limpio.',
    swatch: '#0891b2',
    shades: {
      '50':  '#ecfeff',
      '100': '#cffafe',
      '200': '#a5f3fc',
      '300': '#67e8f9',
      '400': '#22d3ee',
      '500': '#06b6d4',
      '600': '#0891b2',
      '700': '#0e7490',
      '800': '#155e75',
      '900': '#164e63',
    },
  },
  {
    id: 'rosa',
    label: 'Rosa Vibrante',
    description: 'Acogedor y femenino.',
    swatch: '#db2777',
    shades: {
      '50':  '#fdf2f8',
      '100': '#fce7f3',
      '200': '#fbcfe8',
      '300': '#f9a8d4',
      '400': '#f472b6',
      '500': '#ec4899',
      '600': '#db2777',
      '700': '#be185d',
      '800': '#9d174d',
      '900': '#831843',
    },
  },
  {
    id: 'oscuro',
    label: 'Carbón Elegante',
    description: 'Minimalista y elegante. Máximo contraste.',
    swatch: '#334155',
    shades: {
      '50':  '#f8fafc',
      '100': '#f1f5f9',
      '200': '#e2e8f0',
      '300': '#cbd5e1',
      '400': '#94a3b8',
      '500': '#64748b',
      '600': '#475569',
      '700': '#334155',
      '800': '#1e293b',
      '900': '#0f172a',
    },
  },
];

export const DEFAULT_ACCENT_ID = 'rojo';

export function getAccentById(id: string | null | undefined): AccentPreset {
  if (!id) return ACCENT_PRESETS[0];
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
}

/**
 * Aplica el preset de acento sobreescribiendo las CSS variables de Tailwind
 * (`--color-red-*`) a nivel de `<html>`. Como tienen máxima especificidad
 * (inline style), reemplazan los valores que Tailwind v4 inyecta en `:root`.
 * Resultado: TODAS las clases `bg-red-*`, `text-red-*`, etc., usan el nuevo color.
 */
export function applyAccent(presetId: string | null | undefined): void {
  const preset = getAccentById(presetId);
  const root = document.documentElement.style;
  (Object.keys(preset.shades) as Array<keyof AccentShades>).forEach((shade) => {
    root.setProperty(`--color-red-${shade}`, preset.shades[shade]);
    // Custom alias para usar en componentes con var(--accent-N)
    root.setProperty(`--accent-${shade}`, preset.shades[shade]);
  });
  root.setProperty('--accent-swatch', preset.swatch);
}
