const MODEL_PRICING = {
  'sonnet-4-6':   { input: 3.00,  output: 15.00 },
  'haiku-4-5':    { input: 0.80,  output: 4.00 },
  'gemini-flash': { input: 0.075, output: 0.30 },
  'gpt-4o':       { input: 2.50,  output: 10.00 },
};

const MODEL_LABELS = {
  'sonnet-4-6': 'sonnet',
  'haiku-4-5': 'haiku',
  'gemini-flash': 'gemini',
  'gpt-4o': 'gpt-4o',
};

function normalizeModelId(model) {
  if (!model) return null;
  const raw = String(model).toLowerCase();
  if (raw.includes('sonnet-4-6') || raw.includes('sonnet 4.6')) return 'sonnet-4-6';
  if (raw.includes('haiku-4-5') || raw.includes('haiku 4.5')) return 'haiku-4-5';
  if (raw.includes('gemini-flash') || raw.includes('gemini flash')) return 'gemini-flash';
  if (raw.includes('gpt-4o') || raw.includes('gpt 4o')) return 'gpt-4o';
  return null;
}

function estimateModelCost(model, inputTokens) {
  const modelId = normalizeModelId(model);
  const pricing = modelId ? MODEL_PRICING[modelId] : null;
  if (!pricing || !Number.isFinite(inputTokens) || inputTokens < 0) return null;

  const outputTokens = inputTokens * 2;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return {
    modelId,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

function estimateAllModelCosts(inputTokens) {
  if (!Number.isFinite(inputTokens) || inputTokens < 0) return null;
  return Object.keys(MODEL_PRICING).map((modelId) => {
    const pricing = MODEL_PRICING[modelId];
    const outputTokens = inputTokens * 2;
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return {
      modelId,
      label: MODEL_LABELS[modelId] || modelId,
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  });
}

module.exports = { MODEL_PRICING, MODEL_LABELS, normalizeModelId, estimateModelCost, estimateAllModelCosts };
