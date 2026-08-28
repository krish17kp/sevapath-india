#!/usr/bin/env node
/**
 * Compiles rag-corpus/ingest/*.md into rag-corpus/index/local_index.json.
 *
 * The briefs are the source of truth; the index is a derived artifact that the
 * local retrieval adapter loads at request time. `--check` rebuilds in memory
 * and fails if the committed index is stale, which is what the test suite runs.
 *
 * Every factual statement in a brief must carry a citation marker of the form
 * [KEY: locator], where KEY is defined in that brief's frontmatter `sources`.
 * A marker naming an unknown key is a build error, so a citation can never
 * dangle.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const corpusRoot = path.resolve(scriptDir, "..");
const ingestDir = path.join(corpusRoot, "ingest");
const indexDir = path.join(corpusRoot, "index");
const indexPath = path.join(indexDir, "local_index.json");
const checkOnly = process.argv.includes("--check");

/** [KEY: locator]. Tolerates one level of nested brackets inside the locator. */
const CITATION_PATTERN = /\[([A-Z][A-Z0-9]*):\s*((?:[^[\]]|\[[^[\]]*\])*)\]/g;

const errors = [];
const briefs = [];
const chunks = [];

const filenames = (await readdir(ingestDir))
  .filter((name) => name.endsWith(".md"))
  .sort();

if (filenames.length === 0) {
  throw new Error(`No briefs found in ${ingestDir}`);
}

for (const filename of filenames) {
  const raw = await readFile(path.join(ingestDir, filename), "utf8");
  const { frontmatter, body } = splitFrontmatter(raw, filename);

  for (const field of ["id", "title", "topic", "status", "sources"]) {
    if (frontmatter[field] === undefined) {
      errors.push(`${filename}: frontmatter is missing "${field}"`);
    }
  }

  const sources = frontmatter.sources ?? {};
  for (const [key, source] of Object.entries(sources)) {
    for (const field of ["sourceId", "issuer", "title", "url", "accessed"]) {
      if (!source?.[field]) {
        errors.push(`${filename}: source ${key} is missing "${field}"`);
      }
    }
    if (source?.url && !String(source.url).startsWith("https://")) {
      errors.push(`${filename}: source ${key} url is not https`);
    }
  }

  briefs.push({
    id: frontmatter.id,
    file: `ingest/${filename}`,
    title: frontmatter.title,
    topic: frontmatter.topic,
    route: frontmatter.route ?? "none",
    status: frontmatter.status,
    keywords: frontmatter.keywords ?? [],
    sources
  });

  for (const section of splitSections(body)) {
    const citations = [];
    let match;
    CITATION_PATTERN.lastIndex = 0;
    while ((match = CITATION_PATTERN.exec(section.text)) !== null) {
      const [, key, locator] = match;
      const source = sources[key];
      if (!source) {
        errors.push(`${filename}: citation key "${key}" is not defined in frontmatter`);
        continue;
      }
      citations.push({
        key,
        sourceId: source.sourceId,
        issuer: source.issuer,
        title: source.title,
        url: source.url,
        accessed: source.accessed,
        reference: locator.trim()
      });
    }

    // A section may declare itself as describing SevaPath's own behaviour
    // rather than asserting anything about the official sources. Such a section
    // is exempt from the citation requirement and is never served as evidence.
    const productPolicy = /<!--\s*product-policy:/.test(section.text);

    // Prose with the citation markers and HTML comments removed, for display
    // and for scoring.
    const prose = section.text
      .replace(CITATION_PATTERN, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (prose.length < 40) continue;

    chunks.push({
      id: `${frontmatter.id}#${slug(section.heading)}`,
      briefId: frontmatter.id,
      briefTitle: frontmatter.title,
      file: `ingest/${filename}`,
      heading: section.heading,
      topic: frontmatter.topic,
      route: frontmatter.route ?? "none",
      status: frontmatter.status,
      keywords: frontmatter.keywords ?? [],
      text: prose,
      productPolicy,
      citations: dedupeCitations(citations)
    });
  }
}

for (const chunk of chunks) {
  // A chunk that states a fact but cites nothing cannot be served as evidence.
  if (chunk.citations.length === 0 && !chunk.productPolicy && chunk.status !== "policy") {
    errors.push(`${chunk.file}: section "${chunk.heading}" has no citation`);
  }
}

const duplicateIds = chunks
  .map((chunk) => chunk.id)
  .filter((id, position, all) => all.indexOf(id) !== position);
if (duplicateIds.length > 0) {
  errors.push(`Duplicate chunk ids: ${[...new Set(duplicateIds)].join(", ")}`);
}

if (errors.length > 0) {
  console.error("Corpus build failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const index = {
  schemaVersion: 1,
  briefCount: briefs.length,
  chunkCount: chunks.length,
  briefs,
  chunks
};
const serialised = `${JSON.stringify(index, null, 2)}\n`;

if (checkOnly) {
  const existing = await readFile(indexPath, "utf8").catch(() => null);
  if (existing === null) {
    console.error(`Index is missing. Run: npm run corpus:index`);
    process.exit(1);
  }
  if (digest(existing) !== digest(serialised)) {
    console.error("Index is stale. Run: npm run corpus:index");
    process.exit(1);
  }
  console.log(`PASS: index is current (${briefs.length} briefs, ${chunks.length} chunks)`);
} else {
  await mkdir(indexDir, { recursive: true });
  await writeFile(indexPath, serialised, "utf8");
  console.log(`Wrote ${briefs.length} briefs and ${chunks.length} chunks to ${path.relative(process.cwd(), indexPath)}`);
}

function splitFrontmatter(raw, filename) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`${filename}: missing YAML frontmatter`);
  }
  return { frontmatter: parseYaml(match[1]) ?? {}, body: match[2] };
}

function splitSections(body) {
  const sections = [];
  let heading = "Overview";
  let buffer = [];
  for (const line of body.split(/\r?\n/)) {
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch) {
      if (buffer.join("").trim()) sections.push({ heading, text: buffer.join("\n") });
      heading = headingMatch[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.join("").trim()) sections.push({ heading, text: buffer.join("\n") });
  return sections;
}

function dedupeCitations(citations) {
  const seen = new Set();
  return citations.filter((citation) => {
    const fingerprint = `${citation.sourceId}|${citation.reference}`;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
