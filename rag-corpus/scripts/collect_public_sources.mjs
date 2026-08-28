#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  assertSourceProvenance,
  extractPdfPages,
  extractTitle,
  normalizeText,
  parseWildcardRobots,
  safeName,
  sha256,
  stripHtml,
  validatePdf
} from "./collection_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const corpusRoot = path.resolve(scriptDir, "..");
const configPath = path.join(corpusRoot, "config", "public_sources.json");
const outputDir = path.join(corpusRoot, "raw_sources_auto");
const manifestPath = path.join(outputDir, "collection_manifest.json");

const config = JSON.parse(await readFile(configPath, "utf8"));
const previousManifest = await readFile(manifestPath, "utf8")
  .then((value) => JSON.parse(value))
  .catch(() => ({ results: [] }));
const previousById = new Map(previousManifest.results.map((item) => [item.id, item]));
const requestedId = valueAfter("--source-id");
const force = process.argv.includes("--force");
const configuredSources = config.sources.map((source) => ({
  ...source,
  provenance: config.provenance?.[source.id]
}));
const selected = requestedId
  ? configuredSources.filter((source) => source.id === requestedId)
  : configuredSources;

if (requestedId && selected.length !== 1) {
  throw new Error(`Unknown --source-id: ${requestedId}`);
}

await mkdir(outputDir, { recursive: true });

let playwright;
let browser;
try {
  playwright = await import("playwright");
} catch {
  playwright = null;
}

const results = [];

try {
  for (let index = 0; index < selected.length; index += 1) {
    const source = selected[index];
    assertAllowedSource(source);

    if (index > 0) {
      await sleep(config.minimumDelayMs);
    }

    const startedAt = new Date().toISOString();
    const baseResult = {
      id: source.id,
      title: source.title,
      issuer: source.issuer,
      requestedUrl: source.url,
      kind: source.kind,
      corpusUse: source.corpusUse,
      startedAt
    };

    try {
      const robots = await checkRobots(source.url);
      if (robots.status === "disallowed") {
        results.push({
          ...baseResult,
          status: "skipped",
          reason: "robots-disallowed",
          robots
        });
        continue;
      }

      const collected = source.kind === "pdf"
        ? await collectPdf(source)
        : await collectHtml(source);
      const previous = previousById.get(source.id);

      results.push({
        ...baseResult,
        status: "success",
        robots,
        collectedAt: new Date().toISOString(),
        previousSha256: previous?.sha256 ?? null,
        contentChanged: previous ? previous.sha256 !== collected.sha256 : null,
        duplicateOfPrevious: previous ? previous.sha256 === collected.sha256 : false,
        ...collected
      });
    } catch (error) {
      results.push({
        ...baseResult,
        status: "failed",
        failedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }

    await writeManifest(results);
  }
} finally {
  if (browser) {
    await browser.close();
  }
}

await writeManifest(results);

const failures = results.filter((item) => item.status !== "success");
console.log(`Collected ${results.length - failures.length}/${results.length} sources`);
console.log(`Manifest: ${manifestPath}`);
if (failures.length > 0) {
  console.error(`Failures or skips: ${failures.map((item) => item.id).join(", ")}`);
  process.exitCode = 2;
}

async function collectPdf(source) {
  const response = await fetchWithLimits(source.url);
  const finalUrl = response.url;
  assertAllowedUrl(finalUrl);
  const contentType = response.headers.get("content-type") || "";
  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.length > config.maximumBytes) {
    throw new Error(`PDF exceeds maximumBytes: ${bytes.length}`);
  }
  validatePdf(bytes, contentType);
  const extraction = await extractPdfPages(bytes);
  if (extraction.likelyScanned) {
    throw new Error(
      `PDF appears scanned (${extraction.nonEmptyPages}/${extraction.pageCount} text pages); OCR review is required`
    );
  }

  const base = safeName(source.id);
  const filename = `${base}.pdf`;
  const pagesFile = `${base}.pages.txt`;
  await writeFile(path.join(outputDir, filename), bytes);
  await writeFile(path.join(outputDir, pagesFile), extraction.text, "utf8");

  return {
    method: "direct-http-pdf",
    finalUrl,
    httpStatus: response.status,
    contentType,
    bytes: bytes.length,
    sha256: sha256(bytes),
    pageCount: extraction.pageCount,
    extractedTextCharacters: extraction.textCharacters,
    extractedTextSha256: sha256(Buffer.from(extraction.text, "utf8")),
    extractionMethod: "pdfjs-page-boundaries",
    ocrUsed: false,
    files: [filename, pagesFile]
  };
}

async function collectHtml(source) {
  let playwrightError;

  if (playwright) {
    try {
      if (!browser) {
        browser = await playwright.chromium.launch({ headless: true });
      }
      const context = await browser.newContext({
        userAgent: config.userAgent,
        javaScriptEnabled: true
      });
      const page = await context.newPage();
      const response = await page.goto(source.url, {
        waitUntil: "domcontentloaded",
        timeout: 45000
      });
      if (!response || !response.ok()) {
        throw new Error(`Playwright navigation status ${response?.status() ?? "unknown"}`);
      }
      await page.waitForTimeout(750);
      const finalUrl = page.url();
      assertAllowedUrl(finalUrl);
      const title = await page.title();
      const html = await page.content();
      const text = normalizeText(await page.locator("body").innerText());
      const responseHeaders = await response.allHeaders();
      await context.close();

      if (text.length < 250) {
        throw new Error(`Playwright extracted too little text: ${text.length} characters`);
      }
      return await saveHtmlResult(source, {
        method: "playwright",
        finalUrl,
        httpStatus: response.status(),
        contentType: responseHeaders["content-type"] || "text/html",
        title,
        html,
        text
      });
    } catch (error) {
      playwrightError = error instanceof Error ? error.message : String(error);
    }
  } else {
    playwrightError = "playwright package is not installed";
  }

  const response = await fetchWithLimits(source.url);
  const finalUrl = response.url;
  assertAllowedUrl(finalUrl);
  const contentType = response.headers.get("content-type") || "";
  const html = await response.text();
  const text = normalizeText(stripHtml(html));
  if (text.length < 250) {
    throw new Error(
      `HTTP fallback extracted too little text (${text.length}); Playwright error: ${playwrightError}`
    );
  }

  return await saveHtmlResult(source, {
    method: "node-fetch-fallback",
    fallbackReason: playwrightError,
    finalUrl,
    httpStatus: response.status,
    contentType,
    title: extractTitle(html),
    html,
    text
  });
}

async function saveHtmlResult(source, data) {
  const htmlBuffer = Buffer.from(data.html, "utf8");
  if (htmlBuffer.length > config.maximumBytes) {
    throw new Error(`HTML exceeds maximumBytes: ${htmlBuffer.length}`);
  }
  const base = safeName(source.id);
  const htmlFile = `${base}.html`;
  const textFile = `${base}.txt`;
  await writeFile(path.join(outputDir, htmlFile), data.html, "utf8");
  await writeFile(path.join(outputDir, textFile), `${data.text}\n`, "utf8");

  return {
    ...data,
    html: undefined,
    text: undefined,
    bytes: htmlBuffer.length,
    textCharacters: data.text.length,
    sha256: sha256(htmlBuffer),
    textSha256: sha256(Buffer.from(data.text, "utf8")),
    files: [htmlFile, textFile]
  };
}

async function fetchWithLimits(url) {
  const attempts = Number(config.maximumRetries ?? 2) + 1;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": config.userAgent,
          accept: "text/html,application/pdf;q=0.9,*/*;q=0.5"
        }
      });
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === attempts - 1) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
      } else {
        const declaredLength = Number(response.headers.get("content-length") || 0);
        if (declaredLength > config.maximumBytes) {
          throw new Error(`Response exceeds maximumBytes: ${declaredLength}`);
        }
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
    await sleep(Number(config.retryBaseDelayMs ?? 800) * 2 ** attempt);
  }
  throw lastError;
}

async function checkRobots(urlString) {
  const url = new URL(urlString);
  const robotsUrl = `${url.origin}/robots.txt`;
  try {
    const response = await fetch(robotsUrl, {
      redirect: "follow",
      headers: { "user-agent": config.userAgent },
      signal: AbortSignal.timeout(12000)
    });
    if (response.status === 404) {
      return { status: "not-found", robotsUrl };
    }
    if (!response.ok) {
      return { status: "unavailable", robotsUrl, httpStatus: response.status };
    }
    const rules = parseWildcardRobots(await response.text());
    const disallowed = rules.some((rule) =>
      rule !== "" && url.pathname.startsWith(rule)
    );
    return {
      status: disallowed ? "disallowed" : "allowed",
      robotsUrl,
      matchedRule: disallowed
        ? rules.find((rule) => rule !== "" && url.pathname.startsWith(rule))
        : null
    };
  } catch (error) {
    return {
      status: "unavailable",
      robotsUrl,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function assertAllowedSource(source) {
  assertSourceProvenance(source);
  assertAllowedUrl(source.url);
}

function assertAllowedUrl(urlString) {
  const url = new URL(urlString);
  if (url.protocol !== "https:") {
    throw new Error(`Only HTTPS sources are allowed: ${urlString}`);
  }
  if (!config.allowedHosts.includes(url.hostname)) {
    throw new Error(`Host is not allowlisted: ${url.hostname}`);
  }
}

async function writeManifest(items) {
  const merged = requestedId
    ? configuredSources
        .map((source) => items.find((item) => item.id === source.id) ?? previousById.get(source.id))
        .filter(Boolean)
    : items;
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    configPath: path.relative(corpusRoot, configPath),
    force,
    results: merged
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
