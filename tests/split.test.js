const assert = require('assert');
const { execSync } = require('child_process');

const NO_KEY = { ...process.env, ANTHROPIC_API_KEY: '' };

// Conjunction split
const out1 = execSync(
  'node scripts/split.js "analyze all TypeScript files and then refactor the auth module"',
  { env: NO_KEY }
).toString();

assert.match(out1, /MIMIR SPLIT/,          'missing header');
assert.match(out1, /Suggested split/,      'missing split section');
assert.match(out1, /LOW|MEDIUM|HIGH|CRITICAL/, 'missing risk level');
assert.match(out1, /tokens/,               'missing token count');
assert.match(out1, /1\./,                  'missing item 1');

// Multiple action verbs
const out2 = execSync(
  'node scripts/split.js "analyze the codebase and then refactor all components"',
  { env: NO_KEY }
).toString();

assert.match(out2, /1\./);
assert.match(out2, /2\./);

// No arguments → non-zero exit
try {
  execSync('node scripts/split.js 2>&1', { env: NO_KEY });
  assert.fail('Should have thrown');
} catch (err) {
  assert.ok(err.status !== 0);
}

console.log('✅ split.test.js passed');
