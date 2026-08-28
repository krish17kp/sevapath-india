/** Shared vocabulary for both retrieval adapters. */
import { detectQuestionLanguage } from "./language";

export interface Citation {
  /** Allowlist id of the official document, e.g. `FORM12-2021`. */
  sourceId: string;
  issuer: string;
  /** Official title as printed on the retrieved document. */
  title: string;
  url: string;
  /** ISO date the document was collected. */
  accessed: string;
  /** Exact rule, form, paragraph, or page, e.g. `Rule 79(2)(a)(ii), printed page 177`. */
  reference: string;
}

export interface RetrievedPassage {
  id: string;
  briefId: string;
  briefTitle: string;
  heading: string;
  text: string;
  /** Retrieval score, higher is more relevant. Comparable within one query only. */
  score: number;
  citations: Citation[];
}

/**
 * Why a retrieval call produced no usable answer.
 *
 * `out_of_scope` covers questions SevaPath refuses on principle — amounts,
 * eligibility, identity, submission. `insufficient_evidence` covers questions
 * SevaPath would answer but cannot support from the corpus. The two are
 * deliberately distinct: the first is a boundary, the second is a gap.
 */
export type RetrievalOutcome =
  | "answered"
  | "insufficient_evidence"
  | "out_of_scope"
  | "unavailable";

export interface RetrievalResponse {
  outcome: RetrievalOutcome;
  /** Text to show the citizen. Never empty. */
  answer: string;
  passages: RetrievedPassage[];
  /** Flattened, deduplicated citations across `passages`. */
  citations: Citation[];
  /** Which adapter served this response. */
  adapter: "local" | "vertex";
  /** Set when `outcome` is `out_of_scope`, naming the boundary that applied. */
  refusalCategory?: string;
  /** Set when `outcome` is `unavailable`, explaining what failed. */
  unavailableReason?: string;
}

export interface RetrievalAdapter {
  readonly name: "local" | "vertex";
  /** Answer a citizen question from the corpus. Never throws for a bad query. */
  search(query: string, options?: { limit?: number }): Promise<RetrievalResponse>;
  /** Cheap availability probe used to drive the `retrieval_unavailable` state. */
  health(): Promise<{ available: boolean; detail: string }>;
}

/**
 * The exact wording required when the corpus does not support an answer.
 * Tests assert on this string, and it must not be reworded or decorated.
 */
export const INSUFFICIENT_EVIDENCE_ANSWER =
  "I could not verify this from the current official corpus.";

export const INSUFFICIENT_EVIDENCE_ANSWERS = {
  en: INSUFFICIENT_EVIDENCE_ANSWER,
  hi: "उपलब्ध आधिकारिक स्रोतों से इसकी पुष्टि नहीं हो सकी।",
  mr: "उपलब्ध अधिकृत स्रोतांवरून याची पुष्टी करता आली नाही."
} as const;

export function insufficientEvidenceAnswer(question: string): string {
  return INSUFFICIENT_EVIDENCE_ANSWERS[detectQuestionLanguage(question)];
}
