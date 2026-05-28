const { listPortalUsers, makePassword, normalizeEmail, readPortalUser, savePortalUser } = require('../lib/portal');
const { auditSilently } = require('../lib/audit');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const users = await listPortalUsers();
      return res.status(200).json({
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          clientId: user.clientId,
          clientName: user.clientName,
          plan: user.plan,
          role: user.role,
          status: user.portalApproved ? 'Active' : 'Disabled',
          approvedAt: user.approvedAt,
          approvedBy: user.approvedBy,
          lastLoginAt: user.lastLoginAt || null,
          requestId: user.requestId,
        })),
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, action } = req.body || {};
    const norm = normalizeEmail(email);
    if (!norm) return res.status(400).json({ error: 'Email is required' });
    const user = await readPortalUser(norm);
    if (!user) return res.status(404).json({ error: 'Portal user not found' });

    if (action === 'reset_password') {
      const password = makePassword();
      const updated = { ...user, password, passwordResetAt: new Date().toISOString(), portalApproved: true };
      await savePortalUser(updated);
      await auditSilently({
        app: 'crm',
        actor: 'CRM user',
        action: 'Portal password reset',
        target: updated.clientName || updated.email,
        targetId: updated.clientId || updated.email,
        status: 'success',
        details: `Portal password regenerated for ${updated.email}.`,
        metadata: {
          email: updated.email,
          requestId: updated.requestId,
        },
      }, req);
      return res.status(200).json({
        success: true,
        password,
        user: {
          email: updated.email,
          clientId: updated.clientId,
          clientName: updated.clientName,
          plan: updated.plan,
          passwordResetAt: updated.passwordResetAt,
        },
      });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
