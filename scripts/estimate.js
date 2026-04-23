#!/usr/bin/env node
const { estimateTokens, countTokensViaAPI } = require('./lib/tokenizer');
const { classifyRisk, contextHeadroom }     = require('./lib/risk');

const LINE = '━'.repeat(35);

async function main() {
  const task = process.argv.slice(2).join(' ').trim();
  if (!task) {
    process.stderr.write('Usage: node estimate.js "<task description>"\n');
    process.exit(1);
  }

  let tokens;
  let method = 'heuristic';

  const apiResult = await countTokensViaAPI(task);
  if (apiResult !== null) {
    tokens = apiResult;
    method = 'exact';
  } else {
    tokens = estimateTokens(task);
  }

  const risk     = classifyRisk(tokens);
  const headroom = contextHeadroom(tokens);
  const label    = method === 'exact'
    ? tokens.toLocaleString()
    : `~${tokens.toLocaleString()}`;

  process.stdout.write(`\n⚡ MIMIR PREFLIGHT\n`);
  process.stdout.write(`${LINE}\n`);
  process.stdout.write(`  Input tokens (${method}):  ${label}\n`);
  process.stdout.write(`  Risk:                 ${risk.level} ${risk.emoji}\n`);
  process.stdout.write(`  Suggested model:      ${risk.suggestedModel}\n`);
  process.stdout.write(`  Context headroom:     ${headroom}%\n`);
  process.stdout.write(`  Action:               ${risk.action}\n`);
  process.stdout.write(`${LINE}\n\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
