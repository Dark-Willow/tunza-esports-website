export default {
  async fetch(request, env) {
    const allowOrigin = request.headers.get('Origin') || '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Vary': 'Origin',
        }
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, allowOrigin);
    }

    try {
      const body = await request.json();
      const {
        first_name = '', last_name = '', email = '', phone = '',
        subject = '', message = '', _gotcha = ''
      } = body || {};

      if (_gotcha) return json({ ok: true }, 200, allowOrigin); // drop spam

      if (!first_name || !last_name || !email || !subject || !message) {
        return json({ error: 'Missing required fields' }, 400, allowOrigin);
      }

      const fullName = `${first_name} ${last_name}`.trim();

      const html = `
        <h2>New contact form submission</h2>
        <p><b>Name:</b> ${escapeHtml(fullName)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Phone:</b> ${escapeHtml(phone)}</p>
        <p><b>Subject:</b> ${escapeHtml(subject)}</p>
        <p><b>Message:</b><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `;
      const text =
        `New contact form submission\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nSubject: ${subject}\n\n${message}\n`;

      const payload = {
        from: { email: env.FROM_EMAIL, name: env.FROM_NAME || 'Tunza Esports' },
        to:   [{ email: env.TO_EMAIL,   name: 'Tunza Esports' }],
        reply_to: { email, name: fullName },
        subject: `[Contact] ${subject}`.slice(0, 150),
        html, text
      };

      const apiRes = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MAILERSEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!apiRes.ok) {
        let err;
        try { err = await apiRes.json(); } catch {}
        return json({ error: err?.message || 'MailerSend error' }, 500, allowOrigin);
      }

      return json({ ok: true }, 200, allowOrigin);

    } catch {
      return json({ error: 'Invalid JSON' }, 400, allowOrigin);
    }
  }
};

function json(data, status = 200, origin='*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin'
    }
  });
}
function escapeHtml(s=''){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
