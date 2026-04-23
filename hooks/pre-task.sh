#!/usr/bin/env bash
# Mimir pre-task hook for Claude Code (UserPromptSubmit)
# Runs estimate.js on the submitted prompt and prints the report
# as a notification before Claude processes the message.
#
# To install: add to ~/.claude/settings.json
#   "hooks": {
#     "UserPromptSubmit": [
#       {
#         "matcher": "",
#         "hooks": [{ "type": "command", "command": "bash ~/.claude/mimir/hooks/pre-task.sh" }]
#       }
#     ]
#   }

INPUT=$(cat)
PROMPT=$(printf '%s' "$INPUT" | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try{ const p=JSON.parse(d); process.stdout.write(p.prompt||''); }catch{}
  });
" 2>/dev/null)

if [ -z "$PROMPT" ]; then exit 0; fi

TOKENS=$(node -e "
  const {estimateTokens}=require(require('os').homedir()+'/.claude/mimir/scripts/lib/tokenizer');
  process.stdout.write(String(estimateTokens(process.argv[1])));
" "$PROMPT" 2>/dev/null)

if [ -z "$TOKENS" ] || [ "$TOKENS" -lt 100 ] 2>/dev/null; then exit 0; fi

node "$HOME/.claude/mimir/scripts/estimate.js" "$PROMPT" 2>/dev/null || true
