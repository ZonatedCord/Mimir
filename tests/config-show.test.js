const assert = require('assert');
const path   = require('path');

async function runConfigShow(cwd) {
  const originalArgv = process.argv;
  const originalCwd = process.cwd();
  const originalWrite = process.stdout.write;
  let stdout = '';

  process.argv = [process.execPath, 'scripts/config-show.js'];
  process.stdout.write = (chunk) => { stdout += chunk; return true; };
  process.chdir(cwd);

  try {
    delete require.cache[require.resolve('../scripts/config-show.js')];
    require('../scripts/config-show.js').main();
  } finally {
    process.argv = originalArgv;
    process.stdout.write = originalWrite;
    process.chdir(originalCwd);
    delete require.cache[require.resolve('../scripts/config-show.js')];
  }

  return stdout;
}

void (async () => {
// Default config (no .mimir.json in /tmp)
const out1 = await runConfigShow('/tmp');

assert.match(out1, /MIMIR CONFIG/,          'missing header');
assert.match(out1, /Source/,                'missing source line');
assert.match(out1, /defaults/,              'should show defaults when no .mimir.json');
assert.match(out1, /Context window/,        'missing context window');
assert.match(out1, /System overhead/,       'missing system overhead');
assert.match(out1, /Thresholds/,            'missing thresholds');
assert.match(out1, /Default model/,         'missing default model');
assert.match(out1, /200[,.]000/,            'should show 200k default context window');

console.log('✅ config-show.test.js passed');
})().catch(err => { throw err; });
