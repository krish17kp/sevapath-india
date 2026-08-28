import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readSourceManifest } from "@/lib/corpus-manifest";

/**
 * Corpus integrity: the shipped briefs, the derived index, and the manifest
 * must agree with each other and stay inside the safety boundary.
 */

const repoRoot = process.cwd();
const ingestDir = path.join(repoRoot, "rag-corpus", "ingest");

const briefFiles = (await readdir(ingestDir)).filter((name) => name.endsWith(".md"));

describe("ingest briefs", () => {
  it("exist", () => {
    expect(briefFiles.length).toBeGreaterThanOrEqual(10);
  });

  it("cover every required topic", async () => {
    const combined = (
      await Promise.all(
        briefFiles.map((name) => readFile(path.join(ingestDir, name), "utf8"))
      )
    ).join("\n");

    expect(combined).toMatch(/Rule 79\(2\)\(a\)\(ii\)/);
    expect(combined).toMatch(/Rule 79\(2\)\(b\)\(i\)/);
    expect(combined).toMatch(/Form 12/);
    expect(combined).toMatch(/Form 10/);
    expect(combined).toMatch(/Format 9/);
    expect(combined).toMatch(/Form 14/);
    expect(combined).toMatch(/Archives/);
    expect(combined).toMatch(/Directions, 2026/);
  });

  it("never present Form 14 as current", async () => {
    for (const name of briefFiles) {
      const content = await readFile(path.join(ingestDir, name), "utf8");
      // Any mention of Form 14 must sit in the brief that marks it archived.
      if (/Form 14/.test(content)) {
        expect(content, name).toMatch(/archiv/i);
      }
    }
  });

  it("carry no synthetic or personal data", async () => {
    for (const name of briefFiles) {
      const content = await readFile(path.join(ingestDir, name), "utf8");
      expect(content, name).not.toMatch(/Meera/);
      expect(content, name).not.toMatch(/\b\d{12}\b/);
      expect(content, name).not.toMatch(/\b[A-Z]{5}\d{4}[A-Z]\b/);
    }
  });

  it("link only to allowlisted official hosts", async () => {
    const allowlist = JSON.parse(
      await readFile(path.join(repoRoot, "rag-corpus", "config", "public_sources.json"), "utf8")
    ) as { allowedHosts: string[] };

    for (const name of briefFiles) {
      const content = await readFile(path.join(ingestDir, name), "utf8");
      for (const match of content.matchAll(/url:\s*(\S+)/g)) {
        const host = new URL(match[1]!).hostname;
        expect(allowlist.allowedHosts, `${name} links to ${host}`).toContain(host);
      }
    }
  });
});

describe("derived index", () => {
  it("is in sync with the briefs", () => {
    // Fails loudly if someone edits a brief and forgets `npm run corpus:index`.
    const output = execFileSync(
      process.execPath,
      [path.join(repoRoot, "rag-corpus", "scripts", "build_local_index.mjs"), "--check"],
      { encoding: "utf8" }
    );

    expect(output).toMatch(/PASS/);
  });

  it("gives every evidence chunk at least one citation", async () => {
    const index = JSON.parse(
      await readFile(path.join(repoRoot, "rag-corpus", "index", "local_index.json"), "utf8")
    ) as {
      chunks: {
        id: string;
        productPolicy: boolean;
        status: string;
        citations: { url: string; reference: string; accessed: string }[];
      }[];
    };

    for (const chunk of index.chunks) {
      if (chunk.productPolicy || chunk.status === "policy") continue;
      expect(chunk.citations.length, chunk.id).toBeGreaterThan(0);
      for (const citation of chunk.citations) {
        expect(citation.url).toMatch(/^https:\/\//);
        expect(citation.reference.trim().length).toBeGreaterThan(0);
        expect(citation.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe("source manifest", () => {
  it("records every collected source with provenance", async () => {
    const rows = await readSourceManifest();

    expect(rows.length).toBe(11);
    for (const row of rows) {
      expect(row.sha256, row.sourceId).toMatch(/^[a-f0-9]{64}$/);
      expect(row.finalUrl, row.sourceId).toMatch(/^https:\/\//);
      expect(row.accessedUtc, row.sourceId).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(row.collectionMethod.length, row.sourceId).toBeGreaterThan(0);
      expect(row.issuer.length, row.sourceId).toBeGreaterThan(0);
    }
  });

  it("records the official title actually retrieved for the RBI directions", async () => {
    const rows = await readSourceManifest();
    const rbi = rows.find((row) => row.sourceId === "RBI2026-MD");

    // The allowlist guessed a different title; the retrieved one must win.
    expect(rbi?.officialTitle).toMatch(/Disbursement of Government Pension by Agency Banks/);
  });

  it("marks the superseded FAQ as superseded", async () => {
    const rows = await readSourceManifest();
    const faq = rows.find((row) => row.sourceId === "FAQ-CIVIL-2018");

    expect(faq?.corpusStatus).toMatch(/superseded/);
  });
});

describe("rights policy", () => {
  it("exists and states the no-redistribution rule", async () => {
    const policy = await readFile(
      path.join(repoRoot, "rag-corpus", "RIGHTS_POLICY.md"),
      "utf8"
    );

    expect(policy).toMatch(/never\s+redistributed/i);
    expect(policy).toMatch(/raw_sources_auto/);
    expect(policy).toMatch(/robots/i);
  });
});
