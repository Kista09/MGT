const { saveEmailLog, updateEmailLog } = require('../lib/crm-ops');
const { auditSilently } = require('../lib/audit');

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

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainText(value = '') {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseAddress(value) {
  if (Array.isArray(value)) return parseAddress(value[0]);
  if (value && typeof value === 'object') return normalizeEmail(value.email || value.address || value.value);
  const match = String(value || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return normalizeEmail(match?.[0] || value);
}

function parseAddressList(value) {
  if (Array.isArray(value)) return value.map(parseAddress).filter(Boolean);
  return String(value || '')
    .split(',')
    .map(parseAddress)
    .filter(Boolean);
}

function monitoredMailboxes() {
  return [...new Set([
    process.env.SUPPORT_EMAIL || 'support@mgucatech.com',
    process.env.ADMIN_EMAIL || 'admin@mgucatech.com',
  ].map(normalizeEmail).filter(Boolean))];
}

function extractInboundEmail(body = {}) {
  const inbound = body.email || body.data || body;
  const recipients = [
    ...parseAddressList(inbound.to),
    ...parseAddressList(inbound.cc),
    ...parseAddressList(inbound.envelope?.to),
    ...parseAddressList(inbound.recipient),
  ];
  return {
    from: parseAddress(inbound.from || inbound.sender || inbound.reply_to || inbound.replyTo),
    recipients,
    subject: String(inbound.subject || body.subject || 'Message received').trim(),
    text: inbound.text || inbound.text_body || inbound.body || plainText(inbound.html || inbound.html_body),
    messageId: inbound.message_id || inbound.messageId || inbound.id || body.id || `inbound-${Date.now()}`,
  };
}

async function sendEmail(payload) {
  if (!process.env.RESEND_API_KEY) throw new Error('Email service is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Auto-response failed');
  return data;
}

async function maybeSendInboundAutoResponse(event, req) {
  const inbound = extractInboundEmail(event);
  const monitored = monitoredMailboxes();
  const matchedMailbox = inbound.recipients.find(email => monitored.includes(email));

  if (!matchedMailbox) return null;
  if (!inbound.from || monitored.includes(inbound.from)) {
    return { skipped: true, reason: 'Sender is empty or internal', mailbox: matchedMailbox };
  }

  const subject = `We received your request: ${inbound.subject}`;
  const preview = inbound.text ? escapeHtml(inbound.text).slice(0, 1200) : 'No message body was included.';
  const payload = {
    from: 'MgucaTECH <admin@mgucatech.com>',
    to: [inbound.from],
    reply_to: matchedMailbox,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1A1A1A">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#E8561A;font-weight:700">MgucaTECH Auto-response</p>
        <h1 style="margin:0 0 12px;font-size:24px;color:#0C4A4A">Request received</h1>
        <p>Thanks for contacting MgucaTECH. We received your message sent to <strong>${escapeHtml(matchedMailbox)}</strong>.</p>
        <p>Our team will review it and respond as soon as possible.</p>
        <div style="margin-top:18px;border:1px solid #E8E2DA;background:#F8F4EF;padding:12px;border-radius:6px">
          <p style="font-weight:700;margin:0 0 6px">Your message</p>
          <p style="white-space:pre-wrap;margin:0">${preview}</p>
        </div>
        <p style="font-size:13px;color:#6F6258;margin-top:20px">For urgent matters, WhatsApp +27 76 047 0141.</p>
      </div>
    `,
  };

  const result = await sendEmail(payload);
  await saveEmailLog({
    resendId: result.id,
    recipient: inbound.from,
    subject,
    sentAt: new Date().toISOString(),
    status: 'sent',
    from: payload.from,
    replyTo: payload.reply_to,
    relatedRequestNumber: '',
    action: 'support_admin_inbound_autoresponse',
    attachments: [],
    metadata: {
      inboundMessageId: inbound.messageId,
      matchedMailbox,
    },
  });

  await auditSilently({
    app: 'email',
    actorEmail: inbound.from,
    action: 'Inbound auto-response sent',
    target: matchedMailbox,
    targetId: inbound.messageId,
    status: 'success',
    details: `Auto-response sent to ${inbound.from} for inbound mail to ${matchedMailbox}.`,
  }, req);

  return { success: true, autoresponse: true, to: inbound.from, mailbox: matchedMailbox };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const event = req.body || {};
    const autoResponse = await maybeSendInboundAutoResponse(event, req);
    if (autoResponse) return res.status(200).json(autoResponse);

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

    await auditSilently({
      app: 'email',
      actor: 'Resend',
      action: `Email ${status}`,
      target: data.subject || resendId,
      targetId: record.relatedRequestNumber || resendId,
      status,
      details: `${data.to || data.recipient || 'Recipient'} email event: ${status}.`,
      metadata: {
        resendId,
        recipient: data.to || data.recipient,
        event: event.type || event.event,
      },
    }, req);

    return res.status(200).json({ success: true, log: record });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
