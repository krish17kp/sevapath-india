"use client";

import { useCallback, useId, useRef, useState } from "react";
import type { ScopeAnswers } from "@/lib/domain/types";
import type { FullAssessment } from "@/lib/domain/assessment";
import type { ClaimSummary } from "@/lib/domain/summary";
import type { MockReceipt } from "@/lib/domain/submission";
import { SCOPE_QUESTIONS } from "@/lib/domain/validation/routing";
import { StateBadge } from "./StateBadge";
import { RecordCard } from "./RecordCard";
import { CheckResults } from "./CheckList";
import { GuidancePanel } from "./GuidancePanel";
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconExternal,
  IconQuestion
} from "./Icons";

interface SyntheticCaseSummary {
  id: string;
  label: string;
  description: string;
}

interface AssessResponse {
  assessment: FullAssessment;
  summary: ClaimSummary;
  summaryText: string;
  retrieval: { adapter: string; available: boolean; detail: string };
}

type SubmitResponse =
  | { accepted: true; receipt: MockReceipt; state: string }
  | { accepted: false; reason: string; guidance: string; state: string };

const EMPTY_SCOPE: ScopeAnswers = {
  isSurvivingSpouse: null,
  isCentralCivilPension: null,
  isNamedInPpo: null,
  familyPensionAlreadyStarted: null
};

/** The scope answers that describe the journey SevaPath walks through. */
const IN_SCOPE_ANSWERS: ScopeAnswers = {
  isSurvivingSpouse: true,
  isCentralCivilPension: true,
  isNamedInPpo: true,
  familyPensionAlreadyStarted: false
};

/** The five stages a citizen moves through, shown as a progress rail. */
const STAGES = ["Your situation", "Records", "Checks", "Your route", "Prepare"];

/**
 * How the two routes are presented, and where a citizen can read the original.
 *
 * Nothing here is inferred: the rule references are the same ones the
 * deterministic checklist already cites, and the links are the official
 * documents recorded in the source manifest.
 */
const RULE_URL =
  "https://pensionersportal.gov.in/Document/CCS-Pension-Rules%202021-English.pdf";

const ROUTE_BASIS = {
  form12_pda: {
    form: "Form 12",
    rule: "Rule 79(2)(a)(ii)",
    formUrl: "https://pensionersportal.gov.in/Forms/pension_new_forms/Form12.pdf",
    other:
      "If your name were not in the Pension Payment Order, the route would instead be Form 10 to the Head of Office."
  },
  form10_hoo: {
    form: "Form 10",
    rule: "Rule 79(2)(b)(i)",
    formUrl: "https://pensionersportal.gov.in/Forms/pension_new_forms/Form10.pdf",
    other:
      "If your name were already in the Pension Payment Order, the route would instead be Form 12 to the Pension Disbursing Authority."
  }
} as const;

/** Cards are shown clearest-first; the stored default still comes from props. */
const CASE_ORDER = ["matched", "name_variation", "missing_death_date"];

const CASE_TONE: Record<string, { tone: string; blurb: string }> = {
  matched: {
    tone: "ok",
    blurb: "Best path for understanding the normal journey."
  },
  name_variation: {
    tone: "review",
    blurb: "Shows how SevaPath handles uncertainty safely."
  },
  missing_death_date: {
    tone: "blocked",
    blurb: "Shows how SevaPath identifies what needs attention."
  }
};

export function JourneyClient({ cases }: { cases: SyntheticCaseSummary[] }) {
  const [scope, setScope] = useState<ScopeAnswers>(EMPTY_SCOPE);
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "name_variation");
  const [result, setResult] = useState<AssessResponse | null>(null);
  const [submitted, setSubmitted] = useState<SubmitResponse | null>(null);
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Identifies the run whose answer the page is currently allowed to show.
   *
   * Changing an answer or the record set clears the result and invalidates the
   * run in flight. Without this, a slow response from the previous run lands
   * after the clear and repaints the page with the *old* case's findings while
   * the citizen's current selection shows underneath it — a wrong answer for
   * the inputs on screen, not merely a stale one.
   */
  const runId = useRef(0);

  const invalidateRun = useCallback(() => {
    runId.current += 1;
    setResult(null);
    setSubmitted(null);
    setReviewAcknowledged(false);
    // The abandoned request will be discarded when it lands, so nothing is
    // waiting on it any more. Without this the run button could stay disabled.
    setPending(false);
  }, []);

  const allAnswered = Object.values(scope).every((value) => value !== null);

  const runAssessment = useCallback(
    async (nextScope: ScopeAnswers, nextCaseId: string) => {
      runId.current += 1;
      const thisRun = runId.current;
      setPending(true);
      setError(null);
      setSubmitted(null);
      setReviewAcknowledged(false);
      try {
        const response = await fetch("/api/assess", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scope: nextScope, caseId: nextCaseId })
        });
        if (!response.ok) {
          throw new Error(`The service replied ${response.status}.`);
        }
        const payload = (await response.json()) as AssessResponse;
        if (runId.current !== thisRun) return;
        setResult(payload);
      } catch (caught) {
        if (runId.current !== thisRun) return;
        setResult(null);
        setError(
          caught instanceof Error
            ? `Could not run the checks: ${caught.message}`
            : "Could not run the checks."
        );
      } finally {
        if (runId.current === thisRun) setPending(false);
      }
    },
    []
  );

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, caseId })
      });
      if (!response.ok) {
        throw new Error(`The service replied ${response.status}.`);
      }
      setSubmitted((await response.json()) as SubmitResponse);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Could not run the demonstration submission: ${caught.message}`
          : "Could not run the demonstration submission."
      );
    } finally {
      setPending(false);
    }
  }

  function startAgain() {
    setScope(EMPTY_SCOPE);
    setCaseId(cases[0]?.id ?? "name_variation");
    invalidateRun();
    document.getElementById("scope")?.scrollIntoView({ block: "start" });
  }

  const unsupported = result?.assessment.state === "unsupported_scenario";

  // How far along the rail the citizen is. Purely presentational.
  let completedStages = 0;
  if (allAnswered) completedStages = 1;
  if (result) completedStages = unsupported ? 3 : 4;
  if (submitted) completedStages = 5;

  return (
    <>
      <ProgressRail completed={completedStages} />

      <ScopeStep
        scope={scope}
        pending={pending}
        onChange={(key, value) => {
          setScope((current) => ({ ...current, [key]: value }));
          invalidateRun();
        }}
        onUseExample={() => {
          setScope(IN_SCOPE_ANSWERS);
          invalidateRun();
        }}
      />

      <RecordsStep
        cases={cases}
        caseId={caseId}
        onCaseChange={(next) => {
          setCaseId(next);
          invalidateRun();
        }}
        canRun={allAnswered && !pending}
        pending={pending}
        onRun={() => void runAssessment(scope, caseId)}
        result={result}
      />

      {error ? (
        <section className="card">
          <div className="notice notice-stop" role="alert">
            <h3>Something went wrong</h3>
            <p style={{ marginBottom: 0 }}>{error}</p>
          </div>
        </section>
      ) : null}

      {result ? (
        <ResultSteps
          result={result}
          pending={pending}
          submitted={submitted}
          reviewAcknowledged={reviewAcknowledged}
          onReviewAcknowledged={setReviewAcknowledged}
          onSubmit={() => void submit()}
          onStartAgain={startAgain}
        />
      ) : null}

      <section className="card" id="guidance">
        <h2>Questions people commonly have</h2>
        <p className="lede">
          Answers come only from the official documents SevaPath has collected,
          and every answer shows the rule, form or page it came from.
        </p>
        <GuidancePanel />
      </section>
    </>
  );
}

function ProgressRail({ completed }: { completed: number }) {
  const current = Math.min(completed, STAGES.length - 1);
  const percent = Math.round((completed / STAGES.length) * 100);

  return (
    <>
      {/* A narrow screen gets the compact form; the full rail needs real width. */}
      <p className="progress-compact">
        <span className="label">
          Step {current + 1} of {STAGES.length} · {STAGES[current]}
        </span>
        <span className="track" aria-hidden="true">
          <span className="fill" style={{ width: `${percent}%` }} />
        </span>
      </p>

      <ol className="progress-rail" aria-label="Your progress through the journey">
      {STAGES.map((stage, index) => {
        const state =
          index < completed ? "done" : index === completed ? "current" : "todo";
        return (
          <li
            key={stage}
            data-state={state}
            {...(state === "current" ? { "aria-current": "step" as const } : {})}
          >
            <span className="pip" aria-hidden="true">
              {state === "done" ? <IconCheck size={12} /> : index + 1}
            </span>
            <span>
              {stage}
              {state === "done" ? (
                <span className="visually-hidden"> — done</span>
              ) : null}
            </span>
          </li>
        );
      })}
      </ol>
    </>
  );
}

function ScopeStep({
  scope,
  pending,
  onChange,
  onUseExample
}: {
  scope: ScopeAnswers;
  pending: boolean;
  onChange: (key: keyof ScopeAnswers, value: boolean) => void;
  onUseExample: () => void;
}) {
  return (
    <section className="card" id="scope">
      <div className="step-heading">
        <span className="step-number" aria-hidden="true">
          1
        </span>
        <h2>Your situation</h2>
      </div>
      <p className="lede">
        SevaPath walks through one journey only: a surviving spouse, already
        named in a Central Civil Pension Payment Order, starting family pension
        after the pensioner has died.
      </p>

      {SCOPE_QUESTIONS.map((item) => (
        <fieldset className="scope-question" key={item.key}>
          <legend>{item.question}</legend>
          <p className="help">{item.help}</p>
          <div className="choice-row">
            {[
              { label: "Yes", value: true },
              { label: "No", value: false }
            ].map((option) => (
              <label className="choice" key={`${item.key}-${option.label}`}>
                <input
                  type="radio"
                  name={item.key}
                  value={option.label}
                  checked={scope[item.key] === option.value}
                  disabled={pending}
                  onChange={() => onChange(item.key, option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="button-row" style={{ marginTop: "1.15rem" }}>
        <button type="button" onClick={onUseExample}>
          Fill in the example answers
        </button>
      </div>
      <p className="muted" style={{ marginTop: "0.7rem", marginBottom: 0 }}>
        The example answers describe the journey this prototype demonstrates.
        Answer differently to see how SevaPath declines a case it has not
        verified.
      </p>
    </section>
  );
}

function RecordsStep({
  cases,
  caseId,
  onCaseChange,
  canRun,
  pending,
  onRun,
  result
}: {
  cases: SyntheticCaseSummary[];
  caseId: string;
  onCaseChange: (id: string) => void;
  canRun: boolean;
  pending: boolean;
  onRun: () => void;
  result: AssessResponse | null;
}) {
  const groupId = useId();
  const ordered = [...cases].sort(
    (left, right) => CASE_ORDER.indexOf(left.id) - CASE_ORDER.indexOf(right.id)
  );

  return (
    <section className="card" id="records">
      <div className="step-heading">
        <span className="step-number" aria-hidden="true">
          2
        </span>
        <h2>Choose an example case</h2>
      </div>
      <p className="lede">
        SevaPath has three built-in sets of records: a Pension Payment Order, a
        death certificate, and a bank account proof. They are invented for this
        demonstration. There is no upload, and SevaPath never asks you for a
        real document or a real number.
      </p>

      <fieldset>
        <legend id={groupId} className="visually-hidden">
          Choose an example case
        </legend>
        <div className="case-grid" role="radiogroup" aria-labelledby={groupId}>
          {ordered.map((item) => (
            <CaseCard
              key={item.id}
              item={item}
              selected={caseId === item.id}
              disabled={pending}
              onSelect={() => onCaseChange(item.id)}
            />
          ))}
        </div>
      </fieldset>

      <div className="button-row" style={{ marginTop: "1.25rem" }}>
        <button
          type="button"
          className="button-primary button-lg"
          disabled={!canRun}
          onClick={onRun}
        >
          {pending ? "Checking…" : "Read the records and run the checks"}
          {pending ? null : <IconArrowRight size={17} />}
        </button>
      </div>
      {!canRun && !pending ? (
        <p className="muted" style={{ marginTop: "0.7rem", marginBottom: 0 }}>
          Answer all four questions in step 1 first.
        </p>
      ) : null}

      {result && result.assessment.state !== "unsupported_scenario" ? (
        <div className="reveal" style={{ marginTop: "1.75rem" }}>
          <h3>Information we found in the records</h3>
          <p className="muted" style={{ marginTop: "-0.3rem" }}>
            Highlighted lines are the ones SevaPath compares across records.
          </p>
          {result.assessment.extraction.notice ? (
            <div className="notice notice-info">
              <h3>How these were read</h3>
              <p style={{ marginBottom: 0 }}>
                {result.assessment.extraction.notice}
              </p>
            </div>
          ) : null}
          <div className="record-grid">
            {result.assessment.extraction.records.map((record) => (
              <RecordCard key={record.kind} record={record} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CaseCard({
  item,
  selected,
  disabled,
  onSelect
}: {
  item: SyntheticCaseSummary;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const id = useId();
  const tone = CASE_TONE[item.id] ?? { tone: "neutral", blurb: "" };
  const Glyph =
    tone.tone === "ok" ? IconCheck : tone.tone === "review" ? IconAlert : IconQuestion;

  return (
    <label className="case-card" data-tone={tone.tone}>
      {/* The radio is named by the case title alone, so assistive technology
          announces the choice before the explanation. */}
      <input
        type="radio"
        name="synthetic-case"
        value={item.id}
        checked={selected}
        disabled={disabled}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-note`}
        onChange={onSelect}
      />
      <span className="case-icon" aria-hidden="true">
        <Glyph size={19} />
      </span>
      <span className="case-title" id={`${id}-title`}>
        {item.label}
      </span>
      <span className="case-note" id={`${id}-note`}>
        {tone.blurb ? `${tone.blurb} ` : ""}
        {item.description}
      </span>
      <span className="case-use" aria-hidden="true">
        Use this example
      </span>
    </label>
  );
}

function ResultSteps({
  result,
  pending,
  submitted,
  reviewAcknowledged,
  onReviewAcknowledged,
  onSubmit,
  onStartAgain
}: {
  result: AssessResponse;
  pending: boolean;
  submitted: SubmitResponse | null;
  reviewAcknowledged: boolean;
  onReviewAcknowledged: (value: boolean) => void;
  onSubmit: () => void;
  onStartAgain: () => void;
}) {
  const { assessment, summaryText } = result;
  const unsupported = assessment.state === "unsupported_scenario";
  const blocked = assessment.state === "blocked_missing_information";
  // A claim SevaPath judged unpreparable is not offered a worksheet or a
  // submission button. The server refuses both as well, but the interface
  // should not invite an action it knows will be declined.
  const canPrepare = !unsupported && !blocked;
  const showChecklist = canPrepare && assessment.checklist.length > 0;

  return (
    <>
      <div id="result" className="reveal">
        {unsupported ? (
          <section className="card">
            <div className="step-heading">
              <span className="step-number" aria-hidden="true">
                3
              </span>
              <h2>SevaPath cannot guide this case</h2>
            </div>
            <p>
              <StateBadge state={assessment.state} />
            </p>
            <div className="notice notice-stop">
              <h3>{assessment.route.label}</h3>
              <p>{assessment.route.referral}</p>
              <p style={{ marginBottom: 0 }}>
                SevaPath does not guess at journeys it has not verified against
                official sources.
              </p>
            </div>
            {assessment.stateReasons.map((reason, index) => (
              <p className="muted" key={index} style={{ marginBottom: 0 }}>
                {reason}
              </p>
            ))}
          </section>
        ) : (
          <>
            <section className="card">
              <div className="step-heading">
                <span className="step-number" aria-hidden="true">
                  3
                </span>
                <h2>What the checks found</h2>
              </div>

              <p>
                <StateBadge state={assessment.state} />
              </p>

              {assessment.stateReasons.map((reason, index) => (
                <p key={index}>{reason}</p>
              ))}

              {assessment.systemStates.includes("retrieval_unavailable") ? (
                <div className="notice notice-info">
                  <h3>Guidance panel unavailable</h3>
                  <p style={{ marginBottom: 0 }}>
                    SevaPath could not reach its guidance corpus. The checks on
                    this page do not use it and are unaffected.
                  </p>
                </div>
              ) : null}

              <CheckResults checks={assessment.checks} />
            </section>

            <RouteCard assessment={assessment} />
          </>
        )}
      </div>

      {showChecklist ? (
        <PrepareStep assessment={assessment} stepNumber={5} />
      ) : null}

      {blocked ? (
        <section className="card" id="summary">
          <div className="step-heading">
            <span className="step-number" aria-hidden="true">
              5
            </span>
            <h2>Preparation is on hold</h2>
          </div>
          <div className="notice notice-stop">
            <h3>Not ready to prepare yet</h3>
            <p>
              SevaPath will not write a worksheet with a gap where a required
              value should be, and it will not run the demonstration submission
              for a claim it could not read.
            </p>
            <p style={{ marginBottom: 0 }}>
              Get a legible copy of the record named in the checks above, then
              run the checks again.
            </p>
          </div>
        </section>
      ) : null}

      {canPrepare ? (
        <section className="card" id="summary">
          <h2>Your preparation summary</h2>
          <p className="lede">
            Print this or copy it out. It is a worksheet to take to the counter,
            not a form and not an application.
          </p>

          <dl className="prep-summary">
            <div className="prep-stat">
              <dt>Route</dt>
              <dd>{routeShortName(assessment.route.route)}</dd>
            </div>
            <div className="prep-stat">
              <dt>Destination</dt>
              <dd>{assessment.route.recipient}</dd>
            </div>
            <div className="prep-stat">
              <dt>Checks passed</dt>
              <dd>
                {assessment.checks.filter((check) => check.status === "pass").length} of{" "}
                {assessment.checks.length}
              </dd>
            </div>
            <div className="prep-stat">
              <dt>Human review</dt>
              <dd>
                {assessment.checks.some((check) => check.status === "review")
                  ? "Needed before submitting"
                  : "Not needed"}
              </dd>
            </div>
          </dl>

          <div className="summary-block">
            <pre>{summaryText}</pre>
          </div>

          <h3 style={{ marginTop: "1.75rem" }}>Demonstration submission</h3>
          <div className="notice notice-warn">
            <p style={{ marginBottom: 0 }}>
              The button below runs a <strong>demonstration only</strong>.
              Nothing is sent to the Pensioners&rsquo; Portal, to a bank, or to
              any government system. The receipt it produces is not valid
              anywhere.
            </p>
          </div>
          {assessment.state === "review_required" ? (
            <label className="review-acknowledgement">
              <input
                type="checkbox"
                checked={reviewAcknowledged}
                onChange={(event) => onReviewAcknowledged(event.target.checked)}
              />
              <span>
                I understand that a person at the counter must review the
                differences listed above before accepting a real claim.
              </span>
            </label>
          ) : null}
          <div className="button-row">
            <button
              type="button"
              className="button-primary"
              disabled={
                pending ||
                (assessment.state === "review_required" && !reviewAcknowledged)
              }
              onClick={onSubmit}
            >
              {pending ? "Working…" : "Run the demonstration submission"}
            </button>
          </div>

          <div aria-live="polite">
            {submitted ? (
              <SubmissionResult submitted={submitted} onStartAgain={onStartAgain} />
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}

function routeShortName(route: string): string {
  if (route === "form10_hoo") return ROUTE_BASIS.form10_hoo.form;
  if (route === "form12_pda") return ROUTE_BASIS.form12_pda.form;
  return "Not decided";
}

function RouteCard({ assessment }: { assessment: FullAssessment }) {
  const basis =
    assessment.route.route === "form10_hoo"
      ? ROUTE_BASIS.form10_hoo
      : ROUTE_BASIS.form12_pda;

  return (
    <section className="card">
      <div className="step-heading">
        <span className="step-number" aria-hidden="true">
          4
        </span>
        <h2>Your route</h2>
      </div>

      {assessment.state === "blocked_missing_information" ? (
        <div className="notice notice-stop">
          <h3>Preparation is on hold</h3>
          <p style={{ marginBottom: 0 }}>
            The route below is the one the rules point to for the situation you
            described, but a required detail could not be read from the records,
            so SevaPath will not prepare the claim yet.
          </p>
        </div>
      ) : null}

      <div className="route-hero">
        <span className="eyebrow">Your likely process</span>
        <p className="route-form">{basis.form}</p>
        <p className="route-full">{assessment.route.label}</p>

        <dl className="route-facts">
          <div className="route-fact">
            <dt>Submit to</dt>
            <dd>{assessment.route.recipient}</dd>
          </div>
          <div className="route-fact">
            <dt>Official basis</dt>
            <dd>
              Central Civil Services (Pension) Rules, 2021 — {basis.rule}
            </dd>
          </div>
        </dl>

        <div className="route-why">
          <h3>Why this route</h3>
          <ul>
            {assessment.route.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <div className="route-basis">
          <a
            className="button"
            href={basis.formUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get {basis.form}
            <IconExternal size={14} />
          </a>
          <a
            className="button"
            href={RULE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            View official source
            <IconExternal size={14} />
          </a>
        </div>
      </div>

      <p className="route-alt">
        <strong>The other route:</strong>
        <span>{basis.other}</span>
      </p>

      <p className="muted" style={{ marginTop: "0.9rem", marginBottom: 0 }}>
        SevaPath picked this with fixed verified rules, not a language model. It
        has not decided your eligibility — the department does that.
      </p>
    </section>
  );
}

/**
 * The preparation checklist, split into what to bring, what is already
 * confirmed, and what a person has to settle first.
 *
 * Every item is the validated checklist data; nothing is invented here. The
 * grouping is the only thing this component adds.
 */
function PrepareStep({
  assessment,
  stepNumber
}: {
  assessment: FullAssessment;
  stepNumber: number;
}) {
  const bring = assessment.checklist.filter((item) => !item.satisfied);
  const confirmed = assessment.checklist.filter((item) => item.satisfied);
  const resolve = assessment.checks.filter((check) => check.status === "review");
  const routeName = assessment.route.route === "form10_hoo" ? "Form 10" : "Form 12";

  return (
    <section className="card" id="checklist">
      <div className="step-heading">
        <span className="step-number" aria-hidden="true">
          {stepNumber}
        </span>
        <h2>What to gather for {routeName}</h2>
      </div>
      <p className="lede">
        Before you visit {lowerFirst(assessment.route.recipient)}.
      </p>

      <div className="prep-group prep-bring">
        <div className="prep-head">
          <h3>Bring</h3>
          <span className="prep-count">{bring.length} to prepare</span>
        </div>
        <ul className="checklist">
          {bring.map((item) => (
            <li key={item.id}>
              <span className="mark" aria-hidden="true" />
              <span className="item-body">
                <span className="item-label">
                  <span className="visually-hidden">Still to gather: </span>
                  {item.label}
                </span>
                <span className="item-detail">{item.detail}</span>
                <span className="item-ref">Source: {item.reference}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {confirmed.length > 0 ? (
        <div className="prep-group prep-check">
          <div className="prep-head">
            <h3>Check</h3>
            <span className="prep-count">
              {confirmed.length} found in the records
            </span>
          </div>
          <ul className="checklist">
            {confirmed.map((item) => (
              <li key={item.id}>
                <span className="mark mark-done" aria-hidden="true">
                  <IconCheck size={13} />
                </span>
                <span className="item-body">
                  <span className="item-label">
                    <span className="visually-hidden">Already confirmed: </span>
                    {item.label}
                  </span>
                  <span className="item-detail">{item.detail}</span>
                  <span className="item-ref">Source: {item.reference}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {resolve.length > 0 ? (
        <div className="prep-group prep-resolve">
          <div className="prep-head">
            <h3>Resolve before visiting</h3>
            <span className="prep-count">{resolve.length} needs a person</span>
          </div>
          <ul className="checklist">
            {resolve.map((check) => (
              <li key={check.id}>
                <span className="mark mark-review" aria-hidden="true">
                  <IconAlert size={12} />
                </span>
                <span className="item-body">
                  <span className="item-label">{check.label}</span>
                  <span className="item-detail">
                    A person at the counter has to settle this. SevaPath has not
                    changed any record.
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function SubmissionResult({
  submitted,
  onStartAgain
}: {
  submitted: SubmitResponse;
  onStartAgain: () => void;
}) {
  if (!submitted.accepted) {
    return (
      <div className="notice notice-stop" style={{ marginTop: "1rem" }}>
        <h3>Not prepared</h3>
        <p>{submitted.reason}</p>
        <p style={{ marginBottom: 0 }}>{submitted.guidance}</p>
      </div>
    );
  }

  const { receipt } = submitted;
  return (
    <div className="receipt reveal" style={{ marginTop: "1.25rem" }}>
      <p className="receipt-stamp">Demonstration receipt</p>
      <h3>{receipt.heading}</h3>
      <p className="reference">{receipt.reference}</p>
      <p className="muted">Produced {receipt.issuedAt}</p>

      <ul className="receipt-statements">
        {receipt.statements.map((statement) => (
          <li key={statement}>{statement}</li>
        ))}
      </ul>

      <div className="two-column">
        <div className="ledger">
          <h3>Confirmed from your records</h3>
          {receipt.received.length > 0 ? (
            <ul>
              {receipt.received.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing could be confirmed from the records.</p>
          )}
        </div>
        <div className="ledger">
          <h3>Still outstanding</h3>
          {receipt.outstanding.length > 0 ? (
            <ul>
              {receipt.outstanding.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing outstanding.</p>
          )}
        </div>
      </div>

      <h3 style={{ marginTop: "1.25rem" }}>
        What would happen next in the real process
      </h3>
      <ol>
        {receipt.whatHappensNext.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="button-row" style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onStartAgain}>
          Start another example
        </button>
      </div>
    </div>
  );
}
