---
name: audit-method-pdftotext
description: How to actually verify SevaPath ingest-brief citations against the raw government PDFs — pdftotext page-range extraction, not guesswork.
metadata:
  type: feedback
---

Rule: to verify a `[KEY: locator]` citation in `rag-corpus/ingest/*.md` that
cites "printed page X, PDF page Y," run
`pdftotext -f <PDF page> -l <PDF page+range> -layout rag-corpus/raw_sources_auto/<file>.pdf -`
and read the extracted text directly, rather than trusting the brief's
paraphrase or estimating from page count alone. `-layout` preserves column
structure well enough to match rule sub-clause lettering (e.g. distinguishing
Rule 79(5) from Rule 80(5)(a), which sit only a few lines apart across a page
break in `ccs2021-notification.pdf`).

**Why:** this is how a real citation error was caught in the 2026-08-28 audit
— a brief cited "Rule 79(5)(a)" for content that is actually under "80.
Authorisation of payment by Accounts Officer.-" i.e. Rule 80(5)(a). The error
was invisible without pulling the exact page text; the substantive claim
itself was correct, only the rule number was wrong. Skimming or trusting the
brief's own printed-page/PDF-page metadata is not sufficient — always
extract and read.

**How to apply:** for every ingest brief citation during a source audit,
extract the cited PDF page range and grep/read for the exact rule/clause
number and surrounding sub-clause context, not just the topic sentence. Do
the same for HTML sources using the pre-extracted `.txt` sibling files in
`raw_sources_auto/` (e.g. `pension-forms-list.txt`, `rbi2026-md.txt`,
`portal-terms.txt`, `pensioner-guidelines.txt`) with `grep -n -B2 -A6`.

Also verify the Python/ADK Vertex code by introspecting the *actually
installed* package (`pip show`, then `inspect.signature()` /
`.model_fields` on the real classes) rather than trusting docstrings — in
this project the docstrings turned out to be accurate, but that was
confirmed, not assumed. See [[sevapath-project-shape]].
