# SevaPath finalizer — one mission, one run

This kit continues the **existing working SevaPath project**. It does not build
another site and it does not replace your application source.

## Before starting

1. Keep the laptop connected to power.
2. Make sure this terminal is open in the existing SevaPath project (the folder
   that contains `package.json`, `src/`, and `rag-corpus/`).
3. Make sure Claude Code is signed in: `claude --version`.
4. For automatic publishing, GitHub CLI and Vercel must already be signed in:
   `gh auth status` and `npx vercel whoami`.

Authentication is the only part this kit cannot invent. If either command asks
you to log in, finish that login once before starting the mission.

## Run exactly one command

If this extracted folder is inside your SevaPath project, run from the SevaPath
project root:

```bash
bash sevapath-finalizer-kit/install_and_run.sh .
```

If it is somewhere else, give the existing SevaPath project path:

```bash
bash /path/to/sevapath-finalizer-kit/install_and_run.sh "/path/to/existing-sevapath-project"
```

Then leave the terminal open. Do not start another Claude session against the
same project while this mission is running.

The runner retries automatically after a Claude usage-limit error. Progress is
written to `claude-handoff/MISSION_STATE.md`. The only authoritative completion
file is `claude-handoff/FINAL_REPORT.md`.

Completion is valid only when `FINAL_REPORT.md` contains:

```text
MISSION_STATUS: COMPLETE
```

If an account login or final human submission is unavoidable, it will contain:

```text
MISSION_STATUS: HUMAN_ACTION_REQUIRED
```

with one exact action, not a vague list.
