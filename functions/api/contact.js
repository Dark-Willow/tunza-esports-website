// functions/api/contact.js
// Cloudflare Pages Functions (module syntax)

const ALLOWED_ORIGIN = 'https://www.tunzaesports.org';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  try {
    const data = await readBody(request);

    // spam trap
    if (data._gotcha) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders() });
    }

    const {
      first_name = '', last_name = '', email = '', phone = '',
      subject = '', message = ''
    } = data || {};

    if (!first_name || !last_name || !email || !subject || !message) {
      return json({ ok: false, error: 'Missing required fields.' }, 400);
    }

    // Build email
    const fullName = `${first_name} ${last_name}`.trim();
    const html = `
      <h2>New contact form message</h2>
      <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || '-')}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
    `;
    const text =
`New contact form message

Name:   ${fullName}
Email:  ${email}
Phone:  ${phone || '-'}

Subject: ${subject}

${message}
`;

    // Send via MailerSend
    const msRes = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    { email: env.FROM_EMAIL, name: env.FROM_NAME || 'Tunza Esports' },
        to:      [{ email: env.TO_EMAIL,  name: 'Tunza Esports' }],
        subject: `Contact: ${subject}`.slice(0, 150),
        html,
        text,
        reply_to: { email, name: fullName },
      }),
    });

    if (!msRes.ok) {
      const detail = await safeText(msRes);
      return json({ ok: false, error: 'MailerSend error', detail }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: 'Invalid request', detail: String(err) }, 400);
  }
}

/* helpers */
async function readBody(request) {
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    return await request.json();
  }
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await request.formData();
    return Object.fromEntries(fd.entries());
  }
  return {};
}

function j
