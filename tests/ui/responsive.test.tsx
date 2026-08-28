/**
 * @vitest-environment jsdom
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CheckResults } from "@/components/CheckList";
import { RecordCard } from "@/components/RecordCard";
import { GuidancePanel } from "@/components/GuidancePanel";
import { extractDeterministically } from "@/lib/domain/extraction";
import { getSyntheticCase } from "@/lib/domain/synthetic-records";
import { runChecks } from "@/lib/domain/validation/checks";
import { extractCase } from "@/lib/domain/extraction";

/**
 * jsdom does not lay out, so these tests check the two things that actually
 * cause horizontal overflow on a 360px phone and that *are* observable here:
 * the stylesheet's wrapping rules, and the absence of any fixed width wider
 * than the viewport in the rendered markup.
 */

const NARROW_VIEWPORT = 360;

const css = await readFile(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("stylesheet guards against horizontal overflow", () => {
  it("hides horizontal overflow on the page itself", () => {
    expect(css).toMatch(/html\s*\{[^}]*overflow-x:\s*hidden/);
    expect(css).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/);
  });

  it("wraps long words, URLs and reference strings", () => {
    // Official titles, URLs and checksums are the long unbreakable strings here.
    expect(css).toMatch(/a\s*\{[^}]*overflow-wrap:\s*break-word/);
    expect(css).toMatch(/\.value-text\s*\{[^}]*overflow-wrap:\s*break-word/);
    expect(css).toMatch(/\.reference\s*\{[^}]*word-break:\s*break-all/);
    expect(css).toMatch(/\.summary-block pre\s*\{[^}]*white-space:\s*pre-wrap/);
  });

  it("lets grid children shrink below their content width", () => {
    // Without min-width:0 a grid or flex child refuses to shrink and pushes
    // the page sideways.
    const minWidthZeroRules = css.match(/min-width:\s*0/g) ?? [];
    expect(minWidthZeroRules.length).toBeGreaterThanOrEqual(5);
  });

  it("stacks multi-column layouts by default and only widens above 360px", () => {
    // The single-column default is what a 360px screen gets.
    expect(css).toMatch(/\.record-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
    expect(css).toMatch(/\.two-column\s*\{[^}]*grid-template-columns:\s*1fr/);

    for (const match of css.matchAll(/@media\s*\(min-width:\s*([\d.]+)rem\)/g)) {
      // 16px root font size; every breakpoint must be wider than the phone.
      expect(Number(match[1]) * 16).toBeGreaterThan(NARROW_VIEWPORT);
    }
  });

  it("scrolls the wide sources table inside its own container", () => {
    expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
  });

  it("keeps every interactive control at a 44px tap target", () => {
    for (const selector of [
      "button,\n.button",
      "\\.choice",
      '\\.ask-form input\\[type="text"\\]',
      "\\.suggestion"
    ]) {
      const rule = new RegExp(`${selector}\\s*\\{[^}]*min-height:\\s*44px`);
      expect(css, selector).toMatch(rule);
    }

    // Nothing may opt back out to a smaller target.
    expect(css).not.toMatch(/min-height:\s*(?:0|[1-3]?\d)px/);
  });

  it("honours a reduced-motion preference", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/animation-duration:\s*0\.001ms\s*!important/);
  });

  it("provides a visible focus ring for keyboard users", () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid/);
  });
});

describe("rendered markup at 360px", () => {
  it("sets no fixed pixel width wider than the viewport", async () => {
    const extraction = await extractCase(getSyntheticCase("name_variation"), {
      useModel: false
    });
    const { container } = render(<CheckResults checks={runChecks(extraction)} />);

    for (const node of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
      const width = node.style.width;
      if (width.endsWith("px")) {
        expect(Number.parseFloat(width)).toBeLessThanOrEqual(NARROW_VIEWPORT);
      }
      expect(node.style.minWidth).not.toMatch(/^\d{3,}px$/);
    }
  });

  it("renders the longest record without a fixed-width element", () => {
    const [ppo] = getSyntheticCase("name_variation").records;
    const { container } = render(<RecordCard record={extractDeterministically(ppo!)} />);

    for (const node of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
      expect(node.style.width).not.toMatch(/px$/);
    }
  });

  it("uses no layout table for content", async () => {
    const extraction = await extractCase(getSyntheticCase("name_variation"), {
      useModel: false
    });
    const { container } = render(<CheckResults checks={runChecks(extraction)} />);

    expect(container.querySelector("table")).toBeNull();
  });
});

describe("guidance panel accessibility", () => {
  it("labels its input and describes what it will not answer", () => {
    render(<GuidancePanel />);

    const input = screen.getByLabelText(/ask a question about this journey/i);
    expect(input).toBeInTheDocument();

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toMatch(
      /will not tell you an amount or decide your eligibility/i
    );
  });

  it("announces answers politely rather than stealing focus", () => {
    const { container } = render(<GuidancePanel />);

    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
  });

  it("caps the question length", () => {
    render(<GuidancePanel />);

    expect(screen.getByLabelText(/ask a question about this journey/i)).toHaveAttribute(
      "maxlength",
      "500"
    );
  });
});
