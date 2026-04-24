#!/usr/bin/env node
const { loadHistory, HISTORY_FILE } = require('./lib/history');

const LINE = '━'.repeat(35);

const args   = process.argv.slice(2);
const csvIdx = args.indexOf('--csv');
const isCsv  = csvIdx !== -1;
const numArg = args.filter(a => a !== '--csv').find(a => /^\d+$/.test(a));
const N      = numArg ? parseInt(numArg, 10) : 10;

function escapeCsv(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function main() {
  const history = loadHistory();

  if (history.length === 0) {
    process.stdout.write(`\nNo Mimir history yet. Run /mimir to start tracking.\n\n`);
    return;
  }

  const entries = history.slice(-N).reverse();

  if (isCsv) {
    process.stdout.write('timestamp,task,tokens,risk,model\n');
    for (const e of entries) {
      process.stdout.write(
        [e.timestamp, e.task, e.tokens ?? 0, e.risk, e.model ?? '']
          .map(escapeCsv).join(',') + '\n'
      );
    }
    return;
  }

  process.stdout.write(`\n⚡ MIMIR HISTORY (last ${entries.length})\n`);
  process.stdout.write(`${LINE}\n`);

  for (const e of entries) {
    const date     = new Date(e.timestamp).toLocaleString();
    const preview  = e.task.length > 45 ? `${e.task.substring(0, 42)}...` : e.task;
    const riskEmoji = { LOW: '✅', MEDIUM: '⚠️', HIGH: '🔴', CRITICAL: '🚨' }[e.risk] || '';
    process.stdout.write(`  ${date}\n`);
    process.stdout.write(`  "${preview}"\n`);
    process.stdout.write(`  ${e.risk} ${riskEmoji} · ~${(e.tokens || 0).toLocaleString()} tokens\n`);
    process.stdout.write(`\n`);
  }

  process.stdout.write(`  History file: ${HISTORY_FILE}\n`);
  process.stdout.write(`${LINE}\n\n`);
}

main();
