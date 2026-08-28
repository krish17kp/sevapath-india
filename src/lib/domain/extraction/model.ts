import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedField, ExtractedRecord, FallbackReason } from "../types";
import { recordText, type SyntheticRecord } from "../synthetic-records";
import { extractDeterministically, fieldSpecsFor } from "./deterministic";

/**
 * Model-assisted field extraction, constrained hard on both ends.
 *
 * Constrained input: the model sees one synthetic record and a fixed list of
 * field keys. It is never asked to judge, decide, or reconcile anything.
 *
 * Constrained output: a strict tool schema fixes the shape, and then every
 * returned value is checked to appear verbatim in the record text. A value the
 * model tidied, expanded, or invented fails that check, and the whole record
 * falls back to the deterministic reader. This is what stops the model from
 * quietly "fixing" `Meera R. Sharma` into `Meera Sharma` — the mismatch the
 * whole prototype exists to surface.
 */

const MODEL = process.env.SEVAPATH_MODEL?.trim() || "claude-opus-5";

/** Extraction output is a short, bounded JSON object; it does not need room to ramble. */
const MAX_TOKENS = 4096;

const REQUEST_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT = `
You read one document and report the values printed on it. You are a transcriber,
not an adviser.

Rules:
- Copy each value exactly as printed, character for character. Never correct
  spelling, expand an initial, reorder names, reformat a date, or normalise case.
- If a field is not printed on the document, or is marked as not legible, return
  null for it. Never infer a value from another field or from general knowledge.
- Never merge, compare, or reconcile values. Never comment on whether values
  look consistent.
- Never state an opinion about eligibility, entitlement, or any amount.
`.trim();

const EXTRACTION_TOOL_NAME = "report_fields";

interface ModelFieldValue {
  key: string;
  value: string | null;
  locator: string | null;
}

export interface ModelExtractionOutcome {
  record: ExtractedRecord;
  /** Null when the model produced the record; set when the fallback did. */
  fallbackReason: FallbackReason;
}

export function isModelConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/**
 * Extracts one record, falling back to the deterministic reader on any problem.
 * This never throws: a failure to reach the model is a fallback, not an error
 * the citizen has to see.
 */
export async function extractWithModel(
  record: SyntheticRecord,
  options?: { client?: Anthropic }
): Promise<ModelExtractionOutcome> {
  if (!options?.client && !isModelConfigured()) {
    return fallback(record, "no_api_key");
  }

  const client = options?.client ?? new Anthropic({ timeout: REQUEST_TIMEOUT_MS });
  const specs = fieldSpecsFor(record.kind);
  const text = recordText(record);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Transcription needs accuracy, not deliberation.
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: EXTRACTION_TOOL_NAME,
          description:
            "Report the value printed on the document for each requested field key.",
          // Strict mode guarantees the input validates against this schema, so
          // the parsing below only has to handle values, never shapes.
          strict: true,
          input_schema: {
            type: "object",
            additionalProperties: false,
            required: ["fields"],
            properties: {
              fields: {
                type: "array",
                description: "One entry per requested field key, in any order.",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "value", "locator"],
                  properties: {
                    key: {
                      type: "string",
                      enum: specs.map((spec) => spec.key),
                      description: "The requested field key."
                    },
                    value: {
                      type: ["string", "null"],
                      description:
                        "The value exactly as printed, or null if absent or not legible."
                    },
                    locator: {
                      type: ["string", "null"],
                      description: "The label the value was read from, as printed."
                    }
                  }
                }
              }
            }
          }
        }
      ],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Document title: ${record.title}`,
                "",
                "Document text:",
                text,
                "",
                "Report these fields:",
                ...specs.map((spec) => `- ${spec.key} (printed as "${spec.recordLabels[0]}")`)
              ].join("\n")
            }
          ]
        }
      ]
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return fallback(record, "no_api_key");
    }
    if (error instanceof Anthropic.APIError) {
      return fallback(record, "model_error");
    }
    return fallback(record, "model_error");
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === EXTRACTION_TOOL_NAME
  );
  if (!toolUse) {
    return fallback(record, "model_output_rejected");
  }

  const reported = parseReportedFields(toolUse.input);
  if (!reported) {
    return fallback(record, "model_output_rejected");
  }

  // The deterministic reader is the reference. Checking the model's value
  // against the whole record only proves the string appears *somewhere* on the
  // page, which would let a value lifted from a different labelled line through
  // — enough for the model to fill a field the deterministic reader found
  // missing, and so to turn a blocked claim into a preparable one. Requiring
  // per-field equality keeps the model strictly corroborative: it can confirm
  // what the deterministic reader found, never overrule or extend it.
  const reference = extractDeterministically(record);

  const fields: ExtractedField[] = [];
  for (const spec of specs) {
    const entry = reported.get(spec.key);
    if (!entry) {
      return fallback(record, "model_output_rejected");
    }
    const expected =
      reference.fields.find((field) => field.key === spec.key)?.value ?? null;
    if (entry.value !== expected) {
      return fallback(record, "model_output_rejected");
    }
    fields.push({
      key: spec.key,
      label: spec.label,
      value: entry.value,
      locator: entry.locator ? `${record.title}, "${entry.locator}"` : null,
      confidence: 0.95
    });
  }

  return {
    record: {
      kind: record.kind,
      title: record.title,
      engine: "model",
      fallbackReason: null,
      fields
    },
    fallbackReason: null
  };
}

function parseReportedFields(input: unknown): Map<string, ModelFieldValue> | null {
  if (typeof input !== "object" || input === null) return null;
  const candidate = (input as { fields?: unknown }).fields;
  if (!Array.isArray(candidate)) return null;

  const parsed = new Map<string, ModelFieldValue>();
  for (const item of candidate) {
    if (typeof item !== "object" || item === null) return null;
    const entry = item as Record<string, unknown>;
    if (typeof entry.key !== "string") return null;
    if (entry.value !== null && typeof entry.value !== "string") return null;
    if (entry.locator !== null && typeof entry.locator !== "string") return null;
    parsed.set(entry.key, {
      key: entry.key,
      value: entry.value,
      locator: entry.locator
    });
  }
  return parsed;
}

function fallback(record: SyntheticRecord, reason: FallbackReason): ModelExtractionOutcome {
  const extracted = extractDeterministically(record);
  return {
    record: { ...extracted, fallbackReason: reason },
    fallbackReason: reason
  };
}
