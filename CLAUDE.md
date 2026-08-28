# SevaPath from-scratch build instructions

## Mission

Build the complete SevaPath hackathon prototype from zero inside this folder.
There is intentionally no existing website. Create the application, public-
source collection pipeline, RAG corpus, retrieval integration, tests, and
documentation without waiting for the user to provide starter code.

## Product

SevaPath redesigns one narrow Pensioners' Portal journey: a surviving spouse
already named in the Pension Payment Order preparing to start Central Civil
family pension after the pensioner's death.

The current primary route is Form 12 to the Pension Disbursing Authority. Form
10 is the alternative route through the Head of Office when the PPO route does
not apply. Form 14 is archived and must not be shown as the current form.

## Non-negotiable safety boundary

- Use synthetic records only.
- Never collect real Aadhaar, PAN, PPO, bank, OTP, password, payment, health, or
  identity data.
- Do not determine legal eligibility, calculate pension, certify identity,
  resolve a name mismatch, or claim to submit to a government system.
- Clearly label every submission and receipt as a demonstration.
- Do not use government logos, seals, or designs that imply endorsement.
- Do not bypass login, CAPTCHA, robots restrictions, rate limits, or access
  controls.
- Crawl only the public official URLs in
  `rag-corpus/config/public_sources.json`.
- Downloaded originals belong under `rag-corpus/raw_sources_auto/` and must
  never be committed, deployed, or uploaded to Vertex.
- The deployable corpus must contain concise original summaries with precise
  links and rule/form references, not copied government documents.

## Build rules

- Work autonomously. Do not stop after planning.
- Initialize the project in this folder. Do not create another nested project
  directory.
- Use TypeScript for the web application and Python only where Google ADK or
  Vertex integration requires it.
- Use deterministic code for routing, required fields, and mismatch checks.
- Use the model only for constrained extraction, retrieval, and plain-language
  explanation.
- Preserve the supplied crawler, source allowlist, validator, and Claude safety
  configuration. Improve them only when tests or current official APIs require
  it.
- Never print credentials. Never commit `.env` files.
- If cloud credentials are unavailable, complete a local source-linked RAG
  fallback and report the cloud step as blocked. Never fake cloud success.
- Do not deploy, publish, push, or change external access without the user's
  separate instruction.

## Completion standard

The work is complete only when the citizen journey works locally, corpus
validation and retrieval evaluations pass, the production build succeeds, raw
downloads are ignored, and `claude-handoff/FINAL_REPORT.md` records the exact
result and remaining credential-dependent actions.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
