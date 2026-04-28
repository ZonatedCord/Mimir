const LARGE_RE   = /\b(refactor|rewrite|migrate|restructure|audit|entire|system|full|all|every|architect)\b/i;
const FEATURE_RE = /\b(implement|build|create|develop|add feature|integrate)\b/i;
const FIX_RE     = /\b(fix|debug|bug|error|broken|failing|crash)\b/i;
const QUICK_RE   = /\b(explain|what|how does|show|list|describe|summarize)\b/i;

function estimateTaskTurns(task) {
  if (!task) return { turns: 5, category: 'default' };
  if (LARGE_RE.test(task))   return { turns: 10, category: 'large' };
  if (FEATURE_RE.test(task)) return { turns: 7,  category: 'feature' };
  if (FIX_RE.test(task))     return { turns: 4,  category: 'fix' };
  if (QUICK_RE.test(task))   return { turns: 2,  category: 'quick' };
  return { turns: 5, category: 'default' };
}

// Projects total context at turn N, given single-turn baseline + growth per turn
function projectAtTurn(singleTurnTokens, tokensPerTurn, n) {
  return singleTurnTokens + Math.max(0, n - 1) * tokensPerTurn;
}

module.exports = { estimateTaskTurns, projectAtTurn };
