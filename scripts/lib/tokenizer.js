const https = require('https');

const CHARS_PER_TOKEN = {
  code:  3.5,
  json:  3.0,
  prose: 4.2,
  mixed: 3.8,
};

const CODE_PATTERN = /^\s*(function|const|let|var|if|for|while|class|import|export|def|return|=>|\/\/|#!)/;
const JSON_PATTERN = /^\s*[\{\[\}]|^\s*"[^"]+"\s*:/;

function detectContentType(text) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return 'prose';

  let codeCount = 0;
  let jsonCount = 0;

  for (const line of lines) {
    if (CODE_PATTERN.test(line))      codeCount++;
    else if (JSON_PATTERN.test(line)) jsonCount++;
  }

  const total     = lines.length;
  const codeRatio = codeCount / total;
  const jsonRatio = jsonCount / total;

  if (codeRatio > 0.4)              return 'code';
  if (jsonRatio > 0.4)              return 'json';
  if (codeRatio + jsonRatio > 0.25) return 'mixed';
  return 'prose';
}

function estimateTokens(text) {
  if (!text || text.length === 0) return 0;
  const type = detectContentType(text);
  return Math.ceil(text.length / CHARS_PER_TOKEN[type]);
}

async function countTokensViaAPI(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    messages: [{ role: 'user', content: text }],
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages/count_tokens',
        method: 'POST',
        headers: {
          'x-api-key':          apiKey,
          'anthropic-version':  '2023-06-01',
          'content-type':       'application/json',
          'content-length':     Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) { resolve(null); return; }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(typeof parsed.input_tokens === 'number' ? parsed.input_tokens : null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error',   ()  => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

module.exports = { detectContentType, estimateTokens, countTokensViaAPI, CHARS_PER_TOKEN };
