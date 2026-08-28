import Link from "next/link";
import { IconArrowRight, IconSeva } from "./Icons";

/**
 * The header and footer shared by every page.
 *
 * Navigation is deliberately short: how it works, where the guidance comes
 * from, and what the prototype refuses to do. Developer-facing material stays
 * in the repository, not in a citizen's navigation bar.
 */

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link className="brand-mark" href="/">
          <span className="brand-glyph" aria-hidden="true">
            <IconSeva size={18} />
          </span>
          <span className="brand-name">SevaPath</span>
          <span className="brand-tag">Prototype</span>
        </Link>

        <nav className="site-nav" aria-label="Main">
          <Link className="nav-link" href="/#how-it-works">
            How it works
          </Link>
          <Link className="nav-link" href="/sources">
            Sources
          </Link>
          <Link className="nav-link" href="/#safety">
            Safety
          </Link>
        </nav>

        <Link className="button button-primary header-cta" href="/#start">
          Start guidance
          <IconArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <p style={{ marginBottom: "0.35rem" }}>
              <strong style={{ fontSize: "1.05rem" }}>SevaPath</strong>
            </p>
            <p style={{ marginBottom: 0, maxWidth: "34rem" }}>
              An independent hackathon prototype that helps a surviving spouse
              work out the right Central Civil family-pension route before
              visiting the bank or the office. Built for the Build What Moves
              India builder brief.
            </p>
          </div>

          <div>
            <p className="footer-heading">Find out more</p>
            <ul className="footer-links">
              <li>
                <Link href="/sources">Sources and rights</Link>
              </li>
              <li>
                <Link href="/#safety">Safety and privacy</Link>
              </li>
              <li>
                <Link href="/#how-it-works">How it works</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-note">
          <p>
            <strong>
              Not affiliated with or endorsed by the Government of India.
            </strong>{" "}
            No government logo, seal or emblem is used. Official documents are
            linked, never copied or re-hosted.
          </p>
          <p>
            Every record in this prototype is invented. Nothing is submitted to
            any government system.
          </p>
        </div>
      </div>
    </footer>
  );
}
