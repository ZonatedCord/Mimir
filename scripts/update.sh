#!/usr/bin/env bash
set -e
if [ -d ~/.claude/mimir/.git ]; then
  git -C ~/.claude/mimir pull --ff-only
else
  rm -rf ~/.claude/mimir
  git clone https://github.com/ZonatedCord/Mimir.git ~/.claude/mimir
fi
mkdir -p ~/.claude/commands/
cp -r ~/.claude/mimir/.claude/commands/* ~/.claude/commands/
echo "✅ Mimir updated"
