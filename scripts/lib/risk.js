const CONTEXT_WINDOW = 200_000;

const THRESHOLDS = {
  LOW:    20_000,
  MEDIUM: 60_000,
  HIGH:  120_000,
};

const MODELS = {
  'sonnet-4.6': { label: 'Sonnet 4.6', contextWindow: 200_000 },
  'haiku-4.5':  { label: 'Haiku 4.5',  contextWindow: 200_000 },
  'opus-4.7':   { label: 'Opus 4.7',   contextWindow: 200_000 },
};

function classifyRisk(tokens) {
  if (tokens < THRESHOLDS.LOW) {
    return {
      level: 'LOW',
      emoji: '✅',
      action: 'Proceed',
      suggestedModel: 'Any — Haiku 4.5 (cost) or Sonnet 4.6 (quality)',
    };
  }
  if (tokens < THRESHOLDS.MEDIUM) {
    return {
      level: 'MEDIUM',
      emoji: '⚠️',
      action: 'Proceed with caution — limit files read',
      suggestedModel: 'Sonnet 4.6',
    };
  }
  if (tokens < THRESHOLDS.HIGH) {
    return {
      level: 'HIGH',
      emoji: '🔴',
      action: 'Consider splitting this task',
      suggestedModel: 'Haiku 4.5 (cost) or Sonnet 4.6 (quality)',
    };
  }
  return {
    level: 'CRITICAL',
    emoji: '🚨',
    action: 'Split required — task will likely exceed context',
    suggestedModel: 'Haiku 4.5 or split first',
  };
}

function contextHeadroom(tokens) {
  return Math.max(0, Math.round((1 - tokens / CONTEXT_WINDOW) * 100));
}

module.exports = { THRESHOLDS, CONTEXT_WINDOW, MODELS, classifyRisk, contextHeadroom };
