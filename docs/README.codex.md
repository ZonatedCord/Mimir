# Mimir for Codex CLI

Zero-dependency token preflight checker for [OpenAI Codex CLI](https://github.com/openai/codex).

## Install

```bash
git clone https://github.com/ZonatedCord/Mimir.git ~/.codex/mimir && \
mkdir -p ~/.agents/skills && \
ln -s ~/.codex/mimir/codex/skills ~/.agents/skills/mimir
```

Restart Codex to discover the skills.

**Requirements:** Node.js ≥ 18. No `npm install`. No API keys.

## Usage

Skills are triggered by name or description match:

| Skill | Trigger example |
|-------|----------------|
| `mimir` | "run mimir for: refactor the auth module" |
| `split-task` | "split this task: rewrite the entire API" |
| `mimir-history` | "show mimir history" |
| `mimir-history` | "mimir history --csv" |
| `mimir-config` | "show mimir config" |
| `mimir-help` | "mimir help" |
| `mimir-update` | "update mimir" |

## Pre-task hook (optional)

Run Mimir automatically before every prompt. Merge `codex/hooks.json` into your `~/.codex/hooks.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.codex/mimir/hooks/pre-task.sh",
            "timeout": 30,
            "statusMessage": "Mimir preflight check"
          }
        ]
      }
    ]
  }
}
```

Short prompts (< 100 tokens) are skipped automatically.

## Differences from Claude Code

| | Claude Code | Codex CLI |
|---|---|---|
| Invocation | `/mimir "task"` (slash command) | `mimir` skill (natural language trigger) |
| Install path | `~/.claude/mimir/` | `~/.codex/mimir/` |
| Command files | `.claude/commands/*.md` | `codex/skills/*/SKILL.md` |
| Hooks | `~/.claude/settings.json` | `~/.codex/hooks.json` |

Scripts and risk logic are identical — same Node.js code, same output format.

## Update

```
mimir-update
```

Or manually:

```bash
git -C ~/.codex/mimir pull
```

## Uninstall

```bash
rm ~/.agents/skills/mimir
rm -rf ~/.codex/mimir
```
