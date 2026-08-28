#!/usr/bin/env bash
set -euo pipefail

kit_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target_arg="${1:-.}"
project_root="$(cd "$target_arg" && pwd)"

if [[ ! -f "$project_root/package.json" || ! -d "$project_root/src" ]]; then
  echo "Wrong folder. Pass the existing SevaPath folder containing package.json and src/." >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI is not installed." >&2
  echo "Install it from OpenAI, run codex once to sign in, then rerun this script." >&2
  exit 1
fi

mkdir -p "$project_root/claude-handoff"
cp "$kit_dir/CODEX_CONTINUATION_PROMPT.md" \
  "$project_root/claude-handoff/CODEX_CONTINUATION_PROMPT.md"

if [[ ! -f "$project_root/AGENTS.md" && ! -f "$project_root/AGENTS.override.md" ]]; then
  cp "$kit_dir/AGENTS.md" "$project_root/AGENTS.md"
else
  cp "$kit_dir/AGENTS.md" "$project_root/claude-handoff/AGENTS_CODEX_RECOMMENDED.md"
  echo "Existing AGENTS instructions were preserved. Codex will read the recommended guardrails explicitly."
fi

cd "$project_root"
echo "Starting Codex in the existing SevaPath repository."
echo "Do not run Claude or edit the project simultaneously."

exec codex \
  --sandbox workspace-write \
  --ask-for-approval on-request \
  "Read claude-handoff/CODEX_CONTINUATION_PROMPT.md completely. Also read claude-handoff/AGENTS_CODEX_RECOMMENDED.md if it exists. Execute the continuation mission from the actual repository state. Do not stop after planning. Preserve Claude's uncommitted work, create a safe checkpoint, verify every change, finish the release, and write the required final report."
