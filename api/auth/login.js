// Mock auth - Demo login
const DEMO_USERS = [
  { id: 1, cedula: '1234567890', firstName: 'Admin', lastName: 'Sistema', username: 'admin', password: 'admin123', role: 'ADMIN', status: 'ACTIVE' },
  { id: 2, cedula: '0987654321', firstName: 'María', lastName: 'García', username: 'supervisor1', password: 'super123', role: 'SUPERVISOR', status: 'ACTIVE' },
  { id: 3, cedula: '1122334455', firstName: 'Carlos', lastName: 'López', username: 'cajero1', password: 'cajero123', role: 'VENDEDOR', status: 'ACTIVE' }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = DEMO_USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = `demo_token_${user.id}_${Date.now()}`;
  const { password: _, ...userWithoutPassword } = user;

  return res.status(200).json({ token, user: userWithoutPassword });
}
