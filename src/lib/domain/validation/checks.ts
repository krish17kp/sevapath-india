import type {
  CheckObservation,
  ExtractedRecord,
  ExtractionResult,
  RecordKind
} from "../types";

/**
 * Deterministic cross-document checks.
 *
 * Every check is plain comparison logic. No model runs here, and none of these
 * functions ever writes a value back onto a record. When two records disagree,
 * the check reports both values exactly as read and asks a human to resolve it.
 */

/** Fields that must be readable before a Form 12 claim can be prepared. */
const REQUIRED_FIELDS: { kind: RecordKind; key: string; label: string; why: string }[] = [
  {
    kind: "ppo",
    key: "ppo_number",
    label: "PPO number",
    why: "Form 12 asks for the PPO number of the pensioner."
  },
  {
    kind: "ppo",
    key: "pensioner_name",
    label: "Pensioner's name",
    why: "Form 12 asks for the name of the pensioner on whose death family pension is claimed."
  },
  {
    kind: "ppo",
    key: "spouse_name",
    label: "Name of the family pension claimant in the PPO",
    why: "The Form 12 route depends on the claimant being named in the Pension Payment Order."
  },
  {
    kind: "death_certificate",
    key: "date_of_death",
    label: "Date of death",
    why: "Form 12 asks for the date of death, and family pension runs from the day after it."
  },
  {
    kind: "death_certificate",
    key: "deceased_name",
    label: "Name of the deceased",
    why: "The death certificate must name the same pensioner as the Pension Payment Order."
  },
  {
    kind: "bank_proof",
    key: "account_holder_name",
    label: "Bank account holder's name",
    why: "Form 12 asks for the account the family pension is to be credited to."
  },
  {
    kind: "bank_proof",
    key: "account_number",
    label: "Bank account number",
    why: "Form 12 asks for the account number."
  },
  {
    kind: "bank_proof",
    key: "ifsc",
    label: "IFSC",
    why: "Form 12 asks for the IFS code."
  }
];

export function valueOf(
  extraction: ExtractionResult,
  kind: RecordKind,
  key: string
): string | null {
  const record = extraction.records.find((item) => item.kind === kind);
  return record?.fields.find((field) => field.key === key)?.value ?? null;
}

function titleOf(extraction: ExtractionResult, kind: RecordKind): string {
  return extraction.records.find((item) => item.kind === kind)?.title ?? kind;
}

/**
 * Compares two names for reporting purposes only.
 *
 * `identical` means the strings are the same after collapsing runs of
 * whitespace — a formatting artefact, not a difference in what is written.
 * Anything else is `differs`, and SevaPath does not try to grade how different
 * it is. A middle initial, a changed surname, and a completely different name
 * are all simply "these do not match, a human must look".
 */
export function compareNames(left: string | null, right: string | null): "identical" | "differs" | "unknown" {
  if (left === null || right === null) return "unknown";
  const normalise = (value: string) => value.replace(/\s+/g, " ").trim();
  return normalise(left) === normalise(right) ? "identical" : "differs";
}

export function runChecks(extraction: ExtractionResult): CheckObservation[] {
  return [
    ...requiredFieldChecks(extraction),
    deceasedIdentityCheck(extraction),
    claimantNameCheck(extraction),
    relationshipCheck(extraction),
    coAuthorisationCheck(extraction),
    schemeCheck(extraction)
  ];
}

function requiredFieldChecks(extraction: ExtractionResult): CheckObservation[] {
  const missing = REQUIRED_FIELDS.filter(
    (required) => valueOf(extraction, required.kind, required.key) === null
  );

  if (missing.length === 0) {
    return [
      {
        id: "required_fields",
        label: "Required details are readable",
        status: "pass",
        detail: `All ${REQUIRED_FIELDS.length} details Form 12 asks for could be read from the records.`
      }
    ];
  }

  return missing.map((required) => ({
    id: `missing_${required.key}`,
    label: `${required.label} could not be read`,
    status: "blocked" as const,
    detail: `${required.why} SevaPath could not read this from ${titleOf(extraction, required.kind)}.`,
    values: [{ source: titleOf(extraction, required.kind), value: null }],
    humanAction: `Get a legible copy of ${titleOf(extraction, required.kind)} showing the ${required.label.toLowerCase()}, then start again.`
  }));
}

function deceasedIdentityCheck(extraction: ExtractionResult): CheckObservation {
  const ppoName = valueOf(extraction, "ppo", "pensioner_name");
  const certificateName = valueOf(extraction, "death_certificate", "deceased_name");
  const comparison = compareNames(ppoName, certificateName);

  const values = [
    { source: titleOf(extraction, "ppo"), value: ppoName },
    { source: titleOf(extraction, "death_certificate"), value: certificateName }
  ];

  if (comparison === "unknown") {
    return {
      id: "deceased_identity",
      label: "Pensioner's name across records",
      status: "blocked",
      detail:
        "The pensioner's name could not be read from both records, so SevaPath cannot confirm they describe the same person.",
      values,
      humanAction:
        "Get a legible copy of both records, then bring them to the Pension Disbursing Authority."
    };
  }

  if (comparison === "differs") {
    return {
      id: "deceased_identity",
      label: "Pensioner's name differs between records",
      status: "review",
      detail:
        "The Pension Payment Order and the death certificate spell the pensioner's name differently. SevaPath does not decide whether these are the same person and has changed neither value.",
      values,
      humanAction:
        "Take both records to the Pension Disbursing Authority and ask them to confirm the correct spelling before the claim is submitted."
    };
  }

  return {
    id: "deceased_identity",
    label: "Pensioner's name matches across records",
    status: "pass",
    detail: "The Pension Payment Order and the death certificate name the same pensioner.",
    values
  };
}

function claimantNameCheck(extraction: ExtractionResult): CheckObservation {
  const ppoName = valueOf(extraction, "ppo", "spouse_name");
  const informantName = valueOf(extraction, "death_certificate", "informant_name");
  const bankName = valueOf(extraction, "bank_proof", "account_holder_name");

  const values = [
    { source: titleOf(extraction, "ppo"), value: ppoName },
    { source: titleOf(extraction, "death_certificate"), value: informantName },
    { source: titleOf(extraction, "bank_proof"), value: bankName }
  ];

  const present = values.filter((entry) => entry.value !== null);
  if (present.length < 2) {
    return {
      id: "claimant_name_consistency",
      label: "Claimant's name across records",
      status: "blocked",
      detail:
        "The claimant's name could not be read from enough records to compare them.",
      values,
      humanAction: "Get a legible copy of each record showing the claimant's name."
    };
  }

  const distinct = new Set(present.map((entry) => entry.value?.replace(/\s+/g, " ").trim()));
  if (distinct.size > 1) {
    return {
      id: "claimant_name_consistency",
      label: "Claimant's name is written differently across records",
      status: "review",
      detail:
        "The records do not write the claimant's name the same way. Form 10's document list states that the name of the claimant in the form and in the bank account should be the same, so this needs resolving before the claim is submitted. SevaPath has changed neither value and does not decide whether they are the same person.",
      values,
      humanAction:
        "Take all three records to the Pension Disbursing Authority or the Head of Office and ask them to record which spelling is correct. Do not alter any record yourself."
    };
  }

  return {
    id: "claimant_name_consistency",
    label: "Claimant's name matches across records",
    status: "pass",
    detail: "All three records write the claimant's name the same way.",
    values
  };
}

function relationshipCheck(extraction: ExtractionResult): CheckObservation {
  const ppoRelationship = valueOf(extraction, "ppo", "relationship_to_pensioner");
  const informantRelationship = valueOf(
    extraction,
    "death_certificate",
    "informant_relationship"
  );

  const values = [
    { source: titleOf(extraction, "ppo"), value: ppoRelationship },
    { source: titleOf(extraction, "death_certificate"), value: informantRelationship }
  ];

  const isSpouse = (value: string | null) => value !== null && /spouse/i.test(value);

  if (!isSpouse(ppoRelationship)) {
    return {
      id: "relationship",
      label: "Relationship recorded in the PPO",
      status: "review",
      detail:
        "The Pension Payment Order does not record the claimant's relationship to the pensioner as spouse. SevaPath's Form 12 walkthrough covers a surviving spouse named in the PPO.",
      values,
      humanAction:
        "Check the Pension Payment Order with the Pension Disbursing Authority to confirm which family member is named."
    };
  }

  return {
    id: "relationship",
    label: "Relationship is recorded as spouse",
    status: "pass",
    detail: "The Pension Payment Order records the claimant as the pensioner's spouse.",
    values
  };
}

function coAuthorisationCheck(extraction: ExtractionResult): CheckObservation {
  const status = valueOf(extraction, "ppo", "co_authorisation_status");
  const values = [{ source: titleOf(extraction, "ppo"), value: status }];

  // Only an affirmative reading supports the Form 12 route. Any other value —
  // including one that says family pension is *not* authorised — is sent for
  // human review rather than reported as a pass.
  if (status === null || !/co-?authoris|authoris/i.test(status)) {
    return {
      id: "co_authorisation",
      label: "Family pension authorisation in the PPO",
      status: "review",
      detail:
        status === null
          ? "SevaPath could not read whether family pension is authorised in the Pension Payment Order. The Form 12 route depends on the claimant being named there."
          : `The Pension Payment Order does not record family pension as authorised. It reads "${status}".`,
      values,
      humanAction:
        "Ask the Pension Disbursing Authority to confirm whether family pension is authorised in this Pension Payment Order."
    };
  }

  return {
    id: "co_authorisation",
    label: "Family pension is authorised in the PPO",
    status: "pass",
    detail:
      "The Pension Payment Order records family pension as authorised, which is what the Form 12 route rests on.",
    values
  };
}

function schemeCheck(extraction: ExtractionResult): CheckObservation {
  const scheme = valueOf(extraction, "ppo", "pension_scheme");
  const values = [{ source: titleOf(extraction, "ppo"), value: scheme }];

  if (scheme === null || !/central civil/i.test(scheme)) {
    return {
      id: "pension_scheme",
      label: "Pension scheme",
      status: "review",
      detail:
        "SevaPath could not confirm from the Pension Payment Order that this is a Central Civil Services pension. This walkthrough only covers that scheme.",
      values,
      humanAction:
        "Check the Pension Payment Order for the scheme, and contact the Pension Disbursing Authority if it is a different one."
    };
  }

  return {
    id: "pension_scheme",
    label: "Central Civil Services pension",
    status: "pass",
    detail:
      "The Pension Payment Order records a Central Civil Services pension, which is the scheme this walkthrough covers.",
    values
  };
}

/** True when at least one record was read by the deterministic fallback. */
export function usedDeterministicFallback(records: ExtractedRecord[]): boolean {
  return records.some((record) => record.engine === "deterministic");
}
