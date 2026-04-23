const assert = require('assert');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

// Override HISTORY_FILE for test isolation
const testHistoryFile = path.join(os.tmpdir(), `mimir-history-test-${Date.now()}.json`);

// Patch require cache so history.js uses our test file
const historyPath = path.resolve(__dirname, '..', 'scripts', 'lib', 'history.js');
delete require.cache[require.resolve(historyPath)];

const origWrite = fs.writeFileSync.bind(fs);
const origRead  = fs.readFileSync.bind(fs);

// Monkey-patch to redirect history file ops
const { appendHistory, loadHistory } = (() => {
  const mod = require(historyPath);
  return mod;
})();

// Since we can't easily redirect the internal HISTORY_FILE constant,
// test via the actual file path but clean up after
const HISTORY_FILE = path.join(os.homedir(), '.mimir-history.json');

// Backup existing history
let backup = null;
try { backup = fs.readFileSync(HISTORY_FILE, 'utf8'); } catch {}

// Clean slate
try { fs.unlinkSync(HISTORY_FILE); } catch {}

// Test: loadHistory returns [] when file missing
const empty = loadHistory();
assert.deepStrictEqual(empty, [], 'empty history should be []');

// Test: appendHistory writes entry
appendHistory({ task: 'test task', tokens: 100, risk: 'LOW', model: 'Haiku 4.5' });
const h1 = loadHistory();
assert.strictEqual(h1.length, 1, 'should have 1 entry');
assert.strictEqual(h1[0].task, 'test task');
assert.strictEqual(h1[0].risk, 'LOW');
assert.ok(h1[0].timestamp, 'should have timestamp');

// Test: appendHistory accumulates
appendHistory({ task: 'second task', tokens: 200, risk: 'MEDIUM', model: 'Sonnet 4.6' });
const h2 = loadHistory();
assert.strictEqual(h2.length, 2, 'should have 2 entries');

// Restore backup
try { fs.unlinkSync(HISTORY_FILE); } catch {}
if (backup !== null) {
  try { fs.writeFileSync(HISTORY_FILE, backup); } catch {}
}

console.log('✅ history.test.js passed');
