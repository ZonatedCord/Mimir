# Mimir Plugin

Superpowers plugin wrapper for [Mimir](../../README.md) — Claude Code preflight checker.

## Prerequisites

Mimir scripts must be installed at `~/.claude/mimir/`:

```bash
rm -rf ~/.claude/mimir && \
git clone https://github.com/ZonatedCord/Mimir.git ~/.claude/mimir && \
mkdir -p ~/.claude/commands/ && \
cp -r ~/.claude/mimir/.claude/commands/* ~/.claude/commands/
```

## Skills

| Skill | Description |
|-------|-------------|
| `/mimir` | Estimate token cost and risk before running a task |
| `/split-task` | Split a large task into safer sub-tasks |
| `/mimir-config` | Show active configuration |
| `/mimir-help` | Show all commands and workflow |
| `/mimir-update` | Update Mimir to latest version |

## Installation (manual)

Until Mimir is published to a superpowers marketplace, install manually:

1. Clone the repo to `~/.claude/mimir/` using the command above
2. Symlink or copy this plugin directory to your Claude plugins cache, or use the `.claude/commands/` slash commands included in the repo root.

## Future

Plugin will be published to a public marketplace. See [roadmap](../../README.md#roadmap).
