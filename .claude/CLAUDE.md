# Mimir

Zero-dependency Claude Code preflight checker. Node.js ≥ 18, no npm install.

## Rules

- No external dependencies. Ever.
- Tests first. Run: `npm test` or `node tests/run-all.js`
- No comments unless the WHY is non-obvious
- Entry points (`scripts/*.js`) only parse input + call lib + print output
- Logic lives in `scripts/lib/` — pure functions, no side effects

## After editing scripts

Sync to installed location:
```bash
cp -r scripts/* ~/.claude/mimir/scripts/
cp .claude/commands/* ~/.claude/commands/
```

## Structure

```
scripts/lib/     → tokenizer, risk, config, context, history
scripts/         → estimate.js, split.js, config-show.js, history-show.js
.claude/commands/→ slash command definitions
tests/           → one test file per script/lib module
```
