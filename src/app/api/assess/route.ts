import { NextResponse } from "next/server";
import { assess } from "@/lib/domain/assessment";
import { buildClaimSummary, renderClaimSummaryText } from "@/lib/domain/summary";
import { SYNTHETIC_CASES } from "@/lib/domain/synthetic-records";
import { retrievalHealth } from "@/lib/retrieval";
import type { ScopeAnswers } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs the deterministic assessment for a set of scope answers.
 *
 * The request carries only the four yes/no scope answers and a synthetic case
 * id. It never carries personal data, because the prototype has none to carry.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON." }, { status: 400 });
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const health = await retrievalHealth();
  const assessment = await assess({
    scope: parsed.scope,
    caseId: parsed.caseId,
    retrievalAvailable: health.available
  });

  const summary = buildClaimSummary(assessment);

  return NextResponse.json({
    assessment,
    summary,
    summaryText: renderClaimSummaryText(summary),
    retrieval: health
  });
}

function parseBody(
  body: unknown
): { scope: ScopeAnswers; caseId: string } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }
  const candidate = body as Record<string, unknown>;

  const caseId =
    typeof candidate.caseId === "string" &&
    SYNTHETIC_CASES.some((item) => item.id === candidate.caseId)
      ? candidate.caseId
      : null;
  if (caseId === null) {
    return { error: "caseId must name one of the built-in synthetic cases." };
  }

  const rawScope = candidate.scope;
  if (typeof rawScope !== "object" || rawScope === null) {
    return { error: "scope must be an object of yes/no answers." };
  }
  const scopeRecord = rawScope as Record<string, unknown>;

  const keys = [
    "isSurvivingSpouse",
    "isNamedInPpo",
    "isCentralCivilPension",
    "familyPensionAlreadyStarted"
  ] as const;

  const scope = {} as ScopeAnswers;
  for (const key of keys) {
    const value = scopeRecord[key];
    if (value !== true && value !== false && value !== null && value !== undefined) {
      return { error: `scope.${key} must be true, false, or null.` };
    }
    scope[key] = value === undefined ? null : value;
  }

  return { scope, caseId };
}
