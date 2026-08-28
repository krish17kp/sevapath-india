import type { JourneyState } from "@/lib/domain/types";
import { STATE_LABELS } from "@/lib/domain/assessment";
import { IconAlert, IconCheck, IconCross } from "./Icons";

const CLASS_BY_STATE: Record<JourneyState, string> = {
  ready: "state-ready",
  review_required: "state-review",
  blocked_missing_information: "state-blocked",
  retrieval_unavailable: "state-info",
  unsupported_scenario: "state-blocked",
  model_unavailable_deterministic_fallback: "state-info"
};

/** Status is never carried by colour alone: each state also has its own mark. */
const ICON_BY_STATE: Record<JourneyState, typeof IconCheck> = {
  ready: IconCheck,
  review_required: IconAlert,
  blocked_missing_information: IconCross,
  retrieval_unavailable: IconAlert,
  unsupported_scenario: IconCross,
  model_unavailable_deterministic_fallback: IconCheck
};

export function StateBadge({ state }: { state: JourneyState }) {
  const Glyph = ICON_BY_STATE[state];

  return (
    <span className={`state-badge ${CLASS_BY_STATE[state]}`} data-state={state}>
      <Glyph size={14} />
      {STATE_LABELS[state]}
    </span>
  );
}
