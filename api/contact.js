module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
              <p style="margin:0;font-size:16px;color:#0f172a;font-weight:600;">${name}</p>
              <p style="margin:2px 0 0;font-size:14px;color:#0a9396;">${email}</p>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Subject</p>
              <p style="margin:0;font-size:16px;color:#0f172a;font-weight:600;">${subject}</p>
            </td></tr>
            <tr><td style="padding:12px 0;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Message</p>
              <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr><td align="center">
              <a href="mailto:${email}" style="display:inline-block;background:#0a9396;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">Reply to ${name}</a>
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
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data.message || 'Send failed' });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
