const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveArgv, tokenizeStdin } = require('../scripts/lib/stdin-input');

assert.deepStrictEqual(tokenizeStdin('  a   b\n c \n'), ['a', 'b', 'c']);
assert.deepStrictEqual(tokenizeStdin(''), []);

assert.deepStrictEqual(resolveArgv(['x', '--git-diff'], () => 'NO'), ['x', '--git-diff']);
assert.deepStrictEqual(resolveArgv(['--stdin'], () => 'do thing --files a.js'), ['do', 'thing', '--files', 'a.js']);
assert.deepStrictEqual(resolveArgv(['--stdin', '--no-auto'], () => 'task one'), ['--no-auto', 'task', 'one']);

const evil = 'x $(touch PWN) `id` "quote';
for (const script of ['estimate.js', 'split.js']) {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', script), '--stdin'], {
    input: evil, encoding: 'utf8',
    env: { ...process.env, ANTHROPIC_API_KEY: '', MIMIR_NO_HISTORY: '1' },
  });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /MIMIR/);
}

console.log('✅ stdin-input.test.js passed');
