#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');
const { estimateTokens } = require('./lib/tokenizer');
const { classifyRisk }   = require('./lib/risk');
const { loadConfig }     = require('./lib/config');

const LINE = '━'.repeat(35);
const ACTION_VERBS = [
  'analyze', 'refactor', 'test', 'document', 'review',
  'update', 'fix', 'add', 'remove', 'migrate', 'audit',
];

function parseArgs(argv) {
  const filesIdx = argv.indexOf('--files');
  if (filesIdx === -1) return { task: argv.join(' ').trim(), filePaths: [] };
  return {
    task:      argv.slice(0, filesIdx).join(' ').trim(),
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

function detectSplitPoints(task) {
  // Priority 1: explicit conjunctions
  const conjParts = task.split(/\s*,?\s+(?:and then|then|and also)\s+/i);
  if (conjParts.length > 1) {
    return conjParts.map(p => p.trim()).filter(p => p.length > 10);
  }

  // Priority 2: multiple distinct action verbs
  const found = ACTION_VERBS.filter(v => new RegExp(`\\b${v}\\b`, 'i').test(task));
  if (found.length >= 2) {
    return found.map(v => {
      const match = task.match(new RegExp(`(${v}[^,\\.;]{5,60})`, 'i'));
      return match ? match[1].trim() : `${v} (as described)`;
    });
  }

  // Priority 3: broad scope → split into phases
  if (/\b(all|every|entire|whole|complete)\b/i.test(task)) {
    const phase1 = task.replace(/\b(all|every|entire|whole)\b/gi, 'first batch of').trim();
    const phase2 = task.replace(/\b(all|every|entire|whole)\b/gi, 'remaining').trim();
    return [phase1, `${phase2} (validate first batch before starting)`];
  }

  // Fallback: research + implement
  return [
    `Map scope: ${task}`,
    `Implement: ${task} (using scope map from step 1)`,
  ];
}

async function main() {
  const { task, filePaths } = parseArgs(process.argv.slice(2));

  if (!task) {
    process.stderr.write('Usage: node split.js "<task>" [--files file1 file2 ...]\n');
    process.exit(1);
  }

  const cfg   = loadConfig();
  const parts = detectSplitPoints(task);

  let fileTokens = 0;
  const fileResults = [];
  for (const fp of filePaths) {
    const f = readFile(fp);
    if (f.error) {
      fileResults.push({ path: fp, tokens: 0, error: f.error });
    } else {
      const t = estimateTokens(f.content);
      fileResults.push({ path: fp, tokens: t, error: null });
      fileTokens += t;
    }
  }

  process.stdout.write(`\n⚡ MIMIR SPLIT\n`);
  process.stdout.write(`${LINE}\n`);

  if (fileResults.length > 0) {
    process.stdout.write(`  Files loaded:  ~${fileTokens.toLocaleString()} tokens\n`);
    for (const f of fileResults) {
      const name = path.basename(f.path).padEnd(20).slice(0, 20);
      if (f.error) process.stdout.write(`    ${name}  ⚠ ${f.error}\n`);
      else         process.stdout.write(`    ${name}  ~${f.tokens.toLocaleString()}\n`);
    }
    process.stdout.write(`\n`);
  }

  process.stdout.write(`  Suggested split:\n`);

  for (let i = 0; i < parts.length; i++) {
    const part        = parts[i];
    const taskTokens  = estimateTokens(part);
    const totalTokens = taskTokens + fileTokens;
    const risk        = classifyRisk(totalTokens, cfg);
    const preview     = part.length > 55 ? `${part.substring(0, 52)}...` : part;
    process.stdout.write(`  ${i + 1}. "${preview}"\n`);
    process.stdout.write(`     → ${risk.level} ${risk.emoji} (~${totalTokens.toLocaleString()} tokens)\n`);
  }

  process.stdout.write(`  Tip: split by module/feature, not by file type\n`);
  process.stdout.write(`${LINE}\n\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
