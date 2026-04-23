#!/usr/bin/env node
const { estimateTokens } = require('./lib/tokenizer');
const { classifyRisk }   = require('./lib/risk');

const LINE = '━'.repeat(35);
const ACTION_VERBS = [
  'analyze', 'refactor', 'test', 'document', 'review',
  'update', 'fix', 'add', 'remove', 'migrate', 'audit',
];

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
  const task = process.argv.slice(2).join(' ').trim();
  if (!task) {
    process.stderr.write('Usage: node split.js "<task description>"\n');
    process.exit(1);
  }

  const parts = detectSplitPoints(task);

  process.stdout.write(`\n⚡ MIMIR SPLIT\n`);
  process.stdout.write(`${LINE}\n`);
  process.stdout.write(`  Suggested split:\n`);

  for (let i = 0; i < parts.length; i++) {
    const part    = parts[i];
    const tokens  = estimateTokens(part);
    const risk    = classifyRisk(tokens);
    const preview = part.length > 55 ? `${part.substring(0, 52)}...` : part;
    process.stdout.write(`  ${i + 1}. "${preview}"\n`);
    process.stdout.write(`     → ${risk.level} ${risk.emoji} (~${tokens.toLocaleString()} tokens)\n`);
  }

  process.stdout.write(`  Tip: split by module/feature, not by file type\n`);
  process.stdout.write(`${LINE}\n\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
