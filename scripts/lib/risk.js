const CONTEXT_WINDOW = 200_000;

const THRESHOLDS = {
  LOW:    20_000,
  MEDIUM: 60_000,
  HIGH:  120_000,
};

function classifyRisk(tokens) {
  if (tokens < THRESHOLDS.LOW) {
    return {
      level: 'LOW',
      emoji: '✅',
      action: 'Proceed',
      suggestedModel: 'Sonnet 4.6',
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
      suggestedModel: 'Haiku 4.5 or Sonnet 4.6',
    };
  }
  return {
    level: 'CRITICAL',
    emoji: '🚨',
    action: 'Split required — task will likely exceed context',
    suggestedModel: 'Haiku 4.5',
  };
}

function contextHeadroom(tokens) {
  return Math.max(0, Math.round((1 - tokens / CONTEXT_WINDOW) * 100));
}

module.exports = { THRESHOLDS, CONTEXT_WINDOW, classifyRisk, contextHeadroom };
