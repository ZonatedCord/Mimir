const assert = require('assert');
const { execSync } = require('child_process');

const NO_KEY = { ...process.env, ANTHROPIC_API_KEY: '' };

// Normal usage — breakdown always shown
const out = execSync(
  'node scripts/estimate.js "analyze all TypeScript files in src directory"',
  { env: NO_KEY }
).toString();

assert.match(out, /MIMIR PREFLIGHT/,               'missing header');
assert.match(out, /Task/,                          'missing task line');
assert.match(out, /System overhead/,               'missing system overhead line');
assert.match(out, /Total/,                         'missing total line');
assert.match(out, /Risk:\s+(LOW|MEDIUM|HIGH|CRITICAL)/, 'missing risk line');
assert.match(out, /Context headroom:\s+\d+%/,      'missing headroom line');
assert.match(out, /Action:/,                       'missing action line');
assert.match(out, /Suggested model:/,              'missing model line');

// --files flag — file rows shown
const outFiles = execSync(
  'node scripts/estimate.js "refactor auth module" --files package.json',
  { env: NO_KEY }
).toString();

assert.match(outFiles, /MIMIR PREFLIGHT/,     'missing header with files');
assert.match(outFiles, /System overhead/,     'missing system overhead with files');
assert.match(outFiles, /package\.json/,       'missing file name in output');
assert.match(outFiles, /Total/,               'missing total with files');

// --files with missing file — shows warning, does not crash
const outBadFile = execSync(
  'node scripts/estimate.js "some task" --files nonexistent.ts',
  { env: NO_KEY }
).toString();

assert.match(outBadFile, /MIMIR PREFLIGHT/);
assert.match(outBadFile, /⚠/);

// --turns flag — conversation row shown
const outTurns = execSync(
  'node scripts/estimate.js "add feature" --turns 3',
  { env: NO_KEY }
).toString();

assert.match(outTurns, /Conversation \(3 turns\)/,  'missing conversation row');
assert.match(outTurns, /800 tok\/turn/,              'missing tok/turn note');

// --turns 0 (or omitted) — no conversation row
assert.doesNotMatch(out, /Conversation/,             'conversation row should be absent when turns=0');

// No arguments → exit 0 + help text
const outNoArgs = execSync('node scripts/estimate.js', { env: NO_KEY }).toString();
assert.match(outNoArgs, /MIMIR/,        'missing mimir in help');
assert.match(outNoArgs, /Usage/,        'missing Usage in help');
assert.match(outNoArgs, /split-task/,   'missing split-task in help');
assert.match(outNoArgs, /--turns/,      'missing --turns in help');

// Total tokens include system overhead (> task tokens alone)
const taskMatch    = out.match(/Task[^~]*~(\d[\d,]*)/);
const totalMatch   = out.match(/Total:\s*~(\d[\d,]*)/);
const taskTokens   = taskMatch  ? parseInt(taskMatch[1].replace(/,/g, ''), 10)  : 0;
const totalTokens  = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0;
assert.ok(totalTokens > taskTokens, `total (${totalTokens}) should exceed task tokens (${taskTokens})`);

// HIGH/CRITICAL risk → auto-split appended
const outHigh = execSync(
  'node scripts/estimate.js "analyze every file in the entire codebase and refactor all modules and update all tests and generate full documentation"',
  { env: NO_KEY }
).toString();
if (/Risk:\s+(HIGH|CRITICAL)/.test(outHigh)) {
  assert.match(outHigh, /MIMIR SPLIT/, 'HIGH/CRITICAL should include auto-split output');
}

console.log('✅ estimate.test.js passed');
