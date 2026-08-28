import { NextResponse } from "next/server";
import { retrieveGuidance } from "@/lib/retrieval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Longest question accepted. Long enough for a real question, short enough to bound work. */
const MAX_QUESTION_LENGTH = 500;

/**
 * Answers one guidance question from the corpus.
 *
 * The response always carries an outcome the interface can act on, including
 * for refused and unverifiable questions. It never returns a bare 500 for a
 * question the corpus simply could not answer.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON." }, { status: 400 });
  }

  const question =
    typeof body === "object" && body !== null
      ? String((body as { question?: unknown }).question ?? "").trim()
      : "";

  if (question.length === 0) {
    return NextResponse.json({ error: "question is required." }, { status: 400 });
  }

  const result = await retrieveGuidance(question.slice(0, MAX_QUESTION_LENGTH), {
    limit: 3
  });

  return NextResponse.json({
    outcome: result.outcome,
    answer: result.answer,
    citations: result.citations,
    passages: result.passages.map((passage) => ({
      id: passage.id,
      briefTitle: passage.briefTitle,
      heading: passage.heading,
      text: passage.text
    })),
    adapter: result.adapter,
    fellBackToLocal: result.fellBackToLocal,
    refusalCategory: result.refusalCategory ?? null
  });
}
