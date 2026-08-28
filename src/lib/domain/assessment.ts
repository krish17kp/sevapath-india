import type {
  AssessmentResult,
  ExtractionResult,
  JourneyState,
  ScopeAnswers
} from "./types";
import { getSyntheticCase } from "./synthetic-records";
import { extractCase } from "./extraction";
import { runChecks } from "./validation/checks";
import { decideRoute } from "./validation/routing";
import { buildChecklist } from "./checklist";

/**
 * Assembles the whole preparation assessment from the scope answers and the
 * chosen synthetic case.
 *
 * State precedence, most serious first:
 *   1. unsupported_scenario                        — scope rules this out entirely
 *   2. blocked_missing_information                 — a required detail cannot be read
 *   3. review_required                             — records disagree; a human must resolve it
 *   4. model_unavailable_deterministic_fallback    — prepared, read without the model
 *   5. retrieval_unavailable                       — prepared, but guidance cannot be shown
 *   6. ready
 *
 * The two system conditions are also listed separately in `systemStates`, so
 * the interface can show them even when a more serious state is displayed.
 */

export interface AssessmentInput {
  scope: ScopeAnswers;
  caseId: string;
  /** Whether the guidance panel could reach the corpus. */
  retrievalAvailable: boolean;
  /** Overrides model use; defaults to whether an API key is configured. */
  useModel?: boolean;
}

export interface FullAssessment extends AssessmentResult {
  caseId: string;
  systemStates: JourneyState[];
}

export async function assess(input: AssessmentInput): Promise<FullAssessment> {
  const syntheticCase = getSyntheticCase(input.caseId);
  const route = decideRoute(input.scope);

  const extraction = await extractCase(syntheticCase, { useModel: input.useModel });

  const systemStates: JourneyState[] = [];
  if (extraction.engine === "deterministic" && extraction.fallbackReason !== null) {
    systemStates.push("model_unavailable_deterministic_fallback");
  }
  if (!input.retrievalAvailable) {
    systemStates.push("retrieval_unavailable");
  }

  if (route.route === "out_of_scope") {
    return {
      caseId: syntheticCase.id,
      state: "unsupported_scenario",
      route,
      checks: [],
      checklist: [],
      stateReasons: route.reasons,
      extraction,
      systemStates
    };
  }

  const checks = runChecks(extraction);
  const checklist = buildChecklist(route.route, extraction);

  const blocked = checks.filter((check) => check.status === "blocked");
  const review = checks.filter((check) => check.status === "review");

  const state = primaryState({
    blockedCount: blocked.length,
    reviewCount: review.length,
    systemStates
  });

  return {
    caseId: syntheticCase.id,
    state,
    route,
    checks,
    checklist,
    stateReasons: stateReasonsFor(state, extraction, blocked.length, review.length),
    extraction,
    systemStates
  };
}

function primaryState(input: {
  blockedCount: number;
  reviewCount: number;
  systemStates: JourneyState[];
}): JourneyState {
  if (input.blockedCount > 0) return "blocked_missing_information";
  if (input.reviewCount > 0) return "review_required";
  // The two system conditions describe how SevaPath ran, not what it found
  // about the claim, so they no longer mask the claim's own state. Both stay in
  // `systemStates` and are surfaced as their own notices. Without this, `ready`
  // was unreachable in the shipped configuration: with no model API key every
  // all-records-agree case reported the fallback instead.
  return "ready";
}

function stateReasonsFor(
  state: JourneyState,
  extraction: ExtractionResult,
  blockedCount: number,
  reviewCount: number
): string[] {
  switch (state) {
    case "blocked_missing_information":
      return [
        `${blockedCount} required ${blockedCount === 1 ? "detail" : "details"} could not be read from the records.`,
        "SevaPath will not put a value on a form that it could not read from a record."
      ];
    case "review_required":
      return [
        `${reviewCount} ${reviewCount === 1 ? "difference needs" : "differences need"} a person to look at ${reviewCount === 1 ? "it" : "them"}.`,
        "SevaPath has not changed any value on any record and does not decide which one is right."
      ];
    case "model_unavailable_deterministic_fallback":
      return [
        "The claim summary is ready to prepare.",
        extraction.notice ?? "The records were read without the language model."
      ];
    case "retrieval_unavailable":
      return [
        "The claim summary is ready to prepare.",
        "The source-linked guidance panel could not reach the corpus, so it is not showing answers right now."
      ];
    case "ready":
      return [
        "Every required detail was readable and the records agree with each other.",
        "SevaPath has still not decided your eligibility. The Pension Disbursing Authority does that."
      ];
    case "unsupported_scenario":
      return ["This walkthrough does not cover the situation described."];
  }
}

export const STATE_LABELS: Record<JourneyState, string> = {
  ready: "Ready to prepare",
  review_required: "Review required",
  blocked_missing_information: "Blocked — information missing",
  retrieval_unavailable: "Guidance unavailable",
  unsupported_scenario: "Not covered by this walkthrough",
  model_unavailable_deterministic_fallback: "Ready — read without the model"
};
