const { publicUser, readPortalUser, readToken } = require('../_portal');

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const session = readToken(token);
    if (
      ['admin', 'consultant', 'support', 'owner', 'superadmin', 'normal_client_pool'].includes(session.role)
      || String(session.email || '').toLowerCase().endsWith('@mgucatech.com')
    ) {
      return res.status(200).json(publicUser(session));
    }
    const user = await readPortalUser(session.email);
    if (!user || !user.portalApproved) return res.status(401).json({ error: 'Session expired' });
    return res.status(200).json(publicUser(user));
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }
};
