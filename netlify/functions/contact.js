export const handler = async (event) => {
  const allowOrigin = event.headers.origin || '*';

  if (event.httpMethod === 'OPTIONS') {
    return resp(204, null, allowOrigin);
  }
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method not allowed' }, allowOrigin);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      first_name = '', last_name = '', email = '', phone = '',
      subject = '', message = '', _gotcha = ''
    } = body;

    if (_gotcha) return resp(200, { ok: true }, allowOrigin);

    if (!first_name || !last_name || !email || !subject || !message) {
      return resp(400, { error: 'Missing required fields' }, allowOrigin);
    }

    const fullName = `${first_name} ${last_name}`.trim();

    const html = `
      <h2>New contact form submission</h2>
      <p><b>Name:</b> ${esc(fullName)}</p>
      <p><b>Email:</b> ${esc(email)}</p>
      <p><b>Phone:</b> ${esc(phone)}</p>
      <p><b>Subject:</b> ${esc(subject)}</p>
      <p><b>Message:</b><br>${esc(message).replace(/\n/g, '<br>')}</p>
    `;
    const text =
      `New contact form submission\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nSubject: ${subject}\n\n${message}\n`;

    const payload = {
      from: { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME || 'Tunza Esports' },
      to:   [{ email: process.env.TO_EMAIL,   name: 'Tunza Esports' }],
      reply_to: { email, name: fullName },
      subject: `[Contact] ${subject}`.slice(0, 150),
      html, text
    };

    const apiRes = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!apiRes.ok) {
      let err;
      try { err = await apiRes.json(); } catch {}
      return resp(500, { error: err?.message || 'MailerSend error' }, allowOrigin);
    }

    return resp(200, { ok: true }, allowOrigin);

  } catch {
    return resp(400, { error: 'Invalid JSON' }, allowOrigin);
  }
};

function resp(status, data, origin='*') {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Vary': 'Origin'
    },
    body: data ? JSON.stringify(data) : ''
  };
}
function esc(s=''){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
