import Link from "next/link";
import { readSourceManifest } from "@/lib/corpus-manifest";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sources and rights — SevaPath"
};

export default async function SourcesPage() {
  const rows = await readSourceManifest();

  return (
    <div className="shell">
      <header className="masthead">
        <h1 className="wordmark">Sources</h1>
        <p className="tagline">
          Every official document SevaPath relies on, and how it was collected.
        </p>
      </header>

      <main id="main">
        <p>
          <Link href="/">← Back to the walkthrough</Link>
        </p>

        <section className="card">
          <h2>Why these are links, not copies</h2>
          <p>
            SevaPath does not host, mirror, or re-serve any government document.
            It links to the original and quotes the exact rule, form, page or
            paragraph its statements rest on.
          </p>
          <p>
            The Pensioners&rsquo; Portal Terms of Use say the information there
            gives a general overview and is not a substitute for the rules, and
            advise readers to consult the original rules and orders. A frozen
            copy cannot honour that. Forms change — Form 14 has moved to that
            portal&rsquo;s Archives — so a link stays right where a copy would go
            stale.
          </p>
          <p style={{ marginBottom: 0 }}>
            The checksums below record which version of each document SevaPath
            read, so the corpus can be verified without this site ever
            redistributing the documents themselves.
          </p>
        </section>

        <section className="card">
          <h2>Collected sources</h2>
          <p className="muted">
            {rows.length} documents. &ldquo;Accessed&rdquo; is when SevaPath
            downloaded the document; the checksum identifies that exact copy.
          </p>

          <div className="table-scroll">
            <table className="source-table">
              <caption className="visually-hidden">
                Official sources collected for the SevaPath corpus, with issuer,
                access time, collection method and checksum.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Issuer</th>
                  <th scope="col">Accessed</th>
                  <th scope="col">How</th>
                  <th scope="col">Use in corpus</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sourceId}>
                    <th scope="row" style={{ fontWeight: 600 }}>
                      <a href={row.finalUrl} target="_blank" rel="noopener noreferrer">
                        {row.officialTitle}
                      </a>
                      <br />
                      <span className="muted">
                        Document date: {row.documentDate}
                      </span>
                      <br />
                      <span className="muted" style={{ wordBreak: "break-all" }}>
                        SHA-256 {row.sha256.slice(0, 16)}…
                      </span>
                    </th>
                    <td>{row.issuer}</td>
                    <td>{row.accessedUtc.slice(0, 10)}</td>
                    <td>{row.collectionMethod}</td>
                    <td>
                      {row.corpusStatus}
                      <br />
                      <span className="muted">{row.scopeNote}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Which source wins when they disagree</h2>
          <ol>
            <li>
              The Central Civil Services (Pension) Rules, 2021 as notified in the
              Gazette — the primary law for this journey.
            </li>
            <li>
              The current official form issued under those rules — Form 12, Form
              10, Format 9.
            </li>
            <li>
              The Pensioners&rsquo; Portal current forms list, for deciding which
              form is current and which is archived.
            </li>
            <li>Reserve Bank of India directions, for what the bank must do.</li>
            <li>Departmental FAQs and general portal guidance — background only.</li>
          </ol>
          <p style={{ marginBottom: 0 }}>
            This corpus contains one known conflict: the Department&rsquo;s FAQ
            predates the 2021 Rules and still points to Form 14. By the order
            above, the 2021 Rules and the current forms list govern, and the FAQ
            answer is kept only so SevaPath can warn about it.
          </p>
        </section>

        <section className="card">
          <h2>How the documents were collected</h2>
          <p>
            A collector script reads only the URLs in an allowlist committed to
            the repository. It refuses any host outside that list — checked again
            on the final URL after redirects — refuses non-HTTPS URLs, waits
            between requests, caps response size, identifies itself with a
            descriptive user agent, and checks <code>robots.txt</code>, skipping
            any source that is disallowed.
          </p>
          <p style={{ marginBottom: 0 }}>
            No login, CAPTCHA, rate limit or access control is bypassed. Every
            document in the list is a public form, a public rule, or a public web
            page. The downloaded originals stay on the machine that ran the
            collector; they are not committed and are not deployed.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          SevaPath is a hackathon prototype and not an official government
          service. Linking to these documents does not imply any endorsement by
          their issuers.
        </p>
      </footer>
    </div>
  );
}
