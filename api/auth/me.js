const { publicUser, readPortalUser, readToken } = require('../_portal');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const session = readToken(token);
    const user = await readPortalUser(session.email);
    if (!user || !user.portalApproved) return res.status(401).json({ error: 'Session expired' });
    return res.status(200).json(publicUser(user));
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }
};
