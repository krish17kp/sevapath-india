import type { ExtractionResult, FallbackReason } from "../types";
import type { SyntheticCase } from "../synthetic-records";
import { extractDeterministically } from "./deterministic";
import { extractWithModel, isModelConfigured } from "./model";

export { extractDeterministically, knownFieldKeys, fieldSpecsFor } from "./deterministic";
export { extractWithModel, isModelConfigured } from "./model";

/**
 * Extracts all three records for a case.
 *
 * Whether the model or the deterministic reader ran is reported honestly to the
 * citizen. The deterministic path is not a degraded mode — it reads the same
 * labelled records with certainty — so the notice says what happened without
 * implying the result is worse.
 */
export async function extractCase(
  syntheticCase: SyntheticCase,
  options?: { useModel?: boolean }
): Promise<ExtractionResult> {
  const useModel = options?.useModel ?? isModelConfigured();

  if (!useModel) {
    return {
      records: syntheticCase.records.map((record) => ({
        ...extractDeterministically(record),
        fallbackReason: "no_api_key" as const
      })),
      engine: "deterministic",
      fallbackReason: "no_api_key",
      notice: noticeFor("no_api_key")
    };
  }

  const outcomes = await Promise.all(
    syntheticCase.records.map((record) => extractWithModel(record))
  );

  const records = outcomes.map((outcome) => outcome.record);
  // If any record fell back, the run as a whole is reported as a fallback run —
  // a partly model-read result should not be presented as a model result.
  const firstFallback = outcomes.find((outcome) => outcome.fallbackReason !== null);

  if (!firstFallback) {
    return {
      records,
      engine: "model",
      fallbackReason: null,
      notice: null
    };
  }

  return {
    records,
    engine: "deterministic",
    fallbackReason: firstFallback.fallbackReason,
    notice: noticeFor(firstFallback.fallbackReason)
  };
}

export function noticeFor(reason: FallbackReason): string | null {
  switch (reason) {
    case "no_api_key":
      return "Reading the records without the language model. SevaPath used its built-in reader, which reads the labelled fields directly. Nothing about the checks below changes.";
    case "model_error":
      return "The language model could not be reached, so SevaPath used its built-in reader instead. Nothing about the checks below changes.";
    case "model_output_rejected":
      return "The language model returned a value that did not appear on the record, so SevaPath discarded it and used its built-in reader instead. Values are only ever copied exactly as printed.";
    case "disabled_by_config":
      return "Model-assisted reading is switched off. SevaPath used its built-in reader.";
    case null:
      return null;
  }
}
