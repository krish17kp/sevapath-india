# SevaPath journey-qa audit

Scope: functional/browser/mobile/accessibility/stale-state audit of the existing
app. No application source was modified. Scratch reproduction scripts live only
under `/tmp` (`/tmp/journey-audit-final.mjs`, plus ad-hoc debug variants run and
discarded during the session — see "Reproduction script" below for the
canonical one). Repo `git status --short` was re-verified identical to the
starting snapshot after this audit (only the pre-existing untracked top-level
entries remain; no new files left in the repo).

## Baseline (unchanged by this audit)

| Command | Result |
|---|---|
| `npx vitest run` (repo root) | **PASS** — 8 files, 133 tests |
| `npx vitest run tests/retrieval` | **PASS** — 3 files, 52 tests (subset of the 133) |
| `npm run lint` | **PASS** — 0 errors after cleanup (see note below) |
| `npm run typecheck` | **PASS** — no output, exit 0 |
| `cd python && python3 -m pytest -q` | **PASS** — 20 passed (must run with cwd `python/`; running from repo root fails with `ModuleNotFoundError: sevapath_rag` because pytest can't find the package — this is a `cwd` requirement, not a bug, `python/pytest.ini`/package layout expects it) |
| `npm run build` | **not run** — a production build was already running in another process per instructions; not restarted or interfered with |

Note on lint: mid-audit I temporarily copied a debug script into the repo root
to work around Node ESM module resolution for a scratch `/tmp` script
importing `playwright`; this transiently broke `npm run lint` (41 `no-console`
errors from the scratch files). All scratch files were deleted before
finishing and `npm run lint` / `git status --short` were re-verified clean.
Nothing was committed. This is disclosed for transparency, not because it
affects the shipped app.

Dev server used for browser testing: `npx next dev -p 3111` (started and killed
by this audit; the build already running in another process on the default
port was left untouched).

## Findings

### FINDING 1 — P0: Rerunning while a previous request is in flight can display a stale, mismatched result (the exact "old-state" bug the mission calls out)

**What happens:** `JourneyClient` clears `result`/`submitted` synchronously
when the citizen changes a scope answer or the selected synthetic record set
(`src/components/JourneyClient.tsx:113-122` and `:130-134`), which is correct.
But the `RecordsStep` case radios and the `ScopeStep` answer radios are **not**
disabled while a request is pending — only the "Read the records and run the
checks" button is (`canRun={allAnswered && !pending}`, line 135). If the
citizen switches the selected record set (or an answer) *while the assessment
fetch triggered by the previous click is still in flight*, `runAssessment`'s
unconditional `setResult((await response.json()) as AssessResponse)`
(`src/components/JourneyClient.tsx:70`) fires after the switch and overwrites
the just-cleared `null` with the **old** case's/scope's result. There is no
request-id/abort guard in `runAssessment`
(`src/components/JourneyClient.tsx:56-83`) to discard a response that no
longer matches the current `scope`/`caseId`.

**Reproduction (verified live against `npx next dev -p 3111`):**
1. Fill the example answers, leave the default record set (`name_variation`).
2. Delay the first `/api/assess` response by ~1.2s (Playwright `page.route`
   used in the repro script below; a slow network/CPU moment reproduces this
   for real users too, no interception required).
3. Click "Read the records and run the checks".
4. ~200ms later (request still in flight), click the "Date of death not
   readable" record-set radio (`missing_death_date`).
5. Wait for the delayed response to land.

**Observed:** The radio for `missing_death_date` shows as checked (the
citizen's current selection), but the page displays state badge **"Review
required"** and the heading **"Claimant's name is written differently across
records"** — i.e. the `name_variation` case's result, not the currently
selected `missing_death_date` case's `blocked_missing_information` result.
The record cards under "Your three records" also show the stale case's data.
This is precisely the failure mode Phase 3 item 5 / the final checklist's
"stale-state bug" and "rerunning cannot show an answer from the old state"
requirement are guarding against.

**Severity: P0.** It directly contradicts "Changing any input after a result
either clears downstream results or clearly marks them stale and requires a
rerun" — here a rerun produces a genuinely wrong answer for the currently
selected inputs, not just a stale display of the old ones.

**Smallest justified fix (not applied — source not modified per instructions):**
Disable the scope radios (`ScopeStep`) and the record-set radios
(`RecordsStep`) while `pending` is true, mirroring the existing pattern
already used for the run button (`canRun={allAnswered && !pending}`). This is
a ~4-line change: pass `disabled={pending}` (or an equivalent `pending` prop)
into the `<input type="radio">` elements in `ScopeStep`
(`src/components/JourneyClient.tsx:209-216`) and `RecordsStep`
(`:322-328`). For defense in depth (covers any future path that re-introduces
concurrent fetches, e.g. React Strict Mode double-invocation or a fast
double-click before the disabled attribute paints), also add a monotonic
request-id ref in `runAssessment` and only call `setResult`/`setError` when
the ref still matches the id captured at call start, incrementing the ref in
the same three places `setResult(null)` is currently called
(`:115`, `:120`, `:132`). Either change alone closes the reproduced bug;
doing both closes the bug class.

### FINDING 2 — P1: Unsupported-scope runs still perform and display full record extraction, including the very mismatch the review flow would flag

**What happens:** `assess()` runs `extractCase()` unconditionally, before it
checks whether the route is `out_of_scope`
(`src/lib/domain/assessment.ts:44-68`: `extraction` is computed at line 47,
the `out_of_scope` early-return at lines 57-68 still includes `extraction` in
the response, only `checks`/`checklist` are emptied). `RecordsStep` in
`JourneyClient.tsx` (`:351-366`) renders "What SevaPath read" — the full
per-record field list, via `RecordCard` — for **any** `result`, with no gate
on `assessment.state`. So for an unsupported scope, the UI still shows the
raw synthetic field values (including, for the default `name_variation` case,
the differing `Meera Sharma` / `Meera R. Sharma` spellings) with **no**
indication that they differ, because the check that would have flagged it
(`checks: []`) is suppressed for `unsupported_scenario`.

**Reproduction:** Confirmed two ways:
1. A **fresh** run answering "No" to "Are you the surviving spouse" (no prior
   valid run at all) already shows 3 record cards including
   `Meera R. Sharma` under "Not covered by this walkthrough".
2. After a full valid `Yes/Yes/Yes/No` run to receipt, flipping "already
   started" to Yes and rerunning shows the same: state badge flips correctly
   to "Not covered by this walkthrough" and the receipt/checklist correctly
   disappear (Finding 3's clean-clear behavior holds), but the record cards
   for the still-selected `name_variation` case reappear under step 3, now
   with no mismatch flag next to them.

**Why P1, not P0:** This is not the classic stale-async-state bug — the data
shown is always for the *currently selected* case (confirmed by re-running
with the case deliberately switched: cards correctly reflect the current
selection). No blocked/review conclusion, checklist, worksheet, or receipt is
shown or implied to apply to the unsupported scenario, and nothing is
submittable. But it does present claim-relevant extracted values (a real
citizen would read these as "my documents") directly underneath a state that
says "SevaPath does not guess at journeys it has not verified against
official sources" — undermining that message, and specifically dropping the
one signal (the mismatch flag) that would normally accompany those same
values.

**Smallest justified fix:** In `RecordsStep`'s render of the "What SevaPath
read" block (`src/components/JourneyClient.tsx:351-366`), gate it on
`result.assessment.state !== "unsupported_scenario"` (or equivalently only
render when `result.assessment.route.route !== "out_of_scope"`), and show a
one-line note instead ("Records are not read for a walkthrough this scope
does not cover"). This is a single added condition, no data-model change.

### FINDING 3 — P1: Step numbers skip integers when the checklist/worksheet steps are hidden, producing a confusing sequence

**What happens:** Step numbers are hardcoded per section
(`<span className="step-number">N</span>`) rather than computed from which
sections actually render. Steps 5 ("What to gather for Form 12",
`JourneyClient.tsx:451`) and 6 ("Your preparation worksheet", two separate
hardcoded `6`s at `:488` for the blocked variant and `:511` for the
prepare-ready variant) are conditionally rendered:
- step 5 only when `canPrepare && assessment.checklist.length > 0`
  (`:448`, `canPrepare` defined at `:388` as `!unsupported && !blocked`)
- step 6 (blocked variant) only when `blocked` (`:485`)
- step 6 (prepare variant) only when `canPrepare` (`:508`)

**Reproduction (measured live, `.step-number` text content in DOM order):**

| Flow | Step numbers shown |
|---|---|
| `review_required` (primary Yes/Yes/Yes/No mismatch demo) | 1, 2, 3, 4, 5, 6, 7 — correct |
| `blocked_missing_information` (missing death date) | 1, 2, 3, 4, **6**, 7 — step 5 silently skipped |
| `unsupported_scenario` (not surviving spouse) | 1, 2, 3, 4, 7 — steps 5 **and** 6 silently skipped |

**Severity: P1.** Purely presentational — it does not affect correctness of
any result, but it fails the explicit acceptance-checklist requirement
"Steps are numbered consistently and skipped/hidden steps do not create a
confusing sequence," and a citizen following "step 4, now where's step 5?"
literally will be confused.

**Smallest justified fix:** Replace the hardcoded step numbers with a running
counter computed at render time (e.g. a small `useStepNumber()` helper backed
by a ref that increments once per rendered `.step-heading`, or simplest:
pass an explicit `stepNumber` prop computed in `JourneyClient`'s render body
from which optional sections are about to be shown, since `JourneyClient`
already knows `canPrepare`/`blocked`/`unsupported` before rendering
`ResultSteps`). No change to routing/business logic required.

### FINDING 4 — Minor / accepted-limitation: one heading-level skip (h1 → h3) before the first h2

**What happens:** The very first heading after `<h1>SevaPath</h1>` is the
`<h3>Read this first</h3>` inside the safety notice box
(`src/app/page.tsx:25`), before any `<h2>` appears. The notice box pattern
uses `<h3>` uniformly for all callouts regardless of surrounding context
(also visible later, correctly nested, e.g. `ExplainerStep`'s
"The trap this prototype exists to fix"). This produces one heading-level
skip at the top of the page only.

**Severity: accepted-limitation / P2.** All content remains reachable and in
logical reading order; landmarks (`header`/`main`/`footer`, confirmed present
and singular) and all subsequent heading nesting are correct. This is the
kind of thing an automated axe-core-style scanner would flag as
"heading-order" but it does not block navigation or comprehension. No axe-core
or equivalent automated a11y scanner is a devDependency in this repo, so this
was checked manually via DOM heading-order enumeration, not an automated
audit tool; a fuller WCAG contrast-ratio check was similarly not run (no
tool available) — noted as untested rather than passed.

**Smallest justified fix, if desired:** change the notice's heading from
`<h3>` to `<h2>` only in `page.tsx`'s first "Read this first" instance (or
demote the page's structure so section headings start at `<h2>` only after
the safety notice, i.e. move the notice above the `<h1>`'s implicit section
start). Cosmetic; not required for release.

## Areas verified sound (no finding — stated once, per instructions)

- **Stale-state clearing on direct user edits (not the race in Finding 1):**
  Changing a scope answer or the selected record set immediately clears
  `result` and `submitted`, hiding the result panel, checklist, worksheet,
  and receipt entirely (`JourneyClient.tsx:113-122`, `:130-134`). Verified
  live: after a full receipt is shown, flipping any scope answer removes
  `#result`, `#checklist`, and `.receipt` from the DOM before any rerun.
- **Submit cannot be tampered into a receipt for a bad claim:** `/api/submit`
  re-runs `assess()` server-side from the posted `scope`/`caseId` rather than
  trusting a client-supplied assessment (`src/app/api/submit/route.ts:52-59`),
  so a stale/forged client state cannot mint a receipt the server itself
  would refuse.
- **Primary Yes/Yes/Yes/No mismatch journey:** reaches "Review required",
  shows both `Meera Sharma` / `Meera R. Sharma` values unmerged and
  unresolved, and reaches a clearly labelled mock receipt
  (`DEMO-NOT-A-REAL-RECEIPT-*`, "no claim has been submitted", "not valid
  anywhere", "not issued by any government body").
- **All-records-agree case:** reaches a ready-family state (in local dev
  without a model key this is correctly `model_unavailable_deterministic_fallback`
  — labelled "Ready — read without the model", never mislabelled "AI").
- **Missing-death-date case:** reaches `blocked_missing_information`
  ("Blocked — information missing") with no submit button offered — server
  (`submitMockClaim`, `src/lib/domain/submission.ts:55-62`) and client both
  refuse it.
- **Unsupported scope (family pension already started = Yes):** reaches
  "Not covered by this walkthrough" with no submit button, both fresh and
  after a prior valid run (modulo Finding 2's record-card display).
- **Bounded RAG Q&A:** a supported question ("Is Form 14 still the current
  form?") returns an answer with 4 citations; the unsafe eligibility question
  ("Am I eligible for family pension?") and the unsafe amount question ("How
  much pension will I get per month?") are both refused with "SevaPath will
  not answer this"; an out-of-corpus question ("How do I renew my passport?")
  returns the exact insufficient-evidence path ("Not verifiable from the
  corpus").
- **Retrieval-unavailable state:** simulated via response interception; the
  deterministic checklist/worksheet/checks remain fully usable and a clear
  "Guidance panel unavailable" notice is shown, matching
  `assessment.ts`'s documented state precedence.
- **Model fallback labelling:** "built-in reader" / "Ready — read without the
  model" — never described as AI, matching the mission's honesty rule.
- **360×800 viewport:** zero horizontal overflow
  (`document.documentElement.scrollWidth - clientWidth === 0`).
- **Keyboard operation and visible focus:** tab order reaches interactive
  controls; the focused element carries a `3px solid` outline
  (`:focus-visible { outline: 3px solid ... }`, `globals.css:105-107`).
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` present and
  applied without error (`globals.css:756`).
- **Console/network cleanliness:** zero console errors and zero failed/5xx
  requests observed across the primary mismatch journey.
- **No secrets/PII in the flow:** no file upload, password, Aadhaar/PAN
  fields anywhere in the DOM; no rupee amounts rendered (already covered by
  `tests/ui/journey.test.tsx`'s "safety on screen" suite, spot-confirmed live).

## Reproduction script (canonical, lives only in /tmp)

`/tmp/journey-audit-final.mjs` — a self-contained Playwright script (21
checks) run against a locally started `npx next dev -p 3111`. Run with:

```bash
cd "/mnt/NewVolume/Krish/04 - Dev Projects/buildwhatmovesindia/sevapath-claude-build-from-scratch-v3"
npx next dev -p 3111 &                 # dev server on a non-default port
sleep 3
node /tmp/journey-audit-final.mjs      # imports playwright via an absolute
                                        # node_modules path baked into the file
kill %1                                # stop the dev server afterward
```

Last run result: **19/21 checks passed**; the 2 failures are Findings 1 and 2
above (`unsupported rerun shows no leaked prior content`,
`switching record set while an assess request is in flight does not show a
stale result for the old selection`). All other checks (mismatch journey to
receipt, all-agree, missing-date-blocked, unsupported-no-submit, direct
answer-change clears result, supported/unsafe/out-of-corpus RAG Q&A, 360px
overflow, keyboard focus, reduced motion, retrieval-unavailable resilience,
console/network cleanliness) passed.

## Exact passing commands (copy-paste)

```bash
cd "/mnt/NewVolume/Krish/04 - Dev Projects/buildwhatmovesindia/sevapath-claude-build-from-scratch-v3"
npx vitest run                 # 133/133 pass
npm run lint                   # 0 errors
npm run typecheck              # clean
cd python && python3 -m pytest -q   # 20/20 pass (must cd into python/ first)
```

## Summary for the orchestrator

- **1 P0** to fix before release: the case/scope-switch race in
  `runAssessment` (Finding 1) — smallest fix is disabling the scope and
  record-set radios while `pending`, in `src/components/JourneyClient.tsx`.
- **2 P1**: unsupported-scope record-card leak (Finding 2, gate the "What
  SevaPath read" block on `state !== "unsupported_scenario"`); step-number
  skipping when steps 5/6 are hidden (Finding 3, compute step numbers instead
  of hardcoding them).
- **1 accepted-limitation/P2**: single h1→h3 heading skip at page top
  (Finding 4); no automated a11y/contrast tool available in this repo to go
  further than manual DOM inspection.
- Everything else audited (primary mismatch→receipt, all-agree, blocked,
  unsupported, direct-edit stale-state clearing, RAG citations/refusal/
  insufficient-evidence, retrieval-unavailable, model-fallback labelling,
  360px/keyboard/focus/reduced-motion, console/network cleanliness) is sound
  and needs no fix.
