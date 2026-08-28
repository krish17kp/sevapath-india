#!/usr/bin/env bash
set -euo pipefail

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code is not installed. Install and authenticate Claude Code, then run this script again." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
cd "$project_root"

prompt_file="claude-handoff/MASTER_PROMPT.md"
if [[ ! -f "$prompt_file" ]]; then
  echo "Missing $prompt_file" >&2
  exit 1
fi

mkdir -p claude-handoff/logs
run_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
log_file="claude-handoff/logs/claude-${run_stamp}.jsonl"
max_turns="${SEVAPATH_CLAUDE_MAX_TURNS:-180}"

echo "Claude will build SevaPath from scratch in: $project_root"
echo "Automation log: $log_file"

claude -p \
  --permission-mode auto \
  --output-format stream-json \
  --verbose \
  --max-turns "$max_turns" \
  "$(<"$prompt_file")" | tee "$log_file"

echo "Claude finished. Open claude-handoff/FINAL_REPORT.md."

