const assert = require('assert');

const NO_KEY = { ...process.env, ANTHROPIC_API_KEY: '', MIMIR_NO_HISTORY: '1' };

async function runEstimate(args) {
  const originalArgv = process.argv;
  const originalEnv = { ...process.env };
  const originalWrite = process.stdout.write;
  const originalExit = process.exit;
  let stdout = '';
  let exitCode = null;

  process.argv = [process.execPath, 'scripts/estimate.js', ...args];
  process.env.ANTHROPIC_API_KEY = '';
  process.env.MIMIR_NO_HISTORY = '1';
  process.stdout.write = (chunk) => { stdout += chunk; return true; };
  process.exit = (code) => { exitCode = code ?? 0; throw new Error('__EXIT__'); };

  try {
    delete require.cache[require.resolve('../scripts/estimate.js')];
    const mod = require('../scripts/estimate.js');
    await mod.main();
  } catch (err) {
    if (err.message !== '__EXIT__') throw err;
  } finally {
    process.argv = originalArgv;
    process.env = originalEnv;
    process.stdout.write = originalWrite;
    process.exit = originalExit;
    delete require.cache[require.resolve('../scripts/estimate.js')];
  }

  assert.strictEqual(exitCode ?? 0, 0, `estimate.js exited with ${exitCode}`);
  return stdout;
}

void (async () => {
// Normal usage — new layout
let out = await runEstimate(['analyze all TypeScript files in src directory']);

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
assert.match(out, /Dollar cost:/,                  'missing dollar cost line');

// Task tokens < Total context (baseline always adds overhead)
const taskTokMatch   = out.match(/Task tokens:\s+~?([\d,]+)/);
const totalTokMatch  = out.match(/Total context:\s+~?([\d,]+)/);
const taskTok        = taskTokMatch  ? parseInt(taskTokMatch[1].replace(/,/g, ''), 10)  : 0;
const totalTok       = totalTokMatch ? parseInt(totalTokMatch[1].replace(/,/g, ''), 10) : 0;
assert.ok(totalTok > taskTok, `total (${totalTok}) should exceed task tokens (${taskTok})`);

// --files flag — file rows shown in task section
const outFiles = await runEstimate(['refactor auth module', '--files', 'package.json']);
assert.match(outFiles, /MIMIR PREFLIGHT/,   'missing header with files');
assert.match(outFiles, /package\.json/,     'missing file name');
assert.match(outFiles, /Task tokens/,       'missing task tokens');
assert.match(outFiles, /Dollar cost:/,      'missing dollar cost with files');

// --files suppresses auto-detect
assert.doesNotMatch(outFiles, /\(auto\)/,   '--files should suppress auto-detect');

// --no-auto suppresses auto-detect
const outNoAuto = await runEstimate(['refactor risk logic', '--no-auto']);
assert.doesNotMatch(outNoAuto, /\(auto\)/,  '--no-auto should suppress auto-detect');

// --turns flag — conversation row shown
const outTurns = await runEstimate(['add feature', '--turns', '3']);
assert.match(outTurns, /Conversation \(3 turns\)/, 'missing conversation row');

// No arguments → exit 0 + help text
const outNoArgs = await runEstimate([]);
assert.match(outNoArgs, /MIMIR/,        'missing mimir in help');
assert.match(outNoArgs, /Usage/,        'missing Usage in help');
assert.match(outNoArgs, /--turns/,      'missing --turns in help');
assert.match(outNoArgs, /--no-auto/,    'missing --no-auto in help');

// --files with missing file — shows warning
const outBadFile = await runEstimate(['some task', '--files', 'nonexistent.ts']);
assert.match(outBadFile, /MIMIR PREFLIGHT/);
assert.match(outBadFile, /⚠/);

// HIGH/CRITICAL risk → auto-split appended
const outHigh = await runEstimate(['analyze every file in the entire codebase and refactor all modules and update all tests and generate full documentation']);
if (/Risk:\s+(HIGH|CRITICAL)/.test(outHigh)) {
  assert.match(outHigh, /DEBTOKEN SPLIT/, 'HIGH/CRITICAL should include auto-split output');
}

// --output json emits valid JSON with expected fields
const jsonOut = await runEstimate(['add auth middleware', '--output', 'json', '--no-auto']);
let parsed;
assert.doesNotThrow(() => { parsed = JSON.parse(jsonOut); }, '--output json must emit valid JSON');
assert.ok(typeof parsed.totalTokens  === 'number', 'totalTokens must be number');
assert.ok(typeof parsed.taskTokens   === 'number', 'taskTokens must be number');
assert.ok(typeof parsed.contextTokens === 'number', 'contextTokens must be number');
assert.ok(typeof parsed.risk         === 'string',  'risk must be string');
assert.ok(typeof parsed.headroomPct  === 'number',  'headroomPct must be number');
assert.ok(Array.isArray(parsed.files),              'files must be array');
assert.ok(parsed.totalTokens === parsed.taskTokens + parsed.contextTokens, 'total = task + context');

// --output json suppresses formatted output
assert.doesNotMatch(jsonOut, /MIMIR PREFLIGHT/, '--output json should not include formatted header');

console.log('✅ estimate.test.js passed');
})().catch(err => { throw err; });

