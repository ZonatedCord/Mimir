const assert = require('assert');

const NO_KEY = { ...process.env, ANTHROPIC_API_KEY: '' };

async function runSplit(args) {
  const originalArgv = process.argv;
  const originalEnv = { ...process.env };
  const originalWrite = process.stdout.write;
  const originalErrWrite = process.stderr.write;
  const originalExit = process.exit;
  let stdout = '';
  let stderr = '';
  let exitCode = null;

  process.argv = [process.execPath, 'scripts/split.js', ...args];
  process.env.ANTHROPIC_API_KEY = '';
  process.stdout.write = (chunk) => { stdout += chunk; return true; };
  process.stderr.write = (chunk) => { stderr += chunk; return true; };
  process.exit = (code) => { exitCode = code ?? 0; throw new Error('__EXIT__'); };

  try {
    delete require.cache[require.resolve('../scripts/split.js')];
    const mod = require('../scripts/split.js');
    await mod.main();
  } catch (err) {
    if (err.message !== '__EXIT__') throw err;
  } finally {
    process.argv = originalArgv;
    process.env = originalEnv;
    process.stdout.write = originalWrite;
    process.stderr.write = originalErrWrite;
    process.exit = originalExit;
    delete require.cache[require.resolve('../scripts/split.js')];
  }

  return { stdout, stderr, exitCode };
}

void (async () => {
// Conjunction split
const out1 = (await runSplit(['analyze all TypeScript files and then refactor the auth module'])).stdout;

assert.match(out1, /MIMIR SPLIT/,          'missing header');
assert.match(out1, /Suggested split/,      'missing split section');
assert.match(out1, /LOW|MEDIUM|HIGH|CRITICAL/, 'missing risk level');
assert.match(out1, /tokens/,               'missing token count');
assert.match(out1, /1\./,                  'missing item 1');

// Multiple action verbs
const out2 = (await runSplit(['analyze the codebase and then refactor all components'])).stdout;

assert.match(out2, /1\./);
assert.match(out2, /2\./);

// --files flag — shows file breakdown
const out3 = (await runSplit(['refactor auth module and then update tests', '--files', 'package.json'])).stdout;

assert.match(out3, /Files loaded/,   'missing files loaded line');
assert.match(out3, /package\.json/,  'missing file name');
assert.match(out3, /Suggested split/);

// --files missing file — shows warning, does not crash
const out4 = (await runSplit(['some task', '--files', 'nonexistent.ts'])).stdout;
assert.match(out4, /⚠/);

// Numbered list → splits on items
const out5 = (await runSplit(['1. analyze TypeScript files 2. refactor auth module 3. update tests'])).stdout;
assert.match(out5, /1\./);
assert.match(out5, /2\./);
assert.match(out5, /3\./);

// File paths → splits per file
const out6 = (await runSplit(['fix bug in src/auth.ts and update src/auth.test.ts'])).stdout;
assert.match(out6, /src\/auth\.ts/);
assert.match(out6, /src\/auth\.test\.ts/);
assert.match(out6, /scope boundary/);

// No arguments → non-zero exit
const empty = await runSplit([]);
assert.ok(empty.exitCode !== 0, 'Should have non-zero exit');

console.log('✅ split.test.js passed');
})().catch(err => { throw err; });
