const { makeToken, publicUser, readPortalUser } = require('../_portal');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function getAdminUser(email, password) {
  const accounts = [
    { envEmail: 'SUPPORT_EMAIL', envPass: 'SUPPORT_PASSWORD', id: 'support', name: 'MgucaTech Support' },
    { envEmail: 'ADMIN_EMAIL',   envPass: 'ADMIN_PASSWORD',   id: 'admin',   name: 'MgucaTech Admin'   },
    { envEmail: 'OWNER_EMAIL',   envPass: 'OWNER_PASSWORD',   id: 'owner',   name: 'MgucaTech Owner'   },
  ];
  for (const { envEmail, envPass, id, name } of accounts) {
    const e = (process.env[envEmail] || '').toLowerCase();
    const p =  process.env[envPass]  || '';
    if (e && p && email === e && password === p) {
      return { id, email: e, name, role: 'admin', clientId: null, clientName: 'MgucaTech Solutions', plan: null, portalApproved: true };
    }
  }
  return null;
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
