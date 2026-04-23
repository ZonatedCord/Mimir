const assert = require('assert');
const { classifyRisk } = require('../scripts/lib/risk');

const cfg = {};

// LOW + complex task → Sonnet
const r1 = classifyRisk(100, cfg, 'refactor the entire authentication architecture');
assert.strictEqual(r1.level, 'LOW');
assert.match(r1.suggestedModel, /Sonnet/, 'complex task should suggest Sonnet');

// LOW + simple task → Haiku
const r2 = classifyRisk(100, cfg, 'fix typo in error message');
assert.strictEqual(r2.level, 'LOW');
assert.match(r2.suggestedModel, /Haiku/, 'simple task should suggest Haiku');

// LOW + no task → generic suggestion
const r3 = classifyRisk(100, cfg);
assert.strictEqual(r3.level, 'LOW');
assert.match(r3.suggestedModel, /Haiku|Sonnet/);

// MEDIUM always → Sonnet regardless of task
const r4 = classifyRisk(30_000, cfg, 'fix typo');
assert.strictEqual(r4.level, 'MEDIUM');
assert.match(r4.suggestedModel, /Sonnet/);

console.log('✅ risk-smart-model.test.js passed');
