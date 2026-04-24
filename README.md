# Mimir

> *In Norse mythology, Mimir guards the Well of Wisdom. Odin consulted Mimir before every major decision.*

**Zero-dependency Claude Code preflight checker.** Estimates token cost and risk level before you run a task — so you know whether to proceed, split, or reschedule before hitting your context limit mid-execution.

[![CI](https://github.com/ZonatedCord/Mimir/actions/workflows/test.yml/badge.svg)](https://github.com/ZonatedCord/Mimir/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org)
[![Zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

---

## The Problem

You write a long task. Claude Code starts working. Halfway through — context limit. The work is incomplete. You lost time, tokens, and progress.

There's no native warning in Claude Code that tells you: *"this task is too large for this session."*

Mimir fills that gap. Run `/mimir` before the task. Get a risk assessment in seconds. Decide before it's too late.

---

## Install

```bash
rm -rf ~/.claude/mimir && \
git clone https://github.com/ZonatedCord/Mimir.git ~/.claude/mimir && \
mkdir -p ~/.claude/commands/ && \
cp -r ~/.claude/mimir/.claude/commands/* ~/.claude/commands/
```

**Requirements:** Node.js ≥ 18. No `npm install`. No API keys needed beyond what Claude Code already provides.

**Update:**

```
/mimir-update
```

**Verify:**

```bash
node ~/.claude/mimir/scripts/estimate.js "hello world"
```

---

## Quick start

```
/mimir "refactor authentication logic"
```

```
⚡ MIMIR PREFLIGHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Baseline
    System overhead:          ~3,000  (prompt + command + hooks)
    ~/.claude/CLAUDE.md:      ~1,432
    .claude/CLAUDE.md:          ~187
  ─────────────────────────────────

  This task: "refactor authentication logic"
    Task tokens:              ~5      (exact)
    src/auth.ts:              ~4,100  (auto)
    src/middleware/auth.ts:   ~1,890  (auto)
  ─────────────────────────────────
  Task tokens:                ~5,995
  Total context:              ~10,614

  Risk:                 LOW ✅
  Suggested model:      Sonnet 4.6 (complex task detected)
  Context headroom:     95%
  Action:               Proceed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Mimir auto-detected `src/auth.ts` and `src/middleware/auth.ts` from your repo — no `--files` needed.

---

## Commands

| Command | Description |
|---------|-------------|
| `/mimir "task"` | Estimate token cost + risk before running |
| `/mimir "task" --files f1 f2` | Include specific files (suppresses auto-detect) |
| `/mimir "task" --git-diff` | Include current git diff |
| `/mimir "task" --turns N` | Include N past conversation turns (~800 tok each) |
| `/mimir "task" --no-auto` | Skip auto file detection |
| `/split-task "task"` | Split a large task into safer sub-tasks |
| `/mimir-diff` | Estimate token cost of current git diff |
| `/mimir-history` | Show recent estimate history |
| `/mimir-config` | Show active configuration |
| `/mimir-help` | Show this command list |
| `/mimir-update` | Update to latest version |

**Quote the task text. Flags go outside the quotes.**

---

## What Mimir measures

Every run always includes the baseline sources. Task-specific sources are added per flag.

| Source | Measured | When |
|--------|----------|------|
| System overhead | Configurable constant (~3k) | always |
| `~/.claude/CLAUDE.md` | File read + heuristic | always |
| `.claude/CLAUDE.md` (project + parents) | File read + heuristic | always |
| Task description | Anthropic API (exact) or heuristic | always |
| Auto-detected files | File read + heuristic | unless `--no-auto` or `--files` |
| Specific files | File read + heuristic | `--files` |
| Git diff | Heuristic | `--git-diff` |
| Conversation history | ~800 tok × N turns | `--turns N` |

**What cannot be measured:**

- **Claude's responses** — unpredictable. Assume 2–3× of input tokens for total context by end of task.
- **Tool call overhead** — each file read, bash run, edit adds tokens Mimir can't see in advance.

**Practical guide:**

| Scenario | Flags to add |
|----------|-------------|
| Fresh session, simple task | *(none)* |
| Task reads known files | `--files src/foo.ts src/bar.ts` |
| Mid-session (many messages in) | `--turns 20` |
| Pre-commit review | `--git-diff` |
| Large refactor, deep context | `--files` + `--turns` |

---

## Auto file detection

By default, Mimir scans your repo and includes relevant files automatically. It extracts keywords from your task, walks the repo (skipping `node_modules`, `.git`, `dist`, etc.), scores files by path match, and includes the top 10.

```
/mimir "update authentication middleware"
```
→ auto-finds `src/auth.ts`, `src/middleware/auth.ts`

Suppress with `--no-auto` (bare task tokens only) or `--files` (explicit list, replaces auto).

---

## Risk levels

Thresholds are against the **Sonnet 4.6 context window (200,000 tokens)**:

| Level | Total tokens | Action | Suggested model |
|-------|-------------|--------|----------------|
| LOW ✅ | < 20,000 | Proceed | Haiku 4.5 (simple) / Sonnet 4.6 (complex) |
| MEDIUM ⚠️ | 20k–60k | Proceed with caution | Sonnet 4.6 |
| HIGH 🔴 | 60k–120k | Split recommended — auto-split shown | Sonnet 4.6 or Opus 4.7 |
| CRITICAL 🚨 | > 120k | Split required — auto-split shown | Opus 4.7 or split first |

HIGH and CRITICAL automatically append a `/split-task` breakdown.

---

## Configuration

Create `.mimir.json` in your project root to override defaults:

```json
{
  "contextWindow": 200000,
  "systemOverhead": 3000,
  "thresholds": { "low": 20000, "medium": 60000, "high": 120000 },
  "defaultModel": "claude-sonnet-4-6"
}
```

Run `/mimir-config` to see active values.

---

## Pre-task hook (optional)

Run Mimir automatically before every Claude Code prompt. Add to `~/.claude/settings.json`:

```json
"hooks": {
  "UserPromptSubmit": [
    {
      "matcher": "",
      "hooks": [{ "type": "command", "command": "bash ~/.claude/mimir/hooks/pre-task.sh" }]
    }
  ]
}
```

Short prompts (< 100 tokens) are skipped automatically.

---

## How it works

### Token counting

Two methods, in order:

**1. Anthropic count_tokens API** — exact count, zero credits. Used when `ANTHROPIC_API_KEY` is set (always in Claude Code).

**2. Content-aware heuristic** — fallback when API is unavailable. Classifies text and applies chars-per-token ratios:

| Content type | Chars/token | Examples |
|-------------|-------------|---------|
| `code` | 3.5 | JS, Python, TypeScript |
| `json` | 3.0 | configs, API responses |
| `prose` | 4.2 | natural language |
| `mixed` | 3.8 | markdown with code |

Accuracy: **±15%**. Sufficient for risk classification. Output shows `(exact)` or `(heuristic)` — no silent approximations.

### Task splitting

`/split-task` identifies natural split points using pure heuristics (zero API calls):

1. Explicit conjunctions: "and then", "then", "and also"
2. Multiple action verbs: analyze, refactor, test, document
3. Broad scope: "all"/"every"/"entire" → split into phases
4. Fallback: research phase + implementation phase

### Data flow

```
/mimir "task" [flags]
  → mimir.md command file
    → node scripts/estimate.js "task" [flags]
        → tokenizer.js  — count_tokens API → heuristic fallback
        → context.js    — CLAUDE.md scan + system overhead + turns + auto file detect
        → risk.js       — classify total → model hint
        → print Baseline + This task + totals + risk
        → if HIGH/CRITICAL: run split.js, append breakdown
```

---

## Tests

```bash
npm test
```

```
✅ risk.test.js passed
✅ tokenizer.test.js passed
✅ config.test.js passed
✅ estimate.test.js passed
✅ split.test.js passed
✅ config-show.test.js passed
✅ history.test.js passed
✅ risk-smart-model.test.js passed
✅ context.test.js passed

✅ All tests passed
```

Zero external dependencies. Tests use Node.js built-in `assert` and `child_process`.

---

## Roadmap

**V9 — Current**
- Auto file detection (keyword → repo walk → relevance scoring)
- Two-section output: Baseline vs This task
- `--no-auto` flag; `--files` suppresses auto-detect
- Fixed `$ARGUMENTS` quoting in command files

**V10 — Current**
- `/mimir-history --csv` export (pipe into spreadsheets, scripts, dashboards)
- `MIMIR_HISTORY_FILE` env var for test isolation and custom history paths

**V11 — Planned**
- Hook file auto-detection (read actual `.sh` hook files for overhead instead of flat constant)
- Codex CLI compatibility: command file port, tool name mapping, install path adaptation

---

## Contributing

Before adding a feature, ask: does this violate any of the [design principles](#design-principles)?

**Design principles:**

1. Mimir must cost less than 1% of the task it checks
2. Zero required dependencies — `node script.js` works out of the box
3. Output is proportional — compact for simple tasks, expanded for HIGH/CRITICAL
4. Heuristics are always disclosed — `(exact)` or `(heuristic)`, never silent
5. Commands are slash-first, not CLI-first
6. Logic lives in scripts, not in markdown
7. Install = copy 2 folders
8. Mimir advises, never blocks

Good contributions: improved heuristics, more split patterns, better overhead detection, bug fixes.

To contribute: fork, branch, `npm test`, PR.

---

## Built with

Designed and built using **[Claude Code](https://claude.ai/code)** — Anthropic's AI coding agent — through a structured multi-agent workflow using the [Superpowers plugin](https://github.com/anthropics/claude-code-superpowers).

> *Built by AI, to help you work better with AI.*

---

## License

MIT © 2026 [Marco Barlera](https://github.com/marcobarlera)
