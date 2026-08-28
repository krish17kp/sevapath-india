import { NextResponse } from "next/server";
import { assess } from "@/lib/domain/assessment";
import { submitMockClaim } from "@/lib/domain/submission";
import { SYNTHETIC_CASES } from "@/lib/domain/synthetic-records";
import { retrievalHealth } from "@/lib/retrieval";
import type { ScopeAnswers } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The mock submission endpoint.
 *
 * It re-runs the assessment server-side rather than trusting an assessment sent
 * by the client, so a tampered request cannot produce a receipt for a claim
 * that SevaPath judged blocked or out of scope. Nothing is sent anywhere and
 * nothing is stored.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON." }, { status: 400 });
  }

  const candidate = (typeof body === "object" && body !== null ? body : {}) as Record<
    string,
    unknown
  >;

  const caseId =
    typeof candidate.caseId === "string" &&
    SYNTHETIC_CASES.some((item) => item.id === candidate.caseId)
      ? candidate.caseId
      : null;
  if (caseId === null) {
    return NextResponse.json(
      { error: "caseId must name one of the built-in synthetic cases." },
      { status: 400 }
    );
  }

  const rawScope = (candidate.scope ?? {}) as Record<string, unknown>;
  const scope: ScopeAnswers = {
    isSurvivingSpouse: asTriState(rawScope.isSurvivingSpouse),
    isNamedInPpo: asTriState(rawScope.isNamedInPpo),
    isCentralCivilPension: asTriState(rawScope.isCentralCivilPension),
    familyPensionAlreadyStarted: asTriState(rawScope.familyPensionAlreadyStarted)
  };

  const health = await retrievalHealth();
  const assessment = await assess({
    scope,
    caseId,
    retrievalAvailable: health.available
  });

  const outcome = submitMockClaim(assessment);

  return NextResponse.json({
    ...outcome,
    isDemonstration: true,
    state: assessment.state
  });
}

function asTriState(value: unknown): boolean | null {
  return value === true || value === false ? value : null;
}
