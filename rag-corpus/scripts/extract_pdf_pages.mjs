#!/usr/bin/env node
/**
 * Dumps a collected PDF to page-numbered text so corpus claims can be checked
 * against the exact page of the original. Reads only from the ignored
 * raw_sources_auto directory and writes nothing.
 *
 * Usage: node rag-corpus/scripts/extract_pdf_pages.mjs <file.pdf> [from] [to]
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.resolve(scriptDir, "..", "raw_sources_auto");

const [fileArg, fromArg, toArg] = process.argv.slice(2);
if (!fileArg) {
  console.error("Usage: extract_pdf_pages.mjs <file.pdf> [fromPage] [toPage]");
  process.exit(1);
}

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(await readFile(path.join(rawDir, fileArg)));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

const from = Number(fromArg || 1);
const to = Math.min(Number(toArg || doc.numPages), doc.numPages);
console.log(`# ${fileArg} — ${doc.numPages} pages total`);

for (let pageNumber = from; pageNumber <= to; pageNumber += 1) {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  console.log(`\n===== PAGE ${pageNumber} =====\n${text}`);
}
