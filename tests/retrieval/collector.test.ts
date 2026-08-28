import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSourceProvenance,
  extractTitle,
  normalizeText,
  parseWildcardRobots,
  sha256,
  stripHtml,
  validatePdf
} from "../../rag-corpus/scripts/collection_utils.mjs";

describe("controlled public-source collector", () => {
  it("extracts rendered-page fallback text without scripts or boilerplate tags", () => {
    const html = "<html><head><title> Official &amp; Current </title><style>x</style></head>" +
      "<body><nav>Forms</nav><main>Form 12 <strong>current</strong>.</main><script>secret()</script></body></html>";

    expect(extractTitle(html)).toBe("Official & Current");
    expect(normalizeText(stripHtml(html))).toContain("Form 12 current");
    expect(normalizeText(stripHtml(html))).not.toContain("secret()");
  });

  it("requires both the PDF content type and the original PDF signature", () => {
    const pdf = Buffer.from("%PDF-1.7\nfixture");
    expect(() => validatePdf(pdf, "application/pdf")).not.toThrow();
    expect(() => validatePdf(Buffer.from("<html>"), "application/pdf")).toThrow(/not a PDF/);
    expect(() => validatePdf(pdf, "text/html")).toThrow(/content-type/);
  });

  it("computes stable SHA-256 values used for deduplication", () => {
    const first = sha256(Buffer.from("same official document"));
    const second = sha256(Buffer.from("same official document"));
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("honours wildcard robots disallow rules", () => {
    const rules = parseWildcardRobots("User-agent: *\nDisallow: /private\nDisallow:\n");
    expect(rules).toContain("/private");
  });

  it("refuses sources without explicit rights and raw-publication controls", () => {
    const source = {
      id: "TEST",
      url: "https://example.test/document",
      kind: "html",
      necessaryForJourney: true,
      provenance: {
        officialTitle: "Test",
        documentDate: "2026",
        rightsStatus: "summary only",
        rawDeploymentPermitted: false,
        relevantLocators: ["paragraph 1"],
        derivedBriefs: []
      }
    };
    expect(() => assertSourceProvenance(source)).not.toThrow();
    expect(() =>
      assertSourceProvenance({
        ...source,
        provenance: { ...source.provenance, rawDeploymentPermitted: true }
      })
    ).toThrow(/raw deployment/);
  });

  it("records every approved source exactly once with complete raw artifacts", async () => {
    const root = process.cwd();
    const config = JSON.parse(
      await readFile(path.join(root, "rag-corpus/config/public_sources.json"), "utf8")
    ) as { sources: Array<{ id: string }> };
    const manifest = JSON.parse(
      await readFile(path.join(root, "rag-corpus/raw_sources_auto/collection_manifest.json"), "utf8")
    ) as { results: Array<{ id: string; status: string; files: string[] }> };

    expect(manifest.results.map((item) => item.id)).toEqual(
      config.sources.map((item) => item.id)
    );
    expect(manifest.results.every((item) => item.status === "success")).toBe(true);
    expect(new Set(manifest.results.map((item) => item.id)).size).toBe(config.sources.length);
    expect(manifest.results.every((item) => item.files.length >= 2)).toBe(true);
  });
});
