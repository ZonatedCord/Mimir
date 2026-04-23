const assert = require('assert');
const { execSync } = require('child_process');

const NO_KEY = { ...process.env, ANTHROPIC_API_KEY: '' };

// Normal usage — check output shape
const out = execSync(
  'node scripts/estimate.js "analyze all TypeScript files in src directory"',
  { env: NO_KEY }
).toString();

assert.match(out, /MIMIR PREFLIGHT/,               'missing header');
assert.match(out, /Input tokens/,                  'missing token line');
assert.match(out, /Risk:\s+(LOW|MEDIUM|HIGH|CRITICAL)/, 'missing risk line');
assert.match(out, /Context headroom:\s+\d+%/,      'missing headroom line');
assert.match(out, /Action:/,                       'missing action line');
assert.match(out, /Suggested model:/,              'missing model line');

// --files flag — breakdown shown
const outFiles = execSync(
  'node scripts/estimate.js "refactor auth module" --files package.json',
  { env: NO_KEY }
).toString();

assert.match(outFiles, /MIMIR PREFLIGHT/,              'missing header with files');
assert.match(outFiles, /Task tokens/,                  'missing task tokens line');
assert.match(outFiles, /Files tokens/,                 'missing files tokens line');
assert.match(outFiles, /Total tokens/,                 'missing total tokens line');
assert.match(outFiles, /package\.json/,                'missing file name in output');

// --files with missing file — shows warning, does not crash
const outBadFile = execSync(
  'node scripts/estimate.js "some task" --files nonexistent.ts',
  { env: NO_KEY }
).toString();

assert.match(outBadFile, /MIMIR PREFLIGHT/);
assert.match(outBadFile, /⚠/);

// No arguments → non-zero exit
try {
  execSync('node scripts/estimate.js 2>&1', { env: NO_KEY });
  assert.fail('Should have thrown');
} catch (err) {
  assert.ok(err.status !== 0, 'Expected non-zero exit code');
}

console.log('✅ estimate.test.js passed');
