const assert = require('assert');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const {
  estimateContextOverhead, autoDetectFiles, extractKeywords,
  SYSTEM_OVERHEAD_DEFAULT, TOKENS_PER_TURN,
} = require('../scripts/lib/context');

// Constants exported
assert.strictEqual(typeof SYSTEM_OVERHEAD_DEFAULT, 'number');
assert.strictEqual(typeof TOKENS_PER_TURN, 'number');

// Default cfg — system overhead matches default constant
const r1 = estimateContextOverhead({}, { turns: 0, cwd: '/tmp' });
assert.strictEqual(r1.systemOverhead,     SYSTEM_OVERHEAD_DEFAULT);
assert.strictEqual(r1.conversationTokens, 0);
assert.strictEqual(r1.turns,              0);
assert.ok(Array.isArray(r1.claudeMds));
assert.strictEqual(r1.total, SYSTEM_OVERHEAD_DEFAULT + r1.mdTotal);

// Turns multiply correctly
const r2 = estimateContextOverhead({}, { turns: 5, cwd: '/tmp' });
assert.strictEqual(r2.conversationTokens, 5 * TOKENS_PER_TURN);
assert.strictEqual(r2.turns, 5);

// cfg.systemOverhead override
const r3 = estimateContextOverhead({ systemOverhead: 1_000 }, { turns: 0, cwd: '/tmp' });
assert.strictEqual(r3.systemOverhead, 1_000);

// CLAUDE.md files found and counted
const tmpDir    = fs.mkdtempSync(path.join(os.tmpdir(), 'mimir-ctx-'));
const claudeDir = path.join(tmpDir, '.claude');
fs.mkdirSync(claudeDir);
fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), 'This is a test CLAUDE.md with some content for token estimation purposes.');
const r4 = estimateContextOverhead({}, { turns: 0, cwd: tmpDir });
assert.ok(r4.mdTotal > 0, 'should find and count CLAUDE.md');
assert.ok(r4.claudeMds.length > 0, 'should have claudeMds entries');
assert.ok(r4.claudeMds[r4.claudeMds.length - 1].tokens > 0, 'CLAUDE.md tokens > 0');

// extractKeywords — filters stopwords and short words
const kw = extractKeywords('refactor the risk classification logic');
assert.ok(kw.includes('risk'),           'should include "risk"');
assert.ok(!kw.includes('the'),           'should filter "the"');
assert.ok(!kw.includes('refactor'),      'should filter "refactor" (stopword)');
assert.ok(!kw.includes('logic'),         'should filter "logic" (stopword)');

// autoDetectFiles — finds relevant files in a temp repo
const srcDir = path.join(tmpDir, 'src');
fs.mkdirSync(srcDir);
fs.writeFileSync(path.join(srcDir, 'auth.ts'),          'export function authenticate() {}');
fs.writeFileSync(path.join(srcDir, 'user.ts'),          'export class User {}');
fs.writeFileSync(path.join(srcDir, 'payment.ts'),       'export function pay() {}');
fs.writeFileSync(path.join(tmpDir, 'auth.test.ts'),     'test auth');

const found = autoDetectFiles('update authentication module', tmpDir);
assert.ok(found.length > 0, 'should find files');
const labels = found.map(f => f.label);
assert.ok(labels.some(l => l.includes('auth')), 'should find auth-related files');
assert.ok(!labels.some(l => l.includes('payment')), 'should not find unrelated files');

// autoDetectFiles — empty task keywords → no results
const noResults = autoDetectFiles('update the module', tmpDir);
assert.ok(Array.isArray(noResults));

// Cleanup
fs.rmSync(tmpDir, { recursive: true });

console.log('✅ context.test.js passed');
