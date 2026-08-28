# One goal: finish and release SevaPath before 8:00 PM IST

## Authority and operating mode

The user authorizes you to inspect and modify this existing SevaPath repository,
run its tests, create commits, publish it to a verified user-owned GitHub
repository, and deploy it publicly on the user's authenticated Vercel account.
This is one continuous completion mission. Do not stop after planning and do not
ask routine implementation questions. Make reasonable reversible decisions,
record them, test them, and continue.

You do **not** have authority to invent credentials, reveal secrets, force-push,
delete repositories/deployments, bypass access controls, interact with live
government systems, submit the hackathon form, or fabricate a cloud test. Stop
only for a genuine human-only authentication/ownership blocker or when the goal
is complete.

Deadline: **28 August 2026, 8:00 PM Asia/Kolkata**, no grace period. Freeze new
features by 6:30 PM IST, target production deployment by 7:00 PM, and reserve
the remaining time for video and submission. If later than these targets,
prioritize a stable public P0 journey and truthful submission over additions.

## The product you are finishing

SevaPath is a hackathon prototype that redesigns one narrow Pensioners' Portal
journey: a surviving spouse, already named in a Central Civil Pension Payment
Order, preparing to start family pension after the pensioner's death.

The current primary route represented by the product is Form 12 to the Pension
Disbursing Authority, normally with a death certificate copy and signed Format
9 undertaking. Form 10 is the alternative Head of Office route when the PPO
route does not apply. Form 14 is archived and must not be described as the
current form. Every legal/procedural statement must remain grounded in the
validated official corpus and show a precise source.

The central citizen value is not generic chat or OCR. It is a clearer,
source-linked path that:

1. confirms the narrow scenario;
2. explains the current journey;
3. reads three built-in synthetic records;
4. deterministically compares claim-relevant fields;
5. exposes a name difference such as `Meera Sharma` and `Meera R. Sharma`
   without deciding that they are the same person;
6. produces the correct preparation checklist and review state;
7. answers bounded questions from the official corpus with citations; and
8. ends in a clearly labelled non-official preparation summary, mock submission,
   and mock receipt.

## Non-negotiable safety and honesty

- Synthetic records only. No real uploads or personal identifiers.
- Never request Aadhaar, PAN, real PPO, bank number, OTP, password, payment,
  health, or identity data.
- Never decide eligibility, calculate a pension, confirm identity, resolve a
  mismatch, provide legal advice, or imply government approval.
- Never use government logos, seals, copied layouts, or endorsement language.
- Never call a deterministic fallback "AI" or call local retrieval "Vertex".
- Never claim Google ADK/Vertex was tested unless a real authenticated smoke test
  succeeds and its non-secret evidence is recorded.
- Never redistribute downloaded government originals. Keep raw sources ignored,
  untracked, undeployed, and out of the Vertex corpus. Deploy only concise
  original briefs with links and exact references.
- Do not broaden scraping. Use only the existing allowlist. Respect robots,
  CAPTCHA, rate limits, login boundaries, copyright, and access failures.
- Never commit `.env`, credentials, raw source files, automation logs,
  `node_modules`, build output, or generated cloud tokens.
- Prefer deletion of a weak unverified claim or feature over a rushed patch that
  increases risk.

## Model and agent allocation

The main session runs on **Opus** and owns architecture, prioritization,
integration, irreversible decisions, final acceptance, and the final report.
Use the project specialists rather than asking the user to coordinate them:

- `architecture-critic` (Opus): skeptical architecture/product/safety review.
- `source-rag-auditor` (Sonnet): official evidence, corpus, rights, ADK/Vertex.
- `journey-qa` (Sonnet): functional, browser, mobile, accessibility, stale state.
- `release-verifier` (Sonnet): secrets, GitHub/Vercel, public smoke tests.
- `submission-editor` (Sonnet): README and honest submission materials.

Run the first three audits in parallel when possible because they are read-only.
Do not let multiple agents edit the application concurrently. The Opus
orchestrator consolidates findings, rejects low-value work, then implements and
tests fixes sequentially. Use `submission-editor` only after the build behavior
is stable. Use `release-verifier` after code freeze and again against production.
If a named agent is unavailable, perform that role yourself and record this;
do not stall.

Graphify or any additional graph tool is not required. If an architecture visual
materially helps the submission, create a compact Mermaid diagram in Markdown.
Do not add a dependency merely to draw it.

## Continuous state and recovery

Immediately create or update `claude-handoff/MISSION_STATE.md` with this table:

| Phase | Status | Evidence / blocker |
|---|---|---|
| 0 Inventory and baseline | pending | |
| 1 Parallel audits | pending | |
| 2 P0 fixes | pending | |
| 3 Full validation | pending | |
| 4 Submission materials | pending | |
| 5 GitHub release | pending | |
| 6 Vercel production | pending | |
| 7 Logged-out final QA | pending | |
| 8 Final handoff | pending | |

Use only `pending`, `in_progress`, `passed`, `failed`, or `blocked`. Update it
after every phase with commands, result, commit/deployment identifiers, and
remaining work. This file is the recovery source after a usage limit. Never
restart passed work unless repository state has changed.

Do not write `claude-handoff/FINAL_REPORT.md` until the end. If an older report
exists, treat it as historical evidence, not proof of current completion.

## Phase 0 — inventory and baseline

Inspect what actually exists. This is not a from-scratch build.

1. Record current IST time, Node/npm/Python/Claude versions, current branch,
   HEAD, remotes, `git status --short`, and available package scripts.
2. Read `CLAUDE.md`, relevant `README*`, `package.json`, `.gitignore`, source,
   tests, corpus manifest/ingest/evals, Python/ADK code, `.env.example`, and any
   existing handoff reports. Never read real `.env` values; inspect only which
   variable names the code requires.
3. Preserve user work and the current successful architecture. Do not scaffold
   another app, change framework, or perform broad dependency upgrades.
4. Run the existing baseline checks before editing. Determine the correct
   install command from the lockfile. Capture failures exactly.
5. Inspect the working UI behavior shown by the repository, not screenshots
   alone. Note that an earlier manual test produced an unsupported result when
   the user accidentally answered that family pension had already started.
   That is correct behavior, but the intended primary demo answers are
   **Yes / Yes / Yes / No**.

## Phase 1 — parallel audits and one P0 decision list

Run `architecture-critic`, `source-rag-auditor`, and `journey-qa`. Ask each to
return evidence, severity, and the smallest justified fix. Consolidate them into
`claude-handoff/AUDIT_DECISIONS.md` with four buckets:

- P0 must fix before release
- P1 only if all P0 gates pass and time remains
- accepted limitation to disclose
- rejected/noise

No more than one P1 polish pass. Do not add translation, voice, arbitrary file
upload/OCR, authentication, database, live government integration, additional
pension categories, or unrelated dashboards.

## Phase 2 — implement only P0 fixes

Retain the existing design language unless usability is broken. The final P0
must support:

### Scope and state

- Primary answers `Yes / Yes / Yes / No` proceed.
- If pension already started is `Yes`, show unsupported/recovery guidance.
- Unsupported answers never leak content or outputs from a previously valid
  scenario.
- Changing any input after a result either clears downstream results or clearly
  marks them stale and requires a rerun.
- Steps are numbered consistently and skipped/hidden steps do not create a
  confusing sequence.

### Three synthetic scenarios

- Name variation: `Meera Sharma` vs `Meera R. Sharma` => **review required**;
  show both sources and change neither value.
- All records agree => **ready**.
- Death date unreadable/missing => **blocked by missing information**.

### Complete end-to-end journey

- Source-linked current-route explanation.
- Records and extraction/fallback mode clearly labelled.
- Deterministic findings with source lineage.
- Current Form 12 preparation checklist.
- Human-review acknowledgement where needed.
- Non-official preparation summary.
- Clearly labelled mock submission and mock receipt.
- Bounded RAG Q&A with citation and exact insufficient-evidence response.
- Retrieval/model unavailable states that keep the deterministic journey useful.

### Accessibility and resilience

- 360px viewport without horizontal overflow.
- Semantic headings/landmarks/labels, keyboard operation, visible focus,
  sufficient contrast, readable errors, and reduced-motion support.
- No console errors or hydration failures in the tested journey.
- Direct reload of routes works on production.
- A missing optional API key never crashes the app or build.

### RAG and Google direction

Honor the partner's direction: the repository must contain a clean, validated
RAG corpus plus a real code path/configuration for Google ADK
`VertexAiRagRetrieval`, using current installed official APIs rather than an
invented interface. Keep a tested deterministic local retrieval adapter so the
public demo works without cloud credentials.

If authenticated Google Cloud configuration already exists, upload only the
validated original ingest briefs and run one real retrieval smoke test. If it
does not exist, do not delay P0 or ask for secrets: test the local adapter,
verify the cloud adapter imports/config contract as far as possible, and write
one exact post-hackathon setup section. Mark Vertex `configured, not live-tested`.

## Phase 3 — full validation loop

Discover the repository's actual scripts and run the complete relevant suite.
At minimum, where applicable:

```bash
node rag-corpus/scripts/validate_public_collection.mjs
npm run lint
npm test
npm run build
python3 -m pytest
git diff --check
git status --short
```

Use Playwright for browser journeys. Start the production build locally, not
only the development server, and test:

1. primary mismatch flow `Yes / Yes / Yes / No` through mock receipt;
2. all-agree flow;
3. missing-date blocked flow;
4. already-started unsupported flow;
5. change an answer after results and rerun;
6. every common RAG question;
7. unsafe amount/eligibility request refusal;
8. insufficient evidence response and valid source link;
9. 360x800 mobile viewport and keyboard-only navigation;
10. no horizontal overflow, console error, failed application request, or
    accidental external submission.

For each failure: reproduce, identify root cause, implement the smallest fix,
rerun the focused test, then rerun the full affected suite. Continue until all
P0 gates pass. Do not weaken/delete a meaningful test to obtain green output.

## Phase 4 — release and submission materials

After P0 is green, run `submission-editor` and verify its work. Create/update:

- `README.md`: problem, exact current-government journey, solution, demo,
  architecture, local setup, RAG, safety, limitations, tests, deployment URL.
- `docs/ARCHITECTURE.md`: compact Mermaid flow and deterministic/model boundary.
- `docs/CODEX_USE.md`: truthful meaningful Codex contribution—problem research,
  scope decision, safety architecture, RAG/source plan, validation criteria, and
  automation specification. State Claude Code's implementation/review role and
  disclose other meaningful tools. Never misattribute code.
- `submission/PROJECT_SUMMARY.md`: final summary **under 250 words**, with an
  explicit word count.
- `submission/DEMO_SCRIPT_2_MIN.md`: timed 0:00–2:00 script; first minute citizen
  experience, second minute build/product/safety choices.
- `submission/JUDGE_QA.md`: sharp answers about evidence, Form 12 vs Form 14,
  RAG, AI role, privacy, limitations, public-service improvement, and what is
  mocked.
- `submission/SUBMISSION_CHECKLIST.md`: public URL, repo URL, video URL blank for
  user, teammate email blank if needed, summary word count, final form checkbox.
- `submission/VIDEO_SHOT_LIST.md`: exact clicks and expected screens, optimized
  for one clean recording under two minutes.

Only describe features verified in this release. Create screenshots only when
they improve README/submission and contain synthetic data. Do not spend P0 time
on decorative assets.

## Phase 5 — safe GitHub release

Before staging anything:

1. Search tracked and untracked candidate files for credential patterns without
   printing secret values. Confirm raw sources, logs, `.env`, build output,
   dependencies, screenshots with personal information, and cloud credentials
   are ignored/untracked.
2. Review `git diff` and ensure automation did not overwrite unrelated user
   changes. Preserve them or document them; never discard them.
3. Run all final validation and record exact results.
4. Create a normal release commit with a clear message. Never amend or rewrite
   existing history merely for neatness.

Resolve the target safely:

- Run `gh auth status` and obtain the authenticated account name without
  exposing tokens.
- Inspect `git remote -v`. If `origin` exists, verify it belongs to the intended
  authenticated user and is the SevaPath repository. If ownership/target is
  ambiguous, stop with `HUMAN_ACTION_REQUIRED`; do not overwrite or change it.
- If no remote exists and GitHub CLI is authenticated, create a new public
  repository named `sevapath` (or a non-conflicting close variant) under that
  account using `gh repo create --source=. --public --remote=origin --push`.
- If the correct remote exists, push the current main branch normally. Never
  force-push. If project settings deny `git push`, you may remove only that
  specific deny entry after target verification because this mission explicitly
  authorizes the verified release; retain all other safety denies.
- Verify the remote branch and capture the exact repository URL and commit SHA.

## Phase 6 — Vercel production deployment

1. Confirm `npx vercel whoami` succeeds without revealing tokens.
2. Check framework/build detection and required environment variable names.
   Do not upload secrets from local files. The deterministic fallback must make
   the public demo usable without optional model/cloud keys.
3. Link/import the verified GitHub repository when possible and deploy production
   using the authenticated account. Prefer Git integration so future pushes
   redeploy automatically. If CLI linking is the available route, run the
   appropriate non-destructive `vercel --prod` command.
4. Capture the canonical production URL and deployment result. A preview URL,
   password-protected deployment, localhost, or owner-only URL is not acceptable.
5. Update README/submission files with the verified URLs, commit, push, and let
   Vercel deploy the final exact commit. Do not create a circular unverified
   documentation change: verify the final commit and deployment again.

Authentication absence is a valid human blocker. A build failure is not: fix it.

## Phase 7 — logged-out production acceptance

Run `release-verifier` against the final public URL. Also independently verify:

- HTTP success and correct title/metadata;
- no login or access-request page;
- primary mismatch journey reaches mock receipt;
- local/source-linked RAG fallback answers a supported question;
- unsafe question is refused;
- mobile viewport works;
- direct reload works;
- source links are correct and no private/local URL is exposed;
- footer/disclaimer clearly says prototype, synthetic data, not official;
- deployed commit matches the recorded GitHub commit.

If production differs from local, fix, commit, push, redeploy, and repeat. Never
mark complete from a successful local build alone.

## Phase 8 — authoritative finish

Write `claude-handoff/FINAL_REPORT.md` only now.

The first line must be exactly one of:

```text
MISSION_STATUS: COMPLETE
```

or

```text
MISSION_STATUS: HUMAN_ACTION_REQUIRED
```

Use `COMPLETE` only if all P0 tests/builds pass, the intended citizen journey
works end-to-end, the GitHub release exists, the Vercel URL is publicly usable
logged out, submission materials exist, and the result is truthful.

The report must contain:

- current IST completion time;
- one-paragraph outcome;
- GitHub repository URL, branch, and commit SHA;
- final public Vercel URL and deployed commit;
- architecture and citizen journey;
- exact P0 changes made and why;
- source/RAG status, collection dates, and Vertex truth state;
- every test/build/deployment command with pass/fail result;
- production acceptance evidence;
- security, privacy, rights, and sensitive-data checks;
- accepted limitations;
- files created for submission;
- exactly what the user must do: record/upload the two-minute video and submit
  the form before 8 PM, plus teammate email only if applicable.

For `HUMAN_ACTION_REQUIRED`, name one genuine blocker, include evidence, and give
the single smallest user action needed. Do not use it for code/test failures you
can fix. Keep `MISSION_STATE.md` accurate so rerunning the same controller
continues instead of restarting.

## Final acceptance checklist

Do not finish until every applicable item is proved:

- [ ] Existing project preserved; no second app scaffolded.
- [ ] P0 audit decisions resolved.
- [ ] Yes/Yes/Yes/No mismatch flow reaches mock receipt.
- [ ] Ready, review, blocked, unsupported, retrieval unavailable, and fallback
      states tested.
- [ ] Stale-state bug tested after changing answers.
- [ ] RAG answers cite validated official briefs.
- [ ] Unsafe and insufficient-evidence questions handled safely.
- [ ] Form 12 current route and Form 14 archive warning are accurate.
- [ ] Raw official documents and credentials absent from Git/deployment.
- [ ] Lint, unit/integration/retrieval/browser tests, build, and diff checks pass.
- [ ] 360px, keyboard, focus, and reduced-motion checks pass.
- [ ] README and all submission files describe only verified behavior.
- [ ] Codex and Claude contributions disclosed truthfully.
- [ ] GitHub repository is public and exact commit recorded.
- [ ] Vercel production URL is public logged out and exact commit verified.
- [ ] `FINAL_REPORT.md` has one valid mission status.

Proceed now. Inventory first, checkpoint continuously, delegate the audits, and
keep working until the single goal is achieved or a genuine authentication or
ownership blocker is documented.
