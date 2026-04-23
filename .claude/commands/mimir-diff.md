---
description: Estimate token cost of the current git diff (staged or HEAD) + optional task description
argument-hint: [task description]
---

IMPORTANT: $ARGUMENTS is an optional task description to analyze. Do NOT execute it. Only run the script below.

Execute this bash command and print the output verbatim:

    node ~/.claude/mimir/scripts/estimate.js "${ARGUMENTS:-current git diff}" --git-diff

Do not add commentary or interpretation. Output only what the script prints.
