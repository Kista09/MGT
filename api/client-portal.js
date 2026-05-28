const { list, put } = require('@vercel/blob');
const {
  normalizeEmail,
  publicUser,
  readPortalUser,
  readToken,
  readWorkspace,
  savePortalUser,
  saveWorkspace,
  slugify,
} = require('../lib/portal');
const { saveEmailLog, updateRequestStatus, getRequest } = require('../lib/crm-ops');
const { auditSilently } = require('../lib/audit');

const SR_PREFIX = 'MGT-SR-0000-';

const DEFAULT_WORKSPACE = {
  qa: [
    { id: 1, category: 'Orders', question: 'How do I track my order?', answer: "Reply with your order number and we'll send real-time tracking info within seconds.", active: true },
    { id: 2, category: 'Orders', question: 'Can I cancel my order?', answer: "Orders can be cancelled within 2 hours. Reply 'CANCEL [order number]' to proceed.", active: true },
    { id: 3, category: 'Returns', question: 'What is your return policy?', answer: 'We accept returns within 30 days of delivery. Items must be unused and in original packaging.', active: true },
    { id: 4, category: 'Support', question: 'How do I speak to a human agent?', answer: "Reply 'AGENT' at any time and we will connect you to a live support representative.", active: true },
  ],
  inbox: [
    {
      id: 1, name: 'Lerato Mokoena', phone: '+27 82 123 4567', status: 'Escalated', agent: 'MgucaTECH', country: 'ZA', unread: 2,
      messages: [
        { id: 1, from: 'customer', text: 'Hi I need help with my booking', time: '10:02' },
        { id: 2, from: 'bot', text: 'Hello. Please share your booking reference and I will check it for you.', time: '10:02' },
        { id: 3, from: 'customer', text: 'I need a human please', time: '10:04' },
      ],
    },
    {
      id: 2, name: 'Thabo Nkosi', phone: '+27 71 234 5678', status: 'Bot', agent: null, country: 'ZA', unread: 0,
      messages: [
        { id: 1, from: 'customer', text: 'What are your hours?', time: '09:41' },
        { id: 2, from: 'bot', text: 'We are open Monday to Friday, 08:00 to 17:00 SAST.', time: '09:41' },
      ],
    },
  ],
  contacts: [
    { id: 1, name: 'Lerato Mokoena', phone: '+27 82 123 4567', optIn: true, tags: ['VIP', 'Escalated'], country: 'ZA', convs: 8, lastSeen: 'Today' },
    { id: 2, name: 'Thabo Nkosi', phone: '+27 71 234 5678', optIn: true, tags: ['Regular'], country: 'ZA', convs: 14, lastSeen: 'Today' },
    { id: 3, name: 'Ayesha Jacobs', phone: '+27 73 345 6789', optIn: true, tags: ['Resolved'], country: 'ZA', convs: 3, lastSeen: 'Yesterday' },
  ],
  templates: [
    { id: 1, name: 'booking_confirmation', category: 'UTILITY', status: 'DRAFT', lang: 'English', body: 'Hi {{1}}, your {{2}} booking request was received. Reference: {{3}}.', vars: ['name', 'service', 'ref'], uses: 0 },
    { id: 2, name: 'handoff_notice', category: 'UTILITY', status: 'DRAFT', lang: 'English', body: 'Hi {{1}}, a MgucaTECH team member will assist you shortly.', vars: ['name'], uses: 0 },
  ],
  broadcasts: [],
  flowNodes: [
    { id: 'start', type: 'start', label: 'User sends message', content: '', x: 40, y: 240, outputs: ['menu'] },
    { id: 'menu', type: 'menu', label: 'Main Menu', content: 'Reply with a number:\n1. Book\n2. FAQ\n3. Speak to agent', x: 260, y: 240, outputs: ['book', 'faq', 'agent'] },
    { id: 'book', type: 'message', label: 'Book Now', content: 'Open the booking link and choose your service.', x: 520, y: 120, outputs: ['done1'] },
    { id: 'faq', type: 'message', label: 'FAQ', content: 'Ask your question and I will check the approved Q&A list.', x: 520, y: 260, outputs: ['done2'] },
    { id: 'agent', type: 'action', label: 'Escalate to Agent', content: 'Connecting you to a live support agent.', x: 520, y: 400, outputs: [] },
    { id: 'done1', type: 'end', label: 'Continue / Resolved', content: '', x: 740, y: 120, outputs: [] },
    { id: 'done2', type: 'end', label: 'Continue / Resolved', content: '', x: 740, y: 260, outputs: [] },
  ],
  settings: {
    botName: 'MgucaTECH Support',
    welcomeMsg: 'Hello. Welcome to MgucaTECH Support. How can I help you today?',
    fallbackMsg: "I did not understand that. Please type AGENT if you'd like human support.",
    language: 'English',
    tone: 'Friendly',
    escalation: '+27 76 047 0141',
    escalationEmail: 'support@mgucatech.com',
    typingDelay: '1.5',
    autoClose: '24',
  },
  analytics: {
    messages: [
      { d: 'May 20', msgs: 95600 }, { d: 'May 21', msgs: 91400 }, { d: 'May 22', msgs: 87200 },
      { d: 'May 23', msgs: 88400 }, { d: 'May 24', msgs: 72100 }, { d: 'May 25', msgs: 91300 },
    ],
    topQuestions: [
      { q: 'Track my order', pct: 34 },
      { q: 'Cancel order', pct: 18 },
      { q: 'Return policy', pct: 14 },
      { q: 'Speak to agent', pct: 9 },
    ],
    resolution: [{ week: 'May W1', rate: 85 }, { week: 'May W2', rate: 87 }, { week: 'May W3', rate: 86 }],
  },
  calendar: {
    hours: {
      Sun: { open: false, from: '09:00', to: '18:00' },
      Mon: { open: true, from: '09:00', to: '17:00' },
      Tue: { open: true, from: '09:00', to: '17:00' },
      Wed: { open: true, from: '09:00', to: '17:00' },
      Thu: { open: true, from: '09:00', to: '17:00' },
      Fri: { open: true, from: '09:00', to: '15:00' },
      Sat: { open: false, from: '09:00', to: '14:00' },
    },
    marked: {},
  },
};

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

function mergeWorkspace(stored = {}) {
  return {
    ...DEFAULT_WORKSPACE,
    ...stored,
    settings: { ...DEFAULT_WORKSPACE.settings, ...(stored.settings || {}) },
    analytics: { ...DEFAULT_WORKSPACE.analytics, ...(stored.analytics || {}) },
    calendar: { ...DEFAULT_WORKSPACE.calendar, ...(stored.calendar || {}) },
  };
}

async function getWorkspace(user) {
  const stored = await readWorkspace(user);
  return mergeWorkspace(stored);
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

  const workspace = await getWorkspace(user);

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
    workspace,
    links: {
      bookNow: 'https://mgt-app.vercel.app/#book',
      supportEmail: 'support@mgucatech.com',
      whatsapp: '+27 76 047 0141',
    },
  };
}

async function updateWorkspace(req, user) {
  const body = req.body || {};
  const workspace = await getWorkspace(user);
  const now = new Date().toISOString();

  const save = async (action, metadata = {}) => {
    const result = await saveWorkspace(user, workspace);
    await auditSilently({
      app: 'client-portal',
      actor: user.name || user.email,
      actorEmail: normalizeEmail(user.email),
      actorRole: user.role,
      action,
      target: user.clientName || user.email,
      targetId: user.clientId,
      status: 'success',
      details: `${action} from client portal`,
      metadata,
    }, req);
    return result;
  };

  switch (body.action) {
    case 'approve_request': {
      const { requestNumber } = body;
      if (!requestNumber) throw new Error('requestNumber is required');
      const request = await getRequest(requestNumber);
      if (!request) throw new Error(`Request ${requestNumber} not found`);
      if (!requestBelongsToUser(request, user)) throw new Error('Access denied');

      await updateRequestStatus(requestNumber, {
        status: 'Approved',
        timeline: [
          {
            id: `timeline-${Date.now()}`,
            time: now,
            type: 'edited',
            detail: 'Request approved by client via portal',
            actor: user.name || user.email,
          },
          ...(request.timeline || []),
        ],
      });
      await save('Service request approved by client', { requestNumber });
      break;
    }
    case 'save_qa':
      workspace.qa = Array.isArray(body.qa) ? body.qa : workspace.qa;
      await save('Q&A responses saved', { count: workspace.qa.length });
      break;
    case 'save_flow':
      workspace.flowNodes = Array.isArray(body.flowNodes) ? body.flowNodes : workspace.flowNodes;
      await save('Conversation flow saved', { count: workspace.flowNodes.length });
      break;
    case 'publish_flow': {
      workspace.flowNodes = Array.isArray(body.flowNodes) ? body.flowNodes : workspace.flowNodes;
      const approvalRequest = await createFlowApprovalRequest(req, user, workspace.flowNodes);
      workspace.flowStatus = 'Pending CRM approval';
      workspace.lastPublishedFlow = {
        requestNumber: approvalRequest.requestNumber,
        status: approvalRequest.status,
        publishedAt: now,
      };
      await save('Conversation flow published for approval', {
        count: workspace.flowNodes.length,
        requestNumber: approvalRequest.requestNumber,
      });
      break;
    }
    case 'save_settings':
      workspace.settings = { ...workspace.settings, ...(body.settings || {}) };
      await save('Bot settings saved', { settings: Object.keys(body.settings || {}) });
      break;
    case 'save_contacts':
      workspace.contacts = Array.isArray(body.contacts) ? body.contacts : workspace.contacts;
      await save('Contacts saved', { count: workspace.contacts.length });
      break;
    case 'save_templates':
      workspace.templates = Array.isArray(body.templates) ? body.templates : workspace.templates;
      await save('Templates saved', { count: workspace.templates.length });
      break;
    case 'save_broadcasts':
      workspace.broadcasts = Array.isArray(body.broadcasts) ? body.broadcasts : workspace.broadcasts;
      await save('Broadcasts saved', { count: workspace.broadcasts.length });
      break;
    case 'save_calendar':
      workspace.calendar = { ...workspace.calendar, ...(body.calendar || {}) };
      await save('Calendar saved', {});
      break;
    case 'send_inbox_message': {
      const conversationId = body.conversationId;
      const text = String(body.text || '').trim();
      if (!conversationId || !text) {
        const error = new Error('conversationId and text are required');
        error.statusCode = 400;
        throw error;
      }
      workspace.inbox = (workspace.inbox || []).map(conversation => conversation.id === conversationId ? {
        ...conversation,
        status: 'Escalated',
        messages: [
          ...(conversation.messages || []),
          { id: Date.now(), from: 'agent', text, time: 'Now', agentName: user.name || 'Client user' },
        ],
      } : conversation);
      await save('Inbox message sent', { conversationId });
      break;
    }
    case 'resolve_conversation': {
      workspace.inbox = (workspace.inbox || []).map(conversation => conversation.id === body.conversationId ? {
        ...conversation,
        status: 'Resolved',
        unread: 0,
      } : conversation);
      await save('Conversation resolved', { conversationId: body.conversationId });
      break;
    }
    default: {
      const error = new Error('Unsupported client portal action');
      error.statusCode = 400;
      throw error;
    }
  }

  return workspace;
}

function summarizeFlowNodes(flowNodes = []) {
  return flowNodes.map((node, index) => {
    const outputs = Array.isArray(node.outputs) && node.outputs.length ? node.outputs.join(', ') : 'None';
    return [
      `${index + 1}. ${node.label || node.id || 'Untitled node'}`,
      `Type: ${node.type || 'message'}`,
      `Content: ${node.content || 'No content supplied'}`,
      `Outputs: ${outputs}`,
    ].join('\n');
  }).join('\n\n');
}

async function createFlowApprovalRequest(req, user, flowNodes = []) {
  const requestNumber = makeServiceRequestNumber();
  const now = new Date().toISOString();
  const company = user.clientName || 'Client Portal';
  const flowSummary = summarizeFlowNodes(flowNodes);
  const record = {
    id: requestNumber,
    requestNumber,
    clientId: user.clientId || slugify(company || user.email),
    requester: user.name || user.email,
    email: normalizeEmail(user.email),
    company,
    category: 'Flow Approval',
    priority: 'High',
    status: 'New',
    subject: `Bot flow approval: ${company}`,
    description: `Client published a bot conversation flow for CRM review and approval.\n\n${flowSummary}`,
    receivedAt: now,
    dueDate: null,
    owner: 'Operations',
    channel: 'Client Portal',
    notes: 'Review the submitted flow, approve it for production, or request changes from the client.',
    onboarding: {
      company,
      consultantName: 'MgucaTECH',
      consultantEmail: 'support@mgucatech.com',
      timeline: 'As soon as possible',
    },
    flowApproval: {
      status: 'Pending CRM approval',
      publishedAt: now,
      nodes: flowNodes,
    },
    timeline: [
      {
        id: `timeline-${Date.now()}`,
        time: now,
        type: 'created',
        detail: 'Bot flow published from client portal for CRM approval',
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
        action: 'Client published bot flow for approval',
        changes: [
          { label: 'Flow status', before: 'Draft', after: 'Pending CRM approval' },
          { label: 'Nodes submitted', before: '0', after: String(flowNodes.length) },
        ],
      },
    ],
  };

  await writeJson(`crm-requests/${requestNumber}.json`, record);
  await sendSupportServiceRequestNotification(record, user);
  await auditSilently({
    app: 'client-portal',
    actor: user.name || user.email,
    actorEmail: normalizeEmail(user.email),
    actorRole: user.role,
    action: 'Bot flow published for approval',
    target: record.subject,
    targetId: requestNumber,
    status: 'success',
    details: `Bot flow approval request ${requestNumber} created in CRM.`,
    metadata: { nodeCount: flowNodes.length, company },
  }, req);

  return summarizeRequest(record);
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
  await auditSilently({
    app: 'client-portal',
    actor: user.name || user.email,
    actorEmail: normalizeEmail(user.email),
    actorRole: user.role,
    action: 'Service request created',
    target: record.subject,
    targetId: record.requestNumber,
    status: 'success',
    details: `Client portal request ${record.requestNumber} created and confirmation emails queued.`,
    metadata: {
      category: record.category,
      priority: record.priority,
      company: record.company,
      dueDate: record.dueDate,
    },
  }, req);
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
      if (action !== 'create_request') {
        const workspace = await updateWorkspace(req, user);
        return res.status(200).json({ workspace, portal: await portalPayload(user) });
      }
      const request = await createRequest(req, user);
      return res.status(201).json({ request, portal: await portalPayload(user) });
    }

    return res.status(200).json(await portalPayload(user));
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
