const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { estimateTokens } = require('./tokenizer');

const SYSTEM_OVERHEAD_DEFAULT = 3_000; // system prompt + command file + hooks baseline
const TOKENS_PER_TURN         = 800;   // avg user+assistant message pair

function findClaudeMds(cwd) {
  const base   = path.resolve(cwd || process.cwd());
  const userMd = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  const seen   = new Set();
  const found  = [];

  if (fs.existsSync(userMd)) {
    seen.add(userMd);
    found.push({ filePath: userMd, label: '~/.claude/CLAUDE.md' });
  }

  let dir = base;
  while (true) {
    const candidate = path.join(dir, '.claude', 'CLAUDE.md');
    if (!seen.has(candidate) && fs.existsSync(candidate)) {
      seen.add(candidate);
      const rel = path.relative(base, path.join(dir, '.claude', 'CLAUDE.md'));
      found.push({ filePath: candidate, label: rel || '.claude/CLAUDE.md' });
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return found;
}

function estimateContextOverhead(cfg, options) {
  const turns        = (options && options.turns)  || 0;
  const cwd          = (options && options.cwd)    || process.cwd();
  const sysOverhead  = (cfg && cfg.systemOverhead != null) ? cfg.systemOverhead : SYSTEM_OVERHEAD_DEFAULT;

  const mds      = findClaudeMds(cwd);
  const mdTokens = mds.map(({ filePath, label }) => {
    try {
      return { label, tokens: estimateTokens(fs.readFileSync(filePath, 'utf8')), error: null };
    } catch (err) {
      return { label, tokens: 0, error: err.message };
    }
  });

  const mdTotal            = mdTokens.reduce((s, r) => s + r.tokens, 0);
  const conversationTokens = turns * TOKENS_PER_TURN;

  return {
    systemOverhead:      sysOverhead,
    claudeMds:           mdTokens,
    mdTotal,
    conversationTokens,
    turns,
    total:               sysOverhead + mdTotal + conversationTokens,
  };
}

module.exports = { estimateContextOverhead, findClaudeMds, SYSTEM_OVERHEAD_DEFAULT, TOKENS_PER_TURN };
