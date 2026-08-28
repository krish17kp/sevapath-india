import type { CheckObservation } from "@/lib/domain/types";
import { IconAlert, IconCheck, IconCross } from "./Icons";

const CLASS_BY_STATUS = {
  pass: "check-pass",
  review: "check-review",
  blocked: "check-blocked"
} as const;

const PREFIX_BY_STATUS = {
  pass: "Passed",
  review: "Needs review",
  blocked: "Blocked"
} as const;

const FLAG_BY_STATUS = {
  pass: null,
  review: "Needs human review",
  blocked: "Missing information"
} as const;

const ICON_BY_STATUS = {
  pass: IconCheck,
  review: IconAlert,
  blocked: IconCross
} as const;

/**
 * Renders the deterministic check results.
 *
 * When a check reports differing values, both are shown side by side, quoted
 * exactly. SevaPath never displays a merged or "corrected" version. Status is
 * carried by an icon, a word and a colour, never by colour alone.
 */
export function CheckResults({ checks }: { checks: CheckObservation[] }) {
  const passed = checks.filter((check) => check.status === "pass").length;
  const review = checks.filter((check) => check.status === "review").length;
  const blocked = checks.filter((check) => check.status === "blocked").length;

  return (
    <div>
      <div className="check-summary">
        <span className="tally tally-pass">
          <span className="tally-count">{passed}</span>
          {passed === 1 ? "check passed" : "checks passed"}
        </span>
        {review > 0 ? (
          <span className="tally tally-review">
            <span className="tally-count">{review}</span>
            {review === 1 ? "needs review" : "need review"}
          </span>
        ) : null}
        {blocked > 0 ? (
          <span className="tally tally-blocked">
            <span className="tally-count">{blocked}</span>
            {blocked === 1 ? "is missing" : "are missing"}
          </span>
        ) : null}
      </div>

      {checks.map((check) => {
        const Glyph = ICON_BY_STATUS[check.status];
        const flag = FLAG_BY_STATUS[check.status];

        return (
          <section
            key={check.id}
            className={`check ${CLASS_BY_STATUS[check.status]}`}
            data-check-id={check.id}
            data-status={check.status}
          >
            <div className="check-head">
              <span className="check-icon" aria-hidden="true">
                <Glyph size={13} />
              </span>
              <div className="check-body">
                {flag ? <span className="review-flag">{flag}</span> : null}
                <h3>
                  <span className="visually-hidden">
                    {PREFIX_BY_STATUS[check.status]}:{" "}
                  </span>
                  {check.label}
                </h3>
                <p>{check.detail}</p>

                {check.status !== "pass" && check.values && check.values.length > 0 ? (
                  <div className="value-compare">
                    {check.values.map((entry) => (
                      <div className="value" key={`${check.id}-${entry.source}`}>
                        <span className="value-source">{entry.source}</span>
                        <span className="value-text">
                          {entry.value === null ? "— not readable —" : entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {check.humanAction ? (
                  <p className="human-action">What to do: {check.humanAction}</p>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
