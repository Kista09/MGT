const { makeToken, readToken, normalizeEmail } = require('./_portal');

const PRIVATE_CLIENTS = [
  {
    id: 'pc-1',
    name: 'Takealot Partner Store',
    contact: 'Ayesha Jacobs',
    email: 'ayesha@tapartner.co.za',
    phone: '+27 83 456 7890',
    sector: 'E-Commerce',
    plan: 'Scale',
    status: 'Active',
    sensitivity: 'High',
    owner: 'MgucaTECH Admin',
    nda: 'Signed',
    nextReview: '2026-06-03',
    notes: 'Private account. Keep renewal, billing and operational history out of the normal relationship pool.',
  },
  {
    id: 'pc-2',
    name: 'KasiPay',
    contact: 'Sibusiso Khumalo',
    email: 'sibusiso@kasipay.co.za',
    phone: '+27 76 567 8901',
    sector: 'Financial Services',
    plan: 'Enterprise',
    status: 'Active',
    sensitivity: 'Critical',
    owner: 'MgucaTECH Admin',
    nda: 'Signed',
    nextReview: '2026-05-30',
    notes: 'Private regulated client. FICA and incident details require private-client access.',
  },
  {
    id: 'pc-3',
    name: 'CityRide Cape Town',
    contact: 'Yusuf Daniels',
    email: 'yusuf@cityride.co.za',
    phone: '+27 79 901 2345',
    sector: 'Transport',
    plan: 'Enterprise',
    status: 'Active',
    sensitivity: 'High',
    owner: 'Operations Desk',
    nda: 'Signed',
    nextReview: '2026-06-10',
    notes: 'Private operations account. Driver workflows and usage notes stay outside normal CRM views.',
  },
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function privateEmails() {
  const configured = process.env.PRIVATE_CLIENT_EMAILS || process.env.PRIVATE_CLIENT_EMAIL || '';
  const defaults = ['organicsmith@gmail.com', 'organicsmith@gmmail.com'];
  return [...new Set([
    ...configured.split(',').map(normalizeEmail).filter(Boolean),
    ...defaults,
  ])];
}

function privateAccount() {
  return {
    emails: privateEmails(),
    password: process.env.PRIVATE_CLIENT_PASSWORD || '',
  };
}

function readPrivateSession(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const session = readToken(token);
    return session.role === 'private_client' ? session : null;
  } catch {
    return null;
  }
}

function isPrivateSession(session) {
  return privateAccount().emails.includes(normalizeEmail(session?.email));
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (req.method === 'POST') {
      const { action, email, password } = req.body || {};
      if (action !== 'private_login') return res.status(400).json({ error: 'Unknown private-client action' });

      const account = privateAccount();
      const norm = normalizeEmail(email);
      if (!account.password || !account.emails.includes(norm) || password !== account.password) {
        return res.status(401).json({ error: 'Invalid private client credentials' });
      }

      const user = {
        id: `private-client-${norm.replace(/[^a-z0-9]+/g, '-')}`,
        email: norm,
        name: 'OrganicSmith Private Client',
        role: 'private_client',
        clientId: null,
        clientName: 'Private Clients',
        plan: null,
      };
      return res.status(200).json({ accessToken: makeToken(user), user, clients: PRIVATE_CLIENTS });
    }

    const session = readPrivateSession(req);
    if (!isPrivateSession(session)) return res.status(401).json({ error: 'Private client login required' });
    return res.status(200).json({ approved: true, user: session, clients: PRIVATE_CLIENTS });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
