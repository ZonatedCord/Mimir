const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { estimateTokens } = require('./tokenizer');

const SYSTEM_OVERHEAD_DEFAULT = 2_000;
const TOKENS_PER_TURN         = 800;
const AUTO_FILE_LIMIT         = 10;

function readActualTokensPerTurn(encodedPath, claudeBaseDir) {
  const base       = claudeBaseDir || path.join(os.homedir(), '.claude');
  const projectDir = path.join(base, 'projects', encodedPath);

  let files;
  try {
    files = fs.readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(projectDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5)
      .map(f => path.join(projectDir, f.name));
  } catch {
    return { tokensPerTurn: TOKENS_PER_TURN, source: 'default' };
  }

  if (files.length === 0) return { tokensPerTurn: TOKENS_PER_TURN, source: 'default' };

  const counts = [];
  for (const filePath of files) {
    let lines;
    try { lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean); } catch { continue; }
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type !== 'assistant') continue;
        const content = entry.message && entry.message.content;
        if (!Array.isArray(content)) continue;
        const text = content.filter(b => b.type === 'text').map(b => b.text || '').join('');
        if (text) counts.push(estimateTokens(text));
      } catch { continue; }
    }
  }

  if (counts.length < 3) return { tokensPerTurn: TOKENS_PER_TURN, source: 'default' };

  const avg = Math.round(counts.reduce((s, n) => s + n, 0) / counts.length);
  return { tokensPerTurn: avg, source: 'transcript' };
}

const SOURCE_EXTS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java',
  '.rb', '.cs', '.vue', '.svelte', '.sh', '.css', '.scss',
  '.md', '.json', '.yaml', '.yml',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.cache',
  '__pycache__', '.next', '.nuxt', 'vendor', 'tmp', 'temp', 'out',
]);

// Generic words that won't help match meaningful files
const STOPWORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'will', 'would', 'could',
  'should', 'been', 'were', 'does', 'also', 'just', 'even', 'back',
  'into', 'over', 'make', 'take', 'give', 'good', 'when', 'where',
  'what', 'which', 'then', 'than', 'more', 'most', 'some', 'only',
  'very', 'same', 'like', 'much', 'know', 'need', 'code', 'file',
  'data', 'type', 'work', 'time', 'user', 'name', 'part', 'base',
  'change', 'create', 'delete', 'remove', 'update', 'feature',
  'system', 'logic', 'module', 'class', 'function', 'interface',
  'entire', 'every', 'refactor', 'implement', 'write', 'rewrite',
]);

function extractShPaths(command) {
  const results = [];
  const re = /(?:bash|sh)\s+"?([^"'\s]+\.sh)"?/g;
  let m;
  while ((m = re.exec(command)) !== null) {
    results.push(m[1].replace(/^~/, os.homedir()));
  }
  return results;
}

function findHookScripts(cwd) {
  const candidates = [
    path.join(os.homedir(), '.claude', 'settings.json'),
    path.join(os.homedir(), '.claude', 'settings.local.json'),
    path.join(cwd, '.claude', 'settings.json'),
    path.join(cwd, '.claude', 'settings.local.json'),
    path.join(os.homedir(), '.codex', 'hooks.json'),
    path.join(cwd, '.codex', 'hooks.json'),
  ];

  const seen    = new Set();
  const scripts = [];

  for (const settingsPath of candidates) {
    let settings;
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch { continue; }
    const hooks = settings.hooks || {};
    for (const [event, groups] of Object.entries(hooks)) {
      if (!Array.isArray(groups)) continue;
      for (const group of groups) {
        for (const hook of (group.hooks || [])) {
          if (hook.type !== 'command' || !hook.command) continue;
          for (const shPath of extractShPaths(hook.command)) {
            if (seen.has(shPath)) continue;
            seen.add(shPath);
            const label = `Hook (${event}): ${path.basename(shPath)}`;
            try {
              scripts.push({ filePath: shPath, label, tokens: estimateTokens(fs.readFileSync(shPath, 'utf8')), event, error: null });
            } catch (err) {
              scripts.push({ filePath: shPath, label, tokens: 0, event, error: err.message });
            }
          }
        }
      }
    }
  }

  return scripts;
}

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

function extractKeywords(task) {
  return [...new Set(
    task.toLowerCase().split(/\W+/).filter(w => w.length >= 4 && !STOPWORDS.has(w))
  )];
}

function walkFiles(dir, maxDepth) {
  const files = [];
  function walk(d, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1);
      } else if (SOURCE_EXTS.has(path.extname(e.name))) {
        files.push(path.join(d, e.name));
      }
    }
  }
  walk(dir, 0);
  return files;
}

function scoreFile(filePath, keywords, cwd) {
  const parts = path.relative(cwd, filePath).toLowerCase().split(/[/\\.]/).filter(Boolean);
  let score   = 0;
  for (const kw of keywords) {
    for (const part of parts) {
      if (part === kw)                            score += 3;
      else if (part.includes(kw) || kw.includes(part)) score += 1;
    }
  }
  return score;
}

function autoDetectFiles(task, cwd) {
  const keywords = extractKeywords(task);
  if (keywords.length === 0) return [];

  const allFiles = walkFiles(cwd, 6);
  return allFiles
    .map(f => ({ filePath: f, score: scoreFile(f, keywords, cwd) }))
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, AUTO_FILE_LIMIT)
    .map(({ filePath }) => {
      const label = path.relative(cwd, filePath);
      try {
        return { filePath, label, tokens: estimateTokens(fs.readFileSync(filePath, 'utf8')), error: null };
      } catch (err) {
        return { filePath, label, tokens: 0, error: err.message };
      }
    });
}

function estimateContextOverhead(cfg, options) {
  const turns       = (options && options.turns) || 0;
  const cwd         = (options && options.cwd)   || process.cwd();
  const sysOverhead = (cfg && cfg.systemOverhead != null) ? cfg.systemOverhead : SYSTEM_OVERHEAD_DEFAULT;

  const encoded            = cwd.replace(/[^a-zA-Z0-9]/g, '-');
  const tpt                = turns > 0
    ? readActualTokensPerTurn(encoded)
    : { tokensPerTurn: TOKENS_PER_TURN, source: 'default' };

  const mds      = findClaudeMds(cwd);
  const mdTokens = mds.map(({ filePath, label }) => {
    try {
      return { label, tokens: estimateTokens(fs.readFileSync(filePath, 'utf8')), error: null };
    } catch (err) {
      return { label, tokens: 0, error: err.message };
    }
  });

  const hookScripts        = findHookScripts(cwd);
  const hookTotal          = hookScripts.reduce((s, h) => s + h.tokens, 0);
  const mdTotal            = mdTokens.reduce((s, r) => s + r.tokens, 0);
  const conversationTokens = turns * tpt.tokensPerTurn;

  return {
    systemOverhead:      sysOverhead,
    claudeMds:           mdTokens,
    hookScripts,
    hookTotal,
    mdTotal,
    conversationTokens,
    turns,
    tokensPerTurn:       tpt.tokensPerTurn,
    tokensPerTurnSource: tpt.source,
    total:               sysOverhead + hookTotal + mdTotal + conversationTokens,
  };
}

module.exports = {
  estimateContextOverhead, findClaudeMds, findHookScripts, autoDetectFiles, extractKeywords,
  readActualTokensPerTurn,
  SYSTEM_OVERHEAD_DEFAULT, TOKENS_PER_TURN, AUTO_FILE_LIMIT,
};
