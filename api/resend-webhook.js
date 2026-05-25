const { updateEmailLog } = require('./_crm-ops');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Resend-Signature');
}

function eventStatus(type = '') {
  const value = String(type).toLowerCase();
  if (value.includes('delivered')) return 'delivered';
  if (value.includes('bounced')) return 'bounced';
  if (value.includes('opened')) return 'opened';
  if (value.includes('failed')) return 'failed';
  if (value.includes('complained')) return 'complained';
  return value || 'updated';
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const event = req.body || {};
    const data = event.data || event.email || {};
    const resendId = data.id || event.id || event.email_id;
    if (!resendId) return res.status(400).json({ error: 'Missing Resend email id' });

    const status = eventStatus(event.type || event.event || data.status);
    const record = await updateEmailLog(resendId, {
      event: event.type || event.event,
      status,
      recipient: data.to || data.recipient,
      subject: data.subject,
      lastEventAt: new Date().toISOString(),
      raw: event,
    });

    return res.status(200).json({ success: true, log: record });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
