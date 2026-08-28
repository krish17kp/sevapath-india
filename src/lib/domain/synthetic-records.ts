import type { RecordKind } from "./types";

/**
 * Built-in synthetic records.
 *
 * Every value here is invented for the demonstration. No real Aadhaar, PAN,
 * PPO, bank account, or identity data appears in this file, and SevaPath never
 * accepts uploads, so these are the only records the prototype ever reads.
 */

export interface SyntheticRecord {
  kind: RecordKind;
  title: string;
  /** Issuing body printed on the synthetic record. */
  issuer: string;
  /**
   * The record rendered as labelled lines, in the order they appear on the
   * page. Both the deterministic reader and the model reader consume exactly
   * this text, so the two engines see the same evidence.
   */
  lines: string[];
}

export interface SyntheticCase {
  id: string;
  label: string;
  /** What this case is meant to demonstrate. */
  description: string;
  records: SyntheticRecord[];
}

const SYNTHETIC_BANNER = "SYNTHETIC DEMONSTRATION RECORD - NOT A REAL DOCUMENT";

function ppo(spouseName: string): SyntheticRecord {
  return {
    kind: "ppo",
    title: "Pension Payment Order (synthetic)",
    issuer: "Office of the Principal Controller of Accounts (synthetic)",
    lines: [
      SYNTHETIC_BANNER,
      "Document Type: Pension Payment Order",
      "PPO Number: DEMO-PPO-0000-0000 (synthetic, not a real PPO number)",
      "Pensioner Name: Ramesh Kumar Sharma",
      "Date of Birth of Pensioner: 04/09/1948",
      "Date of Retirement: 30/09/2008",
      "Pension Scheme: Central Civil Services (Pension) Rules",
      `Family Pension Authorised To: ${spouseName}`,
      "Relationship to Pensioner: Spouse",
      "Date of Birth of Spouse: 17/02/1953",
      "Co-authorisation Status: Family pension co-authorised in this PPO",
      "Pension Disbursing Authority: Demo Bank of India, Kasturba Road Branch (synthetic)",
      SYNTHETIC_BANNER
    ]
  };
}

function deathCertificate(options: {
  spouseName: string;
  dateOfDeath: string | null;
}): SyntheticRecord {
  return {
    kind: "death_certificate",
    title: "Death Certificate (synthetic)",
    issuer: "Office of the Registrar of Births and Deaths (synthetic)",
    lines: [
      SYNTHETIC_BANNER,
      "Document Type: Death Certificate",
      "Registration Number: DEMO-DC-0000 (synthetic)",
      "Name of Deceased: Ramesh Kumar Sharma",
      options.dateOfDeath === null
        ? "Date of Death: (not legible on this synthetic copy)"
        : `Date of Death: ${options.dateOfDeath}`,
      "Place of Death: Demo City, Demo State",
      `Name of Informant: ${options.spouseName}`,
      "Relationship of Informant to Deceased: Spouse",
      "Date of Issue: 03/03/2026",
      SYNTHETIC_BANNER
    ]
  };
}

function bankProof(accountHolder: string): SyntheticRecord {
  return {
    kind: "bank_proof",
    title: "Bank Account Proof (synthetic passbook first page)",
    issuer: "Demo Bank of India (synthetic)",
    lines: [
      SYNTHETIC_BANNER,
      "Document Type: Bank Passbook First Page",
      `Account Holder Name: ${accountHolder}`,
      "Account Type: Single, Savings",
      "Account Number: XXXXXXXX0000 (synthetic placeholder, not a real account)",
      "IFSC: DEMO0000000 (synthetic placeholder)",
      "Branch: Kasturba Road Branch, Demo City",
      "Bank Name: Demo Bank of India",
      SYNTHETIC_BANNER
    ]
  };
}

/**
 * The default demonstration. The Pension Payment Order names `Meera Sharma`
 * while the bank record reads `Meera R. Sharma`. SevaPath shows both values
 * side by side and asks a human to resolve them. It never picks one.
 */
const nameVariationCase: SyntheticCase = {
  id: "name_variation",
  label: "Name spelling differs between records",
  description:
    "The Pension Payment Order and the bank record spell the spouse's name differently. SevaPath flags this for human review and changes neither value.",
  records: [
    ppo("Meera Sharma"),
    deathCertificate({ spouseName: "Meera Sharma", dateOfDeath: "12/02/2026" }),
    bankProof("Meera R. Sharma")
  ]
};

/** Every required field present and consistent across all three records. */
const matchedCase: SyntheticCase = {
  id: "matched",
  label: "All records agree",
  description:
    "Every required field is present and the spouse's name matches across all three records.",
  records: [
    ppo("Meera Sharma"),
    deathCertificate({ spouseName: "Meera Sharma", dateOfDeath: "12/02/2026" }),
    bankProof("Meera Sharma")
  ]
};

/** The date of death is unreadable, so preparation cannot continue. */
const missingDeathDateCase: SyntheticCase = {
  id: "missing_death_date",
  label: "Date of death not readable",
  description:
    "The date of death cannot be read from the death certificate, so the claim cannot be prepared until a legible copy is available.",
  records: [
    ppo("Meera Sharma"),
    deathCertificate({ spouseName: "Meera Sharma", dateOfDeath: null }),
    bankProof("Meera Sharma")
  ]
};

export const SYNTHETIC_CASES: SyntheticCase[] = [
  nameVariationCase,
  matchedCase,
  missingDeathDateCase
];

export const DEFAULT_CASE_ID = nameVariationCase.id;

export function getSyntheticCase(caseId: string | null | undefined): SyntheticCase {
  const found = SYNTHETIC_CASES.find((item) => item.id === caseId);
  return found ?? nameVariationCase;
}

/** The record text handed to an extractor, model or deterministic. */
export function recordText(record: SyntheticRecord): string {
  return record.lines.join("\n");
}
