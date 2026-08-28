# Rights policy for the SevaPath corpus

## The rule this repository follows

Original government documents are **retrieved, read, and cited — never
redistributed**. Nothing under `rag-corpus/raw_sources_auto/` is committed,
deployed, or uploaded to any cloud service. That directory is listed in
`.gitignore` and its contents exist only on the machine that ran the collector.

What ships instead is `rag-corpus/ingest/` — short original summaries written for
this project, each carrying a link to the official document, the issuing body,
the date it was accessed, and the exact rule, form, page, or paragraph the
statement rests on. A reader who wants the authoritative text follows the link to
the government site and reads it there.

## Why

**The department asks readers to go to the original.** The Pensioners' Portal
Terms of Use state that the information on the portal aims to give a general
overview and is not a substitute for any rules, and advise Government servants
and pensioners to consult the original rules and orders for more specific
information.
(Terms of Use / Disclaimer, Department of Pension and Pensioners' Welfare,
<https://pensionersportal.gov.in/disclaimer.aspx>, accessed 2026-08-27.)

A mirrored copy cannot honour that instruction. A copy is frozen at the moment it
was downloaded; a link is not. Family pension forms and rules change — Form 14
moved to the portal's Archives, and the RBI directions in this corpus carry an
"Updated as on" date later than their issue date. A prototype that served its own
stale copy of a form would be doing the exact harm SevaPath exists to reduce.

**Linking is what the portal permits, framing is not.** The same Terms of Use
say the department does not object to being linked directly to information hosted
on the portal and that no prior permission is required, and separately that its
pages must not be loaded into frames on another site and must open in a new
browser window. SevaPath therefore links out and never embeds or frames a
government page.

**No implication of endorsement.** SevaPath uses no government logo, seal, or
design element, and labels itself a hackathon prototype throughout. Redistributing
official PDFs from a SevaPath deployment would suggest the department stands
behind this prototype. It does not.

**Provenance without republication.** `source_manifest.csv` records the requested
URL, the final URL after redirects, the access time, the collection method, the
byte count, and a SHA-256 checksum for every document. Anyone can re-run
`rag-corpus/scripts/collect_public_sources.mjs` and compare checksums to confirm
the corpus was built from the documents it claims, without this repository ever
carrying those documents.

## Collection conduct

The collector reads only the URLs listed in
`rag-corpus/config/public_sources.json`, refuses any host outside
`allowedHosts` — checked again on the final URL after redirects — refuses
non-HTTPS URLs, waits between requests, caps response size, identifies itself
with a descriptive user agent, and checks `/robots.txt` and skips a source that
is disallowed. No login, CAPTCHA, paywall, rate limit, or access control is
bypassed. No personal or restricted information is collected: every document in
the allowlist is a public form, a public rule, or a public web page.

## What this means for the Vertex upload

Only `rag-corpus/ingest/*.md` is eligible for upload to a Vertex AI RAG corpus.
`rag-corpus/scripts/vertex_upload.py` refuses to upload anything from outside
that directory. Raw government documents never leave the local machine.
