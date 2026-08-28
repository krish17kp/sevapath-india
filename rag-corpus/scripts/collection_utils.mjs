import { createHash } from "node:crypto";

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normalizeText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function extractTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeText(stripHtml(match[1])) : "";
}

export function parseWildcardRobots(content) {
  const rules = [];
  let applies = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") applies = value === "*";
    if (key === "disallow" && applies) rules.push(value);
  }
  return rules;
}

export function validatePdf(bytes, contentType) {
  if (!Buffer.isBuffer(bytes) || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error(`Response is not a PDF; content-type=${contentType}`);
  }
  if (!/^application\/pdf(?:\s*;|$)/i.test(contentType)) {
    throw new Error(`PDF response has an unexpected content-type: ${contentType || "missing"}`);
  }
}

export function assertSourceProvenance(source) {
  const provenance = source?.provenance;
  if (!source?.id || !source?.url || !["html", "pdf"].includes(source.kind)) {
    throw new Error(`Invalid source configuration: ${JSON.stringify(source)}`);
  }
  if (source.necessaryForJourney !== true) {
    throw new Error(`${source.id}: source is not marked necessary for the journey`);
  }
  if (!provenance?.officialTitle || !provenance?.documentDate || !provenance?.rightsStatus) {
    throw new Error(`${source.id}: incomplete provenance metadata`);
  }
  if (provenance.rawDeploymentPermitted !== false) {
    throw new Error(`${source.id}: raw deployment must be explicitly disabled`);
  }
  if (!Array.isArray(provenance.relevantLocators) || provenance.relevantLocators.length === 0) {
    throw new Error(`${source.id}: relevant locators are required`);
  }
  if (!Array.isArray(provenance.derivedBriefs)) {
    throw new Error(`${source.id}: derivedBriefs must be an array`);
  }
}

export async function extractPdfPages(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    isEvalSupported: false
  }).promise;
  const pages = [];
  let nonEmptyPages = 0;
  let textCharacters = 0;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = normalizeText(
      content.items.map((item) => ("str" in item ? item.str : "")).join(" ")
    );
    if (text.length >= 20) nonEmptyPages += 1;
    textCharacters += text.length;
    pages.push(`===== PAGE ${pageNumber} =====\n${text}`);
  }
  const likelyScanned = nonEmptyPages < Math.max(1, Math.ceil(document.numPages * 0.5));
  return {
    pageCount: document.numPages,
    nonEmptyPages,
    textCharacters,
    likelyScanned,
    text: `${pages.join("\n\n")}\n`
  };
}
