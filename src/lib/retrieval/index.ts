import { LocalRetrievalAdapter } from "./local-adapter";
import { VertexRetrievalAdapter } from "./vertex-adapter";
import { classifyRefusal } from "./safety";
import type { RetrievalAdapter, RetrievalResponse } from "./types";

export * from "./types";
export { classifyRefusal, REFUSAL_CATEGORIES } from "./safety";
export type { RefusalCategory } from "./safety";
export { LocalRetrievalAdapter } from "./local-adapter";
export { VertexRetrievalAdapter } from "./vertex-adapter";

/**
 * Chooses the adapter and applies the safety boundary before either one runs.
 *
 * When `SEVAPATH_RETRIEVAL_ADAPTER=vertex` and the cloud sidecar is
 * unreachable, the local adapter answers instead rather than the citizen
 * getting nothing. The response records which adapter actually served it, so
 * the interface can say so.
 */

export type AdapterName = "local" | "vertex";

export function configuredAdapterName(): AdapterName {
  return process.env.SEVAPATH_RETRIEVAL_ADAPTER?.trim().toLowerCase() === "vertex"
    ? "vertex"
    : "local";
}

function adapterFor(name: AdapterName): RetrievalAdapter {
  return name === "vertex" ? new VertexRetrievalAdapter() : new LocalRetrievalAdapter();
}

export interface GuidanceResult extends RetrievalResponse {
  /** The adapter that was asked for, which may differ from the one that answered. */
  requestedAdapter: AdapterName;
  /** Set when the cloud adapter was configured but the local one answered. */
  fellBackToLocal: boolean;
}

export async function retrieveGuidance(
  query: string,
  options?: { limit?: number; adapter?: AdapterName }
): Promise<GuidanceResult> {
  const requestedAdapter = options?.adapter ?? configuredAdapterName();

  // The boundary is applied once, here, before an adapter is even chosen, so a
  // refused question never reaches the corpus or the network. Both adapters
  // repeat the check internally as a second line of defence.
  const refusal = classifyRefusal(query);
  if (refusal) {
    return {
      outcome: "out_of_scope",
      answer: refusal.answer,
      passages: [],
      citations: [],
      adapter: requestedAdapter,
      refusalCategory: refusal.category,
      requestedAdapter,
      fellBackToLocal: false
    };
  }

  const primary = await adapterFor(requestedAdapter).search(query, options);

  if (requestedAdapter === "vertex" && primary.outcome === "unavailable") {
    const fallback = await new LocalRetrievalAdapter().search(query, options);
    if (fallback.outcome !== "unavailable") {
      return { ...fallback, requestedAdapter, fellBackToLocal: true };
    }
  }

  return { ...primary, requestedAdapter, fellBackToLocal: false };
}

export async function retrievalHealth(): Promise<{
  adapter: AdapterName;
  available: boolean;
  detail: string;
}> {
  const name = configuredAdapterName();
  const result = await adapterFor(name).health();

  if (name === "vertex" && !result.available) {
    const local = await new LocalRetrievalAdapter().health();
    if (local.available) {
      return {
        adapter: "local",
        available: true,
        detail: `Vertex sidecar unavailable (${result.detail}). Serving the local corpus instead.`
      };
    }
  }

  return { adapter: name, ...result };
}
