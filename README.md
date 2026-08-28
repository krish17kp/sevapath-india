# SevaPath

SevaPath is an independent hackathon prototype that helps a surviving spouse
prepare to start a Central Civil family pension after a pensioner’s death.

> **Not an official government service.** SevaPath uses invented records only,
> never determines eligibility or an amount, and never submits a claim. Its
> worksheet and receipt are non-official demonstrations.

## The citizen problem

The target user is a surviving spouse whose name is already in the Pension
Payment Order (PPO), but whose family pension has not started. Today they must
work out which current form applies, reconcile older guidance with the 2021
Rules, assemble information scattered across records, and discover mismatches
at the bank or department counter. An older departmental FAQ still mentions
Form 14, while the current named-spouse route uses Form 12.

SevaPath turns that uncertainty into one guided journey: answer four scope
questions, inspect three visibly synthetic records, run deterministic checks,
see the correct route and evidence, prepare a non-official worksheet, and run a
clearly labelled mock submission that produces a fake receipt.

## Supported journey

The complete demonstrated path assumes:

- the pensioner has died;
- the user is the surviving spouse;
- the pension follows the Central Civil Services (Pension) Rules, 2021;
- the spouse is named in the PPO; and
- family pension has not started.

That case is routed to **Form 12 and the Pension Disbursing Authority**. A
surviving spouse not named in the PPO is shown the alternative **Form 10 and
Head of Office** route. Cases outside the verified scope receive a reason and a
useful referral rather than a fabricated answer.

## What works

- Deterministic Form 12/Form 10 routing, with no model deciding the route.
- Field extraction from three built-in fictional records.
- Required-field, name, relationship, authorization and scheme checks.
- Human-review handling that preserves both mismatched values verbatim.
- Route-specific document checklist and non-official preparation worksheet.
- Demonstration-only submission and unmistakably fake receipt.
- Local source-grounded retrieval with citations, explicit refusals, and a
  fixed missing-evidence response.
- Responsive, keyboard-accessible citizen UI with visible focus and 44px touch
  targets.

## What is mocked

All PPO, death-certificate and bank data is fictional. There is no upload, OCR,
account, database, government or bank API, identity check, pension calculation,
eligibility decision, real submission, or official receipt. The default public
demo performs deterministic labelled-field extraction and local extractive
retrieval; it does not require a private model or cloud credential.

## Architecture

```text
Next.js citizen UI
  ├─ /api/assess → deterministic route → extraction → checks → checklist
  ├─ /api/submit → in-process mock receipt only
  └─ /api/guidance
       ├─ local adapter → checked Markdown briefs → generated local index
       └─ optional Vertex adapter → separately deployed Python retrieval sidecar
```

The TypeScript domain layer owns routing, validation and safety-critical state.
The deployable RAG corpus contains original summaries, official URLs and precise
form/rule/page references—not redistributed source PDFs. The local index ships
with the server and is the credential-free default.

The optional Vertex AI/Google ADK path is configured and covered by isolated
tests against the installed SDK, but it has **not** been exercised against a
live cloud corpus because no Google Cloud credentials are configured. An
optional Anthropic adapter can corroborate field transcription; the public
fallback does not use it. Neither optional integration is required for the
demo.

## Run locally

Requirements: Node.js 20.11 or newer and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. No environment variables are required. See
`.env.example` only if testing an optional adapter.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run corpus:validate
npm run corpus:index -- --check
npm run corpus:eval
(cd python && ../.venv/bin/python -m pytest -q) # optional cloud-adapter tests
npm run build
npm run test:e2e
```

Release validation on 28 August 2026 passed:

- 149/149 TypeScript unit, integration, UI and retrieval tests;
- 20/20 Python tests (with two upstream SDK deprecation warnings);
- 36/36 retrieval evaluation cases, included in the TypeScript total;
- 11/11 collected-source validations and 11/11 live source-link checks;
- production build for seven routes; and
- production-browser Journeys A–F, mobile, touch-target, keyboard,
  source-link-attribute, console and network checks.

## Deployment

Public URL: **https://sevapath-india.vercel.app**

No environment variables are required for deployment. `next.config.ts` traces
the local corpus assets needed by the server runtime.

## Safety, privacy and rights

- Synthetic records are marked on their face and contain no real identifiers.
- The UI has no real-data fields or file upload.
- SevaPath refuses pension calculations, eligibility decisions, identity
  resolution and submission on someone’s behalf.
- Every receipt says no claim was submitted and uses the prefix
  `DEMO-NOT-A-REAL-RECEIPT`.
- External evidence opens over HTTPS with safe link attributes.
- Raw downloaded documents, credentials, environment files, logs, caches and
  build output are excluded from Git.
- Corpus summaries are original project text with attribution; official
  documents are linked, not re-hosted. See `rag-corpus/RIGHTS_POLICY.md`.

## How Codex contributed

The application implementation existed before Codex’s finalization pass. Codex
preserved it in a checkpoint, independently audited the routing, RAG, safety and
citizen journeys, fixed negated PPO authorization handling, added the explicit
human-review acknowledgement, built production-browser release automation, ran
the full engineering/source/security validation, prepared submission materials,
and handled release publication and production verification. This description
does not attribute prior Claude work to Codex.

## Known limitations

- Only the narrow Central Civil surviving-spouse scenario above is verified.
- Built-in labelled text demonstrates extraction; real document OCR is absent.
- The local assistant returns relevant corpus passages rather than generating a
  conversational synthesis.
- Cloud retrieval and model-assisted extraction remain optional and unverified
  against live credentials.
- The prototype cannot replace departmental review or the real claim channel.

## Primary official sources

- [CCS (Pension) Rules, 2021](https://pensionersportal.gov.in/Document/CCS-Pension-Rules%202021-English.pdf)
- [Current and archived application forms](https://pensionersportal.gov.in/Forms/Applicationforms/mapplication.aspx)
- [Form 12](https://pensionersportal.gov.in/Forms/pension_new_forms/Form12.pdf)
- [Form 10](https://pensionersportal.gov.in/Forms/pension_new_forms/Form10.pdf)
- [Format 9](https://pensionersportal.gov.in/Forms/pension_new_format/Format9.pdf)
- [RBI Master Direction: Disbursement of Government Pension by Agency Banks, 2026](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13442&Mode=0)
- [Pensioners’ Portal disclaimer](https://pensionersportal.gov.in/disclaimer.aspx)

The full provenance manifest is in `rag-corpus/source_manifest.csv`, and the
citizen-readable list is available at `/sources` in the app.
