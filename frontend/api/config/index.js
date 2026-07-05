// Mock business configuration
const BUSINESS_CONFIG = {
  businessName: 'Minimercado El Castillo',
  businessAddress: 'Cra 5 #2f-03',
  businessPhone: '3187226478',
  businessLogo: null,
  taxEnabled: false,
  taxPercent: 19,
  currency: 'COP',
  currencySymbol: '$'
};

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({ data: BUSINESS_CONFIG });
};
