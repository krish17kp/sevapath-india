---
name: sevapath-audit-2026-08-28
description: Exact P1 findings from the 2026-08-28 source/RAG/rights/Vertex audit of SevaPath — check whether these were fixed before re-auditing from scratch.
metadata:
  type: project
---

Full findings were written to `claude-handoff/audit-sources.md` (not this
memory file — that's the deliverable for that mission run; this memory is
just the durable pointer). Result: **no P0s**, three small P1s, everything
else (Form 12/Form 10 split, Rule 79 primary citations, Format 9, Form 14
archived warning, raw_sources_auto isolation, citation integrity, ADK/Vertex
API correctness, all 11 source URLs live) verified sound.

The three P1s, if not yet fixed, are still valid to re-check first before
re-doing the full audit:

1. `rag-corpus/ingest/02-form10-hoo-route.md` line ~63 cites "Rule 79(5)(a)"
   for the "Government servant died after retirement without rule 57/58
   forms" claim — the real provision is **Rule 80(5)(a)** (confirmed via
   `pdftotext` on `ccs2021-notification.pdf`, printed p.178). Content is
   correct; only the rule number is wrong.
2. `rag-corpus/ingest/06-rbi-2026-bank-handling.md` line ~53 paraphrases the
   RBI source's "The banks **may** ensure..." as "Banks **are to** ensure...",
   strengthening the modal verb without a quote mark. Low-impact.
3. `rag-corpus/ingest/05-form14-archived.md` lines 49-54 reproduce ~90% of one
   sentence from the 2018 FAQ PDF (page 17, answer 8.2) verbatim without
   quotation marks. Properly attributed with source+page, but should be
   wrapped in quotes to be honest about being a quote vs. original paraphrase.

**Why this matters for next time:** if a future session says "the audit
already ran, just check it's still clean," re-read `claude-handoff/audit-sources.md`
for the full evidence table first — don't re-derive from scratch — but do
re-verify these three specific lines still say what's described here, since
another agent may have edited the briefs in the meantime.
