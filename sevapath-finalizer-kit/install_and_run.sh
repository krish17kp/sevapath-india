#!/usr/bin/env bash
set -euo pipefail

kit_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target_arg="${1:-.}"
project_root="$(cd "$target_arg" && pwd)"

if [[ ! -f "$project_root/package.json" || ! -d "$project_root/src" ]]; then
  echo "This is not the existing SevaPath project." >&2
  echo "Pass the folder that contains package.json and src/." >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code is not installed or is not available in this terminal." >&2
  exit 1
fi

mkdir -p "$project_root/.claude/agents" "$project_root/claude-handoff"

version_file="$project_root/claude-handoff/FINALIZER_VERSION"
if [[ ! -f "$version_file" || "$(<"$version_file")" != "4" ]]; then
  archive_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  for prior in MISSION_STATE.md FINAL_REPORT.md; do
    if [[ -f "$project_root/claude-handoff/$prior" ]]; then
      mv "$project_root/claude-handoff/$prior" \
        "$project_root/claude-handoff/${prior%.md}.before-v4-${archive_stamp}.md"
    fi
  done
fi

cp "$kit_dir/payload/claude-handoff/FINISH_MISSION.md" "$project_root/claude-handoff/FINISH_MISSION.md"
cp "$kit_dir/payload/claude-handoff/run_finish_project.sh" "$project_root/claude-handoff/run_finish_project.sh"
cp "$kit_dir/payload/claude-handoff/render_claude_stream.mjs" "$project_root/claude-handoff/render_claude_stream.mjs"
cp "$kit_dir"/payload/.claude/agents/*.md "$project_root/.claude/agents/"
printf '4\n' > "$version_file"
chmod +x "$project_root/claude-handoff/run_finish_project.sh"

echo "Installed the completion controller into: $project_root"
if [[ "${SEVAPATH_INSTALL_ONLY:-0}" == "1" ]]; then
  echo "Install-only mode complete."
  exit 0
fi
echo "Starting the one-goal mission now. Keep this terminal open."
exec bash "$project_root/claude-handoff/run_finish_project.sh"
