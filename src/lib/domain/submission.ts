import { createHash } from "node:crypto";
import type { FullAssessment } from "./assessment";

/**
 * The mock submission and mock receipt.
 *
 * Nothing leaves this process. There is no government endpoint, no queue, and
 * no stored record. The receipt exists to show what a good acknowledgement
 * would look like — what was received, what is still outstanding, and who to
 * contact — and it says on its face that it is a demonstration.
 */

export const DEMO_RECEIPT_PREFIX = "DEMO-NOT-A-REAL-RECEIPT";

export interface MockReceipt {
  /** Always carries the demonstration prefix. Never resembles a real reference. */
  reference: string;
  issuedAt: string;
  isDemonstration: true;
  heading: string;
  statements: string[];
  received: string[];
  outstanding: string[];
  route: { label: string; recipient: string };
  whatHappensNext: string[];
}

export type SubmissionOutcome =
  | { accepted: false; reason: string; guidance: string }
  | { accepted: true; receipt: MockReceipt };

/**
 * "Submits" a prepared claim.
 *
 * A claim that is blocked or out of scope is refused here too, so the
 * demonstration cannot show a receipt for something SevaPath said was not
 * ready. Review-required claims are allowed through, because a person can
 * legitimately take an unresolved difference to the counter — the receipt says
 * so explicitly.
 */
export function submitMockClaim(
  assessment: FullAssessment,
  options?: { now?: Date }
): SubmissionOutcome {
  const now = options?.now ?? new Date();

  if (assessment.state === "unsupported_scenario") {
    return {
      accepted: false,
      reason: "This walkthrough does not cover the situation you described.",
      guidance: assessment.route.referral ?? "Contact the Head of Office for the correct route."
    };
  }

  if (assessment.state === "blocked_missing_information") {
    return {
      accepted: false,
      reason: "A required detail could not be read from the records.",
      guidance:
        "SevaPath will not prepare a claim summary with a gap where a required value should be. Get a legible copy of the record named above and try again."
    };
  }

  const reviewItems = assessment.checks.filter((check) => check.status === "review");

  return {
    accepted: true,
    receipt: {
      reference: mockReference(assessment, now),
      issuedAt: now.toISOString(),
      isDemonstration: true,
      heading: "Demonstration receipt — no claim has been submitted",
      statements: [
        "This receipt was produced by SevaPath, a hackathon prototype. It is not issued by any government body.",
        "Nothing has been sent to the Pensioners' Portal, to a bank, or to any government system.",
        "This reference number is not valid anywhere. Do not quote it to anyone.",
        "The records used are synthetic demonstration records."
      ],
      received: assessment.checklist
        .filter((item) => item.satisfied)
        .map((item) => item.label),
      outstanding: [
        ...assessment.checklist.filter((item) => !item.satisfied).map((item) => item.label),
        ...reviewItems.map((item) => `Unresolved: ${item.label}`)
      ],
      route: {
        label: assessment.route.label,
        recipient: assessment.route.recipient
      },
      whatHappensNext: [
        ...(assessment.route.route === "form10_hoo"
          ? [
              "In the real process, you take the completed Form 10, the Form 4 family details, the Format 9 undertaking and a copy of the death certificate to the Head of Office.",
              "Rule 79(2)(b)(i) directs the Head of Office to sanction the family pension in Format 13 within one month of receiving that claim."
            ]
          : [
              "In the real process, you take the completed Form 12, the Format 9 undertaking and a copy of the death certificate to the Pension Disbursing Authority.",
              "Rule 79(2)(a)(ii) directs the Pension Disbursing Authority to commence disbursement within one month of receiving that claim."
            ]),
        "Family pension becomes payable from the day after the date of death.",
        reviewItems.length > 0
          ? "Raise the unresolved differences listed above at the counter before the claim is accepted."
          : "Keep this worksheet with your papers so you can check nothing is missing at the counter."
      ]
    }
  };
}

/**
 * A stable, obviously fake reference.
 *
 * Derived from the case and the timestamp so the same demonstration reproduces
 * the same reference, and prefixed so it can never be mistaken for a real one.
 */
function mockReference(assessment: FullAssessment, now: Date): string {
  const digest = createHash("sha256")
    .update(`${assessment.caseId}|${assessment.route.route}|${now.toISOString()}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return `${DEMO_RECEIPT_PREFIX}-${digest}`;
}
