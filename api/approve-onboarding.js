const { makePassword, normalizeEmail, savePortalUser, slugify } = require('./_portal');
const fs = require('fs');
const path = require('path');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

async function htmlToPdf(html) {
  const chromium = require('@sparticuz/chromium-min');
  const puppeteer = require('puppeteer-core');

  const executablePath = await chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar'
  );
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 25000 });
    await page.addStyleTag({
      content: `.sidenav { display: none !important; } section { page-break-before: always; } section:first-of-type { page-break-before: avoid; }`,
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    return pdfBuffer.toString('base64');
  } finally {
    await browser.close();
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

    const starterKitHtml = makeStarterKitHtml({
      company,
      contact: request.requester,
      portalEmail: email,
      portalPassword: password,
      request,
    });

    let pdf;
    try {
      pdf = await htmlToPdf(starterKitHtml);
    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr.message);
      pdf = null;
    }

    const attachments = [
      {
        filename: `${slugify(company)}-starter-kit.html`,
        content: Buffer.from(starterKitHtml).toString('base64'),
      },
    ];
    if (pdf) {
      attachments.unshift({
        filename: `${slugify(company)}-starter-kit.pdf`,
        content: pdf,
      });
    }

    await sendEmail({
      from: 'MgucaTECH <admin@mgucatech.com>',
      to: [email],
      reply_to: 'admin@mgucatech.com',
      subject: 'Your MgucaTECH onboarding has been approved',
      html: starterKitHtml,
      attachments,
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
