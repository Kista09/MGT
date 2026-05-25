const { listEmailLogs } = require('./_crm-ops');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const logs = await listEmailLogs();
    return res.status(200).json({ logs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
