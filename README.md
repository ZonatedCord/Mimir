# Mimir

> *In Norse mythology, Mimir guards the Well of Wisdom. Odin consulted Mimir before every major decision.*
>
> *This tool asks: have you consulted Mimir before running that task?*

**Mimir is a zero-dependency Claude Code preflight checker.**

Before you run an expensive task, Mimir estimates how many tokens it will consume and classifies the risk — so you can decide whether to split, reduce, or reschedule before hitting your usage limit mid-execution.

[![CI](https://github.com/ZonatedCord/Mimir/actions/workflows/test.yml/badge.svg)](https://github.com/ZonatedCord/Mimir/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org)
[![Zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

---

## The Problem

You write a long task. Claude Code starts working. Halfway through — context limit. The work is incomplete. You lost time, tokens, and progress.

There's no native warning in Claude Code that tells you: *"this task is too large for this session."*

Mimir fills that gap. Run `/mimir` before you run the task. Get a risk assessment in seconds. Decide before it's too late.

---

## Demo

**Basic estimate — Mimir auto-detects relevant files from your repo:**
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

**With explicit files + conversation history:**
```
/mimir "refactor authentication logic" --files src/auth.ts src/middleware.ts --turns 10
```

```
⚡ MIMIR PREFLIGHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Baseline
    System overhead:          ~3,000  (prompt + command + hooks)
    ~/.claude/CLAUDE.md:      ~1,432
    .claude/CLAUDE.md:          ~187
    Conversation (10 turns):  ~8,000  (~800 tok/turn)
  ─────────────────────────────────

  This task: "refactor authentication logic"
    Task tokens:              ~5      (exact)
    src/auth.ts:              ~4,100
    src/middleware.ts:        ~2,890
  ─────────────────────────────────
  Task tokens:                ~6,995
  Total context:              ~19,614

  Risk:                 LOW ✅
  Suggested model:      Sonnet 4.6 (complex task detected)
  Context headroom:     90%
  Action:               Proceed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

```
/split-task "analyze every TypeScript file in the repo and refactor all components to use the new API design, update all tests, and document every public function"
```

```
⚡ MIMIR SPLIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Suggested split:
  1. "analyze every TypeScript file in the repo"
     → LOW ✅ (~12 tokens)
  2. "refactor first batch of components to use the ..."
     → LOW ✅ (~9 tokens)
  3. "update remaining tests and document every publi..."
     → LOW ✅ (~10 tokens)
  Tip: split by module/feature, not by file type
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Install

```bash
rm -rf ~/.claude/mimir && \
git clone https://github.com/ZonatedCord/Mimir.git ~/.claude/mimir && \
mkdir -p ~/.claude/commands/ && \
cp -r ~/.claude/mimir/.claude/commands/* ~/.claude/commands/
```

**Requirements:** Node.js ≥ 18. No `npm install`. No config files. No API keys (Claude Code users already have `ANTHROPIC_API_KEY`).

### Update

```
/mimir-update
```

Or run the install command above — it's idempotent (`rm -rf` first).

### Verify

```bash
node ~/.claude/mimir/scripts/estimate.js "hello world"
```

Expected: preflight report with `LOW ✅` risk.

---

## Usage

### `/mimir`

Estimates token cost and risk level before running a task. Always run this before anything expensive.

```
/mimir "describe what you want Claude to do"
/mimir "task description" --files src/auth.ts src/middleware.ts
/mimir "task description" --git-diff
/mimir "task description" --turns N
/mimir "task description" --no-auto
/mimir "task description" --files src/auth.ts --turns 5 --git-diff
```

**Quote the task text, flags go outside the quotes.**

Every estimate always includes: system overhead + all CLAUDE.md files in your project hierarchy. Task-specific sources (files, diff, history) are added on top.

#### Auto file detection

By default, Mimir scans your repo for files relevant to the task description and includes them automatically. It extracts keywords from your task text, walks your repo (skipping `node_modules`, `.git`, `dist`, etc.), scores files by path relevance, and shows the top matches.

```
/mimir "update authentication middleware"
```
→ Mimir finds `src/auth.ts`, `src/middleware/auth.ts` automatically — no `--files` needed.

Use `--no-auto` to skip auto-detection and show only the task text tokens:
```
/mimir "update authentication middleware" --no-auto
```

Use `--files` to specify exactly which files to include (suppresses auto-detection):
```
/mimir "update authentication middleware" --files src/auth.ts src/middleware.ts
```

#### Flags

| Flag | Description |
|------|-------------|
| `--files f1 f2 ...` | Include specific files. Suppresses auto-detection. |
| `--git-diff` | Include current `git diff --staged` (falls back to `git diff HEAD`). |
| `--turns N` | Count N past conversation turns at ~800 tokens/turn. Use mid-session. |
| `--no-auto` | Skip auto file detection. Shows bare task + baseline only. |

#### Examples

```
/mimir "fix the typo in the login error message"
```
→ `LOW ✅` — safe to proceed.

```
/mimir "refactor the authentication module to use JWT" --turns 15
```
→ `MEDIUM ⚠️` — mid-session with existing context, proceed with caution.

```
/mimir "analyze the entire codebase and produce a full architecture report"
```
→ `HIGH 🔴` — auto-split breakdown shown below the estimate.

```
/mimir "read every file in the monorepo, refactor all services, update all tests, and generate full documentation"
```
→ `CRITICAL 🚨` — split this task first, then run sub-tasks one at a time.

---

### `/split-task`

Suggests how to break a large task into smaller, safer sub-tasks.

```
/split-task "<describe the task you want to split>"
/split-task "<task>" --files path/to/file1.ts path/to/file2.ts
```

---

### `/mimir-diff`

Estimates token cost of the current `git diff --staged` (or `git diff HEAD` as fallback) plus an optional task description. Useful before committing a large change.

```
/mimir-diff
/mimir-diff "refactor auth module"
```

You can also pass `--git-diff` to `/mimir` directly:

```
/mimir "refactor auth module" --git-diff
```

---

### `/mimir-history`

Shows your last 10 estimate runs. Mimir logs every estimate to `~/.mimir-history.json`.

```
/mimir-history
/mimir-history 20
```

---

### `/mimir-config`

Shows active configuration: context window, risk thresholds, default model, and config source (`.mimir.json` or built-in defaults).

```
/mimir-config
```

```
⚡ MIMIR CONFIG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Source:           defaults (no .mimir.json found)
  Context window:   200,000 tokens
  System overhead:  3,000 tokens
  Thresholds:       LOW <20k · MEDIUM <60k · HIGH <120k · CRITICAL ≥120k
  Default model:    (none — use risk-based suggestion)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### `/mimir-help`

Shows all available commands and the recommended workflow.

```
/mimir-help
```

---

### `/mimir-update`

Updates Mimir to the latest version. Idempotent — safe to run anytime.

```
/mimir-update
```

With `--files`, each suggested sub-task includes the file token cost in its risk estimate.

Each suggested sub-task is shown with its estimated token cost and risk level, so you can run them one at a time.

**Example:**

```
/split-task "analyze all services and then refactor the payment module and update all related tests"
```

```
⚡ MIMIR SPLIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Suggested split:
  1. "analyze all services"
     → LOW ✅ (~5 tokens)
  2. "refactor the payment module"
     → LOW ✅ (~6 tokens)
  3. "update all related tests"
     → LOW ✅ (~5 tokens)
  Tip: split by module/feature, not by file type
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## How it works

### Token counting

Mimir uses two methods, in order of preference:

**1. Anthropic count_tokens API (default)**

When `ANTHROPIC_API_KEY` is set (which it always is in Claude Code), Mimir calls the Anthropic `count_tokens` endpoint. This returns an **exact token count** and costs **zero credits** — it's a free utility endpoint.

**2. Content-aware heuristic (fallback)**

If no API key is present or the request fails, Mimir falls back to a local heuristic that classifies the text by content type and applies different characters-per-token ratios:

| Content type | Chars per token | Examples |
|-------------|----------------|---------|
| `code` | 3.5 | JavaScript, Python, TypeScript |
| `json` | 3.0 | API responses, config files |
| `prose` | 4.2 | Natural language descriptions |
| `mixed` | 3.8 | Markdown with code blocks |

Accuracy: **±15%**. Sufficient for risk classification.

### Risk classification

Risk levels are calculated against the **Sonnet 4.6 context window (200,000 tokens)**:

| Level | Total tokens | Emoji | Action | Suggested model |
|-------|-------------|-------|--------|----------------|
| LOW | < 20,000 | ✅ | Proceed | Haiku 4.5 (simple) or Sonnet 4.6 (complex) |
| MEDIUM | 20,000–60,000 | ⚠️ | Proceed with caution | Sonnet 4.6 |
| HIGH | 60,000–120,000 | 🔴 | Split recommended — auto-split shown | Sonnet 4.6 or Opus 4.7 |
| CRITICAL | > 120,000 | 🚨 | Split required — auto-split shown | Opus 4.7 or split first |

These thresholds assume a **2–3× output multiplier** — a task that reads 20k tokens of input will typically generate 40–60k tokens of total context by the time it completes.

### Task splitting

`/split-task` uses a pure heuristic (zero API calls) to identify natural split points in a task description:

1. **Explicit conjunctions** — splits on "and then", "then", "and also"
2. **Multiple action verbs** — splits on verbs like analyze, refactor, test, document
3. **Broad scope keywords** — splits "all"/"every"/"entire" tasks into phases
4. **Fallback** — research phase + implementation phase

---

## Architecture

```
mimir/
├── .claude/
│   └── commands/
│       ├── mimir.md     # /mimir slash command
│       ├── split-task.md        # /split-task slash command
│       ├── mimir-config.md      # /mimir-config slash command
│       ├── mimir-diff.md        # /mimir-diff slash command
│       ├── mimir-help.md        # /mimir-help slash command
│       ├── mimir-history.md     # /mimir-history slash command
│       └── mimir-update.md      # /mimir-update slash command
├── hooks/
│   └── pre-task.sh              # optional UserPromptSubmit hook
├── scripts/
│   ├── estimate.js              # entry point: reads argv, calls lib, prints output
│   ├── split.js                 # entry point: reads argv, detects split points, prints output
│   ├── config-show.js           # entry point: prints active config
│   ├── history-show.js          # entry point: prints recent estimate history
│   └── lib/
│       ├── tokenizer.js         # token counting: API path + heuristic fallback
│       ├── risk.js              # risk thresholds + classification + Opus/Sonnet/Haiku model hints
│       ├── config.js            # .mimir.json loader + validation
│       ├── context.js           # CLAUDE.md scanner + system overhead + conversation turns
│       └── history.js           # append/load ~/.mimir-history.json
├── tests/
│   ├── risk.test.js
│   ├── risk-smart-model.test.js
│   ├── tokenizer.test.js
│   ├── config.test.js
│   ├── context.test.js
│   ├── estimate.test.js
│   ├── split.test.js
│   ├── config-show.test.js
│   ├── history.test.js
│   └── run-all.js
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-23-mimir-design.md
└── package.json
```

Each component has a single responsibility. The library modules (`lib/`) are pure functions with no side effects. The entry points (`estimate.js`, `split.js`) only read input and write output. The slash command files only invoke scripts.

### Data flow

```
user types /mimir "task description" [--files ...] [--git-diff] [--turns N]
    → Claude Code reads .claude/commands/mimir.md
        → runs: node ~/.claude/mimir/scripts/estimate.js "task description" [flags]
            → tokenizer.js: count_tokens API → fallback to heuristic (task text)
            → context.js:   scan CLAUDE.md files + system overhead + turns
            → risk.js:      classify total by threshold → Haiku/Sonnet/Opus hint
            → print labeled breakdown per source → total → risk → action
            → if HIGH or CRITICAL: auto-run split.js and append breakdown
```

---

## Design principles

1. **Mimir must cost less than 1% of the task it checks** — the checker cannot be more expensive than the thing it checks.
2. **Zero required dependencies** — `node script.js` works out of the box. No npm install, no package lock drama.
3. **Output is proportional** — simple tasks show a compact breakdown. Complex estimates (HIGH/CRITICAL) auto-append the split suggestions. Never more than needed.
4. **Heuristics are always disclosed** — the output explicitly says `(heuristic)` or `(exact)`. No silent approximations.
5. **Commands are slash-first, not CLI-first** — the UX is built for Claude Code, not terminal power users.
6. **Logic lives in scripts, not in markdown** — the `.md` command files are thin wrappers. All logic is in testable `.js` files.
7. **Install = copy 2 folders** — no installers, no package managers, no config wizards.
8. **Mimir advises, never blocks** — warnings are information. The user decides what to do.

---

## Limitations

### What Mimir estimates

Every `/mimir` run counts all **measurable token sources** and shows them labeled in the output:

| Source | How measured | Flag |
|--------|-------------|------|
| Task description | Anthropic API (exact) or heuristic | always |
| System overhead | Configurable constant (~3k) | always |
| `~/.claude/CLAUDE.md` | File read + heuristic | always |
| `.claude/CLAUDE.md` (project + parents) | File read + heuristic | always |
| Specific files | Heuristic | `--files` |
| Git diff | Heuristic | `--git-diff` |
| Conversation history | ~800 tok × N turns | `--turns N` |

**What cannot be measured:**

- **Claude's responses** — how much Claude writes back is unpredictable. Assume 2–3× of input tokens for total context by end of task.
- **Tool call overhead** — each file read, bash run, edit adds tokens Mimir cannot see in advance.
- **Conversation history without `--turns`** — if you don't pass `--turns`, prior messages aren't counted. Use `--turns N` when running mid-session.

**Practical guide:**

| Task type | Best flags |
|-----------|-----------|
| Fresh session, simple task | `/mimir "task"` |
| Task reads specific files | `--files src/foo.ts src/bar.ts` |
| Mid-session (50+ messages in) | `--turns 25` |
| Pre-commit estimate | `--git-diff` |
| Large codebase refactor | `--files` + `--turns` |

### Other limitations

- `/split-task` uses pattern matching, not AI reasoning. Suggestions are starting points, not guaranteed optimal splits.
- No memory of previous tasks — each invocation is stateless.

---

## Run tests

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

### V1 — Complete
- `/mimir` with Anthropic API + heuristic fallback
- `/split-task` with heuristic pattern matching
- Zero-dependency install
- MIT license

### V2 — Complete
- `--files` flag: include actual file content in token estimate
- Multi-model support: Opus 4.7, Haiku 4.5, Sonnet 4.6 recommendations
- MODELS export for downstream tooling

### V3 — Complete
- `.mimir.json` per-project config (custom thresholds, context window, default model)
- `--files` flag in both `/mimir` and `/split-task`

### V4 — Complete
- Superpowers plugin wrapper for one-command install
- GitHub Actions CI matrix (Node 18/20/22)
- Schema validation for `.mimir.json`

### V5 — Complete
- `/mimir-help` command
- `/mimir-update` command (idempotent reinstall)
- `/mimir-config` command
- Fixed install commands (correct URL, `rm -rf` + `mkdir -p`)
- Fixed prompt-passthrough bug in slash commands
- Improved split heuristics (numbered lists, file path detection)

### V6 — Complete
- `--git-diff` flag: includes current git diff tokens in estimate
- `/mimir-diff` command: instant git diff preflight
- `/mimir-history` command: shows recent estimate history (~/.mimir-history.json)
- Smart model recommendation: keyword-aware (complex tasks → Sonnet, simple → Haiku)
- Pre-task hook integration with Claude Code (see below)

### V7 — Complete
- Renamed `/estimate-task` → `/mimir` for naming coherence
- Opus 4.7 in model suggestions: HIGH → Sonnet/Opus, CRITICAL → Opus 4.7
- Auto-split: HIGH/CRITICAL risk automatically appends `/split-task` breakdown
- Empty `/mimir` shows help instead of erroring

### V8 — Complete
- Full context overhead in every estimate: system prompt, CLAUDE.md files, conversation turns
- `--turns N` flag: count N conversation turns at ~800 tokens/turn
- CLAUDE.md auto-scan: reads `~/.claude/CLAUDE.md` + project + parent directories
- `systemOverhead` key in `.mimir.json` (default: 3,000 tokens)
- Labeled per-source breakdown in output — every token source identified
- New `scripts/lib/context.js` module

### V9 — Current
- Auto file detection: keyword extraction from task → repo walk → relevance scoring → top 10 files included automatically
- Two-section output layout: Baseline (overhead) vs This task (file tokens + diff + task text)
- `--no-auto` flag: skip auto-detection entirely
- `--files` suppresses auto-detection (explicit beats implicit)
- Fixed `$ARGUMENTS` quoting bug in slash command files (flags now parsed correctly)
- History pollution fix: `MIMIR_NO_HISTORY=1` env var skips test runs

### V10 — Planned
- Export history to CSV (`/mimir-history --csv`)
- Smarter system overhead: auto-detect and count hook files directly

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

The hook runs `estimate.js` on your prompt and prints the preflight report as a notification — before Claude starts working. Short prompts (< 100 tokens) are skipped automatically.

---

## Contributing

Mimir is intentionally minimal. Before adding a feature, ask: does this violate any of the [8 design principles](#design-principles)?

Good contributions:
- Improved heuristics (better content detection, more accurate ratios)
- More split patterns for `/split-task`
- Better system overhead detection (auto-read hook files)
- Bug fixes

Not in scope for V1:
- GUI or web interface
- Automatic task execution
- Analytics or telemetry
- MCP server mode

To contribute: fork, branch, `npm test`, PR.

---

## Built with

Mimir was designed and built in a single session using **[Claude Code](https://claude.ai/code)** — Anthropic's AI coding agent.

The entire development process — brainstorming, architecture decisions, TDD implementation, code review, and this README — was executed through a structured multi-agent workflow using the [Superpowers plugin](https://github.com/anthropics/claude-code-superpowers) for Claude Code.

Mimir is itself a product of the problem it solves: running large AI-assisted development sessions without hitting context limits.

> *Built by AI, to help you work better with AI.*

---

## License

MIT © 2026 [Marco Barlera](https://github.com/marcobarlera)
