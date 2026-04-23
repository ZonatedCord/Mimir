#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { estimateTokens, countTokensViaAPI } = require('./lib/tokenizer');
const { classifyRisk, contextHeadroom }     = require('./lib/risk');
const { loadConfig }                        = require('./lib/config');

const LINE = '━'.repeat(35);

function parseArgs(argv) {
  const filesIdx = argv.indexOf('--files');
  if (filesIdx === -1) return { task: argv.join(' ').trim(), filePaths: [] };
  return {
    task: argv.slice(0, filesIdx).join(' ').trim(),
    filePaths: argv.slice(filesIdx + 1),
  };
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
  const { task, filePaths } = parseArgs(process.argv.slice(2));

  if (!task) {
    process.stderr.write('Usage: node estimate.js "<task>" [--files file1 file2 ...]\n');
    process.exit(1);
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

  const risk     = classifyRisk(totalTokens, cfg);
  const headroom = contextHeadroom(totalTokens, cfg.contextWindow);

  process.stdout.write(`\n⚡ MIMIR PREFLIGHT\n`);
  process.stdout.write(`${LINE}\n`);

  if (filePaths.length > 0) {
    const filesTotal = fileResults.reduce((s, f) => s + f.tokens, 0);
    process.stdout.write(`  Task tokens (${method}):   ${fmt(method, taskResult.tokens)}\n`);
    process.stdout.write(`  Files tokens:             ~${filesTotal.toLocaleString()}\n`);
    for (const f of fileResults) {
      const name = path.basename(f.path).padEnd(20).slice(0, 20);
      if (f.error) process.stdout.write(`    ${name}  ⚠ ${f.error}\n`);
      else         process.stdout.write(`    ${name}  ~${f.tokens.toLocaleString()}\n`);
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
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
