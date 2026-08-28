import Link from "next/link";
import { JourneyClient } from "@/components/JourneyClient";
import { SYNTHETIC_CASES } from "@/lib/domain/synthetic-records";

export default function HomePage() {
  const cases = SYNTHETIC_CASES.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description
  }));

  return (
    <div className="shell">
      <header className="masthead">
        <h1 className="wordmark">SevaPath</h1>
        <p className="tagline">
          Starting Central Civil family pension after a pensioner&rsquo;s death —
          one journey, done clearly.
        </p>
      </header>

      <main id="main">
        <section className="card">
          <div className="notice notice-warn" role="note">
            <h3>Read this first</h3>
            <p>
              SevaPath is a hackathon prototype. It is <strong>not</strong> an
              official government service and has no connection to the Department
              of Pension and Pensioners&rsquo; Welfare, to any bank, or to the
              Reserve Bank of India.
            </p>
            <p style={{ marginBottom: 0 }}>
              It uses invented records only. It will never ask you for an
              Aadhaar number, a PAN, a real PPO number, bank details, an OTP or a
              password, and it has no file upload.
            </p>
          </div>

          <h2>What SevaPath does, and what it will not do</h2>
          <div className="two-column">
            <div>
              <h3>It does</h3>
              <ul>
                <li>Work out which form applies, using fixed rules</li>
                <li>Read the demonstration records and compare them</li>
                <li>Show you differences and ask a person to resolve them</li>
                <li>List what to gather, with the source for each item</li>
                <li>Answer questions with a link to the official document</li>
              </ul>
            </div>
            <div>
              <h3>It will not</h3>
              <ul>
                <li>Decide whether you are eligible</li>
                <li>Calculate or estimate any amount</li>
                <li>Confirm anyone&rsquo;s identity</li>
                <li>Decide that two differently spelled names are one person</li>
                <li>Submit anything to any government system</li>
              </ul>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            Those are the department&rsquo;s decisions to make, not a
            prototype&rsquo;s. See the{" "}
            <Link href="/sources">sources page</Link> for every official document
            SevaPath relies on.
          </p>
        </section>

        <JourneyClient cases={cases} />
      </main>

      <footer className="site-footer">
        <p>
          SevaPath — a hackathon prototype built for the Build What Moves India
          builder brief. Not an official government service. No government logo,
          seal or emblem is used, and no endorsement is implied.
        </p>
        <p>
          All records shown are synthetic. Official sources are linked, never
          copied or re-hosted. <Link href="/sources">Sources and rights</Link>
        </p>
      </footer>
    </div>
  );
}
