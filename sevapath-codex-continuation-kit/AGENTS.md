# SevaPath repository rules for Codex

## Purpose

Finish and release the existing SevaPath hackathon prototype. This repository
already contains a working Next.js/TypeScript application, tests, a validated
RAG corpus, and Python Google ADK/Vertex scaffolding. Continue it; never scaffold
a second application or replace the architecture.

## Preservation

- Treat every current tracked and untracked source change as user/Claude work.
- Never run `git reset --hard`, `git clean`, force checkout, force push, history
  rewrite, recursive deletion, or broad formatting.
- Inspect `git status`, staged diff, unstaged diff, and untracked files before
  editing. Do not assume the pasted log equals the filesystem.
- Create a reviewed local checkpoint commit before new implementation work.
- Never modify or commit real `.env` files, credentials, raw downloaded sources,
  automation logs, `node_modules`, `.next`, caches, or temporary audit scripts.

## Product boundary

- Synthetic records only. No uploads or real personal identifiers.
- Do not decide eligibility, calculate pension, confirm identity, resolve name
  mismatches, provide legal advice, or imply government submission/endorsement.
- Form 12 is the primary Pension Disbursing Authority route for the narrow named
  spouse scenario. Form 10 is the alternative Head of Office route. Form 14 is
  archived and must not be presented as current.
- Deterministic code owns routing, required fields, mismatch checks, state, and
  submission blocking. Retrieval/model code may only extract, retrieve, cite,
  and explain within those boundaries.
- Public production must work without Anthropic, Google, or Vertex credentials
  using the clearly labelled deterministic reader and local citation retrieval.
- Vertex/ADK is configured and unit-tested against installed APIs, not live-tested.
  Never claim otherwise.

## Change discipline

- Fix verified P0 problems only. Do not add translation, voice, authentication,
  database, arbitrary OCR/upload, live government integration, more pension
  categories, dashboards, or decorative redesign.
- Use parallel subagents only for read-only review, testing, or documentation
  analysis. Only the main agent edits application source and integrates changes.
- Prefer the smallest targeted patch. Add a regression test for every behavior
  fix. Do not weaken or delete meaningful tests to make a suite pass.

## Required validation

Discover actual package scripts, then run all applicable checks, including:

```bash
node rag-corpus/scripts/validate_public_collection.mjs
npm run lint
npm run typecheck
npm test
npm run build
cd python && python3 -m pytest -q
git diff --check
```

Use Playwright against a local production build for the primary and failure
journeys, 360px mobile, keyboard use, direct reload, and console/network errors.

## Release safety

- Verify authenticated GitHub user and exact remote ownership before pushing.
- Never force-push or overwrite an unrelated repository.
- Verify Vercel authentication before deployment. Do not expose local secrets.
- A preview, protected URL, localhost URL, or unverified deployment is not a
  public submission link.
- Mark completion only after logged-out production QA passes.

The detailed current-state handoff and completion gates are in
`claude-handoff/CODEX_CONTINUATION_PROMPT.md`.
