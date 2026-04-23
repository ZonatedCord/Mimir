const assert = require('assert');
const { classifyRisk, contextHeadroom, THRESHOLDS, CONTEXT_WINDOW, MODELS } = require('../scripts/lib/risk');

// exported shape
assert.strictEqual(typeof THRESHOLDS.LOW, 'number');
assert.strictEqual(typeof THRESHOLDS.MEDIUM, 'number');
assert.strictEqual(typeof THRESHOLDS.HIGH, 'number');
assert.strictEqual(CONTEXT_WINDOW, 200_000);

// MODELS shape
assert.ok('sonnet-4.6' in MODELS, 'missing sonnet-4.6');
assert.ok('haiku-4.5'  in MODELS, 'missing haiku-4.5');
assert.ok('opus-4.7'   in MODELS, 'missing opus-4.7');
assert.ok(typeof MODELS['sonnet-4.6'].contextWindow === 'number');

// classifyRisk: boundary conditions
assert.strictEqual(classifyRisk(0).level,       'LOW');
assert.strictEqual(classifyRisk(19_999).level,  'LOW');
assert.strictEqual(classifyRisk(20_000).level,  'MEDIUM');
assert.strictEqual(classifyRisk(59_999).level,  'MEDIUM');
assert.strictEqual(classifyRisk(60_000).level,  'HIGH');
assert.strictEqual(classifyRisk(119_999).level, 'HIGH');
assert.strictEqual(classifyRisk(120_000).level, 'CRITICAL');
assert.strictEqual(classifyRisk(999_999).level, 'CRITICAL');

// classifyRisk: return shape
const result = classifyRisk(50_000);
assert.ok('level'          in result, 'missing: level');
assert.ok('emoji'          in result, 'missing: emoji');
assert.ok('action'         in result, 'missing: action');
assert.ok('suggestedModel' in result, 'missing: suggestedModel');

// contextHeadroom: values and clamp
assert.strictEqual(contextHeadroom(0),       100);
assert.strictEqual(contextHeadroom(200_000),   0);
assert.strictEqual(contextHeadroom(100_000),  50);
assert.strictEqual(contextHeadroom(300_000),   0); // never negative

console.log('✅ risk.test.js passed');
