#!/usr/bin/env node
const fs           = require('fs');
const path         = require('path');
const childProcess = require('child_process');
const { estimateTokens, countTokensViaAPI }  = require('./lib/tokenizer');
const { classifyRisk, contextHeadroom }      = require('./lib/risk');
const { loadConfig }                         = require('./lib/config');
const { appendHistory }                      = require('./lib/history');
const { estimateContextOverhead }            = require('./lib/context');

const LINE  = '━'.repeat(35);
const SEP   = '─'.repeat(35);
const COL   = 28; // label column width

const HELP  = `
⚡ MIMIR — preflight checker

Usage:
  /mimir "<task>"                   Estimate token cost + risk
  /mimir "<task>" --files f1 f2     Include specific files in estimate
  /mimir "<task>" --git-diff        Include current git diff in estimate
  /mimir "<task>" --turns N         Include N conversation turns in estimate
  /split-task "<task>"              Split large task into safer sub-tasks

Risk levels: LOW ✅  MEDIUM ⚠️  HIGH 🔴  CRITICAL 🚨

Token sources always included:
  - System overhead  (~3k) — system prompt + command file + hooks
  - CLAUDE.md files         — user (~/.claude/) and project (.claude/)

Tip: run /mimir before any task that reads many files or touches large codebases.
`.trimStart();

function parseArgs(argv) {
  const useGitDiff = argv.includes('--git-diff');
  const turnsIdx   = argv.indexOf('--turns');
  const turns      = turnsIdx !== -1 ? (parseInt(argv[turnsIdx + 1], 10) || 0) : 0;

  const clean = [];
  let i = 0;
  while (i < argv.length) {
    if (argv[i] === '--git-diff')         { i++;     continue; }
    if (argv[i] === '--turns')            { i += 2;  continue; }
    clean.push(argv[i]);
    i++;
  }

  const filesIdx = clean.indexOf('--files');
  if (filesIdx === -1) {
    return { task: clean.join(' ').trim(), filePaths: [], useGitDiff, turns };
  }
  return {
    task:       clean.slice(0, filesIdx).join(' ').trim(),
    filePaths:  clean.slice(filesIdx + 1),
    useGitDiff,
    turns,
  };
}

function getGitDiff() {
  try {
    const staged = childProcess.execSync('git diff --staged', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (staged.trim()) return staged;
    return childProcess.execSync('git diff HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function readFile(filePath) {
  try {
    return { path: filePath, content: fs.readFileSync(filePath, 'utf8'), error: null };
  } catch (err) {
    return { path: filePath, content: null, error: err.message };
  }
}

function fmt(method, n) {
  return method === 'exact' ? n.toLocaleString() : `~${n.toLocaleString()}`;
}

function row(label, value) {
  const pad = Math.max(1, COL - label.length);
  process.stdout.write(`  ${label}${' '.repeat(pad)}${value}\n`);
}

async function countText(text, method) {
  if (method === 'forced-heuristic') return { tokens: estimateTokens(text), method: 'heuristic' };
  const api = await countTokensViaAPI(text);
  if (api !== null) return { tokens: api, method: 'exact' };
  return { tokens: estimateTokens(text), method: 'heuristic' };
}

async function main() {
  const { task, filePaths, useGitDiff, turns } = parseArgs(process.argv.slice(2));

  if (!task) {
    process.stdout.write(HELP);
    process.exit(0);
  }

  const cfg         = loadConfig();
  const taskResult  = await countText(task, 'auto');
  const method      = taskResult.method;
  const ctx         = estimateContextOverhead(cfg, { turns, cwd: process.cwd() });

  const fileResults = [];
  let fileTotal     = 0;
  for (const fp of filePaths) {
    const f = readFile(fp);
    if (f.error) {
      fileResults.push({ path: fp, tokens: 0, error: f.error });
    } else {
      const r = await countText(f.content, 'forced-heuristic');
      fileResults.push({ path: fp, tokens: r.tokens, error: null });
      fileTotal += r.tokens;
    }
  }

  let diffTokens = 0;
  if (useGitDiff) {
    const diff = getGitDiff();
    if (diff) diffTokens = estimateTokens(diff);
  }

  const totalTokens = taskResult.tokens + ctx.total + fileTotal + diffTokens;
  const risk        = classifyRisk(totalTokens, cfg, task);
  const headroom    = contextHeadroom(totalTokens, cfg.contextWindow);
  const modelLine   = cfg.defaultModel ? `${cfg.defaultModel} (from .mimir.json)` : risk.suggestedModel;

  process.stdout.write(`\n⚡ MIMIR PREFLIGHT\n`);
  process.stdout.write(`${LINE}\n`);

  // Token sources
  row(`Task (${method}):`,         fmt(method, taskResult.tokens));
  row('System overhead:',          `~${ctx.systemOverhead.toLocaleString()}  (prompt + command + hooks)`);

  for (const md of ctx.claudeMds) {
    const label = `${md.label}:`;
    if (md.error) row(label, `⚠ ${md.error}`);
    else          row(label, `~${md.tokens.toLocaleString()}`);
  }

  if (fileResults.length > 0) {
    for (const f of fileResults) {
      const name  = path.basename(f.path);
      const label = `${name}:`;
      if (f.error) row(label, `⚠ ${f.error}`);
      else         row(label, `~${f.tokens.toLocaleString()}`);
    }
  }

  if (useGitDiff) {
    row('Git diff:', `~${diffTokens.toLocaleString()}`);
  }

  if (turns > 0) {
    row(`Conversation (${turns} turns):`, `~${ctx.conversationTokens.toLocaleString()}  (~800 tok/turn)`);
  }

  process.stdout.write(`  ${SEP}\n`);
  row('Total:', `~${totalTokens.toLocaleString()}`);

  process.stdout.write(`\n`);
  process.stdout.write(`  Risk:                 ${risk.level} ${risk.emoji}\n`);
  process.stdout.write(`  Suggested model:      ${modelLine}\n`);
  process.stdout.write(`  Context headroom:     ${headroom}%\n`);
  process.stdout.write(`  Action:               ${risk.action}\n`);
  process.stdout.write(`${LINE}\n\n`);

  appendHistory({ task, tokens: totalTokens, risk: risk.level, model: modelLine });

  if (risk.level === 'HIGH' || risk.level === 'CRITICAL') {
    const splitArgs = [task];
    if (filePaths.length > 0) splitArgs.push('--files', ...filePaths);
    const result = childProcess.spawnSync(
      process.execPath,
      [path.join(__dirname, 'split.js'), ...splitArgs],
      { encoding: 'utf8' }
    );
    if (result.stdout) process.stdout.write(result.stdout);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
