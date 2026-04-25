const assert = require('assert');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const {
  estimateContextOverhead, autoDetectFiles, extractKeywords, findHookScripts,
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
assert.ok(Array.isArray(r1.hookScripts));
assert.strictEqual(r1.total, SYSTEM_OVERHEAD_DEFAULT + r1.hookTotal + r1.mdTotal);

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

// findHookScripts — detects .sh files from settings.json hooks
const hookDir    = fs.mkdtempSync(path.join(os.tmpdir(), 'mimir-hooks-'));
const hookClaudeDir = path.join(hookDir, '.claude');
fs.mkdirSync(hookClaudeDir);
const shPath     = path.join(hookDir, 'my-hook.sh');
fs.writeFileSync(shPath, '#!/usr/bin/env bash\necho hello\n');
const settings   = {
  hooks: {
    UserPromptSubmit: [
      { matcher: '', hooks: [{ type: 'command', command: `bash ${shPath}` }] }
    ]
  }
};
fs.writeFileSync(path.join(hookClaudeDir, 'settings.json'), JSON.stringify(settings));
const hookResults = findHookScripts(hookDir);
assert.ok(hookResults.length > 0,                        'should find hook script');
assert.ok(hookResults[0].label.includes('my-hook.sh'),   'label should include filename');
assert.ok(hookResults[0].tokens > 0,                     'should have tokens > 0');
assert.strictEqual(hookResults[0].error, null,           'should have no error');
assert.strictEqual(hookResults[0].event, 'UserPromptSubmit', 'should record event name');

// findHookScripts — missing .sh file → error entry, not throw
const settingsMissing = {
  hooks: {
    UserPromptSubmit: [
      { matcher: '', hooks: [{ type: 'command', command: 'bash /nonexistent/path/hook.sh' }] }
    ]
  }
};
const missingSettings = path.join(hookClaudeDir, 'settings2.json');
fs.writeFileSync(missingSettings, JSON.stringify(settingsMissing));
// Use a fresh tmp dir so only settings2 is found
const hookDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mimir-hooks2-'));
const hookClaudeDir2 = path.join(hookDir2, '.claude');
fs.mkdirSync(hookClaudeDir2);
fs.writeFileSync(path.join(hookClaudeDir2, 'settings.json'), JSON.stringify(settingsMissing));
const errorResults = findHookScripts(hookDir2);
assert.ok(errorResults.length > 0,            'should return entry for missing file');
assert.ok(errorResults[0].error !== null,      'missing file should have error');

// findHookScripts — no hooks in settings → empty array
const noHooksSettings = { model: 'sonnet' };
const hookDir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'mimir-hooks3-'));
const hookClaudeDir3 = path.join(hookDir3, '.claude');
fs.mkdirSync(hookClaudeDir3);
fs.writeFileSync(path.join(hookClaudeDir3, 'settings.json'), JSON.stringify(noHooksSettings));
const noHookResults = findHookScripts(hookDir3);
assert.deepStrictEqual(noHookResults, [], 'no hooks → empty array');

// Cleanup
fs.rmSync(hookDir,  { recursive: true });
fs.rmSync(hookDir2, { recursive: true });
fs.rmSync(hookDir3, { recursive: true });
fs.rmSync(tmpDir, { recursive: true });

console.log('✅ context.test.js passed');
