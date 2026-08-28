#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { assertSourceProvenance } from "./collection_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const corpusRoot = path.resolve(scriptDir, "..");
const config = JSON.parse(
  await readFile(path.join(corpusRoot, "config", "public_sources.json"), "utf8")
);
const rawDir = path.join(corpusRoot, "raw_sources_auto");
const manifest = JSON.parse(
  await readFile(path.join(rawDir, "collection_manifest.json"), "utf8")
);

const errors = [];
for (const source of config.sources) {
  try {
    assertSourceProvenance({ ...source, provenance: config.provenance?.[source.id] });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}
const configuredIds = new Set(config.sources.map((source) => source.id));
const resultIds = new Set(manifest.results.map((result) => result.id));

for (const id of configuredIds) {
  if (!resultIds.has(id)) errors.push(`Missing manifest result: ${id}`);
}

for (const result of manifest.results) {
  if (!configuredIds.has(result.id)) {
    errors.push(`Unconfigured source in manifest: ${result.id}`);
    continue;
  }
  if (result.status !== "success") {
    errors.push(`${result.id}: status=${result.status}`);
    continue;
  }
  if (!/^[a-f0-9]{64}$/.test(result.sha256 || "")) {
    errors.push(`${result.id}: invalid sha256`);
  }
  if (!config.allowedHosts.includes(new URL(result.finalUrl).hostname)) {
    errors.push(`${result.id}: final URL host is not allowlisted`);
  }
  if (!Array.isArray(result.files) || result.files.length === 0) {
    errors.push(`${result.id}: no files recorded`);
    continue;
  }

  for (const filename of result.files) {
    const filePath = path.join(rawDir, filename);
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat || !fileStat.isFile() || fileStat.size === 0) {
      errors.push(`${result.id}: missing or empty file ${filename}`);
    }
  }

  const primary = await readFile(path.join(rawDir, result.files[0])).catch(() => null);
  if (!primary) continue;
  if (digest(primary) !== result.sha256) {
    errors.push(`${result.id}: checksum mismatch`);
  }
  if (result.kind === "pdf" && primary.subarray(0, 5).toString() !== "%PDF-") {
    errors.push(`${result.id}: invalid PDF signature`);
  }
  if (result.kind === "pdf" && !/^application\/pdf(?:\s*;|$)/i.test(result.contentType || "")) {
    errors.push(`${result.id}: invalid PDF content type`);
  }
  if (result.kind === "pdf") {
    const pagesFile = result.files.find((name) => name.endsWith(".pages.txt"));
    const pagesText = pagesFile
      ? await readFile(path.join(rawDir, pagesFile), "utf8").catch(() => "")
      : "";
    if (!pagesFile || !pagesText.includes("===== PAGE 1 =====")) {
      errors.push(`${result.id}: page-bounded PDF extraction is missing`);
    }
    if (digest(Buffer.from(pagesText, "utf8")) !== result.extractedTextSha256) {
      errors.push(`${result.id}: extracted text checksum mismatch`);
    }
    if (!Number.isInteger(result.pageCount) || result.pageCount < 1 || result.ocrUsed !== false) {
      errors.push(`${result.id}: invalid PDF extraction metadata`);
    }
  }
  if (result.kind === "html" && Number(result.textCharacters || 0) < 250) {
    errors.push(`${result.id}: insufficient extracted text`);
  }
  if (!result.contentType) errors.push(`${result.id}: content type is missing`);
}

const seenHashes = new Map();
for (const result of manifest.results.filter((item) => item.status === "success")) {
  const previous = seenHashes.get(result.sha256);
  if (previous) errors.push(`${result.id}: duplicates ${previous} by checksum`);
  seenHashes.set(result.sha256, result.id);
}

for (const source of config.sources) {
  const provenance = config.provenance[source.id];
  for (const filename of provenance.derivedBriefs) {
    const brief = path.join(corpusRoot, "ingest", filename);
    const briefStat = await stat(brief).catch(() => null);
    if (!briefStat?.isFile()) errors.push(`${source.id}: missing derived brief ${filename}`);
  }
}

if (errors.length > 0) {
  console.error("Collection validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS: ${manifest.results.length} public sources validated`);

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
