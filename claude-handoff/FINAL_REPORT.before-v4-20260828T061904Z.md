# SevaPath — Final Build Report

Generated 2026-08-27. This report is the authoritative record of what was
built, what was verified, and what remains blocked on credentials the
assistant does not have.

## 1. What SevaPath is

SevaPath is a hackathon prototype that redesigns one narrow journey from the
Central Government Pensioners' Portal: a surviving spouse who is already
named in the Pension Payment Order (PPO) preparing to start Central Civil
family pension after the pensioner's death.

- **Current primary route**: Form 12 to the Pension Disbursing Authority
  (PDA) — the pension-disbursing bank branch — under CCS (Pension) Rules,
  2021, Rule 79(2)(a)(ii).
- **Alternative route**: Form 10 through the Head of Office (HOO), used when
  the spouse is not already named in the PPO, under Rule 79(2)(b)(i).
- **Form 14 is archived.** The prototype actively warns about this because
  the Department's own 2018 FAQ PDF still tells claimants to use Form 14 on
  page 17, while the current Downloads page and the 2021 Rules list Form 10
  and Form 12 as current. This conflict is recorded in the corpus
  (`05-form14-archived.md`) and surfaced to the user rather than silently
  resolved.

The prototype is a preparation worksheet, not a filing channel. It never
claims to submit anything to a real government system.

## 2. Non-negotiable boundaries — how each was enforced

| Boundary (from `CLAUDE.md`) | Enforcement |
|---|---|
| Synthetic records only | All three demonstration records (`src/lib/domain/synthetic-records.ts`) carry a `SYNTHETIC DEMONSTRATION RECORD — NOT A REAL DOCUMENT` banner on the first and last line. No form on the site accepts free-text personal data entry. |
| No real Aadhaar/PAN/PPO/bank/OTP/password/payment/health/identity data | The app has no input fields for these; the only "records" in the system are the three built-in synthetic cases. |
| No eligibility determination, pension calculation, identity certification, name-mismatch resolution, or submission claims | `src/lib/retrieval/safety.ts` classifies and refuses these question categories before any retrieval runs. `src/lib/domain/validation/checks.ts` reports the claimant-name check as `review` status with `humanAction: "... Do not alter any record yourself."` — never auto-resolved. |
| Every submission/receipt labeled a demonstration | `src/lib/domain/submission.ts` receipts state "not issued by any government body," "not valid anywhere," and use reference numbers prefixed `DEMO-NOT-A-REAL-RECEIPT-`. |
| No government logos/seals/endorsement-implying design | `src/app/globals.css` uses a plain, non-tricolor palette; `src/app/layout.tsx` carries a permanent banner: "Hackathon prototype — not an official government service." |
| No bypassing login/CAPTCHA/robots/rate limits | The collector (`rag-corpus/scripts/collect_public_sources.mjs`, pre-supplied and preserved) checks `robots.txt` before every fetch and only touches URLs in the allowlist. |
| Crawl only `rag-corpus/config/public_sources.json` | Allowlist was not broadened. All 11 collected sources come from that file. |
| Raw downloads never committed/deployed/uploaded | `rag-corpus/raw_sources_auto/` is `.gitignore`d (verified with `git check-ignore`) and `python/sevapath_rag/config.py:uploadable_files()` globs only `rag-corpus/ingest/*.md`, additionally checking the resolved parent directory to block symlink/traversal tricks. |
| Deployable corpus = original summaries with citations, not copied text | The 10 `rag-corpus/ingest/*.md` briefs are hand-written summaries with `[KEY: locator]` citation markers pointing to rule/page numbers; no raw government PDF text is reproduced verbatim. |
| Never print credentials / never commit `.env` | Only `.env.example` (names, no values) is tracked. `git status --short` confirms no other `.env*` file is present. |
| Never fake cloud success if credentials are unavailable | Verified below in §6 — genuinely checked, genuinely absent, genuinely reported as blocked. |
| No deploy/publish/push/external access change | None performed. No `git commit` has been made; all files remain untracked, matching the harness's default git safety protocol (never commit without being asked) and CLAUDE.md's explicit deployment restriction. |

## 3. Citizen journey (what actually runs)

`npm run dev`, then open `http://localhost:3000`.

1. **Home** (`src/app/page.tsx`) — explains what SevaPath does and will not
   do, then hands off to the journey.
2. **Scope questions** (`JourneyClient` step 1, backed by
   `src/lib/domain/validation/routing.ts`) — four yes/no/unknown questions
   deterministically route to Form 12/PDA, Form 10/HOO, or out-of-scope. Any
   unanswered question keeps the state `out_of_scope` with an explicit
   "scope not yet confirmed" reason — it never guesses.
3. **Synthetic case selection** — pick one of three built-in cases (`matched`,
   `name variation` — the default demo case showing "Meera Sharma" on the PPO
   and death certificate vs. "Meera R. Sharma" on the bank proof — or
   `missing death date`).
4. **Extraction** (`src/lib/domain/extraction/`) — deterministic label:value
   reader by default; if `ANTHROPIC_API_KEY` is set, a constrained
   Claude tool-call extracts the same fields, but every model-returned value
   is verified to appear verbatim in the source text before being trusted,
   and any record kind, tool-shape, or verification failure makes the whole
   result silently fall back to the deterministic reader and reports
   `model_unavailable_deterministic_fallback` rather than partially trusting
   the model.
5. **Checks** (`src/lib/domain/validation/checks.ts`) — required-field
   presence, deceased-identity consistency, and the core claimant-name
   consistency check, which is reported as `review` (not silently passed or
   silently rejected) whenever two name fields differ in more than
   whitespace.
6. **State banner** (`src/lib/domain/assessment.ts`) — one of six states:
   `ready`, `review_required`, `blocked_missing_information`,
   `retrieval_unavailable`, `unsupported_scenario`,
   `model_unavailable_deterministic_fallback`, chosen by fixed precedence so
   the most serious condition always wins, with system conditions (like a
   retrieval outage) shown alongside a blocking state rather than hidden by
   it.
7. **Checklist + worksheet** (`src/lib/domain/checklist.ts`,
   `src/lib/domain/summary.ts`) — only for the Form 12/PDA route; lists the 8
   required attachments with computed satisfied/unsatisfied status.
8. **Ask a question** (`GuidancePanel`, `src/lib/retrieval/`) — free-text
   question against the corpus. Refused categories (pension amount,
   eligibility decisions, identity resolution, submission-on-behalf, personal
   data) are blocked before any retrieval call, with a stated reason. Answered
   questions always carry at least one citation with a URL, source title, and
   accessed date. If nothing in the corpus supports an answer, the response is
   always exactly *"I could not verify this from the current official
   corpus."* — never a guess.
9. **Demonstration submission** (`src/lib/domain/submission.ts`,
   `/api/submit`) — produces a clearly-fake receipt. The server re-runs the
   full assessment itself rather than trusting any client-sent state, so a
   blocked or unsupported claim cannot be submitted even by a modified
   client request. The UI additionally hides the submit control entirely for
   blocked claims (see §7, bug #5) so a user never sees a live-looking button
   that would only fail server-side.
10. **Sources page** (`src/app/sources/page.tsx`, `/sources`) — full
    provenance table (issuer, official title, URL, accessed date, SHA-256,
    collection method, rights note) read live from
    `rag-corpus/source_manifest.csv`.

## 4. Files created

Full application (55 TypeScript/TSX files under `src/`), full RAG pipeline
(`rag-corpus/scripts/*.mjs`, `rag-corpus/scripts/vertex_upload.py`,
`rag-corpus/ingest/*.md` × 10, `rag-corpus/index/local_index.json`,
`rag-corpus/source_manifest.csv`, `rag-corpus/tests/retrieval_eval.jsonl`,
`rag-corpus/RIGHTS_POLICY.md`), a Python Vertex/ADK sidecar
(`python/sevapath_rag/*.py`, `python/tests/*.py`), and a full test suite
(8 TypeScript test files under `tests/`, 4 Python test files under
`python/tests/`). The pre-supplied crawler (`collect_public_sources.mjs`),
allowlist (`rag-corpus/config/public_sources.json`), validator
(`validate_public_collection.mjs`), and `.claude/settings.json` safety
configuration were preserved unmodified.

Project scaffolding: `package.json`, `tsconfig.json`, `next.config.ts`,
`eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `.gitignore` (this
build added `*.tsbuildinfo` to the pre-supplied ignore list; everything else
in it was already correct).

## 5. Official public sources collected

Collected via `node rag-corpus/scripts/collect_public_sources.mjs`, run
against every URL in `rag-corpus/config/public_sources.json` (11 entries) —
**11 of 11 succeeded, 0 failures.** Validated via
`node rag-corpus/scripts/validate_public_collection.mjs` →
`PASS: 11 public sources validated`.

| Source ID | Issuer | Method | HTTP | Corpus use |
|---|---|---|---|---|
| PENSION-FORMS-LIST | DoPPW | playwright | 200 | summarised-in-ingest |
| CCS2021-NOTIFICATION | DoPPW | direct-http-pdf | 200 | summarised-in-ingest |
| CCS2021-COMPENDIUM | DoPPW | direct-http-pdf | 200 | verification-only (cross-check copy) |
| FORM10-2021 | DoPPW | direct-http-pdf | 200 | summarised-in-ingest |
| FORM12-2021 | DoPPW | direct-http-pdf | 200 | summarised-in-ingest |
| FORMAT9-2021 | DoPPW | direct-http-pdf | 200 | summarised-in-ingest |
| FAQ-CIVIL-2018 | DoPPW | direct-http-pdf | 200 | summarised-as-superseded (used only to document the stale Form 14 instruction) |
| PENSIONER-GUIDELINES | DoPPW | playwright | 200 | summarised-in-ingest |
| RBI2026-MD | RBI | playwright | 200 | summarised-in-ingest |
| PORTAL-TERMS | DoPPW | playwright | 200 | rights-policy-only |
| HACKATHON-BRIEF | Build What Moves India | playwright | 200 | project-policy-only |

Full provenance (final URL, accessed timestamp, document date, SHA-256,
robots status, rights note, scope note) is in
`rag-corpus/source_manifest.csv` and rendered live at `/sources`. PDF page
numbers cited in the ingest briefs were verified against the actual PDF
using `rag-corpus/scripts/extract_pdf_pages.mjs`.

Raw downloaded originals (PDFs, HTML snapshots, `collection_manifest.json`)
are under `rag-corpus/raw_sources_auto/`, confirmed excluded from git via
`git check-ignore`, and are never referenced by the deployable corpus or the
Vertex upload script.

## 6. Retrieval status

### Local (fully built, fully tested — this is what the running app uses today)

`SEVAPATH_RETRIEVAL_ADAPTER` defaults to `local`. The local adapter
(`src/lib/retrieval/local-adapter.ts`) does BM25 ranking with synonym
expansion over `rag-corpus/index/local_index.json` (10 briefs, 43 chunks,
built by `npm run corpus:index` from `rag-corpus/scripts/build_local_index.mjs`),
gated by a minimum-matched-terms rule and a vocabulary-coverage check that
specifically prevents in-domain-vocabulary-but-out-of-corpus-fact questions
(e.g. "What is the commutation factor?") from returning a confident but
unsupported answer. Every answered response carries at least one citation
with an `https` URL, a source title, and an accessed date; passages without
a valid citation are dropped rather than shown.

Evaluated against `rag-corpus/tests/retrieval_eval.jsonl` (30 hand-written
cases: 10 positive, 3 conflicting-sources, 9 unsafe/refused, 4
out-of-scope, 4 insufficient-evidence) via
`npx vitest run tests/retrieval/retrieval_eval.test.ts` — **all cases pass.**

### Vertex / Google ADK (fully coded, credential-blocked — not run against real infrastructure)

`python/sevapath_rag/` contains a complete corpus-upload path
(`corpus.py`, using the current, non-deprecated `agentplatform.Client` API —
verified by reflecting on the installed `google-cloud-aiplatform` 1.165.1
package rather than assumed from training data), a retrieval sidecar
(`service.py`, binds to `127.0.0.1:8081` only, not internet-facing, no
auth, drops uncited passages), and an ADK agent (`agent.py`) that
deliberately uses the deprecated `vertexai.rag.RagResource` type — confirmed
via `inspect.getsource` to be the exact type ADK 2.8.0's
`VertexAiRagRetrieval` tool requires — with an in-code note explaining that
this agent must be given exactly one tool, because Gemini rejects a
built-in retrieval tool combined with other function-declaration tools.

**Verified blocker**: no `~/.config/gcloud/application_default_credentials.json`
exists, `~/.config/gcloud` does not exist, and calling
`google.auth.default()` in the project's own virtual environment raises
`google.auth.exceptions.DefaultCredentialsError`. This was checked directly,
not assumed. Per CLAUDE.md's instruction to never fake cloud success, the
Vertex path is reported here as **blocked on credentials**, not as
completed.

To finish this step once credentials exist:

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=<project-id>
export GOOGLE_CLOUD_LOCATION=<region, e.g. us-central1>
python rag-corpus/scripts/vertex_upload.py           # uploads rag-corpus/ingest/*.md only, then runs a retrieval smoke test
# then run the sidecar and point the app at it:
python -m sevapath_rag.service                        # binds 127.0.0.1:8081
export SEVAPATH_RETRIEVAL_ADAPTER=vertex
export SEVAPATH_VERTEX_RETRIEVAL_URL=http://127.0.0.1:8081/search
```

`--dry-run` on `vertex_upload.py` (no network) confirms exactly which 10
briefs would be uploaded and was used during development in place of a real
upload.

If `SEVAPATH_RETRIEVAL_ADAPTER=vertex` is set but the sidecar is unreachable,
`src/lib/retrieval/index.ts` automatically falls back to the local adapter
and reports `fellBackToLocal: true` rather than showing a hard error to the
citizen.

## 7. Tests, builds, and validation — exact commands and results

All run from the project root immediately before this report was written.

```
npm test
  → Test Files  8 passed (8)
  → Tests       133 passed (133)

npm run lint
  → eslint . --max-warnings=0   (clean, 0 errors, 0 warnings)

npm run typecheck
  → tsc --noEmit                (clean)

npm run build
  → next build (Turbopack)      compiled successfully; 3 static + 4 dynamic routes generated

node rag-corpus/scripts/validate_public_collection.mjs
  → PASS: 11 public sources validated

npm run corpus:index -- --check
  → PASS: index is current (10 briefs, 43 chunks)

(cd python && ../.venv/bin/python -m pytest tests -c pytest.ini)
  → 20 passed, 2 warnings (both are informational deprecation notices about
    vertexai.rag / ADK BaseAgentConfig, not failures — see §6 for why the
    deprecated import is intentional)

git diff --check
  → clean (no whitespace errors)

git status --short
  → all project files untracked (nothing has been committed or staged;
    no push, deploy, or publish has occurred)
```

Test files, by category (matching the required coverage areas):

- `tests/unit/extraction.test.ts` — deterministic + model extraction,
  including the illegible-field and verbatim-verification-failure paths.
- `tests/unit/checks.test.ts` — required-field, identity, and name-consistency
  checks, including the exact-whitespace-only-is-still-identical rule.
- `tests/unit/corpus.test.ts` — every ingest brief's citations resolve, no
  duplicate chunk ids, `RIGHTS_POLICY.md` states raw sources are never
  redistributed, index-build is reproducible.
- `tests/integration/journey.test.ts` — end-to-end scope → route → extract →
  check → assess → checklist → summary → submit, across all three synthetic
  cases and the out-of-scope/blocked paths.
- `tests/retrieval/retrieval_eval.test.ts` — the 30-case eval set in §6.
- `tests/retrieval/adapters.test.ts` — local adapter citation integrity,
  Vertex adapter fallback-to-local and malformed-citation-drop behaviour.
- `tests/ui/journey.test.tsx` — rendered citizen journey, including the
  blocked-claim submit-button-hidden regression test (§8, bug found this
  session).
- `tests/ui/responsive.test.tsx` — 360px layout, 44px tap targets, ARIA live
  regions, reduced-motion support (§8, bug found this session).
- `python/tests/test_config.py`, `test_citations.py`, `test_agent.py`,
  `test_service.py` — Vertex config validation, citation resolution against
  the same frontmatter tables as the TypeScript side, single-tool agent
  constraint, sidecar request/response handling.

## 8. Real bugs found and fixed during this build

1. **Live-looking submit button on a blocked claim.** The server already
   refused to issue a receipt for a `blocked_missing_information` claim, but
   the UI still rendered an enabled "Run the demonstration submission"
   button, which would always fail. Fixed in `JourneyClient.tsx` by
   computing `canPrepare = !unsupported && !blocked` and showing a
   "Not ready to prepare yet" notice instead of the checklist/summary/submit
   controls.
2. **44px touch-target regression.** The guidance panel's suggested-question
   chips (`.suggestion`) had `min-height: 0`, explicitly overriding the
   site-wide accessible tap-target size. Fixed in `globals.css` and the
   responsive test now explicitly enumerates and checks all four interactive
   element classes plus asserts no rule anywhere sets a smaller minimum.
3. **Retrieval false positive on out-of-corpus vocabulary-overlap questions**
   (e.g. "railway pension," "commutation factor table," "dearness relief
   rate," "duplicate PPO processing days") — these score highly against
   Rule 79 passages via BM25 because they share domain vocabulary, but the
   corpus has no answer to the actual question asked. Fixed by adding a
   vocabulary-coverage gate to the local adapter so these now correctly
   return "I could not verify this from the current official corpus."
   instead of a confident but ungrounded answer.
4. Two build/tooling defects were also fixed as part of getting to a clean
   build: an ESLint flat-config circular-JSON crash from `FlatCompat`
   (replaced with the native `eslint-config-next` flat exports), and a
   Turbopack "traces the whole project" build warning caused by a dynamic
   corpus-index-path resolution (replaced with a static default path plus a
   `turbopackIgnore` escape hatch only on the explicit env-var override).

## 9. Known limitations

- Local retrieval is lexical (BM25 + heuristics), not semantic. The
  vocabulary-coverage gate trades a small amount of recall for the safety
  property CLAUDE.md asks for: SevaPath would rather say "I could not
  verify this" than answer confidently from the wrong passage.
- The Vertex/ADK path is implemented and unit-tested against the real
  installed SDKs (via reflection, not assumption) but has never been
  exercised against live Google Cloud infrastructure, because no Application
  Default Credentials are present in this environment. See §6 for the exact
  commands to complete this once credentials are supplied.
- The claimant-name-consistency check is intentionally exact
  (whitespace-normalized string equality only) rather than fuzzy —
  per CLAUDE.md, SevaPath must never resolve a name mismatch itself, only
  flag it for the citizen and PDA to resolve.
- The three synthetic cases are fixed, built-in demonstration data; there is
  no free-text upload path, by design, to keep the non-negotiable "no real
  personal data" boundary structurally enforced rather than policy-enforced.

## 10. Local preview

```bash
npm install     # already done in this environment
npm run dev
# open http://localhost:3000
```

## 11. What was not done, and why

Nothing in the required citizen journey, corpus, or test suite was skipped.
The only incomplete item is the live Vertex AI corpus upload and retrieval
smoke test (§6), which is blocked on Google Cloud Application Default
Credentials that do not exist in this environment. No deployment, publish,
push, or external access change was made or attempted, per CLAUDE.md's
explicit restriction — that remains a separate, user-initiated step.
