const LANG_NAMES = {
  zh: 'Chinese', en: 'English', fr: 'French', es: 'Spanish',
  hi: 'Hindi', ar: 'Arabic', bn: 'Bengali', pt: 'Portuguese',
  ru: 'Russian', ja: 'Japanese',
};

const CORS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || '*';
  if (allowed === '*' || origin === allowed) return allowed;
  return '';
}

function json(body, status, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

export default {
  async fetch(request, env) {
    const origin = corsOrigin(request, env);
    const cors = { ...CORS, 'Access-Control-Allow-Origin': origin };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    if (!env.API_BASE || !env.API_KEY || !env.MODEL) {
      return json({ error: 'Server misconfigured' }, 500, cors);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400, cors); }

    const { text, lang } = body;
    if (!text || !lang) {
      return json({ error: 'Missing text or lang' }, 400, cors);
    }

    const langName = LANG_NAMES[lang] || lang;

    try {
      const r = await fetch(`${env.API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.API_KEY}`,
        },
        body: JSON.stringify({
          model: env.MODEL,
          messages: [
            { role: 'system', content: `You are a translator. Translate the user's text to ${langName}. Output ONLY the translated text. Preserve line breaks. No explanations.` },
            { role: 'user', content: text },
          ],
        }),
      });

      if (!r.ok) {
        const err = await r.text();
        return json({ error: 'Upstream error', detail: err }, 502, cors);
      }

      const data = await r.json();
      if (!data.choices?.[0]) {
        return json({ error: 'Bad upstream response' }, 502, cors);
      }

      return json({ translation: data.choices[0].message.content.trim() }, 200, cors);
    } catch (e) {
      return json({ error: 'Fetch failed', detail: e.message }, 502, cors);
    }
  },
};
