---
name: sevapath-project-shape
description: SevaPath repo layout, official-source allowlist, and the one narrow citizen journey this project covers — orient quickly without re-reading everything.
metadata:
  type: project
---

SevaPath is a hackathon prototype for one narrow Pensioners' Portal journey: a
surviving spouse already named in a Central Civil Pension Payment Order (PPO)
starting family pension after the pensioner's death. Primary route = **Form
12** to the Pension Disbursing Authority (PDA) under **CCS (Pension) Rules
2021, Rule 79(2)(a)(ii)**, with a death-certificate copy and a **Format 9**
excess-payment undertaking to the bank. Alternative route = **Form 10** to
the Head of Office (Rule 79(2)(b)(i)), used when the claimant is not named in
the PPO. **Form 14 is archived** — the Pensioners' Portal lists it only under
"Archives," but the department's own 2018 FAQ PDF (page 17) still tells
claimants to use it; this conflict is intentionally recorded and surfaced,
not silently resolved.

Repo layout relevant to this agent's audits:
- `rag-corpus/config/public_sources.json` — the ONLY allowlist (11 URLs, 3
  allowed hosts: pensionersportal.gov.in, www.rbi.org.in,
  buildwhatmovesindia.com). Never broaden this.
- `rag-corpus/source_manifest.csv` — provenance record (SHA-256, robots
  status, rights notes) for every collected source. Self-discloses known
  approximations (e.g. RBI2026-MD's title in public_sources.json is
  acknowledged as an approximation of the real document title).
- `rag-corpus/raw_sources_auto/` — 17 raw downloaded files (PDFs/HTML),
  gitignored via `.gitignore:19`, untracked, never uploaded. Verify with
  `git check-ignore -v` and `git status --short` on this path each audit.
- `rag-corpus/ingest/*.md` (10 briefs) — the only content ever eligible for
  Vertex upload. Each has YAML frontmatter with a `sources:` table mapping
  citation keys (e.g. `RULE79`, `FORM12`) to sourceId/issuer/title/url/accessed,
  and body text using `[KEY: locator]` citation markers.
- `python/sevapath_rag/` — ADK/Vertex sidecar. `config.py:uploadable_files()`
  enforces the ingest-only glob with a resolved-path check (blocks
  symlink/traversal). `corpus.py` uses the newer `agentplatform.Client` API;
  `agent.py` deliberately uses the deprecated `vertexai.rag.RagResource`
  because ADK 2.8.0's `VertexAiRagRetrieval` requires that specific type.
- `rag-corpus/RIGHTS_POLICY.md` — "retrieved, read, cited — never
  redistributed" policy; grounded in the portal's own Terms of Use (linking
  permitted, framing forbidden).

Mission context: this audit runs under a larger "FINISH_MISSION.md" release
push (deadline-driven, orchestrated by an Opus session running
architecture-critic / source-rag-auditor / journey-qa / release-verifier /
submission-editor in parallel). This agent's role is read-only evidence
gathering for RAG/source/rights/Vertex — it must never edit `src/`,
`python/`, or `rag-corpus/`, only write findings to the report path the
caller specifies.
