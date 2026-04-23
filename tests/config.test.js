const assert = require('assert');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { loadConfig, DEFAULTS, validateConfig } = require('../scripts/lib/config');

// No config file → returns defaults
const defaults = loadConfig('/tmp/nonexistent-mimir-test-dir');
assert.strictEqual(defaults.contextWindow, DEFAULTS.contextWindow);
assert.strictEqual(defaults.thresholds.LOW, DEFAULTS.thresholds.LOW);
assert.strictEqual(defaults.defaultModel, null);

// Full config overrides all fields
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mimir-'));
fs.writeFileSync(path.join(tmpDir, '.mimir.json'), JSON.stringify({
  defaultModel:  'haiku-4.5',
  contextWindow: 100_000,
  thresholds:    { LOW: 5000, MEDIUM: 20000, HIGH: 50000 },
}));
const full = loadConfig(tmpDir);
assert.strictEqual(full.defaultModel,       'haiku-4.5');
assert.strictEqual(full.contextWindow,      100_000);
assert.strictEqual(full.thresholds.LOW,     5000);
assert.strictEqual(full.thresholds.MEDIUM,  20000);
assert.strictEqual(full.thresholds.HIGH,    50000);

// Partial config merges with defaults
fs.writeFileSync(path.join(tmpDir, '.mimir.json'), JSON.stringify({
  thresholds: { LOW: 10000 },
}));
const partial = loadConfig(tmpDir);
assert.strictEqual(partial.thresholds.LOW,    10000);
assert.strictEqual(partial.thresholds.MEDIUM, DEFAULTS.thresholds.MEDIUM); // unchanged
assert.strictEqual(partial.thresholds.HIGH,   DEFAULTS.thresholds.HIGH);   // unchanged
assert.strictEqual(partial.contextWindow,     DEFAULTS.contextWindow);      // unchanged
assert.strictEqual(partial.defaultModel,      null);                        // unchanged

// Invalid JSON → returns defaults
fs.writeFileSync(path.join(tmpDir, '.mimir.json'), 'NOT JSON {{{');
const bad = loadConfig(tmpDir);
assert.strictEqual(bad.contextWindow, DEFAULTS.contextWindow);

// validateConfig — unknown key
{
  const w = validateConfig({ unknownKey: 1 });
  assert.ok(w.some(m => m.includes('unknown key "unknownKey"')));
}

// validateConfig — unknown threshold key
{
  const w = validateConfig({ thresholds: { ULTRA: 5000 } });
  assert.ok(w.some(m => m.includes('unknown threshold "ULTRA"')));
}

// validateConfig — threshold not a number
{
  const w = validateConfig({ thresholds: { LOW: 'big' } });
  assert.ok(w.some(m => m.includes('"LOW" must be a number')));
}

// validateConfig — contextWindow not a number
{
  const w = validateConfig({ contextWindow: '200k' });
  assert.ok(w.some(m => m.includes('"contextWindow" must be a number')));
}

// validateConfig — valid config → no warnings
{
  const w = validateConfig({ defaultModel: 'haiku-4.5', contextWindow: 100_000, thresholds: { LOW: 5000 } });
  assert.strictEqual(w.length, 0);
}

// Cleanup
fs.rmSync(tmpDir, { recursive: true });

console.log('✅ config.test.js passed');
