// Catch-all API handler
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  return res.status(200).json({
    message: 'FAMEAT POS Demo API',
    path: req.url,
    method: req.method,
    note: 'This is a demo endpoint with mock data'
  });
}
