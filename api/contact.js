
const { put } = require('@vercel/blob');
const { readToken } = require('./_portal');
const { auditSilently } = require('./_audit');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMessage(value = '') {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeServiceRequestNumber() {
  const uuid = globalThis.crypto?.randomUUID?.()
    || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const value = Math.floor(Math.random() * 16);
      return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    });
  return `MGT-SR-0000-${uuid.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

function readConsultantSession(req, onboarding) {
  if (onboarding?.source !== 'consultant-capture') return null;

  const header = String(req.headers.authorization || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    const error = new Error('Consultant login required');
    error.statusCode = 401;
    throw error;
  }

  try {
    const session = readToken(token);
    const role = String(session.role || '').toLowerCase();
    const email = String(session.email || '').toLowerCase();
    const allowed = ['admin', 'owner', 'support', 'consultant'].includes(role) || email.endsWith('@mgucatech.com');
    if (!allowed) throw new Error('Invalid consultant session');
    return session;
  } catch (err) {
    const error = new Error(err.message || 'Consultant login required');
    error.statusCode = 401;
    throw error;
  }
}

function makeCrmRequest({ name, email, subject, message, onboarding }) {
  const company = onboarding?.company || subject.replace(/^Onboarding Brief -\s*/i, '').trim() || 'New onboarding lead';
  const products = Array.isArray(onboarding?.product) ? onboarding.product.join(', ') : '';
  const isConsultantCapture = onboarding?.source === 'consultant-capture';
  const sourcePage = isConsultantCapture ? 'mgucatech.com/consultant-onboarding.html' : 'mgucatech.com/onboarding.html';
  const summary = [
    onboarding?.consultantName && `Consultant: ${onboarding.consultantName}`,
    onboarding?.consultantEmail && `Consultant email: ${onboarding.consultantEmail}`,
    onboarding?.goal && `Goal: ${onboarding.goal}`,
    onboarding?.privateClient && `Private client: ${onboarding.privateClient}`,
    products && `Products: ${products}`,
    onboarding?.package && `Package: ${onboarding.package}`,
    onboarding?.billingStatus && `Billing: ${onboarding.billingStatus}`,
    onboarding?.volume && `Volume: ${onboarding.volume}`,
    onboarding?.timeline && `Timeline: ${onboarding.timeline}`,
    onboarding?.systems && `Systems: ${onboarding.systems}`,
    onboarding?.language && `Languages: ${onboarding.language}`,
    '',
    message,
  ].filter(Boolean).join('\n');

  const requestNumber = makeServiceRequestNumber();
  const externalId = `onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: requestNumber,
    requestNumber,
    externalId,
    clientId: null,
    requester: name,
    email,
    category: 'Operations',
    priority: onboarding?.timeline === 'As soon as possible' ? 'High' : 'Medium',
    status: 'New',
    subject: `Onboarding: ${company}`,
    description: summary,
    dueDate: addDays(2),
    owner: 'Admin',
    channel: isConsultantCapture ? 'Consultant Capture' : 'Onboarding',
    notes: [
      `Sector: ${onboarding?.sector || 'Not specified'}`,
      `WhatsApp: ${onboarding?.phone || 'Not provided'}`,
      `Location: ${onboarding?.location || 'Not provided'}`,
      onboarding?.website && `Website: ${onboarding.website}`,
      onboarding?.consultantName && `Consultant: ${onboarding.consultantName}`,
      onboarding?.consultantEmail && `Consultant email: ${onboarding.consultantEmail}`,
      onboarding?.privateClient && `Private client: ${onboarding.privateClient}`,
      onboarding?.decisionStatus && `Decision status: ${onboarding.decisionStatus}`,
      `Source: ${sourcePage}`,
    ].filter(Boolean).join('\n'),
    receivedAt: new Date().toISOString(),
    source: 'onboarding',
    captureSource: isConsultantCapture ? 'consultant' : 'client',
    company,
    onboarding: onboarding || null,
  };
}

async function storeCrmRequest(record) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  await put(`crm-requests/${record.requestNumber || record.id}.json`, JSON.stringify(record, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, subject, message, onboarding } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const consultantSession = readConsultantSession(req, onboarding);
    if (consultantSession && onboarding) {
      onboarding.consultantEmail = consultantSession.email || onboarding.consultantEmail;
      onboarding.consultantName = consultantSession.name || onboarding.consultantName;
    }

    const sendEmail = (payload) => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const r = await sendEmail({
        from: 'MGT Website <admin@mgucatech.com>',
        to:   ['admin@mgucatech.com'],
        reply_to: email,
        subject: `[MGT Contact] ${subject}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Contact Message</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#001219;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">MGT</p>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">MgucaTech Solutions</p>
        </td></tr>
        <!-- Badge -->
        <tr><td style="background:#0a9396;padding:14px 40px;text-align:center;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;letter-spacing:0.5px;">New Contact Form Submission</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">From</p>
              <p style="margin:0;font-size:16px;color:#0f172a;font-weight:600;">${escapeHtml(name)}</p>
              <p style="margin:2px 0 0;font-size:14px;color:#0a9396;">${escapeHtml(email)}</p>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Subject</p>
              <p style="margin:0;font-size:16px;color:#0f172a;font-weight:600;">${escapeHtml(subject)}</p>
            </td></tr>
            <tr><td style="padding:12px 0;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Message</p>
              <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;white-space:pre-wrap;">${formatMessage(message)}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr><td align="center">
              <a href="mailto:${escapeHtml(email)}" style="display:inline-block;background:#0a9396;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">Reply to ${escapeHtml(name)}</a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">MGT | MgucaTech Solutions &nbsp;·&nbsp; Cape Town, South Africa</p>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">admin@mgucatech.com &nbsp;·&nbsp; mgucatech.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data.message || 'Send failed' });

    const isOnboarding = /^Onboarding Brief/i.test(subject) || onboarding;
    let crmSynced = false;
    let crmRecord = null;
    if (isOnboarding) {
      crmRecord = makeCrmRequest({ name, email, subject, message, onboarding });
      crmSynced = await storeCrmRequest(crmRecord);
    }

    const autoReply = await sendEmail({
      from: 'MgucaTECH <admin@mgucatech.com>',
      to: [email],
      reply_to: 'admin@mgucatech.com',
      subject: 'We received your MgucaTECH onboarding brief',
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Onboarding brief received</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#001219;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">MgucaTECH</p>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Onboarding received</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#0f172a;line-height:1.7;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">Thanks for submitting your MgucaTECH onboarding brief. We have received it and will review your requirements shortly.</p>
          <p style="margin:0 0 22px;font-size:15px;color:#334155;line-height:1.7;">If anything is urgent, you can reply directly to this email or WhatsApp us on 0760470141.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
            <tr><td>
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your submitted brief</p>
              <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${formatMessage(message)}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">MGT | MgucaTech Solutions &nbsp;·&nbsp; Cape Town, South Africa</p>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">admin@mgucatech.com &nbsp;·&nbsp; mgucatech.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    const autoReplyData = await autoReply.json();
    if (!autoReply.ok) {
      return res.status(500).json({ error: autoReplyData.message || 'Auto-response failed' });
    }

    await auditSilently({
      app: onboarding?.source === 'consultant-capture' ? 'consultant-onboarding' : 'website',
      actor: consultantSession?.name || name,
      actorEmail: consultantSession?.email || email,
      actorRole: consultantSession?.role || (onboarding?.source === 'consultant-capture' ? 'consultant' : 'client'),
      action: isOnboarding ? 'Onboarding request captured' : 'Contact form submitted',
      target: crmRecord?.subject || subject,
      targetId: crmRecord?.requestNumber || '',
      status: 'success',
      details: crmSynced ? 'CRM service request created and confirmation email sent.' : 'Message received and confirmation email sent.',
      metadata: {
        source: onboarding?.source || 'website',
        company: crmRecord?.company,
        email,
      },
    }, req);

    res.status(200).json({ success: true, autoReply: true, crmSynced });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};
