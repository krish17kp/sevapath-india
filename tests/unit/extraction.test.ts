import { describe, expect, it } from "vitest";
import {
  extractDeterministically,
  extractCase,
  isModelConfigured,
  noticeFor
} from "@/lib/domain/extraction";
import { getSyntheticCase, SYNTHETIC_CASES } from "@/lib/domain/synthetic-records";

describe("deterministic extraction", () => {
  it("reads every labelled field off the PPO", () => {
    const [ppo] = getSyntheticCase("name_variation").records;
    const extracted = extractDeterministically(ppo!);

    expect(extracted.engine).toBe("deterministic");
    const byKey = new Map(extracted.fields.map((field) => [field.key, field.value]));
    expect(byKey.get("pensioner_name")).toBe("Ramesh Kumar Sharma");
    expect(byKey.get("spouse_name")).toBe("Meera Sharma");
    expect(byKey.get("relationship_to_pensioner")).toBe("Spouse");
  });

  it("copies values verbatim, keeping a middle initial intact", async () => {
    const extraction = await extractCase(getSyntheticCase("name_variation"), {
      useModel: false
    });

    const bank = extraction.records.find((record) => record.kind === "bank_proof");
    const holder = bank?.fields.find((field) => field.key === "account_holder_name");

    // The whole prototype rests on this value surviving unmodified.
    expect(holder?.value).toBe("Meera R. Sharma");
  });

  it("treats an illegible value as absent rather than as text", async () => {
    const extraction = await extractCase(getSyntheticCase("missing_death_date"), {
      useModel: false
    });

    const certificate = extraction.records.find(
      (record) => record.kind === "death_certificate"
    );
    const dateOfDeath = certificate?.fields.find((field) => field.key === "date_of_death");

    expect(dateOfDeath?.value).toBeNull();
  });

  it("records a locator for every value it read", () => {
    for (const syntheticCase of SYNTHETIC_CASES) {
      for (const record of syntheticCase.records) {
        for (const field of extractDeterministically(record).fields) {
          if (field.value !== null) {
            expect(field.locator, `${record.kind}.${field.key}`).not.toBeNull();
          }
        }
      }
    }
  });

  it("reports the no-key fallback without an API key", async () => {
    const extraction = await extractCase(getSyntheticCase("matched"), { useModel: false });

    expect(extraction.engine).toBe("deterministic");
    expect(extraction.fallbackReason).toBe("no_api_key");
    expect(extraction.notice).toContain("without the language model");
  });

  it("reads the same values with or without a model available", async () => {
    // Whether a key happens to be set must not change what the fallback reads.
    const withoutModel = await extractCase(getSyntheticCase("name_variation"), {
      useModel: false
    });

    const values = withoutModel.records.flatMap((record) =>
      record.fields.map((field) => `${record.kind}.${field.key}=${field.value}`)
    );

    expect(values).toContain("ppo.spouse_name=Meera Sharma");
    expect(values).toContain("bank_proof.account_holder_name=Meera R. Sharma");
  });

  it("has a notice for every fallback reason", () => {
    expect(noticeFor("no_api_key")).toBeTruthy();
    expect(noticeFor("model_error")).toBeTruthy();
    expect(noticeFor("model_output_rejected")).toBeTruthy();
    expect(noticeFor("disabled_by_config")).toBeTruthy();
    expect(noticeFor(null)).toBeNull();
  });

  it("reports whether a key is configured without revealing it", () => {
    expect(typeof isModelConfigured()).toBe("boolean");
  });
});

describe("synthetic records", () => {
  it("contains no plausible real identifiers", () => {
    const text = JSON.stringify(SYNTHETIC_CASES);

    // A 12-digit run would look like an Aadhaar number; the placeholders use X's.
    expect(text).not.toMatch(/\b\d{12}\b/);
    // A real PAN is five letters, four digits, one letter.
    expect(text).not.toMatch(/\b[A-Z]{5}\d{4}[A-Z]\b/);
    expect(text).toMatch(/SYNTHETIC DEMONSTRATION RECORD/);
  });

  it("labels every record as synthetic on its face", () => {
    for (const syntheticCase of SYNTHETIC_CASES) {
      for (const record of syntheticCase.records) {
        expect(record.lines[0]).toContain("SYNTHETIC");
        expect(record.lines.at(-1)).toContain("SYNTHETIC");
      }
    }
  });
});
