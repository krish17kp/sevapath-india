# Codex continuation mission: finish SevaPath without losing Claude's work

## Single goal

Continue the existing SevaPath repository from the exact filesystem state left
by Claude Code. Preserve and verify Claude's uncommitted fixes, finish the final
validation, create truthful hackathon submission materials, publish the verified
repository to GitHub, deploy the exact passing commit publicly on Vercel, test
production logged out, and leave one authoritative final report.

Do not rebuild the application. Do not restart the research. Do not run the old
Claude finalizer again. Do not stop after producing a plan. Work continuously
through the gates below, using checkpoints so the job can resume safely.

Deadline context: the hackathon deadline is 28 August 2026 at 8:00 PM
Asia/Kolkata. Stability, a truthful public P0 journey, the two-minute video, and
the actual submission are more important than additional features.

## What the captured Claude log says happened

Treat this as handoff evidence to verify against the repository, not as truth to
accept blindly.

### Before Claude's finalizer

- The project was an existing Next.js/TypeScript application with Python
  Google ADK/Vertex support and a local RAG fallback.
- Git reportedly had zero commits and no remote.
- GitHub CLI was authenticated as `krish17kp`, using HTTPS, with repository
  access.
- Vercel CLI 59.9.1 was installed through `npx` but was logged out.
- Baseline checks passed with 133 Vitest tests and 20 Python tests.
- All 11 allowlisted official sources returned HTTP 200.
- No Google application-default credentials existed, so Vertex could not be
  live-tested.

### Audits Claude completed

Claude ran architecture, source/RAG, and browser/journey audits. The important
findings were:

1. **P0 Form 10 contradiction:** the Form 10 Head of Office route generated
   Form 12/Pension Disbursing Authority next steps and receipt text.
2. **P0 retrieval polarity:** local retrieval ranked Form 10 for a person named
   in the PPO and Form 12 for a person not named in the PPO because negation was
   ignored.
3. **P0 async race/stale response risk:** a delayed assessment response could
   render after the user switched scenario.
4. **P1 field verification:** model extraction checked whether a value appeared
   anywhere in a record rather than matching the correct labelled field.
5. **P1 conditional numbering:** unsupported/blocked journeys skipped visible
   step numbers.
6. **P1 ready-state wording:** the deterministic fallback system state could
   outrank the underlying ready result.
7. **P1 co-authorisation check:** any non-null value could be treated as
   authorised.
8. **P1 corpus accuracy:** one Form 10 brief cited Rule 79(5)(a) instead of Rule
   80(5)(a); one RBI paraphrase strengthened "may" into "are to"; one FAQ
   sentence was near-verbatim without clear quotation treatment.
9. **P1 Vertex configuration documentation:** the retrieval environment variable
   is a base URL; appending `/search` in the environment value would produce
   `/search/search`.

Claude's audits also found that the core deterministic boundary, refusal logic,
synthetic data labelling, server-side reassessment, fallback behavior, citation
integrity, raw-source isolation, Next.js file tracing, and installed ADK/Vertex
API signatures were sound.

### Changes Claude reported implementing

The log says Claude then made targeted fixes for the findings above, including:

- deterministic route-polarity reranking with route-aware tests;
- Form 10-specific worksheet and mock-receipt instructions;
- async response/race protection and state invalidation in `JourneyClient`;
- computed step numbers and route-aware headings/gates;
- unsupported-scope records gate;
- ready-state handling adjustment;
- model field-level corroboration;
- stricter co-authorisation validation;
- the three corpus wording/reference corrections;
- clarification of the Vertex base URL environment setting;
- rebuilt local corpus index;
- new/updated regression tests, including the Form 10 receipt.

Claude reported **148 passing Vitest tests** after these changes. It then began
the full validation sweep and hit the Claude session limit. It did not reach
README/submission creation, GitHub release, Vercel deployment, production QA, or
a valid final report.

## Non-negotiable safety and product boundaries

- Synthetic records only. Never add real upload or ask for Aadhaar, PAN, real
  PPO, bank number, OTP, password, payment, health, or identity data.
- Never determine legal eligibility, calculate pension, certify identity,
  resolve a name mismatch, provide legal advice, or imply a real submission.
- Never use government logos, seals, copied layouts, or endorsement language.
- Form 12 is the current primary route represented for a spouse already named
  in the PPO. Form 10 is the alternative Head of Office route. Form 14 is
  archived. Every procedural claim must remain linked to validated corpus
  evidence.
- Deterministic code owns routing, validation, state, and blocking. Retrieval or
  models may only extract, retrieve, cite, and explain.
- Do not call the local fallback Vertex, AI generation, or a live cloud test.
- Vertex/ADK status must remain: a real configured code path and agent
  definition, checked against installed SDK APIs, but no live corpus test because
  Google credentials are absent.
- Never commit or deploy raw government files. Only original source-linked briefs
  under the approved ingest directory may enter the deployable corpus.
- Do not broaden crawling or add new sources unless an existing verified claim
  is otherwise impossible to validate. Respect robots, access controls, rate
  limits, and copyright.
- Do not add translation, voice, real OCR/upload, authentication, database, live
  government integration, new pension categories, dashboards, or cosmetic
  redesign. Those are deadline-damaging scope expansion.

## Git and filesystem preservation rules

The working tree contains valuable uncommitted work. Before editing:

1. Run and record:

   ```bash
   pwd
   git status --short --branch
   git log --oneline --decorate -10
   git remote -v
   git diff --stat
   git diff
   git diff --cached
   git ls-files
   ```

2. Inspect untracked files by name and purpose. Do not print secret values.
3. Read `CLAUDE.md`, `claude-handoff/FINISH_MISSION.md`,
   `claude-handoff/MISSION_STATE.md`, `claude-handoff/AUDIT_DECISIONS.md`, all
   available audit reports, `package.json`, `.gitignore`, `.env.example`, source
   changes, test changes, corpus changes, and Python changes.
4. Compare the real diff with the handoff claims above. If a claimed fix is
   absent or partial, treat that as a verified task. If it exists and its test
   passes, do not rewrite it.
5. Look for temporary Claude audit artifacts such as `journey-*-scratch.mjs`,
   debug scripts, raw logs, screenshots, agent memory, or finalizer-kit files.
   Preserve useful audit reports but keep temporary/debug/automation artifacts
   out of the release commit and deployment.
6. Never use `git reset --hard`, `git clean`, force checkout, force push,
   recursive deletion, rebase, amend, or history rewriting.

### Required rescue checkpoint

Before making new implementation changes:

1. Run the security/secret and unwanted-file checks described below.
2. Ensure ignored content includes real `.env` files, raw sources, logs,
   `node_modules`, `.next`, caches, `.claude/agent-memory*`, temporary audit
   scripts, and the downloaded automation kits.
3. Review exactly what would be staged using `git status` and `git diff --cached`.
4. If the repository truly has no commits, create the first local checkpoint
   commit containing the legitimate current project and Claude's verified fixes:
   `checkpoint: preserve verified Claude handoff before Codex finalization`.
5. If a valid commit now exists, create an equivalent non-destructive checkpoint
   commit only for the uncommitted Claude changes.
6. Do not push the checkpoint until the full suite passes and the target remote
   is verified.

This checkpoint is mandatory. It provides a rollback boundary between Claude's
work and any later Codex changes.

## Agent use

Keep the main Codex thread responsible for decisions, application edits,
integration, commits, deployment, and final acceptance. Delegate only bounded,
independent, read-only work:

- Subagent 1: inspect the uncommitted Claude diff against the audit reports and
  identify missing, incorrect, or risky changes with file references.
- Subagent 2: run/inspect the test matrix and browser acceptance coverage; report
  reproducible failures without editing application source.
- Subagent 3, after code freeze: review README/submission claims against actual
  behavior and identify any false or unsupported statement.

Wait for the relevant subagents and integrate their findings yourself. Do not
allow multiple agents to edit application files concurrently. Do not delegate
GitHub or Vercel ownership decisions.

## Phase 1: verify the handoff, do not redo it

### 1A. Baseline the current post-Claude state

Discover the actual package scripts and environment. Run at least:

```bash
node rag-corpus/scripts/validate_public_collection.mjs
npm run lint
npm run typecheck
npm test
npm run build
cd python && python3 -m pytest -q
git diff --check
```

Use the correct working directory for Python tests. Capture complete failures,
not only truncated `tail` output. If the tests report 148 passing, confirm the
test count and names. If the count differs, explain why from repository state.

### 1B. Verify every reported fix

Do not rely only on green tests. Inspect the relevant implementation and prove:

- Named-in-PPO query routes to Form 12; explicitly not-named query routes to
  Form 10; negation and route polarity are tested.
- Form 10 worksheet and mock receipt never instruct Form 12 or the Pension
  Disbursing Authority. They use only corpus-grounded Head of Office guidance.
- Primary Form 12 worksheet/receipt remains correct.
- Switching scope/scenario during an in-flight assessment cannot show an old
  result after the response returns.
- Changing any answer clears/invalidates downstream result and mock receipt.
- Unsupported scope cannot expose synthetic records/preparation from a prior
  supported state.
- All-agree is ready; name variation is review-required; missing death date is
  blocked; already-started is unsupported.
- Model extraction cannot replace a missing required field with a value from a
  different labelled line on the same record.
- Co-authorisation passes only an affirmative authorised value.
- Step numbering is understandable on supported, blocked, and unsupported paths.
- Corpus index contains the corrected citations/wording and retrieval tests use
  the rebuilt index.
- `SEVAPATH_VERTEX_RETRIEVAL_URL` is documented as a base URL without `/search`.

If a reported fix fails, reproduce it, identify root cause, make the smallest
patch, add/strengthen the regression test, and rerun the focused plus full suite.
Do not weaken tests to obtain green output.

## Phase 2: production-like browser acceptance

Start the successful production build locally on an unused port. Use Playwright
or the repository's browser test setup. Test at minimum:

1. Primary demo: Yes / Yes / Yes / No, name variation, review acknowledgement,
   preparation summary, mock submission, mock receipt.
2. All-records-agree path reaches ready and mock receipt.
3. Missing/unreadable death date is blocked from submission.
4. Pension-already-started is unsupported and shows the correct recovery route.
5. Name-not-in-PPO reaches the Form 10 path with no Form 12/PDA contradiction.
6. Change inputs immediately after starting assessment and verify stale response
   cannot render.
7. Supported RAG questions return the correct route and an official HTTPS
   citation.
8. Amount, eligibility, identity, and real-submission requests are refused.
9. Insufficient evidence returns the exact safe response specified by the app.
10. Missing optional model/cloud keys use the labelled deterministic/local
    fallback without crash.
11. 360x800 viewport has no horizontal overflow; keyboard navigation, focus,
    semantic labels, and reduced motion work.
12. No hydration error, unexpected console error, failed application request,
    localhost/private link leak, or real external submission occurs.

Store durable browser tests under `tests/` only when they provide regression
value. Keep one-off diagnostics outside the release tree or remove them safely.

## Phase 3: security, privacy, rights, and release-tree audit

Before any commit or push:

- Inspect candidate filenames for `.env`, keys, tokens, credentials, service
  account JSON, cookies, browser profiles, and personal data. Do not print secret
  contents.
- Search source text for credential patterns using redacted/count-only output.
- Confirm `rag-corpus/raw_sources_auto/`, `claude-handoff/logs/`, `.next/`,
  `node_modules/`, caches, virtual environments, agent memories, audit scratch
  scripts, and downloaded finalizer/continuation kits are ignored or excluded.
- Confirm only concise original ingest briefs, manifest/index data, source links,
  and the rights policy are releasable.
- Confirm no government logo/seal, copied portal design, false endorsement, or
  unlicensed asset is included.
- Confirm the application never requests or stores sensitive citizen data.

Do not expose secrets in terminal output, reports, README, Git history, or
Vercel configuration.

## Phase 4: create truthful submission materials

After code and behavior are frozen, create or update:

1. `README.md`
   - exact problem and government journey;
   - current portal limitation SevaPath improves without claiming the portal
     caused all pension delays;
   - verified features and demo flow;
   - architecture and deterministic/model boundary;
   - local setup and test commands;
   - RAG corpus/source/rights approach;
   - safety and limitations;
   - GitHub and production links after verified.

2. `docs/ARCHITECTURE.md`
   - compact Mermaid flow;
   - browser/API/domain/retrieval/corpus/optional Vertex boundaries;
   - deterministic decisions versus retrieval/model responsibilities.

3. `docs/CODEX_USE.md`
   - truthful meaningful Codex role: continuation from Claude, diff audit,
     validation, any targeted fixes, submission materials, release, deployment,
     and production QA;
   - truthful Claude role: initial implementation, audits, and the reported P0/P1
     fixes;
   - earlier Codex/ChatGPT role: research, scope, safety/RAG plan, and handoff
     design;
   - disclose other meaningful tools. Never claim Codex wrote code it did not.

4. `submission/PROJECT_SUMMARY.md`
   - under 250 words;
   - include an explicit verified word count;
   - describe only functionality that passed production QA.

5. `submission/DEMO_SCRIPT_2_MIN.md`
   - timed 0:00 to 2:00;
   - first minute: citizen journey;
   - second minute: build choices, source-linked RAG, deterministic safety,
     synthetic data, and limitations.

6. `submission/VIDEO_SHOT_LIST.md`
   - exact clicks: Yes/Yes/Yes/No, name mismatch, review, claim pack, mock
     receipt, one source-cited question;
   - expected screen/result at each step;
   - fit one clean recording under two minutes.

7. `submission/JUDGE_QA.md`
   - why this is a government-website journey improvement;
   - evidence and limits of the problem claim;
   - Form 12 vs Form 10 vs archived Form 14;
   - what AI/RAG actually does;
   - why deterministic validation is used;
   - privacy, copyright, Vertex status, mocks, and future work.

8. `submission/SUBMISSION_CHECKLIST.md`
   - verified public URL;
   - verified GitHub URL;
   - video URL blank for the user;
   - teammate registered email blank if applicable;
   - summary word count;
   - final logged-out link checks;
   - submit-before-8-PM checkbox.

Mandatory wording constraints:

- Do not describe the public demo as generative AI if it runs deterministic
  extraction and local retrieval without an API key.
- Say: "deterministic document checks plus source-linked retrieval".
- Say Vertex/ADK is "configured and unit-tested against installed SDK APIs, not
  live-tested against a cloud corpus" unless real credentials and a real smoke
  test are later available.
- Do not claim name mismatch is a leading cause of delay or that the Pensioners'
  Portal caused all family-pension delays.
- Do not call mock submission real, official, approved, or connected.

## Phase 5: final local release gate

Run the complete suite again after documentation and release-tree changes:

```bash
node rag-corpus/scripts/validate_public_collection.mjs
npm run lint
npm run typecheck
npm test
npm run build
cd python && python3 -m pytest -q
git diff --check
git status --short --branch
```

Re-run the production browser smoke tests. Record commands, exit codes, test
counts, build result, and accepted warnings. A warning is acceptable only when
understood and disclosed. Do not call the project complete with a failing test,
build, route, or browser flow.

## Phase 6: GitHub publication

The captured log says GitHub is authenticated as `krish17kp`, but verify again:

1. Run `gh auth status` without exposing the token.
2. Resolve the authenticated username using non-secret output.
3. Inspect all Git remotes. If an `origin` exists, verify it belongs to the
   intended account and is this SevaPath repository. Never overwrite an
   ambiguous or unrelated remote.
4. Review the final staged file list and diff. Ensure no secrets/raw/logs/kits/
   caches are present.
5. Create a normal final release commit after the rescue checkpoint. Do not
   amend, squash by history rewrite, or force push.
6. If no remote exists, create a public repository under `krish17kp` named
   `sevapath` or a non-conflicting close variant using GitHub CLI and push the
   verified main branch.
7. If the correct remote exists, push normally. Never force push.
8. Verify the remote branch, repository visibility, exact commit SHA, and public
   repository URL.

If a project permission file still denies `git push`, do not broadly weaken
security. After target ownership is verified, request approval for that exact
push or remove only the narrow conflicting rule if the user's explicit release
authorization permits it.

## Phase 7: Vercel production deployment

The captured log says Vercel was logged out. The user should run
`npx vercel login` before this mission. Still verify with `npx vercel whoami`.

1. If authenticated, link/import the verified GitHub repository into the user's
   Vercel account and prefer Git integration for future deployments.
2. Inspect the Next.js build configuration and required environment variable
   names. Do not upload local secrets. Optional model/cloud keys must remain
   optional; public fallback must work with none.
3. Deploy the exact passing commit to production.
4. Capture deployment output, canonical URL, and linked Git commit.
5. Confirm the URL is public. A preview, temporary claim URL, password-protected
   deployment, access-request page, localhost, or owner-only deployment is not
   acceptable.
6. Update README/submission files with the verified final URLs. Commit and push
   those documentation changes, let Vercel deploy the exact new commit, then
   verify again. Avoid claiming an earlier commit is final after links changed.

If Vercel is still unauthenticated, finish all code, docs, tests, and GitHub work
first, then write `HUMAN_ACTION_REQUIRED` with the single action
`npx vercel login`. Do not fake or substitute a temporary deployment.

## Phase 8: logged-out production acceptance

Against the final canonical production URL, verify from a fresh/logged-out
browser context:

- HTTP success, correct title, description, and social metadata;
- no authentication/access-request page;
- direct reload of `/` and `/sources`;
- primary Yes/Yes/Yes/No mismatch journey reaches mock receipt;
- all-agree, blocked, unsupported, and Form 10 paths behave correctly;
- supported RAG question returns correct official citation;
- unsafe request is refused;
- 360px mobile and keyboard interaction work;
- no console/hydration/application-request errors;
- no private, filesystem, localhost, or credential string is exposed;
- disclaimer clearly states hackathon prototype, synthetic data, not official;
- deployed commit equals the final GitHub commit.

If production differs from local, reproduce, patch minimally, test, commit,
push, redeploy, and repeat. Local success alone is not release completion.

## Continuous checkpoint file

Update `claude-handoff/CODEX_MISSION_STATE.md` after every phase:

| Phase | Status | Evidence / blocker |
|---|---|---|
| 0 Inspect and rescue checkpoint | pending | |
| 1 Verify Claude fixes | pending | |
| 2 Production-like browser QA | pending | |
| 3 Security/rights audit | pending | |
| 4 Submission materials | pending | |
| 5 Final local release gate | pending | |
| 6 GitHub publication | pending | |
| 7 Vercel production | pending | |
| 8 Logged-out production QA | pending | |
| 9 Final handoff | pending | |

Use only `pending`, `in_progress`, `passed`, `failed`, or `blocked`. Include exact
commands, test counts, commit SHA, repository URL, deployment URL, and remaining
work. If Codex is interrupted, resume from this file and current Git state. Do
not repeat passed work unless the repository changed afterward.

## Final report and definition of done

At the end, write `claude-handoff/CODEX_FINAL_REPORT.md`. Its first line must be
exactly one of:

```text
MISSION_STATUS: COMPLETE
```

or:

```text
MISSION_STATUS: HUMAN_ACTION_REQUIRED
```

Use `COMPLETE` only when all of these are proved:

- Claude's current changes were preserved and checkpointed.
- Every reported P0 fix was independently verified.
- Full TypeScript, corpus, Python, build, diff, and browser suites pass.
- Primary and failure journeys work in production.
- Security, privacy, copyright, and raw-source checks pass.
- README and every submission file exist and are truthful.
- Public GitHub repository exists at the recorded commit.
- Public Vercel production URL works logged out at the same final commit.
- No feature or integration is overstated.

The final report must include:

- current IST completion time;
- concise outcome;
- rescue checkpoint commit;
- final GitHub URL, branch, and commit SHA;
- final Vercel URL and deployed commit;
- exact files changed by Claude versus Codex where reasonably attributable;
- every validation command and result/test count;
- production acceptance evidence;
- RAG/source/rights status;
- honest Vertex/ADK status;
- privacy/security result;
- accepted limitations;
- submission material paths;
- exactly two remaining user actions: record/upload the prepared two-minute
  video and submit the hackathon form before the deadline, plus teammate email
  only if applicable.

Use `HUMAN_ACTION_REQUIRED` only for a genuine credential, account ownership, or
external form/video action Codex cannot perform. Name one blocker and the single
smallest user action. Do not use it for a code/test/build failure you can fix.

## Start now

First inspect the real working tree and handoff files. Preserve everything.
Create the mission-state file. Use read-only subagents for diff and test review.
Verify Claude's fixes, establish the rescue checkpoint, and continue through
release without reopening completed research or expanding scope.
