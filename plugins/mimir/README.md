# Mimir Plugin

Superpowers plugin wrapper for [Mimir](../../README.md) — Claude Code preflight checker.

## Prerequisites

Mimir scripts must be installed at `~/.claude/mimir/`:

```bash
git clone https://github.com/marcobarlera/mimir ~/.claude/mimir
```

## Skills

| Skill | Description |
|-------|-------------|
| `/estimate-task` | Estimate token cost and risk before running a task |
| `/split-task` | Split a large task into safer sub-tasks |

## Installation (manual)

Until Mimir is published to a superpowers marketplace, install manually:

1. Clone the repo to `~/.claude/mimir/`
2. Symlink or copy this plugin directory to your Claude plugins cache, or use the `.claude/commands/` slash commands included in the repo root.

## Future

Plugin will be published to a public marketplace once the repo is public.
