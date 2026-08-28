import {
  INSUFFICIENT_EVIDENCE_ANSWER,
  type Citation,
  type RetrievalAdapter,
  type RetrievalResponse,
  type RetrievedPassage
} from "./types";
import { classifyRefusal } from "./safety";

/**
 * Talks to the Python Vertex AI RAG sidecar in `python/sevapath_rag`.
 *
 * The sidecar exists because Vertex AI RAG Engine and the ADK
 * `VertexAiRagRetrieval` tool are Python-only. Keeping that dependency in a
 * separate process means the web application builds and deploys without a
 * Python runtime, and the whole citizen journey works when the sidecar is not
 * running — the orchestrator falls back to the local adapter.
 *
 * Start the sidecar with:
 *   python -m sevapath_rag.service
 */

interface SidecarPassage {
  id?: string;
  briefId?: string;
  briefTitle?: string;
  heading?: string;
  text?: string;
  score?: number;
  citations?: Citation[];
}

interface SidecarResponse {
  outcome?: string;
  answer?: string;
  passages?: SidecarPassage[];
  citations?: Citation[];
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 12_000;

function sidecarUrl(): string | null {
  const configured = process.env.SEVAPATH_VERTEX_RETRIEVAL_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : null;
}

function isCitation(value: unknown): value is Citation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sourceId === "string" &&
    typeof candidate.issuer === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.accessed === "string" &&
    typeof candidate.reference === "string" &&
    candidate.url.startsWith("https://") &&
    candidate.reference.trim().length > 0
  );
}

export class VertexRetrievalAdapter implements RetrievalAdapter {
  readonly name = "vertex" as const;

  private readonly timeoutMs: number;

  constructor(options?: { timeoutMs?: number }) {
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async health(): Promise<{ available: boolean; detail: string }> {
    const base = sidecarUrl();
    if (!base) {
      return {
        available: false,
        detail:
          "SEVAPATH_VERTEX_RETRIEVAL_URL is not set, so the Vertex sidecar was not contacted."
      };
    }
    try {
      const response = await this.fetchJson(`${base}/health`, { method: "GET" });
      const available = Boolean((response as { available?: unknown }).available);
      const detail = String((response as { detail?: unknown }).detail ?? "");
      return { available, detail: detail || "Vertex sidecar responded." };
    } catch (error) {
      return {
        available: false,
        detail: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async search(query: string, options?: { limit?: number }): Promise<RetrievalResponse> {
    // Applied here as well as in the orchestrator: no code path may reach the
    // cloud with a question SevaPath has already decided not to answer.
    const refusal = classifyRefusal(query);
    if (refusal) {
      return {
        outcome: "out_of_scope",
        answer: refusal.answer,
        passages: [],
        citations: [],
        adapter: this.name,
        refusalCategory: refusal.category
      };
    }

    const base = sidecarUrl();
    if (!base) {
      return this.unavailable("SEVAPATH_VERTEX_RETRIEVAL_URL is not set.");
    }

    let payload: SidecarResponse;
    try {
      payload = (await this.fetchJson(`${base}/search`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, limit: options?.limit ?? 3 })
      })) as SidecarResponse;
    } catch (error) {
      return this.unavailable(error instanceof Error ? error.message : String(error));
    }

    if (payload.error) {
      return this.unavailable(payload.error);
    }

    if (payload.outcome === "insufficient_evidence") {
      return {
        outcome: "insufficient_evidence",
        answer: INSUFFICIENT_EVIDENCE_ANSWER,
        passages: [],
        citations: [],
        adapter: this.name
      };
    }

    // Every passage must arrive with at least one well-formed official citation.
    // A cloud response that loses its citations is treated as no evidence at
    // all, not as an uncited answer.
    const passages: RetrievedPassage[] = (payload.passages ?? [])
      .map((passage, position) => ({
        id: passage.id ?? `vertex-${position}`,
        briefId: passage.briefId ?? "unknown",
        briefTitle: passage.briefTitle ?? "SevaPath corpus",
        heading: passage.heading ?? "",
        text: (passage.text ?? "").trim(),
        score: typeof passage.score === "number" ? passage.score : 0,
        citations: (passage.citations ?? []).filter(isCitation)
      }))
      .filter((passage) => passage.text.length > 0 && passage.citations.length > 0);

    if (passages.length === 0) {
      return {
        outcome: "insufficient_evidence",
        answer: INSUFFICIENT_EVIDENCE_ANSWER,
        passages: [],
        citations: [],
        adapter: this.name
      };
    }

    const seen = new Set<string>();
    const citations: Citation[] = [];
    for (const passage of passages) {
      for (const citation of passage.citations) {
        const fingerprint = `${citation.sourceId}|${citation.reference}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        citations.push(citation);
      }
    }

    return {
      outcome: "answered",
      answer:
        payload.answer?.trim() || passages.map((passage) => passage.text).join("\n\n"),
      passages,
      citations,
      adapter: this.name
    };
  }

  private unavailable(reason: string): RetrievalResponse {
    return {
      outcome: "unavailable",
      answer:
        "The cloud guidance corpus could not be reached, so SevaPath cannot show source-linked guidance right now. The preparation checks below still work, and every official link is listed on the sources page.",
      passages: [],
      citations: [],
      adapter: this.name,
      unavailableReason: reason
    };
  }

  private async fetchJson(url: string, init: RequestInit): Promise<unknown> {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Vertex sidecar responded ${response.status}: ${detail.slice(0, 200)}`);
    }
    return response.json();
  }
}
