const { list, put } = require('@vercel/blob');

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function slugify(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'client';
}

function makePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let value = '';
  for (let i = 0; i < 10; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MGT-${value}`;
}

function userPath(email) {
  return `portal-users/${normalizeEmail(email)}.json`;
}

async function savePortalUser(user) {
  await put(userPath(user.email), JSON.stringify(user, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function readPortalUser(email) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const norm = normalizeEmail(email);
  const paths = [`portal-users/${norm}.json`, `portal-users/${encodeURIComponent(norm)}.json`];
  for (const pathname of paths) {
    const result = await list({ prefix: pathname, limit: 1 });
    const blob = result.blobs.find(b => b.pathname === pathname);
    if (!blob) continue;
    const response = await fetch(blob.url).catch(() => null);
    if (!response?.ok) continue;
    return response.json();
  }
  return null;
}

async function listPortalUsers() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const result = await list({ prefix: 'portal-users/', limit: 500 });
  const users = await Promise.all(result.blobs.map(async blob => {
    const response = await fetch(blob.url).catch(() => null);
    if (!response?.ok) return null;
    return response.json().catch(() => null);
  }));
  return users.filter(Boolean).sort((a, b) => String(a.email).localeCompare(String(b.email)));
}

function makeToken(user) {
  return Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId,
    clientName: user.clientName,
    plan: user.plan,
    privateClientAccess: user.privateClientAccess || false,
    exp: Date.now() + 7 * 86400000,
  })).toString('base64url');
}

function readToken(token = '') {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    // Fall back to standard base64 for tokens issued before base64url migration
    parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  }
  if (!parsed.exp || parsed.exp < Date.now()) throw new Error('Session expired');
  return parsed;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId,
    client_id: user.clientId,
    clientName: user.clientName,
    client_name: user.clientName,
    plan: user.plan,
  };
}

function workspacePathFor(user) {
  const clientId = user.clientId || user.client_id || slugify(user.clientName || user.email || 'client');
  return `client-workspaces/${clientId}.json`;
}

async function readWorkspace(user) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return {};
  const pathname = workspacePathFor(user);
  const result = await list({ prefix: pathname, limit: 1 });
  const blob = result.blobs.find(b => b.pathname === pathname);
  if (!blob) return {};
  const response = await fetch(blob.url).catch(() => null);
  if (!response?.ok) return {};
  return response.json().catch(() => ({}));
}

async function saveWorkspace(user, workspace) {
  await put(workspacePathFor(user), JSON.stringify({
    ...workspace,
    updatedAt: new Date().toISOString(),
    updatedBy: normalizeEmail(user.email || 'admin'),
  }, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

module.exports = {
  makePassword,
  makeToken,
  listPortalUsers,
  normalizeEmail,
  publicUser,
  readPortalUser,
  readToken,
  readWorkspace,
  savePortalUser,
  saveWorkspace,
  slugify,
};
