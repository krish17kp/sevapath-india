import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LocalRetrievalAdapter,
  VertexRetrievalAdapter,
  retrieveGuidance,
  retrievalHealth,
  configuredAdapterName,
  classifyRefusal,
  REFUSAL_CATEGORIES,
  INSUFFICIENT_EVIDENCE_ANSWER
} from "@/lib/retrieval";
import { resetLocalCorpusCache, routeAffinity } from "@/lib/retrieval/local-adapter";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetLocalCorpusCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("refusal boundaries", () => {
  it("covers every declared category", () => {
    expect(REFUSAL_CATEGORIES).toEqual([
      "pension_amount",
      "eligibility_decision",
      "identity_resolution",
      "submission_on_behalf",
      "personal_data"
    ]);
  });

  it("lets a genuine procedural question through", () => {
    expect(classifyRefusal("Which form do I use?")).toBeNull();
    expect(classifyRefusal("What documents go with Form 12?")).toBeNull();
    expect(classifyRefusal("Who is eligible for co-authorisation?")).toBeNull();
  });

  it("refuses amount questions in several phrasings", () => {
    for (const question of [
      "How much will I get?",
      "What amount is payable?",
      "Tell me the pension amount",
      "How many rupees per month?"
    ]) {
      expect(classifyRefusal(question)?.category, question).toBe("pension_amount");
    }
  });

  it("refuses eligibility decisions", () => {
    expect(classifyRefusal("Am I eligible?")?.category).toBe("eligibility_decision");
    expect(classifyRefusal("Do I qualify for family pension?")?.category).toBe(
      "eligibility_decision"
    );
  });

  it("never quotes a figure in a refusal", () => {
    for (const category of REFUSAL_CATEGORIES) {
      const match = classifyRefusal(
        category === "pension_amount" ? "how much will I get?" : "am I eligible?"
      );
      expect(match?.answer).not.toMatch(/₹|\bRs\.?\s*\d/);
    }
  });
});

describe("local adapter", () => {
  it("reports healthy with the committed index", async () => {
    const health = await new LocalRetrievalAdapter().health();

    expect(health.available).toBe(true);
    expect(health.detail).toMatch(/briefs/);
  });

  it("returns unavailable, not a crash, when the index is missing", async () => {
    process.env.SEVAPATH_CORPUS_INDEX = "/nonexistent/sevapath/index.json";
    resetLocalCorpusCache();

    const adapter = new LocalRetrievalAdapter();
    const health = await adapter.health();
    const result = await adapter.search("Which form do I use?");

    expect(health.available).toBe(false);
    expect(result.outcome).toBe("unavailable");
    expect(result.answer).toMatch(/checks below still work/i);
  });

  it("is deterministic across repeated calls", async () => {
    const adapter = new LocalRetrievalAdapter();
    const question = "What documents must I submit with Form 12?";

    const first = await adapter.search(question, { limit: 3 });
    const second = await adapter.search(question, { limit: 3 });

    expect(first.passages.map((p) => p.id)).toEqual(second.passages.map((p) => p.id));
    expect(first.passages.map((p) => p.score)).toEqual(second.passages.map((p) => p.score));
  });

  it("never serves a product-policy section as evidence", async () => {
    const adapter = new LocalRetrievalAdapter();

    const result = await adapter.search("What does SevaPath do about a name mismatch?", {
      limit: 5
    });

    for (const passage of result.passages) {
      expect(passage.heading).not.toBe("What SevaPath does");
      expect(passage.heading).not.toBe("What it does not do");
    }
  });

  it("uses the exact insufficient-evidence wording", async () => {
    const result = await new LocalRetrievalAdapter().search("What is the capital of France?");

    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_ANSWER);
    expect(result.answer).toBe("I could not verify this from the current official corpus.");
  });
});

describe("vertex adapter", () => {
  it("is unavailable when no sidecar URL is configured", async () => {
    delete process.env.SEVAPATH_VERTEX_RETRIEVAL_URL;

    const adapter = new VertexRetrievalAdapter();
    const health = await adapter.health();
    const result = await adapter.search("Which form do I use?");

    expect(health.available).toBe(false);
    expect(health.detail).toMatch(/SEVAPATH_VERTEX_RETRIEVAL_URL/);
    expect(result.outcome).toBe("unavailable");
  });

  it("refuses an out-of-scope question without contacting the network", async () => {
    process.env.SEVAPATH_VERTEX_RETRIEVAL_URL = "http://127.0.0.1:9/should-not-be-called";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await new VertexRetrievalAdapter().search("How much will I get?");

    expect(result.outcome).toBe("out_of_scope");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("discards a cloud passage that arrives without a citation", async () => {
    process.env.SEVAPATH_VERTEX_RETRIEVAL_URL = "http://sidecar.test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            outcome: "answered",
            answer: "A confident sentence with nothing behind it.",
            passages: [
              { id: "x", text: "A confident sentence with nothing behind it.", citations: [] }
            ],
            citations: []
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const result = await new VertexRetrievalAdapter().search("Which form do I use?");

    expect(result.outcome).toBe("insufficient_evidence");
    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_ANSWER);
  });

  it("rejects a malformed citation rather than showing it", async () => {
    process.env.SEVAPATH_VERTEX_RETRIEVAL_URL = "http://sidecar.test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            outcome: "answered",
            answer: "Text.",
            passages: [
              {
                id: "x",
                text: "A statement about Form 12 that should not be shown.",
                citations: [
                  {
                    sourceId: "FORM12-2021",
                    issuer: "DoPPW",
                    title: "Form 12",
                    // Not https, and no reference.
                    url: "http://example.com",
                    accessed: "2026-08-27",
                    reference: ""
                  }
                ]
              }
            ],
            citations: []
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const result = await new VertexRetrievalAdapter().search("Which form do I use?");

    expect(result.outcome).toBe("insufficient_evidence");
  });
});

describe("orchestrator", () => {
  it("defaults to the local adapter", () => {
    delete process.env.SEVAPATH_RETRIEVAL_ADAPTER;
    expect(configuredAdapterName()).toBe("local");
  });

  it("selects the vertex adapter when configured", () => {
    process.env.SEVAPATH_RETRIEVAL_ADAPTER = "vertex";
    expect(configuredAdapterName()).toBe("vertex");
  });

  it("falls back to local when the cloud adapter is unreachable", async () => {
    process.env.SEVAPATH_RETRIEVAL_ADAPTER = "vertex";
    delete process.env.SEVAPATH_VERTEX_RETRIEVAL_URL;

    const result = await retrieveGuidance("What is Format 9 for?");

    expect(result.requestedAdapter).toBe("vertex");
    expect(result.fellBackToLocal).toBe(true);
    expect(result.adapter).toBe("local");
    expect(result.outcome).toBe("answered");
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it("reports the serving adapter in the health check", async () => {
    process.env.SEVAPATH_RETRIEVAL_ADAPTER = "vertex";
    delete process.env.SEVAPATH_VERTEX_RETRIEVAL_URL;

    const health = await retrievalHealth();

    expect(health.adapter).toBe("local");
    expect(health.available).toBe(true);
    expect(health.detail).toMatch(/Vertex sidecar unavailable/);
  });

  it("applies the boundary before any adapter is chosen", async () => {
    process.env.SEVAPATH_RETRIEVAL_ADAPTER = "vertex";

    const result = await retrieveGuidance("Am I eligible for family pension?");

    expect(result.outcome).toBe("out_of_scope");
    expect(result.refusalCategory).toBe("eligibility_decision");
    expect(result.fellBackToLocal).toBe(false);
  });
});

describe("route affinity", () => {
  /**
   * The distinction these assertions protect is the product's central claim.
   * Rule 79(2) splits on exactly one fact — whether the claimant is named in
   * the Pension Payment Order — and lexical scoring alone reads both polarities
   * identically.
   */
  it.each([
    "I am named in the PPO. Which form?",
    "my name is in the pension payment order",
    "the PPO has my name on it",
    "I am listed in the PPO"
  ])("reads %j as the Form 12 route", (question) => {
    expect(routeAffinity(question)).toBe("form12_pda");
  });

  it.each([
    "My name is not in the PPO. Which form?",
    "I am not named in the pension payment order",
    "my name is missing from the PPO",
    "the PPO does not name me"
  ])("reads %j as the Form 10 route", (question) => {
    expect(routeAffinity(question)).toBe("form10_hoo");
  });

  it.each([
    "What is the Format 9 undertaking for?",
    "Is Form 14 still current?",
    "How long does the bank have to start paying?"
  ])("reads %j as having no route polarity", (question) => {
    expect(routeAffinity(question)).toBeNull();
  });
});
