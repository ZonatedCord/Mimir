#!/usr/bin/env node
const { loadHistory, HISTORY_FILE } = require('./lib/history');

const LINE = '━'.repeat(35);

const args     = process.argv.slice(2);
const csvIdx   = args.indexOf('--csv');
const isCsv    = csvIdx !== -1;
const isStats  = args.includes('--stats');
const numArg   = args.filter(a => a !== '--csv' && a !== '--stats').find(a => /^\d+$/.test(a));
const N        = numArg ? parseInt(numArg, 10) : 10;

function escapeCsv(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function printStats(history) {
  const RISK_ORDER  = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const RISK_EMOJI  = { LOW: '✅', MEDIUM: '⚠️', HIGH: '🔴', CRITICAL: '🚨' };
  const total       = history.length;
  const tokenValues = history.map(e => e.tokens || 0);
  const avg         = Math.round(tokenValues.reduce((s, n) => s + n, 0) / total);
  const min         = Math.min(...tokenValues);
  const max         = Math.max(...tokenValues);

  const counts = {};
  for (const e of history) counts[e.risk] = (counts[e.risk] || 0) + 1;
  const topRisk = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  process.stdout.write(`\n⚡ MIMIR STATS (${total} estimate${total === 1 ? '' : 's'})\n`);
  process.stdout.write(`${LINE}\n`);
  process.stdout.write(`  Token usage:\n`);
  process.stdout.write(`    Average:    ~${avg.toLocaleString()}\n`);
  process.stdout.write(`    Min:        ~${min.toLocaleString()}\n`);
  process.stdout.write(`    Max:        ~${max.toLocaleString()}\n`);
  process.stdout.write(`\n  Risk breakdown:\n`);
  for (const level of RISK_ORDER) {
    const n   = counts[level] || 0;
    if (!n) continue;
    const pct = Math.round((n / total) * 100);
    const emoji = RISK_EMOJI[level] || '';
    process.stdout.write(`    ${(level + ' ' + emoji).padEnd(16)}${String(n).padStart(3)}  (${pct}%)\n`);
  }
  process.stdout.write(`\n  Most common risk:  ${topRisk} ${RISK_EMOJI[topRisk] || ''}\n`);
  process.stdout.write(`${LINE}\n\n`);
}

function main() {
  const history = loadHistory();

  if (history.length === 0) {
    process.stdout.write(`\nNo Mimir history yet. Run /mimir to start tracking.\n\n`);
    return;
  }

  if (isStats) {
    printStats(history);
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
