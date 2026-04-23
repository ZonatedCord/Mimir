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

const COMPLEX_TASK_RE = /\b(architect|design|refactor|migrate|review|analyze|entire|system|full|all|every|audit|restructure)\b/i;
const SIMPLE_TASK_RE  = /\b(fix|typo|rename|update|bump|minor|small|simple|tweak|add\s+\w+\s+comment)\b/i;

function suggestModel(tokens, thresholds, taskText) {
  if (tokens >= thresholds.MEDIUM) return 'Sonnet 4.6';
  if (tokens >= thresholds.HIGH)   return 'Haiku 4.5 (cost) or Sonnet 4.6 (quality)';

  if (!taskText) return 'Any — Haiku 4.5 (cost) or Sonnet 4.6 (quality)';
  if (COMPLEX_TASK_RE.test(taskText)) return 'Sonnet 4.6 (complex task detected)';
  if (SIMPLE_TASK_RE.test(taskText))  return 'Haiku 4.5 (simple task detected)';
  return 'Any — Haiku 4.5 (cost) or Sonnet 4.6 (quality)';
}

function classifyRisk(tokens, overrides, taskText) {
  const t  = (overrides && overrides.thresholds) ? { ...THRESHOLDS, ...overrides.thresholds } : THRESHOLDS;

  if (tokens < t.LOW) {
    return {
      level: 'LOW',
      emoji: '✅',
      action: 'Proceed',
      suggestedModel: suggestModel(tokens, t, taskText),
    };
  }
  if (tokens < t.MEDIUM) {
    return {
      level: 'MEDIUM',
      emoji: '⚠️',
      action: 'Proceed with caution — limit files read',
      suggestedModel: 'Sonnet 4.6',
    };
  }
  if (tokens < t.HIGH) {
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

function contextHeadroom(tokens, contextWindow) {
  const cw = contextWindow || CONTEXT_WINDOW;
  return Math.max(0, Math.round((1 - tokens / cw) * 100));
}

module.exports = { THRESHOLDS, CONTEXT_WINDOW, MODELS, classifyRisk, contextHeadroom };
