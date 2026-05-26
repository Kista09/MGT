const { auditSilently } = require('../_audit');
const { readToken } = require('../_portal');

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  let session = null;
  if (token) {
    try {
      session = readToken(token);
    } catch {}
  }
  await auditSilently({
    app: session?.role?.includes('client') ? 'client-portal' : 'crm',
    actor: session?.name || session?.email || 'Session',
    actorEmail: session?.email || '',
    actorRole: session?.role || '',
    action: 'Logout',
    target: 'session',
    status: 'success',
  }, req);
  return res.status(200).json({ success: true });
};
