const assert = require('assert');
const { detectContentType, estimateTokens, countTokensViaAPI, CHARS_PER_TOKEN } = require('../scripts/lib/tokenizer');

// CHARS_PER_TOKEN shape
assert.ok(CHARS_PER_TOKEN.code  > 0, 'code ratio missing');
assert.ok(CHARS_PER_TOKEN.prose > 0, 'prose ratio missing');
assert.ok(CHARS_PER_TOKEN.json  > 0, 'json ratio missing');
assert.ok(CHARS_PER_TOKEN.mixed > 0, 'mixed ratio missing');

// detectContentType
assert.strictEqual(
  detectContentType('function foo() { return 42; }\nconst x = 1;\nif (x > 0) { return x; }'),
  'code'
);
assert.strictEqual(
  detectContentType('{"name": "test", "value": 123, "items": ["a", "b"]}'),
  'json'
);
assert.strictEqual(
  detectContentType('This is a normal sentence. Another sentence. And another one here.'),
  'prose'
);

// estimateTokens: empty string
assert.strictEqual(estimateTokens(''), 0);

// estimateTokens: short text
const shortEst = estimateTokens('Hello world');
assert.ok(shortEst > 0,  'estimate must be positive');
assert.ok(shortEst < 20, 'short text must be < 20 tokens');

// estimateTokens: longer text > shorter text
const longProse = 'The quick brown fox jumps over the lazy dog. '.repeat(50);
assert.ok(estimateTokens(longProse) > estimateTokens('Hello world'));

// countTokensViaAPI: no API key → null
(async () => {
  const savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const result = await countTokensViaAPI('test input');
  assert.strictEqual(result, null, 'expected null without API key');
  if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
  console.log('✅ tokenizer.test.js passed');
})().catch(err => { console.error(err); process.exit(1); });
