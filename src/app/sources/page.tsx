import Link from "next/link";
import { readSourceManifest, type ManifestRow } from "@/lib/corpus-manifest";
import { IconDocument, IconExternal, IconShield } from "@/components/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Where SevaPath gets its guidance — sources and rights"
};

/**
 * The transparency page.
 *
 * Sources are grouped the way a citizen would ask about them — the law, the
 * forms, what the bank must do, what is out of date — rather than in the order
 * the collector happened to fetch them. Nothing here is a claim about the
 * documents: issuer, title, date, checksum and note all come from the
 * committed manifest.
 */

const GROUPS: { id: string; title: string; blurb: string; sourceIds: string[] }[] = [
  {
    id: "rules",
    title: "Rules",
    blurb: "The law this journey rests on. Everything else gives way to these.",
    sourceIds: ["CCS2021-NOTIFICATION", "CCS2021-COMPENDIUM"]
  },
  {
    id: "forms",
    title: "Forms",
    blurb:
      "The forms issued under those rules, and the official list that says which of them is current.",
    sourceIds: ["FORM12-2021", "FORM10-2021", "FORMAT9-2021", "PENSION-FORMS-LIST"]
  },
  {
    id: "bank",
    title: "Bank guidance",
    blurb: "What the pension-paying bank is directed to do.",
    sourceIds: ["RBI2026-MD"]
  },
  {
    id: "archived",
    title: "Archived and superseded guidance",
    blurb:
      "Still published, no longer current. SevaPath keeps it only so it can warn about it.",
    sourceIds: ["FAQ-CIVIL-2018"]
  },
  {
    id: "policy",
    title: "Background and policy",
    blurb:
      "General portal guidance and the terms that govern how SevaPath may use these documents. No pension instruction rests on these.",
    sourceIds: ["PENSIONER-GUIDELINES", "PORTAL-TERMS", "HACKATHON-BRIEF"]
  }
];

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  "summarised-in-ingest": { label: "Current", tone: "chip-current" },
  "summarised-as-superseded": { label: "Archived", tone: "chip-stale" },
  "verification-only": { label: "Cross-check only", tone: "" },
  "rights-policy-only": { label: "Rights policy", tone: "" },
  "project-policy-only": { label: "Project policy", tone: "" }
};

export default async function SourcesPage() {
  const rows = await readSourceManifest();
  const byId = new Map(rows.map((row) => [row.sourceId, row]));

  const grouped = GROUPS.map((group) => ({
    ...group,
    rows: group.sourceIds
      .map((id) => byId.get(id))
      .filter((row): row is ManifestRow => row !== undefined)
  }));

  // Anything the grouping does not know about is still shown, never dropped.
  const placed = new Set(GROUPS.flatMap((group) => group.sourceIds));
  const remaining = rows.filter((row) => !placed.has(row.sourceId));
  if (remaining.length > 0) {
    grouped.push({
      id: "other",
      title: "Other collected sources",
      blurb: "Collected and recorded, not yet grouped.",
      sourceIds: remaining.map((row) => row.sourceId),
      rows: remaining
    });
  }

  return (
    <main id="main">
      <section className="hero" style={{ paddingBottom: "1.5rem" }}>
        <div className="container">
          <span className="eyebrow">Transparency</span>
          <h1 style={{ maxWidth: "18ch" }}>
            Where SevaPath gets its guidance.
          </h1>
          <p className="hero-sub">
            SevaPath uses verified public sources and shows exactly where every
            important statement comes from. It does not host, mirror or re-serve
            any government document — it links to the original and quotes the
            rule, form, page or paragraph its statements rest on.
          </p>
          <p className="trust-line">
            <span>
              <IconDocument size={15} />
              {rows.length} documents
            </span>
            <span>
              <IconExternal size={14} />
              Every one linked, none re-hosted
            </span>
            <span>
              <IconShield size={15} />
              Checksums recorded
            </span>
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "1.5rem" }}>
        <div className="container">
          {grouped.map((group) => (
            <div className="source-group" key={group.id} id={group.id}>
              <div className="source-group-head">
                <h3>{group.title}</h3>
                <span className="count">
                  {group.rows.length}{" "}
                  {group.rows.length === 1 ? "document" : "documents"}
                </span>
              </div>
              <p className="muted" style={{ marginTop: "-0.5rem" }}>
                {group.blurb}
              </p>

              <div className="source-list">
                {group.rows.map((row) => (
                  <SourceCard key={row.sourceId} row={row} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section section-tint" style={{ paddingTop: "2.5rem" }}>
        <div className="container-narrow" style={{ padding: 0 }}>
          <div className="card">
            <h2>Which source wins when they disagree</h2>
            <ol>
              <li>
                The Central Civil Services (Pension) Rules, 2021 as notified in
                the Gazette — the primary law for this journey.
              </li>
              <li>
                The current official form issued under those rules — Form 12,
                Form 10, Format 9.
              </li>
              <li>
                The Pensioners&rsquo; Portal current forms list, for deciding
                which form is current and which is archived.
              </li>
              <li>
                Reserve Bank of India directions, for what the bank must do.
              </li>
              <li>
                Departmental FAQs and general portal guidance — background only.
              </li>
            </ol>
            <div className="notice notice-warn">
              <h3>The one conflict in this collection</h3>
              <p style={{ marginBottom: 0 }}>
                The Department&rsquo;s FAQ predates the 2021 Rules and still
                points readers to Form 14. By the order above, the 2021 Rules
                and the current forms list govern, and the FAQ answer is kept
                only so SevaPath can warn about it.
              </p>
            </div>
          </div>

          <div className="card">
            <h2>Why these are links, not copies</h2>
            <p>
              The Pensioners&rsquo; Portal Terms of Use say the information
              there gives a general overview and is not a substitute for the
              rules, and advise readers to consult the original rules and
              orders. A frozen copy cannot honour that. Forms change — Form 14
              has moved to that portal&rsquo;s Archives — so a link stays right
              where a copy would go stale.
            </p>
            <p style={{ marginBottom: 0 }}>
              The checksums recorded above identify which version of each
              document SevaPath read, so the collection can be verified without
              this site ever redistributing the documents themselves.
            </p>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <h2>How the documents were collected</h2>
            <p>
              A collector script reads only the URLs in an allowlist committed
              to the repository. It refuses any host outside that list — checked
              again on the final URL after redirects — refuses non-HTTPS URLs,
              waits between requests, caps response size, identifies itself with
              a descriptive user agent, and checks <code>robots.txt</code>,
              skipping any source that is disallowed.
            </p>
            <p style={{ marginBottom: 0 }}>
              No login, CAPTCHA, rate limit or access control is bypassed. Every
              document in the list is a public form, a public rule, or a public
              web page. The downloaded originals stay on the machine that ran
              the collector; they are not committed and are not deployed.
            </p>
          </div>

          <p style={{ marginTop: "1.75rem", marginBottom: 0 }}>
            <Link href="/#start">← Back to the guided journey</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function SourceCard({ row }: { row: ManifestRow }) {
  const status = STATUS_LABEL[row.corpusStatus] ?? {
    label: row.corpusStatus,
    tone: ""
  };
  const archived = row.corpusStatus === "summarised-as-superseded";

  return (
    <article className={`source-card${archived ? " is-archived" : ""}`}>
      <span className={`status-chip ${status.tone}`}>{status.label}</span>
      <span className="issuer">{row.issuer}</span>
      <h4>{row.officialTitle}</h4>
      <p className="why">{row.scopeNote}</p>

      <div className="source-meta">
        <span>Document date: {row.documentDate}</span>
        <span>Last checked: {row.accessedUtc.slice(0, 10)}</span>
        <span>
          SHA-256 <code>{row.sha256.slice(0, 16)}…</code>
        </span>
      </div>

      <a
        className="source-link"
        href={row.finalUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open the official document
        <IconExternal size={13} />
      </a>
    </article>
  );
}
