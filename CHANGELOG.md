# Changelog

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
