const { list, put } = require('@vercel/blob');

function nowIso() {
  return new Date().toISOString();
}

function safeName(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/(^-|-$)/g, '') || 'record';
}

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

function requestMeta(req) {
  const headers = req?.headers || {};
  const forwarded = headers['x-forwarded-for'];
  return {
    ip: Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0].trim(),
    userAgent: headers['user-agent'] || '',
    origin: headers.origin || '',
  };
}

async function readJsonBlob(blob) {
  const response = await fetch(blob.url).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null);
}

async function listAuditTrail(limit = 300) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const result = await list({ prefix: 'crm-audit-trail/', limit });
  const records = await Promise.all(result.blobs.map(readJsonBlob));
  return records
    .filter(Boolean)
    .sort((a, b) => new Date(b.time || b.createdAt || 0) - new Date(a.time || a.createdAt || 0))
    .slice(0, limit);
}

async function recordAudit(event = {}, req = null) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const time = event.time || nowIso();
  const record = {
    id: event.id || `audit-${Date.now()}-${shortId()}`,
    time,
    app: event.app || 'system',
    actor: event.actor || event.actorEmail || 'System',
    actorEmail: event.actorEmail || '',
    actorRole: event.actorRole || '',
    action: event.action || 'Event recorded',
    target: event.target || '',
    targetId: event.targetId || '',
    status: event.status || 'success',
    details: event.details || '',
    metadata: event.metadata || {},
    ...requestMeta(req),
    ...event,
  };
  const day = time.slice(0, 10);
  const pathname = `crm-audit-trail/${day}/${safeName(record.id)}.json`;
  await put(pathname, JSON.stringify(record, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return record;
}

function auditSilently(event, req = null) {
  return recordAudit(event, req).catch(error => {
    console.error('Audit trail write failed:', error.message);
    return null;
  });
}

module.exports = {
  auditSilently,
  listAuditTrail,
  recordAudit,
};
