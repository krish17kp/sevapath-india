import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Reads the committed source manifest so the sources page shows exactly what
 * was collected, when, and with what checksum. Server-side only.
 */

export interface ManifestRow {
  sourceId: string;
  issuer: string;
  officialTitle: string;
  finalUrl: string;
  accessedUtc: string;
  documentDate: string;
  sha256: string;
  collectionMethod: string;
  corpusStatus: string;
  scopeNote: string;
}

export async function readSourceManifest(): Promise<ManifestRow[]> {
  const manifestPath = path.join(process.cwd(), "rag-corpus", "source_manifest.csv");
  const raw = await readFile(manifestPath, "utf8");
  const rows = parseCsv(raw);
  const [header, ...body] = rows;
  if (!header) return [];

  const indexOf = (name: string) => header.indexOf(name);
  const columns = {
    sourceId: indexOf("source_id"),
    issuer: indexOf("issuer"),
    officialTitle: indexOf("official_title"),
    finalUrl: indexOf("final_url"),
    accessedUtc: indexOf("accessed_utc"),
    documentDate: indexOf("document_date"),
    sha256: indexOf("sha256"),
    collectionMethod: indexOf("collection_method"),
    corpusStatus: indexOf("corpus_status"),
    scopeNote: indexOf("scope_note")
  };

  return body
    .filter((row) => row.length > 1)
    .map((row) => ({
      sourceId: row[columns.sourceId] ?? "",
      issuer: row[columns.issuer] ?? "",
      officialTitle: row[columns.officialTitle] ?? "",
      finalUrl: row[columns.finalUrl] ?? "",
      accessedUtc: row[columns.accessedUtc] ?? "",
      documentDate: row[columns.documentDate] ?? "",
      sha256: row[columns.sha256] ?? "",
      collectionMethod: row[columns.collectionMethod] ?? "",
      corpusStatus: row[columns.corpusStatus] ?? "",
      scopeNote: row[columns.scopeNote] ?? ""
    }));
}

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, embedded newlines. */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let position = 0; position < input.length; position += 1) {
    const character = input[position];

    if (quoted) {
      if (character === '"') {
        if (input[position + 1] === '"') {
          field += '"';
          position += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
