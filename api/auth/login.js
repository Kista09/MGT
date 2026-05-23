const { makeToken, publicUser, readPortalUser } = require('../_portal');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function getAdminUser(email, password) {
  const adminEmail = (process.env.SUPPORT_EMAIL || '').toLowerCase();
  const adminPass  =  process.env.SUPPORT_PASSWORD || '';
  if (!adminEmail || !adminPass) return null;
  if (email !== adminEmail || password !== adminPass) return null;
  return {
    id: 'support',
    email: adminEmail,
    name: 'MgucaTech Support',
    role: 'admin',
    clientId: null,
    clientName: 'MgucaTech Solutions',
    plan: null,
    portalApproved: true,
  };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, audience } = req.body || {};
  if (audience !== 'client_portal') return res.status(403).json({ error: 'Invalid portal audience' });
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const norm = String(email).trim().toLowerCase();

  const admin = getAdminUser(norm, password);
  if (admin) {
    return res.status(200).json({ accessToken: makeToken(admin), user: publicUser(admin) });
  }

  const user = await readPortalUser(email);
  if (!user || !user.portalApproved || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.status(200).json({ accessToken: makeToken(user), user: publicUser(user) });
};
