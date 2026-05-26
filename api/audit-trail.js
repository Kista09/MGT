const { listAuditTrail, recordAudit } = require('./_audit');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const limit = Math.min(500, Math.max(1, Number(req.query?.limit) || 300));
      const logs = await listAuditTrail(limit);
      return res.status(200).json({ logs });
    }

    if (req.method === 'POST') {
      const log = await recordAudit(req.body || {}, req);
      return res.status(201).json({ success: true, log });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
