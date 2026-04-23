# Mimir — Design Spec
**Date:** 2026-04-23  
**Status:** Approved  
**Author:** marcobarlera

---

## Problem

Claude Code tasks that are too long or too expensive get cut off mid-execution when the usage limit is hit. There's no native warning before starting. Users need a lightweight preflight check to assess risk and decide whether to split, reduce, or reschedule a task.

## Positioning

> Mimir is a zero-dependency Claude Code preflight checker that estimates token cost and risk level before you run expensive tasks.

## Name Rationale

**Mimir** — Norse god of wisdom and foresight. Odin consulted Mimir before making major decisions. Fitting for a tool that advises before acting. Preferred over Prometheus (which implies creation, not caution).

---

## Architecture

### Components

```
mimir/
├── .claude/
│   └── commands/
│       ├── estimate-task.md     # /estimate-task slash command
│       └── split-task.md        # /split-task slash command
├── scripts/
│   ├── estimate.js              # main estimation engine
│   ├── split.js                 # task splitting logic
│   └── lib/
│       ├── tokenizer.js         # API count + heuristic fallback
│       └── risk.js              # risk classification + thresholds
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-23-mimir-design.md
├── context.md                   # session notes (gitignored)
├── .gitignore
├── LICENSE                      # MIT
└── README.md
```

### Data Flow

```
[user runs /estimate-task "...task description..."]
    → estimate-task.md invokes: node scripts/estimate.js "<task>"
        → tokenizer.js: try Anthropic count_tokens API (free, exact)
            → success: exact count
            → fail/no key: content-aware heuristic
                code:  chars / 3.5
                prose: chars / 4.2
                json:  chars / 3.0
                mixed: weighted average
        → risk.js: classify by thresholds
        → print 5-line output to stdout
```

### Risk Thresholds

Based on Sonnet 4.6 context window (200k tokens):

| Level    | Input tokens | Action            |
|----------|-------------|-------------------|
| LOW      | < 20k       | Proceed           |
| MEDIUM   | 20k–60k     | Proceed with care |
| HIGH     | 60k–120k    | Consider split    |
| CRITICAL | > 120k      | Split required    |

These thresholds account for output generation overhead (~2–3x input for complex tasks).

---

## Commands

### `/estimate-task`

**Input:** natural language task description (string)  
**Output:** 5-line preflight report  
**Cost:** zero tokens (API count endpoint is free; heuristic uses no API)

```
⚡ MIMIR PREFLIGHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Input tokens (est.):  ~14,200
  Risk:                 MEDIUM ⚠️
  Suggested model:      Sonnet 4.6 (Haiku if HIGH/CRITICAL)
  Context headroom:     86%
  Action:               Proceed with caution — limit files read
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### `/split-task`

**Input:** natural language task description (string)  
**Output:** 3–5 sub-task suggestions with estimated risk per sub-task  
**Strategy:** splits by module/feature, not by file type

```
⚡ MIMIR SPLIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Task too broad. Suggested split:
  1. "list TS files + count lines"        → LOW
  2. "refactor src/auth/*.ts"             → LOW
  3. "refactor src/api/*.ts"              → MEDIUM
  Tip: split by module, not by file type
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Installation

```bash
git clone https://github.com/<user>/mimir ~/.claude/mimir
cp -r ~/.claude/mimir/.claude/commands/* ~/.claude/commands/
```

No `npm install`. No config. Works immediately.

Optional (for exact token counts):
```bash
# ANTHROPIC_API_KEY already set for Claude Code users — no extra step
```

---

## Token Cost of Mimir Itself

- `/estimate-task` with heuristic: **0 tokens** (pure local computation)
- `/estimate-task` with API count: **0 tokens** (count_tokens endpoint is free)
- `/split-task`: **0 tokens** (V1: pure heuristic logic, no API call)

Design principle: the preflight check must never cost more than ~1% of the task it's checking.

---

## Out of Scope (V1)

- GUI or web interface
- Integration with CI/CD
- Automatic task execution after approval
- Token usage history / analytics
- MCP server mode
- Superpowers plugin format (V2)

---

## Roadmap

### V1 — MVP (this spec)
- `/estimate-task` with heuristic + API fallback
- `/split-task` with static suggestions
- Zero-deps install
- MIT license

### V2 — Smarter splitting
- `/split-task` uses Claude to generate split (with token budget cap)
- Superpowers plugin wrapper
- `.mimir.json` config file for custom thresholds
- Support for reading actual files from disk (opt-in)

### V3 — Context awareness
- Reads `git diff` to estimate upcoming task size
- Integrates with Claude Code hooks (pre-task warning)
- Token usage history stored locally
- Model recommendation engine

---

## Risks & Limitations

| Risk | Mitigation |
|------|-----------|
| Heuristic inaccuracy (±15%) | Explicit in output; API path gives exact counts |
| count_tokens API changes | Thin wrapper; easy to update |
| Split suggestions may be wrong | Presented as suggestions, not commands |
| Context window varies by model | Thresholds configurable in V2; hardcoded in V1 (Sonnet 4.6) |
| Users ignore warnings | Out of scope; Mimir advises, doesn't block |

---

## Design Principles

1. Mimir must cost < 1% of the task it checks
2. Zero required dependencies for V1
3. Output ≤ 5 lines — no verbose reports
4. Heuristics are explicit estimates, never presented as exact
5. Commands are slash-first, not CLI-first
6. Script logic lives in `.js` files, not in markdown
7. Install = copy 2 folders, no config
8. English repo, MIT license, context.md gitignored
