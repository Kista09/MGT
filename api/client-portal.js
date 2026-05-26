const { list, put } = require('@vercel/blob');
const { normalizeEmail, publicUser, readPortalUser, readToken, slugify } = require('./_portal');
const { saveEmailLog } = require('./_crm-ops');

const SR_PREFIX = 'MGT-SR-0000-';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  if (!response.ok) throw new Error(data.message || 'Email send failed');
  return data;
}

function makeServiceRequestNumber() {
  const uuid = globalThis.crypto?.randomUUID?.()
    || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const value = Math.floor(Math.random() * 16);
      return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    });
  return `${SR_PREFIX}${uuid.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

async function readJsonBlob(blob) {
  const response = await fetch(blob.url).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null);
}

async function listJson(prefix, limit = 500) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const result = await list({ prefix, limit });
  return (await Promise.all(result.blobs.map(readJsonBlob))).filter(Boolean);
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

async function requirePortalUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error('Missing portal session');
    error.statusCode = 401;
    throw error;
  }

  let session;
  try {
    session = readToken(token);
  } catch {
    const error = new Error('Portal session expired');
    error.statusCode = 401;
    throw error;
  }

  const role = session.role || '';
  if (!['admin', 'client_admin', 'client_manager', 'client_viewer'].includes(role)) {
    const error = new Error('This session is not enabled for the client portal');
    error.statusCode = 403;
    throw error;
  }

  const storedUser = await readPortalUser(session.email);
  const user = storedUser || {
    id: session.sub,
    email: session.email,
    name: session.name,
    role,
    clientId: session.clientId,
    clientName: session.clientName,
    plan: session.plan,
    portalApproved: true,
  };

  if (!user.portalApproved && role !== 'admin') {
    const error = new Error('Portal access is not active');
    error.statusCode = 403;
    throw error;
  }

  return user;
}

function requestBelongsToUser(request, user) {
  const email = normalizeEmail(user.email);
  const requestEmail = normalizeEmail(request.email || request.requesterEmail || request.onboarding?.email);
  const clientId = user.clientId || user.client_id;
  const requestClientId = request.clientId || request.client_id || slugify(request.company || request.clientName || '');
  return requestEmail === email || (clientId && requestClientId === clientId);
}

function defaultOutstandingItems(request = {}) {
  const onboarding = request.onboarding || {};
  const items = [];
  if (!onboarding.systems) items.push('Confirm current systems and calendar setup');
  if (!onboarding.phone && !request.phone) items.push('Confirm WhatsApp handoff number');
  if (!onboarding.goal) items.push('Confirm onboarding goal and success measure');
  if ((request.attachments || []).length === 0) items.push('Upload logo, brand assets, FAQs, service list, and pricing');
  return items.length ? items : ['Review the setup checklist and confirm readiness for launch'];
}

function summarizeRequest(request) {
  return {
    id: request.requestNumber || request.id,
    requestNumber: request.requestNumber || request.id,
    subject: request.subject || 'Service request',
    category: request.category || 'Client Portal',
    status: request.status || 'New',
    priority: request.priority || 'Medium',
    dueDate: request.dueDate || request.targetResponseDate || null,
    receivedAt: request.receivedAt || request.createdAt || null,
    owner: request.owner || request.consultant || 'MgucaTECH',
    description: request.description || request.details || '',
    timeline: request.timeline || [],
    auditTrail: request.auditTrail || [],
    outstandingItems: request.outstandingItems || defaultOutstandingItems(request),
    attachments: (request.attachments || []).map(attachment => ({
      filename: attachment.filename,
      url: attachment.url,
      contentType: attachment.contentType,
      archivedAt: attachment.archivedAt,
    })).filter(attachment => attachment.filename || attachment.url),
  };
}

async function portalPayload(user) {
  const allRequests = await listJson('crm-requests/', 500);
  const requests = allRequests
    .filter(request => requestBelongsToUser(request, user))
    .sort((a, b) => new Date(b.receivedAt || b.createdAt || 0) - new Date(a.receivedAt || a.createdAt || 0))
    .map(summarizeRequest);

  const activeRequest = requests.find(request => !['Closed', 'Completed', 'Resolved'].includes(request.status)) || requests[0] || null;
  const attachments = requests.flatMap(request => (request.attachments || []).map(attachment => ({
    ...attachment,
    requestNumber: request.requestNumber,
  })));

  return {
    user: {
      ...publicUser(user),
      approvedAt: user.approvedAt || null,
      lastLoginAt: user.lastLoginAt || null,
      status: user.portalApproved ? 'Active' : 'Pending',
    },
    status: {
      label: activeRequest ? activeRequest.status : 'Active',
      requestNumber: activeRequest?.requestNumber || null,
      nextStep: activeRequest?.outstandingItems?.[0] || 'Your portal is active. Use Book Now or create a service request when needed.',
      consultant: activeRequest?.owner || 'MgucaTECH',
    },
    onboarding: {
      outstandingItems: activeRequest?.outstandingItems || [],
      completedCount: Math.max(0, 8 - (activeRequest?.outstandingItems?.length || 0)),
      totalCount: 8,
    },
    requests,
    attachments,
    links: {
      bookNow: 'https://mgtchat-20260516-1916.vercel.app/#book',
      supportEmail: 'support@mgucatech.com',
      whatsapp: '+27 76 047 0141',
    },
  };
}

async function createRequest(req, user) {
  const body = req.body || {};
  const requestNumber = makeServiceRequestNumber();
  const now = new Date().toISOString();
  const priority = body.priority || 'Medium';
  const subject = String(body.subject || '').trim();
  const description = String(body.description || '').trim();

  if (!subject || !description) {
    const error = new Error('Subject and description are required');
    error.statusCode = 400;
    throw error;
  }

  const record = {
    id: requestNumber,
    requestNumber,
    clientId: user.clientId || slugify(user.clientName || user.email),
    requester: user.name || user.email,
    email: normalizeEmail(user.email),
    company: user.clientName || 'Client Portal',
    category: body.category || 'Client Portal',
    priority,
    status: 'New',
    subject,
    description,
    receivedAt: now,
    dueDate: body.dueDate || null,
    owner: 'Operations',
    channel: 'Client Portal',
    notes: body.notes || '',
    onboarding: {
      company: user.clientName,
      consultantName: 'MgucaTECH',
      consultantEmail: 'support@mgucatech.com',
      timeline: priority === 'High' || priority === 'Critical' ? 'As soon as possible' : 'Standard',
    },
    timeline: [
      {
        id: `timeline-${Date.now()}`,
        time: now,
        type: 'created',
        detail: 'Service request created from client portal',
        actor: user.name || user.email,
      },
    ],
    auditTrail: [
      {
        id: `audit-${Date.now()}`,
        time: now,
        actor: user.name || user.email,
        actorEmail: normalizeEmail(user.email),
        actorRole: user.role,
        action: 'Client created service request',
        changes: [
          { label: 'Subject', before: 'Blank', after: subject },
          { label: 'Priority', before: 'Blank', after: priority },
        ],
      },
    ],
  };

  await writeJson(`crm-requests/${requestNumber}.json`, record);
  await sendSupportServiceRequestNotification(record, user);
  await sendClientServiceRequestConfirmation(record, user);
  return summarizeRequest(record);
}

async function sendSupportServiceRequestNotification(record, user) {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@mgucatech.com';
  const clientEmail = normalizeEmail(user.email);
  const subject = `New client portal service request: ${record.requestNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#1A1A1A">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#E8561A;font-weight:700">Client portal service request</p>
      <h1 style="margin:0 0 12px;font-size:24px;color:#0C4A4A">${escapeHtml(record.requestNumber)}</h1>
      <p>A new service request was created from the client portal and is ready for review in the CRM.</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px;margin:18px 0">
        ${[
          ['Client', record.company],
          ['Requester', record.requester],
          ['Email', clientEmail],
          ['Category', record.category],
          ['Priority', record.priority],
          ['Due date', record.dueDate || 'Not set'],
          ['Subject', record.subject],
        ].map(([label, value]) => `
          <tr>
            <td style="border:1px solid #E8E2DA;background:#F8F4EF;padding:9px 12px;font-weight:700;width:160px">${escapeHtml(label)}</td>
            <td style="border:1px solid #E8E2DA;padding:9px 12px">${escapeHtml(value)}</td>
          </tr>
        `).join('')}
      </table>
      <div style="margin-top:18px">
        <p style="font-weight:700;margin:0 0 6px">Request details</p>
        <div style="white-space:pre-wrap;border:1px solid #E8E2DA;background:#F8F4EF;padding:12px;border-radius:6px">${escapeHtml(record.description)}</div>
      </div>
      <p style="margin-top:18px">
        <a href="https://crm.mgucatech.com" style="display:inline-block;background:#E8561A;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;font-weight:700">Open CRM</a>
      </p>
    </div>
  `;

  const payload = {
    from: 'MgucaTECH <admin@mgucatech.com>',
    to: [supportEmail],
    reply_to: clientEmail || 'admin@mgucatech.com',
    subject,
    html,
  };

  const result = await sendEmail(payload);
  await saveEmailLog({
    resendId: result.id,
    recipient: supportEmail,
    subject,
    sentAt: new Date().toISOString(),
    status: 'sent',
    from: payload.from,
    replyTo: payload.reply_to,
    relatedRequestNumber: record.requestNumber,
    action: 'client_portal_service_request_support_notification',
    attachments: [],
  });
}

async function sendClientServiceRequestConfirmation(record, user) {
  const clientEmail = normalizeEmail(user.email);
  if (!clientEmail) return;

  const subject = `We received your service request ${record.requestNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1A1A1A">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#E8561A;font-weight:700">MgucaTECH Client Portal</p>
      <h1 style="margin:0 0 12px;font-size:24px;color:#0C4A4A">Request received</h1>
      <p>Hi ${escapeHtml(user.name || record.requester || 'there')},</p>
      <p>Thanks for submitting a service request through your client portal. Our team has received it and will review it shortly.</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px;margin:18px 0">
        ${[
          ['Service request number', record.requestNumber],
          ['Company', record.company],
          ['Subject', record.subject],
          ['Category', record.category],
          ['Priority', record.priority],
          ['Target date', record.dueDate || 'Not set'],
          ['Status', record.status],
        ].map(([label, value]) => `
          <tr>
            <td style="border:1px solid #E8E2DA;background:#F8F4EF;padding:9px 12px;font-weight:700;width:190px">${escapeHtml(label)}</td>
            <td style="border:1px solid #E8E2DA;padding:9px 12px">${escapeHtml(value)}</td>
          </tr>
        `).join('')}
      </table>
      <div style="margin-top:18px">
        <p style="font-weight:700;margin:0 0 6px">Your request details</p>
        <div style="white-space:pre-wrap;border:1px solid #E8E2DA;background:#F8F4EF;padding:12px;border-radius:6px">${escapeHtml(record.description)}</div>
      </div>
      <p style="margin-top:18px">You can track this request in your client portal under <strong>Service Requests</strong>.</p>
      <p>
        <a href="https://client-portal.mgucatech.com" style="display:inline-block;background:#E8561A;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;font-weight:700">Open Client Portal</a>
      </p>
      <p style="font-size:13px;color:#6F6258;margin-top:20px">Need to add more context? Reply to this email or contact support@mgucatech.com.</p>
    </div>
  `;

  const payload = {
    from: 'MgucaTECH <admin@mgucatech.com>',
    to: [clientEmail],
    reply_to: process.env.SUPPORT_EMAIL || 'support@mgucatech.com',
    subject,
    html,
  };

  const result = await sendEmail(payload);
  await saveEmailLog({
    resendId: result.id,
    recipient: clientEmail,
    subject,
    sentAt: new Date().toISOString(),
    status: 'sent',
    from: payload.from,
    replyTo: payload.reply_to,
    relatedRequestNumber: record.requestNumber,
    action: 'client_portal_service_request_client_confirmation',
    attachments: [],
  });
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: 'Portal storage is not configured' });

  try {
    const user = await requirePortalUser(req);

    if (req.method === 'POST') {
      const action = req.body?.action || 'create_request';
      if (action !== 'create_request') return res.status(400).json({ error: 'Unsupported client portal action' });
      const request = await createRequest(req, user);
      return res.status(201).json({ request, portal: await portalPayload(user) });
    }

    return res.status(200).json(await portalPayload(user));
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
