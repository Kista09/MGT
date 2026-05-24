const { list } = require('@vercel/blob');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readJsonBlob(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

const SR_PREFIX = 'MGT-SR-0000-';
const SR_SHORT_RE = /^MGT-SR-0000-[0-9A-Z]{8}$/i;

function shortIdFromNumber(value) {
  const suffix = String(Math.max(1, Number(value) || 1).toString(16)).toUpperCase().padStart(8, '0').slice(-8);
  return `${SR_PREFIX}${suffix}`;
}

function makeServiceRequestNumber() {
  const uuid = globalThis.crypto?.randomUUID?.()
    || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const value = Math.floor(Math.random() * 16);
      return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    });
  return `${SR_PREFIX}${uuid.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

function normalizeServiceRequestNumber(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (SR_SHORT_RE.test(raw)) return raw.toUpperCase();
  const prefixed = raw.match(/^MGT-SR-0000-([0-9A-Z-]{9,})$/i);
  if (prefixed) {
    const compact = prefixed[1].replace(/-/g, '').toUpperCase();
    if (compact) return `${SR_PREFIX}${compact.slice(-8).padStart(8, '0')}`;
  }
  const numbered = raw.match(/^MGT-SR-(\d+)$/i);
  if (numbered) return shortIdFromNumber(numbered[1]);
  const oldLong = raw.match(/^MGT-SR-0{3,}-0*(\d+)$/i);
  if (oldLong) return shortIdFromNumber(oldLong[1]);
  return null;
}

function normalizeServiceRequest(request, index, seen) {
  let requestNumber = normalizeServiceRequestNumber(request.requestNumber)
    || normalizeServiceRequestNumber(request.id)
    || shortIdFromNumber(index + 1);
  while (seen.has(requestNumber)) {
    requestNumber = makeServiceRequestNumber();
  }
  seen.add(requestNumber);
  return {
    ...request,
    id: requestNumber,
    requestNumber,
    externalId: request.externalId || request.id || requestNumber,
  };
}

function normalizeServiceRequests(requests = []) {
  const seen = new Set();
  return requests.map((request, index) => normalizeServiceRequest(request, index, seen));
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(200).json({ requests: [], storage: 'unconfigured' });
    }

    const result = await list({ prefix: 'crm-requests/', limit: 100 });
    const requests = (await Promise.all(
      result.blobs
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .map(blob => readJsonBlob(blob.url))
    )).filter(Boolean);

    res.status(200).json({ requests: normalizeServiceRequests(requests), storage: 'blob' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
