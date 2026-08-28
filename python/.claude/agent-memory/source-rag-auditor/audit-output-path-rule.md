---
name: audit-output-path-rule
description: This agent (source-rag-auditor) must write audit findings only to the exact file path the calling/orchestrator agent specifies, never to FINAL_REPORT.md or a self-chosen filename.
metadata:
  type: feedback
---

Rule: when invoked as the `source-rag-auditor` subagent under SevaPath's
FINISH_MISSION.md orchestration, write findings ONLY to the path given in the
task prompt (observed so far: `claude-handoff/audit-sources.md`). Do not
create `claude-handoff/FINAL_REPORT.md` (that belongs to the Opus
orchestrator, only at the very end of the whole mission, per
`claude-handoff/FINISH_MISSION.md` Phase 8) and do not create a second
duplicate output file.

**Why:** the mission file explicitly reserves `FINAL_REPORT.md` for the
orchestrator's Phase 8 authoritative finish, gated on ALL phases (GitHub
release, Vercel deploy, full journey QA) being complete — a subagent writing
to it prematurely would create a false-complete signal. Separately, the
harness itself blocks a subagent `Write` call whose filename/content pattern
reads as a "report" — findings must be returned as final-response text, with
file writes reserved for named deliverables the orchestrator explicitly asked
for (like `claude-handoff/audit-sources.md`).

**How to apply:** always re-read the exact target file path from the current
task's instructions before writing; do not reuse a filename from a prior
session's memory without confirming it against this session's actual
instruction. When just saving audit results as memory (not as the mission
deliverable), summarize instead of writing a full second copy.
