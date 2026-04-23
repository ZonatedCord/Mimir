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

// MEDIUM → Sonnet or Opus 4.7
const r4 = classifyRisk(30_000, cfg, 'fix typo');
assert.strictEqual(r4.level, 'MEDIUM');
assert.match(r4.suggestedModel, /Sonnet/);

// HIGH → Opus 4.7 recommended
const r5 = classifyRisk(80_000, cfg, 'analyze entire codebase');
assert.strictEqual(r5.level, 'HIGH');
assert.match(r5.suggestedModel, /Opus/);

// CRITICAL → Opus 4.7 recommended
const r6 = classifyRisk(150_000, cfg, 'huge task');
assert.strictEqual(r6.level, 'CRITICAL');
assert.match(r6.suggestedModel, /Opus/);

console.log('✅ risk-smart-model.test.js passed');
