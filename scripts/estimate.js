#!/usr/bin/env node
const fs           = require('fs');
const path         = require('path');
const childProcess = require('child_process');
const { estimateTokens, countTokensViaAPI } = require('./lib/tokenizer');
const { classifyRisk, contextHeadroom }     = require('./lib/risk');
const { loadConfig }                        = require('./lib/config');
const { appendHistory }                     = require('./lib/history');

const LINE  = '━'.repeat(35);
const HELP  = `
⚡ MIMIR — preflight checker

Usage:
  /mimir "<task>"                   Estimate token cost + risk
  /mimir "<task>" --files f1 f2     Include file content in estimate
  /mimir "<task>" --git-diff        Include current git diff in estimate
  /split-task "<task>"              Split large task into safer sub-tasks

Risk levels: LOW ✅  MEDIUM ⚠️  HIGH 🔴  CRITICAL 🚨

Tip: run /mimir before any task that reads many files or touches large codebases.
`.trimStart();

function parseArgs(argv) {
  const gitDiffIdx = argv.indexOf('--git-diff');
  const filesIdx   = argv.indexOf('--files');
  const baseArgv   = argv.filter(a => a !== '--git-diff');
  const fi         = baseArgv.indexOf('--files');
  if (fi === -1) return { task: baseArgv.join(' ').trim(), filePaths: [], useGitDiff: gitDiffIdx !== -1 };
  return {
    task:       baseArgv.slice(0, fi).join(' ').trim(),
    filePaths:  baseArgv.slice(fi + 1),
    useGitDiff: gitDiffIdx !== -1,
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

async function countText(text, method) {
  if (method === 'forced-heuristic') return { tokens: estimateTokens(text), method: 'heuristic' };
  const api = await countTokensViaAPI(text);
  if (api !== null) return { tokens: api, method: 'exact' };
  return { tokens: estimateTokens(text), method: 'heuristic' };
}

async function main() {
  const { task, filePaths, useGitDiff } = parseArgs(process.argv.slice(2));

  if (!task) {
    process.stdout.write(HELP);
    process.exit(0);
  }

  const cfg = loadConfig();
  const taskResult = await countText(task, 'auto');
  const method = taskResult.method;

  let totalTokens = taskResult.tokens;
  const fileResults = [];

  for (const fp of filePaths) {
    const f = readFile(fp);
    if (f.error) {
      fileResults.push({ path: fp, tokens: 0, error: f.error });
    } else {
      const r = await countText(f.content, 'forced-heuristic');
      fileResults.push({ path: fp, tokens: r.tokens, error: null });
      totalTokens += r.tokens;
    }
  }

  let diffTokens = 0;
  if (useGitDiff) {
    const diff = getGitDiff();
    if (diff) {
      diffTokens = estimateTokens(diff);
      totalTokens += diffTokens;
    }
  }

  const risk     = classifyRisk(totalTokens, cfg, task);
  const headroom = contextHeadroom(totalTokens, cfg.contextWindow);

  process.stdout.write(`\n⚡ MIMIR PREFLIGHT\n`);
  process.stdout.write(`${LINE}\n`);

  const hasExtras = filePaths.length > 0 || useGitDiff;

  if (hasExtras) {
    const filesTotal = fileResults.reduce((s, f) => s + f.tokens, 0);
    process.stdout.write(`  Task tokens (${method}):   ${fmt(method, taskResult.tokens)}\n`);
    if (fileResults.length > 0) {
      process.stdout.write(`  Files tokens:             ~${filesTotal.toLocaleString()}\n`);
      for (const f of fileResults) {
        const name = path.basename(f.path).padEnd(20).slice(0, 20);
        if (f.error) process.stdout.write(`    ${name}  ⚠ ${f.error}\n`);
        else         process.stdout.write(`    ${name}  ~${f.tokens.toLocaleString()}\n`);
      }
    }
    if (useGitDiff) {
      process.stdout.write(`  Git diff tokens:          ~${diffTokens.toLocaleString()}\n`);
    }
    process.stdout.write(`  Total tokens:             ~${totalTokens.toLocaleString()}\n`);
  } else {
    process.stdout.write(`  Input tokens (${method}):  ${fmt(method, totalTokens)}\n`);
  }

  const modelLine = cfg.defaultModel
    ? `${cfg.defaultModel} (from .mimir.json)`
    : risk.suggestedModel;

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
