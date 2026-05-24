const { makeToken, publicUser, readPortalUser } = require('../_portal');

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function getAdminUser(email, password) {
  const accounts = [
    { envEmail: 'CONSULTANT_EMAIL', envPass: 'CONSULTANT_PASSWORD', id: 'consultant', name: 'MgucaTech Consultant', role: 'consultant' },
    { envEmail: 'SUPPORT_EMAIL', envPass: 'SUPPORT_PASSWORD', id: 'support', name: 'MgucaTech Support' },
    { envEmail: 'ADMIN_EMAIL',   envPass: 'ADMIN_PASSWORD',   id: 'admin',   name: 'MgucaTech Admin'   },
    { envEmail: 'OWNER_EMAIL',   envPass: 'OWNER_PASSWORD',   id: 'owner',   name: 'MgucaTech Owner'   },
  ];
  for (const { envEmail, envPass, id, name, role = 'admin' } of accounts) {
    const e = (process.env[envEmail] || '').toLowerCase();
    const p =  process.env[envPass]  || '';
    if (e && p && email === e && password === p) {
      return { id, email: e, name, role, clientId: null, clientName: 'MgucaTech Solutions', plan: null, portalApproved: true };
    }
  }
  return null;
}

function getPrivateClientUser(email, password) {
  const configured = process.env.PRIVATE_CLIENT_EMAILS || process.env.PRIVATE_CLIENT_EMAIL || '';
  const emails = [...new Set([
    ...configured.split(',').map(value => String(value).trim().toLowerCase()).filter(Boolean),
    'organicsmith@gmail.com',
    'organicsmith@gmmail.com',
  ])];
  const pass = process.env.PRIVATE_CLIENT_PASSWORD || '';
  if (!pass || !emails.includes(email) || password !== pass) return null;
  return {
    id: `private-client-${email.replace(/[^a-z0-9]+/g, '-')}`,
    email,
    name: 'OrganicSmith Private Client',
    role: 'private_client',
    clientId: null,
    clientName: 'Private Clients',
    plan: null,
    portalApproved: true,
  };
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, audience = 'client_portal' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const norm = String(email).trim().toLowerCase();
  const admin = getAdminUser(norm, password);
  const privateClient = getPrivateClientUser(norm, password);

  if (audience === 'consultant_suite' || audience === 'internal_crm') {
    const user = admin || (audience === 'internal_crm' ? privateClient : null);
    if (!user) return res.status(401).json({ error: 'Invalid staff credentials' });
    return res.status(200).json({ accessToken: makeToken(user), user: publicUser(user) });
  }

  if (audience !== 'client_portal') return res.status(403).json({ error: 'Invalid portal audience' });

  if (admin) {
    return res.status(200).json({ accessToken: makeToken(admin), user: publicUser(admin) });
  }

  const user = await readPortalUser(email);
  if (!user || !user.portalApproved || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.status(200).json({ accessToken: makeToken(user), user: publicUser(user) });
};
