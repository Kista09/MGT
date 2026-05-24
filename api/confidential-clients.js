const { readToken, normalizeEmail } = require('./_portal');

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function authUser(req) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing session token');
  return readToken(token);
}

function approvedEmails() {
  return String(process.env.CONFIDENTIAL_APPROVED_EMAILS || 'admin@mgucatech.com')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
}

function canApprove(user) {
  const role = String(user.role || '').toLowerCase();
  return ['admin', 'owner', 'superadmin', 'executive', 'internal crm'].some(item => role.includes(item)) ||
    normalizeEmail(user.email) === 'admin@mgucatech.com';
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = authUser(req);
    const approved = canApprove(user) || approvedEmails().includes(normalizeEmail(user.email));

    if (req.method === 'GET') {
      return res.status(200).json({
        approved,
        canApprove: canApprove(user),
        clients: [],
        access: { requests: [] },
        message: approved
          ? 'Secure confidential client storage is not configured yet.'
          : 'Confidential access must be approved before viewing restricted clients.',
      });
    }

    const { action } = req.body || {};
    if (action === 'request_access') {
      return res.status(202).json({
        approved: false,
        canApprove: canApprove(user),
        clients: [],
        access: { requests: [] },
        message: 'Access request noted. Configure a private database before persistent approvals are enabled.',
      });
    }

    return res.status(501).json({
      error: 'Secure confidential client storage is not configured. Use a private database before saving restricted records.',
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: error.message });
  }
};
