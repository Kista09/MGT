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

    res.status(200).json({ requests, storage: 'blob' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
