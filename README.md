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

**Basic estimate:**
```
/mimir "analyze every TypeScript file in the repo and refactor all components to use the new API design, update all tests, and document every public function"
```

```
⚡ MIMIR PREFLIGHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Input tokens (exact):  18,432
  Risk:                 MEDIUM ⚠️
  Suggested model:      Sonnet 4.6
  Context headroom:     91%
  Action:               Proceed with caution — limit files read
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**With real files:**
```
/mimir "refactor authentication logic" --files src/auth.ts src/middleware.ts src/utils.ts
```

```
⚡ MIMIR PREFLIGHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Task tokens (exact):   47
  Files tokens:          ~8,203
    auth.ts              ~4,100
    middleware.ts        ~2,890
    utils.ts             ~1,213
  Total tokens:          ~8,250
  Risk:                 LOW ✅
  Suggested model:      Any — Haiku 4.5 (cost) or Sonnet 4.6 (quality)
  Context headroom:     96%
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

Estimates the token cost and risk level of a task before running it.

```
/mimir "<describe what you want Claude to do>"
/mimir "<task description>" --files path/to/file1.ts path/to/file2.ts
/mimir "<task description>" --git-diff
/mimir "<task description>" --turns N
```

Every estimate includes **all measurable token sources** — not just the task text. See [What Mimir estimates](#what-mimir-estimates).

**Examples:**

```
/mimir "fix the typo in the login error message"
```
→ `LOW ✅` — safe to proceed.

```
/mimir "refactor the authentication module to use JWT"
```
→ `MEDIUM ⚠️` — proceed with caution, monitor file reads.

```
/mimir "analyze the entire codebase and produce a full architecture report"
```
→ `HIGH 🔴` — consider splitting into smaller tasks.

```
/mimir "read every file in the monorepo, refactor all services, update all tests, and generate full documentation"
```
→ `CRITICAL 🚨` — split this task before running.

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

| Level | Input tokens | Emoji | Action | Suggested model |
|-------|-------------|-------|--------|----------------|
| LOW | < 20,000 | ✅ | Proceed | Sonnet 4.6 |
| MEDIUM | 20,000–60,000 | ⚠️ | Proceed with caution | Sonnet 4.6 |
| HIGH | 60,000–120,000 | 🔴 | Consider splitting | Haiku 4.5 or Sonnet 4.6 |
| CRITICAL | > 120,000 | 🚨 | Split required | Haiku 4.5 |

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
│       ├── risk.js              # risk thresholds + classification + smart model
│       ├── config.js            # .mimir.json loader + validation
│       └── history.js           # append/load ~/.mimir-history.json
├── tests/
│   ├── risk.test.js
│   ├── tokenizer.test.js
│   ├── estimate.test.js
│   ├── split.test.js
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
user types /mimir "task description"
    → Claude Code reads .claude/commands/mimir.md
        → runs: node ~/.claude/mimir/scripts/estimate.js "task description"
            → tokenizer.js: try count_tokens API → fallback to heuristic
            → risk.js: classify by threshold
            → print 5-line report to stdout
```

---

## Design principles

1. **Mimir must cost less than 1% of the task it checks** — the checker cannot be more expensive than the thing it checks.
2. **Zero required dependencies** — `node script.js` works out of the box. No npm install, no package lock drama.
3. **Output ≤ 5 lines** — a preflight check that produces a long report defeats the purpose.
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
✅ estimate.test.js passed
✅ split.test.js passed

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

### V6 — Current
- `--git-diff` flag: includes current git diff tokens in estimate
- `/mimir-diff` command: instant git diff preflight
- `/mimir-history` command: shows recent estimate history (~/.mimir-history.json)
- Smart model recommendation: keyword-aware (complex tasks → Sonnet, simple → Haiku)
- Pre-task hook integration with Claude Code (see below)

### V7 — Planned
- Opus 4.7 thresholds and context window support
- Auto-split: run `/split-task` automatically when estimate exceeds threshold
- Export history to CSV

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
- Additional model support (Opus 4.7, Haiku 4.5 thresholds)
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
