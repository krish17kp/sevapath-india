import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "SevaPath — starting family pension (hackathon prototype)",
  description:
    "A hackathon prototype that helps a surviving spouse named in a Central Civil Pension Payment Order prepare a family pension claim. Not an official government service.",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never block a citizen from zooming in on a small screen.
  maximumScale: 5
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <p className="prototype-banner" role="note">
          Hackathon prototype — not an official government service. Synthetic
          demonstration records only. Nothing here is submitted anywhere.
        </p>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
