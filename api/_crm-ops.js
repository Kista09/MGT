const { list, put } = require('@vercel/blob');

function nowIso() {
  return new Date().toISOString();
}

function safeName(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/(^-|-$)/g, '') || 'record';
}

async function readJsonBlob(blob) {
  const response = await fetch(blob.url).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null);
}

async function listJson(prefix, limit = 500) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const result = await list({ prefix, limit });
  const records = await Promise.all(result.blobs.map(readJsonBlob));
  return records.filter(Boolean);
}

async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return data;
}

async function listEmailLogs() {
  const logs = await listJson('crm-email-logs/');
  return logs.sort((a, b) => new Date(b.sentAt || b.createdAt || 0) - new Date(a.sentAt || a.createdAt || 0));
}

async function saveEmailLog(log) {
  const id = log.resendId || log.id || `email-${Date.now()}`;
  const record = {
    id,
    createdAt: log.createdAt || nowIso(),
    sentAt: log.sentAt || nowIso(),
    status: log.status || 'sent',
    events: log.events || [],
    ...log,
    id,
  };
  return writeJson(`crm-email-logs/${safeName(id)}.json`, record);
}

async function updateEmailLog(resendId, patch) {
  const logs = await listEmailLogs();
  const existing = logs.find(log => log.resendId === resendId || log.id === resendId);
  const record = {
    ...(existing || { id: resendId, resendId, createdAt: nowIso(), sentAt: nowIso() }),
    ...patch,
    updatedAt: nowIso(),
    events: [
      { time: nowIso(), status: patch.status || patch.event || 'updated', rawEvent: patch.event },
      ...((existing && existing.events) || []),
    ].slice(0, 20),
  };
  return saveEmailLog(record);
}

async function archiveAttachment({ requestNumber, filename, content, contentType }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !content) return null;
  const folder = safeName(requestNumber || 'unlinked');
  const pathname = `crm-attachments/${folder}/${safeName(filename)}`;
  const body = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'base64');
  const blob = await put(pathname, body, {
    access: 'public',
    contentType: contentType || 'application/octet-stream',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return {
    filename,
    url: blob.url,
    pathname: blob.pathname,
    contentType: contentType || 'application/octet-stream',
    archivedAt: nowIso(),
  };
}

module.exports = {
  archiveAttachment,
  listEmailLogs,
  nowIso,
  saveEmailLog,
  updateEmailLog,
};
