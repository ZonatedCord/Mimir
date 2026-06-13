const assert = require('assert');
const { MODEL_PRICING, normalizeModelId, estimateModelCost, estimateAllModelCosts } = require('../scripts/lib/cost');

assert.strictEqual(MODEL_PRICING['sonnet-4-6'].input, 3);
assert.strictEqual(MODEL_PRICING['haiku-4-5'].output, 4);
assert.strictEqual(MODEL_PRICING['gemini-flash'].input, 0.075);
assert.strictEqual(MODEL_PRICING['gpt-4o'].output, 10);

assert.strictEqual(normalizeModelId('Sonnet 4.6'), 'sonnet-4-6');
assert.strictEqual(normalizeModelId('claude-sonnet-4-6'), 'sonnet-4-6');
assert.strictEqual(normalizeModelId('Haiku 4.5'), 'haiku-4-5');
assert.strictEqual(normalizeModelId('gemini flash'), 'gemini-flash');
assert.strictEqual(normalizeModelId('gpt-4o'), 'gpt-4o');

const cost = estimateModelCost('Sonnet 4.6', 1000);
assert.ok(cost, 'expected a cost result');
assert.strictEqual(cost.modelId, 'sonnet-4-6');
assert.strictEqual(cost.outputTokens, 2000);
assert.strictEqual(cost.totalCost, 0.033);

assert.strictEqual(estimateModelCost('unknown', 1000), null);

const all = estimateAllModelCosts(1000);
assert.ok(Array.isArray(all), 'expected all model costs array');
assert.strictEqual(all.length, 4);
assert.strictEqual(all[0].label, 'sonnet');
assert.strictEqual(all[1].label, 'haiku');

console.log('✅ cost.test.js passed');
