import type { CheckObservation } from "@/lib/domain/types";

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

/**
 * Renders the deterministic check results.
 *
 * When a check reports differing values, both are shown side by side, quoted
 * exactly. SevaPath never displays a merged or "corrected" version.
 */
export function CheckResults({ checks }: { checks: CheckObservation[] }) {
  return (
    <div>
      {checks.map((check) => (
        <section
          key={check.id}
          className={`check ${CLASS_BY_STATUS[check.status]}`}
          data-check-id={check.id}
          data-status={check.status}
        >
          <h3>
            <span className="visually-hidden">{PREFIX_BY_STATUS[check.status]}: </span>
            {check.label}
          </h3>
          <p>{check.detail}</p>

          {check.status !== "pass" && check.values && check.values.length > 0 ? (
            <div className="value-compare">
              {check.values.map((entry) => (
                <div className="value" key={`${check.id}-${entry.source}`}>
                  <span className="value-text">
                    {entry.value === null ? "— not readable —" : entry.value}
                  </span>
                  <span className="value-source">from {entry.source}</span>
                </div>
              ))}
            </div>
          ) : null}

          {check.humanAction ? (
            <p className="human-action">What to do: {check.humanAction}</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
