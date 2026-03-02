export interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
  raw: string;
}

/**
 * Parser multi-formato para balanzas chinas comunes.
 * Soporta 3 protocolos:
 * - Formato A: "ST,GS,+ 1.250kg" o "US,GS,+ 1.250kg"
 * - Formato B: "= 1.250 kg" o "+ 1.250 kg"
 * - Formato C: numérico puro como "0001.250"
 */
export function parseScaleData(raw: string): ScaleReading | null {
  const line = raw.trim();
  if (!line) return null;

  // Formato A: ST,GS,+  1.250kg  o  US,NT,- 0.500kg
  const formatA = line.match(/^(ST|US),(GS|NT),([+-])\s*([\d.]+)\s*(kg|g|lb)?/i);
  if (formatA) {
    const stable = formatA[1].toUpperCase() === "ST";
    const sign = formatA[3] === "-" ? -1 : 1;
    const weight = parseFloat(formatA[4]) * sign;
    const unit = (formatA[5] || "kg").toLowerCase();
    return { weight, unit, stable, raw: line };
  }

  // Formato B: "= 1.250 kg" o "+ 1.250 kg" o "- 0.000 kg"
  const formatB = line.match(/^([=+-])\s*([\d.]+)\s*(kg|g|lb)?/i);
  if (formatB) {
    const stable = formatB[1] === "=";
    const sign = formatB[1] === "-" ? -1 : 1;
    const weight = parseFloat(formatB[2]) * sign;
    const unit = (formatB[3] || "kg").toLowerCase();
    return { weight, unit, stable, raw: line };
  }

  // Formato C: numérico puro "0001.250" o "1.250"
  const formatC = line.match(/^-?([\d]{1,7}\.[\d]{1,4})$/);
  if (formatC) {
    const weight = parseFloat(line);
    return { weight, unit: "kg", stable: true, raw: line };
  }

  // No se pudo parsear
  return null;
}
