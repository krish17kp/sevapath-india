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

/**
 * Assigns step numbers to the cards that actually render.
 *
 * Several cards are conditional — an unsupported scope has neither checklist
 * nor worksheet, and a blocked claim has no checklist — so hardcoded numerals
 * produced sequences like 1, 2, 3, 4, 7. The numbers are decorative
 * (`aria-hidden`), but telling a citizen to follow a "step 5" that is not on
 * the page is still a usability failure.
 */
function resultStepNumbers(assessment: FullAssessment) {
  const unsupported = assessment.state === "unsupported_scenario";
  const blocked = assessment.state === "blocked_missing_information";
  const canPrepare = !unsupported && !blocked;

  let next = 4;
  const findings = next++;
  const checklist = canPrepare && assessment.checklist.length > 0 ? next++ : null;
  const worksheet = canPrepare || blocked ? next++ : null;
  return { findings, checklist, worksheet, guidance: next };
}

type ResultStepNumbers = ReturnType<typeof resultStepNumbers>;

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

  const steps = result ? resultStepNumbers(result.assessment) : null;

  return (
    <>
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

      <ExplainerStep />

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
            <p>{error}</p>
          </div>
        </section>
      ) : null}

      {result ? (
        <ResultSteps
          result={result}
          steps={steps!}
          pending={pending}
          submitted={submitted}
          reviewAcknowledged={reviewAcknowledged}
          onReviewAcknowledged={setReviewAcknowledged}
          onSubmit={() => void submit()}
        />
      ) : null}

      <section className="card" id="guidance">
        <div className="step-heading">
          <span className="step-number" aria-hidden="true">
            {steps ? steps.guidance : 4}
          </span>
          <h2>Ask about this journey</h2>
        </div>
        <p className="lede">
          Answers are drawn only from the official documents SevaPath has
          collected, and every answer shows the rule, form or page it came from.
        </p>
        <GuidancePanel />
      </section>
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
        <h2>Is this the right walkthrough for you?</h2>
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

      <div className="button-row" style={{ marginTop: "1rem" }}>
        <button type="button" onClick={onUseExample}>
          Fill in the example answers
        </button>
      </div>
      <p className="muted" style={{ marginTop: "0.6rem" }}>
        The example answers describe the journey this prototype demonstrates.
        Answer differently to see how SevaPath declines a case it has not
        verified.
      </p>
    </section>
  );
}

function ExplainerStep() {
  return (
    <section className="card" id="explainer">
      <div className="step-heading">
        <span className="step-number" aria-hidden="true">
          2
        </span>
        <h2>What the current journey looks like</h2>
      </div>
      <p>
        When a pensioner dies, family pension does not start on its own. Someone
        has to claim it. If the surviving spouse is already named in the Pension
        Payment Order, the claim goes to the{" "}
        <strong>Pension Disbursing Authority</strong> — in most cases the bank
        branch that was paying the pension — on <strong>Form 12</strong>, with a
        copy of the death certificate and a signed <strong>Format 9</strong>{" "}
        undertaking.
      </p>
      <p>
        The rule gives the Pension Disbursing Authority one month from receiving
        that claim to start paying, and family pension is payable from the day
        after the date of death.
      </p>
      <div className="notice notice-warn">
        <h3>The trap this prototype exists to fix</h3>
        <p>
          The Department&rsquo;s own older FAQ still tells people to use{" "}
          <strong>Form 14</strong>. Form 14 now sits under &ldquo;Archives&rdquo;
          on the Pensioners&rsquo; Portal forms page. Following the FAQ means
          filling in a form that is no longer the current one.
        </p>
        <p style={{ marginBottom: 0 }}>
          SevaPath reads the 2021 Rules and the current forms list, and shows you
          the source for every statement so you can check it yourself.
        </p>
      </div>
      <p className="muted" style={{ marginBottom: 0 }}>
        If your name is not in the Pension Payment Order, the route is Form 10 to
        the Head of Office instead. Answer question 3 with &ldquo;No&rdquo; to
        see that.
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
  const active = cases.find((item) => item.id === caseId);

  return (
    <section className="card" id="records">
      <div className="step-heading">
        <span className="step-number" aria-hidden="true">
          3
        </span>
        <h2>Your three records</h2>
      </div>
      <p className="lede">
        SevaPath has three built-in records: a Pension Payment Order, a death
        certificate, and a bank account proof. They are invented for this
        demonstration. There is no upload, and SevaPath never asks you for a real
        document or a real number.
      </p>

      <fieldset className="scope-question">
        <legend id={groupId}>Choose a demonstration set</legend>
        <div className="choice-row" role="radiogroup" aria-labelledby={groupId}>
          {cases.map((item) => (
            <label className="choice" key={item.id}>
              <input
                type="radio"
                name="synthetic-case"
                value={item.id}
                checked={caseId === item.id}
                disabled={pending}
                onChange={() => onCaseChange(item.id)}
              />
              {item.label}
            </label>
          ))}
        </div>
        {active ? (
          <p className="help" style={{ marginTop: "0.6rem" }}>
            {active.description}
          </p>
        ) : null}
      </fieldset>

      <div className="button-row" style={{ marginTop: "1rem" }}>
        <button type="button" className="button-primary" disabled={!canRun} onClick={onRun}>
          {pending ? "Checking…" : "Read the records and run the checks"}
        </button>
      </div>
      {!canRun && !pending ? (
        <p className="muted" style={{ marginTop: "0.6rem" }}>
          Answer all four questions in step 1 first.
        </p>
      ) : null}

      {result && result.assessment.state !== "unsupported_scenario" ? (
        <>
          <h3 style={{ marginTop: "1.5rem" }}>What SevaPath read</h3>
          {result.assessment.extraction.notice ? (
            <div className="notice notice-info">
              <h3>How these were read</h3>
              <p style={{ marginBottom: 0 }}>{result.assessment.extraction.notice}</p>
            </div>
          ) : null}
          <div className="record-grid">
            {result.assessment.extraction.records.map((record) => (
              <RecordCard key={record.kind} record={record} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ResultSteps({
  result,
  steps,
  pending,
  submitted,
  reviewAcknowledged,
  onReviewAcknowledged,
  onSubmit
}: {
  result: AssessResponse;
  steps: ResultStepNumbers;
  pending: boolean;
  submitted: SubmitResponse | null;
  reviewAcknowledged: boolean;
  onReviewAcknowledged: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const { assessment, summaryText } = result;
  const unsupported = assessment.state === "unsupported_scenario";
  const blocked = assessment.state === "blocked_missing_information";
  // A claim SevaPath judged unpreparable is not offered a worksheet or a
  // submission button. The server refuses both as well, but the interface
  // should not invite an action it knows will be declined.
  const canPrepare = !unsupported && !blocked;

  return (
    <>
      <section className="card" id="result">
        <div className="step-heading">
          <span className="step-number" aria-hidden="true">
            {steps.findings}
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
              SevaPath could not reach its guidance corpus. The checks on this
              page do not use it and are unaffected.
            </p>
          </div>
        ) : null}

        {unsupported ? (
          <div className="notice notice-stop">
            <h3>{assessment.route.label}</h3>
            <p>{assessment.route.referral}</p>
            <p style={{ marginBottom: 0 }}>
              SevaPath does not guess at journeys it has not verified against
              official sources.
            </p>
          </div>
        ) : (
          <>
            <div className="notice notice-ok">
              <h3>Your route: {assessment.route.label}</h3>
              <p>
                <strong>Take your papers to:</strong> {assessment.route.recipient}
              </p>
              <p style={{ marginBottom: "0.35rem" }}>SevaPath chose this because:</p>
              <ul style={{ marginTop: 0, marginBottom: 0 }}>
                {assessment.route.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>

            <h3>Checks</h3>
            <CheckResults checks={assessment.checks} />
          </>
        )}
      </section>

      {canPrepare && assessment.checklist.length > 0 ? (
        <section className="card" id="checklist">
          <div className="step-heading">
            <span className="step-number" aria-hidden="true">
              {steps.checklist}
            </span>
            <h2>
              What to gather for{" "}
              {assessment.route.route === "form10_hoo" ? "Form 10" : "Form 12"}
            </h2>
          </div>
          <ul className="checklist">
            {assessment.checklist.map((item) => (
              <li key={item.id}>
                <span
                  className={`mark ${item.satisfied ? "mark-done" : ""}`}
                  aria-hidden="true"
                >
                  {item.satisfied ? "✓" : ""}
                </span>
                <span className="item-body">
                  <span className="item-label">
                    {item.satisfied ? (
                      <span className="visually-hidden">Already confirmed: </span>
                    ) : (
                      <span className="visually-hidden">Still to gather: </span>
                    )}
                    {item.label}
                  </span>
                  <br />
                  {item.detail}
                  <br />
                  <span className="item-ref">Reference: {item.reference}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {blocked ? (
        <section className="card" id="summary">
          <div className="step-heading">
            <span className="step-number" aria-hidden="true">
              {steps.worksheet}
            </span>
            <h2>Your preparation worksheet</h2>
          </div>
          <div className="notice notice-stop">
            <h3>Not ready to prepare yet</h3>
            <p>
              SevaPath will not write a worksheet with a gap where a required
              value should be, and it will not run the demonstration submission
              for a claim it could not read.
            </p>
            <p style={{ marginBottom: 0 }}>
              Get a legible copy of the record named in step 4, then run the
              checks again.
            </p>
          </div>
        </section>
      ) : null}

      {canPrepare ? (
        <section className="card" id="summary">
          <div className="step-heading">
            <span className="step-number" aria-hidden="true">
              {steps.worksheet}
            </span>
            <h2>Your preparation worksheet</h2>
          </div>
          <p className="lede">
            Print this or copy it out. It is a worksheet to take to the counter,
            not a form and not an application.
          </p>
          <div className="summary-block">
            <pre>{summaryText}</pre>
          </div>

          <h3 style={{ marginTop: "1.5rem" }}>Demonstration submission</h3>
          <div className="notice notice-warn">
            <p style={{ marginBottom: 0 }}>
              The button below runs a <strong>demonstration only</strong>. Nothing
              is sent to the Pensioners&rsquo; Portal, to a bank, or to any
              government system. The receipt it produces is not valid anywhere.
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
            {submitted ? <SubmissionResult submitted={submitted} /> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}

function SubmissionResult({ submitted }: { submitted: SubmitResponse }) {
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
    <div className="receipt" style={{ marginTop: "1rem" }}>
      <h3>{receipt.heading}</h3>
      <p className="reference">{receipt.reference}</p>
      <p className="muted">Produced {receipt.issuedAt}</p>

      {receipt.statements.map((statement) => (
        <p key={statement}>
          <strong>{statement}</strong>
        </p>
      ))}

      <div className="two-column">
        <div>
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
        <div>
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

      <h3>What would happen next in the real process</h3>
      <ol>
        {receipt.whatHappensNext.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
