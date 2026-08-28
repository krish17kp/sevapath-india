/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JourneyClient } from "@/components/JourneyClient";
import { assess } from "@/lib/domain/assessment";
import { buildClaimSummary, renderClaimSummaryText } from "@/lib/domain/summary";
import { submitMockClaim } from "@/lib/domain/submission";
import { SYNTHETIC_CASES } from "@/lib/domain/synthetic-records";
import type { ScopeAnswers } from "@/lib/domain/types";

const CASES = SYNTHETIC_CASES.map((item) => ({
  id: item.id,
  label: item.label,
  description: item.description
}));

/**
 * Serves the real domain logic over a stubbed fetch, so these tests exercise
 * the actual assessment rather than a hand-written fixture.
 */
function stubApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        scope?: ScopeAnswers;
        caseId?: string;
        question?: string;
      };

      if (url.endsWith("/api/assess")) {
        const assessment = await assess({
          scope: body.scope as ScopeAnswers,
          caseId: body.caseId ?? "name_variation",
          retrievalAvailable: true,
          useModel: false
        });
        const summary = buildClaimSummary(assessment);
        return json({
          assessment,
          summary,
          summaryText: renderClaimSummaryText(summary),
          retrieval: { adapter: "local", available: true, detail: "ok" }
        });
      }

      if (url.endsWith("/api/submit")) {
        const assessment = await assess({
          scope: body.scope as ScopeAnswers,
          caseId: body.caseId ?? "name_variation",
          retrievalAvailable: true,
          useModel: false
        });
        return json({ ...submitMockClaim(assessment), state: assessment.state });
      }

      return json({ outcome: "insufficient_evidence", answer: "", citations: [] });
    })
  );
}

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

beforeEach(() => {
  stubApi();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function completeScopeAndRun(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /fill in the example answers/i }));
  await user.click(screen.getByRole("button", { name: /read the records and run the checks/i }));
}

describe("scope step", () => {
  it("keeps the run button disabled until every question is answered", () => {
    render(<JourneyClient cases={CASES} />);

    expect(
      screen.getByRole("button", { name: /read the records and run the checks/i })
    ).toBeDisabled();
  });

  it("labels every scope question and its options", () => {
    render(<JourneyClient cases={CASES} />);

    expect(
      screen.getByRole("group", { name: /surviving spouse of the person who has died/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /already written in their Pension Payment Order/i })
    ).toBeInTheDocument();
  });

  it("enables the run button once the example answers are filled in", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await user.click(screen.getByRole("button", { name: /fill in the example answers/i }));

    expect(
      screen.getByRole("button", { name: /read the records and run the checks/i })
    ).toBeEnabled();
  });
});

describe("the visible name mismatch", () => {
  it("shows both spellings and asks a person to resolve them", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await completeScopeAndRun(user);

    // The phrase also appears inside the printable worksheet, so target the
    // check's own heading rather than any matching text.
    const heading = await screen.findByRole("heading", {
      name: /Claimant's name is written differently across records/i
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();

    // All three values are shown verbatim: the PPO and the death certificate
    // agree, the bank record carries the extra initial.
    const shown = Array.from(
      (section as HTMLElement).querySelectorAll(".value-text")
    ).map((node) => node.textContent);

    expect(shown).toEqual(["Meera Sharma", "Meera Sharma", "Meera R. Sharma"]);

    const scoped = within(section as HTMLElement);
    expect(scoped.getByText(/Do not alter any record yourself/i)).toBeInTheDocument();
  });

  it("reports the review-required state", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await completeScopeAndRun(user);

    const badge = await screen.findByText("Review required");
    expect(badge).toHaveAttribute("data-state", "review_required");
  });
});

describe("blocked case", () => {
  it("blocks preparation when the date of death cannot be read", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await user.click(screen.getByRole("button", { name: /fill in the example answers/i }));
    await user.click(screen.getByRole("radio", { name: /date of death not readable/i }));
    await user.click(
      screen.getByRole("button", { name: /read the records and run the checks/i })
    );

    const badge = await screen.findByText("Blocked — information missing");
    expect(badge).toHaveAttribute("data-state", "blocked_missing_information");
  });
});

describe("unsupported scenario", () => {
  it("declines and refers elsewhere without inventing a route", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await user.click(screen.getByRole("button", { name: /fill in the example answers/i }));
    const spouseGroup = screen.getByRole("group", {
      name: /surviving spouse of the person who has died/i
    });
    await user.click(within(spouseGroup).getByRole("radio", { name: "No" }));
    await user.click(
      screen.getByRole("button", { name: /read the records and run the checks/i })
    );

    expect(await screen.findByText("Not covered by this walkthrough")).toBeInTheDocument();
    expect(screen.getByText(/only walks through the surviving spouse/i)).toBeInTheDocument();
    // No checklist and no submission for a case SevaPath has not verified.
    expect(
      screen.queryByRole("button", { name: /run the demonstration submission/i })
    ).not.toBeInTheDocument();
  });
});

describe("mock submission", () => {
  it("produces a receipt that says it is not real", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await completeScopeAndRun(user);
    await user.click(
      await screen.findByRole("button", { name: /run the demonstration submission/i })
    );

    const receiptHeading = await screen.findByRole("heading", {
      name: /no claim has been submitted/i
    });
    const receipt = within(receiptHeading.closest("div") as HTMLElement);

    expect(receipt.getByText(/DEMO-NOT-A-REAL-RECEIPT/)).toBeInTheDocument();
    expect(receipt.getByText(/not valid anywhere/i)).toBeInTheDocument();
    expect(receipt.getByText(/not issued by any government body/i)).toBeInTheDocument();
  });

  it("refuses to produce a receipt for a blocked claim", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await user.click(screen.getByRole("button", { name: /fill in the example answers/i }));
    await user.click(screen.getByRole("radio", { name: /date of death not readable/i }));
    await user.click(
      screen.getByRole("button", { name: /read the records and run the checks/i })
    );

    // The submission is not offered at all for a blocked claim.
    await screen.findByText("Blocked — information missing");
    expect(
      screen.queryByRole("button", { name: /run the demonstration submission/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Not ready to prepare yet/i)).toBeInTheDocument();
  });
});

describe("safety on screen", () => {
  it("never asks for personal data and offers no upload", () => {
    const { container } = render(<JourneyClient cases={CASES} />);

    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByLabelText(/aadhaar/i)).toBeNull();
    expect(screen.queryByLabelText(/\bpan\b/i)).toBeNull();
    expect(screen.queryByLabelText(/otp/i)).toBeNull();
  });

  it("shows no amount anywhere in the journey", async () => {
    const user = userEvent.setup();
    const { container } = render(<JourneyClient cases={CASES} />);

    await completeScopeAndRun(user);
    await screen.findByText("Review required");

    expect(container.textContent).not.toMatch(/₹/);
    expect(container.textContent).not.toMatch(/\bRs\.?\s*\d/);
  });

  it("marks each record as synthetic", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await completeScopeAndRun(user);

    const tags = await screen.findAllByText("Synthetic");
    expect(tags).toHaveLength(3);
  });
});

describe("keyboard access", () => {
  it("reaches the scope radios and the run button by tabbing", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    await user.tab();
    expect(document.activeElement).toBeInstanceOf(HTMLInputElement);
    expect((document.activeElement as HTMLInputElement).type).toBe("radio");
  });

  it("can complete the scope step with the keyboard alone", async () => {
    const user = userEvent.setup();
    render(<JourneyClient cases={CASES} />);

    const exampleButton = screen.getByRole("button", {
      name: /fill in the example answers/i
    });
    exampleButton.focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("button", { name: /read the records and run the checks/i })
    ).toBeEnabled();
  });
});
