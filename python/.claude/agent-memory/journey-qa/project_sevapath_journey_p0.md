---
name: project-sevapath-journey-p0
description: SevaPath JourneyClient has a P0 stale-state race (switching case/scope while an /api/assess fetch is in flight can show a mismatched old result) found during the pre-release journey-qa audit
metadata:
  type: project
---

During the pre-8pm-IST release audit (2026-08-28, see
`claude-handoff/audit-journey.md` and `claude-handoff/FINISH_MISSION.md`), the
journey-qa pass found that `src/components/JourneyClient.tsx`'s scope-answer
radios and record-set radios are not disabled while an assessment request is
`pending`. Only the "Read the records and run the checks" button is
(`canRun={allAnswered && !pending}`). If the citizen switches the record set
(or a scope answer) while a previous `/api/assess` fetch is still resolving,
`runAssessment`'s unconditional `setResult(...)` on that stale promise
overwrites the just-cleared `null`, and the UI can show a result for a
different case/scope than the one currently selected (e.g. radio shows
`missing_death_date` selected but the page displays the `name_variation`
case's "Review required" content). Reproduced live with Playwright by
delaying the first `/api/assess` response ~1.2s via `page.route` and
switching the case mid-flight.

A second, lower-severity issue (P1) was found alongside it: `assess()` in
`src/lib/domain/assessment.ts` runs record extraction unconditionally before
checking scope, so even `unsupported_scenario` results still render the full
"What SevaPath read" record cards (including the Meera Sharma / Meera R.
Sharma mismatch) with no flag, because `checks: []` is returned for
unsupported scope. Not a stale-state bug — reproducible on a fresh
never-valid run too — but it undercuts the "unsupported answers never leak
content from a valid scenario" principle in spirit.

**Why:** These were the two substantive findings out of 8 audit categories on
an otherwise clean codebase (133/133 vitest, 20/20 pytest, clean lint/tsc).
The smallest fix for the P0 is disabling the scope/case radios while
`pending` (mirrors the existing run-button pattern); optionally add a
request-id guard in `runAssessment` for defense in depth. The smallest fix
for the P1 is gating the "What SevaPath read" block on
`assessment.state !== "unsupported_scenario"`.

**How to apply:** If asked to re-audit or fix SevaPath's journey flow, check
first whether `JourneyClient.tsx` still lacks `disabled={pending}` on those
radios — if fixed, this specific race is resolved and this memory is
historical. A third, cosmetic-only finding: step numbers (`.step-number`)
are hardcoded per section and skip integers (e.g. 1,2,3,4,6,7) when steps
5/6 are conditionally hidden (blocked/unsupported states) — low severity,
fix by computing step numbers instead of hardcoding them.
