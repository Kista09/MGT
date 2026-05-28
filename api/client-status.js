const { list } = require('@vercel/blob');
const { normalizeEmail, readPortalUser } = require('../lib/portal');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readJsonBlob(blob) {
  const response = await fetch(blob.url).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null);
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const email = normalizeEmail(req.query?.email || req.body?.email);
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await readPortalUser(email);
    const result = process.env.BLOB_READ_WRITE_TOKEN
      ? await list({ prefix: 'crm-requests/', limit: 200 })
      : { blobs: [] };
    const requests = (await Promise.all(result.blobs.map(readJsonBlob)))
      .filter(Boolean)
      .filter(request => normalizeEmail(request.email) === email);

    return res.status(200).json({
      user: user ? {
        email: user.email,
        name: user.name,
        clientName: user.clientName,
        plan: user.plan,
        approvedAt: user.approvedAt,
        status: user.portalApproved ? 'Active' : 'Pending',
      } : null,
      requests: requests.map(request => ({
        requestNumber: request.requestNumber || request.id,
        subject: request.subject,
        status: request.status,
        priority: request.priority,
        dueDate: request.dueDate,
        owner: request.owner,
        consultant: request.onboarding?.consultantName,
        outstandingItems: request.outstandingItems || [
          'Submit logo, brand colours, and business profile',
          'Confirm WhatsApp number and operating hours',
          'Upload FAQ, pricing, services, and booking rules',
        ],
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
