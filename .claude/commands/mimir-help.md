---
description: Show all Mimir commands and usage
---

Print the following help text verbatim. Do not execute any commands or add commentary.

---

⚡ **Mimir** — Claude Code preflight checker

**Commands:**

| Command | Description |
|---|---|
| `/estimate-task "<task>"` | Estimate token cost + risk before running |
| `/estimate-task "<task>" --files f1 f2` | Include file content in estimate |
| `/split-task "<task>"` | Split large task into safer sub-tasks |
| `/mimir-help` | Show this help |
| `/mimir-update` | Update Mimir to latest version |

**Risk levels:** `LOW ✅` `MEDIUM ⚠️` `HIGH 🔴` `CRITICAL 🚨`

**Workflow:**
1. `/estimate-task` — if LOW or MEDIUM, proceed
2. If HIGH or CRITICAL → `/split-task` to break it down
3. Run sub-tasks one at a time
