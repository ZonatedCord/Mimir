const assert = require('assert');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { estimateContextOverhead, SYSTEM_OVERHEAD_DEFAULT, TOKENS_PER_TURN } = require('../scripts/lib/context');

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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mimir-ctx-'));
const claudeDir = path.join(tmpDir, '.claude');
fs.mkdirSync(claudeDir);
fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), 'This is a test CLAUDE.md with some content for token estimation purposes.');
const r4 = estimateContextOverhead({}, { turns: 0, cwd: tmpDir });
assert.ok(r4.mdTotal > 0, 'should find and count CLAUDE.md');
assert.ok(r4.claudeMds.length > 0, 'should have claudeMds entries');
assert.ok(r4.claudeMds[r4.claudeMds.length - 1].tokens > 0, 'CLAUDE.md tokens > 0');

// Cleanup
fs.rmSync(tmpDir, { recursive: true });

console.log('✅ context.test.js passed');
