// Mock API catch-all handler
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route based on path
  const path = req.url;
  
  // Default response for unknown endpoints
  return res.status(200).json({
    message: 'FAMEAT POS Demo API',
    path: path,
    method: req.method,
    note: 'This is a demo endpoint with mock data'
  });
};
