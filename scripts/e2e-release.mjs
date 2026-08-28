import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = process.cwd();
const configuredBaseUrl = process.env.SEVAPATH_BASE_URL?.trim().replace(/\/$/, "");
const port = Number(process.env.SEVAPATH_E2E_PORT || "3222");
const baseUrl = configuredBaseUrl || `http://127.0.0.1:${port}`;
const screenshotDir = process.env.SEVAPATH_E2E_SCREENSHOT_DIR?.trim();

let server = null;
let browser = null;
const serverOutput = [];

function pass(label) {
  console.log(`PASS: ${label}`);
}

function captureServerOutput(chunk) {
  const value = String(chunk);
  serverOutput.push(value);
  if (serverOutput.length > 80) serverOutput.shift();
}

async function waitForHealth() {
  const deadline = Date.now() + 30_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(2_000)
      });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `SevaPath did not become healthy at ${baseUrl}: ${lastError}\n${serverOutput.join("")}`
  );
}

function startServerIfNeeded() {
  if (configuredBaseUrl) return;
  const nextCli = fileURLToPath(
    new URL("../node_modules/next/dist/bin/next", import.meta.url)
  );
  server = spawn(process.execPath, [nextCli, "start", "-p", String(port)], {
    cwd: repoRoot,
    detached: true,
    env: {
      ...process.env,
      SEVAPATH_RETRIEVAL_ADAPTER: "local",
      ANTHROPIC_API_KEY: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout?.on("data", captureServerOutput);
  server.stderr?.on("data", captureServerOutput);
}

function stopServer() {
  if (!server?.pid) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ESRCH")) throw error;
  }
}

function watchRuntime(page, runtimeProblems) {
  page.on("pageerror", (error) => runtimeProblems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeProblems.push(`console.error: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "unknown error";
    // Next prefetches React Server Component payloads for internal links. A
    // full-page reload intentionally cancels those speculative requests; that
    // is browser housekeeping, not a failed citizen-visible request.
    if (failure === "net::ERR_ABORTED" && request.url().includes("_rsc=")) return;
    runtimeProblems.push(
      `requestfailed: ${request.method()} ${request.url()} (${failure})`
    );
  });
}

async function openHome(page) {
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  await assertText(page.locator("body"), /not an official government service/i);
  await assertText(page.locator("body"), /nothing here is submitted anywhere/i);
}

async function assertText(locator, expected) {
  const value = await locator.innerText();
  assert.match(value, expected);
}

async function fillExample(page) {
  await page.getByRole("button", { name: /fill in the example answers/i }).click();
  await assertEnabled(
    page.getByRole("button", { name: /read the records and run the checks/i })
  );
}

async function runChecks(page) {
  await page
    .getByRole("button", { name: /read the records and run the checks/i })
    .click();
  await page.locator("#result").waitFor();
}

async function assertEnabled(locator) {
  assert.equal(await locator.isEnabled(), true);
}

async function assertDisabled(locator) {
  assert.equal(await locator.isDisabled(), true);
}

async function testSupportedJourney(page) {
  await openHome(page);
  await fillExample(page);
  await page.getByRole("radio", { name: "All records agree" }).check();
  await runChecks(page);

  await assertText(page.locator("#result"), /Ready to prepare/i);
  await assertText(page.locator("#result"), /Form 12 to the Pension Disbursing Authority/i);
  await assertText(page.locator("#checklist"), /Form 12, filled in and signed/i);
  await assertText(page.locator("#summary"), /preparation worksheet \(demonstration\)/i);
  await assertText(page.locator("#summary"), /It has not been submitted/i);

  const submit = page.getByRole("button", { name: /run the demonstration submission/i });
  await assertEnabled(submit);
  await submit.click();
  const receipt = page.locator(".receipt");
  await receipt.waitFor();
  await assertText(receipt, /Demonstration receipt — no claim has been submitted/i);
  await assertText(receipt, /DEMO-NOT-A-REAL-RECEIPT/i);
  await assertText(receipt, /not valid anywhere/i);
  pass("Journey A — supported Form 12 path and mock receipt");
}

async function testNameMismatch(page) {
  await page.reload({ waitUntil: "networkidle" });
  await fillExample(page);
  await page.getByRole("radio", { name: /name spelling differs/i }).check();
  await runChecks(page);

  await assertText(page.locator("#result"), /Review required/i);
  await assertText(page.locator("#result"), /Meera Sharma/i);
  await assertText(page.locator("#result"), /Meera R\. Sharma/i);
  await assertText(page.locator("#result"), /does not decide whether they are the same person/i);

  const acknowledgement = page.getByRole("checkbox", {
    name: /a person at the counter must review/i
  });
  const submit = page.getByRole("button", { name: /run the demonstration submission/i });
  await assertDisabled(submit);
  await acknowledgement.check();
  await assertEnabled(submit);
  await submit.click();
  await page.locator(".receipt").waitFor();
  await assertText(page.locator(".receipt"), /Unresolved: Claimant's name/i);
  pass("Journey B — name mismatch, human review and acknowledgement gate");
}

async function testMissingDeathDate(page) {
  await page.reload({ waitUntil: "networkidle" });
  await fillExample(page);
  await page.getByRole("radio", { name: /date of death not readable/i }).check();
  await runChecks(page);

  await assertText(page.locator("#result"), /Blocked — information missing/i);
  await assertText(page.locator("#result"), /Get a legible copy/i);
  assert.equal(await page.locator("#summary pre").count(), 0);
  assert.equal(
    await page.getByRole("button", { name: /run the demonstration submission/i }).count(),
    0
  );
  pass("Journey C — unreadable death date blocks the worksheet and receipt");
}

async function testAlreadyPaid(page) {
  await page.reload({ waitUntil: "networkidle" });
  await fillExample(page);
  const group = page.getByRole("group", { name: /already started being paid/i });
  await group.getByRole("radio", { name: "Yes" }).check();
  await runChecks(page);

  await assertText(page.locator("#result"), /Family pension has already started/i);
  await assertText(page.locator("#result"), /missing or wrong/i);
  await assertText(page.locator("#result"), /pension disbursing bank branch/i);
  assert.equal(await page.locator(".record").count(), 0);
  pass("Journey D — already-paid case exits with useful bank guidance");
}

async function testForm10Route(page) {
  await page.reload({ waitUntil: "networkidle" });
  await fillExample(page);
  const group = page.getByRole("group", {
    name: /name already written in their Pension Payment Order/i
  });
  await group.getByRole("radio", { name: "No" }).check();
  await page.getByRole("radio", { name: "All records agree" }).check();
  await runChecks(page);

  await assertText(page.locator("#result"), /Form 10 to the Head of Office/i);
  const checklist = page.locator("#checklist");
  await assertText(checklist, /Form 10, filled in and signed/i);
  assert.doesNotMatch(await checklist.innerText(), /Form 12/i);
  const worksheet = page.locator("#summary pre");
  await assertText(worksheet, /Download Form 10, Form 4 and Format 9/i);
  assert.doesNotMatch(await worksheet.innerText(), /Form 12/i);
  pass("Journey E — not named in PPO uses Form 10 and Head of Office only");
}

async function ask(page, question, outcome, answerPattern, expectsCitations) {
  const input = page.getByRole("textbox", { name: /ask a question about this journey/i });
  await input.fill(question);
  await page.getByRole("button", { name: /^Ask$/ }).click();
  const answer = page.locator(`.answer [data-outcome="${outcome}"]`);
  await answer.waitFor();
  await assertText(answer, answerPattern);
  const citations = answer.locator(".citation-list a");
  if (expectsCitations) {
    assert.ok((await citations.count()) > 0, `${question} should have citations`);
    for (const link of await citations.all()) {
      assert.match((await link.getAttribute("href")) || "", /^https:\/\//);
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.match((await link.getAttribute("rel")) || "", /noopener/);
    }
  } else {
    assert.equal(await citations.count(), 0);
  }
}

async function testKnowledgeAssistant(page) {
  await page.reload({ waitUntil: "networkidle" });
  const cases = [
    ["Which form applies if my name is in the PPO?", "answered", /Form 12/i, true],
    ["What documents must I submit with Form 12?", "answered", /death certificate/i, true],
    ["What should I do about a name mismatch?", "answered", /human review|resolve/i, true],
    ["Can SevaPath determine my eligibility?", "out_of_scope", /does not decide eligibility/i, false],
    ["Can SevaPath calculate my pension?", "out_of_scope", /does not calculate/i, false],
    ["Is Form 14 still current?", "answered", /Archives|archived/i, true],
    [
      "What is the current dearness relief rate?",
      "insufficient_evidence",
      /could not verify this from the current official corpus/i,
      false
    ]
  ];

  for (const [question, outcome, pattern, citations] of cases) {
    await ask(page, question, outcome, pattern, citations);
  }
  pass("Journey F — grounded guidance, citations, refusals and missing evidence");
}

async function testSourcePage(page) {
  const response = await page.goto(`${baseUrl}/sources`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  await assertText(page.locator("main"), /11 documents/i);
  await assertText(page.locator("main"), /Form 14/i);
  const externalLinks = page.locator('main a[href^="https://"]');
  assert.ok((await externalLinks.count()) >= 11);
  for (const link of await externalLinks.all()) {
    assert.equal(await link.getAttribute("target"), "_blank");
    assert.match((await link.getAttribute("rel")) || "", /noopener/);
  }
  pass("Sources page — official links and safe external-link attributes");
}

async function testMobileAndTouchTargets() {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  const runtimeProblems = [];
  watchRuntime(page, runtimeProblems);
  await openHome(page);
  await fillExample(page);
  await page.getByRole("radio", { name: "All records agree" }).check();
  await runChecks(page);

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  assert.ok(
    dimensions.scrollWidth <= dimensions.innerWidth,
    `mobile overflow: ${JSON.stringify(dimensions)}`
  );

  const targetHeights = await page
    .locator("button:visible, label.choice:visible, .review-acknowledgement:visible")
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  assert.ok(targetHeights.length > 0);
  assert.ok(targetHeights.every((height) => height >= 43.5));
  if (screenshotDir) {
    await page.screenshot({ path: `${screenshotDir}/sevapath-mobile.png`, fullPage: true });
  }
  assert.deepEqual(runtimeProblems, []);
  await context.close();
  pass("360px mobile layout — no overflow, usable touch targets, no runtime errors");
}

async function testKeyboardNavigation() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const runtimeProblems = [];
  watchRuntime(page, runtimeProblems);
  await openHome(page);

  await page.keyboard.press("Tab");
  const active = page.locator(":focus");
  await assertText(active, /Skip to main content/i);
  const focusStyle = await active.evaluate((node) => {
    const style = getComputedStyle(node);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  assert.notEqual(focusStyle.outlineStyle, "none");
  assert.equal(focusStyle.outlineWidth, "3px");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => location.hash), "#main");

  const example = page.getByRole("button", { name: /fill in the example answers/i });
  await example.focus();
  await page.keyboard.press("Enter");
  const run = page.getByRole("button", { name: /read the records and run the checks/i });
  await assertEnabled(run);
  await run.focus();
  await page.keyboard.press("Enter");
  await page.locator("#result").waitFor();
  assert.deepEqual(runtimeProblems, []);
  await context.close();
  pass("Keyboard navigation — skip link, visible focus and keyboard activation");
}

async function main() {
  startServerIfNeeded();
  await waitForHealth();
  browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const runtimeProblems = [];
  watchRuntime(page, runtimeProblems);

  await testSupportedJourney(page);
  await testNameMismatch(page);
  await testMissingDeathDate(page);
  await testAlreadyPaid(page);
  await testForm10Route(page);
  await testKnowledgeAssistant(page);
  await testSourcePage(page);
  assert.deepEqual(runtimeProblems, []);
  await context.close();

  await testMobileAndTouchTargets();
  await testKeyboardNavigation();
  pass(`Production-browser release suite (${baseUrl})`);
}

try {
  await main();
} finally {
  await browser?.close();
  stopServer();
}
