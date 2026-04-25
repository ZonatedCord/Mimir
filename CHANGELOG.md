# Changelog

## [1.5.0] — 2026-04-25

### V13 — History stats
- `/mimir-history --stats`: aggregate statistics over all logged estimates
  - Token usage: average, min, max
  - Risk breakdown: count + percentage per level
  - Most common risk level

## [1.4.0] — 2026-04-25

### V12 — Token-free updates, JSON output, real tok/turn, Gemini compat
- `/mimir-update` slash command shrunk to 1 line (~30 tokens vs ~200): delegates to `scripts/update.sh`
- `scripts/update.sh`: uses `git pull --ff-only` when repo exists (faster than full re-clone), falls back to fresh clone
- `--output json` flag: emits structured JSON (`totalTokens`, `taskTokens`, `contextTokens`, `risk`, `headroomPct`, `suggestedModel`, `files`, `method`); suppresses formatted output
- Real tok/turn from transcript: `readActualTokensPerTurn()` reads last 5 `.jsonl` sessions, averages assistant text-block tokens; fallback to 800 if <3 messages; display shows `(from transcript)` source
- Gemini CLI compatibility: `gemini/` directory with `GEMINI.md` + 6 skill files; install via `cp -r gemini/skills/* ~/.gemini/skills/`

## [1.3.0] — 2026-04-23

### V11 — Hook detection + Codex CLI compat
- Hook file auto-detection: reads `.sh` paths from `settings.json` / `settings.local.json` / `~/.codex/hooks.json`; tokenizes and shows in baseline
- System overhead default: 3,000 → 2,000 (hooks now measured separately)
- Codex CLI compatibility: `codex/skills/` (7 skill files), `codex/hooks.json` pre-task hook, `docs/README.codex.md`
- Improved stop instruction in `mimir.md` (task text framed as opaque data)

## [1.2.0] — 2026-04-23

### V10 — CSV export + history env var
- `/mimir-history --csv` export for piping into spreadsheets and scripts
- `MIMIR_HISTORY_FILE` env var for custom history paths and test isolation

## [1.1.0] — 2026-04-23

### V9 — Auto file detection + two-section layout
- Auto file detection: keyword extraction → repo walk → relevance scoring → top 10 files included automatically
- Two-section output: Baseline (constant overhead) vs This task (variable inputs)
- `--no-auto` flag to skip auto-detection; `--files` suppresses auto and uses explicit list
- Fixed `$ARGUMENTS` quoting in command files

## [1.0.0] — 2026-04-23

### V8 — Full context overhead
- Every estimate includes all measurable token sources: system overhead, CLAUDE.md files (user + project + parents), conversation turns
- `--turns N` flag: count N conversation turns at ~800 tokens/turn
- CLAUDE.md auto-scan: reads `~/.claude/CLAUDE.md` + project `.claude/CLAUDE.md` + parent directories
- `systemOverhead` configurable in `.mimir.json` (default: 3,000 tokens)
- Labeled per-source breakdown in output
- New `scripts/lib/context.js` module
- `systemOverhead` shown in `/mimir-config`

### V7 — Naming + auto-split + Opus 4.7
- Renamed `/estimate-task` → `/mimir`
- Opus 4.7 in model suggestions: HIGH → Sonnet/Opus, CRITICAL → Opus 4.7
- HIGH/CRITICAL risk auto-appends `/split-task` breakdown
- Empty `/mimir` shows help (exit 0) instead of erroring

### V6 — Git diff + history + smart model
- `--git-diff` flag: include current git diff in estimate
- `/mimir-diff` command: instant git diff preflight
- `/mimir-history` command: last N estimates from `~/.mimir-history.json`
- Smart model recommendation: keyword-aware (complex → Sonnet, simple → Haiku)
- Pre-task hook (`hooks/pre-task.sh`) for automatic preflight on every prompt

### V5 — Help, update, config commands
- `/mimir-help`, `/mimir-update`, `/mimir-config` commands
- Fixed install commands and prompt-passthrough bug
- Improved split heuristics: numbered lists, file path detection

### V4 — CI + plugins + schema validation
- GitHub Actions CI matrix (Node 18/20/22)
- Superpowers plugin structure
- `.mimir.json` schema validation with warnings

### V3 — Per-project config
- `.mimir.json` config: custom thresholds, context window, default model
- `--files` flag in both `/mimir` and `/split-task`

### V2 — File content + multi-model
- `--files` flag: include actual file content in token estimate
- Opus 4.7, Haiku 4.5, Sonnet 4.6 model exports

### V1 — Initial release
- `/mimir` with Anthropic count_tokens API + heuristic fallback
- `/split-task` with pattern-based heuristics
- Zero dependencies, MIT license
