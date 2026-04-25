const assert    = require('assert');
const fs        = require('fs');
const os        = require('os');
const path      = require('path');
const { execSync } = require('child_process');

const tmpFile = path.join(os.tmpdir(), `mimir-history-show-test-${Date.now()}.json`);
const entries = [
  { task: 'refactor auth module', tokens: 5200, risk: 'LOW',    model: 'Sonnet 4.6', timestamp: '2026-04-24T10:00:00.000Z' },
  { task: 'analyze entire codebase', tokens: 85000, risk: 'HIGH', model: 'Opus 4.7',   timestamp: '2026-04-24T11:00:00.000Z' },
];
fs.writeFileSync(tmpFile, JSON.stringify(entries));

const env = { ...process.env, MIMIR_HISTORY_FILE: tmpFile, MIMIR_NO_HISTORY: '1' };
const bin = path.resolve(__dirname, '..', 'scripts', 'history-show.js');

// Normal output — shows entries
const outNormal = execSync(`node "${bin}"`, { env }).toString();
assert.match(outNormal, /MIMIR HISTORY/,       'missing header');
assert.match(outNormal, /refactor auth/,        'missing entry 1');
assert.match(outNormal, /analyze entire/,       'missing entry 2');
assert.match(outNormal, /LOW/,                  'missing risk LOW');
assert.match(outNormal, /HIGH/,                 'missing risk HIGH');

// N arg limits output
const outOne = execSync(`node "${bin}" 1`, { env }).toString();
assert.match(outOne, /analyze entire/,  'N=1 should show most recent');
assert.doesNotMatch(outOne, /refactor auth/, 'N=1 should not show older entry');

// --csv output
const outCsv = execSync(`node "${bin}" --csv`, { env }).toString();
assert.match(outCsv, /timestamp,task,tokens,risk,model/, 'missing CSV header');
assert.match(outCsv, /refactor auth module/,             'missing CSV entry 1');
assert.match(outCsv, /analyze entire codebase/,          'missing CSV entry 2');
assert.match(outCsv, /5200/,                             'missing tokens in CSV');
assert.match(outCsv, /85000/,                            'missing tokens in CSV');
assert.doesNotMatch(outCsv, /MIMIR HISTORY/,             'CSV should not have header block');

// --csv with N arg
const outCsvOne = execSync(`node "${bin}" 1 --csv`, { env }).toString();
const csvLines = outCsvOne.trim().split('\n');
assert.strictEqual(csvLines.length, 2, 'N=1 --csv should have header + 1 data row');

// Empty history
const emptyFile = path.join(os.tmpdir(), `mimir-history-empty-${Date.now()}.json`);
fs.writeFileSync(emptyFile, '[]');
const envEmpty = { ...process.env, MIMIR_HISTORY_FILE: emptyFile };
const outEmpty = execSync(`node "${bin}"`, { env: envEmpty }).toString();
assert.match(outEmpty, /No Mimir history/, 'missing empty state message');

// --stats output
const statsEntries = [
  { task: 'task a', tokens: 1000,  risk: 'LOW',      model: 'Haiku',   timestamp: '2026-04-24T10:00:00.000Z' },
  { task: 'task b', tokens: 5000,  risk: 'LOW',      model: 'Sonnet',  timestamp: '2026-04-24T11:00:00.000Z' },
  { task: 'task c', tokens: 30000, risk: 'MEDIUM',   model: 'Sonnet',  timestamp: '2026-04-24T12:00:00.000Z' },
  { task: 'task d', tokens: 90000, risk: 'HIGH',     model: 'Opus',    timestamp: '2026-04-24T13:00:00.000Z' },
];
const statsFile = path.join(os.tmpdir(), `mimir-stats-test-${Date.now()}.json`);
fs.writeFileSync(statsFile, JSON.stringify(statsEntries));
const envStats = { ...process.env, MIMIR_HISTORY_FILE: statsFile };

const outStats = execSync(`node "${bin}" --stats`, { env: envStats }).toString();
assert.match(outStats, /MIMIR STATS/,      'missing STATS header');
assert.match(outStats, /4/,                'should show total count');
assert.match(outStats, /Average/,          'missing Average line');
assert.match(outStats, /LOW/,              'missing LOW in breakdown');
assert.match(outStats, /MEDIUM/,           'missing MEDIUM in breakdown');
assert.match(outStats, /HIGH/,             'missing HIGH in breakdown');
assert.doesNotMatch(outStats, /MIMIR HISTORY/, '--stats should not show history header');

// --stats on empty history
const outStatsEmpty = execSync(`node "${bin}" --stats`, { env: envEmpty }).toString();
assert.match(outStatsEmpty, /No Mimir history/, 'empty stats should show no history message');

// Cleanup
fs.unlinkSync(tmpFile);
fs.unlinkSync(emptyFile);
fs.unlinkSync(statsFile);

console.log('✅ history-show.test.js passed');
