export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  return res.status(200).json({
    name: 'FAMEAT POS',
    short_name: 'FAMEAT',
    description: 'Sistema de Punto de Venta',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#06b6d4',
    icons: [
      { src: '/pwa/icons/icon-any-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa/icons/icon-any-512.png', sizes: '512x512', type: 'image/png' }
    ]
  });
}
