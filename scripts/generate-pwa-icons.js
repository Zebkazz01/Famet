/**
 * Genera iconos PWA placeholder para FAMEAT POS
 * Ejecutar: node scripts/generate-pwa-icons.js
 *
 * Cuando tengas un logo real, reemplaza los PNGs en frontend/public/pwa/icons/
 */
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'frontend', 'public', 'pwa', 'icons');

// Crear SVG placeholder con texto "FM"
function createSVG(size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const innerSize = size - padding * 2;
  const fontSize = Math.round(innerSize * 0.4);
  const cx = size / 2;
  const cy = size / 2;
  const rx = maskable ? Math.round(innerSize * 0.05) : Math.round(size * 0.12);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#dc2626" rx="${rx}"/>
  <text x="${cx}" y="${cy}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">FM</text>
</svg>`;
}

// Convertir SVG a PNG usando resvg-js o sharp si disponible, sino guardar como SVG
async function generateIcons() {
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  const icons = [
    { name: 'icon-any-512', size: 512, maskable: false },
    { name: 'icon-any-384', size: 384, maskable: false },
    { name: 'icon-any-192', size: 192, maskable: false },
    { name: 'icon-any-128', size: 128, maskable: false },
    { name: 'icon-any-96', size: 96, maskable: false },
    { name: 'icon-maskable-512', size: 512, maskable: true },
    { name: 'icon-maskable-192', size: 192, maskable: true },
    { name: 'apple-touch-icon-180', size: 180, maskable: false },
    { name: 'apple-touch-icon-152', size: 152, maskable: false },
    { name: 'apple-touch-icon-120', size: 120, maskable: false },
    { name: 'apple-touch-icon-76', size: 76, maskable: false },
  ];

  // Try sharp first
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    sharp = null;
  }

  for (const icon of icons) {
    const svg = createSVG(icon.size, icon.maskable);
    const pngPath = path.join(ICONS_DIR, `${icon.name}.png`);

    if (sharp) {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(pngPath);
      console.log(`  Created ${icon.name}.png (${icon.size}x${icon.size})`);
    } else {
      // Fallback: guardar SVG como .png (los navegadores lo aceptan para desarrollo)
      // Para producción se necesita sharp: npm install sharp
      const svgPath = path.join(ICONS_DIR, `${icon.name}.svg`);
      fs.writeFileSync(svgPath, svg);
      // También crear un "PNG" mínimo placeholder
      fs.writeFileSync(pngPath, svg);
      console.log(`  Created ${icon.name}.png (SVG fallback - instala sharp para PNG real)`);
    }
  }

  console.log('\nIconos generados en:', ICONS_DIR);
  if (!sharp) {
    console.log('\nNOTA: Los iconos son SVG renombrados a .png (funciona en dev).');
    console.log('Para producción: npm install sharp && node scripts/generate-pwa-icons.js');
  }
}

generateIcons().catch(console.error);
