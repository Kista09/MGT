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

    const co  = escapeHtml(company);
    const ct  = escapeHtml(contact);
    const em  = escapeHtml(portalEmail);
    const pw  = escapeHtml(portalPassword);
    const sec = escapeHtml(onboarding.sector   || 'Business');
    const loc = escapeHtml(onboarding.location || 'South Africa');
    const gol = escapeHtml(onboarding.goal     || 'Increase customers and improve access');
    const tl  = escapeHtml(onboarding.timeline || 'As soon as possible');

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
      [/As soon as possible/g,                   tl],
    ].forEach(([pattern, value]) => { html = html.replace(pattern, value); });

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

function makeStarterKitPdfFromDesignedFile() {
  const pdfPath = path.join(__dirname, '..', 'files', 'organicsmith-starter-kit.pdf');
  return fs.readFileSync(pdfPath).toString('base64');
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
    // a 30 s timeout and silent fallback to the pdfmake version.
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

// pdfmake table-cell helper: no borders, optional extra opts
function tc(stack, opts = {}) {
  return { border: [false, false, false, false], stack, ...opts };
}

// Single-cell borderless table acting as a coloured card
function card(stack, fillColor, padding = 18) {
  return {
    table: { widths: ['*'], body: [[tc(stack, { fillColor, margin: [padding, padding, padding, padding] })]] },
  };
}

function makeStarterKitPdf({ company, contact, portalEmail, portalPassword, request }) {
  const PdfPrinter = require('pdfmake');

  let fonts;
  // ── Fonts: prefer Cormorant Garamond + DM Sans downloaded to files/fonts/
  const fontsDir = path.join(__dirname, '..', 'files', 'fonts');
  let hF = 'CormorantGaramond', bF = 'DMSans';
  try {
    const need = ['CG-0.ttf','CG-1.ttf','CG-2.ttf','CG-3.ttf','DM-0.ttf','DM-1.ttf','DM-2.ttf'];
    need.forEach(f => { if (!fs.existsSync(path.join(fontsDir, f))) throw new Error(`Missing ${f}`); });
    fonts = {
      CormorantGaramond: {
        normal:      path.join(fontsDir, 'CG-2.ttf'),
        bold:        path.join(fontsDir, 'CG-3.ttf'),
        italics:     path.join(fontsDir, 'CG-0.ttf'),
        bolditalics: path.join(fontsDir, 'CG-1.ttf'),
      },
      DMSans: {
        normal:      path.join(fontsDir, 'DM-1.ttf'),
        bold:        path.join(fontsDir, 'DM-2.ttf'),
        italics:     path.join(fontsDir, 'DM-0.ttf'),
        bolditalics: path.join(fontsDir, 'DM-2.ttf'),
      },
    };
  } catch (fontErr) {
    console.warn('Custom fonts unavailable, using Helvetica:', fontErr.message);
    hF = 'Helvetica'; bF = 'Helvetica';
    fonts = {
      Helvetica: {
        normal: 'Helvetica', bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique',
      },
    };
  }

  const printer = new PdfPrinter(fonts);

  // ── Data
  const onboarding = request.onboarding || {};
  const plan     = onboarding.package  || 'Starter';
  const goal     = onboarding.goal     || 'Grow your business';
  const timeline = onboarding.timeline || 'As soon as possible';
  const sector   = onboarding.sector   || 'Business';
  const location = onboarding.location || 'South Africa';
  const dateStr  = new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

  // ── Elephant background image
  let elephantB64 = null;
  try {
    elephantB64 = 'data:image/jpeg;base64,' +
      fs.readFileSync(path.join(__dirname, '..', 'files', 'elephant.jpg')).toString('base64');
  } catch { /* no elephant, cover still works */ }

  // ── Layout helpers
  const W = 595.28, H = 841.89, P = 42;
  const lbl = (text, color = ORANGE) => ({
    text, font: bF, fontSize: 7.5, bold: true, color, characterSpacing: 1.5,
  });
  const h1 = (lines, size = 40) => ({
    stack: lines.map(([t, italic, color]) => ({
      text: t, font: hF, fontSize: size, color: color || DARK,
      italics: !!italic, bold: !italic, lineHeight: 0.95,
    })),
  });
  const sep = () => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' }], margin: [0, 10, 0, 12] });
  const badge = (text, bg = '#e5e7eb', color = '#555') => ({
    table: { widths: ['auto'], body: [[{ border: [false,false,false,false], fillColor: bg, text, font: bF, fontSize: 7.5, bold: true, color, characterSpacing: 0.5, margin: [7, 3, 7, 3] }]] },
  });

  const doc = {
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 0],

    background(currentPage) {
      if (currentPage === 1) {
        if (elephantB64) {
          return [
            { image: elephantB64, width: W * 0.68, absolutePosition: { x: W * 0.34, y: 0 } },
            { canvas: [{ type: 'rect', x: 0, y: 0, w: W, h: H, color: DARK, fillOpacity: 0.76 }] },
          ];
        }
        return { canvas: [{ type: 'rect', x: 0, y: 0, w: W, h: H, color: DARK }] };
      }
      return { canvas: [{ type: 'rect', x: 0, y: 0, w: W, h: H, color: CREAM }] };
    },

    content: [

      // ── PAGE 1: COVER ──────────────────────────────────────────────────────
      {
        margin: [P, P * 1.1, P, 0],
        stack: [
          { text: 'MgucaTech Solutions', font: bF, fontSize: 11, bold: true, color: '#fff', margin: [0, 0, 0, 3] },
          { text: 'UBUNTU IN TECH  ·  SOUTH AFRICA', font: bF, fontSize: 7, color: 'rgba(255,255,255,0.4)', characterSpacing: 1.5 },
        ],
      },

      { text: '', margin: [0, 0, 0, H * 0.25] },

      {
        margin: [P, 0, P * 3.5, 0],
        stack: [
          lbl('YOUR STARTER KIT'),
          { text: '', margin: [0, 0, 0, 12] },
          h1([
            ['Welcome', false, '#fff'],
            ['to the', true, '#fff'],
            ['Journey.', false, '#fff'],
          ], 52),
          { text: '', margin: [0, 0, 0, 20] },
          {
            text: 'Everything you need to get your WhatsApp automation, booking workflow, and client portal up and running — fast.',
            font: bF, fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
          },
        ],
      },

      { text: '', margin: [0, 0, 0, H * 0.14] },

      {
        margin: [P, 0, P, P],
        columns: [
          {
            width: '*',
            stack: [
              lbl('PREPARED FOR'),
              { text: '', margin: [0, 0, 0, 8] },
              { text: company, font: hF, fontSize: 28, bold: true, color: '#fff', margin: [0, 0, 0, 5] },
              { text: contact, font: bF, fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: [0, 0, 0, 3] },
              { text: `${sector}  ·  ${location}`, font: bF, fontSize: 10, color: 'rgba(255,255,255,0.4)' },
            ],
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              { text: dateStr, font: bF, fontSize: 9, color: 'rgba(255,255,255,0.3)', alignment: 'right', margin: [0, 5, 0, 4] },
              { text: `${plan} Package`, font: bF, fontSize: 9, bold: true, color: ORANGE, alignment: 'right' },
            ],
          },
        ],
      },

      // ── PAGE 2: WELCOME ────────────────────────────────────────────────────
      { text: '', pageBreak: 'before' },
      {
        margin: [P, P * 1.3, P, 28],
        stack: [
          lbl('01  ·  WELCOME'),
          { text: '', margin: [0, 0, 0, 10] },
          h1([['Your approved', false, DARK], ['Starter Kit.', true, TEAL]], 38),
          sep(),
          {
            text: `Congratulations ${contact} — your onboarding request has been approved. This document is your official welcome pack for the ${plan} package. Everything below is ready for you.`,
            font: bF, fontSize: 11, color: '#555', lineHeight: 1.65, margin: [0, 0, 0, 0],
          },
        ],
      },
      {
        margin: [P, 0, P, 0],
        columns: [
          {
            width: '52%',
            margin: [0, 0, 16, 0],
            stack: [
              lbl('YOUR DETAILS'),
              { text: '', margin: [0, 0, 0, 10] },
              {
                table: { widths: ['*'], body: [[tc([
                  { text: 'COMPANY', font: bF, fontSize: 7, bold: true, color: ORANGE, characterSpacing: 1, margin: [0, 0, 0, 4] },
                  { text: company, font: hF, fontSize: 22, bold: true, color: '#fff', margin: [0, 0, 0, 14] },
                  { text: 'CONTACT', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.45)', characterSpacing: 1, margin: [0, 0, 0, 3] },
                  { text: contact, font: bF, fontSize: 11, color: '#fff', margin: [0, 0, 0, 12] },
                  { text: 'SECTOR', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.45)', characterSpacing: 1, margin: [0, 0, 0, 3] },
                  { text: sector, font: bF, fontSize: 11, color: '#fff', margin: [0, 0, 0, 12] },
                  { text: 'LOCATION', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.45)', characterSpacing: 1, margin: [0, 0, 0, 3] },
                  { text: location, font: bF, fontSize: 11, color: '#fff', margin: [0, 0, 0, 12] },
                  { text: 'PACKAGE', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.45)', characterSpacing: 1, margin: [0, 0, 0, 3] },
                  { text: plan, font: bF, fontSize: 11, bold: true, color: ORANGE },
                ], { fillColor: TEAL, margin: [20, 22, 20, 22] })]],
                },
              },
            ],
          },
          {
            width: '*',
            stack: [
              lbl('YOUR CONSULTANT'),
              { text: '', margin: [0, 0, 0, 10] },
              card([
                { text: 'Bakhokhele Mguca', font: hF, fontSize: 20, bold: true, color: DARK, margin: [0, 0, 0, 3] },
                { text: 'Founder & Lead Consultant', font: bF, fontSize: 10, color: '#777', margin: [0, 0, 0, 14] },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 12] },
                { text: 'admin@mgucatech.com', font: bF, fontSize: 10, color: TEAL, margin: [0, 0, 0, 4] },
                { text: '+27 76 047 0141', font: bF, fontSize: 10, color: TEAL },
              ], '#fff'),
              { text: '', margin: [0, 12, 0, 0] },
              card([
                { text: 'PRIMARY GOAL', font: bF, fontSize: 7, bold: true, color: ORANGE, characterSpacing: 1, margin: [0, 0, 0, 6] },
                { text: goal, font: bF, fontSize: 12, color: '#fff', lineHeight: 1.45 },
              ], TEAL),
            ],
          },
        ],
      },

      // ── PAGE 3: YOUR SOLUTION ──────────────────────────────────────────────
      { text: '', pageBreak: 'before' },
      {
        margin: [P, P * 1.3, P, 24],
        stack: [
          lbl('02  ·  YOUR APPROVED SOLUTION'),
          { text: '', margin: [0, 0, 0, 10] },
          h1([["What you're", false, DARK], ['getting.', true, TEAL]], 38),
          sep(),
          {
            text: `The ${plan} package includes three integrated tools built to work together and grow with ${company}.`,
            font: bF, fontSize: 11, color: '#555', lineHeight: 1.6,
          },
        ],
      },
      {
        margin: [P, 0, P, 18],
        columns: [
          {
            width: '33%',
            margin: [0, 0, 8, 0],
            stack: [card([
              { text: '01', font: bF, fontSize: 9, bold: true, color: ORANGE, margin: [0, 0, 0, 8] },
              { text: 'WhatsApp\nChatbot', font: hF, fontSize: 22, bold: true, color: DARK, lineHeight: 1.0, margin: [0, 0, 0, 10] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 60, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 10] },
              { text: 'AI-powered assistant on the channel your clients already use.', font: bF, fontSize: 10, color: '#666', lineHeight: 1.5, margin: [0, 0, 0, 12] },
              { text: '— Automated responses\n— Smart FAQ handling\n— Human handoff\n— Operating hours\n— Branded flows', font: bF, fontSize: 9.5, color: '#555', lineHeight: 1.7 },
            ], '#fff')],
          },
          {
            width: '33%',
            margin: [0, 0, 8, 0],
            stack: [card([
              { text: '02', font: bF, fontSize: 9, bold: true, color: ORANGE, margin: [0, 0, 0, 8] },
              { text: 'Booking\nWorkflow', font: hF, fontSize: 22, bold: true, color: DARK, lineHeight: 1.0, margin: [0, 0, 0, 10] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 60, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 10] },
              { text: 'End-to-end appointment booking through WhatsApp.', font: bF, fontSize: 10, color: '#666', lineHeight: 1.5, margin: [0, 0, 0, 12] },
              { text: '— Real-time availability\n— Auto confirmations\n— Reminder messages\n— Cancellation handling\n— Capacity management', font: bF, fontSize: 9.5, color: '#555', lineHeight: 1.7 },
            ], '#fff')],
          },
          {
            width: '*',
            stack: [card([
              { text: '03', font: bF, fontSize: 9, bold: true, color: ORANGE, margin: [0, 0, 0, 8] },
              { text: 'Client\nPortal', font: hF, fontSize: 22, bold: true, color: DARK, lineHeight: 1.0, margin: [0, 0, 0, 10] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 60, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 10] },
              { text: 'Your centralised dashboard — monitor everything in one place.', font: bF, fontSize: 10, color: '#666', lineHeight: 1.5, margin: [0, 0, 0, 12] },
              { text: '— Live booking dashboard\n— Conversation history\n— Team management\n— Performance analytics\n— Content management', font: bF, fontSize: 9.5, color: '#555', lineHeight: 1.7 },
            ], '#fff')],
          },
        ],
      },
      {
        margin: [P, 0, P, 0],
        table: {
          widths: ['*', 88, 160],
          body: [[
            tc([
              { text: 'PRIMARY GOAL', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.5)', characterSpacing: 1, margin: [0, 0, 0, 4] },
              { text: goal, font: bF, fontSize: 12, bold: true, color: '#fff' },
            ], { fillColor: TEAL, margin: [18, 14, 18, 14] }),
            tc([
              { text: 'PACKAGE', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.5)', characterSpacing: 1, margin: [0, 0, 0, 4] },
              { text: plan, font: bF, fontSize: 12, bold: true, color: '#fff' },
            ], { fillColor: TEAL, margin: [14, 14, 14, 14] }),
            tc([
              { text: 'LAUNCH TIMING', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.65)', characterSpacing: 1, margin: [0, 0, 0, 4] },
              { text: timeline, font: bF, fontSize: 12, bold: true, color: '#fff' },
            ], { fillColor: ORANGE, margin: [18, 14, 18, 14] }),
          ]],
        },
      },

      // ── PAGE 4: ONBOARDING CHECKLIST ───────────────────────────────────────
      { text: '', pageBreak: 'before' },
      {
        margin: [P, P * 1.3, P, 32],
        stack: [
          lbl('03  ·  ONBOARDING CHECKLIST'),
          { text: '', margin: [0, 0, 0, 10] },
          h1([['Five steps', false, DARK], ['to launch.', true, TEAL]], 38),
          sep(),
        ],
      },
      ...[
        ['01', 'Log in & Confirm Details',
          'Visit client-portal.mgucatech.com, sign in with your credentials, and verify all your business information is accurate.',
          'ACTION REQUIRED', '#e5e7eb', '#555'],
        ['02', 'Share Brand & Content Assets',
          'Provide brand guidelines, FAQ document, pricing info, booking rules, support content, and your tone of voice.',
          'ACTION REQUIRED', '#e5e7eb', '#555'],
        ['03', 'Confirm Handoff & Hours',
          'Identify who handles escalated conversations and define operating hours for automated responses.',
          'ACTION REQUIRED', '#e5e7eb', '#555'],
        ['04', 'Approve First Workflow',
          'Review and sign off on the initial chatbot flow or portal configuration. Your approval is required before go-live.',
          'APPROVAL NEEDED', '#fef3c7', '#92400e'],
        ['05', 'Post-Launch Review',
          'Attend the review session 14 days after launch to assess usage, handoff quality, and approve any improvements.',
          'SCHEDULED', '#d1fae5', '#065f46'],
      ].map(([num, title, desc, badgeText, badgeBg, badgeColor], i) => ({
        margin: [P, 0, P, i < 4 ? 18 : 0],
        columns: [
          {
            width: 44,
            table: { widths: [32], body: [[{ border: [false,false,false,false], fillColor: ORANGE, text: num, font: bF, fontSize: 13, bold: true, color: '#fff', alignment: 'center', margin: [0, 10, 0, 10] }]] },
            margin: [0, 2, 0, 0],
          },
          {
            width: '*',
            margin: [14, 0, 0, 0],
            stack: [
              { text: title, font: bF, fontSize: 13, bold: true, color: DARK },
              { text: desc, font: bF, fontSize: 10, color: '#666', lineHeight: 1.5, margin: [0, 4, 0, 7] },
              badge(badgeText, badgeBg, badgeColor),
            ],
          },
        ],
      })),

      // ── PAGE 5: PROJECTIONS ────────────────────────────────────────────────
      { text: '', pageBreak: 'before' },
      {
        margin: [P, P * 1.3, P, 28],
        stack: [
          lbl('04  ·  INVESTMENT & TIMELINE'),
          { text: '', margin: [0, 0, 0, 10] },
          h1([['Your investment,', false, DARK], ['projected.', true, TEAL]], 38),
          sep(),
        ],
      },
      {
        margin: [P, 0, P, 0],
        columns: [
          {
            width: '44%',
            margin: [0, 0, 20, 0],
            stack: [
              card([
                { text: 'ONE-TIME SETUP', font: bF, fontSize: 7.5, bold: true, color: 'rgba(255,255,255,0.65)', characterSpacing: 1, margin: [0, 0, 0, 6] },
                { text: 'Configuration & Launch', font: bF, fontSize: 10.5, color: '#fff', margin: [0, 0, 0, 10] },
                { text: 'R3 500', font: hF, fontSize: 44, bold: true, color: '#fff', lineHeight: 1.0, margin: [0, 0, 0, 2] },
                { text: 'once-off', font: bF, fontSize: 9, color: 'rgba(255,255,255,0.55)' },
              ], ORANGE),
              { text: '', margin: [0, 10, 0, 0] },
              card([
                { text: 'MONTHLY SUPPORT', font: bF, fontSize: 7.5, bold: true, color: ORANGE, characterSpacing: 1, margin: [0, 0, 0, 6] },
                { text: 'Hosting & Monitoring', font: bF, fontSize: 10.5, color: DARK, margin: [0, 0, 0, 10] },
                { text: 'R1 470', font: hF, fontSize: 44, bold: true, color: DARK, lineHeight: 1.0, margin: [0, 0, 0, 2] },
                { text: '/ month', font: bF, fontSize: 9, color: '#888' },
              ], '#fff'),
            ],
          },
          {
            width: '*',
            stack: [
              lbl('LAUNCH TIMELINE'),
              { text: '', margin: [0, 0, 0, 14] },
              ...[
                ['Week 1–2',  'Onboarding & Setup',  'Content submission and configuration',  false],
                ['Week 2–3',  'Build & Customise',   'Chatbot flows, portal, booking setup',  false],
                ['Launch',    'Go Live',              'Everything is live and ready',          true],
                ['+14 Days',  'First Review',         'Measure usage and quality improvements', false],
                ['Monthly',   'Ongoing Support',      'Monitoring, updates, growth tracking',  false],
              ].map(([timing, title, desc, highlight], i) => ({
                columns: [
                  {
                    width: 66,
                    table: { widths: [58], body: [[{ border: [false,false,false,false], fillColor: highlight ? ORANGE : '#e5e7eb', text: timing, font: bF, fontSize: 8, bold: true, color: highlight ? '#fff' : '#555', alignment: 'center', margin: [4, 6, 4, 6] }]] },
                  },
                  {
                    width: '*',
                    margin: [10, 1, 0, 0],
                    stack: [
                      { text: title, font: bF, fontSize: 11, bold: true, color: DARK },
                      { text: desc, font: bF, fontSize: 9, color: '#777', margin: [0, 2, 0, 0] },
                    ],
                  },
                ],
                margin: [0, 0, 0, i < 4 ? 12 : 0],
              })),
            ],
          },
        ],
      },

      // ── PAGE 6: CREDENTIALS ────────────────────────────────────────────────
      { text: '', pageBreak: 'before' },
      {
        margin: [P, P * 1.3, P, 28],
        stack: [
          lbl('05  ·  PORTAL & WHATSAPP ACCESS'),
          { text: '', margin: [0, 0, 0, 10] },
          h1([['Your credentials', false, DARK], ['& channels.', true, TEAL]], 38),
          sep(),
        ],
      },
      {
        margin: [P, 0, P, 0],
        columns: [
          {
            width: '55%',
            margin: [0, 0, 16, 0],
            stack: [
              {
                table: { widths: ['*'], body: [[tc([
                  { text: 'CLIENT PORTAL LOGIN', font: bF, fontSize: 8, bold: true, color: ORANGE, characterSpacing: 1, margin: [0, 0, 0, 18] },
                  { text: 'PORTAL URL', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.45)', characterSpacing: 1, margin: [0, 0, 0, 3] },
                  { text: 'client-portal.mgucatech.com', font: bF, fontSize: 11, color: '#fff', margin: [0, 0, 0, 14] },
                  { text: 'LOGIN EMAIL', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.45)', characterSpacing: 1, margin: [0, 0, 0, 3] },
                  { text: portalEmail, font: bF, fontSize: 11, color: '#fff', margin: [0, 0, 0, 14] },
                  { text: 'TEMPORARY PASSWORD', font: bF, fontSize: 7, bold: true, color: 'rgba(255,255,255,0.45)', characterSpacing: 1, margin: [0, 0, 0, 3] },
                  { text: portalPassword, font: hF, fontSize: 28, bold: true, color: '#fff', margin: [0, 0, 0, 16] },
                  {
                    table: { widths: ['*'], body: [[{ border: [false,false,false,false], fillColor: '#0a3333', text: 'Change your password immediately after first login. This credential is only shared in this document.', font: bF, fontSize: 9, color: '#fbbf24', lineHeight: 1.4, margin: [10, 8, 10, 8] }]] },
                  },
                ], { fillColor: TEAL, margin: [22, 22, 22, 22] })]],
                },
              },
            ],
          },
          {
            width: '*',
            stack: [
              card([
                { text: 'WHATSAPP SUPPORT', font: bF, fontSize: 7.5, bold: true, color: ORANGE, characterSpacing: 1, margin: [0, 0, 0, 10] },
                { text: '+27 76 047 0141', font: hF, fontSize: 28, bold: true, color: DARK, lineHeight: 1.1, margin: [0, 0, 0, 10] },
                { text: 'The MgucaTech support line. Message us here for any setup queries or assistance during onboarding.', font: bF, fontSize: 10, color: '#666', lineHeight: 1.5 },
              ], '#fff'),
              { text: '', margin: [0, 14, 0, 0] },
              card([
                { text: 'YOUR CONSULTANT', font: bF, fontSize: 7.5, bold: true, color: ORANGE, characterSpacing: 1, margin: [0, 0, 0, 10] },
                { text: 'Bakhokhele Mguca', font: hF, fontSize: 18, bold: true, color: DARK, margin: [0, 0, 0, 3] },
                { text: 'Founder · MgucaTech Solutions', font: bF, fontSize: 9, color: '#777', margin: [0, 0, 0, 12] },
                { text: 'admin@mgucatech.com', font: bF, fontSize: 10, color: TEAL, margin: [0, 0, 0, 4] },
                { text: '+27 76 047 0141', font: bF, fontSize: 10, color: TEAL },
              ], '#fff'),
            ],
          },
        ],
      },

      // ── PAGE 7: NEXT STEPS ─────────────────────────────────────────────────
      { text: '', pageBreak: 'before' },
      {
        margin: [P, P * 1.3, P, 32],
        stack: [
          lbl('06  ·  NEXT STEPS'),
          { text: '', margin: [0, 0, 0, 10] },
          h1([['What happens', false, DARK], ['next.', true, TEAL]], 38),
          sep(),
          {
            text: `You're all set, ${contact}. Here's what to do in the next 48 hours to get started.`,
            font: bF, fontSize: 11, color: '#555', lineHeight: 1.65,
          },
        ],
      },
      ...[
        ['1', 'Log in to your portal today',
          'Go to client-portal.mgucatech.com and sign in with your credentials above. Explore your dashboard and verify your details are correct.'],
        ['2', 'Send us your brand assets',
          'Email or upload your logo, brand colours, FAQ document, and any content needed to build your chatbot flows and booking setup.'],
        ['3', 'Schedule your kickoff call',
          'Reply to this email or WhatsApp us at +27 76 047 0141 to book your onboarding session with Bakhokhele.'],
        ['4', 'Expect your first build in 2 weeks',
          'Once we have your assets, your chatbot and booking workflow will be ready for review within 14 days.'],
      ].map(([n, title, desc], i) => ({
        margin: [P, 0, P, i < 3 ? 22 : 0],
        columns: [
          {
            width: 44,
            table: { widths: [32], body: [[{ border: [false,false,false,false], fillColor: TEAL, text: n, font: bF, fontSize: 16, bold: true, color: '#fff', alignment: 'center', margin: [0, 9, 0, 9] }]] },
            margin: [0, 2, 0, 0],
          },
          {
            width: '*',
            margin: [14, 0, 0, 0],
            stack: [
              { text: title, font: bF, fontSize: 13, bold: true, color: DARK },
              { text: desc, font: bF, fontSize: 10.5, color: '#555', lineHeight: 1.55, margin: [0, 5, 0, 0] },
            ],
          },
        ],
      })),

      {
        margin: [P, 48, P, P],
        table: {
          widths: ['*'],
          body: [[tc([
            { text: 'MgucaTech Solutions  ·  Cape Town, South Africa  ·  admin@mgucatech.com  ·  +27 76 047 0141', font: bF, fontSize: 9, color: '#aaa', alignment: 'center' },
            { text: `Ubuntu in Tech  ·  ${plan} Package  ·  ${dateStr}`, font: bF, fontSize: 8, color: '#bbb', alignment: 'center', margin: [0, 4, 0, 0] },
          ], { fillColor: DARK, margin: [20, 14, 20, 14] })]],
        },
      },

    ],

    defaultStyle: { font: bF, fontSize: 11, color: DARK, lineHeight: 1.4 },
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

    let pdf;
    let pdfMethod = 'puppeteer';
    try {
      pdf = await htmlToPdf(starterKitHtml);
    } catch (puppeteerErr) {
      console.error('Puppeteer failed:', puppeteerErr.message);
      pdfMethod = 'designed-file';
      pdf = makeStarterKitPdfFromDesignedFile();
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
