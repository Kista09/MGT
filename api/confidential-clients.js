const { list, put } = require('@vercel/blob');
const { readToken, normalizeEmail } = require('./_portal');

const ACCESS_PATH = 'crm-confidential/access.json';
const CLIENTS_PATH = 'crm-confidential/clients.json';

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

function canApprove(user) {
  const role = String(user.role || '').toLowerCase();
  return ['admin', 'owner', 'superadmin', 'executive', 'internal crm'].some(item => role.includes(item)) ||
    normalizeEmail(user.email) === 'admin@mgucatech.com';
}

function envApprovedEmails() {
  return String(process.env.CONFIDENTIAL_APPROVED_EMAILS || 'admin@mgucatech.com')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
}

async function readJson(pathname, fallback) {
  const result = await list({ prefix: pathname, limit: 1 });
  const blob = result.blobs.find(item => item.pathname === pathname);
  if (!blob) return fallback;
  const response = await fetch(blob.url).catch(() => null);
  if (!response?.ok) return fallback;
  return response.json();
}

async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function readAccess() {
  const access = await readJson(ACCESS_PATH, { approvedEmails: [], requests: [] });
  const approvedEmails = [...new Set([...envApprovedEmails(), ...(access.approvedEmails || []).map(normalizeEmail)])];
  return { approvedEmails, requests: access.requests || [] };
}

function isApproved(user, access) {
  return canApprove(user) || access.approvedEmails.includes(normalizeEmail(user.email));
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(503).json({ error: 'Confidential storage is not configured' });
    }

    const user = authUser(req);
    const access = await readAccess();
    const approved = isApproved(user, access);
    const email = normalizeEmail(user.email);
    const pendingRequest = access.requests.find(item => item.email === email && item.status === 'Pending') || null;

    if (req.method === 'GET') {
      if (!approved) return res.status(200).json({ approved: false, pendingRequest, access });
      const clients = await readJson(CLIENTS_PATH, []);
      return res.status(200).json({ approved: true, canApprove: canApprove(user), clients, access });
    }

    const { action, client, requestId, reason = '' } = req.body || {};

    if (action === 'request_access') {
      if (!access.requests.some(item => item.email === email && item.status === 'Pending')) {
        access.requests.unshift({
          id: `car-${Date.now()}`,
          name: user.name || email,
          email,
          role: user.role || 'Consultant',
          reason,
          status: 'Pending',
          requestedAt: new Date().toISOString(),
        });
        await writeJson(ACCESS_PATH, access);
      }
      return res.status(200).json({ approved: false, pendingRequest: access.requests[0], access });
    }

    if (action === 'approve_access') {
      if (!canApprove(user)) return res.status(403).json({ error: 'Not allowed to approve confidential access' });
      const target = access.requests.find(item => item.id === requestId);
      if (!target) return res.status(404).json({ error: 'Access request not found' });
      access.approvedEmails = [...new Set([...access.approvedEmails, normalizeEmail(target.email)])];
      access.requests = access.requests.map(item => item.id === requestId
        ? { ...item, status: 'Approved', approvedAt: new Date().toISOString(), approvedBy: user.name || email }
        : item);
      await writeJson(ACCESS_PATH, access);
      return res.status(200).json({ approved: true, canApprove: canApprove(user), access });
    }

    if (!approved) return res.status(403).json({ error: 'Confidential access is not approved' });

    const clients = await readJson(CLIENTS_PATH, []);
    if (action === 'add_client') {
      const next = {
        ...client,
        id: `cc-${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdBy: user.name || email,
      };
      const updated = [next, ...clients];
      await writeJson(CLIENTS_PATH, updated);
      return res.status(200).json({ approved: true, canApprove: canApprove(user), clients: updated, access });
    }

    if (action === 'update_client') {
      const updated = clients.map(item => item.id === client.id
        ? { ...item, ...client, updatedAt: new Date().toISOString(), updatedBy: user.name || email }
        : item);
      await writeJson(CLIENTS_PATH, updated);
      return res.status(200).json({ approved: true, canApprove: canApprove(user), clients: updated, access });
    }

    return res.status(400).json({ error: 'Unknown confidential action' });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: error.message });
  }
};
