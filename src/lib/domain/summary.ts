import type { FullAssessment } from "./assessment";
import { valueOf } from "./validation/checks";

/**
 * The non-official claim-preparation summary.
 *
 * This is a worksheet the claimant carries to the counter, not a form and not a
 * submission. Every value in it is quoted from a record; where records disagree
 * both values appear, marked unresolved. Nothing is filled in on the citizen's
 * behalf that SevaPath could not read.
 */

export const SUMMARY_DISCLAIMER = [
  "This is a preparation worksheet produced by SevaPath, a hackathon prototype.",
  "It is not a government form, not an application, and not proof of anything.",
  "It has not been submitted to any government system.",
  "All records used are synthetic demonstration records.",
  "SevaPath has not decided eligibility and has not calculated any amount."
];

export interface ClaimSummary {
  title: string;
  generatedAt: string;
  disclaimer: string[];
  route: { label: string; recipient: string; reasons: string[] };
  details: { label: string; value: string; source: string; note?: string }[];
  unresolved: { label: string; values: { source: string; value: string }[]; action: string }[];
  toGather: { label: string; detail: string; reference: string }[];
  nextSteps: string[];
}

export function buildClaimSummary(
  assessment: FullAssessment,
  options?: { now?: Date }
): ClaimSummary {
  const now = options?.now ?? new Date();
  const extraction = assessment.extraction;

  const details: ClaimSummary["details"] = [];
  const push = (
    label: string,
    kind: Parameters<typeof valueOf>[1],
    key: string,
    note?: string
  ) => {
    const value = valueOf(extraction, kind, key);
    const record = extraction.records.find((item) => item.kind === kind);
    if (value !== null) {
      details.push({ label, value, source: record?.title ?? kind, ...(note ? { note } : {}) });
    }
  };

  push("Name of the pensioner who has died", "ppo", "pensioner_name");
  push("PPO number", "ppo", "ppo_number");
  push("Date of death", "death_certificate", "date_of_death", "Family pension runs from the day after this date.");
  push("Claimant named in the PPO", "ppo", "spouse_name");
  push("Relationship to the pensioner", "ppo", "relationship_to_pensioner");
  push("Claimant's date of birth", "ppo", "spouse_date_of_birth");
  push("Bank account holder name", "bank_proof", "account_holder_name");
  push("Bank account number", "bank_proof", "account_number");
  push("IFSC", "bank_proof", "ifsc");
  push("Bank and branch", "bank_proof", "branch");
  push("Pension Disbursing Authority", "ppo", "disbursing_authority");

  const unresolved = assessment.checks
    .filter((check) => check.status !== "pass" && check.values && check.values.length > 0)
    .map((check) => ({
      label: check.label,
      values: (check.values ?? [])
        .filter((entry): entry is { source: string; value: string } => entry.value !== null)
        .map((entry) => ({ source: entry.source, value: entry.value })),
      action: check.humanAction ?? "Raise this at the counter before submitting."
    }))
    .filter((item) => item.values.length > 0);

  const toGather = assessment.checklist
    .filter((item) => !item.satisfied)
    .map((item) => ({ label: item.label, detail: item.detail, reference: item.reference }));

  return {
    title: "Family pension claim — preparation worksheet (demonstration)",
    generatedAt: now.toISOString(),
    disclaimer: SUMMARY_DISCLAIMER,
    route: {
      label: assessment.route.label,
      recipient: assessment.route.recipient,
      reasons: assessment.route.reasons
    },
    details,
    unresolved,
    toGather,
    nextSteps: nextStepsFor(assessment)
  };
}

function nextStepsFor(assessment: FullAssessment): string[] {
  const steps: string[] = [];

  if (assessment.state === "blocked_missing_information") {
    steps.push(
      "Get legible copies of the records listed above before going to the counter."
    );
  }
  if (assessment.checks.some((check) => check.status === "review")) {
    steps.push(
      "Take every record with you and raise the unresolved differences at the counter first. Do not alter any record yourself."
    );
  }

  // The two routes go to different offices on different forms. Naming Form 12
  // on the Head of Office route would be the wrong-form mistake this product
  // exists to prevent.
  if (assessment.route.route === "form10_hoo") {
    steps.push(
      "Download Form 10, Form 4 and Format 9 from the Pensioners' Portal links on the sources page, and fill them in.",
      `Take the completed Form 10, the Form 4 family details, the Format 9 undertaking, a copy of the death certificate, and the rest of the checklist to ${assessment.route.recipient}.`,
      "Ask them to confirm what they have received and when the sanction is expected.",
      "Check that the name you write on Form 10 matches the name on the bank account the pension will be credited to."
    );
  } else {
    steps.push(
      "Download Form 12 and Format 9 from the Pensioners' Portal links on the sources page, and fill them in.",
      `Take the completed Form 12, the Format 9 undertaking, a copy of the death certificate, and the rest of the checklist to ${assessment.route.recipient}.`,
      "Ask them to confirm what they have received and when family pension is expected to start.",
      "If the pension was going to a joint account, ask for family pension to be credited to that same account."
    );
  }

  return steps;
}

/** Renders the summary as plain text for printing or reading aloud. */
export function renderClaimSummaryText(summary: ClaimSummary): string {
  const lines: string[] = [summary.title, "=".repeat(summary.title.length), ""];

  for (const line of summary.disclaimer) lines.push(`! ${line}`);
  lines.push("", `Prepared: ${summary.generatedAt}`, "");

  lines.push("ROUTE", "-----", summary.route.label, `To: ${summary.route.recipient}`);
  for (const reason of summary.route.reasons) lines.push(`  because ${reason}`);
  lines.push("");

  lines.push("DETAILS READ FROM THE RECORDS", "-----------------------------");
  for (const detail of summary.details) {
    lines.push(`${detail.label}: ${detail.value}`);
    lines.push(`  read from ${detail.source}`);
    if (detail.note) lines.push(`  note: ${detail.note}`);
  }
  lines.push("");

  if (summary.unresolved.length > 0) {
    lines.push("UNRESOLVED — NEEDS A PERSON", "---------------------------");
    for (const item of summary.unresolved) {
      lines.push(item.label);
      for (const value of item.values) lines.push(`  "${value.value}"  (${value.source})`);
      lines.push(`  action: ${item.action}`);
    }
    lines.push("");
  }

  if (summary.toGather.length > 0) {
    lines.push("STILL TO GATHER", "---------------");
    for (const item of summary.toGather) {
      lines.push(`[ ] ${item.label}`);
      lines.push(`    ${item.detail}`);
      lines.push(`    reference: ${item.reference}`);
    }
    lines.push("");
  }

  lines.push("NEXT STEPS", "----------");
  summary.nextSteps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));

  return lines.join("\n");
}
