"use client";

import { useId, useState } from "react";
import type { Citation } from "@/lib/retrieval/types";

/**
 * The source-linked guidance panel.
 *
 * Every answered question shows its citations. A refused question shows the
 * boundary. An unverifiable question shows the exact corpus wording and no
 * citations, because there are none to show.
 */

interface GuidanceResponse {
  outcome: "answered" | "insufficient_evidence" | "out_of_scope" | "unavailable";
  answer: string;
  citations: Citation[];
  adapter: string;
  refusalCategory: string | null;
}

const SUGGESTIONS = [
  "Which form do I use if my name is in the PPO?",
  "Is Form 14 still the current form?",
  "What is Format 9 for?",
  "What if my name is not in the PPO?",
  "Can the bank make me open a new account?",
  "What documents go with Form 12?"
];

export function GuidancePanel() {
  const inputId = useId();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const [result, setResult] = useState<GuidanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || pending) return;

    setPending(true);
    setError(null);
    setAsked(trimmed);
    try {
      const response = await fetch("/api/guidance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });
      if (!response.ok) {
        throw new Error(`The guidance service replied ${response.status}.`);
      }
      setResult((await response.json()) as GuidanceResponse);
    } catch (caught) {
      setResult(null);
      setError(
        caught instanceof Error
          ? `Could not reach the guidance service: ${caught.message}`
          : "Could not reach the guidance service."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form
        className="ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor={inputId}>Ask a question about this journey</label>
        <input
          id={inputId}
          type="text"
          value={question}
          maxLength={500}
          autoComplete="off"
          placeholder="For example: which form do I use?"
          onChange={(event) => setQuestion(event.target.value)}
          aria-describedby={`${inputId}-help`}
        />
        <p id={`${inputId}-help`} className="muted">
          Answers come only from official documents SevaPath has collected and
          linked. SevaPath will not tell you an amount or decide your
          eligibility.
        </p>
        <div className="button-row">
          <button type="submit" className="button-primary" disabled={pending}>
            {pending ? "Looking…" : "Ask"}
          </button>
        </div>
      </form>

      <p className="muted" style={{ marginTop: "1rem", marginBottom: "0.4rem" }}>
        Or pick a common question:
      </p>
      <div className="suggestion-row">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="suggestion"
            disabled={pending}
            onClick={() => {
              setQuestion(suggestion);
              void ask(suggestion);
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="answer" aria-live="polite" aria-busy={pending}>
        {pending ? <p className="spinner-text">Searching the official corpus…</p> : null}

        {error ? (
          <div className="notice notice-stop">
            <h3>Guidance unavailable</h3>
            <p>{error}</p>
            <p>
              The preparation checks above are unaffected — they never use
              retrieval. Every official document is listed on the sources page.
            </p>
          </div>
        ) : null}

        {!pending && result ? (
          <AnswerBlock question={asked ?? ""} result={result} />
        ) : null}
      </div>
    </div>
  );
}

function AnswerBlock({ question, result }: { question: string; result: GuidanceResponse }) {
  const noticeClass =
    result.outcome === "answered"
      ? "notice-ok"
      : result.outcome === "out_of_scope"
        ? "notice-warn"
        : result.outcome === "unavailable"
          ? "notice-stop"
          : "notice-info";

  const heading =
    result.outcome === "answered"
      ? "From the official corpus"
      : result.outcome === "out_of_scope"
        ? "SevaPath will not answer this"
        : result.outcome === "unavailable"
          ? "Guidance unavailable"
          : "Not verifiable from the corpus";

  return (
    <div className={`notice ${noticeClass}`} data-outcome={result.outcome}>
      <h3>{heading}</h3>
      <p className="muted">You asked: “{question}”</p>

      <div className="answer-body">
        {result.answer.split("\n\n").map((paragraph, index) => (
          <p key={index}>{stripMarkdownBold(paragraph)}</p>
        ))}
      </div>

      {result.outcome === "insufficient_evidence" ? (
        <p className="muted">
          SevaPath only answers from the documents it has collected and verified.
          It will not fill a gap from general knowledge.
        </p>
      ) : null}

      {result.citations.length > 0 ? (
        <>
          <h3 style={{ marginTop: "1rem" }}>Sources</h3>
          <ul className="citation-list">
            {result.citations.map((citation) => (
              <li key={`${citation.sourceId}-${citation.reference}`}>
                <span className="ref">{citation.reference}</span>
                <a href={citation.url} target="_blank" rel="noopener noreferrer">
                  {citation.title}
                </a>
                <span className="issuer">
                  {citation.issuer} · accessed {citation.accessed}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** The corpus writes headings as **bold**; render them as plain text. */
function stripMarkdownBold(value: string): string {
  return value.replace(/\*\*/g, "");
}
