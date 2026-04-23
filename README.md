# Mimir

Claude Code preflight checker. Estimates token cost and risk before running expensive tasks.

## Install

```bash
git clone https://github.com/marcobarlera/mimir ~/.claude/mimir
cp -r ~/.claude/mimir/.claude/commands/* ~/.claude/commands/
```

Requires: Node.js ≥ 18. No `npm install`.

## Usage

```
/estimate-task "analyze and refactor all TypeScript files in the repo"
/split-task "analyze and refactor all TypeScript files in the repo"
```

## How token counting works

| Condition | Method | Accuracy |
|-----------|--------|----------|
| `ANTHROPIC_API_KEY` set | Anthropic count_tokens API | Exact (free) |
| No API key | Content-aware heuristic | ±15% |

Claude Code users already have `ANTHROPIC_API_KEY` set — no extra config needed.

## Risk levels

| Level | Input tokens | Action |
|-------|-------------|--------|
| LOW | < 20k | Proceed |
| MEDIUM | 20k–60k | Proceed with caution |
| HIGH | 60k–120k | Consider split |
| CRITICAL | > 120k | Split required |

Baseline: Sonnet 4.6 context window (200k tokens).

## Example output

```
⚡ MIMIR PREFLIGHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Input tokens (exact):  14,203
  Risk:                 MEDIUM ⚠️
  Suggested model:      Sonnet 4.6
  Context headroom:     93%
  Action:               Proceed with caution — limit files read
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Limitations

- Estimates task description tokens, not full execution context
- `/split-task` uses heuristics — suggestions are starting points, not guarantees
- Model recommendations fixed to Sonnet 4.6 / Haiku 4.5 in V1

## Run tests

```bash
npm test
```

## License

MIT
