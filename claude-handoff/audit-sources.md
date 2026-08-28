# Source / RAG / Rights / Vertex Audit — source-rag-auditor

Scope: read-only audit of `rag-corpus/config/public_sources.json`,
`rag-corpus/source_manifest.csv`, `rag-corpus/ingest/*.md`,
`rag-corpus/raw_sources_auto/`, `rag-corpus/RIGHTS_POLICY.md`,
`rag-corpus/scripts/validate_public_collection.mjs`,
`rag-corpus/scripts/vertex_upload.py`, `python/sevapath_rag/*.py`,
`src/lib/corpus-manifest.ts`, `src/lib/retrieval/*.ts`, `rag-corpus/index/local_index.json`.
No file under `src/`, `python/`, or `rag-corpus/` was modified. No crawl target
outside the 11 allowlisted URLs in `public_sources.json` was fetched; the 11
existing URLs were re-checked live with `curl` only.

## Method

- Cross-checked every `[KEY: locator]` citation in all 10
  `rag-corpus/ingest/*.md` briefs against the actual downloaded PDFs in
  `rag-corpus/raw_sources_auto/` using `pdftotext -f <page> -l <page> -layout`.
- Ran `node rag-corpus/scripts/validate_public_collection.mjs` →
  `PASS: 11 public sources validated`.
- Ran `npx vitest run tests/retrieval` → `Test Files 2 passed (2), Tests 51 passed (51)`.
- Ran `npx vitest run tests/unit/corpus.test.ts` → `11 passed`.
- Ran `python3 -m pytest python/tests -q` (from repo root) → `20 passed, 2 warnings`.
- Verified installed Python package versions against what the code/docstrings
  claim (`pip show google-adk google-cloud-aiplatform`), then used
  `inspect.signature` / `model_fields` on the actually-installed
  `google.adk.tools.retrieval.VertexAiRagRetrieval`, `vertexai.rag.RagResource`,
  and `agentplatform._genai.rag.Rag` / `agentplatform._genai.types.common.*`
  classes to confirm every call site in `python/sevapath_rag/agent.py` and
  `python/sevapath_rag/corpus.py` uses real, currently-installed kwargs.
- Confirmed absence of Google credentials with `google.auth.default()`
  (raised `DefaultCredentialsError`) and `~/.config/gcloud` (does not exist).
- Re-fetched (HTTP status only) the 11 allowlisted URLs; all returned `200`.

---

## 1. Legal/procedural accuracy of the 10 briefs

**Overall: sound.** Every Rule 79/80 citation, Form 12/Form 10 content claim,
Format 9 content claim, and Forms-list current/archived claim I checked
resolves to real text at the cited page. One rule-number citation is wrong
(content is still correct); one bank-direction paraphrase softens a modal verb.

### Verified correct (no action needed)

- `01-form12-pda-route.md` — every claim (route to PDA, Rule 79(2)(a)(ii) three
  attachments, one-month timing, "payable from the date following death,"
  Form 12 header `[See Rule 79(2)]`, PAN requested / Aadhaar voluntary) matches
  `rag-corpus/raw_sources_auto/form12-2021.pdf` p.1 and
  `ccs2021-notification.pdf` printed p.177 (PDF p.56) verbatim in substance.
- `02-form10-hoo-route.md` — Form 10 header `[See rules 50, 71, 74, 76, 79 and 80]`,
  Rule 79(2)(b)(i) (PPO doesn't name anyone / HoO opinion → Form 10 → Format 13,
  one month) confirmed against `ccs2021-notification.pdf` printed p.177.
  Rule 79(3)(iii) (missing-person FIR route) and Rule 79(4)(a)(ii) (remarried
  guardian applies in Form 10) and Rule 79(5) (guardian of minor/disabled
  claimant) all confirmed. **One citation is wrong — see P1 below.**
- `03-format9-bank-undertaking.md` — Format 9 header
  `(See Rules 57,58,60,63,71,74,76,79 and 80)` and the undertaking's substance
  (refund/indemnify) confirmed against `format9-2021.pdf` p.1. Format 9 required
  on both routes confirmed (Rule 79(2)(a)(ii) and Rule 79(3)(iii), which itself
  requires "an undertaking to the Bank in Format 9").
- `04-ccs-rule79-flow.md` — Chapter XII heading, Rule 79(2)(a) vs (b) branch
  split, Rule 79(2)(a)(iv) (Form 8 add-name mechanism), Rule 79(2)(a)(v),
  Rule 80(1)–(4) (authorisation, CPAO forwarding, Special Seal of Authority
  timing), Rule 79(3)(vi) and 79(3)(vii) — every one confirmed verbatim in
  substance against printed pages 176–178 (PDF pages 55–57).
- `05-form14-archived.md` — Form 14 confirmed under "Archives" heading (item 46)
  in `pension-forms-list.txt`; Form 10 and Form 12 (family pension) confirmed
  in the *current* list (items 35, 36), not Archives. The "related trap" claim
  — a *different*, archived Form 12 (death-gratuity form, item 45) exists on
  the same Archives list — is independently confirmed and is a genuinely useful
  catch, not an invented risk.
- `06-rbi-2026-bank-handling.md` — Chapter VII(E) para 23 (no forced new
  account if existing joint account), Chapter VII(F) para 24 (PPO number on
  passbook), Chapter III(A) para 8(i) (bank-attributed-error lump-sum credit),
  Chapter VII(D) paras 21–22 (nodal officers, toll-free line) all confirmed
  verbatim against `rbi2026-md.txt`. **One paraphrase softened a modal verb —
  see P1 below.**
- `07-form12-document-checklist.md` — every numbered document-list item (1–9)
  and the guardian-only items (4,5,6,8) confirmed against `form12-2021.pdf` p.2.
- `08-name-consistency.md` — Form 10 list item 19 (pass-book name-match
  requirement) confirmed verbatim in substance; `PENSIONER-GUIDELINES` "Verification
  of PPO" paraphrase ("contact your Head of Office/Pension Disbursing Agency for
  necessary action") confirmed against `pensioner-guidelines.txt`.
- `09-scope-and-boundaries.md` and `10-source-hierarchy.md` — these are
  product-policy/self-referential (not claims about official sources) except
  for the `PORTAL-TERMS` disclaimer quote ("not a substitute for any rules...
  consult original rules/orders") and the FAQ-vs-2021-Rules conflict summary,
  both confirmed against `portal-terms.txt` and `faq-civil-2018.pdf` p.17.

### P1 — wrong rule-number citation (content correct, locator wrong)

**File:** `rag-corpus/ingest/02-form10-hoo-route.md`, lines 59–64.

Brief text: *"...and where a Government servant died after retirement without
the rule 57 or rule 58 forms having been submitted. [RULE79: Rule 79(3)(iii),
79(4)(a)(ii), 79(5) and **79(5)(a)**, printed pages 177–178, PDF pages 56–57]"*

Evidence (`pdftotext -f 55 -l 58 -layout rag-corpus/raw_sources_auto/ccs2021-notification.pdf`):
the clause beginning *"(5)(a) In the case of a Government servant who has died
after retirement and in respect of whom forms referred to in rule 57 or rule
58 were not submitted before his death, the Head of Office shall allow the
spouse..."* appears immediately under **"80. Authorisation of payment by
Accounts Officer.-"**, not under Rule 79. Rule 79 itself ends at sub-rule
**(6)** ("residuary gratuity... Form 13"). There is no "Rule 79(5)(a)" in the
gazette text — the correct citation is **Rule 80(5)(a)**.

The substantive claim (Form 10 is used for a Government servant who died after
retirement without Form 6/7 having been submitted) is factually correct; only
the pinned rule number is wrong, and it is wrong in exactly the way that
matters for a citation-integrity audit — a reader who follows the citation to
verify it will land on the wrong rule.

**Severity:** P1 (not P0 — Form 10 vs Form 12 routing, Rule 79 for the primary
Form 12/Form 10 split, and the Form 14 warning are all unaffected; this is a
secondary edge-case citation).

**Smallest fix:** in the frontmatter and body citation, change
`79(5)(a)` → `80(5)(a)` (two occurrences: the keyword-adjacent citation on
line ~63 and nowhere else in this file). Exact corrected line:

```
disabled, and where a Government servant died after retirement without the
rule 57 or rule 58 forms having been submitted. [RULE79: Rule 79(3)(iii),
79(4)(a)(ii), 79(5) and Rule 80(5)(a), printed pages 177–178, PDF pages 56–57]
```

(Optionally also add an `RULE80` source key pointing at `CCS2021-NOTIFICATION`
for precision, but reusing `RULE79`'s existing source with the corrected rule
number in the locator text is sufficient since both resolve to the same
`sourceId`.)

### P1 — modal-verb overstatement in one RBI paraphrase

**File:** `rag-corpus/ingest/06-rbi-2026-bank-handling.md`, lines 52–53.

Brief text: *"Banks **are to** ensure that no recovery of an excess amount is
effected without the pensioner's knowledge and consent, or without a prior
notice..."*

Source (`rag-corpus/raw_sources_auto/rbi2026-md.txt`, Chapter III opening
paragraph): *"The banks **may** ensure that no recovery of excess amount from
the pension of a Government employee shall be effected without the
pensioner's knowledge and consent, or without the issuance of a prior
notice."*

RBI Master Directions generally use "may" in a directive/procedural sense
(not literally optional), so this is a defensible reading, not a fabrication.
Still, the brief silently swapped "may" for "are to," which strengthens the
apparent obligation beyond what the source literally says, without a
quotation mark or a note that this is a paraphrase-of-intent rather than a
literal quote.

**Severity:** P1, low-impact (does not change the citizen-facing behavior of
SevaPath, which does not compute or promise recovery outcomes).

**Smallest fix:** change "Banks are to ensure" → "Banks are directed to
ensure" (keeps the practical meaning RBI intends for a Master Direction while
not silently rewriting "may" as "are to"), or quote the source's own word:
"Banks **may** ensure (RBI's own wording; in this Master Direction this
functions as a directive, not an option)."

### Confirmed sound — Form 12 vs Form 10 split, Format 9, Rule 79, Form 14 warning

The four claims the mission asked me to specifically verify are all correct
in the corpus:

- **Form 12** is the *current* route to the Pension Disbursing Authority for a
  spouse already named in the PPO, under **Rule 79(2)(a)(ii)** — confirmed
  verbatim against the gazette text.
- **Form 10** is the *alternative* Head of Office route, correctly scoped to
  "PPO does not include the claimant" or "HoO considers pension payable to
  someone else," under **Rule 79(2)(b)(i)** — confirmed verbatim.
- **Format 9** (bank excess-payment undertaking) is correctly required on
  *both* routes — confirmed.
- **Rule 79** citations are correct throughout except the single
  `79(5)(a)` → `80(5)(a)` slip above.
- **Form 14 archived warning** is fully supported: Form 14 appears only under
  the Pensioners' Portal's "Archives" heading, the 2018 FAQ (which predates
  the 2021 Rules) still directs claimants to Form 14 on printed page 17, and
  the brief correctly states the 2021 Rules and current forms list govern.
  The "second, also-archived Form 12 (death gratuity)" trap is real and
  correctly caught.
- **Bank-handling claims** (RBI 2026 Directions: no forced new account, PPO on
  passbook, bank-attributed-error lump-sum credit, nodal officers) are all
  confirmed, with the one modal-verb nuance above.

---

## 2. Copyright / rights boundary

**`rag-corpus/RIGHTS_POLICY.md` is honest and specific**, not boilerplate: it
correctly cites the Pensioners' Portal Terms of Use for both its "link, don't
mirror" rationale and its "don't frame" rationale (both independently
confirmed against `rag-corpus/raw_sources_auto/portal-terms.txt`), and it
correctly states that `rag-corpus/scripts/vertex_upload.py` will only read
`rag-corpus/ingest/*.md`.

Nine of the ten briefs are genuine original summaries: restructured,
condensed, and written in SevaPath's own explanatory voice with inline
`[KEY: locator]` citations. `03-format9-bank-undertaking.md`'s paraphrase of
the undertaking language is a legitimate rewrite (reordered, condensed, changed
from first-person to third-person), not a copy.

### P1 — one brief reproduces a near-verbatim government sentence without quotation marks

**File:** `rag-corpus/ingest/05-form14-archived.md`, lines 49–54.

Brief text: *"...still answers the question "When does a family member become
eligible for the grant of family pension?" by saying that in the case of
death of a pensioner **the wife or a disabled child or dependent parents or a
disabled sibling should apply in Form No. 14** ... **to the Pension
Disbursing Authority**."*

Source (`rag-corpus/raw_sources_auto/faq-civil-2018.pdf`, p.17, answer 8.2):
*"In the case of death of a pensioner, **the deceased pensioner's wife or a
disabled child or dependent parents or a disabled sibling should apply in
Form No. 14** along with a copy of the death certificate of the deceased
pensioner **to the Pension Disbursing Authority**."*

This is a ~90%-verbatim reproduction of a single sentence (only "the deceased
pensioner's" is shortened to "the," and the death-certificate clause is
dropped), presented as prose rather than a marked quotation. It is properly
attributed (source id, URL, page) and serves a legitimate purpose — accurately
representing the exact stale instruction being warned about requires close
paraphrase — but as written a reader cannot tell it is a near-verbatim lift
rather than SevaPath's own words.

**Severity:** P1 (does not block release — factual accuracy is not in
question, and the FAQ PDF is not redistributed, only quoted in one sentence —
but should be fixed for honesty about what is original vs. quoted, per the
mission's "no copied government documents into deployable content" rule).

**Smallest fix:** wrap the reused clause in quotation marks so it reads as an
explicit, bounded quotation rather than paraphrase:

```
The Department's Frequently Asked Questions document, which predates the
Central Civil Services (Pension) Rules, 2021, still answers the question
"When does a family member become eligible for the grant of family pension?"
by stating: "the deceased pensioner's wife or a disabled child or dependent
parents or a disabled sibling should apply in Form No. 14 ... to the Pension
Disbursing Authority." [FAQ2018: FAQ answer 8.2, page 17]
```

This is a wording-only fix (add quotation marks + ellipsis for the omitted
clause); no factual content changes.

### `raw_sources_auto/` boundary — confirmed clean

- `git status --short rag-corpus/raw_sources_auto/` → no output (untracked, not staged).
- `git check-ignore -v rag-corpus/raw_sources_auto/form12-2021.pdf` →
  `.gitignore:19:rag-corpus/raw_sources_auto/`.
- `.gitignore` line 19 covers the whole directory.
- `python/sevapath_rag/config.py:uploadable_files()` (lines 78–102) globs only
  `INGEST_DIR.glob("*.md")` where `INGEST_DIR = REPO_ROOT / "rag-corpus" / "ingest"`,
  and additionally re-resolves every path and rejects it
  (`ConfigurationError`) if its resolved parent is not exactly `INGEST_DIR` —
  this defeats a symlink or crafted relative path pointing into
  `raw_sources_auto/`. `raw_sources_auto/` is never imported, read, or
  reachable from this module.
- `rag-corpus/scripts/vertex_upload.py` calls only `uploadable_files()` from
  `config.py` and `upload_briefs()` from `corpus.py`, both of which are
  restricted the same way (`corpus.py:upload_briefs`, lines 74–89, iterates
  `uploadable_files()` only).
- No issue found in this area.

---

## 3. Citation integrity — do markers resolve, are surfaced URLs public/live

- Every `[KEY: locator]` marker in the 10 briefs resolves to a `sources:`
  frontmatter entry with `sourceId`, `issuer`, `title`, `url`, `accessed` —
  confirmed by inspection of all 10 files and by
  `npx vitest run tests/unit/corpus.test.ts` (11/11 passing, which per its
  name asserts every ingest brief's citations resolve and no duplicate chunk
  ids exist).
- `rag-corpus/index/local_index.json` (43 chunks, 10 briefs) carries the same
  `sources` tables verbatim from each brief's frontmatter — spot-checked the
  first two entries (`form12-pda-route`, `form10-hoo-route`); URLs match
  `public_sources.json` exactly.
- `src/lib/corpus-manifest.ts` reads `rag-corpus/source_manifest.csv` live at
  request time (no hardcoded copy) and surfaces `finalUrl`, so the `/sources`
  page always shows the exact URL that was actually collected, not a
  hand-maintained duplicate.
- `src/lib/retrieval/vertex-adapter.ts` enforces `candidate.url.startsWith("https://")`
  and a non-empty `reference` in its `isCitation()` guard (lines ~48–58), and
  drops any passage that arrives without a well-formed citation
  (`.filter((passage) => passage.text.length > 0 && passage.citations.length > 0)`),
  so a malformed or non-HTTPS citation from the sidecar can never reach the UI.
- `grep -rn "localhost\|127\.0\.0\.1\|file://" src/lib/retrieval/ rag-corpus/ingest/ rag-corpus/index/` →
  no matches. No private/local URL is exposed as a citation anywhere in the
  corpus or retrieval layer.
- No issue found in this area.

---

## 4. Google ADK / Vertex readiness

**This is the strongest part of the build.** The code does not invent an API
surface — it was checked against what is actually installed:

- `pip show google-adk google-cloud-aiplatform` → `2.8.0` / `1.165.1`,
  matching exactly what `python/requirements.txt` and the docstrings in
  `python/sevapath_rag/corpus.py` and `agent.py` claim.
- `python/sevapath_rag/corpus.py` uses the **new** `agentplatform.Client` API
  (not the deprecated `vertexai.rag` module) for corpus create/list/get,
  file upload, and retrieval. I verified every call site's keyword arguments
  against `inspect.signature()` of the real installed
  `agentplatform._genai.rag.Rag.create_corpus / get_corpus / list_corpora /
  upload_file / retrieve_contexts`, and the real field names of
  `RagCorpus`, `RagQuery`, `VertexRagStore`, `VertexRagStoreRagResource`,
  `RagFile`, `RetrieveContextsResponse`, `RagContexts`, `RagContextsContext` —
  every kwarg and attribute access in `corpus.py` (`rag_corpus=`, `name=`,
  `corpus_name=`, `path=`, `display_name=`, `vertex_rag_store=`, `query=`,
  `.rag_corpora`, `.contexts.contexts`, `.name`, `.text`,
  `.source_display_name`, `.source_uri`, `.score`) matches the real
  installed schema exactly.
- `python/sevapath_rag/agent.py` deliberately uses the **deprecated**
  `vertexai.rag.RagResource` at one call site, with an in-code comment
  explaining why: ADK 2.8.0's `google.adk.tools.retrieval.VertexAiRagRetrieval`
  requires that specific type in its `rag_resources` argument. I confirmed
  `inspect.signature(VertexAiRagRetrieval.__init__)` accepts exactly
  `name, description, rag_corpora, rag_resources, similarity_top_k,
  vector_distance_threshold` — matching the call in `agent.py` — and that
  `vertexai.rag.RagResource(rag_corpus=...)` is the real, currently-installed
  constructor.
- Running `python3 -m pytest python/tests -q` reproduces the exact
  `UserWarning: The vertexai.rag module is deprecated...` at
  `agent.py:71` — this is a real, currently-emitted deprecation **warning**,
  not an import error or a broken call; the test suite still passes 20/20.
  The code's own docstring in `corpus.py` (lines 3–13) already documents this
  tradeoff accurately. **No fix needed — this is honestly described, both in
  code comments and in the prior `FINAL_REPORT.before-v4-*.md`.**
- `agent.py`'s one-tool constraint (a `VertexAiRagRetrieval` built-in tool
  cannot coexist with other function-declaration tools on the same Gemini
  request) is stated as fact in the docstring; I did not independently verify
  this against the Gemini API, but it is consistent with known Gemini
  built-in-tool behavior and is not contradicted by anything in the ADK
  source I inspected.
- **Vertex truth state (verified, not assumed):** `google.auth.default()`
  raises `DefaultCredentialsError: Your default credentials were not found`
  in this environment, and `~/.config/gcloud` does not exist. No live
  corpus-create, upload, or retrieval call has been made against Google Cloud
  in this environment, by this audit or previously. The correct, honest
  status is **"configured, not live-tested"** — exactly what the prior
  `claude-handoff/FINAL_REPORT.before-v4-20260828T061904Z.md` (§6) already
  states. I found no place in the repository that claims Vertex was actually
  tested or that a live smoke test succeeded. **Do not let any later report
  claim otherwise without running `python rag-corpus/scripts/vertex_upload.py`
  with real `GOOGLE_CLOUD_PROJECT`/ADC credentials and capturing its printed
  smoke-test output.**
- No issue found in this area; this is sound engineering and sound honesty.

---

## 5. Collection dates and live-URL check

- `rag-corpus/source_manifest.csv` records `accessed_utc: 2026-08-27T08:5x:xx.xxxZ`
  for all 11 sources — one day before this audit (2026-08-28). Freshness is
  fine for a same-week hackathon build.
- Re-checked all 11 allowlisted URLs from `public_sources.json` with `curl`
  (HTTP status only, single request per URL, respecting the same hosts —
  no new host or path was touched):

  | Source ID | URL | HTTP |
  |---|---|---|
  | PENSION-FORMS-LIST | pensionersportal.gov.in/Forms/Applicationforms/mapplication.aspx | 200 |
  | CCS2021-NOTIFICATION | pensionersportal.gov.in/Document/CCS-Pension-Rules 2021-English.pdf | 200 |
  | CCS2021-COMPENDIUM | pensionersportal.gov.in/Document/CSS_PensionRules_2021_Book_Eng.pdf | 200 |
  | FORM10-2021 | pensionersportal.gov.in/Forms/pension_new_forms/Form10.pdf | 200 |
  | FORM12-2021 | pensionersportal.gov.in/Forms/pension_new_forms/Form12.pdf | 200 |
  | FORMAT9-2021 | pensionersportal.gov.in/Forms/pension_new_format/Format9.pdf | 200 |
  | FAQ-CIVIL-2018 | pensionersportal.gov.in/FAQ_Civil.pdf | 200 |
  | PENSIONER-GUIDELINES | pensionersportal.gov.in/guidelines.aspx | 200 |
  | RBI2026-MD | rbi.org.in/Scripts/NotificationUser.aspx?Id=13442&Mode=0 | 200 |
  | PORTAL-TERMS | pensionersportal.gov.in/disclaimer.aspx | 200 |
  | HACKATHON-BRIEF | buildwhatmovesindia.com/brief | 200 |

  **No dead links.** All 11 sources are live and reachable right now.
- `source_manifest.csv`'s `RBI2026-MD` row already self-discloses that the
  title in `public_sources.json` ("Government Pension Payment Directions,
  2026") is an approximation of the real title ("... [Disbursement of
  Government Pension by Agency Banks (ABs)] Directions, 2026"). This is
  accepted-limitation, already honestly disclosed in the `rights_note`
  column — no fix needed.
- Accepted limitation (noise-adjacent, not a defect): the crawler
  (`rag-corpus/scripts/collect_public_sources.mjs`) treats `robots_status:
  "unavailable"` (RBI's `/robots.txt` did not resolve — recorded in the
  manifest) as non-blocking, same as `"not-found"`; only an explicit
  `"disallowed"` status stops collection. This is a reasonable, common
  fail-open interpretation (no robots.txt = no stated restriction) and is not
  something I am asked or permitted to change (crawler is pre-supplied,
  preserve-unless-broken). Flagging only for visibility, not as a fix item.

---

## Summary table

| # | Area | Finding | Severity | File(s) |
|---|---|---|---|---|
| 1 | Rule 79(5)(a) mis-cite | Should be Rule 80(5)(a); content correct | P1 | `rag-corpus/ingest/02-form10-hoo-route.md:63` |
| 2 | RBI modal-verb overstatement | "may ensure" paraphrased as "are to ensure" | P1 | `rag-corpus/ingest/06-rbi-2026-bank-handling.md:53` |
| 3 | Near-verbatim FAQ sentence, unquoted | ~90% verbatim, properly cited but not marked as quote | P1 | `rag-corpus/ingest/05-form14-archived.md:49-54` |
| 4 | Form 12/Form 10/Format 9/Rule 79/Form 14 core claims | All verified against actual PDFs | sound | `rag-corpus/ingest/01,02,03,04,05,07.md` |
| 5 | RIGHTS_POLICY.md honesty | Accurate, specific, source-grounded | sound | `rag-corpus/RIGHTS_POLICY.md` |
| 6 | raw_sources_auto/ isolation | gitignored, untracked, glob-restricted upload path | sound | `.gitignore:19`, `python/sevapath_rag/config.py:78-102` |
| 7 | Citation integrity (TS + local index) | All URLs public/live/https; no private URLs; malformed citations dropped | sound | `src/lib/corpus-manifest.ts`, `src/lib/retrieval/vertex-adapter.ts` |
| 8 | ADK/Vertex API surface | Verified against real installed packages via `inspect`; deprecation is a warning, not breakage | sound | `python/sevapath_rag/agent.py`, `corpus.py` |
| 9 | Vertex live-test claim | No credentials present; correctly described as "configured, not live-tested" everywhere checked | sound | `python/sevapath_rag/config.py`, prior `FINAL_REPORT.before-v4-*.md` §6 |
| 10 | Live URL check | All 11 allowlisted sources return HTTP 200 | sound | `rag-corpus/config/public_sources.json` |

**No P0 found.** Nothing here blocks release. The three P1 items are small,
citation-precision and phrasing fixes (change one rule number, soften one
paraphrase, add quotation marks to one sentence) — none touch the Form 12 vs
Form 10 routing logic, the Rule 79 primary citations, or the Form 14 archived
warning that the mission specifically asked me to verify, all of which are
correct as written.
