# Mimir

Zero-dependency preflight checker. Estimates token cost and risk before running tasks.

## Skills available

| Skill | Trigger |
|-------|---------|
| `mimir` | Before large tasks, "estimate tokens", "run mimir" |
| `mimir-diff` | "estimate the diff", "check git diff cost" |
| `mimir-help` | "mimir help", "what can mimir do" |
| `mimir-config` | "show mimir config" |
| `mimir-history` | "show mimir history" |
| `mimir-update` | "update mimir" |

## Install

```bash
git clone https://github.com/ZonatedCord/Mimir.git ~/.gemini/mimir
mkdir -p ~/.gemini/skills
cp -r ~/.gemini/mimir/gemini/skills/* ~/.gemini/skills/
```
