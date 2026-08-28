import type { ExtractedField, ExtractedRecord, RecordKind } from "../types";
import type { SyntheticRecord } from "../synthetic-records";

/**
 * Reads labelled fields off a synthetic record with no model involved.
 *
 * This is the fallback that keeps the whole journey working without an API key,
 * and it is also the reference the model extractor is checked against. It reads
 * values verbatim: no trimming of middle initials, no case folding, no
 * reformatting of dates. If two records disagree, that disagreement survives
 * into the checks, which is the entire point.
 */

interface FieldSpec {
  key: string;
  label: string;
  /** Labels as printed on the record, matched case-insensitively. */
  recordLabels: string[];
}

const FIELD_SPECS: Record<RecordKind, FieldSpec[]> = {
  ppo: [
    { key: "ppo_number", label: "PPO number", recordLabels: ["PPO Number"] },
    { key: "pensioner_name", label: "Pensioner's name", recordLabels: ["Pensioner Name"] },
    {
      key: "pensioner_date_of_birth",
      label: "Pensioner's date of birth",
      recordLabels: ["Date of Birth of Pensioner"]
    },
    {
      key: "date_of_retirement",
      label: "Date of retirement",
      recordLabels: ["Date of Retirement"]
    },
    { key: "pension_scheme", label: "Pension scheme", recordLabels: ["Pension Scheme"] },
    {
      key: "spouse_name",
      label: "Family pension authorised to",
      recordLabels: ["Family Pension Authorised To"]
    },
    {
      key: "relationship_to_pensioner",
      label: "Relationship to pensioner",
      recordLabels: ["Relationship to Pensioner"]
    },
    {
      key: "spouse_date_of_birth",
      label: "Spouse's date of birth",
      recordLabels: ["Date of Birth of Spouse"]
    },
    {
      key: "co_authorisation_status",
      label: "Co-authorisation status",
      recordLabels: ["Co-authorisation Status"]
    },
    {
      key: "disbursing_authority",
      label: "Pension Disbursing Authority",
      recordLabels: ["Pension Disbursing Authority"]
    }
  ],
  death_certificate: [
    {
      key: "registration_number",
      label: "Registration number",
      recordLabels: ["Registration Number"]
    },
    { key: "deceased_name", label: "Name of deceased", recordLabels: ["Name of Deceased"] },
    { key: "date_of_death", label: "Date of death", recordLabels: ["Date of Death"] },
    { key: "place_of_death", label: "Place of death", recordLabels: ["Place of Death"] },
    { key: "informant_name", label: "Name of informant", recordLabels: ["Name of Informant"] },
    {
      key: "informant_relationship",
      label: "Informant's relationship",
      recordLabels: ["Relationship of Informant to Deceased"]
    },
    { key: "certificate_issue_date", label: "Date of issue", recordLabels: ["Date of Issue"] }
  ],
  bank_proof: [
    {
      key: "account_holder_name",
      label: "Account holder name",
      recordLabels: ["Account Holder Name"]
    },
    { key: "account_type", label: "Account type", recordLabels: ["Account Type"] },
    { key: "account_number", label: "Account number", recordLabels: ["Account Number"] },
    { key: "ifsc", label: "IFSC", recordLabels: ["IFSC"] },
    { key: "branch", label: "Branch", recordLabels: ["Branch"] },
    { key: "bank_name", label: "Bank name", recordLabels: ["Bank Name"] }
  ]
};

/**
 * A value that says the record itself could not be read. Treated as absent
 * rather than as a value, so it blocks preparation instead of being copied
 * onto a form.
 */
const ILLEGIBLE_PATTERN = /^\((?:not legible|illegible|not readable)[^)]*\)$/i;

export function fieldSpecsFor(kind: RecordKind): FieldSpec[] {
  return FIELD_SPECS[kind];
}

/** All field keys the deterministic reader knows about, for schema checks. */
export function knownFieldKeys(): string[] {
  return Object.values(FIELD_SPECS).flatMap((specs) => specs.map((spec) => spec.key));
}

export function extractDeterministically(record: SyntheticRecord): ExtractedRecord {
  const specs = FIELD_SPECS[record.kind];
  const fields: ExtractedField[] = specs.map((spec) => readField(record, spec));

  return {
    kind: record.kind,
    title: record.title,
    engine: "deterministic",
    fallbackReason: null,
    fields
  };
}

function readField(record: SyntheticRecord, spec: FieldSpec): ExtractedField {
  for (let position = 0; position < record.lines.length; position += 1) {
    const line = record.lines[position];
    if (line === undefined) continue;

    const separator = line.indexOf(":");
    if (separator < 0) continue;

    const label = line.slice(0, separator).trim();
    if (!spec.recordLabels.some((candidate) => candidate.toLowerCase() === label.toLowerCase())) {
      continue;
    }

    const rawValue = line.slice(separator + 1).trim();
    const value = rawValue === "" || ILLEGIBLE_PATTERN.test(rawValue) ? null : rawValue;

    return {
      key: spec.key,
      label: spec.label,
      value,
      locator: `${record.title}, line ${position + 1}`,
      confidence: 1
    };
  }

  return {
    key: spec.key,
    label: spec.label,
    value: null,
    locator: null,
    confidence: 1
  };
}
