import { NextResponse } from "next/server";
import { retrievalHealth, configuredAdapterName } from "@/lib/retrieval";
import { isModelConfigured } from "@/lib/domain/extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports what is and is not working, without revealing any credential value.
 *
 * `modelConfigured` says whether a key is present, never what it is.
 */
export async function GET() {
  const retrieval = await retrievalHealth();

  return NextResponse.json({
    service: "sevapath",
    isDemonstration: true,
    retrieval: {
      configuredAdapter: configuredAdapterName(),
      servingAdapter: retrieval.adapter,
      available: retrieval.available,
      detail: retrieval.detail
    },
    extraction: {
      modelConfigured: isModelConfigured(),
      fallback: "deterministic"
    }
  });
}
