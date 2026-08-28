import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { retrieveGuidance, INSUFFICIENT_EVIDENCE_ANSWER } from "@/lib/retrieval";

/**
 * Runs every case in rag-corpus/tests/retrieval_eval.jsonl.
 *
 * The dataset covers positive, conflicting, out-of-scope, unsafe, and
 * insufficient-evidence questions. Every case is asserted individually so a
 * regression names the question that broke.
 */

interface EvalCase {
  id: string;
  category: string;
  question: string;
  expectedOutcome: "answered" | "insufficient_evidence" | "out_of_scope";
  expectBriefId?: string;
  /**
   * The brief that must rank *first*. `expectBriefId` only asserts a brief is
   * somewhere in the returned passages, which is too weak for the two route
   * briefs: they cite each other, so both appear for either question and the
   * ranking can be exactly backwards while the assertion still passes.
   */
  expectTopBriefId?: string;
  expectSourceId?: string;
  expectReferenceMatch?: string;
  expectAnswerMatch?: string;
  expectRefusalCategory?: string;
  notes?: string;
}

const datasetPath = path.join(
  process.cwd(),
  "rag-corpus",
  "tests",
  "retrieval_eval.jsonl"
);

const raw = await readFile(datasetPath, "utf8");
const cases: EvalCase[] = raw
  .trim()
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line) as EvalCase);

describe("retrieval evaluation dataset", () => {
  it("covers every required category", () => {
    const categories = new Set(cases.map((item) => item.category));
    expect(categories).toContain("positive");
    expect(categories).toContain("conflicting");
    expect(categories).toContain("out-of-scope");
    expect(categories).toContain("unsafe");
    expect(categories).toContain("insufficient-evidence");
  });

  it("has unique case ids", () => {
    const ids = cases.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(cases)("[$category] $id", (evalCase) => {
  it(`answers "${evalCase.question}" as ${evalCase.expectedOutcome}`, async () => {
    const result = await retrieveGuidance(evalCase.question, { limit: 3 });

    expect(result.outcome, evalCase.notes ?? evalCase.id).toBe(
      evalCase.expectedOutcome
    );

    if (evalCase.expectedOutcome === "answered") {
      // Every supported answer must carry a usable official citation.
      expect(result.citations.length).toBeGreaterThan(0);
      for (const citation of result.citations) {
        expect(citation.url).toMatch(/^https:\/\//);
        expect(citation.reference.trim().length).toBeGreaterThan(0);
        expect(citation.issuer.trim().length).toBeGreaterThan(0);
        expect(citation.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }

    if (evalCase.expectedOutcome === "insufficient_evidence") {
      expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_ANSWER);
      expect(result.citations).toHaveLength(0);
    }

    if (evalCase.expectRefusalCategory) {
      expect(result.refusalCategory).toBe(evalCase.expectRefusalCategory);
      // A refusal must not smuggle out corpus text.
      expect(result.passages).toHaveLength(0);
    }

    if (evalCase.expectBriefId) {
      const briefIds = result.passages.map((passage) => passage.briefId);
      expect(briefIds, `expected brief ${evalCase.expectBriefId}`).toContain(
        evalCase.expectBriefId
      );
    }

    if (evalCase.expectTopBriefId) {
      expect(
        result.passages[0]?.briefId,
        `expected ${evalCase.expectTopBriefId} to rank first, got ${JSON.stringify(
          result.passages.map((passage) => passage.briefId)
        )}`
      ).toBe(evalCase.expectTopBriefId);
    }

    if (evalCase.expectSourceId) {
      const sourceIds = result.citations.map((citation) => citation.sourceId);
      expect(sourceIds, `expected source ${evalCase.expectSourceId}`).toContain(
        evalCase.expectSourceId
      );
    }

    if (evalCase.expectReferenceMatch) {
      const pattern = new RegExp(evalCase.expectReferenceMatch, "i");
      const references = result.citations.map((citation) => citation.reference);
      expect(
        references.some((reference) => pattern.test(reference)),
        `expected a reference matching ${evalCase.expectReferenceMatch}, got ${JSON.stringify(references)}`
      ).toBe(true);
    }

    if (evalCase.expectAnswerMatch) {
      expect(result.answer.toLowerCase()).toContain(
        evalCase.expectAnswerMatch.toLowerCase()
      );
    }
  });
});
