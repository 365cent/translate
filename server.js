const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_BASE = process.env.API_BASE;
const API_KEY = process.env.API_KEY;
const MODEL = process.env.MODEL;

const LANG_NAMES = {
  zh: 'Chinese', en: 'English', fr: 'French', es: 'Spanish',
  hi: 'Hindi', ar: 'Arabic', bn: 'Bengali', pt: 'Portuguese',
  ru: 'Russian', ja: 'Japanese',
};

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function jsonRes(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function handleTranslate(req, res) {
  if (req.method !== 'POST') return jsonRes(res, 405, { error: 'Method not allowed' });
  if (!API_BASE || !API_KEY || !MODEL) return jsonRes(res, 500, { error: 'Server misconfigured' });

  let body;
  try { body = await readBody(req); }
  catch { return jsonRes(res, 400, { error: 'Invalid JSON' }); }

  const { text, lang } = body;
  if (!text || !lang) return jsonRes(res, 400, { error: 'Missing text or lang' });

  const langName = LANG_NAMES[lang] || lang;

  try {
    const upstream = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: `You are a translator. Translate the user's text to ${langName}. Output ONLY the translated text. Preserve line breaks. No explanations.` },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return jsonRes(res, 502, { error: 'Upstream error', status: upstream.status, detail: err });
    }

    const data = await upstream.json();
    if (!data.choices?.[0]) return jsonRes(res, 502, { error: 'Bad upstream response' });

    jsonRes(res, 200, { translation: data.choices[0].message.content.trim() });
  } catch (e) {
    jsonRes(res, 502, { error: 'Fetch failed', detail: e.message });
  }
}

function serveStatic(req, res) {
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/translate') return handleTranslate(req, res);
  serveStatic(req, res);
});

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
