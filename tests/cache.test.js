const assert = require('assert');
const { estimateCacheSavings } = require('../scripts/lib/cache');

// null for degenerate inputs
assert.strictEqual(estimateCacheSavings(0,       1000), null);
assert.strictEqual(estimateCacheSavings(1000,    0),    null);
assert.strictEqual(estimateCacheSavings(0,       0),    null);

// return shape
const r = estimateCacheSavings(2000, 4000);
assert.ok('cacheableTokens'  in r, 'missing cacheableTokens');
assert.ok('cacheablePct'     in r, 'missing cacheablePct');
assert.ok('costReductionPct' in r, 'missing costReductionPct');

// cacheablePct: 2000/4000 = 50%
assert.strictEqual(r.cacheablePct, 50);

// costReductionPct: saved = 2000 * 0.90 = 1800, reduction = 1800/4000 = 45%
assert.strictEqual(r.costReductionPct, 45);

// 100% cacheable → 90% cost reduction
const full = estimateCacheSavings(1000, 1000);
assert.strictEqual(full.cacheablePct,     100);
assert.strictEqual(full.costReductionPct,  90);

// small cacheable fraction
const small = estimateCacheSavings(100, 10000);
assert.strictEqual(small.cacheablePct, 1);
assert.ok(small.costReductionPct < 5);

console.log('✅ cache.test.js passed');
