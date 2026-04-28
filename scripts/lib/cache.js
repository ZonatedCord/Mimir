// Cache reads cost 10% of base input tokens (Anthropic Prompt Caching)
const CACHE_READ_RATIO = 0.10;

function estimateCacheSavings(cacheableTokens, totalTokens) {
  if (totalTokens === 0 || cacheableTokens === 0) return null;
  const cacheablePct     = Math.round((cacheableTokens / totalTokens) * 100);
  const savedTokenEquiv  = Math.round(cacheableTokens * (1 - CACHE_READ_RATIO));
  const costReductionPct = Math.round((savedTokenEquiv / totalTokens) * 100);
  return { cacheableTokens, cacheablePct, costReductionPct };
}

module.exports = { estimateCacheSavings };
