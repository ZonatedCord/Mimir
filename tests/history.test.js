const assert = require('assert');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const testHistoryFile = path.join(os.tmpdir(), `mimir-history-test-${Date.now()}.json`);
const originalEnv = { ...process.env };
process.env.MIMIR_HISTORY_FILE = testHistoryFile;

const historyPath = path.resolve(__dirname, '..', 'scripts', 'lib', 'history.js');
delete require.cache[require.resolve(historyPath)];
const { appendHistory, loadHistory } = require(historyPath);

try { fs.unlinkSync(testHistoryFile); } catch {}

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

try { fs.unlinkSync(testHistoryFile); } catch {}
process.env = originalEnv;

console.log('✅ history.test.js passed');
