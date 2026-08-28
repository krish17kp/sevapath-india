import { describe, expect, it } from "vitest";
import { extractCase } from "@/lib/domain/extraction";
import { getSyntheticCase } from "@/lib/domain/synthetic-records";
import { compareNames, runChecks } from "@/lib/domain/validation/checks";
import { decideRoute } from "@/lib/domain/validation/routing";
import type { ScopeAnswers } from "@/lib/domain/types";

async function checksFor(caseId: string) {
  const extraction = await extractCase(getSyntheticCase(caseId), { useModel: false });
  return { extraction, checks: runChecks(extraction) };
}

const IN_SCOPE: ScopeAnswers = {
  isSurvivingSpouse: true,
  isCentralCivilPension: true,
  isNamedInPpo: true,
  familyPensionAlreadyStarted: false
};

describe("name comparison", () => {
  it("treats only whitespace differences as identical", () => {
    expect(compareNames("Meera Sharma", "Meera  Sharma")).toBe("identical");
    expect(compareNames(" Meera Sharma ", "Meera Sharma")).toBe("identical");
  });

  it("treats a middle initial as a difference, not a match", () => {
    expect(compareNames("Meera Sharma", "Meera R. Sharma")).toBe("differs");
  });

  it("cannot compare when a value is missing", () => {
    expect(compareNames(null, "Meera Sharma")).toBe("unknown");
    expect(compareNames("Meera Sharma", null)).toBe("unknown");
  });
});

describe("exact matching records", () => {
  it("passes every check", async () => {
    const { checks } = await checksFor("matched");

    expect(checks.every((check) => check.status === "pass")).toBe(true);
    expect(checks.find((check) => check.id === "claimant_name_consistency")?.status).toBe(
      "pass"
    );
  });
});

describe("middle-initial name variation", () => {
  it("requires review without changing either value", async () => {
    const { checks } = await checksFor("name_variation");

    const nameCheck = checks.find((check) => check.id === "claimant_name_consistency");
    expect(nameCheck?.status).toBe("review");

    const values = nameCheck?.values?.map((entry) => entry.value) ?? [];
    // Both spellings must survive, exactly as printed.
    expect(values).toContain("Meera Sharma");
    expect(values).toContain("Meera R. Sharma");
    expect(nameCheck?.humanAction).toMatch(/Do not alter any record yourself/);
  });

  it("does not block preparation", async () => {
    const { checks } = await checksFor("name_variation");

    expect(checks.some((check) => check.status === "blocked")).toBe(false);
  });

  it("cites the rule the requirement comes from", async () => {
    const { checks } = await checksFor("name_variation");
    const nameCheck = checks.find((check) => check.id === "claimant_name_consistency");

    expect(nameCheck?.detail).toContain("Form 10");
    expect(nameCheck?.detail).toContain("bank account should be the same");
  });
});

describe("missing date of death", () => {
  it("blocks preparation", async () => {
    const { checks } = await checksFor("missing_death_date");

    const blocked = checks.filter((check) => check.status === "blocked");
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked.some((check) => check.id === "missing_date_of_death")).toBe(true);
  });

  it("says what the person must do about it", async () => {
    const { checks } = await checksFor("missing_death_date");
    const blocked = checks.find((check) => check.id === "missing_date_of_death");

    expect(blocked?.humanAction).toMatch(/legible copy/i);
  });
});

describe("deterministic routing", () => {
  it("sends a PPO-named spouse to Form 12 at the Pension Disbursing Authority", () => {
    const route = decideRoute(IN_SCOPE);

    expect(route.route).toBe("form12_pda");
    expect(route.label).toContain("Form 12");
    expect(route.recipient).toMatch(/bank branch/i);
  });

  it("sends a spouse not named in the PPO to Form 10 at the Head of Office", () => {
    const route = decideRoute({ ...IN_SCOPE, isNamedInPpo: false });

    expect(route.route).toBe("form10_hoo");
    expect(route.label).toContain("Form 10");
    expect(route.recipient).toMatch(/Head of Office/i);
  });

  it("declines a claimant who is not the surviving spouse", () => {
    const route = decideRoute({ ...IN_SCOPE, isSurvivingSpouse: false });

    expect(route.route).toBe("out_of_scope");
    expect(route.referral).toMatch(/Form 10/);
  });

  it("declines a pension outside the Central Civil Services rules", () => {
    const route = decideRoute({ ...IN_SCOPE, isCentralCivilPension: false });

    expect(route.route).toBe("out_of_scope");
    expect(route.referral).toMatch(/has not verified|own rules/i);
  });

  it("declines when family pension has already started", () => {
    const route = decideRoute({ ...IN_SCOPE, familyPensionAlreadyStarted: true });

    expect(route.route).toBe("out_of_scope");
  });

  it("declines until every scope question is answered", () => {
    const route = decideRoute({ ...IN_SCOPE, isNamedInPpo: null });

    expect(route.route).toBe("out_of_scope");
    expect(route.label).toMatch(/not yet confirmed/i);
  });

  it("never returns Form 14 as a route", () => {
    const combinations: ScopeAnswers[] = [
      IN_SCOPE,
      { ...IN_SCOPE, isNamedInPpo: false },
      { ...IN_SCOPE, isSurvivingSpouse: false },
      { ...IN_SCOPE, familyPensionAlreadyStarted: true }
    ];

    for (const scope of combinations) {
      const route = decideRoute(scope);
      expect(route.label).not.toMatch(/Form 14/);
      expect(route.referral ?? "").not.toMatch(/Form 14/);
    }
  });
});
