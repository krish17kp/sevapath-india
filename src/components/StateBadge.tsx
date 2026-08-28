import type { JourneyState } from "@/lib/domain/types";
import { STATE_LABELS } from "@/lib/domain/assessment";

const CLASS_BY_STATE: Record<JourneyState, string> = {
  ready: "state-ready",
  review_required: "state-review",
  blocked_missing_information: "state-blocked",
  retrieval_unavailable: "state-info",
  unsupported_scenario: "state-blocked",
  model_unavailable_deterministic_fallback: "state-info"
};

export function StateBadge({ state }: { state: JourneyState }) {
  return (
    <span className={`state-badge ${CLASS_BY_STATE[state]}`} data-state={state}>
      {STATE_LABELS[state]}
    </span>
  );
}
