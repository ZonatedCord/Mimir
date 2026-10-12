# Agensi.io Listing: Mimir (free)

## Title

Mimir: Claude Code Preflight Checker

## Tagline (max 100 chars)

Estimate token cost and context risk before you run a Claude Code task. Zero dependencies.

## Short description (max 300 chars)

Mimir estimates token usage, context-window risk and dollar cost of a Claude Code task before you start it, then tells you whether to proceed or split. Includes /split-task to break large jobs into safer sub-tasks. Pure Node.js (>= 18), no npm install, no dependencies.

## Long description

Claude Code has no native warning that says "this task is too large for this session". You find out halfway through, when the context limit hits and the work is incomplete. Mimir fills that gap. Run it before the task, get a risk assessment in seconds, and decide before it is too late.

Unlike `/usage` and `/cost`, which report what a session already spent, Mimir is predictive: it looks at a task that has not run yet.

### Features

- **Token and risk estimate**: `/mimir "task"` prints a Baseline section (system overhead, hook scripts, `~/.claude/CLAUDE.md`, project `.claude/CLAUDE.md`) and a This task section, with total context, risk level, suggested model, context headroom and recommended action.
- **Four risk levels**: LOW, MEDIUM, HIGH, CRITICAL, measured against a 200,000-token context window (thresholds configurable).
- **Auto file detection**: extracts keywords from your task, walks the repo (skipping `node_modules`, `.git`, `dist`, etc.), scores files by path match and includes the top 10. Disable with `--no-auto`, or pass `--files` for an explicit list.
- **Git diff estimate**: `--git-diff` includes the current diff; `/mimir-diff` estimates the diff on its own.
- **Conversation history**: `--turns N` adds N past turns, auto-calibrated from your real transcript (fallback 800 tokens/turn).
- **Task splitting**: `/split-task` suggests sub-tasks using pure heuristics (conjunctions, multiple action verbs, broad scope). HIGH and CRITICAL results append a breakdown automatically.
- **Dollar cost estimate**: shown across four models (Claude Sonnet, Claude Haiku, Gemini Flash, GPT-4o), assuming output = 2x input tokens.
- **Honest accuracy**: output is labelled `(exact)` or `(heuristic)`. The heuristic fallback is about +/-15%, enough for risk classification.
- **History**: `/mimir-history`, with `--stats` (aggregates) and `--csv` (export).
- **Config**: optional `.mimir.json` for context window, overhead, thresholds and default model; `/mimir-config` shows the active values.
- **Machine-readable output**: `--output json`.
- **Optional pre-task hook**: run Mimir automatically before every prompt (short prompts are skipped).
- **Also ships for** Gemini CLI and Codex CLI.
- Mimir advises, it never blocks.

### Example

```
/mimir "refactor authentication logic"
```

```
MIMIR PREFLIGHT
  Baseline
    System overhead:          ~2,000
    ~/.claude/CLAUDE.md:      ~1,432
    .claude/CLAUDE.md:          ~187
  This task: "refactor authentication logic"
    Task tokens:              ~5      (exact)
    src/auth.ts:              ~4,100  (auto)
    src/middleware/auth.ts:   ~1,890  (auto)
  Total context:              ~10,614

  Risk:                 LOW
  Suggested model:      Sonnet 4.6 (complex task detected)
  Context headroom:     95%
  Action:               Proceed
```

Other invocations:

```
/mimir add dark mode support --files src/theme.ts src/components/Button.tsx
/mimir implement auth --git-diff
/mimir migrate database schema --turns 10
/split-task refactor entire authentication system
```

### Commands

`/mimir`, `/split-task`, `/mimir-diff`, `/mimir-history`, `/mimir-config`, `/mimir-help`.

### Requirements

- Node.js >= 18
- Mimir scripts installed at `~/.claude/mimir/` (install commands are in the repo README)
- No dependencies, no `npm install`, no API key required

## Tags

claude-code, preflight, token-estimation, context-window, cost-estimation, risk-assessment, task-splitting, productivity, developer-tools, zero-dependency

## Security & privacy

- **No data is sent to third parties.** Mimir has no telemetry and no analytics.
- **One optional network call**: if the `ANTHROPIC_API_KEY` environment variable is set, Mimir calls Anthropic's token-counting endpoint at `api.anthropic.com` to get an exact count of your task text. This request goes only to Anthropic. Without the key, Mimir uses a local heuristic and makes no network calls.
- **Writes one file**: `~/.mimir-history.json`, a local log of past estimates (used by `/mimir-history`).
- **Reads locally only**: `~/.claude/settings*.json` (and project `.claude/settings*.json`) to find hook scripts, and `CLAUDE.md` files, plus the files being estimated. Contents are tokenized locally.
- **Runs only `git diff`** with fixed arguments (`git diff --staged` and `git diff HEAD`), and only when you use `--git-diff` or `/mimir-diff`. For HIGH/CRITICAL results it also launches its own bundled `split.js` with Node (no shell).
- No dependencies, so no third-party code in the supply chain.
- The Agensi package does not include `/mimir-update`; updates ship through new versions of this listing. The self-update command is only in the GitHub version.

## License and source of truth

Released under the MIT license. The GitHub repository is the source of truth for code, documentation and updates: https://github.com/ZonatedCord/Mimir
