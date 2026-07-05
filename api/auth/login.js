const USERS = [
  { id: 1, username: 'admin', password: 'admin123', firstName: 'Admin', lastName: 'Sistema', role: 'ADMIN' },
  { id: 2, username: 'supervisor1', password: 'super123', firstName: 'María', lastName: 'García', role: 'SUPERVISOR' },
  { id: 3, username: 'cajero1', password: 'cajero123', firstName: 'Carlos', lastName: 'López', role: 'VENDEDOR' }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  const user = USERS.find(u => u.username === username && u.password === password);
  
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  
  const { password: _, ...userWithoutPassword } = user;
  return res.status(200).json({ token: `demo_${user.id}`, user: userWithoutPassword });
}
