# Consolidated audit decisions — Phase 1

Sources: `architecture-critic` (delivered inline, copied to `audit-architecture.md`),
`source-rag-auditor` (`audit-sources.md`), `journey-qa` (`audit-journey.md`),
plus orchestrator findings from direct API probing of the production build.

Decided by the Opus orchestrator. Each item is accept / reject with a reason.

---

## P0 — must fix before release

| # | Finding | Source | Evidence | Fix |
|---|---|---|---|---|
| P0-1 | **Form 10 route emits Form 12 instructions.** `nextStepsFor()` and `whatHappensNext` are unconditional, so a Head-of-Office claimant is told to file Form 12 under Rule 79(2)(a)(ii). `buildChecklist` also returns `[]` for `form10_hoo`, so the receipt confirms nothing. | architecture-critic | `summary.ts:110-115`, `submission.ts:90-95`, `checklist.ts:12`; reproduced via `assess`→`renderClaimSummaryText`→`submitMockClaim` with `isNamedInPpo:false` | Branch both string arrays on `assessment.route.route`; add a Form 10 checklist grounded in `02-form10-hoo-route.md`. This is the exact wrong-form failure the product exists to fix, and the UI invites it (`JourneyClient.tsx:273-277`). |
| P0-2 | **Stale-result race.** Scope/case radios are not disabled while a request is in flight; `runAssessment` calls `setResult` unconditionally, so a response from the previous case overwrites the just-cleared state and the page shows the wrong case's result. | journey-qa | `JourneyClient.tsx:70`, `:113-122`, `:130-134`; reproduced live with a 1.2s delayed response | Monotonic request-id ref guard in `runAssessment` **and** `disabled={pending}` on both radio groups. Both, to close the bug class. |
| P0-3 | **Retrieval answers the central question backwards, in both directions.** "Named in the PPO → which form?" ranked the **Form 10** brief first; "**not** named in the PPO → which form?" ranked **Form 12** first. Lexical scoring cannot see the negation that is the entire Rule 79(2) split, and the Form 10 brief explains both branches in one dense passage. | orchestrator | `/api/guidance` on the production build; scores 13.200 (form10) vs 12.708 (form12) | Deterministic `routeAffinity(query)` + `route`-matched bonus in `local-adapter.ts`. Bonus only, never a penalty, so contrast passages stay available. |
| P0-4 | **Eval could not have caught P0-3.** `expectBriefId` asserts a brief is *somewhere* in the passages; the two route briefs cite each other, so both appear for either question and ranking can be exactly backwards while the assertion passes. | orchestrator | `retrieval_eval.test.ts` assertion block | Add `expectTopBriefId` (first-rank assertion) + 4 route-polarity cases in citizen wording. |

## P1 — accepted (all cheap, all improve truthfulness; done only after P0 gates green)

| # | Finding | Source | Decision |
|---|---|---|---|
| P1-1 | `ready` state unreachable without an API key — the all-agree scenario always shows "Ready — read without the model". `FINISH_MISSION.md` Phase 2 requires all-agree ⇒ **ready**. | architecture-critic + orchestrator | **Accept.** Delete the 3-line branch in `primaryState`; the condition survives in `systemStates` and is already surfaced in the UI. A deletion, not an addition. |
| P1-2 | Step numbers skip integers when cards are hidden (unsupported: 1,2,3,4,7; blocked: 1,2,3,4,6,7). Named as a P0 gate in the mission. | both | **Accept.** Compute step numbers from what actually renders. |
| P1-3 | Wrong rule locator: `Rule 79(5)(a)` should be `Rule 80(5)(a)`. Content correct, citation resolves to the wrong rule. | source-rag-auditor | **Accept.** A product whose promise is "check the source yourself" cannot ship a citation that lands on the wrong rule. |
| P1-4 | RBI paraphrase overstates a modal verb ("may ensure" → "are to ensure"). | source-rag-auditor | **Accept.** One word. |
| P1-5 | One near-verbatim government sentence not marked as a quotation. | source-rag-auditor | **Accept.** Rights boundary; add quotation marks. |
| P1-6 | Model extraction's "verbatim" gate is record-scoped, not field-scoped — a model could lift a value from a different labelled line and unblock a blocked claim. Dormant in production (no API key ships). | architecture-critic | **Accept.** 3 lines. The code should hold the boundary the comments claim, whether or not the path is live. |
| P1-7 | `co_authorisation` reports `pass` for any non-null value, including a negative one. Unreachable with the three built-in cases. | architecture-critic | **Accept.** One line; a deterministic check must not assert more than it verified. |
| P1-8 | Unsupported-scope runs still render the full record extraction, including the name mismatch. | journey-qa | **Accept.** Gate the records block on state; an out-of-scope citizen should not be shown claim analysis. |
| P1-9 | `.env.example` does not say `SEVAPATH_VERTEX_RETRIEVAL_URL` is a base URL; the old report documented it with `/search` appended, which the adapter would double. | architecture-critic | **Accept.** One comment. Do not copy the old line into the new README. |

## Accepted limitations — disclose in README/submission, do not fix

- **Vertex AI RAG is configured and unit-tested against the installed SDK, never run against a live corpus.** No Google Cloud credentials exist. The ADK agent definition (`agent.py:build_agent`) is not in the serving path; `service.py` calls `rag.retrieve_contexts` directly. Must be described exactly this way — never as "tested".
- **The public demo performs no generation.** With no `ANTHROPIC_API_KEY`, retrieval returns concatenated corpus passages with citations and extraction is a deterministic labelled-line reader. Any "AI-powered" phrasing would be false.
- `MINIMUM_SCORE = 0.35` in `service.py` assumes higher-is-better on `RagContextsContext.score`; unverifiable without a live corpus. State as untested.
- `claimantNameCheck` treats the death certificate's *informant* as the claimant. Sound for the fixed synthetic set; a real certificate naming a son would produce a spurious review.
- Checklist references are text, not links. The exact rule/form/page is shown and every document is linked on `/sources`.
- One `h1 → h3` heading skip on the landing page before the first `h2`.

## Rejected — noise, do not act

- `retrieveGuidance` reports `adapter` on a refusal though no adapter ran — internal field, never rendered.
- `next.config.ts` comment says the adapter reads `ingest/` at request time; it reads the compiled index. Comment-only.
- `/api/health` would echo a sidecar URL if Vertex were configured; default `local` detail is a brief/passage count.
- `list_corpora` unpaginated — single-corpus project.
- Linking checklist references to source URLs — scope expansion.

## Explicitly out of scope (mission prohibits)

Translation, voice, file upload/OCR, authentication, database, live government
integration, additional pension categories, unrelated dashboards. No more than
one P1 polish pass.
