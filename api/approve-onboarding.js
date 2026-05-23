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

function makeStarterKitHtml({ company, contact, portalEmail, portalPassword, request }) {
  const onboarding = request.onboarding || {};
  const templatePath = path.join(__dirname, '..', 'files', 'organicsmith-starter-kit.html');
  try {
    let html = fs.readFileSync(templatePath, 'utf8');
    [
      [/OrganicSmith/g, escapeHtml(company)],
      [/Kista/g, escapeHtml(contact)],
      [/organicsmith@gmail\.com/g, escapeHtml(portalEmail)],
      [/MGT-HPemqvGhcq/g, escapeHtml(portalPassword)],
      [/Healthcare/g, escapeHtml(onboarding.sector || 'Business')],
      [/Cape Town, Western Cape/g, escapeHtml(onboarding.location || 'South Africa')],
      [/Cape Town/g, escapeHtml(onboarding.location || 'South Africa')],
      [/Increase customers &amp; patient access/g, escapeHtml(onboarding.goal || 'Increase customers and improve access')],
      [/As soon as possible/g, escapeHtml(onboarding.timeline || 'As soon as possible')],
    ].forEach(([p, v]) => { html = html.replace(p, v); });
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
  const binaryUrl = `https://github.com/Sparticuz/chromium/releases/download/v${version}/chromium-v${version}-pack.tar`;
  const executablePath = await chromium.executablePath(binaryUrl);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1440, height: 900 },
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    // Load the HTML and wait for Google Fonts — they are what make the PDF
    // look identical to the reference (Cormorant Garamond + DM Sans).
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });

    // Print overrides: accurate background colours, hide nav, clean page breaks
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .sidenav { display: none !important; }
        @media print {
          section { page-break-before: always; }
          section:first-of-type { page-break-before: avoid; }
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

function cell(stack, opts = {}) {
  return { border: [false, false, false, false], stack, ...opts };
}

function makeStarterKitPdf({ company, contact, portalEmail, portalPassword, request }) {
  const PdfPrinter = require('pdfmake');
  const vfsModule = require('pdfmake/build/vfs_fonts');
  const vfs = (vfsModule.pdfMake || {}).vfs || vfsModule.vfs || {};

  function fontBuf(name) {
    const raw = vfs[name];
    if (!raw) throw new Error(`pdfmake vfs missing font: ${name}`);
    return Buffer.from(raw, 'base64');
  }

  const fonts = {
    Roboto: {
      normal:      fontBuf('Roboto-Regular.ttf'),
      bold:        fontBuf('Roboto-Medium.ttf'),
      italics:     fontBuf('Roboto-Italic.ttf'),
      bolditalics: fontBuf('Roboto-MediumItalic.ttf'),
    },
  };
  const printer = new PdfPrinter(fonts);

  const onboarding = request.onboarding || {};
  const plan     = onboarding.package  || 'Starter';
  const goal     = onboarding.goal     || 'Grow your business';
  const timeline = onboarding.timeline || 'As soon as possible';
  const sector   = onboarding.sector   || 'Business';
  const location = onboarding.location || 'South Africa';
  const dateStr  = new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

  const doc = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],

    background(currentPage) {
      if (currentPage === 1) {
        return { canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 841.89, color: DARK }] };
      }
      return null;
    },

    content: [
      // ── PAGE 1: COVER ──────────────────────────────────────────────
      { text: 'MgucaTech Solutions', bold: true, fontSize: 13, color: '#fff' },
      { text: 'UBUNTU IN TECH  ·  SOUTH AFRICA', fontSize: 8, color: '#888', margin: [0, 2, 0, 56] },

      { text: 'Welcome\nto the Journey.', fontSize: 46, bold: true, color: '#fff', lineHeight: 1.1, margin: [0, 0, 0, 18] },
      {
        text: 'Everything you need to get your WhatsApp automation, booking workflow, and client portal up and running — fast.',
        fontSize: 12, color: '#aaa', lineHeight: 1.5, margin: [0, 0, 200, 56],
      },

      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'PREPARED FOR', fontSize: 9, bold: true, color: ORANGE, margin: [0, 0, 0, 6] },
              { text: company, fontSize: 22, bold: true, color: '#fff', margin: [0, 0, 0, 10] },
              { text: `Contact: ${contact}`, fontSize: 11, color: '#bbb', margin: [0, 0, 0, 3] },
              { text: `Sector: ${sector}`,   fontSize: 11, color: '#bbb', margin: [0, 0, 0, 3] },
              { text: location,              fontSize: 11, color: '#bbb', margin: [0, 0, 0, 3] },
              { text: portalEmail,           fontSize: 11, color: '#bbb' },
            ],
          },
          {
            width: 180,
            stack: [
              { text: 'PACKAGE', fontSize: 9, bold: true, color: ORANGE, margin: [0, 0, 0, 6] },
              {
                table: { widths: [164], body: [[cell([
                  { text: 'Starter Kit', bold: true, fontSize: 16, color: '#fff', margin: [14, 14, 14, 4] },
                  { text: 'WhatsApp  ·  Booking  ·  Portal', fontSize: 10, color: 'rgba(255,255,255,0.75)', margin: [14, 0, 14, 14] },
                ], { fillColor: ORANGE })]] },
              },
            ],
          },
        ],
      },
      { text: `Starter Kit  ·  ${dateStr}`, fontSize: 10, color: '#555', margin: [0, 52, 0, 0] },

      // ── PAGE 2: CREDENTIALS ────────────────────────────────────────
      { text: '', pageBreak: 'before' },
      {
        table: { widths: ['*'], body: [[cell([
          { text: '05  ·  PORTAL & WHATSAPP ACCESS', fontSize: 10, bold: true, color: ORANGE, margin: [20, 16, 20, 4] },
          { text: 'Your credentials & channels.', fontSize: 26, bold: true, color: '#fff', margin: [20, 0, 20, 16] },
        ], { fillColor: TEAL })]] },
        margin: [0, 0, 0, 24],
      },

      {
        columns: [
          {
            width: '55%',
            table: { widths: ['*'], body: [[cell([
              { text: 'CLIENT PORTAL LOGIN', fontSize: 10, bold: true, color: ORANGE, margin: [16, 16, 16, 14] },
              { text: 'PORTAL URL', fontSize: 8, color: '#aaa', margin: [16, 0, 16, 3] },
              { text: 'client-portal.mgucatech.com', fontSize: 12, color: '#fff', margin: [16, 0, 16, 14] },
              { text: 'LOGIN EMAIL', fontSize: 8, color: '#aaa', margin: [16, 0, 16, 3] },
              { text: portalEmail, fontSize: 12, color: '#fff', margin: [16, 0, 16, 14] },
              { text: 'TEMPORARY PASSWORD', fontSize: 8, color: '#aaa', margin: [16, 0, 16, 3] },
              { text: portalPassword, fontSize: 16, bold: true, color: '#fff', margin: [16, 0, 16, 14] },
              {
                table: { widths: ['*'], body: [[{ border: [false, false, false, false], fillColor: '#162e2e',
                  text: 'Change your password immediately after first login. This credential is shared in this document only.',
                  fontSize: 9, color: '#fbbf24', lineHeight: 1.4, margin: [10, 8, 10, 8],
                }]] },
                margin: [16, 0, 16, 16],
              },
            ], { fillColor: TEAL })]] },
          },
          { width: 16, text: '' },
          {
            width: '*',
            stack: [
              {
                table: { widths: ['*'], body: [[cell([
                  { text: 'WHATSAPP BUSINESS NUMBER', fontSize: 10, bold: true, color: ORANGE, margin: [16, 16, 16, 12] },
                  { text: '+27 76 047 0141', fontSize: 24, bold: true, margin: [16, 0, 16, 10] },
                  { text: 'The MgucaTech support line. Your dedicated chatbot number is configured during onboarding. Message us here for setup queries.', fontSize: 10, color: '#666', lineHeight: 1.4, margin: [16, 0, 16, 16] },
                ], { fillColor: CREAM })]] },
                margin: [0, 0, 0, 14],
              },
              {
                table: { widths: ['*'], body: [[cell([
                  { text: 'YOUR CONSULTANT', fontSize: 10, bold: true, color: ORANGE, margin: [16, 16, 16, 8] },
                  { text: 'Bakhokhele Mguca', bold: true, fontSize: 14, margin: [16, 0, 16, 3] },
                  { text: 'Consultant  ·  MgucaTech Solutions', fontSize: 10, color: '#666', margin: [16, 0, 16, 6] },
                  { text: `Email: ${portalEmail}`, fontSize: 10, color: TEAL, margin: [16, 0, 16, 3] },
                  { text: 'WhatsApp: +27 76 047 0141', fontSize: 10, color: TEAL, margin: [16, 0, 16, 16] },
                ], { fillColor: CREAM })]] },
              },
            ],
          },
        ],
      },

      // ── PAGE 3: SOLUTION + CHECKLIST + PROJECTIONS ─────────────────
      { text: '', pageBreak: 'before' },
      {
        table: { widths: ['*'], body: [[cell([
          { text: '02  ·  YOUR APPROVED SOLUTION', fontSize: 10, bold: true, color: ORANGE, margin: [20, 16, 20, 4] },
          { text: "What you're getting.", fontSize: 26, bold: true, margin: [20, 0, 20, 16] },
        ], { fillColor: CREAM })]] },
        margin: [0, 0, 0, 18],
      },

      {
        columns: [
          {
            width: '33%',
            table: { widths: ['*'], body: [[cell([
              { text: 'WhatsApp Chatbot', bold: true, fontSize: 12, margin: [10, 12, 10, 6] },
              { text: 'AI-powered conversational assistant on the channel your clients already trust.', fontSize: 10, color: '#666', lineHeight: 1.4, margin: [10, 0, 10, 8] },
              { text: 'Automated responses\nSmart FAQ handling\nHuman handoff routing\nOperating hours\nBranded flows', fontSize: 10, color: '#555', lineHeight: 1.7, margin: [10, 0, 10, 12] },
            ], { fillColor: '#fff' })]],
            heights: [240] },
            margin: [0, 0, 6, 0],
          },
          {
            width: '33%',
            table: { widths: ['*'], body: [[cell([
              { text: 'Booking Workflow', bold: true, fontSize: 12, margin: [10, 12, 10, 6] },
              { text: 'End-to-end appointment booking through WhatsApp — reduce no-shows and free up reception.', fontSize: 10, color: '#666', lineHeight: 1.4, margin: [10, 0, 10, 8] },
              { text: 'Real-time availability\nAuto confirmations\nReminder messages\nCancellation handling\nCapacity management', fontSize: 10, color: '#555', lineHeight: 1.7, margin: [10, 0, 10, 12] },
            ], { fillColor: '#fff' })]] },
            margin: [6, 0, 6, 0],
          },
          {
            width: '33%',
            table: { widths: ['*'], body: [[cell([
              { text: 'Client Portal', bold: true, fontSize: 12, margin: [10, 12, 10, 6] },
              { text: 'Your centralised dashboard — monitor bookings, conversations, and team activity.', fontSize: 10, color: '#666', lineHeight: 1.4, margin: [10, 0, 10, 8] },
              { text: 'Live booking dashboard\nConversation history\nTeam management tools\nPerformance analytics\nContent management', fontSize: 10, color: '#555', lineHeight: 1.7, margin: [10, 0, 10, 12] },
            ], { fillColor: '#fff' })]] },
            margin: [6, 0, 0, 0],
          },
        ],
        columnGap: 0,
        margin: [0, 0, 0, 14],
      },

      {
        table: {
          widths: ['*', '*', 'auto'],
          body: [[
            cell([{ text: 'Primary Goal', fontSize: 8, color: '#ccc', margin: [14, 10, 14, 3] }, { text: goal, bold: true, fontSize: 12, color: '#fff', margin: [14, 0, 14, 10] }], { fillColor: TEAL }),
            cell([{ text: 'Package', fontSize: 8, color: '#ccc', margin: [14, 10, 14, 3] }, { text: plan, bold: true, fontSize: 12, color: '#fff', margin: [14, 0, 14, 10] }], { fillColor: TEAL }),
            cell([{ text: 'Launch Timing', fontSize: 8, color: 'rgba(255,255,255,0.75)', margin: [14, 10, 14, 3] }, { text: timeline, bold: true, fontSize: 12, color: '#fff', margin: [14, 0, 14, 10] }], { fillColor: ORANGE }),
          ]],
        },
        margin: [0, 0, 0, 22],
      },

      {
        columns: [
          {
            width: '42%',
            stack: [
              { text: '04  ·  PROJECTIONS', fontSize: 10, bold: true, color: ORANGE, margin: [0, 0, 0, 10] },
              {
                table: { widths: ['*'], body: [[cell([
                  { text: 'One-time setup', fontSize: 8, color: 'rgba(255,255,255,0.75)', margin: [14, 10, 14, 3] },
                  { text: 'Configuration & Launch', bold: true, fontSize: 11, color: '#fff', margin: [14, 0, 14, 3] },
                  { text: 'R3 500', bold: true, fontSize: 28, color: '#fff', margin: [14, 0, 14, 3] },
                  { text: 'once-off', fontSize: 9, color: 'rgba(255,255,255,0.6)', margin: [14, 0, 14, 10] },
                ], { fillColor: ORANGE })]] },
                margin: [0, 0, 0, 8],
              },
              {
                table: { widths: ['*'], body: [[cell([
                  { text: 'Monthly support', fontSize: 8, color: '#999', margin: [14, 10, 14, 3] },
                  { text: 'Hosting & Monitoring', bold: true, fontSize: 11, margin: [14, 0, 14, 3] },
                  { text: 'R1 470', bold: true, fontSize: 28, margin: [14, 0, 14, 3] },
                  { text: '/ month', fontSize: 9, color: '#999', margin: [14, 0, 14, 10] },
                ], { fillColor: CREAM })]] },
              },
            ],
          },
          { width: 18, text: '' },
          {
            width: '*',
            stack: [
              { text: 'TIMELINE', fontSize: 10, bold: true, color: ORANGE, margin: [0, 0, 0, 10] },
              ...[
                ['1', 'Onboarding & Setup',    'Week 1–2',   'Content submission, configuration'],
                ['2', 'Build & Customise',      'Week 2–3',   'Chatbot flows, portal, booking setup'],
                ['3', 'Launch',                 'ASAP',       'Go live — as soon as possible'],
                ['4', 'First Review',           '+14 days',   'Measure usage, quality & improvements'],
                ['5', 'Ongoing Support',        'Monthly',    'Monitoring, updates, growth tracking'],
              ].map(([n, title, timing, desc]) => ({
                columns: [
                  { width: 22, table: { widths: [18], body: [[{ border: [false,false,false,false], fillColor: ORANGE, text: n, bold: true, fontSize: 10, color: '#fff', alignment: 'center', margin: [0, 4, 0, 4] }]] } },
                  {
                    width: '*',
                    stack: [
                      { columns: [{ text: title, bold: true, fontSize: 10, width: '*' }, { text: timing, fontSize: 9, color: ORANGE, alignment: 'right', width: 'auto' }] },
                      { text: desc, fontSize: 9, color: '#777', margin: [0, 1, 0, 0] },
                    ],
                    margin: [8, 2, 0, 0],
                  },
                ],
                margin: [0, 0, 0, 8],
              })),
            ],
          },
        ],
      },

      // ── PAGE 4: ONBOARDING CHECKLIST + NEXT STEPS ──────────────────
      { text: '', pageBreak: 'before' },
      {
        table: { widths: ['*'], body: [[cell([
          { text: '03 & 06  ·  CHECKLIST & NEXT STEPS', fontSize: 10, bold: true, color: ORANGE, margin: [20, 16, 20, 4] },
          { text: 'Five steps to launch.', fontSize: 26, bold: true, color: '#fff', margin: [20, 0, 20, 16] },
        ], { fillColor: TEAL })]] },
        margin: [0, 0, 0, 24],
      },

      ...[
        ['01', 'Log in & Confirm Company Details',    'Visit client-portal.mgucatech.com, sign in with your credentials below, and verify all your business information.',     'ACTION REQUIRED'],
        ['02', 'Share Brand & Content Assets',        'Provide brand guidelines, FAQ document, pricing info, booking rules, support content, and your tone of voice.',        'ACTION REQUIRED'],
        ['03', 'Confirm Handoff & Operating Hours',   'Identify who handles escalated conversations and define operating hours for automated responses.',                      'ACTION REQUIRED'],
        ['04', 'Approve First Workflow Before Launch','Review and sign off on the initial chatbot flow or portal configuration. Your approval is required before go-live.',    'APPROVAL NEEDED'],
        ['05', 'Post-Launch Review',                  'Attend the review session 14 days after launch to assess usage, handoff quality, and approve any improvements.',       'SCHEDULED'],
      ].map(([num, title, desc, badge]) => ({
        columns: [
          {
            width: 36,
            table: { widths: [28], body: [[{ border: [false,false,false,false], fillColor: ORANGE, text: num, bold: true, fontSize: 13, color: '#fff', alignment: 'center', margin: [0, 8, 0, 8] }]] },
            margin: [0, 2, 0, 0],
          },
          {
            width: '*',
            stack: [
              { text: title, bold: true, fontSize: 12 },
              { text: desc, fontSize: 10, color: '#666', lineHeight: 1.45, margin: [0, 3, 0, 4] },
              { table: { widths: ['auto'], body: [[{ border: [false,false,false,false], fillColor: '#e5e7eb', text: badge, fontSize: 8, bold: true, color: '#555', margin: [6, 3, 6, 3] }]] } },
            ],
            margin: [12, 0, 0, 0],
          },
        ],
        margin: [0, 0, 0, 16],
      })),

      {
        table: { widths: ['*'], body: [[cell([
          { text: 'MgucaTech Solutions  ·  Cape Town, South Africa  ·  admin@mgucatech.com  ·  +27 76 047 0141', fontSize: 9, color: '#aaa', alignment: 'center', margin: [0, 12, 0, 12] },
        ], { fillColor: DARK })]] },
        margin: [0, 24, 0, 0],
      },
    ],

    defaultStyle: { font: 'Roboto', fontSize: 11, color: DARK },
  };

  return new Promise((resolve, reject) => {
    const docDef = printer.createPdfKitDocument(doc);
    const chunks = [];
    docDef.on('data', chunk => chunks.push(chunk));
    docDef.on('end',  () => resolve(Buffer.concat(chunks).toString('base64')));
    docDef.on('error', reject);
    docDef.end();
  });
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

    let pdf = null;
    let pdfMethod = 'none';
    try {
      pdf = await htmlToPdf(starterKitHtml);
      pdfMethod = 'puppeteer';
    } catch (puppeteerErr) {
      console.error('Puppeteer failed:', puppeteerErr.message);
      try {
        pdf = await makeStarterKitPdf(pdfArgs);
        pdfMethod = 'pdfmake';
      } catch (pdfmakeErr) {
        console.error('pdfmake failed:', pdfmakeErr.message);
        pdfMethod = `none(${pdfmakeErr.message})`;
      }
    }

    const attachments = [
      { filename: `${slugify(company)}-starter-kit.html`, content: Buffer.from(starterKitHtml).toString('base64') },
    ];
    if (pdf) attachments.unshift({ filename: `${slugify(company)}-starter-kit.pdf`, content: pdf });

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
      pdfMethod,
      portalUser: { email: user.email, clientId: user.clientId, clientName: user.clientName, plan: user.plan },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
