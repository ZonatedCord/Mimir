---
name: estimate-task
description: Estimate token cost and risk of a Claude Code task before running it. Use BEFORE starting any significant task to avoid hitting context limits mid-execution.
argument-hint: "<task description> [--files file1 file2 ...]"
allowed-tools: [Bash]
---

Run the Mimir preflight check and display the output:

```bash
node ~/.claude/mimir/scripts/estimate.js "$ARGUMENTS"
```

## Examples

```
/estimate-task refactor all authentication middleware
/estimate-task add dark mode support --files src/theme.ts src/components/Button.tsx
```
