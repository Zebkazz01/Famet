export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({
    business_name: 'Minimercado El Castillo',
    business_address: 'Cra 5 #2f-03',
    business_phone: '3187226478',
    business_logo: null,
    logo_version: 0,
    config_version: 1,
    accent_color: 'cian',
    currency: 'COP',
    currency_symbol: '$',
    scale_port: 'COM3',
    scale_baud_rate: '9600',
    tax_enabled: 'false',
    tax_rate: '0'
  });
}
