#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');
const { loadConfig } = require('./lib/config');

const LINE = '━'.repeat(35);

function main() {
  const cfg         = loadConfig();
  const hasCfgFile  = fs.existsSync(path.join(process.cwd(), '.mimir.json'));
  const source      = hasCfgFile ? '.mimir.json' : 'defaults (no .mimir.json found)';
  const t           = cfg.thresholds;
  const thresholds  = `LOW <${t.LOW / 1000}k · MEDIUM <${t.MEDIUM / 1000}k · HIGH <${t.HIGH / 1000}k · CRITICAL ≥${t.HIGH / 1000}k`;
  const model       = cfg.defaultModel || '(none — use risk-based suggestion)';

  process.stdout.write(`\n⚡ MIMIR CONFIG\n`);
  process.stdout.write(`${LINE}\n`);
  process.stdout.write(`  Source:           ${source}\n`);
  process.stdout.write(`  Context window:   ${cfg.contextWindow.toLocaleString()} tokens\n`);
  process.stdout.write(`  System overhead:  ${cfg.systemOverhead.toLocaleString()} tokens\n`);
  process.stdout.write(`  Thresholds:       ${thresholds}\n`);
  process.stdout.write(`  Default model:    ${model}\n`);
  process.stdout.write(`${LINE}\n\n`);
}

main();
