const { makePassword, normalizeEmail, savePortalUser, slugify } = require('./_portal');
const fs = require('fs');
const path = require('path');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function escapePdf(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function money(value) {
  return `R${Number(value || 0).toLocaleString('en-ZA')}`;
}

function estimateProjections(onboarding = {}) {
  const plan = onboarding.package || ((onboarding.product || []).includes('Client portal') ? 'Growth' : 'Starter');
  const volume = onboarding.volume || 'Under 500';
  const base = plan === 'Scale' ? 12000 : plan === 'Growth' ? 6500 : plan === 'Custom' ? 18000 : 3500;
  const multiplier = volume === '10,000+' ? 3 : volume === '2,000 - 10,000' ? 2 : volume === '500 - 2,000' ? 1.4 : 1;
  const setup = Math.round(base * multiplier);
  const monthly = Math.round(setup * 0.42);
  return [
    ['Setup estimate', money(setup), 'Configuration, launch support, handover'],
    ['Monthly support', money(monthly), 'Hosting, monitoring, minor updates'],
    ['Projected launch', onboarding.timeline || 'Within 30 days', 'Subject to content and system access'],
    ['First review', '14 days after launch', 'Measure usage, handoff quality, and fixes'],
  ];
}

function makeStarterKitPdf({ company, contact, portalEmail, portalPassword, request }) {
  const onboarding = request.onboarding || {};
  const products = Array.isArray(onboarding.product) ? onboarding.product.join(', ') : 'MgucaTECH services';
  const projectionRows = estimateProjections(onboarding);
  const lines = [
    'MgucaTECH Starter Kit',
    `Client: ${company}`,
    `Contact: ${contact}`,
    `Portal: https://client-portal.mgucatech.com`,
    `Login email: ${portalEmail}`,
    `Temporary password: ${portalPassword}`,
    '',
    'Approved Solution',
    `Products: ${products}`,
    `Package: ${onboarding.package || 'To be confirmed'}`,
    `Launch timing: ${onboarding.timeline || 'To be confirmed'}`,
    `Primary goal: ${onboarding.goal || 'To be confirmed'}`,
    '',
    'Starter Checklist',
    '1. Sign in to the client portal and confirm company details.',
    '2. Share brand, FAQ, pricing, booking, and support content.',
    '3. Confirm the human handoff person and operating hours.',
    '4. Approve the first chatbot or portal workflow before launch.',
    '5. Attend the post-launch review and approve improvements.',
    '',
    'Projections',
    ...projectionRows.map(([label, value, note]) => `${label}: ${value} - ${note}`),
    '',
    'Notes',
    onboarding.notes || request.notes || 'No additional notes captured.',
  ];

  const stream = [
    'BT',
    '/F1 18 Tf',
    '50 790 Td',
    `(${escapePdf(lines[0])}) Tj`,
    '/F1 10 Tf',
    ...lines.slice(1).map((line) => `0 -18 Td (${escapePdf(line)}) Tj`),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf).toString('base64');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeStarterKitHtml({ company, contact, portalEmail, portalPassword, request }) {
  const onboarding = request.onboarding || {};
  const templatePath = path.join(__dirname, '..', 'files', 'organicsmith-starter-kit.html');

  try {
    let html = fs.readFileSync(templatePath, 'utf8');
    const replacements = [
      [/OrganicSmith/g, escapeHtml(company)],
      [/Kista/g, escapeHtml(contact)],
      [/organicsmith@gmail\.com/g, escapeHtml(portalEmail)],
      [/MGT-HPemqvGhcq/g, escapeHtml(portalPassword)],
      [/Healthcare/g, escapeHtml(onboarding.sector || 'Business')],
      [/Cape Town, Western Cape/g, escapeHtml(onboarding.location || 'South Africa')],
      [/Cape Town/g, escapeHtml(onboarding.location || 'South Africa')],
      [/Increase customers &amp; patient access/g, escapeHtml(onboarding.goal || 'Increase customers and improve access')],
      [/As soon as possible/g, escapeHtml(onboarding.timeline || 'As soon as possible')],
    ];

    replacements.forEach(([pattern, value]) => {
      html = html.replace(pattern, value);
    });

    return html;
  } catch {
    return `<!DOCTYPE html><html><body>
      <h1>MgucaTECH Starter Kit</h1>
      <p>Client: ${escapeHtml(company)}</p>
      <p>Contact: ${escapeHtml(contact)}</p>
      <p>Portal: https://client-portal.mgucatech.com</p>
      <p>Email: ${escapeHtml(portalEmail)}</p>
      <p>Temporary password: ${escapeHtml(portalPassword)}</p>
    </body></html>`;
  }
}

async function sendEmail(payload) {
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

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: 'Portal storage is not configured' });

  const { request, approvedBy = 'MgucaTECH' } = req.body || {};
  if (!request?.email || !request?.requester) {
    return res.status(400).json({ error: 'Request email and requester are required' });
  }

  try {
    const email = normalizeEmail(request.email);
    const company = request.company || request.onboarding?.company || request.subject?.replace(/^Onboarding:\s*/i, '') || 'MgucaTECH Client';
    const password = makePassword();
    const user = {
      id: `portal-${Date.now()}`,
      email,
      password,
      name: request.requester,
      role: 'client_admin',
      clientId: slugify(company),
      clientName: company,
      plan: request.onboarding?.package || 'Starter',
      portalApproved: true,
      approvedAt: new Date().toISOString(),
      approvedBy,
      requestId: request.externalId || request.id,
    };

    await savePortalUser(user);

    const pdf = makeStarterKitPdf({
      company,
      contact: request.requester,
      portalEmail: email,
      portalPassword: password,
      request,
    });
    const starterKitHtml = makeStarterKitHtml({
      company,
      contact: request.requester,
      portalEmail: email,
      portalPassword: password,
      request,
    });

    await sendEmail({
      from: 'MgucaTECH <admin@mgucatech.com>',
      to: [email],
      reply_to: 'admin@mgucatech.com',
      subject: 'Your MgucaTECH onboarding has been approved',
      html: starterKitHtml,
      attachments: [
        {
          filename: `${slugify(company)}-starter-kit.html`,
          content: Buffer.from(starterKitHtml).toString('base64'),
        },
        {
          filename: `${slugify(company)}-starter-kit-summary.pdf`,
          content: pdf,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      portalUser: {
        email: user.email,
        clientId: user.clientId,
        clientName: user.clientName,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
