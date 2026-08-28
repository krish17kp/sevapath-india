# Build SevaPath completely from scratch

You are the sole implementation agent for this hackathon project. Build the
entire working project inside the current folder. There is deliberately no
starter website. Follow `CLAUDE.md` and do not stop after producing a plan.
Inspect, research, implement, test, repair, and document the complete local
result. Ask the user only when an external credential or external write is
unavoidably required.

## 1. Initialize the project

1. Confirm the current directory contains `CLAUDE.md`, `.claude/`,
   `claude-handoff/`, and `rag-corpus/`.
2. If this is not a Git repository, run `git init` and create a main branch.
3. Create the web application directly in this folder, not inside another
   nested directory.
4. Use a current stable React and TypeScript stack that supports a production
   browser build and server API routes. Prefer the least complex architecture
   that can be deployed publicly before the hackathon deadline.
5. Add scripts for development, linting, tests, and production build.
6. Create `.env.example` with names only. Never create real credentials.

## 2. Build the citizen experience

Create a polished, mobile-responsive portal named **SevaPath** with the clear
disclaimer that it is a hackathon prototype and not an official government
service.

The complete primary journey must include:

1. Scope confirmation for a surviving spouse already named in a Central Civil
   PPO.
2. A short plain-language explanation of the current Pensioners' Portal journey.
3. Three built-in synthetic records: PPO, death certificate, and bank proof.
4. Structured field extraction with a deterministic no-key fallback.
5. Deterministic cross-document checks for required fields and consistency.
6. A visible example mismatch such as `Meera Sharma` versus
   `Meera R. Sharma`, requiring human review without changing either value.
7. A source-linked guidance panel backed by the RAG corpus.
8. A preparation checklist for the current Form 12 route.
9. A generated non-official claim-preparation summary.
10. A clearly labelled mock submission and mock receipt.

Required states:

- ready
- review required
- blocked by missing information
- retrieval unavailable
- unsupported scenario
- model unavailable with deterministic fallback

The interface must work at 360 px, support keyboard navigation, visible focus,
semantic labels, reduced motion, and clear error messages. Do not add real file
uploads or ask for personal data.

## 3. Collect authoritative public sources

1. Check the supplied `rag-corpus/config/public_sources.json` before network
   access. Do not automatically broaden it.
2. Install Playwright locally when missing and install Chromium using the
   official Playwright command.
3. Run the supplied collector and validator:

   ```bash
   node rag-corpus/scripts/collect_public_sources.mjs
   node rag-corpus/scripts/validate_public_collection.mjs
   ```

4. Use Playwright first for HTML. Use direct HTTP downloads for PDFs. If
   Playwright fails, fall back to Node `fetch`, then `curl -L --fail --retry 2`.
5. Log the successful method, final URL, response type, timestamp, byte count,
   and SHA-256 checksum for every source.
6. Respect robots instructions, access blocks, redirects, and rate limits.
7. Do not bypass a block or reuse stale data while calling it current.
8. Keep originals only in ignored `rag-corpus/raw_sources_auto/`.

## 4. Verify and build the RAG corpus

1. Extract the relevant content accurately. Use a dependable PDF parser and
   verify important passages against page numbers in the original PDF.
2. Create `rag-corpus/source_manifest.csv` with issuer, title, requested URL,
   final URL, access time, document date when available, checksum, collection
   method, corpus status, rights note, and scope note.
3. Create short, original, source-linked Markdown briefs under
   `rag-corpus/ingest/`. These files, and only these files, are eligible for
   Vertex upload.
4. Verify at minimum:
   - Form 12 for a spouse or co-authorised family member named in the PPO
   - Form 10 as the alternative Head of Office route
   - Format 9 bank undertaking
   - CCS Pension Rules 2021 Rule 79 flow
   - relevant RBI Government Pension Payment Directions 2026 bank handling
   - Form 14 archived/current-route warning
5. Every factual instruction must cite the official title, URL, issuer, accessed
   date, and exact rule, form, paragraph, or page when available.
6. Prefer current law and current forms over older FAQs. Remove or label any
   claim that cannot be verified.
7. Create a rights policy explaining why raw documents are not redistributed.

## 5. Implement retrieval

1. Create a deterministic local retrieval adapter over `rag-corpus/ingest/` so
   the demo works without cloud credentials.
2. Create a production adapter for Google ADK and Vertex AI RAG using the
   current installed official SDK APIs. Check the actual package documentation
   or installed API before writing calls. Do not invent interfaces.
3. Keep the ADK `VertexAiRagRetrieval` tool isolated as required by the current
   ADK limitation when applicable.
4. If valid Google authentication and a project are already available, create
   or reuse one clearly named corpus, upload only the validated ingest briefs,
   and perform a real retrieval smoke test.
5. If credentials are missing, complete and test the local adapter, leave the
   cloud adapter configured behind environment variables, and report the exact
   setup commands. Do not claim Vertex was tested.
6. Retrieval answers must contain the official source URL and rule/form
   reference. When evidence is insufficient, answer exactly:
   `I could not verify this from the current official corpus.`
7. Never let retrieval decide eligibility, calculate pension, merge identity
   values, or override deterministic validation.

## 6. Tests

Add unit, integration, and retrieval evaluation tests. Cover at least:

- exact matching records
- middle-initial name variation requiring review
- missing death date blocking preparation
- current Form 12 route retrieval
- Form 10 alternative route retrieval
- Form 14 archived warning
- refusal to calculate pension amount
- refusal to decide eligibility
- insufficient evidence response
- valid official citation on supported answers
- deterministic fallback without an API key
- responsive rendering without horizontal overflow

Create `rag-corpus/tests/retrieval_eval.jsonl` with positive, conflicting,
out-of-scope, unsafe, and insufficient-evidence cases.

## 7. Validate and finish

Run the full relevant suite repeatedly until it passes. At minimum run:

```bash
node rag-corpus/scripts/validate_public_collection.mjs
npm run lint
npm test
npm run build
git diff --check
git status --short
```

Also run Python validation/tests if the implementation contains Python.

Confirm that raw sources, logs, build output, credentials, and `.env` files are
ignored and untracked. Do not deploy, publish, push, commit, or change external
access controls.

Finally write `claude-handoff/FINAL_REPORT.md` containing:

- architecture and citizen journey
- exact files created
- official sources collected and any failures
- collection method per source
- corpus design and source hierarchy
- local and Vertex retrieval status
- every test/build command and result
- known limitations and safety boundaries
- exact local preview command
- exact Google Cloud setup/upload command when still needed
- exact next deployment steps, without performing them

Finish only when the complete local website and report exist, or when a genuine
external credential blocker prevents only the cloud-specific portion.

