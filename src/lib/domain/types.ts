/**
 * Core domain vocabulary for the SevaPath family-pension preparation journey.
 *
 * SevaPath prepares a claim. It never decides eligibility, never computes an
 * amount, and never submits anything to a government system.
 */

/** The three synthetic record kinds built into the prototype. */
export type RecordKind = "ppo" | "death_certificate" | "bank_proof";

/** Which engine produced a set of extracted fields. */
export type ExtractionEngine = "model" | "deterministic";

/**
 * Why the deterministic extractor ran instead of the model. `null` means the
 * model ran successfully, so no fallback was needed.
 */
export type FallbackReason =
  | "no_api_key"
  | "model_error"
  | "model_output_rejected"
  | "disabled_by_config"
  | null;

/** A single field lifted out of one synthetic record. */
export interface ExtractedField {
  /** Stable machine name, e.g. `spouse_name`. */
  key: string;
  /** Human label shown in the interface. */
  label: string;
  /**
   * Verbatim value as it appears on the record. SevaPath never rewrites,
   * normalises, or merges these values across records.
   */
  value: string | null;
  /** Where in the record the value was read from, for human verification. */
  locator: string | null;
  /** Extractor confidence in [0, 1]; deterministic reads are always 1. */
  confidence: number;
}

export interface ExtractedRecord {
  kind: RecordKind;
  title: string;
  engine: ExtractionEngine;
  fallbackReason: FallbackReason;
  fields: ExtractedField[];
}

export interface ExtractionResult {
  records: ExtractedRecord[];
  engine: ExtractionEngine;
  fallbackReason: FallbackReason;
  /** Plain-language note shown to the citizen when the fallback was used. */
  notice: string | null;
}

/** Severity of a deterministic check outcome. */
export type CheckStatus = "pass" | "review" | "blocked";

export interface CheckObservation {
  /** Stable id, e.g. `spouse_name_consistency`. */
  id: string;
  label: string;
  status: CheckStatus;
  /** What the check looked at and what it found, in plain language. */
  detail: string;
  /** The differing values, quoted exactly as they appear. Never merged. */
  values?: { source: string; value: string | null }[];
  /** What a human must do next. Present when status is not `pass`. */
  humanAction?: string;
}

/**
 * The overall state of the preparation journey.
 *
 * `unsupported_scenario` is decided before any extraction runs, from the scope
 * questions. The remaining states are decided by deterministic checks and by
 * the availability of retrieval and the model.
 */
export type JourneyState =
  | "ready"
  | "review_required"
  | "blocked_missing_information"
  | "retrieval_unavailable"
  | "unsupported_scenario"
  | "model_unavailable_deterministic_fallback";

/** Answers to the scope-confirmation questions. */
export interface ScopeAnswers {
  /** Is the applicant the surviving spouse of the deceased pensioner? */
  isSurvivingSpouse: boolean | null;
  /** Is the applicant already named in the Pension Payment Order? */
  isNamedInPpo: boolean | null;
  /** Is this a Central Civil (CCS Pension Rules) pension? */
  isCentralCivilPension: boolean | null;
  /** Has the pension already started being paid to the family member? */
  familyPensionAlreadyStarted: boolean | null;
}

export type RouteId = "form12_pda" | "form10_hoo" | "out_of_scope";

export interface RouteDecision {
  route: RouteId;
  label: string;
  /** Who the prepared papers are handed to. */
  recipient: string;
  /** Deterministic reasons that produced this route, in evaluation order. */
  reasons: string[];
  /** Present only when `route` is `out_of_scope`. */
  referral?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  /** `true` when SevaPath can confirm it from the synthetic records. */
  satisfied: boolean;
  /** Official reference backing the item, e.g. "Form 12, Part A". */
  reference: string;
  sourceId: string;
}

export interface AssessmentResult {
  state: JourneyState;
  route: RouteDecision;
  checks: CheckObservation[];
  checklist: ChecklistItem[];
  /** Ordered, plain-language reasons for the state. */
  stateReasons: string[];
  extraction: ExtractionResult;
}
