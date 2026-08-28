# Judge Q&A

## Why does this problem matter?

A newly bereaved spouse should not have to reconcile old FAQs, current rules,
multiple forms and inconsistent records before they can even approach the right
counter. A wrong form or unreadable field can cause another visit at a difficult
time.

## Why are Form 12 and Form 10 different?

Under Rule 79(2), the demonstrated named-spouse PPO route uses Form 12 with the
Pension Disbursing Authority. When that PPO route does not apply—for example,
the spouse is not named—the claim goes in Form 10 to the department’s Head of
Office. SevaPath encodes this split deterministically.

## Why is Form 14 not presented as current?

An older departmental FAQ mentions Form 14, but the Pensioners’ Portal lists it
under Archives. The 2021 Rules and current forms list support Form 12 for this
named-spouse journey. SevaPath retains the old FAQ only to explain the conflict.

## How do you maintain source accuracy?

The allowlist contains 11 public sources from the Pensioners’ Portal, RBI and
the hackathon brief. Each deployable summary records title, issuer, official
URL, locator and date checked. A manifest records provenance and hashes, tests
ensure the index matches the summaries, and answers without a citation are not
served.

## What does RAG add?

It turns a fixed checklist into source-grounded question answering. A citizen
can ask about forms, documents, mismatches or bank handling and receive the most
relevant checked passages with direct citations. Safety classification runs
before retrieval, and absent evidence produces a fixed honest response.

## What is mocked?

Every record, account number, submission and receipt. There is no OCR upload,
identity check, calculation, eligibility decision, bank or government API,
database or real claim. The receipt is an in-process demonstration with an
obviously fake prefix.

## How could a real deployment work safely?

Only with a government-approved service owner, documented APIs, consent and
data-minimisation rules, encryption, access controls, audit logs, retention
limits, accessibility testing and accountable human review. Eligibility,
identity resolution and final acceptance must remain with the responsible
authority.

## How do you protect privacy and handle government integration?

The prototype collects nothing: there is no login, upload or personal-data
field. It uses synthetic built-ins and calls no government system. A real pilot
would require an explicit legal basis and official integration; scraping or
private APIs are not acceptable substitutes.

## Can it scale?

The current app is stateless and the local corpus is small, so the demo scales
horizontally. Expanding to more pension categories is mainly a governance and
content-validation challenge: each journey needs its own authoritative sources,
deterministic route rules, tests and escalation boundary before launch.

## Why is this better than a static checklist?

It changes the route and papers based on scope answers, checks what evidence is
actually readable, shows mismatched values side by side, blocks false
completion, and answers follow-up questions with citations. A static page
cannot safely react to those differences.

## How was Codex meaningfully used?

Codex did not claim the pre-existing Claude implementation. It checkpointed and
audited that work, implemented the official ADK VertexAiRagRetrieval serving path,
expanded the RAG corpus to support English, Hindi, and Marathi guidance, hardened
public source validation with page-level PDF extraction and SHA-256 provenance,
refined deterministic routing and localized refusal boundaries, built production-browser
automation, ran the full suite of 172 TypeScript tests and 53 retrieval eval assertions,
and executed a flawless final release.
