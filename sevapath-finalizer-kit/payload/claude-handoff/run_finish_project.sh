#!/usr/bin/env bash
set -uo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
cd "$project_root"

mission_file="claude-handoff/FINISH_MISSION.md"
state_file="claude-handoff/MISSION_STATE.md"
report_file="claude-handoff/FINAL_REPORT.md"
logs_dir="claude-handoff/logs"
mkdir -p "$logs_dir"

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code is not available. Install/sign in, then rerun this same script." >&2
  exit 1
fi

if [[ ! -f "$mission_file" ]]; then
  echo "Missing $mission_file" >&2
  exit 1
fi

deadline_epoch="$(TZ=Asia/Kolkata date -d '2026-08-28 20:00:00' +%s 2>/dev/null || true)"
max_attempts="${SEVAPATH_FINISH_MAX_ATTEMPTS:-12}"
retry_seconds="${SEVAPATH_FINISH_RETRY_SECONDS:-300}"
attempt=0

is_complete() {
  [[ -f "$report_file" ]] && grep -q '^MISSION_STATUS: COMPLETE$' "$report_file"
}

needs_human() {
  [[ -f "$report_file" ]] && grep -q '^MISSION_STATUS: HUMAN_ACTION_REQUIRED$' "$report_file"
}

if is_complete; then
  echo "SevaPath is already marked COMPLETE in $report_file"
  exit 0
fi

while (( attempt < max_attempts )); do
  if [[ -n "$deadline_epoch" && "${SEVAPATH_IGNORE_DEADLINE:-0}" != "1" ]]; then
    now_epoch="$(date +%s)"
    if (( now_epoch >= deadline_epoch )); then
      echo "The 8:00 PM IST deadline has passed. The runner stopped without pretending completion." >&2
      echo "To continue after the deadline, rerun with SEVAPATH_IGNORE_DEADLINE=1." >&2
      exit 3
    fi
  fi

  attempt=$((attempt + 1))
  run_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  log_file="$logs_dir/finalizer-${run_stamp}-attempt-${attempt}.jsonl"

  echo
  echo "SevaPath completion mission — attempt $attempt of $max_attempts"
  echo "Raw automation log: $log_file"
  echo "Claude is working from the existing project. Do not edit the project simultaneously."

  prompt="You are the Opus release orchestrator. Execute the entire single goal in @$mission_file. This is a continuation of an existing working project, not a rebuild. Read any existing $state_file and $report_file, inspect the actual repository, use the configured specialist subagents, make and verify all justified changes, and checkpoint after every phase. Do not stop at a plan. Do not ask the user routine questions. Finish with exactly one authoritative $report_file status: COMPLETE only if every defined completion gate passes, otherwise HUMAN_ACTION_REQUIRED only for a genuine credential or external-account blocker."

  set +e
  claude -p \
    --permission-mode auto \
    --model opus \
    --max-turns 300 \
    --output-format stream-json \
    --verbose \
    --append-subagent-system-prompt "This is the SevaPath final release mission. Read claude-handoff/FINISH_MISSION.md and obey its safety, evidence, deadline, no-secret, and no-fake-success rules. Cite exact files and commands in your result." \
    "$prompt" \
    | tee "$log_file" \
    | node claude-handoff/render_claude_stream.mjs
  claude_exit="${PIPESTATUS[0]}"
  set -e

  if is_complete; then
    echo
    echo "SEVAPATH COMPLETE. Read $report_file"
    exit 0
  fi

  if needs_human; then
    echo
    echo "Claude reached a genuine human-only blocker. Read $report_file"
    exit 2
  fi

  if grep -Eqi 'api_error_status[^0-9]*429|rate.?limit|session limit|usage limit' "$log_file"; then
    echo "Claude usage limit detected. The same mission will retry automatically in $retry_seconds seconds."
    sleep "$retry_seconds"
    continue
  fi

  if (( claude_exit != 0 )); then
    echo "Claude exited with code $claude_exit. Retrying from the saved mission state in 90 seconds."
    sleep 90
    continue
  fi

  echo "Claude ended without a valid completion report. Retrying from the saved mission state in 60 seconds."
  sleep 60
done

echo "The automatic attempt limit was reached without a valid completion report." >&2
echo "Inspect $state_file and the newest log in $logs_dir. Do not call the project complete." >&2
exit 4
