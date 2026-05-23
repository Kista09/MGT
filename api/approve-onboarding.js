const { makePassword, normalizeEmail, savePortalUser, slugify } = require('./_portal');
const fs = require('fs');
const path = require('path');

const ORANGE = '#E8561A';
const TEAL = '#0C4A4A';
const DARK = '#1A1A1A';
const CREAM = '#F8F4EF';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fieldValue(value, fallback = 'Not specified') {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  return String(value || '').trim() || fallback;
}

function makeStarterKitHtml({ company, contact, portalEmail, portalPassword, request }) {
  const onboarding = request.onboarding || {};
  const templatePath = path.join(__dirname, '..', 'files', 'organicsmith-starter-kit.html');
  try {
    let html = fs.readFileSync(templatePath, 'utf8');

    const co  = escapeHtml(company);
    const ct  = escapeHtml(contact);
    const em  = escapeHtml(portalEmail);
    const pw  = escapeHtml(portalPassword);
    const sec = escapeHtml(onboarding.sector   || 'Business');
    const loc = escapeHtml(onboarding.location || 'South Africa');
    const gol = escapeHtml(onboarding.goal     || 'Increase customers and improve access');
    const tl  = escapeHtml(onboarding.timeline || 'As soon as possible');
    const products = escapeHtml(fieldValue(onboarding.product, 'MgucaTech services'));
    const plan = escapeHtml(onboarding.package || 'Starter');
    const billing = escapeHtml(onboarding.billingStatus || 'Not discussed');
    const volume = escapeHtml(onboarding.volume || 'Under 500');
    const systems = escapeHtml(onboarding.systems || 'Not specified');
    const languages = escapeHtml(onboarding.language || 'English');
    const decision = escapeHtml(onboarding.decisionStatus || 'Interested');
    const whatsapp = escapeHtml(onboarding.phone || '+27 76 047 0141');
    const consultant = escapeHtml(onboarding.consultantName || 'MgucaTech');
    const consultantEmail = escapeHtml(onboarding.consultantEmail || 'admin@mgucatech.com');
    const goalSummary = escapeHtml((onboarding.goal || 'Growth').replace(/\.$/, ''));

    // Order matters — replace the most specific strings first so a later,
    // shorter pattern does not partially re-match what a previous one produced.
    [
      // <title> and body heading
      [/OrganicSmith Starter Kit/g,              `${co} Starter Kit`],
      [/OrganicSmith/g,                          co],
      [/\bKista\b/g,                             ct],
      // Credentials (exact strings used in the HTML template)
      [/organicsmith@gmail\.com/g,               em],
      [/MGT-HPemqvGhcq/g,                        pw],
      [/Bakhokhele Mguca/g,                       consultant],
      [/admin@mgucatech\.com/g,                   consultantEmail],
      [/\+27 76 047 0141/g,                       whatsapp],
      // Consultant card: remove the stale "(portal)" annotation so it reads
      // as just the email address regardless of who the client is
      [/ \(portal\)/g,                            ''],
      // Sector + location must replace the combined pill BEFORE the
      // individual tokens, otherwise the first individual pass leaves
      // a dangling separator in strings like "Healthcare · Cape Town".
      [/Healthcare · Cape Town, Western Cape/g,  `${sec} · ${loc}`],
      [/Healthcare · Cape Town/g,                `${sec} · ${loc}`],
      [/Cape Town, Western Cape/g,               loc],
      [/Cape Town/g,                             loc],
      [/\bHealthcare\b/g,                        sec],
      // Goal and timeline
      [/Increase customers &amp; patient access/g, gol],
      [/â†‘ Customers/g,                           goalSummary],
      [/As soon as possible/g,                   tl],
      [/Starter Package/g,                        `${plan} Package`],
      [/Starter Kit/g,                            `${plan} Kit`],
      [/\bStarter\b/g,                            plan],
      [/WhatsApp Â· Booking Â· Portal/g,           products],
      [/patient/g,                                'client'],
      [/patients/g,                               'clients'],
      [/practice/g,                               'business'],
      [/practice's/g,                             "business's"],
    ].forEach(([pattern, value]) => { html = html.replace(pattern, value); });

    const serviceRequestHtml = `
      <div class="consultant-card" style="margin-bottom:24px;">
        <div class="c-label">Service Request Details</div>
        <div class="c-detail"><strong>Products:</strong> ${products}</div>
        <div class="c-detail"><strong>Package:</strong> ${plan}</div>
        <div class="c-detail"><strong>Billing:</strong> ${billing}</div>
        <div class="c-detail"><strong>Volume:</strong> ${volume}</div>
        <div class="c-detail"><strong>Timeline:</strong> ${tl}</div>
        <div class="c-detail"><strong>Systems:</strong> ${systems}</div>
        <div class="c-detail"><strong>Languages:</strong> ${languages}</div>
        <div class="c-detail"><strong>Decision:</strong> ${decision}</div>
        <div class="c-detail"><strong>WhatsApp:</strong> ${whatsapp}</div>
      </div>`;
    html = html.replace(
      /(\s*<div class="consultant-card">\s*<div class="c-label">Your Consultant<\/div>)/,
      `${serviceRequestHtml}$1`,
    );

    return html;
  } catch {
    return `<!DOCTYPE html><html><body>
      <h1>MgucaTECH Starter Kit — ${escapeHtml(company)}</h1>
      <p>Portal: https://client-portal.mgucatech.com</p>
      <p>Email: ${escapeHtml(portalEmail)}</p>
      <p>Password: ${escapeHtml(portalPassword)}</p>
    </body></html>`;
  }
}

async function htmlToPdf(html) {
  const chromium = require('@sparticuz/chromium-min');
  const puppeteer = require('puppeteer-core');

  const version = chromium.version || '131.0.0';
  const binaryUrl = process.env.CHROMIUM_BINARY_URL
    || `https://github.com/Sparticuz/chromium/releases/download/v${version}/chromium-v${version}-pack.tar`;
  const executablePath = await chromium.executablePath(binaryUrl);

  const browser = await puppeteer.launch({
    // Spread into a fresh array — Puppeteer mutates the args list internally
    // and chromium.args is a frozen readonly reference in some package versions.
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 },
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    // Use 'load' (not 'networkidle2'). In serverless, networkidle2 waits for
    // ALL pending network requests to drop to ≤2 for 500 ms, which never
    // reliably happens when Google Fonts CDN requests are in-flight — causing
    // a 30 s timeout and block the OrganicSmith-style PDF render.
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });

    // Explicitly wait for the font faces (Cormorant Garamond + DM Sans) to
    // finish loading. Race against a 6 s ceiling so a CDN hiccup doesn't
    // block the whole render — Chromium will substitute the system fallback
    // rather than leaving blank glyphs.
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise(resolve => setTimeout(resolve, 6000)),
    ]);

    // Print overrides: accurate background colours, hide nav, clean page breaks.
    // Use both the legacy page-break-* and the modern CSS break-* properties
    // because Chromium 120+ honours break-before/after in paginated contexts
    // but older lambda images may only support the legacy syntax.
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .sidenav { display: none !important; }
        @media print {
          section {
            page-break-before: always;
            break-before: page;
          }
          section#cover {
            page-break-before: avoid;
            break-before: avoid;
          }
        }
      `,
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
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Email send failed');
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
    const email   = normalizeEmail(request.email);
    const company = request.company || request.onboarding?.company || request.subject?.replace(/^Onboarding:\s*/i, '') || 'MgucaTECH Client';
    const password = makePassword();

    const user = {
      id: `portal-${Date.now()}`,
      email, password,
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

    const pdfArgs = { company, contact: request.requester, portalEmail: email, portalPassword: password, request };
    const starterKitHtml = makeStarterKitHtml(pdfArgs);

    let pdf;
    let pdfMethod = 'organic-html-template';
    try {
      pdf = await htmlToPdf(starterKitHtml);
    } catch (puppeteerErr) {
      console.error('Puppeteer failed:', puppeteerErr.message);
      throw new Error('Starter kit PDF render failed. The PDF must be generated from the personalized OrganicSmith starter kit design.');
    }

    await sendEmail({
      from: 'MgucaTECH <admin@mgucatech.com>',
      to: [email],
      reply_to: 'admin@mgucatech.com',
      subject: 'Your MgucaTECH onboarding has been approved',
      html: starterKitHtml,
      attachments: [
        { filename: `${slugify(company)}-starter-kit.pdf`,  content: pdf },
        { filename: `${slugify(company)}-starter-kit.html`, content: Buffer.from(starterKitHtml).toString('base64') },
      ],
    });

    return res.status(200).json({
      success: true,
      pdfMethod,
      portalUser: { email: user.email, clientId: user.clientId, clientName: user.clientName, plan: user.plan },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
