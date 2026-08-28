#!/usr/bin/env node
/**
 * Writes rag-corpus/source_manifest.csv from the ignored collection manifest.
 *
 * The CSV is committed; the raw downloads it describes are not. Document dates,
 * corpus status, rights notes, and scope notes are curated per source because
 * they cannot be derived from an HTTP response.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const corpusRoot = path.resolve(scriptDir, "..");

const manifest = JSON.parse(
  await readFile(path.join(corpusRoot, "raw_sources_auto", "collection_manifest.json"), "utf8")
);
const config = JSON.parse(
  await readFile(path.join(corpusRoot, "config", "public_sources.json"), "utf8")
);

/**
 * Curated per-source facts.
 *
 * `officialTitle` is the title printed on the retrieved document. Where it
 * differs from the title guessed in public_sources.json, the retrieved title
 * wins and the difference is recorded in the scope note.
 */
const curated = {
  "PENSION-FORMS-LIST": {
    officialTitle: "Downloads: Application/Claim Forms",
    documentDate: "2022-10-13 (page footer: Last Updated/Reviewed)",
    corpusStatus: "summarised-in-ingest",
    rightsNote: "Government of India web page. Linked and summarised only; not redistributed.",
    scopeNote:
      "Authority for which forms are current and which are archived. Lists Form 10 and Form 12 as current and Form 14 under Archives."
  },
  "CCS2021-NOTIFICATION": {
    officialTitle:
      "Central Civil Services (Pension) Rules, 2021 (Gazette of India, Extraordinary, Part II Sec. 3(i))",
    documentDate: "2021 (Gazette notification)",
    corpusStatus: "summarised-in-ingest",
    rightsNote: "Gazette notification. Cited by rule and page; text not redistributed.",
    scopeNote:
      "Primary law. Rule 79(2) is the controlling provision for commencement of family pension after a pensioner's death."
  },
  "CCS2021-COMPENDIUM": {
    officialTitle: "Central Civil Services (Pension) Rules, 2021 — compendium",
    documentDate: "2021",
    corpusStatus: "verification-only",
    rightsNote: "Departmental compendium. Used to cross-check the notification; not redistributed.",
    scopeNote: "Cross-check copy. No corpus claim rests on this source alone."
  },
  "FORM10-2021": {
    officialTitle:
      "Form 10 — Application to the Head of Office for Family Pension on Death of a Government Servant or Pensioner or on Death or Ineligibility of a Family Pensioner or when a Government Servant or Pensioner or Family Pensioner goes missing",
    documentDate: "2021 (form issued under CCS (Pension) Rules, 2021)",
    corpusStatus: "summarised-in-ingest",
    rightsNote: "Official form. Linked for download; the form itself is not redistributed.",
    scopeNote: "Alternative route through the Head of Office. Page 3 lists the documents to attach."
  },
  "FORM12-2021": {
    officialTitle:
      "Form 12 — Application to be submitted to Pension Disbursing Authority by spouse/co-authorised family member for commencement of family pension on death of a pensioner or family pensioner",
    documentDate: "2021 (form issued under CCS (Pension) Rules, 2021)",
    corpusStatus: "summarised-in-ingest",
    rightsNote: "Official form. Linked for download; the form itself is not redistributed.",
    scopeNote:
      "Current primary route for a spouse named in the PPO. Header reads '[See Rule 79(2)]'. Page 2 lists the documents to attach."
  },
  "FORMAT9-2021": {
    officialTitle: "Format 9 — Undertaking (refund of excess payment) to the pension disbursing bank",
    documentDate: "2021 (format issued under CCS (Pension) Rules, 2021)",
    corpusStatus: "summarised-in-ingest",
    rightsNote: "Official format. Linked for download; the format itself is not redistributed.",
    scopeNote: "Required attachment for both the Form 12 and the Form 10 route."
  },
  "FAQ-CIVIL-2018": {
    officialTitle: "Frequently Asked Questions (FAQs) on Pension Policy Issues — Central Civil Pensioners",
    documentDate: "2018 or earlier (predates CCS (Pension) Rules, 2021)",
    corpusStatus: "summarised-as-superseded",
    rightsNote: "Departmental FAQ. Cited only to mark superseded guidance; not redistributed.",
    scopeNote:
      "Superseded. Page 17 still directs claimants to Form 14. Recorded only so SevaPath can warn about that stale instruction."
  },
  "PENSIONER-GUIDELINES": {
    officialTitle: "Guidelines for Pensioners",
    documentDate: "not stated on page",
    corpusStatus: "summarised-in-ingest",
    rightsNote: "Government of India web page. Linked and summarised only; not redistributed.",
    scopeNote:
      "General portal guidance. Used only for background such as PPO verification and contacting the PDA."
  },
  "RBI2026-MD": {
    officialTitle:
      "Reserve Bank of India [Disbursement of Government Pension by Agency Banks (ABs)] Directions, 2026 (Updated as on June 24, 2026)",
    documentDate: "2026-04-30 (RBI/DGBA/2026-27/399), updated 2026-06-24",
    corpusStatus: "summarised-in-ingest",
    rightsNote: "RBI Master Direction. Cited by paragraph number; text not redistributed.",
    scopeNote:
      "Bank-side handling of family pension. Title in public_sources.json ('Government Pension Payment Directions, 2026') is an approximation; the retrieved official title is recorded here instead."
  },
  "PORTAL-TERMS": {
    officialTitle: "Terms of Use / Disclaimer — Pensioners' Portal",
    documentDate: "not stated on page",
    corpusStatus: "rights-policy-only",
    rightsNote:
      "Basis for the SevaPath rights policy. States the portal is not a substitute for the rules and that pages must not be loaded into frames.",
    scopeNote: "Not used for any factual pension instruction."
  },
  "HACKATHON-BRIEF": {
    officialTitle: "Builder brief — Build What Moves India",
    documentDate: "not stated on page",
    corpusStatus: "project-policy-only",
    rightsNote: "Hackathon organiser page. Governs project conduct, not pension law.",
    scopeNote:
      "Project policy: synthetic data only, no live government systems, no implication of official endorsement."
  }
};

const columns = [
  "source_id",
  "issuer",
  "official_title",
  "requested_url",
  "canonical_url",
  "final_url",
  "accessed_utc",
  "document_date",
  "sha256",
  "collection_method",
  "http_status",
  "content_type",
  "bytes",
  "pdf_page_count",
  "pdf_extraction_method",
  "ocr_used",
  "robots_status",
  "corpus_status",
  "rights_note",
  "rights_status",
  "raw_deployment_permitted",
  "relevant_locators",
  "derived_briefs",
  "scope_note"
];

const rows = manifest.results.map((result) => {
  const extra = curated[result.id];
  if (!extra) throw new Error(`No curated metadata for source ${result.id}`);
  const configured = config.sources.find((source) => source.id === result.id);
  const provenance = config.provenance[result.id];
  if (!configured || !provenance) throw new Error(`No configured provenance for ${result.id}`);
  return [
    result.id,
    result.issuer,
    extra.officialTitle,
    result.requestedUrl,
    configured.url,
    result.finalUrl,
    result.collectedAt,
    extra.documentDate,
    result.sha256,
    result.method,
    String(result.httpStatus ?? ""),
    result.contentType,
    String(result.bytes ?? ""),
    String(result.pageCount ?? ""),
    result.extractionMethod ?? "not-applicable",
    String(result.ocrUsed ?? false),
    result.robots?.status ?? "",
    extra.corpusStatus,
    extra.rightsNote,
    provenance.rightsStatus,
    String(provenance.rawDeploymentPermitted),
    provenance.relevantLocators.join(" | "),
    provenance.derivedBriefs.join(" | "),
    extra.scopeNote
  ];
});

const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
const outputPath = path.join(corpusRoot, "source_manifest.csv");
await writeFile(outputPath, `${csv}\n`, "utf8");
console.log(`Wrote ${rows.length} rows to ${path.relative(process.cwd(), outputPath)}`);

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
