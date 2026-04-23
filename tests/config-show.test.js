const assert = require('assert');
const path   = require('path');
const { execSync } = require('child_process');

const script = path.resolve(__dirname, '..', 'scripts', 'config-show.js');

// Default config (no .mimir.json in /tmp)
const out1 = execSync(`node "${script}"`, {
  cwd: '/tmp',
}).toString();

assert.match(out1, /MIMIR CONFIG/,          'missing header');
assert.match(out1, /Source/,                'missing source line');
assert.match(out1, /defaults/,              'should show defaults when no .mimir.json');
assert.match(out1, /Context window/,        'missing context window');
assert.match(out1, /System overhead/,       'missing system overhead');
assert.match(out1, /Thresholds/,            'missing thresholds');
assert.match(out1, /Default model/,         'missing default model');
assert.match(out1, /200[,.]000/,            'should show 200k default context window');

console.log('✅ config-show.test.js passed');
