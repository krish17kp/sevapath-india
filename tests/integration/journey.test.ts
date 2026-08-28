import { describe, expect, it } from "vitest";
import { assess } from "@/lib/domain/assessment";
import { buildClaimSummary, renderClaimSummaryText } from "@/lib/domain/summary";
import { submitMockClaim, DEMO_RECEIPT_PREFIX } from "@/lib/domain/submission";
import type { ScopeAnswers } from "@/lib/domain/types";

/**
 * End-to-end through the domain: scope answers in, journey state, summary and
 * mock receipt out. No HTTP, so these run fast and deterministically.
 */

const IN_SCOPE: ScopeAnswers = {
  isSurvivingSpouse: true,
  isCentralCivilPension: true,
  isNamedInPpo: true,
  familyPensionAlreadyStarted: false
};

function run(caseId: string, overrides?: Partial<ScopeAnswers>, retrieval = true) {
  return assess({
    scope: { ...IN_SCOPE, ...overrides },
    caseId,
    retrievalAvailable: retrieval,
    useModel: false
  });
}

describe("journey states", () => {
  it("reaches review_required for the name variation case", async () => {
    const assessment = await run("name_variation");

    expect(assessment.state).toBe("review_required");
    expect(assessment.route.route).toBe("form12_pda");
  });

  it("reaches blocked_missing_information when the date of death is unreadable", async () => {
    const assessment = await run("missing_death_date");

    expect(assessment.state).toBe("blocked_missing_information");
  });

  it("reaches unsupported_scenario when the scope does not apply", async () => {
    const assessment = await run("matched", { isSurvivingSpouse: false });

    expect(assessment.state).toBe("unsupported_scenario");
    expect(assessment.checks).toHaveLength(0);
    expect(assessment.checklist).toHaveLength(0);
  });

  it("is ready when the records agree, and still discloses that no model ran", async () => {
    const assessment = await run("matched");

    // How SevaPath read the records is a system condition, not a finding about
    // the claim, so it is reported alongside the state rather than replacing it.
    expect(assessment.state).toBe("ready");
    expect(assessment.systemStates).toContain("model_unavailable_deterministic_fallback");
    expect(assessment.extraction.engine).toBe("deterministic");
    expect(assessment.extraction.notice).not.toBeNull();
  });

  it("reports retrieval_unavailable as a system state", async () => {
    const assessment = await run("matched", {}, false);

    expect(assessment.systemStates).toContain("retrieval_unavailable");
  });

  it("ranks a blocking problem above a system notice", async () => {
    const assessment = await run("missing_death_date", {}, false);

    expect(assessment.state).toBe("blocked_missing_information");
    // The system condition is still reported, just not as the headline.
    expect(assessment.systemStates).toContain("retrieval_unavailable");
  });

  it("routes a spouse not named in the PPO to Form 10 and never mentions Form 12", async () => {
    const assessment = await run("matched", { isNamedInPpo: false });

    expect(assessment.route.route).toBe("form10_hoo");

    // The Head of Office route gets Form 10's own document list.
    const ids = assessment.checklist.map((item) => item.id);
    expect(ids).toContain("form10");
    expect(ids).toContain("family_details_form4");
    expect(ids).not.toContain("form12");

    // Handing a Head of Office claimant Form 12 instructions is the exact
    // wrong-form mistake this product exists to prevent, so no part of the
    // worksheet or the demonstration receipt may name Form 12 on this route.
    const worksheet = renderClaimSummaryText(buildClaimSummary(assessment));
    expect(worksheet).toContain("Form 10");
    expect(worksheet).not.toContain("Form 12");
    expect(worksheet).not.toContain("Rule 79(2)(a)(ii)");

    const outcome = submitMockClaim(assessment);
    expect(outcome.accepted).toBe(true);
    if (!outcome.accepted) throw new Error("expected the demonstration to run");
    const next = outcome.receipt.whatHappensNext.join(" ");
    expect(next).toContain("Head of Office");
    expect(next).toContain("Rule 79(2)(b)(i)");
    expect(next).not.toContain("Form 12");
    // A receipt that confirms nothing is not a demonstration of anything.
    expect(outcome.receipt.outstanding.length).toBeGreaterThan(0);
  });
});

describe("claim preparation summary", () => {
  it("shows both spellings and marks them unresolved", async () => {
    const assessment = await run("name_variation");
    const summary = buildClaimSummary(assessment);

    const nameItem = summary.unresolved.find((item) =>
      item.label.toLowerCase().includes("claimant")
    );
    const values = nameItem?.values.map((entry) => entry.value) ?? [];

    expect(values).toContain("Meera Sharma");
    expect(values).toContain("Meera R. Sharma");
  });

  it("never merges the two values into one", async () => {
    const assessment = await run("name_variation");
    const text = renderClaimSummaryText(buildClaimSummary(assessment));

    expect(text).toContain("Meera Sharma");
    expect(text).toContain("Meera R. Sharma");
    // No invented reconciliation such as "Meera R Sharma" without the period.
    expect(text).not.toMatch(/Meera R Sharma/);
  });

  it("marks itself as a non-official demonstration", async () => {
    const assessment = await run("matched");
    const text = renderClaimSummaryText(buildClaimSummary(assessment));

    expect(text).toMatch(/not a government form/i);
    expect(text).toMatch(/has not been submitted/i);
    expect(text).toMatch(/synthetic/i);
  });

  it("contains no amount, rate, or eligibility statement", async () => {
    const assessment = await run("matched");
    const text = renderClaimSummaryText(buildClaimSummary(assessment));

    expect(text).not.toMatch(/₹|\brupees\b|\bRs\.?\s*\d/i);
    expect(text).not.toMatch(/\byou are eligible\b/i);
    expect(text).not.toMatch(/\bper month\b/i);
  });

  it("tells the person where to take the papers", async () => {
    const assessment = await run("matched");
    const summary = buildClaimSummary(assessment);

    expect(summary.route.recipient).toMatch(/bank branch/i);
    expect(summary.nextSteps.join(" ")).toMatch(/Form 12/);
    expect(summary.nextSteps.join(" ")).toMatch(/Format 9/);
  });
});

describe("mock submission", () => {
  it("issues a receipt that is obviously not real", async () => {
    const assessment = await run("matched");
    const outcome = submitMockClaim(assessment);

    expect(outcome.accepted).toBe(true);
    if (!outcome.accepted) return;

    expect(outcome.receipt.reference.startsWith(DEMO_RECEIPT_PREFIX)).toBe(true);
    expect(outcome.receipt.isDemonstration).toBe(true);
    expect(outcome.receipt.heading).toMatch(/no claim has been submitted/i);
    expect(outcome.receipt.statements.join(" ")).toMatch(/not issued by any government/i);
    expect(outcome.receipt.statements.join(" ")).toMatch(/not valid anywhere/i);
  });

  it("refuses to issue a receipt for a blocked claim", async () => {
    const assessment = await run("missing_death_date");
    const outcome = submitMockClaim(assessment);

    expect(outcome.accepted).toBe(false);
    if (outcome.accepted) return;
    expect(outcome.reason).toMatch(/could not be read/i);
  });

  it("refuses to issue a receipt for an unsupported scenario", async () => {
    const assessment = await run("matched", { isSurvivingSpouse: false });
    const outcome = submitMockClaim(assessment);

    expect(outcome.accepted).toBe(false);
  });

  it("allows a review-required claim through but names the unresolved item", async () => {
    const assessment = await run("name_variation");
    const outcome = submitMockClaim(assessment);

    expect(outcome.accepted).toBe(true);
    if (!outcome.accepted) return;
    expect(outcome.receipt.outstanding.join(" ")).toMatch(/Unresolved/);
  });

  it("produces the same reference for the same inputs", async () => {
    const assessment = await run("matched");
    const now = new Date("2026-08-27T10:00:00.000Z");

    const first = submitMockClaim(assessment, { now });
    const second = submitMockClaim(assessment, { now });

    expect(first.accepted && second.accepted).toBe(true);
    if (!first.accepted || !second.accepted) return;
    expect(first.receipt.reference).toBe(second.receipt.reference);
  });
});
