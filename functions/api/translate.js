const LANG_NAMES = {
  zh: 'Chinese', en: 'English', fr: 'French', es: 'Spanish',
  hi: 'Hindi', ar: 'Arabic', bn: 'Bengali', pt: 'Portuguese',
  ru: 'Russian', ja: 'Japanese',
};

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { API_BASE, API_KEY, MODEL } = context.env;
  if (!API_BASE || !API_KEY || !MODEL) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { text, lang } = body;
  if (!text || !lang) {
    return new Response(JSON.stringify({ error: 'Missing text or lang' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const langName = LANG_NAMES[lang] || lang;

  try {
    const r = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a translator. Translate the user's text to ${langName}. Output ONLY the translated text. Preserve line breaks. No explanations.`,
          },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return new Response(JSON.stringify({ error: 'Upstream error', status: r.status, detail: err }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await r.json();
    if (!data.choices?.[0]) {
      return new Response(JSON.stringify({ error: 'Bad upstream response' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ translation: data.choices[0].message.content.trim() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Fetch failed', detail: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
