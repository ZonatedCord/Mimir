const assert = require('assert');
const { execSync } = require('child_process');

const NO_KEY = { ...process.env, ANTHROPIC_API_KEY: '' };

// Normal usage — new layout
const out = execSync(
  'node scripts/estimate.js "analyze all TypeScript files in src directory"',
  { env: NO_KEY }
).toString();

assert.match(out, /MIMIR PREFLIGHT/,               'missing header');
assert.match(out, /Baseline/,                      'missing baseline section');
assert.match(out, /System overhead/,               'missing system overhead');
assert.match(out, /This task/,                     'missing task section');
assert.match(out, /Task tokens/,                   'missing task tokens line');
assert.match(out, /Total context/,                 'missing total context line');
assert.match(out, /Risk:\s+(LOW|MEDIUM|HIGH|CRITICAL)/, 'missing risk line');
assert.match(out, /Context headroom:\s+\d+%/,      'missing headroom line');
assert.match(out, /Action:/,                       'missing action line');
assert.match(out, /Suggested model:/,              'missing model line');

// Task tokens < Total context (baseline always adds overhead)
const taskTokMatch   = out.match(/Task tokens:\s+~?([\d,]+)/);
const totalTokMatch  = out.match(/Total context:\s+~?([\d,]+)/);
const taskTok        = taskTokMatch  ? parseInt(taskTokMatch[1].replace(/,/g, ''), 10)  : 0;
const totalTok       = totalTokMatch ? parseInt(totalTokMatch[1].replace(/,/g, ''), 10) : 0;
assert.ok(totalTok > taskTok, `total (${totalTok}) should exceed task tokens (${taskTok})`);

// --files flag — file rows shown in task section
const outFiles = execSync(
  'node scripts/estimate.js "refactor auth module" --files package.json',
  { env: NO_KEY }
).toString();
assert.match(outFiles, /MIMIR PREFLIGHT/,   'missing header with files');
assert.match(outFiles, /package\.json/,     'missing file name');
assert.match(outFiles, /Task tokens/,       'missing task tokens');

// --files suppresses auto-detect
assert.doesNotMatch(outFiles, /\(auto\)/,   '--files should suppress auto-detect');

// --no-auto suppresses auto-detect
const outNoAuto = execSync(
  'node scripts/estimate.js "refactor risk logic" --no-auto',
  { env: NO_KEY }
).toString();
assert.doesNotMatch(outNoAuto, /\(auto\)/,  '--no-auto should suppress auto-detect');

// --turns flag — conversation row shown
const outTurns = execSync(
  'node scripts/estimate.js "add feature" --turns 3',
  { env: NO_KEY }
).toString();
assert.match(outTurns, /Conversation \(3 turns\)/, 'missing conversation row');

// No arguments → exit 0 + help text
const outNoArgs = execSync('node scripts/estimate.js', { env: NO_KEY }).toString();
assert.match(outNoArgs, /MIMIR/,        'missing mimir in help');
assert.match(outNoArgs, /Usage/,        'missing Usage in help');
assert.match(outNoArgs, /--turns/,      'missing --turns in help');
assert.match(outNoArgs, /--no-auto/,    'missing --no-auto in help');

// --files with missing file — shows warning
const outBadFile = execSync(
  'node scripts/estimate.js "some task" --files nonexistent.ts',
  { env: NO_KEY }
).toString();
assert.match(outBadFile, /MIMIR PREFLIGHT/);
assert.match(outBadFile, /⚠/);

// HIGH/CRITICAL risk → auto-split appended
const outHigh = execSync(
  'node scripts/estimate.js "analyze every file in the entire codebase and refactor all modules and update all tests and generate full documentation"',
  { env: NO_KEY }
).toString();
if (/Risk:\s+(HIGH|CRITICAL)/.test(outHigh)) {
  assert.match(outHigh, /MIMIR SPLIT/, 'HIGH/CRITICAL should include auto-split output');
}

console.log('✅ estimate.test.js passed');
