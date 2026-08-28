import Link from "next/link";
import { JourneyClient } from "@/components/JourneyClient";
import {
  IconArrowDown,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconCross,
  IconSeva,
  IconShield
} from "@/components/Icons";
import { SYNTHETIC_CASES } from "@/lib/domain/synthetic-records";

const JOURNEY_STEPS = [
  {
    title: "Answer a few questions",
    note: "Four plain questions about your situation. No personal details."
  },
  {
    title: "Check the records",
    note: "SevaPath reads three example documents and compares them."
  },
  {
    title: "Get your route",
    note: "One form, one office, chosen by fixed verified rules."
  },
  {
    title: "Prepare the right documents",
    note: "What to bring, what is already confirmed, what needs a person."
  }
];

const DOES = [
  "Works out which form applies, using fixed verified rules",
  "Reads the example records and compares them with each other",
  "Shows you every difference and asks a person to resolve it",
  "Lists what to gather, with the official source for each item",
  "Answers questions with a link to the official document"
];

const DOES_NOT = [
  "Decide whether you are eligible",
  "Calculate or estimate any amount",
  "Confirm anyone's identity",
  "Decide that two differently spelled names are one person",
  "Submit anything to any government system"
];

export default function HomePage() {
  const cases = SYNTHETIC_CASES.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description
  }));

  return (
    <main id="main">
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Family pension guidance</span>
            <h1>Know what to do next after a pensioner&rsquo;s death.</h1>
            <p className="hero-sub">
              SevaPath helps a surviving spouse find the correct Central Civil
              family-pension route, check sample records, and understand what to
              prepare before visiting the responsible office or bank.
            </p>

            <div className="hero-actions">
              <a className="button button-primary button-lg" href="#start">
                Start guidance
                <IconArrowRight size={18} />
              </a>
              <a className="button button-lg" href="#how-it-works">
                See how SevaPath works
              </a>
            </div>

            <p className="trust-line">
              <span>
                <IconClock size={15} />
                About 3 minutes
              </span>
              <span>
                <IconShield size={15} />
                No real personal data required
              </span>
              <span>
                <IconSeva size={15} />
                Independent prototype
              </span>
            </p>
          </div>

          <div className="journey-map">
            <p className="journey-map-title">The path SevaPath walks with you</p>
            <ol>
              {JOURNEY_STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="dot" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>
                    <span className="step-title">{step.title}</span>
                    <span className="step-note">{step.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section section-tint" id="how-it-works">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow eyebrow-ink">Why this exists</span>
            <h2>Three official answers. One grieving spouse.</h2>
            <p>
              Everything below is genuinely published by the government today.
              The trouble is that it is published in different places, and one of
              those places is out of date.
            </p>
          </div>

          <div className="conflict-grid">
            <div className="conflict-card is-stale">
              <span className="source-name">Departmental FAQ, still online</span>
              <span className="form-name">Form 14</span>
              <span className="status-chip chip-stale">Archived</span>
              <p className="form-note">
                The FAQ predates the 2021 Rules. Form 14 now sits under
                &ldquo;Archives&rdquo; on the Pensioners&rsquo; Portal.
              </p>
            </div>

            <div className="conflict-card is-current">
              <span className="source-name">
                CCS (Pension) Rules, 2021 — Rule 79(2)(a)(ii)
              </span>
              <span className="form-name">Form 12</span>
              <span className="status-chip chip-current">Current</span>
              <p className="form-note">
                For a spouse already named in the Pension Payment Order. Goes to
                the Pension Disbursing Authority.
              </p>
            </div>

            <div className="conflict-card is-alternate">
              <span className="source-name">
                CCS (Pension) Rules, 2021 — Rule 79(2)(b)(i)
              </span>
              <span className="form-name">Form 10</span>
              <span className="status-chip chip-alternate">Different route</span>
              <p className="form-note">
                For a claimant not named in the Pension Payment Order. Goes to
                the Head of Office instead.
              </p>
            </div>
          </div>

          <div className="citizen-question">
            <p className="bubble">
              &ldquo;Which one actually applies to me?&rdquo;
            </p>
          </div>

          <div className="resolve-arrow" aria-hidden="true">
            <IconArrowDown size={32} />
          </div>

          <div className="resolution">
            <p>SevaPath turns scattered rules and forms into one guided path.</p>
            <p className="resolution-note">
              Fixed rules decide the route — not a language model. Every
              statement carries the rule, form or page it came from, so you can
              check it yourself.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="safety">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow eyebrow-ink">Safety and privacy</span>
            <h2>What SevaPath does, and what it will not do</h2>
            <p>
              SevaPath is a prototype. It has no connection to the Department of
              Pension and Pensioners&rsquo; Welfare, to any bank, or to the
              Reserve Bank of India, and it uses invented records only.
            </p>
          </div>

          <div className="two-column">
            <div className="card" style={{ marginBottom: 0 }}>
              <h3>It does</h3>
              <ul className="duty-list duty-does">
                {DOES.map((item) => (
                  <li key={item}>
                    <span className="glyph" aria-hidden="true">
                      <IconCheck size={17} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <h3>It will not</h3>
              <ul className="duty-list duty-does-not">
                {DOES_NOT.map((item) => (
                  <li key={item}>
                    <span className="glyph" aria-hidden="true">
                      <IconCross size={17} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="notice notice-info" style={{ marginTop: "1.25rem" }}>
            <h3>It will never ask you for personal information</h3>
            <p style={{ marginBottom: 0 }}>
              There is no login, no file upload, and no field for an Aadhaar
              number, a PAN, a real PPO number, bank details, an OTP or a
              password. Those decisions above belong to the department, not to a
              prototype. See the{" "}
              <Link href="/sources">sources page</Link> for every official
              document SevaPath relies on.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-tint" id="start">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow eyebrow-ink">Guided journey</span>
            <h2>Let&rsquo;s find your route</h2>
            <p>
              Five short steps. You can stop at any point — nothing is stored and
              nothing is sent anywhere.
            </p>
          </div>

          <JourneyClient cases={cases} />
        </div>
      </section>
    </main>
  );
}
